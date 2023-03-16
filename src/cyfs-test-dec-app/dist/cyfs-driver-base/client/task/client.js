"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskClient = void 0;
const common_1 = require("../../../common");
const define_1 = require("../../command/define");
const command_1 = require("../../command/command");
const client_stack_1 = require("../base/client_stack");
const util_1 = require("../../../common/util");
class TaskClient extends client_stack_1.ClientStack {
    constructor(options) {
        super(options);
        this.m_eventCookie = 1;
        this.m_eventHandler = new Map();
        this.m_argv = options.argv;
        this.m_services = new Map();
        this.runSum = 0;
    }
    getArgv() {
        return this.m_argv;
    }
    init(ip, port) {
        this.dispatcher.addHandler(define_1.SysCommandName.sys_fireevent_req, (c) => { this._fireEvent(c); });
        this.dispatcher.addHandler(define_1.SysCommandName.sys_uploadlog_req, (c) => { this._uploadLog(c); });
        return super.init(ip, port);
    }
    async getAgent(netinfo, includeTags, excludeTags, excludeAgentIds, timeout) {
        let c = {
            name: define_1.SysCommandName.sys_getagent_req,
            from: this.namespace,
            to: { agentid: command_1.NamespaceHelper.MasterAgentId },
            seq: this.nextSeq,
            serviceid: this.namespace.serviceid,
            netinfo: netinfo.name ? netinfo : undefined,
            includeTags,
            excludeTags,
            excludeAgentIds
        };
        this.channelWithMaster.send(c);
        let resp = await this.waitCommand(define_1.SysCommandName.sys_getagent_resp, c.seq, timeout);
        if (resp.err) {
            return { err: resp.err };
        }
        let respC = resp.c;
        if (!respC.agentid || !respC.agentid.length) {
            return { err: common_1.ErrorCode.notFound };
        }
        return { err: common_1.ErrorCode.succ, agentid: respC.agentid, netinfo: respC.netinfo };
    }
    async startService(param, agentid, timeout, serviceid) {
        let c = {
            name: define_1.SysCommandName.sys_startservice_req,
            from: this.namespace,
            to: { agentid, serviceid: command_1.NamespaceHelper.LocalMasterServiceId },
            seq: this.nextSeq,
            serviceid: serviceid ? serviceid : this.namespace.serviceid,
            param,
        };
        this.channelWithMaster.send(c);
        let resp = await this.waitCommand(define_1.SysCommandName.sys_startservice_resp, c.seq, timeout);
        if (resp.err) {
            return resp.err;
        }
        //等2s钟，让service注册上去
        await util_1.sleep(2000);
        if (resp.c.err && resp.c.err !== common_1.ErrorCode.exist) {
            return resp.c.err;
        }
        if (!this.m_services.has(c.to.agentid)) {
            this.m_services.set(c.to.agentid, [c.serviceid]);
        }
        else {
            this.m_services.get(c.to.agentid).push(c.serviceid);
        }
        return common_1.ErrorCode.succ;
    }
    async stopService(agentid, timeout, serviceid) {
        if (!this.m_services.has(agentid)) {
            return common_1.ErrorCode.notFound;
        }
        let toService = serviceid ? serviceid : this.namespace.serviceid;
        let bStart = false;
        for (let s of this.m_services.get(agentid)) {
            if (s === toService) {
                bStart = true;
                break;
            }
        }
        if (!bStart) {
            return common_1.ErrorCode.notFound;
        }
        let c = {
            name: define_1.SysCommandName.sys_stopservice_req,
            from: this.namespace,
            to: { agentid, serviceid: command_1.NamespaceHelper.LocalMasterServiceId },
            seq: this.nextSeq,
            serviceid: toService,
        };
        this.channelWithMaster.send(c);
        let resp = await this.waitCommand(define_1.SysCommandName.sys_stopservice_resp, c.seq, timeout);
        if (resp.err) {
            return resp.err;
        }
        if (resp.c.err) {
            return resp.c.err;
        }
        let info = this.m_services.get(agentid);
        if (info) {
            for (let i = 0; i < info.length; i++) {
                if (info[i] === toService) {
                    info.splice(i, 1);
                }
            }
        }
        return common_1.ErrorCode.succ;
    }
    async notifyResult(code, msg, timeout) {
        let c = {
            name: define_1.SysCommandName.sys_taskfinish_req,
            from: this.namespace,
            to: { agentid: this.namespace.agentid, serviceid: command_1.NamespaceHelper.LocalMasterServiceId },
            seq: this.nextSeq,
            taskid: this.namespace.taskid,
            jobid: '0',
            msg,
            urls: [],
            code: code,
        };
        this.channelWithMaster.send(c);
        let resp = await this.waitCommand(define_1.SysCommandName.sys_taskfinish_resp, c.seq, timeout);
        if (resp.err) {
            return resp.err;
        }
        return resp.c.err;
    }
    async attachEvent(eventname, handler, agentid, timeout, serviceid) {
        let sid = serviceid ? serviceid : this.namespace.serviceid;
        let entrys = this.m_eventHandler.get(eventname);
        if (entrys) {
            for (let item of entrys) {
                if (item.agentid === agentid && item.serviceid === sid) {
                    let cookie = this.m_eventCookie++;
                    item.handlerInfo.push({ handler, cookie });
                    return { err: common_1.ErrorCode.succ, cookie };
                }
            }
        }
        let c = {
            name: define_1.SysCommandName.sys_attachevent_req,
            from: this.namespace,
            to: { agentid, serviceid: sid },
            seq: this.nextSeq,
            eventname,
        };
        this.channelWithMaster.send(c);
        let resp = await this.waitCommand(define_1.SysCommandName.sys_attachevent_resp, c.seq, timeout);
        if (resp.err) {
            return { err: resp.err };
        }
        if (resp.c.err) {
            return { err: resp.c.err };
        }
        let cookie = this.m_eventCookie++;
        let entry = {
            handlerInfo: [],
            agentid,
            serviceid: c.to.serviceid,
            remoteCookie: resp.c.cookie,
        };
        entry.handlerInfo.push({ handler, cookie });
        if (!this.m_eventHandler.has(eventname)) {
            this.m_eventHandler.set(eventname, [entry]);
        }
        else {
            this.m_eventHandler.get(eventname).push(entry);
        }
        return { err: common_1.ErrorCode.succ, cookie };
    }
    async detachEvent(eventname, cookie, timeout) {
        if (!this.m_eventHandler.has(eventname)) {
            return common_1.ErrorCode.notExist;
        }
        let entrys = this.m_eventHandler.get(eventname);
        if (!entrys.length) {
            return common_1.ErrorCode.notExist;
        }
        let entryIndex = entrys.length;
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
            return common_1.ErrorCode.notExist;
        }
        if (entrys[entryIndex].handlerInfo.length) {
            return common_1.ErrorCode.succ;
        }
        let c = {
            name: define_1.SysCommandName.sys_detachevent_req,
            from: this.namespace,
            to: { agentid: entrys[entryIndex].agentid, serviceid: entrys[entryIndex].serviceid },
            seq: this.nextSeq,
            eventname,
            cookie: entrys[entryIndex].remoteCookie,
        };
        this.channelWithMaster.send(c);
        let resp = await this.waitCommand(define_1.SysCommandName.sys_detachevent_resp, c.seq, timeout);
        if (resp.err) {
            return resp.err;
        }
        entrys.splice(entryIndex, 1);
        if (!entrys.length) {
            this.m_eventHandler.delete(eventname);
        }
        return resp.c.err;
    }
    async callApi(apiname, bytes, param, agentid, timeout, serviceid) {
        let c = {
            name: define_1.SysCommandName.sys_userapi_req,
            from: this.namespace,
            to: { agentid, serviceid: serviceid ? serviceid : this.namespace.serviceid },
            seq: this.nextSeq,
            apiname,
            bytes,
            param,
        };
        this.channelWithMaster.send(c);
        let resp = await this.waitCommand(define_1.SysCommandName.sys_userapi_resp, c.seq, timeout);
        if (resp.err) {
            return { err: resp.err, bytes: Buffer.from(''), value: {} };
        }
        return { err: resp.c.err, bytes: resp.c.bytes, value: resp.c.param };
    }
    async exit(code, msg, timeout) {
        this.runSum = this.runSum + 1;
        await this.notifyResult(code, msg);
        for (let info of this.m_services) {
            for (let i = 0; i < info[1].length; i++) {
                await this.stopService(info[0], timeout, info[1][i]);
            }
        }
        this.m_services = new Map();
        this.getLogger().info(`### task exit`);
        await super.exit(code, msg, timeout);
    }
    _fireEvent(command) {
        let c = command;
        if (!this.m_eventHandler.has(c.eventname)) {
            return;
        }
        let entrys = this.m_eventHandler.get(c.eventname);
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
    async _uploadLog(command) {
        let c = command;
        let resp = {
            name: define_1.SysCommandName.sys_uploadlog_resp,
            from: this.namespace,
            to: c.from,
            seq: c.seq,
            err: common_1.ErrorCode.waiting,
            url: '',
        };
        let intervalAction = new common_1.IntervalAction();
        intervalAction.begin(() => {
            this.channelWithMaster.send(resp);
        });
        await util_1.sleep(3000);
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
exports.TaskClient = TaskClient;
