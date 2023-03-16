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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SysCommandName = void 0;
const errcode_1 = require("../../common/errcode");
const Command = __importStar(require("./command"));
__exportStar(require("./command"), exports);
const writer_1 = require("../../common/writer");
class SysCommandName {
}
exports.SysCommandName = SysCommandName;
SysCommandName.sys_heartbeat_req = 'sys.heartbeat.req';
SysCommandName.sys_heartbeat_resp = 'sys.heartbeat.resp';
SysCommandName.sys_ping_req = 'sys.ping.req';
SysCommandName.sys_heartbeatlocal_resp = 'sys.heartbeatlocal.resp';
SysCommandName.sys_getagent_req = 'sys.getagent.req';
SysCommandName.sys_getagent_resp = 'sys.getagent.resp';
SysCommandName.sys_startservice_req = 'sys.startservice.req';
SysCommandName.sys_startservice_resp = 'sys.startservice.resp';
SysCommandName.sys_stopservice_req = 'sys.stopservice.req';
SysCommandName.sys_stopservice_resp = 'sys.stopservice.resp';
SysCommandName.sys_uploadlog_req = 'sys.uploadlog.req';
SysCommandName.sys_uploadlog_resp = 'sys.uploadlog.resp';
SysCommandName.sys_updateservice_req = 'sys.updateservice.req';
SysCommandName.sys_runtask_req = 'sys.runtask.req';
SysCommandName.sys_runtask_resp = 'sys.runtask.resp';
SysCommandName.sys_taskfinish_req = 'sys.taskfinish.req';
SysCommandName.sys_taskfinish_resp = 'sys.taskfinish.resp';
SysCommandName.sys_stoptask_req = 'sys.stoptask.req';
SysCommandName.sys_stoptask_resp = 'sys.stoptask.resp';
SysCommandName.sys_attachevent_req = 'sys.attachevent.req';
SysCommandName.sys_attachevent_resp = 'sys.attachevent.resp';
SysCommandName.sys_detachevent_req = 'sys.detachevent.req';
SysCommandName.sys_detachevent_resp = 'sys.detachevent.resp';
SysCommandName.sys_fireevent_req = 'sys.fireevent.req';
SysCommandName.sys_userapi_req = 'sys.userapi.req';
SysCommandName.sys_userapi_resp = 'sys.userapi.resp';
Command.CommandDefine.RegisterCommand(SysCommandName.sys_heartbeat_req, {
    encoder: (c, writer) => {
        let command = c;
        writer.writeU16(Buffer.byteLength(command.version, 'utf-8'));
        writer.writeString(command.version, 'utf-8');
        writer.writeU16(Buffer.byteLength(command.platform, 'utf-8'));
        writer.writeString(command.platform, 'utf-8');
        writer.writeU16(command.services.length);
        command.services.forEach((item) => {
            writer.writeU16(Buffer.byteLength(item.serviceid, 'utf-8'));
            writer.writeString(item.serviceid, 'utf-8');
            writer.writeU16(Buffer.byteLength(item.servicename, 'utf-8'));
            writer.writeString(item.servicename, 'utf-8');
            writer.writeU16(Buffer.byteLength(item.version, 'utf-8'));
            writer.writeString(item.version, 'utf-8');
            writer.writeU8(item.status);
        });
        writer.writeU16(command.tasks.length);
        command.tasks.forEach((taskid) => {
            writer.writeU16(Buffer.byteLength(taskid, 'utf-8'));
            writer.writeString(taskid, 'utf-8');
        });
        return errcode_1.ErrorCode.succ;
    },
    decoder: (reader) => {
        let len = reader.readU16();
        let version = reader.readString('utf-8', len);
        len = reader.readU16();
        let platform = reader.readString('utf-8', len);
        let services = [];
        let count = reader.readU16();
        for (let i = 0; i < count; i++) {
            let len = reader.readU16();
            let serviceid = reader.readString('utf-8', len);
            len = reader.readU16();
            let servicename = reader.readString('utf-8', len);
            len = reader.readU16();
            let version = reader.readString('utf-8', len);
            let status = reader.readU8();
            services.push({ serviceid, servicename, version, status });
        }
        let tasks = [];
        count = reader.readU16();
        for (let i = 0; i < count; i++) {
            let len = reader.readU16();
            let taskid = reader.readString('utf-8', len);
            tasks.push(taskid);
        }
        return { err: errcode_1.ErrorCode.succ, body: { version, platform, services, tasks } };
    },
    printer: (c) => {
        return `name=${c.name}, seq=${c.seq},version=${c.version},services=${JSON.stringify(c.services)}, tasks=${JSON.stringify(c.tasks)} from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});
Command.CommandDefine.RegisterCommand(SysCommandName.sys_heartbeat_resp, {
    encoder: (c, writer) => {
        let command = c;
        writer.writeU16(command.services.length);
        command.services.forEach((item) => {
            writer.writeU16(Buffer.byteLength(item.serviceid, 'utf-8'));
            writer.writeString(item.serviceid, 'utf-8');
            writer.writeU16(Buffer.byteLength(item.servicename, 'utf-8'));
            writer.writeString(item.servicename, 'utf-8');
            writer.writeU16(Buffer.byteLength(item.url, 'utf-8'));
            writer.writeString(item.url, 'utf-8');
            writer.writeU16(Buffer.byteLength(item.md5, 'utf-8'));
            writer.writeString(item.md5, 'utf-8');
            writer.writeU16(Buffer.byteLength(item.newversion, 'utf-8'));
            writer.writeString(item.newversion, 'utf-8');
        });
        command.invalidservices.forEach((item) => {
            writer.writeU16(Buffer.byteLength(item, 'utf-8'));
            writer.writeString(item, 'utf-8');
        });
        return errcode_1.ErrorCode.succ;
    },
    decoder: (reader) => {
        let services = [];
        let count = reader.readU16();
        for (let i = 0; i < count; i++) {
            let len = reader.readU16();
            let serviceid = reader.readString('utf-8', len);
            len = reader.readU16();
            let servicename = reader.readString('utf-8', len);
            len = reader.readU16();
            let url = reader.readString('utf-8', len);
            len = reader.readU16();
            let md5 = reader.readString('utf-8', len);
            len = reader.readU16();
            let newversion = reader.readString('utf-8', len);
            services.push({ serviceid, servicename, url, md5, newversion });
        }
        let invalidservices = [];
        count = reader.readU16();
        for (let i = 0; i < count; i++) {
            let len = reader.readU16();
            let serviceid = reader.readString('utf-8', len);
            invalidservices.push(serviceid);
        }
        return { err: errcode_1.ErrorCode.succ, body: { services, invalidservices } };
    },
    printer: (c) => {
        return `name=${c.name}, seq=${c.seq}, services=${JSON.stringify(c.services)},invalidservices=${JSON.stringify(c.invalidservices)}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});
Command.CommandDefine.RegisterCommand(SysCommandName.sys_getagent_req, {
    encoder: (c, writer) => {
        let command = c;
        writer.writeU16(Buffer.byteLength(command.serviceid, 'utf-8'));
        writer.writeString(command.serviceid, 'utf-8');
        let encodeStrings = (w, v) => {
            if (v) {
                w.writeU16(v.length);
                for (let i = 0; i < v.length; i++) {
                    w.writeU16(Buffer.byteLength(v[i], 'utf-8'));
                    w.writeString(v[i], 'utf-8');
                }
            }
            else {
                w.writeU16(0);
            }
        };
        if (command.netinfo) {
            let w = new writer_1.BufferWriter();
            w.writeU16(Buffer.byteLength(command.netinfo.name, 'utf-8'));
            w.writeString(command.netinfo.name, 'utf-8');
            w.writeU8(command.netinfo.accessType);
            encodeStrings(w, command.netinfo.ipv4);
            encodeStrings(w, command.netinfo.ipv6);
            if (command.netinfo.udp === 0) {
                w.writeU8(0);
            }
            else if (command.netinfo.udp === 1) {
                w.writeU8(1);
            }
            else {
                w.writeU8(2);
            }
            if (command.netinfo.tcp === 0) {
                w.writeU8(0);
            }
            else if (command.netinfo.tcp === 1) {
                w.writeU8(1);
            }
            else {
                w.writeU8(2);
            }
            let buffer = w.render();
            writer.writeU16(buffer.length);
            if (buffer.length) {
                writer.writeBytes(buffer);
            }
        }
        else {
            writer.writeU16(0);
        }
        encodeStrings(writer, command.includeTags);
        encodeStrings(writer, command.excludeTags);
        encodeStrings(writer, command.excludeAgentIds);
        return errcode_1.ErrorCode.succ;
    },
    decoder: (reader) => {
        let decodeStrings = () => {
            let ret = [];
            let count = reader.readU16();
            if (count === 0) {
                return ret;
            }
            for (let i = 0; i < count; i++) {
                let len = reader.readU16();
                let v = reader.readString('utf-8', len);
                ret.push(v);
            }
            return ret;
        };
        let len = reader.readU16();
        let serviceid = reader.readString('utf-8', len);
        let netinfo = null;
        len = reader.readU16();
        if (len > 0) {
            len = reader.readU16();
            let name = reader.readString('utf-8', len);
            let accessType = reader.readU8();
            let ipv4 = decodeStrings();
            let ipv6 = decodeStrings();
            let udp = reader.readU8();
            let tcp = reader.readU8();
            netinfo = { name, accessType, ipv4, ipv6, udp, tcp };
        }
        let includeTags = decodeStrings();
        let excludeTags = decodeStrings();
        let excludeAgentIds = decodeStrings();
        return { err: errcode_1.ErrorCode.succ, body: { serviceid, netinfo, includeTags, excludeTags, excludeAgentIds } };
    },
    printer: (c) => {
        let command = c;
        let netinfo = command.netinfo ? JSON.stringify(command.netinfo) : '[]';
        let includeTags = JSON.stringify(command.includeTags);
        let excludeTags = JSON.stringify(command.excludeTags);
        let excludeAgentIds = JSON.stringify(command.excludeAgentIds);
        return `name=${c.name}, seq=${c.seq},netinfo=${netinfo}, includeTags=${includeTags},excludeTags=${excludeTags},excludeAgentIds=${excludeAgentIds}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});
Command.CommandDefine.RegisterCommand(SysCommandName.sys_getagent_resp, {
    encoder: (c, writer) => {
        let encodeStrings = (w, v) => {
            if (v) {
                w.writeU16(v.length);
                for (let i = 0; i < v.length; i++) {
                    w.writeU16(Buffer.byteLength(v[i], 'utf-8'));
                    w.writeString(v[i], 'utf-8');
                }
            }
            else {
                w.writeU16(0);
            }
        };
        let command = c;
        writer.writeU16(command.agentid.length);
        if (command.agentid.length) {
            writer.writeString(command.agentid, 'utf-8');
        }
        if (command.netinfo) {
            let w = new writer_1.BufferWriter();
            w.writeU16(Buffer.byteLength(command.netinfo.name, 'utf-8'));
            w.writeString(command.netinfo.name, 'utf-8');
            w.writeU8(command.netinfo.accessType);
            encodeStrings(w, command.netinfo.ipv4);
            encodeStrings(w, command.netinfo.ipv6);
            if (command.netinfo.udp === 0) {
                w.writeU8(0);
            }
            else if (command.netinfo.udp === 1) {
                w.writeU8(1);
            }
            else {
                w.writeU8(2);
            }
            if (command.netinfo.tcp === 0) {
                w.writeU8(0);
            }
            else if (command.netinfo.tcp === 1) {
                w.writeU8(1);
            }
            else {
                w.writeU8(2);
            }
            let buffer = w.render();
            writer.writeU16(buffer.length);
            if (buffer.length) {
                writer.writeBytes(buffer);
            }
        }
        else {
            writer.writeU16(0);
        }
        return errcode_1.ErrorCode.succ;
    },
    decoder: (reader) => {
        let len = reader.readU16();
        if (!len) {
            return { err: errcode_1.ErrorCode.succ, body: { agentid: '' } };
        }
        let agentid = reader.readString('utf-8', len);
        len = reader.readU16();
        if (!len) {
            return { err: errcode_1.ErrorCode.succ, body: { agentid } };
        }
        len = reader.readU16();
        let name = reader.readString('utf-8', len);
        let accessType = reader.readU8();
        let ipv4 = [];
        let count = reader.readU16();
        for (let i = 0; i < count; i++) {
            len = reader.readU16();
            let ip = reader.readString('utf-8', len);
            ipv4.push(ip);
        }
        let ipv6 = [];
        count = reader.readU16();
        for (let i = 0; i < count; i++) {
            len = reader.readU16();
            let ip = reader.readString('utf-8', len);
            ipv6.push(ip);
        }
        let udp = reader.readU8();
        let tcp = reader.readU8();
        return { err: errcode_1.ErrorCode.succ, body: { agentid, netinfo: { name, accessType, ipv4, ipv6, udp, tcp } } };
    },
    printer: (c) => {
        let command = c;
        let netinfo = command.netinfo ? JSON.stringify(command.netinfo) : '[]';
        return `name=${c.name}, seq=${c.seq},agentid=${command.agentid},netinfo=${netinfo}, to=${JSON.stringify(c.to)}`;
    }
});
Command.CommandDefine.RegisterCommand(SysCommandName.sys_ping_req, {
    encoder: (c, writer) => {
        let command = c;
        writer.writeU16(Buffer.byteLength(command.key, 'utf-8'));
        writer.writeString(command.key, 'utf-8');
        return errcode_1.ErrorCode.succ;
    },
    decoder: (reader) => {
        let len = reader.readU16();
        let key = reader.readString('utf-8', len);
        return { err: errcode_1.ErrorCode.succ, body: { key } };
    },
    printer: (c) => {
        return `name=${c.name}, seq=${c.seq}, key=${c.key}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});
Command.CommandDefine.RegisterCommand(SysCommandName.sys_heartbeatlocal_resp, {
    encoder: (c, writer) => {
        return errcode_1.ErrorCode.succ;
    },
    decoder: (reader) => {
        return { err: errcode_1.ErrorCode.succ, body: {} };
    },
    printer: (c) => {
        return `name=${c.name}, seq=${c.seq}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});
Command.CommandDefine.RegisterCommand(SysCommandName.sys_startservice_req, {
    encoder: (c, writer) => {
        let command = c;
        writer.writeU16(Buffer.byteLength(command.serviceid, 'utf-8'));
        writer.writeString(command.serviceid, 'utf-8');
        writer.writeU16(command.param.length);
        command.param.forEach((item) => {
            writer.writeU16(Buffer.byteLength(item, 'utf-8'));
            writer.writeString(item, 'utf-8');
        });
        return errcode_1.ErrorCode.succ;
    },
    decoder: (reader) => {
        let len = reader.readU16();
        let serviceid = reader.readString('utf-8', len);
        let param = [];
        let count = reader.readU16();
        for (let i = 0; i < count; i++) {
            let len = reader.readU16();
            let v = reader.readString('utf-8', len);
            param.push(v);
        }
        return { err: errcode_1.ErrorCode.succ, body: { serviceid, param } };
    },
    printer: (c) => {
        return `name=${c.name}, seq=${c.seq},param=${JSON.stringify(c.param)}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});
Command.CommandDefine.RegisterCommand(SysCommandName.sys_startservice_resp, {
    encoder: (c, writer) => {
        writer.writeU8(c.err);
        return errcode_1.ErrorCode.succ;
    },
    decoder: (reader) => {
        return { err: errcode_1.ErrorCode.succ, body: { err: reader.readU8() } };
    },
    printer: (c) => {
        return `name=${c.name}, seq=${c.seq},err=${c.err}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});
Command.CommandDefine.RegisterCommand(SysCommandName.sys_stopservice_req, {
    encoder: (c, writer) => {
        let command = c;
        writer.writeU16(Buffer.byteLength(command.serviceid, 'utf-8'));
        writer.writeString(command.serviceid, 'utf-8');
        return errcode_1.ErrorCode.succ;
    },
    decoder: (reader) => {
        let len = reader.readU16();
        let serviceid = reader.readString('utf-8', len);
        return { err: errcode_1.ErrorCode.succ, body: { serviceid } };
    },
    printer: (c) => {
        return `name=${c.name}, seq=${c.seq},serviceid=${c.serviceid}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});
Command.CommandDefine.RegisterCommand(SysCommandName.sys_stopservice_resp, {
    encoder: (c, writer) => {
        writer.writeU8(c.err);
        return errcode_1.ErrorCode.succ;
    },
    decoder: (reader) => {
        return { err: errcode_1.ErrorCode.succ, body: { err: reader.readU8() } };
    },
    printer: (c) => {
        return `name=${c.name}, seq=${c.seq},err=${c.err}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});
Command.CommandDefine.RegisterCommand(SysCommandName.sys_uploadlog_req, {
    encoder: (c, writer) => {
        let command = c;
        if (command.taskNamespace.agentid) {
            writer.writeU16(Buffer.byteLength(command.taskNamespace.agentid, 'utf-8'));
            writer.writeString(command.taskNamespace.agentid, 'utf-8');
        }
        else {
            writer.writeU16(0);
        }
        if (command.taskNamespace.serviceid) {
            writer.writeU16(Buffer.byteLength(command.taskNamespace.serviceid, 'utf-8'));
            writer.writeString(command.taskNamespace.serviceid, 'utf-8');
        }
        else {
            writer.writeU16(0);
        }
        if (command.taskNamespace.taskid) {
            writer.writeU16(Buffer.byteLength(command.taskNamespace.taskid, 'utf-8'));
            writer.writeString(command.taskNamespace.taskid, 'utf-8');
        }
        else {
            writer.writeU16(0);
        }
        writer.writeU16(Buffer.byteLength(command.logname, 'utf-8'));
        writer.writeString(command.logname, 'utf-8');
        return errcode_1.ErrorCode.succ;
    },
    decoder: (reader) => {
        let len = reader.readU16();
        let agentid;
        if (len) {
            agentid = reader.readString('utf-8', len);
        }
        len = reader.readU16();
        let serviceid;
        if (len) {
            serviceid = reader.readString('utf-8', len);
        }
        len = reader.readU16();
        let taskid;
        if (len) {
            taskid = reader.readString('utf-8', len);
        }
        let taskNamespace = { agentid, serviceid, taskid };
        len = reader.readU16();
        let logname = reader.readString('utf-8', len);
        return { err: errcode_1.ErrorCode.succ, body: { taskNamespace, logname } };
    },
    printer: (c) => {
        return `name=${c.name}, seq=${c.seq},logname=${c.logname},taskNamespace=${JSON.stringify(c.taskNamespace)}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});
Command.CommandDefine.RegisterCommand(SysCommandName.sys_uploadlog_resp, {
    encoder: (c, writer) => {
        let command = c;
        writer.writeU8(command.err);
        writer.writeU16(Buffer.byteLength(command.url, 'utf-8'));
        writer.writeString(command.url, 'utf-8');
        return errcode_1.ErrorCode.succ;
    },
    decoder: (reader) => {
        let err = reader.readU8();
        let len = reader.readU16();
        let url = reader.readString('utf-8', len);
        return { err: errcode_1.ErrorCode.succ, body: { err, url } };
    },
    printer: (c) => {
        return `name=${c.name}, seq=${c.seq},err=${c.err},url=${c.url} from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});
Command.CommandDefine.RegisterCommand(SysCommandName.sys_updateservice_req, {
    encoder: (c, writer) => {
        let command = c;
        writer.writeU16(Buffer.byteLength(command.serviceid, 'utf-8'));
        writer.writeString(command.serviceid, 'utf-8');
        writer.writeU16(Buffer.byteLength(command.servicename, 'utf-8'));
        writer.writeString(command.servicename, 'utf-8');
        writer.writeU16(Buffer.byteLength(command.newversion, 'utf-8'));
        writer.writeString(command.newversion, 'utf-8');
        writer.writeU16(Buffer.byteLength(command.url, 'utf-8'));
        writer.writeString(command.url, 'utf-8');
        return errcode_1.ErrorCode.succ;
    },
    decoder: (reader) => {
        let len = reader.readU16();
        let serviceid = reader.readString('utf-8', len);
        len = reader.readU16();
        let servicename = reader.readString('utf-8', len);
        len = reader.readU16();
        let newversion = reader.readString('utf-8', len);
        len = reader.readU16();
        let url = reader.readString('utf-8', len);
        len = reader.readU16();
        let md5 = reader.readString('utf-8', len);
        return { err: errcode_1.ErrorCode.succ, body: { serviceid, servicename, newversion, url, md5 } };
    },
    printer: (c) => {
        return `name=${c.name}, seq=${c.seq},err=${c.err}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});
Command.CommandDefine.RegisterCommand(SysCommandName.sys_runtask_req, {
    encoder: (c, writer) => {
        let command = c;
        writer.writeU16(Buffer.byteLength(command.jobid, 'utf-8'));
        writer.writeString(command.jobid, 'utf-8');
        writer.writeU16(Buffer.byteLength(command.serviceid, 'utf-8'));
        writer.writeString(command.serviceid, 'utf-8');
        writer.writeU16(Buffer.byteLength(command.taskid, 'utf-8'));
        writer.writeString(command.taskid, 'utf-8');
        writer.writeU16(Buffer.byteLength(command.version, 'utf-8'));
        writer.writeString(command.version, 'utf-8');
        writer.writeU16(Buffer.byteLength(command.url, 'utf-8'));
        writer.writeString(command.url, 'utf-8');
        writer.writeU16(Buffer.byteLength(command.md5, 'utf-8'));
        writer.writeString(command.md5, 'utf-8');
        writer.writeU16(command.param.length);
        command.param.forEach((item) => {
            writer.writeU16(Buffer.byteLength(item, 'utf-8'));
            writer.writeString(item, 'utf-8');
        });
        return errcode_1.ErrorCode.succ;
    },
    decoder: (reader) => {
        let len = reader.readU16();
        let jobid = reader.readString('utf-8', len);
        len = reader.readU16();
        let serviceid = reader.readString('utf-8', len);
        len = reader.readU16();
        let taskid = reader.readString('utf-8', len);
        len = reader.readU16();
        let version = reader.readString('utf-8', len);
        len = reader.readU16();
        let url = reader.readString('utf-8', len);
        len = reader.readU16();
        let md5 = reader.readString('utf-8', len);
        let param = [];
        let count = reader.readU16();
        for (let i = 0; i < count; i++) {
            let len = reader.readU16();
            let v = reader.readString('utf-8', len);
            param.push(v);
        }
        return { err: errcode_1.ErrorCode.succ, body: { jobid, serviceid, taskid, version, url, md5, param } };
    },
    printer: (c) => {
        let command = c;
        let info = {
            jobid: command.jobid,
            serviceid: command.serviceid,
            taskid: command.taskid,
            version: command.version,
            url: command.url,
            md5: command.md5,
            param: command.param,
        };
        return `name=${c.name}, seq=${c.seq},info=${JSON.stringify(info)}, to=${JSON.stringify(c.to)}`;
    }
});
Command.CommandDefine.RegisterCommand(SysCommandName.sys_runtask_resp, {
    encoder: (c, writer) => {
        writer.writeU8(c.err);
        return errcode_1.ErrorCode.succ;
    },
    decoder: (reader) => {
        return { err: errcode_1.ErrorCode.succ, body: { err: reader.readU8() } };
    },
    printer: (c) => {
        return `name=${c.name}, seq=${c.seq},err=${c.err}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});
Command.CommandDefine.RegisterCommand(SysCommandName.sys_stoptask_req, {
    encoder: (c, writer) => {
        let command = c;
        writer.writeU16(Buffer.byteLength(command.serviceid, 'utf-8'));
        writer.writeString(command.serviceid, 'utf-8');
        writer.writeU16(Buffer.byteLength(command.taskid, 'utf-8'));
        writer.writeString(command.taskid, 'utf-8');
        return errcode_1.ErrorCode.succ;
    },
    decoder: (reader) => {
        let len = reader.readU16();
        let serviceid = reader.readString('utf-8', len);
        len = reader.readU16();
        let taskid = reader.readString('utf-8', len);
        return { err: errcode_1.ErrorCode.succ, body: { serviceid, taskid } };
    },
    printer: (c) => {
        return `name=${c.name}, seq=${c.seq},serviceid=${c.serviceid}, taskid=${c.taskid}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});
Command.CommandDefine.RegisterCommand(SysCommandName.sys_stoptask_resp, {
    encoder: (c, writer) => {
        writer.writeU8(c.err);
        return errcode_1.ErrorCode.succ;
    },
    decoder: (reader) => {
        return { err: errcode_1.ErrorCode.succ, body: { err: reader.readU8() } };
    },
    printer: (c) => {
        return `name=${c.name}, seq=${c.seq},err=${c.err}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});
Command.CommandDefine.RegisterCommand(SysCommandName.sys_taskfinish_req, {
    encoder: (c, writer) => {
        let command = c;
        writer.writeU16(Buffer.byteLength(command.taskid, 'utf-8'));
        writer.writeString(command.taskid, 'utf-8');
        writer.writeU16(Buffer.byteLength(command.jobid, 'utf-8'));
        writer.writeString(command.jobid, 'utf-8');
        writer.writeU16(Buffer.byteLength(command.msg, 'utf-8'));
        writer.writeString(command.msg, 'utf-8');
        writer.writeU8(command.code);
        writer.writeU16(command.urls.length);
        command.urls.forEach((item) => {
            writer.writeU16(Buffer.byteLength(item, 'utf-8'));
            writer.writeString(item, 'utf-8');
        });
        return errcode_1.ErrorCode.succ;
    },
    decoder: (reader) => {
        let len = reader.readU16();
        let taskid = reader.readString('utf-8', len);
        len = reader.readU16();
        let jobid = reader.readString('utf-8', len);
        len = reader.readU16();
        let msg = reader.readString('utf-8', len);
        let code = reader.readU8();
        let urls = [];
        let count = reader.readU16();
        for (let i = 0; i < count; i++) {
            let len = reader.readU16();
            let v = reader.readString('utf-8', len);
            urls.push(v);
        }
        return { err: errcode_1.ErrorCode.succ, body: { taskid, jobid, msg, urls, code } };
    },
    printer: (c) => {
        let command = c;
        let info = {
            jobid: command.jobid,
            taskid: command.taskid,
            code: command.code,
            msg: command.msg,
            urls: command.urls,
        };
        return `name=${c.name}, seq=${c.seq},info=${JSON.stringify(info)}, to=${JSON.stringify(c.to)}`;
    }
});
Command.CommandDefine.RegisterCommand(SysCommandName.sys_taskfinish_resp, {
    encoder: (c, writer) => {
        writer.writeU8(c.err);
        return errcode_1.ErrorCode.succ;
    },
    decoder: (reader) => {
        return { err: errcode_1.ErrorCode.succ, body: { err: reader.readU8() } };
    },
    printer: (c) => {
        return `name=${c.name}, seq=${c.seq},err=${c.err}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});
Command.CommandDefine.RegisterCommand(SysCommandName.sys_attachevent_req, {
    encoder: (c, writer) => {
        let command = c;
        writer.writeU16(Buffer.byteLength(command.eventname, 'utf-8'));
        writer.writeString(command.eventname, 'utf-8');
        return errcode_1.ErrorCode.succ;
    },
    decoder: (reader) => {
        let len = reader.readU16();
        let eventname = reader.readString('utf-8', len);
        return { err: errcode_1.ErrorCode.succ, body: { eventname } };
    },
    printer: (c) => {
        return `name=${c.name}, seq=${c.seq},eventname=${c.eventname}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});
Command.CommandDefine.RegisterCommand(SysCommandName.sys_attachevent_resp, {
    encoder: (c, writer) => {
        writer.writeU8(c.err);
        writer.writeU32(c.cookie);
        return errcode_1.ErrorCode.succ;
    },
    decoder: (reader) => {
        return { err: errcode_1.ErrorCode.succ, body: { err: reader.readU8(), cookie: reader.readU32() } };
    },
    printer: (c) => {
        return `name=${c.name}, seq=${c.seq},err=${c.err}, cookie=${c.cookie}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});
Command.CommandDefine.RegisterCommand(SysCommandName.sys_detachevent_req, {
    encoder: (c, writer) => {
        let command = c;
        writer.writeU16(Buffer.byteLength(command.eventname, 'utf-8'));
        writer.writeString(command.eventname, 'utf-8');
        writer.writeU32(command.cookie);
        return errcode_1.ErrorCode.succ;
    },
    decoder: (reader) => {
        let len = reader.readU16();
        let eventname = reader.readString('utf-8', len);
        return { err: errcode_1.ErrorCode.succ, body: { eventname, cookie: reader.readU32() } };
    },
    printer: (c) => {
        return `name=${c.name}, seq=${c.seq},eventname=${c.eventname}, cookie=${c.cookie}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});
Command.CommandDefine.RegisterCommand(SysCommandName.sys_detachevent_resp, {
    encoder: (c, writer) => {
        writer.writeU8(c.err);
        return errcode_1.ErrorCode.succ;
    },
    decoder: (reader) => {
        return { err: errcode_1.ErrorCode.succ, body: { err: reader.readU8() } };
    },
    printer: (c) => {
        return `name=${c.name}, seq=${c.seq},err=${c.err}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});
Command.CommandDefine.RegisterCommand(SysCommandName.sys_fireevent_req, {
    encoder: (c, writer) => {
        let command = c;
        writer.writeU16(Buffer.byteLength(command.eventname, 'utf-8'));
        writer.writeString(command.eventname, 'utf-8');
        writer.writeU8(command.err);
        if (command.param) {
            let strParam = JSON.stringify(command.param);
            writer.writeU16(Buffer.byteLength(strParam, 'utf-8'));
            writer.writeString(strParam, 'utf-8');
        }
        else {
            writer.writeU16(0);
        }
        return errcode_1.ErrorCode.succ;
    },
    decoder: (reader) => {
        let len = reader.readU16();
        let eventname = reader.readString('utf-8', len);
        let err = reader.readU8();
        let param = [];
        len = reader.readU16();
        if (len) {
            param = JSON.parse(reader.readBytes(len, true).toString('utf-8'));
        }
        return { err: errcode_1.ErrorCode.succ, body: { eventname, err, param } };
    },
    printer: (c) => {
        return `name=${c.name}, seq=${c.seq},eventname=${c.eventname},err=${c.err},param=${JSON.stringify(c.param)} from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});
Command.CommandDefine.RegisterCommand(SysCommandName.sys_userapi_req, {
    encoder: (c, writer) => {
        let command = c;
        writer.writeU16(Buffer.byteLength(command.apiname, 'utf-8'));
        writer.writeString(command.apiname, 'utf-8');
        if (command.bytes.length) {
            writer.writeU16(command.bytes.length);
            writer.writeBytes(command.bytes);
        }
        else {
            writer.writeU16(0);
        }
        if (command.param) {
            let strParam = JSON.stringify(command.param);
            writer.writeU16(Buffer.byteLength(strParam, 'utf-8'));
            writer.writeString(strParam, 'utf-8');
        }
        else {
            writer.writeU16(0);
        }
        return errcode_1.ErrorCode.succ;
    },
    decoder: (reader) => {
        let len = reader.readU16();
        let apiname = reader.readString('utf-8', len);
        let bytes = Buffer.from('');
        len = reader.readU16();
        if (len) {
            bytes = reader.readBytes(len);
        }
        let param;
        let paramLen = reader.readU16();
        if (paramLen) {
            param = JSON.parse(reader.readString('utf-8', paramLen));
        }
        return { err: errcode_1.ErrorCode.succ, body: { apiname, bytes, param } };
    },
    printer: (c) => {
        return `name=${c.name}, seq=${c.seq},apiname=${c.apiname},param=${JSON.stringify(c.param)} from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});
Command.CommandDefine.RegisterCommand(SysCommandName.sys_userapi_resp, {
    encoder: (c, writer) => {
        let command = c;
        writer.writeU8(command.err);
        if (command.bytes.length) {
            writer.writeU16(command.bytes.length);
            writer.writeBytes(command.bytes);
        }
        else {
            writer.writeU16(0);
        }
        if (command.param) {
            let strParam = JSON.stringify(command.param);
            writer.writeU16(Buffer.byteLength(strParam, 'utf-8'));
            writer.writeString(strParam, 'utf-8');
        }
        else {
            writer.writeU16(0);
        }
        return errcode_1.ErrorCode.succ;
    },
    decoder: (reader) => {
        let err = reader.readU8();
        let bytes = Buffer.from('');
        let len = reader.readU16();
        if (len) {
            bytes = reader.readBytes(len);
        }
        let param;
        let paramLen = reader.readU16();
        if (paramLen) {
            param = JSON.parse(reader.readString('utf-8', paramLen));
        }
        return { err: errcode_1.ErrorCode.succ, body: { err, bytes, param } };
    },
    printer: (c) => {
        return `name=${c.name}, seq=${c.seq},err=${c.err},param=${JSON.stringify(c.param)} from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});
