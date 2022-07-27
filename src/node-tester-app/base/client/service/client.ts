import {ErrorCode} from '../../common/errcode';
import {Namespace, Command, SysCommandName, CommandSysFireEventReq, CommandSysPingReq, CommandSysAttachEventReq, CommandSysAttachEventResp, CommandSysDetachEventReq, CommandSysDetachEventResp, CommandSysUserApiReq, CommandSysUserApiResp, CommandSysUploadLogReq, CommandSysUploadLogResp} from '../../command/define';
import { NamespaceHelper } from '../../command/command';
import { ClientStackInterface, ClientStackOptions, ClientStack } from '../base/client_stack';
import { IntervalAction, sleep } from '../../common';


export type UserApiHandler = (from: Namespace, bytes: Buffer, param: any) => Promise<{err: ErrorCode, bytes: Buffer, value: {} & any}>;

export interface ServiceClientInterface extends ClientStackInterface {
    registerApi(name: string, handler: UserApiHandler): void;
    fireEvent(name: string, err: ErrorCode, ...argv: any[]): void;
    getArgv(): string[];
}

export type ServiceClientOptions = ClientStackOptions & {
    argv: string[];
};
type ServiceClientEventEntry = {
    namespace: Namespace,
    cookie: number;
}

export class ServiceClient extends ClientStack implements ServiceClientInterface {
    private m_eventEntrys: Map<string, ServiceClientEventEntry[]>;
    private m_eventCookie: number = 1;
    private m_userApi: Map<string, UserApiHandler>;
    private m_argv: string[];
    
    constructor(options: ServiceClientOptions) {
        super(options);

        this.m_eventEntrys = new Map();
        this.m_userApi = new Map();
        this.m_argv = options.argv;
    }

    getArgv(): string[] {
        return this.m_argv;
    }

    init(ip: string, port: number): ErrorCode {
        this.dispatcher.addHandler(SysCommandName.sys_attachevent_req, (c: Command) => {this._attachEvent(c);});
        this.dispatcher.addHandler(SysCommandName.sys_detachevent_req, (c: Command) => {this._detachEvent(c);});
        this.dispatcher.addHandler(SysCommandName.sys_userapi_req, (c: Command) => {this._userCall(c);});
        this.dispatcher.addHandler(SysCommandName.sys_uploadlog_req, (c: Command) => {this._uploadLog(c);});
        return super.init(ip, port);
    }

    registerApi(name: string, handler: UserApiHandler) {
        this.m_userApi.set(name, handler);
    }

    fireEvent(name: string, err: ErrorCode, ...argv: any[]) {
        if (!this.m_eventEntrys.has(name)) {
            return;
        }

        let entrys: ServiceClientEventEntry[] = this.m_eventEntrys.get(name)!;
        let copy = entrys.slice();
        let seq: number = this.nextSeq;
        copy.forEach((entry) => {
            let respCmd: CommandSysFireEventReq = {
                name: SysCommandName.sys_fireevent_req,
                from: this.namespace,
                to: entry.namespace,
                seq,
                eventname: name,
                err,
                param: argv
            };
    
            this.channelWithMaster.send(respCmd);
        });
    }

    protected _attachEvent(command: Command) {
        let c: CommandSysAttachEventReq = command as CommandSysAttachEventReq;
        if (!this.m_eventEntrys.has(c.eventname)) {
            this.m_eventEntrys.set(c.eventname, []);
        }

        let cookie: number = this.m_eventCookie++;
        this.m_eventEntrys.get(c.eventname)!.push({namespace: c.from, cookie});

        let respCmd: CommandSysAttachEventResp = {
            name: SysCommandName.sys_attachevent_resp,
            from: this.namespace,
            to: c.from,
            seq: c.seq,
            err: ErrorCode.succ,
            cookie,
        };

        this.channelWithMaster.send(respCmd);
    }

    protected _detachEvent(command: Command) {
        let c: CommandSysDetachEventReq = command as CommandSysDetachEventReq;

        let err: ErrorCode = ErrorCode.succ;
        do {
            if (!this.m_eventEntrys.has(c.eventname)) {
                err = ErrorCode.notExist;
                break;
            }
            
            let entrys: ServiceClientEventEntry[] = this.m_eventEntrys.get(c.eventname)!;
            for (let i = 0; i < entrys.length; i++) {
                if (NamespaceHelper.isNamespaceEqual(c.from, entrys[i].namespace) && c.cookie === entrys[i].cookie) {
                    entrys.splice(i, 1);
                    break;
                }
            }
            if (!entrys.length) {
                this.m_eventEntrys.delete(c.eventname);
            }
        } while(false);

        let respCmd: CommandSysDetachEventResp = {
            name: SysCommandName.sys_detachevent_resp,
            from: this.namespace,
            to: c.from,
            seq: c.seq,
            err,
        };

        this.channelWithMaster.send(respCmd);
    }

    protected async _userCall(command: Command) {
        let c: CommandSysUserApiReq = command as CommandSysUserApiReq;
        
        let err: ErrorCode = ErrorCode.notExist;
        let respCmd: CommandSysUserApiResp = {
            name: SysCommandName.sys_userapi_resp,
            from: this.namespace,
            to: c.from,
            seq: c.seq,
            err,
            param: {},
            bytes: Buffer.from(''),
        };
        if (this.m_userApi.has(c.apiname)) {
            respCmd.err = ErrorCode.waiting;
            let intervalAction = new IntervalAction();
            intervalAction.begin(() => {
                this.channelWithMaster.send(respCmd);
            }, 60 * 1000);
            let retInfo = await this.m_userApi.get(c.apiname)!(c.from, c.bytes, c.param);
            intervalAction.end();
            respCmd.err = retInfo.err;
            respCmd.bytes = retInfo.bytes;
            respCmd.param = retInfo.value;
        }

        this.channelWithMaster.send(respCmd);
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