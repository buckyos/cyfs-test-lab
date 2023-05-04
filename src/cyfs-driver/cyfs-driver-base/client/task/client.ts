import {ErrorCode, IntervalAction} from '../../../cyfs-test-base';
import {Command, CommandSysStartServiceReq, SysCommandName, CommandSysStartServiceResp, CommandSysStopServiceReq, CommandSysStopServiceResp, CommandSysAttachEventReq, CommandSysAttachEventResp, CommandSysDetachEventResp, CommandSysDetachEventReq, CommandSysPingReq, CommandSysFireEventReq, CommandSysUserApiReq, CommandSysUserApiResp, CommandSysGetAgentReq, CommandSysGetAgentResp, CommandSysUploadLogReq, CommandSysUploadLogResp, CommandSysTaskFinishReq, CommandSysTaskFinishResp} from '../../command/define';
import { Namespace, NetEntry, NamespaceHelper, ClientExitCode } from '../../command/command';
import { ClientStack, ClientStackOptions, ClientStackInterface } from '../base/client_stack';
import { sleep } from '../../../cyfs-test-base';

export type TaskClientEventHandler = (err: ErrorCode,namespace: Namespace, ...argv: any[]) => void;

export interface TaskClientInterface extends ClientStackInterface {
    getAgent(netinfo: NetEntry, includeTags: string[], excludeTags: string[], excludeAgentIds: string[], timeout?: number): Promise<{err: ErrorCode, agentid?: string, netinfo?: NetEntry}>;
    startService(param: string[], agentid: string, timeout?: number, serviceid?: string): Promise<ErrorCode>;
    stopService(agentid: string, timeout?: number, serviceid?: string): Promise<ErrorCode>;
    attachEvent(eventname: string, handler: TaskClientEventHandler, agentid: string, timeout?: number, serviceid?: string): Promise<{err: ErrorCode, cookie?: number}>;
    detachEvent(eventname: string, cookie: number, timeout?: number): Promise<ErrorCode>;
    callApi(apiname: string, bytes: Buffer, param: {} & any, agentid: string, timeout?: number, serviceid?: string): Promise<{err: ErrorCode, bytes?: Buffer, value: {} & any}>;
    getArgv(): string[];
}

export type TaskClientOptions = ClientStackOptions & {
    argv: string[];
}

type TaskClientEventEntry = {
    handlerInfo: {handler: TaskClientEventHandler;cookie: number;}[];
    remoteCookie: number;
    agentid: string;
    serviceid: string;
}

export class TaskClient extends ClientStack implements TaskClientInterface{
    private m_argv: string[];
    private m_eventCookie: number = 1;
    private m_eventHandler: Map<string, TaskClientEventEntry[]>;
    private m_services: Map<string, string[]>;
    public runSum : number;
    constructor(options: TaskClientOptions) {
        super(options);
        this.m_eventHandler = new Map();
        this.m_argv = options.argv;
        this.m_services = new Map();
        this.runSum = 0;
    }

    getArgv(): string[] {
        return this.m_argv;
    }

    init(ip: string, port: number): ErrorCode {
        this.dispatcher.addHandler(SysCommandName.sys_fireevent_req, (c: Command) => {this._fireEvent(c);});
        this.dispatcher.addHandler(SysCommandName.sys_uploadlog_req, (c: Command) => {this._uploadLog(c);});
        return super.init(ip, port);
    }

    async getAgent(netinfo: NetEntry, includeTags: string[], excludeTags: string[], excludeAgentIds: string[], timeout?: number): Promise<{err: ErrorCode, agentid?: string, netinfo?: NetEntry}> {
        let c: CommandSysGetAgentReq = {
            name: SysCommandName.sys_getagent_req,
            from: this.namespace,
            to: {agentid: NamespaceHelper.MasterAgentId},
            seq: this.nextSeq,
            serviceid: this.namespace.serviceid!,
            netinfo: netinfo.name ? netinfo : undefined,
            includeTags,
            excludeTags,
            excludeAgentIds
        }

        this.channelWithMaster.send(c);

        let resp = await this.waitCommand(SysCommandName.sys_getagent_resp, c.seq, timeout);
        if (resp.err) {
            return {err: resp.err};
        }

        let respC: CommandSysGetAgentResp = resp.c! as CommandSysGetAgentResp;
        if (!respC.agentid || !respC.agentid.length) {
            return {err: ErrorCode.notFound};
        }

        return {err: ErrorCode.succ, agentid: respC.agentid, netinfo: respC.netinfo};
    }

