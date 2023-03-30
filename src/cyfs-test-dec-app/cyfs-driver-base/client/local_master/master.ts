import { Logger, LocalStorageJson, ErrorCode, DirHelper, RandomGenerator, IntervalAction, getFileMd5, HttpDownloader, VersionHelper } from "../../../common";
import { ClientStack, ClientStackOptions } from "../base/client_stack";

import * as net from 'net';
import { NamespaceHelper, Rpc, Command, SysCommandName, CommandSysPingReq, Channel, CommandSysStartServiceReq, Namespace, CommandSysStartServiceResp, CommandSysStopServiceReq, CommandSysStopServiceResp, CommandSysRunTaskReq, CommandSysRunTaskResp, CommandSysStopTaskReq, CommandSysStopTaskResp, CommandSysHeartbeatResp, CommandSysHeartbeatLocalResp, CommandSysHeartbeatReq, CommandDispatch, ClientExitCode, CommandSysTaskFinishReq, CommandSysUploadLogReq, CommandSysUploadLogResp, CommandSysTaskFinishResp, stringifyComand } from "../../command";
import { LocalServiceStorage } from "./service_storage";
import { ClientProxy } from "./client";
import * as assert from 'assert';
import { PrivateChannel } from "./private_channel";
import { Bridge } from "./bridge";
import { TaskProxy } from "./task";
import { ServiceProxy } from "./service";

import * as path from 'path';
import * as fs from 'fs-extra';
import * as compressing from 'compressing';


export type LocalMasterOptions = {
    agentid: string;
    version: string;
    heartbeatIntervalTime: number;
    logger: Logger;
    storage: LocalStorageJson;
    platform: string;
};

export class LocalMaster extends ClientStack {
    private m_server: net.Server;
    private m_localServiceStorage: LocalServiceStorage;
    private m_localServerPort?: number;
    private m_clients: ClientProxy[];
    private m_downloading: Set<string>;

    constructor(options: LocalMasterOptions) {
        let stackOption: ClientStackOptions = {
            namespace: { agentid: options.agentid, serviceid: NamespaceHelper.LocalMasterServiceId },
            version: options.version,
            heartbeatIntervalTime: options.heartbeatIntervalTime,
            logger: options.logger,
            storage: options.storage,
            key: 'localmaster',
            platform: options.platform,
        };
        super(stackOption);
        this.m_server = net.createServer();
        this.m_localServiceStorage = new LocalServiceStorage({
            logger: this.logger,
            storage: this.localStorage,
        });
        this.m_clients = [];
        this.m_downloading = new Set();

        this._listeningCommand(this.dispatcher, this.channelWithMaster);
    }

    async start(): Promise<ErrorCode> {
        let err = await this.localStorage.load();
        
        await this.m_localServiceStorage.init();
        this.m_server.on('connection', (socket: net.Socket) => {
            let rpc: Rpc = new Rpc({
                logger: this.getLogger(),
            });

            rpc.initFromListener(socket);

            rpc.once('command', (r: Rpc, c: Command) => {
                this.m_logger.debug(`---------------------------------new connection first command,${stringifyComand(c)}`);
                if (c.name !== SysCommandName.sys_ping_req) {
                    return;
                }

                let client = this._findClientByKey((c as CommandSysPingReq).key);
                if (!client) {
                    return;
                }

                client.initFromRpc(rpc);
            });

            rpc.once('close', () => {
                this.logger.info(`local master close net Socket`)
                rpc.removeAllListeners();
            });

            rpc.once('error', () => {
                this.logger.info(`local master net Socket error`)
                rpc.removeAllListeners();
            });
        });

        // listen错误， 端口冲突会触发
        this.m_server.on('error', (error: Error) => {
            console.log(`local server init failed for net error, error=${error}`);
        });

        await new Promise<ErrorCode>((v) => {
            this.m_server.once('listening', () => {
                this.m_localServerPort = (this.m_server.address() as net.AddressInfo).port!;
                v(ErrorCode.succ);
            });
            this.m_server.listen();
        });

        err = await super.start();
        if (err) {
            return err;
        }

        return ErrorCode.succ;
    }
    getLlocalServerPort(){
        return this.m_localServerPort
    }
    async exit(code: ClientExitCode, msg: string, timeout?: number) {
        for (let c of this.m_clients) {
            await await c.stopProcess();
        }

        await super.exit(code, msg, timeout);
    }

