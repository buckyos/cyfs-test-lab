"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalMaster = void 0;
const common_1 = require("../../../common");
const client_stack_1 = require("../base/client_stack");
const net = __importStar(require("net"));
const command_1 = require("../../command");
const service_storage_1 = require("./service_storage");
const private_channel_1 = require("./private_channel");
const task_1 = require("./task");
const service_1 = require("./service");
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const compressing = __importStar(require("compressing"));
class LocalMaster extends client_stack_1.ClientStack {
    constructor(options) {
        let stackOption = {
            namespace: { agentid: options.agentid, serviceid: command_1.NamespaceHelper.LocalMasterServiceId },
            version: options.version,
            heartbeatIntervalTime: options.heartbeatIntervalTime,
            logger: options.logger,
            storage: options.storage,
            key: 'localmaster',
            platform: options.platform,
        };
        super(stackOption);
        this.m_server = net.createServer();
        this.m_localServiceStorage = new service_storage_1.LocalServiceStorage({
            logger: this.logger,
            storage: this.localStorage,
        });
        this.m_clients = [];
        this.m_downloading = new Set();
        this._listeningCommand(this.dispatcher, this.channelWithMaster);
    }
    async start() {
        let err = await this.localStorage.load();
        await this.m_localServiceStorage.init();
        this.m_server.on('connection', (socket) => {
            let rpc = new command_1.Rpc({
                logger: this.getLogger(),
            });
            rpc.initFromListener(socket);
            rpc.once('command', (r, c) => {
                this.m_logger.debug(`---------------------------------new connection first command,${command_1.stringifyComand(c)}`);
                if (c.name !== command_1.SysCommandName.sys_ping_req) {
                    return;
                }
                let client = this._findClientByKey(c.key);
                if (!client) {
                    return;
                }
                client.initFromRpc(rpc);
            });
            rpc.once('close', () => {
                this.logger.info(`local master close net Socket`);
                rpc.removeAllListeners();
            });
            rpc.once('error', () => {
                this.logger.info(`local master net Socket error`);
                rpc.removeAllListeners();
            });
        });
        // listen错误， 端口冲突会触发
        this.m_server.on('error', (error) => {
            console.log(`local server init failed for net error, error=${error}`);
        });
        await new Promise((v) => {
            this.m_server.once('listening', () => {
                this.m_localServerPort = this.m_server.address().port;
                v(common_1.ErrorCode.succ);
            });
            this.m_server.listen();
        });
        err = await super.start();
        if (err) {
            return err;
        }
        return common_1.ErrorCode.succ;
    }
    getLlocalServerPort() {
        return this.m_localServerPort;
    }
    async exit(code, msg, timeout) {
        for (let c of this.m_clients) {
            await await c.stopProcess();
        }
        await super.exit(code, msg, timeout);
    }
    _isRetryRpc() {
        return true;
    }
    _findClientByKey(key) {
        for (let c of this.m_clients) {
            if (c.key === key) {
                return c;
            }
        }
        return null;
    }
    _findClientByNamespace(namespace) {
        let clients = [];
        for (let c of this.m_clients) {
            if (command_1.NamespaceHelper.isNamespaceEqual(c.namespace, namespace)) {
                clients.push(c);
            }
        }
        return clients;
    }
    _listeningCommand(dispatcher, fromChannel) {
        dispatcher.addHandler(command_1.SysCommandName.sys_startservice_req, (c) => { this._startService(c, fromChannel); });
        dispatcher.addHandler(command_1.SysCommandName.sys_stopservice_req, (c) => { this._stopService(c, fromChannel); });
        dispatcher.addHandler(command_1.SysCommandName.sys_runtask_req, (c) => { this._runTask(c, fromChannel); });
        dispatcher.addHandler(command_1.SysCommandName.sys_stoptask_req, (c) => { this._stopTask(c, fromChannel); });
        dispatcher.addHandler(command_1.SysCommandName.sys_ping_req, (c) => { this._onPing(c, fromChannel); });
        dispatcher.addHandler(command_1.SysCommandName.sys_heartbeat_resp, (c) => { this._onHeartbeatResp(c, fromChannel); });
        dispatcher.addHandler(command_1.SysCommandName.sys_taskfinish_req, (c) => { this._onTaskFinish(c, fromChannel); });
        //先暂时处理一下
        if (!command_1.NamespaceHelper.isNamespaceEqual(fromChannel.namespace, this.namespace)) {
            dispatcher.addHandler(command_1.SysCommandName.sys_uploadlog_resp, (c) => { this.dispatcher.dispatch(c); });
        }
    }
    _reportTaskExecuteResult(task) {
        let c = {
            name: command_1.SysCommandName.sys_taskfinish_req,
            from: this.namespace,
            to: { agentid: command_1.NamespaceHelper.MasterAgentId },
            seq: this.nextSeq,
            taskid: task.namespace.taskid,
            jobid: task.jobid,
            msg: 'timeout',
            urls: [],
            code: command_1.ClientExitCode.exception,
        };
        let r = task.getExecuteResult();
        if (r) {
            c.code = r.code;
            c.urls = r.urls;
            c.msg = r.msg;
        }
        this.channelWithMaster.send(c);
    }
    _initClient(client) {
        this.m_clients.push(client);
        client.on('timeout', async () => {
            this.m_logger.info(`===============client exit,namespace=${JSON.stringify(client.namespace)}`);
            if (!client.isService && !client.isLocalTest) {
                this._reportTaskExecuteResult(client);
            }
            await client.stopProcess();
            client.destory();
            this.m_clients.splice(this.m_clients.indexOf(client), 1);
        });
    }
    _newServiceClient(namespace, taskChannel) {
        let client = new service_1.ServiceProxy({
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
    _newTaskClient(namespace, jobid, localTest) {
        let client = new task_1.TaskProxy({
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
    newTaskClient(namespace, jobid, localTest) {
        let client = new task_1.TaskProxy({
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
    async _startService(command, channel) {
        let c = command;
        let err = common_1.ErrorCode.succ;
        do {
            let serviceInfo = this.m_localServiceStorage.getServiceInfo(c.serviceid);
            if (!serviceInfo) {
                err = common_1.ErrorCode.notSupport;
                break;
            }
            let serviceNamespace = { agentid: this.namespace.agentid, serviceid: c.serviceid };
            let clients = this._findClientByNamespace(serviceNamespace);
            if (clients.length) {
                for (let c of clients) {
                    if (command_1.NamespaceHelper.isNamespaceEqual(c.taskNamespace, command.from)) {
                        err = common_1.ErrorCode.exist;
                        break;
                    }
                }
                if (err) {
                    break;
                }
            }
            //生成一个和service对应的task的channel
            let serviceClient = null;
            if (c.from.agentid === this.namespace.agentid) {
                //task和service再同一个机器上面
                let taskClients = this._findClientByNamespace(c.from);
                if (taskClients.length === 0) {
                    this.m_logger.error(`error, when start service, command from task at the same agent with servie, but task not exist`);
                    err = common_1.ErrorCode.exception;
                    break;
                }
                let taskChannel = new private_channel_1.PrivateChannel({
                    namespace: c.from,
                    logger: this.m_logger,
                    timeout: 0,
                });
                taskChannel.initFromChannel({ from: taskClients[0].namespace, to: serviceNamespace, channel: taskClients[0] });
                serviceClient = this._newServiceClient(serviceNamespace, taskChannel);
                //把这个service加到task里面去
                let serviceChannel = new private_channel_1.PrivateChannel({
                    namespace: serviceClient.namespace,
                    logger: this.m_logger,
                    timeout: 0,
                });
                serviceChannel.initFromChannel({ from: serviceClient.namespace, to: taskClients[0].namespace, channel: serviceClient });
                taskClients[0].addService(serviceChannel);
            }
            else {
                let taskChannel = new private_channel_1.PrivateChannel({
                    namespace: c.from,
                    logger: this.m_logger,
                    timeout: 0,
                });
                taskChannel.initFromChannel({ from: c.from, to: serviceNamespace, channel: this.channelWithMaster });
                serviceClient = this._newServiceClient(serviceNamespace, taskChannel);
            }
            let entryfile = path.join(path.dirname(__filename), './service_main.js');
            let param = {
                userData: c.param,
                root: common_1.DirHelper.getRootDir(),
                version: serviceInfo.version,
                namespace: serviceClient.namespace,
                servicename: serviceInfo.servicename,
                port: this.m_localServerPort,
                key: serviceClient.key,
                platform: this.m_platform,
            };
            serviceClient.forkProcess(entryfile, param);
        } while (false);
        let respCmd = {
            name: command_1.SysCommandName.sys_startservice_resp,
            from: this.namespace,
            to: c.from,
            seq: c.seq,
            err,
        };
        channel.send(respCmd);
    }
    async _stopService(command, channel) {
        let c = command;
        let err = common_1.ErrorCode.succ;
        let namespace = { agentid: this.namespace.agentid, serviceid: c.serviceid };
        do {
            let clients = this._findClientByNamespace(namespace);
            if (!clients.length) {
                err = common_1.ErrorCode.notExist;
                break;
            }
            if (c.from.agentid === command_1.NamespaceHelper.MasterAgentId) {
                //要关闭这个机器上的所有的service，
                for (let c of clients) {
                    await c.stopProcess();
                }
            }
            else {
                //从task来，先不检测正确行了，只关闭task对应的
                for (let c of clients) {
                    if (command_1.NamespaceHelper.isNamespaceEqual(command.from, c.taskNamespace)) {
                        await c.stopProcess();
                        break;
                    }
                }
            }
        } while (false);
        let respCmd = {
            name: command_1.SysCommandName.sys_stopservice_resp,
            from: this.namespace,
            to: c.from,
            seq: c.seq,
            err,
        };
        channel.send(respCmd);
    }
    async _updateServiceImpl(service) {
        let namespace = { agentid: this.namespace.agentid, serviceid: service.serviceid };
        let clients = this._findClientByNamespace(namespace);
        if (clients.length) {
            //正在运行，先不打断更新
            return;
        }
        let servicesInfo = this.m_localServiceStorage.getServiceInfo(service.serviceid);
        if (servicesInfo && common_1.VersionHelper.compare(service.newversion, servicesInfo.version) <= 0) {
            if (fs.existsSync(path.join(common_1.DirHelper.getServiceDir(servicesInfo.servicename), 'onload.js'))) {
                return;
            }
        }
        if (this.m_downloading.has(service.md5)) {
            return;
        }
        let unzipFunc = async (filepath) => {
            let dir = common_1.DirHelper.getServiceDir(service.servicename);
            await compressing.zip.uncompress(filepath, dir);
            await this.m_localServiceStorage.update({
                serviceid: service.serviceid,
                servicename: service.servicename,
                version: service.newversion
            });
        };
        let filepath = path.join(common_1.DirHelper.getUpdateDir(), `${service.md5}.zip`);
        if (fs.existsSync(filepath)) {
            let md5Info = common_1.getFileMd5(filepath);
            if (!md5Info.err && md5Info.md5 === service.md5) {
                await unzipFunc(filepath);
                return;
            }
            try {
                fs.unlinkSync(filepath);
            }
            catch (e) {
                console.log(`[service proxy] update service failed, err=${e}`);
                return common_1.ErrorCode.exception;
            }
        }
        this.m_downloading.add(service.md5);
        let err = await common_1.HttpDownloader.downloadByUrl(service.url, filepath, service.md5);
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
    async runTaskLocal(command, localTest) {
        let c = command;
        let namespace = { agentid: this.namespace.agentid, serviceid: c.serviceid, taskid: c.taskid };
        let err = common_1.ErrorCode.succ;
        do {
            let clients = this._findClientByNamespace(namespace);
            if (clients.length) {
                err = common_1.ErrorCode.exist;
                break;
            }
            let taskClient = this._newTaskClient(namespace, c.jobid, localTest);
            try {
                let entryfile = path.join(path.dirname(__filename), './task_main.js');
                let param = {
                    userData: c.param,
                    root: common_1.DirHelper.getRootDir(),
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
            }
            catch (e) {
                this.m_logger.error(`start task exception err=${e}`);
                err = common_1.ErrorCode.exception;
            }
        } while (false);
        return err;
    }
    async _runTaskImpl(command, localTest) {
        let c = command;
        let namespace = { agentid: this.namespace.agentid, serviceid: c.serviceid, taskid: c.taskid };
        let err = common_1.ErrorCode.succ;
        do {
            let clients = this._findClientByNamespace(namespace);
            if (clients.length) {
                err = common_1.ErrorCode.exist;
                break;
            }
            let taskClient = this._newTaskClient(namespace, c.jobid, localTest);
            try {
                let entryfile = path.join(path.dirname(__filename), './task_main.js');
                let param = {
                    userData: c.param,
                    root: common_1.DirHelper.getRootDir(),
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
            }
            catch (e) {
                this.m_logger.error(`start task exception err=${e}`);
                err = common_1.ErrorCode.exception;
            }
        } while (false);
        return err;
    }
    async _runTask(command, channel) {
        let err = await this._runTaskImpl(command, false);
        let respCmd = {
            name: command_1.SysCommandName.sys_runtask_resp,
            from: this.namespace,
            to: command.from,
            seq: command.seq,
            err
        };
        channel.send(respCmd);
    }
    async _stopTask(command, channel) {
        let c = command;
        let namespace = { agentid: this.namespace.agentid, serviceid: c.serviceid, taskid: c.taskid };
        let err = common_1.ErrorCode.succ;
        do {
            let clients = this._findClientByNamespace(namespace);
            if (!clients.length) {
                err = common_1.ErrorCode.notExist;
                break;
            }
            clients[0].setExecuteResult({
                code: command_1.ClientExitCode.killed,
                msg: 'killed',
                urls: [],
            });
            err = await clients[0].stopProcess();
        } while (false);
        let respCmd = {
            name: command_1.SysCommandName.sys_stoptask_resp,
            from: this.namespace,
            to: c.from,
            seq: c.seq,
            err,
        };
        channel.send(respCmd);
    }
    async _onHeartbeatResp(c, channel) {
        let command = c;
        command.services.forEach((item) => {
            this._updateServiceImpl(item);
        });
        if (command.invalidservices) {
            for (let serviceid of command.invalidservices) {
                let namespace = { agentid: this.namespace.agentid, serviceid };
                let info = this.m_localServiceStorage.getServiceInfo(serviceid);
                if (!info) {
                    continue;
                }
                let clients = this._findClientByNamespace(namespace);
                for (let c of clients) {
                    await c.stopProcess();
                }
                let dir = common_1.DirHelper.getServiceDir(info.servicename);
                try {
                    common_1.DirHelper.emptyDir(dir);
                    fs.rmdirSync(dir);
                }
                catch (err) {
                    this.m_logger.error(`failed when remove service dir,name=${info.servicename}, err=${err}`);
                }
            }
            await this.m_localServiceStorage.delete(command.invalidservices);
        }
    }
    _doUploadLog(taskNamespace, channel, bService) {
        return new Promise(async (v) => {
            let name = '';
            if (bService) {
                name = `task_${taskNamespace.taskid}_service_${taskNamespace.serviceid}_${common_1.RandomGenerator.string(4)}.zip`;
            }
            else {
                name = `task_${taskNamespace.taskid}_${common_1.RandomGenerator.string(4)}.zip`;
            }
            let c = {
                name: command_1.SysCommandName.sys_uploadlog_req,
                from: bService ? { agentid: this.namespace.agentid, serviceid: command_1.NamespaceHelper.LocalMasterServiceId } : this.namespace,
                to: channel.namespace,
                seq: this.nextSeq,
                taskNamespace,
                logname: name,
            };
            channel.send(c);
            let resp = await this.waitCommand(command_1.SysCommandName.sys_uploadlog_resp, c.seq, 60 * 1000);
            if (resp.err) {
                v({ err: resp.err });
                return;
            }
            v({ err: resp.c.err, url: resp.c.url });
        });
    }
    async _onTaskFinish(c, channel) {
        //目前只有task会上报这个命令
        let command = c;
        let resp = {
            from: this.namespace,
            to: c.from,
            name: command_1.SysCommandName.sys_taskfinish_resp,
            seq: c.seq,
            err: common_1.ErrorCode.waiting,
        };
        //本地测试用的就先不上报了
        if (channel.isLocalTest) {
            resp.err = common_1.ErrorCode.succ;
            channel.send(resp);
            return;
        }
        let urls = [];
        if (command.code === command_1.ClientExitCode.failed) {
            let intervalAction = new common_1.IntervalAction();
            intervalAction.begin(() => {
                channel.send(resp);
            });
            let ops = [];
            ops.push(this._doUploadLog(channel.namespace, channel, false));
            let services = channel.getServices();
            this.logger.info(`===============master on task finish services count=${services.length}`);
            for (let s of services) {
                ops.push(this._doUploadLog(channel.namespace, s, true));
            }
            let infos = await Promise.all(ops);
            this.logger.info(`===============master on task finish uploadlog ret=${JSON.stringify(infos)}`);
            intervalAction.end();
            for (let info of infos) {
                if (!info.err) {
                    urls.push(info.url);
                }
            }
        }
        channel.setExecuteResult({
            code: command.code,
            urls,
            msg: command.msg,
        });
        resp.err = common_1.ErrorCode.succ;
        channel.send(resp);
    }
    _onPing(c, channel) {
        //发送ping给localmaster的就只有task和service，此时channel就是client
        channel.onPing(c);
    }
    _generateHeartbeatCommand() {
        let services = [];
        this.m_localServiceStorage.getAll().forEach((info) => {
            let serviceClients = this._findClientByNamespace({ agentid: this.namespace.agentid, serviceid: info.serviceid });
            if (fs.existsSync(path.join(common_1.DirHelper.getServiceDir(info.servicename), 'onload.js'))) {
                services.push({ serviceid: info.serviceid, servicename: info.servicename, version: info.version, status: serviceClients.length ? 1 : 0 });
            }
        });
        let tasks = [];
        for (let c of this.m_clients) {
            if (!c.isService) {
                tasks.push(c.namespace.taskid);
            }
        }
        let c = {
            from: this.namespace,
            to: { agentid: command_1.NamespaceHelper.MasterAgentId },
            name: command_1.SysCommandName.sys_heartbeat_req,
            seq: this.nextSeq,
            version: this.version,
            platform: this.m_platform,
            services,
            tasks,
        };
        return c;
    }
}
exports.LocalMaster = LocalMaster;
;