    async startService(param: string[], agentid: string, timeout?: number, serviceid?: string): Promise<ErrorCode> {
        let c: CommandSysStartServiceReq = {
            name: SysCommandName.sys_startservice_req,
            from: this.namespace,
            to: { agentid, serviceid: NamespaceHelper.LocalMasterServiceId },
            seq: this.nextSeq,
            serviceid: serviceid ? serviceid! : this.namespace.serviceid!,
            param,
        };

        this.channelWithMaster.send(c);

        let resp = await this.waitCommand(SysCommandName.sys_startservice_resp, c.seq, timeout);
        if (resp.err) {
            return resp.err;
        }

        //等2s钟，让service注册上去
        await sleep(2000);

        if ((resp.c! as CommandSysStartServiceResp).err && (resp.c! as CommandSysStartServiceResp).err !== ErrorCode.exist) {
            return (resp.c! as CommandSysStartServiceResp).err;
        }

        if (!this.m_services.has(c.to.agentid!)) {
            this.m_services.set(c.to.agentid!, [c.serviceid]);
        } else {
            this.m_services.get(c.to.agentid!)!.push(c.serviceid);
        }

        return ErrorCode.succ;
    }

    async stopService(agentid: string, timeout?: number, serviceid?: string): Promise<ErrorCode> {
        if (!this.m_services.has(agentid)) {
            return ErrorCode.notFound;
        }
        let toService = serviceid ? serviceid! : this.namespace.serviceid!;
        let bStart: boolean = false;
        for (let s of this.m_services.get(agentid)!) {
            if (s === toService) {
                bStart = true;
                break;
            }
        }
        if (!bStart) {
            return ErrorCode.notFound;
        }
        let c: CommandSysStopServiceReq = {
            name: SysCommandName.sys_stopservice_req,
            from: this.namespace,
            to: { agentid, serviceid: NamespaceHelper.LocalMasterServiceId },
            seq: this.nextSeq,
            serviceid: toService,
        };

        this.channelWithMaster.send(c);

        let resp = await this.waitCommand(SysCommandName.sys_stopservice_resp, c.seq, timeout);
        if (resp.err) {
            return resp.err;
        }

        if ((resp.c! as CommandSysStopServiceResp).err) {
            return (resp.c! as CommandSysStopServiceResp).err;
        }

        let info = this.m_services.get(agentid)!;
        if (info) {
            for (let i = 0; i < info.length; i++) {
                if (info[i] === toService) {
                    info.splice(i, 1);
                }
            }
        }
        return ErrorCode.succ;
    }

    async notifyResult(code: ClientExitCode, msg: string, timeout?: number): Promise<ErrorCode> {
        let c: CommandSysTaskFinishReq = {
            name: SysCommandName.sys_taskfinish_req,
            from: this.namespace,
            to: {agentid: this.namespace.agentid, serviceid: NamespaceHelper.LocalMasterServiceId},
            seq: this.nextSeq,
            taskid: this.namespace.taskid!,
            jobid: '0',
            msg,
            urls: [],
            code: (code as number),
        }

        this.channelWithMaster.send(c);

        let resp = await this.waitCommand(SysCommandName.sys_taskfinish_resp, c.seq, timeout);
        if (resp.err) {
            return resp.err;
        }

        return (resp.c! as CommandSysTaskFinishResp).err;
    }

    public async attachEvent(eventname: string, handler: TaskClientEventHandler, agentid: string, timeout?: number, serviceid?: string): Promise<{err: ErrorCode, cookie?: number}> {
        let sid: string  = serviceid ? serviceid : this.namespace.serviceid!;
        let entrys = this.m_eventHandler.get(eventname);
        if (entrys) {
            for (let item of entrys) {
                if (item.agentid === agentid && item.serviceid === sid) {
                    let cookie = this.m_eventCookie++;
                    item.handlerInfo.push({handler, cookie});
                    return {err: ErrorCode.succ, cookie};
                }
            }
        }
        let c: CommandSysAttachEventReq = {
            name: SysCommandName.sys_attachevent_req,
            from: this.namespace,
            to: {agentid, serviceid: sid},
            seq: this.nextSeq,
            eventname,
        };
        this.channelWithMaster.send(c);
        let resp = await this.waitCommand(SysCommandName.sys_attachevent_resp, c.seq, timeout);
        if (resp.err) {
            return {err: resp.err};
        }
        if ((resp.c! as CommandSysAttachEventResp).err) {
            return {err: (resp.c! as CommandSysAttachEventResp).err};
        }

        let cookie = this.m_eventCookie++;
        let entry: TaskClientEventEntry = {
            handlerInfo: [],
            agentid,
            serviceid: c.to.serviceid!, 
            remoteCookie: (resp.c! as CommandSysAttachEventResp).cookie,
        };
        entry.handlerInfo.push({handler, cookie});

        if (!this.m_eventHandler.has(eventname)) {
            this.m_eventHandler.set(eventname, [entry]);
        } else {
            this.m_eventHandler.get(eventname)!.push(entry);
        }

        return {err: ErrorCode.succ, cookie};
    }