    protected _isRetryRpc(): boolean {
        return true;
    }

    private _findClientByKey(key: string): ClientProxy | null {
        for (let c of this.m_clients) {
            if (c.key === key) {
                return c;
            }
        }

        return null;
    }

    private _findClientByNamespace(namespace: Namespace): ClientProxy[] {
        let clients: ClientProxy[] = [];
        for (let c of this.m_clients) {
            if (NamespaceHelper.isNamespaceEqual(c.namespace, namespace)) {
                clients.push(c);
            }
        }

        return clients;
    }

    private _listeningCommand(dispatcher: CommandDispatch, fromChannel: Channel) {
        dispatcher.addHandler(SysCommandName.sys_startservice_req, (c: Command) => { this._startService(c, fromChannel); });
        dispatcher.addHandler(SysCommandName.sys_stopservice_req, (c: Command) => { this._stopService(c, fromChannel); });

        dispatcher.addHandler(SysCommandName.sys_runtask_req, (c: Command) => { this._runTask(c, fromChannel) });
        dispatcher.addHandler(SysCommandName.sys_stoptask_req, (c: Command) => { this._stopTask(c, fromChannel) });
        dispatcher.addHandler(SysCommandName.sys_ping_req, (c: Command) => { this._onPing(c, fromChannel); });
        dispatcher.addHandler(SysCommandName.sys_heartbeat_resp, (c: Command) => { this._onHeartbeatResp(c, fromChannel); });
        dispatcher.addHandler(SysCommandName.sys_taskfinish_req, (c: Command) => { this._onTaskFinish(c, fromChannel); });

        //先暂时处理一下
        if (!NamespaceHelper.isNamespaceEqual(fromChannel.namespace, this.namespace)) {
            dispatcher.addHandler(SysCommandName.sys_uploadlog_resp, (c: Command) => { this.dispatcher.dispatch(c);});
        }
    }

    private _reportTaskExecuteResult(task: TaskProxy) {
        let c: CommandSysTaskFinishReq = {
            name: SysCommandName.sys_taskfinish_req,
            from: this.namespace,
            to: { agentid: NamespaceHelper.MasterAgentId },
            seq: this.nextSeq,
            taskid: task.namespace.taskid!,
            jobid: task.jobid,
            msg: 'timeout',
            urls: [],
            code: ClientExitCode.exception,
        };

        let r = task.getExecuteResult();
        if (r) {
            c.code = r.code;
            c.urls = r.urls;
            c.msg = r.msg;
        }

        this.channelWithMaster.send(c);
    }

    private _initClient(client: ClientProxy) {
        this.m_clients.push(client);

        client.on('timeout', async () => {
            this.m_logger.info(`===============client exit,namespace=${JSON.stringify(client.namespace)}`);
            
            if (!client.isService && !(client as TaskProxy).isLocalTest) {
                this._reportTaskExecuteResult(client as TaskProxy);
            }
            await client.stopProcess();
            client.destory();
            this.m_clients.splice(this.m_clients.indexOf(client), 1);
        });
    }

    private _newServiceClient(namespace: Namespace, taskChannel: PrivateChannel): ServiceProxy {
        let client: ServiceProxy = new ServiceProxy({
            namespace,
            logger: this.m_logger,
            timeout: this.heartbeatTime * 3,
            taskChannel,
            channelWithCenterMaster: this.channelWithMaster,
        });
        this._initClient(client);

        this._listeningCommand(client.dispatcher, client);

        return client;
    }

