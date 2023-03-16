"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceClient = void 0;
const errcode_1 = require("../../../common/errcode");
const define_1 = require("../../command/define");
const command_1 = require("../../command/command");
const client_stack_1 = require("../base/client_stack");
const common_1 = require("../../../common");
class ServiceClient extends client_stack_1.ClientStack {
    constructor(options) {
        super(options);
        this.m_eventCookie = 1;
        this.m_eventEntrys = new Map();
        this.m_userApi = new Map();
        this.m_argv = options.argv;
    }
    getArgv() {
        return this.m_argv;
    }
    init(ip, port) {
        this.dispatcher.addHandler(define_1.SysCommandName.sys_attachevent_req, (c) => { this._attachEvent(c); });
        this.dispatcher.addHandler(define_1.SysCommandName.sys_detachevent_req, (c) => { this._detachEvent(c); });
        this.dispatcher.addHandler(define_1.SysCommandName.sys_userapi_req, (c) => { this._userCall(c); });
        this.dispatcher.addHandler(define_1.SysCommandName.sys_uploadlog_req, (c) => { this._uploadLog(c); });
        return super.init(ip, port);
    }
    registerApi(name, handler) {
        this.m_userApi.set(name, handler);
    }
    fireEvent(name, err, ...argv) {
        if (!this.m_eventEntrys.has(name)) {
            return;
        }
        let entrys = this.m_eventEntrys.get(name);
        let copy = entrys.slice();
        let seq = this.nextSeq;
        copy.forEach((entry) => {
            let respCmd = {
                name: define_1.SysCommandName.sys_fireevent_req,
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
    _attachEvent(command) {
        let c = command;
        if (!this.m_eventEntrys.has(c.eventname)) {
            this.m_eventEntrys.set(c.eventname, []);
        }
        let cookie = this.m_eventCookie++;
        this.m_eventEntrys.get(c.eventname).push({ namespace: c.from, cookie });
        let respCmd = {
            name: define_1.SysCommandName.sys_attachevent_resp,
            from: this.namespace,
            to: c.from,
            seq: c.seq,
            err: errcode_1.ErrorCode.succ,
            cookie,
        };
        this.channelWithMaster.send(respCmd);
    }
    _detachEvent(command) {
        let c = command;
        let err = errcode_1.ErrorCode.succ;
        do {
            if (!this.m_eventEntrys.has(c.eventname)) {
                err = errcode_1.ErrorCode.notExist;
                break;
            }
            let entrys = this.m_eventEntrys.get(c.eventname);
            for (let i = 0; i < entrys.length; i++) {
                if (command_1.NamespaceHelper.isNamespaceEqual(c.from, entrys[i].namespace) && c.cookie === entrys[i].cookie) {
                    entrys.splice(i, 1);
                    break;
                }
            }
            if (!entrys.length) {
                this.m_eventEntrys.delete(c.eventname);
            }
        } while (false);
        let respCmd = {
            name: define_1.SysCommandName.sys_detachevent_resp,
            from: this.namespace,
            to: c.from,
            seq: c.seq,
            err,
        };
        this.channelWithMaster.send(respCmd);
    }
    async _userCall(command) {
        let c = command;
        let err = errcode_1.ErrorCode.notExist;
        let respCmd = {
            name: define_1.SysCommandName.sys_userapi_resp,
            from: this.namespace,
            to: c.from,
            seq: c.seq,
            err,
            param: {},
            bytes: Buffer.from(''),
        };
        if (this.m_userApi.has(c.apiname)) {
            respCmd.err = errcode_1.ErrorCode.waiting;
            let intervalAction = new common_1.IntervalAction();
            intervalAction.begin(() => {
                this.channelWithMaster.send(respCmd);
            }, 60 * 1000);
            let retInfo = await this.m_userApi.get(c.apiname)(c.from, c.bytes, c.param);
            intervalAction.end();
            respCmd.err = retInfo.err;
            respCmd.bytes = retInfo.bytes;
            respCmd.param = retInfo.value;
        }
        this.channelWithMaster.send(respCmd);
    }
    async _uploadLog(command) {
        let c = command;
        let resp = {
            name: define_1.SysCommandName.sys_uploadlog_resp,
            from: this.namespace,
            to: c.from,
            seq: c.seq,
            err: errcode_1.ErrorCode.waiting,
            url: '',
        };
        let intervalAction = new common_1.IntervalAction();
        intervalAction.begin(() => {
            this.channelWithMaster.send(resp);
        });
        await common_1.sleep(3000);
        let info = await this.zip(this.logger.dir(), c.logname);
        if (info.err) {
            intervalAction.end();
            resp.err = info.err;
            this.channelWithMaster.send(resp);
            return;
        }
        let upInfo = await this.uploadFile(info.dstPath, 'logs');
        intervalAction.end();
        resp.err = upInfo.err;
        if (!upInfo.err) {
            resp.url = upInfo.url;
        }
        this.channelWithMaster.send(resp);
    }
}
exports.ServiceClient = ServiceClient;