    public async detachEvent(eventname: string, cookie: number, timeout?: number): Promise<ErrorCode> {
        if (!this.m_eventHandler.has(eventname)) {
            return ErrorCode.notExist;
        }

        let entrys: TaskClientEventEntry[] = this.m_eventHandler.get(eventname)!;
        if (!entrys.length) {
            return ErrorCode.notExist;
        }

        let entryIndex: number = entrys.length;
        for (let i = 0; i < entrys.length; i++) {
            for (let j = 0; j < entrys[i].handlerInfo.length; j++) {
                if (entrys[i].handlerInfo[j].cookie === cookie) {
                    entrys[i].handlerInfo.splice(j, 1);
                    entryIndex = i;
                    break;
                }
            }
            if (entryIndex < entrys.length) {
                break;
            }
        }

        if (entryIndex === entrys.length) {
            return ErrorCode.notExist;
        }
        if (entrys[entryIndex].handlerInfo.length) {
            return ErrorCode.succ;
        }
        
        let c: CommandSysDetachEventReq = {
            name: SysCommandName.sys_detachevent_req,
            from: this.namespace,
            to: { agentid: entrys[entryIndex].agentid, serviceid: entrys[entryIndex].serviceid},
            seq: this.nextSeq,
            eventname,
            cookie: entrys[entryIndex].remoteCookie,
        };

        this.channelWithMaster.send(c);
        let resp = await this.waitCommand(SysCommandName.sys_detachevent_resp, c.seq, timeout);
        if (resp.err) {
            return resp.err;
        }

        entrys.splice(entryIndex, 1);
        if (!entrys.length) {
            this.m_eventHandler.delete(eventname);
        }

        return (resp.c! as CommandSysDetachEventResp).err;
    }

    async callApi(apiname: string, bytes: Buffer, param: {} & any, agentid: string, timeout?: number, serviceid?: string): Promise<{err: ErrorCode, bytes?: Buffer, value: {} & any}> {
        let c: CommandSysUserApiReq = {
            name: SysCommandName.sys_userapi_req,
            from: this.namespace,
            to: {agentid, serviceid: serviceid ? serviceid : this.namespace.serviceid},
            seq: this.nextSeq,
            apiname,
            bytes,
            param,
        };
        this.channelWithMaster.send(c);
        let resp = await this.waitCommand(SysCommandName.sys_userapi_resp, c.seq, timeout);
        if (resp.err) {
            return {err: resp.err, bytes: Buffer.from(''), value: {}};
        }
        return {err: (resp.c! as CommandSysUserApiResp).err, bytes: (resp.c! as CommandSysUserApiResp).bytes ,value: (resp.c! as CommandSysUserApiResp).param};
    }

    async exit(code: ClientExitCode, msg: string, timeout?: number) {
        this.runSum = this.runSum + 1;
        await this.notifyResult(code, msg);

        for (let info of this.m_services) {
            for (let i = 0; i < info[1].length; i++) {
                await this.stopService(info[0], timeout, info[1][i]);
            }
        }
        this.m_services = new Map();
        this.getLogger().info(`### task exit`)
        await super.exit(code, msg, timeout);
    }

    protected _fireEvent(command: Command) {
        let c: CommandSysFireEventReq = command as CommandSysFireEventReq;
        if (!this.m_eventHandler.has(c.eventname)) {
            return ;
        } 

        let entrys: TaskClientEventEntry[] = this.m_eventHandler.get(c.eventname)!;
        let copy = entrys.slice();

        for (let entry of copy) {
            if (entry.agentid === command.from.agentid && entry.serviceid === command.from.serviceid) {
                let handlerInfo = entry.handlerInfo.slice();
                handlerInfo.forEach((info) => {
                    info.handler(c.err, c.from, ...c.param);
                });
            }
        }
    }

    protected async _uploadLog(command: Command) {
        let c: CommandSysUploadLogReq = command as CommandSysUploadLogReq;
        let resp: CommandSysUploadLogResp = {
            name: SysCommandName.sys_uploadlog_resp,
            from: this.namespace, 
            to: c.from,
            seq: c.seq,
            err: ErrorCode.waiting,
            url: '',
        };
        let intervalAction = new IntervalAction();
        intervalAction.begin(() => {
            this.channelWithMaster.send(resp);
        });

        await sleep(3000);
        
        let info = await this.zip(this.logger.dir(), c.logname);
        if (info.err) {
            intervalAction.end();
            resp.err = info.err;
            this.channelWithMaster.send(resp);
            return ;
        }

        let upInfo = await this.uploadFile(info.dstPath!, 'logs');
        intervalAction.end();
        resp.err = upInfo.err;
        if (!upInfo.err) {
            resp.url = upInfo.url!;
        }
        this.channelWithMaster.send(resp);
    }
}