    private _newTaskClient(namespace: Namespace, jobid: string, localTest: boolean): TaskProxy {
        let client: TaskProxy = new TaskProxy({
            namespace,
            logger: this.m_logger,
            timeout: this.heartbeatTime * 3,
            channelWithCenterMaster: this.channelWithMaster,
            jobid,
            localTest,
        });
        this._initClient(client);

        this._listeningCommand(client.dispatcher, client);

        return client;
    }
    newTaskClient(namespace: Namespace, jobid: string, localTest: boolean): TaskProxy {
        let client: TaskProxy = new TaskProxy({
            namespace,
            logger: this.m_logger,
            timeout: this.heartbeatTime * 3,
            channelWithCenterMaster: this.channelWithMaster,
            jobid,
            localTest,
        });
        this._initClient(client);

        this._listeningCommand(client.dispatcher, client);

        return client;
    }
    private async _startService(command: Command, channel: Channel) {
        let c: CommandSysStartServiceReq = command as CommandSysStartServiceReq;
        let err: ErrorCode = ErrorCode.succ;
        do {
            let serviceInfo = this.m_localServiceStorage.getServiceInfo(c.serviceid);
            if (!serviceInfo) {
                err = ErrorCode.notSupport;
                break;
            }

            let serviceNamespace: Namespace = { agentid: this.namespace.agentid, serviceid: c.serviceid };
            let clients: ClientProxy[] = this._findClientByNamespace(serviceNamespace);
            if (clients.length) {
                for (let c of clients) {
                    if (NamespaceHelper.isNamespaceEqual((c as ServiceProxy).taskNamespace, command.from)) {
                        err = ErrorCode.exist;
                        break;
                    }
                }

                if (err) {
                    break;
                }
            }

            //生成一个和service对应的task的channel
            let serviceClient: ServiceProxy | null = null;
            if (c.from.agentid === this.namespace.agentid) {
                //task和service再同一个机器上面
                let taskClients: ClientProxy[] = this._findClientByNamespace(c.from);
                if (taskClients.length === 0) {
                    this.m_logger.error(`error, when start service, command from task at the same agent with servie, but task not exist`);
                    err = ErrorCode.exception;
                    break;
                }

                let taskChannel: PrivateChannel = new PrivateChannel({
                    namespace: c.from,
                    logger: this.m_logger,
                    timeout: 0,
                });
                taskChannel.initFromChannel({ from: taskClients[0].namespace, to: serviceNamespace, channel: taskClients[0] });
                serviceClient = this._newServiceClient(serviceNamespace, taskChannel);

                //把这个service加到task里面去
                let serviceChannel: PrivateChannel = new PrivateChannel({
                    namespace: serviceClient.namespace,
                    logger: this.m_logger,
                    timeout: 0,
                });
                serviceChannel.initFromChannel({from: serviceClient.namespace, to: taskClients[0].namespace, channel: serviceClient});

                (taskClients[0] as TaskProxy).addService(serviceChannel);
            } else {
                let taskChannel: PrivateChannel = new PrivateChannel({
                    namespace: c.from,
                    logger: this.m_logger,
                    timeout: 0,
                });
                taskChannel.initFromChannel({ from: c.from, to: serviceNamespace, channel: this.channelWithMaster });
                serviceClient = this._newServiceClient(serviceNamespace, taskChannel);
            }
            

            let entryfile: string = path.join(path.dirname(__filename), './service_main.js');
            let param: any = {
                userData: c.param,
                root: DirHelper.getRootDir(),
                version: serviceInfo!.version,
                namespace: serviceClient.namespace,
                servicename: serviceInfo!.servicename,
                port: this.m_localServerPort,
                key: serviceClient.key,
                platform: this.m_platform,
            };
            serviceClient!.forkProcess(entryfile, param);
        } while (false);

        let respCmd: CommandSysStartServiceResp = {
            name: SysCommandName.sys_startservice_resp,
            from: this.namespace,
            to: c.from,
            seq: c.seq,
            err,
        };

        channel.send(respCmd as Command);
    }

    protected async _stopService(command: Command, channel: Channel) {
        let c: CommandSysStopServiceReq = command as CommandSysStopServiceReq;
        let err: ErrorCode = ErrorCode.succ;
        let namespace: Namespace = { agentid: this.namespace.agentid, serviceid: c.serviceid };
        do {
            let clients: ClientProxy[] = this._findClientByNamespace(namespace);
            if (!clients.length) {
                err = ErrorCode.notExist;
                break;
            }

            if (c.from.agentid === NamespaceHelper.MasterAgentId) {
                //要关闭这个机器上的所有的service，
                for(let c of clients) {
                    await c.stopProcess();
                }
            } else {
                //从task来，先不检测正确行了，只关闭task对应的
                for(let c of clients) {
                    if(NamespaceHelper.isNamespaceEqual(command.from, (c as ServiceProxy).taskNamespace)) {
                        await c.stopProcess();
                        break;
                    }
                }
            }
        } while (false);

        let respCmd: CommandSysStopServiceResp = {
            name: SysCommandName.sys_stopservice_resp,
            from: this.namespace,
            to: c.from,
            seq: c.seq,
            err,
        };

        channel.send(respCmd as Command);
    }

    protected async _updateServiceImpl(service: {
        serviceid: string;
        servicename: string;
        newversion: string;
        url: string;
        md5: string;
    }) {
        let namespace: Namespace = { agentid: this.namespace.agentid, serviceid: service.serviceid };
        let clients = this._findClientByNamespace(namespace);
        if (clients.length) {
            //正在运行，先不打断更新
            return;
        }

        let servicesInfo = this.m_localServiceStorage.getServiceInfo(service.serviceid);
        if (servicesInfo && VersionHelper.compare(service.newversion, servicesInfo.version) <= 0) {
            if (fs.existsSync(path.join(DirHelper.getServiceDir(servicesInfo.servicename), 'onload.js'))) {
                return;
            }
        }

        if (this.m_downloading.has(service.md5)) {
            return;
        }

        let unzipFunc = async (filepath: string) => {
            let dir = DirHelper.getServiceDir(service.servicename);
            await compressing.zip.uncompress(filepath, dir);
            await this.m_localServiceStorage.update({
                serviceid: service.serviceid,
                servicename: service.servicename,
                version: service.newversion
            });
        };
        let filepath: string = path.join(DirHelper.getUpdateDir(), `${service.md5}.zip`);
        if (fs.existsSync(filepath)) {
            let md5Info = getFileMd5(filepath);
            if (!md5Info.err && md5Info.md5! === service.md5) {
                await unzipFunc(filepath);
                return;
            }

            try {
                fs.unlinkSync(filepath);
            } catch(e) {
                console.log(`[service proxy] update service failed, err=${e}`);
                return ErrorCode.exception;
            }
        } 


        this.m_downloading.add(service.md5);
        let err = await HttpDownloader.downloadByUrl(service.url, filepath, service.md5);
        if (err) {
            this.m_downloading.delete(service.md5);
            return;
        }

        if (fs.existsSync(filepath)) {
            await unzipFunc(filepath);
        }
        this.m_downloading.delete(service.md5);
    }

    //localTest 本地测试
    async runTaskLocal(command: CommandSysRunTaskReq, localTest: boolean): Promise<ErrorCode> {
        let c: CommandSysRunTaskReq = command as CommandSysRunTaskReq;
        let namespace: Namespace = { agentid: this.namespace.agentid, serviceid: c.serviceid, taskid: c.taskid };
        let err = ErrorCode.succ;
        do {
            let clients: ClientProxy[] = this._findClientByNamespace(namespace);
            if (clients.length) {
                err = ErrorCode.exist;
                break;
            }
            
            let taskClient: TaskProxy = this._newTaskClient(namespace, c.jobid, localTest);
            try {
                let entryfile: string = path.join(path.dirname(__filename), './task_main.js');
                let param: any = {
                    userData: c.param,
                    root: DirHelper.getRootDir(),
                    version: c.version,
                    md5: c.md5,
                    url: c.url,
                    namespace: { agentid: namespace.agentid, serviceid: c.serviceid, taskid: c.taskid },
                    port: this.m_localServerPort,
                    key: taskClient.key,
                    localTest,
                    platform: this.m_platform,
                };
                taskClient.forkProcess(entryfile, param);
            } catch (e) {
                this.m_logger.error(`start task exception err=${e}`);
                err = ErrorCode.exception;
            }
        } while (false);

       return err;
    }
    protected async _runTaskImpl(command: Command, localTest: boolean): Promise<ErrorCode> {
        let c: CommandSysRunTaskReq = command as CommandSysRunTaskReq;
        let namespace: Namespace = { agentid: this.namespace.agentid, serviceid: c.serviceid, taskid: c.taskid };
        let err = ErrorCode.succ;
        do {
            let clients: ClientProxy[] = this._findClientByNamespace(namespace);
            if (clients.length) {
                err = ErrorCode.exist;
                break;
            }
            
            let taskClient: TaskProxy = this._newTaskClient(namespace, c.jobid, localTest);
            try {
                let entryfile: string = path.join(path.dirname(__filename), './task_main.js');
                let param: any = {
                    userData: c.param,
                    root: DirHelper.getRootDir(),
                    version: c.version,
                    md5: c.md5,
                    url: c.url,
                    namespace: { agentid: namespace.agentid, serviceid: c.serviceid, taskid: c.taskid },
                    port: this.m_localServerPort,
                    key: taskClient.key,
                    localTest,
                    platform: this.m_platform,
                };
                taskClient.forkProcess(entryfile, param);
            } catch (e) {
                this.m_logger.error(`start task exception err=${e}`);
                err = ErrorCode.exception;
            }
        } while (false);

       return err;
    }

    protected async _runTask(command: Command, channel: Channel) {
        let err = await this._runTaskImpl(command, false);
        let respCmd: CommandSysRunTaskResp = {
            name: SysCommandName.sys_runtask_resp,
            from: this.namespace,
            to: command.from,
            seq: command.seq,
            err
        };

        channel.send(respCmd as Command);
    }

    protected async _stopTask(command: Command, channel: Channel) {
        let c: CommandSysStopTaskReq = command as CommandSysStopTaskReq;
        let namespace: Namespace = { agentid: this.namespace.agentid, serviceid: c.serviceid, taskid: c.taskid };
        let err: ErrorCode = ErrorCode.succ;

        do {
            let clients: ClientProxy[] = this._findClientByNamespace(namespace);
            if (!clients.length) {
                err = ErrorCode.notExist;
                break;
            }
            (clients[0] as TaskProxy).setExecuteResult({
                code: ClientExitCode.killed,
                msg: 'killed',
                urls: [],
            });

            err = await clients[0].stopProcess();
        } while (false);

        let respCmd: CommandSysStopTaskResp = {
            name: SysCommandName.sys_stoptask_resp,
            from: this.namespace,
            to: c.from,
            seq: c.seq,
            err,
        };

        channel.send(respCmd as Command);
    }

    protected async _onHeartbeatResp(c: Command, channel: Channel) {
        let command: CommandSysHeartbeatResp = c as CommandSysHeartbeatResp;
        command.services.forEach((item) => {
            this._updateServiceImpl(item);
        });

        if (command.invalidservices) {
            for (let serviceid of command.invalidservices) {
                let namespace: Namespace = { agentid: this.namespace.agentid, serviceid };
                let info = this.m_localServiceStorage.getServiceInfo(serviceid);
                if (!info) {
                    continue;
                }
    
                let clients: ClientProxy[] = this._findClientByNamespace(namespace);
                for (let c of clients) {
                    await c.stopProcess();
                }
    
                let dir: string = DirHelper.getServiceDir(info.servicename);
                try {
                    DirHelper.emptyDir(dir);
                    fs.rmdirSync(dir);
                } catch (err) {
                    this.m_logger.error(`failed when remove service dir,name=${info.servicename}, err=${err}`);
                }
            }
            
            await this.m_localServiceStorage.delete(command.invalidservices);
        }
    }

    private _doUploadLog(taskNamespace: Namespace, channel: Channel, bService: boolean ): Promise<{err: ErrorCode, url?: string}> {
        return new Promise<{err: ErrorCode, url?: string}>(async (v) => {
            let name: string = '';
            if (bService) {
                name = `task_${taskNamespace.taskid}_service_${taskNamespace.serviceid}_${RandomGenerator.string(4)}.zip`;
            } else {
                name = `task_${taskNamespace.taskid}_${RandomGenerator.string(4)}.zip`;
            }
            let c: CommandSysUploadLogReq = {
                name: SysCommandName.sys_uploadlog_req,
                from: bService ? {agentid: this.namespace.agentid, serviceid: NamespaceHelper.LocalMasterServiceId} : this.namespace,
                to: channel.namespace,
                seq: this.nextSeq,
                taskNamespace,
                logname: name,
            }
    
            channel.send(c);
    
            let resp = await this.waitCommand(SysCommandName.sys_uploadlog_resp, c.seq, 60 * 1000);
            if (resp.err) {
                v({err: resp.err});
                return;
            }
    
            v({err: (resp.c! as CommandSysUploadLogResp).err, url: (resp.c! as CommandSysUploadLogResp).url});
        });
    }

    protected async _onTaskFinish(c: Command, channel: Channel) {
        //目前只有task会上报这个命令
        let command: CommandSysTaskFinishReq = c as CommandSysTaskFinishReq;
        let resp: CommandSysTaskFinishResp = {
            from: this.namespace,
            to: c.from,
            name: SysCommandName.sys_taskfinish_resp,
            seq: c.seq,
            err: ErrorCode.waiting,
        }

        //本地测试用的就先不上报了
        if ((channel as TaskProxy).isLocalTest) {
            resp.err = ErrorCode.succ;
            channel.send(resp);
            return;
        }

        let urls: string[] = [];
        if (command.code === ClientExitCode.failed) {
            let intervalAction: IntervalAction = new IntervalAction();
            intervalAction.begin(() => {
                channel.send(resp);
            });

            let ops = [];
            ops.push(this._doUploadLog(channel.namespace, channel, false));
            let services: PrivateChannel[] = (channel as TaskProxy).getServices();
            this.logger.info(`===============master on task finish services count=${services.length}`);
            for (let s of services) {
                ops.push(this._doUploadLog(channel.namespace, s, true));
            }

            let infos = await Promise.all(ops);
            this.logger.info(`===============master on task finish uploadlog ret=${JSON.stringify(infos)}`);
            intervalAction.end();

            for (let info of infos) {
                if (!info.err) {
                    urls.push(info.url!);
                }
            }
        }
        
        (channel as TaskProxy).setExecuteResult({
            code: command.code,
            urls,
            msg: command.msg,
        });

        resp.err = ErrorCode.succ;
        channel.send(resp);
    }

    protected _onPing(c: Command, channel: Channel) {
        //发送ping给localmaster的就只有task和service，此时channel就是client
        (channel as ClientProxy).onPing(c);
    }

    protected _generateHeartbeatCommand(): Command {
        let services: { serviceid: string, servicename: string, version: string, status: number }[] = [];
        this.m_localServiceStorage.getAll().forEach((info) => {
            let serviceClients: ClientProxy[] = this._findClientByNamespace({agentid: this.namespace.agentid, serviceid: info.serviceid});
            if (fs.existsSync(path.join(DirHelper.getServiceDir(info.servicename), 'onload.js'))) {
                services.push({ serviceid: info.serviceid, servicename: info.servicename, version: info.version, status: serviceClients.length ? 1 : 0 });
            }
        });

        let tasks: string[] = [];
        for (let c of this.m_clients) {
            if (!c.isService) {
                tasks.push(c.namespace.taskid!);
            }
        }
        
        let c: CommandSysHeartbeatReq = {
            from: this.namespace,
            to: { agentid: NamespaceHelper.MasterAgentId },
            name: SysCommandName.sys_heartbeat_req,
            seq: this.nextSeq,
            version: this.version,
            platform: this.m_platform,
            services,
            tasks,
        };

        return c;
    }
};