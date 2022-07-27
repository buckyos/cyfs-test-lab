import {ErrorCode} from '../common/errcode';
import * as Command from './command';
export * from './command';
import {BufferReader} from '../common/reader';
import {BufferWriter} from '../common/writer';

export class SysCommandName {
    static sys_heartbeat_req: string = 'sys.heartbeat.req';
    static sys_heartbeat_resp: string = 'sys.heartbeat.resp';
    static sys_ping_req: string = 'sys.ping.req';
    static sys_heartbeatlocal_resp: string = 'sys.heartbeatlocal.resp';
    static sys_getagent_req: string = 'sys.getagent.req';
    static sys_getagent_resp: string = 'sys.getagent.resp';
    static sys_startservice_req: string = 'sys.startservice.req';
    static sys_startservice_resp: string = 'sys.startservice.resp';
    static sys_stopservice_req: string = 'sys.stopservice.req';
    static sys_stopservice_resp: string = 'sys.stopservice.resp';
    static sys_uploadlog_req: string = 'sys.uploadlog.req';
    static sys_uploadlog_resp: string = 'sys.uploadlog.resp';
    static sys_updateservice_req: string = 'sys.updateservice.req';
    static sys_runtask_req: string = 'sys.runtask.req';
    static sys_runtask_resp: string = 'sys.runtask.resp';
    static sys_taskfinish_req: string = 'sys.taskfinish.req';
    static sys_taskfinish_resp: string = 'sys.taskfinish.resp';
    static sys_stoptask_req: string = 'sys.stoptask.req';
    static sys_stoptask_resp: string = 'sys.stoptask.resp';
    static sys_attachevent_req: string = 'sys.attachevent.req';
    static sys_attachevent_resp: string = 'sys.attachevent.resp';
    static sys_detachevent_req: string = 'sys.detachevent.req';
    static sys_detachevent_resp: string = 'sys.detachevent.resp';
    static sys_fireevent_req: string = 'sys.fireevent.req';
    static sys_userapi_req: string = 'sys.userapi.req';
    static sys_userapi_resp: string = 'sys.userapi.resp';
}

export type CommandSysHeartbeatReq = Command.Command & {
    version: string;
    platform: string;
    services: {serviceid: string, servicename: string, version: string, status: number}[];
    tasks: string[];
};
Command.CommandDefine.RegisterCommand(SysCommandName.sys_heartbeat_req, {
    encoder: (c: Command.Command, writer: BufferWriter): ErrorCode => {
        let command: CommandSysHeartbeatReq = c as CommandSysHeartbeatReq;
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
        return ErrorCode.succ;
    },
    decoder: (reader: BufferReader): {err: ErrorCode, body?: {} & any} => {
        let len: number = reader.readU16();
        let version: string = reader.readString('utf-8', len);

        len = reader.readU16();
        let platform: string = reader.readString('utf-8', len);

        let services: any = [];
        let count: number = reader.readU16();
        for (let i = 0; i < count; i++) {
            let len: number = reader.readU16();
            let serviceid: string = reader.readString('utf-8', len);

            len = reader.readU16();
            let servicename: string = reader.readString('utf-8', len);

            len = reader.readU16();
            let version: string = reader.readString('utf-8', len);

            let status: number = reader.readU8();
            services.push({serviceid, servicename, version, status});
        }

        let tasks: string[] = [];
        count = reader.readU16();
        for (let i = 0; i < count; i++) {
            let len: number = reader.readU16();
            let taskid: string = reader.readString('utf-8', len);
            tasks.push(taskid);
        }

        return {err: ErrorCode.succ, body: {version, platform, services, tasks}};
    },

    printer: (c: Command.Command): string => {
        return `name=${c.name}, seq=${c.seq},version=${(c as any).version},services=${JSON.stringify((c as any).services)}, tasks=${JSON.stringify((c as any).tasks)} from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});


export type CommandSysHeartbeatResp = Command.Command & {
    services: {serviceid: string, servicename: string,url:string, md5:string, newversion: string}[];
	invalidservices: string[];
};
Command.CommandDefine.RegisterCommand(SysCommandName.sys_heartbeat_resp, {
    encoder: (c: Command.Command, writer: BufferWriter): ErrorCode => {
        let command: CommandSysHeartbeatResp = c as CommandSysHeartbeatResp;
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
        return ErrorCode.succ;
    },
    decoder: (reader: BufferReader): {err: ErrorCode, body?: {} & any} => {
        let services: any = [];
        let count: number = reader.readU16();
        for (let i = 0; i < count; i++) {
            let len: number = reader.readU16();
            let serviceid: string = reader.readString('utf-8', len);

            len = reader.readU16();
            let servicename: string = reader.readString('utf-8', len);

            len = reader.readU16();
            let url: string = reader.readString('utf-8', len);

            len = reader.readU16();
            let md5: string = reader.readString('utf-8', len);

            len = reader.readU16();
            let newversion: string = reader.readString('utf-8', len);

            services.push({serviceid, servicename,url, md5, newversion});
        }

        let invalidservices: any = [];
        count = reader.readU16();
        for (let i = 0; i < count; i++) {
            let len: number = reader.readU16();
            let serviceid: string = reader.readString('utf-8', len);
            invalidservices.push(serviceid);
        }

        return {err: ErrorCode.succ, body: {services, invalidservices}};
    },
    printer: (c: Command.Command): string => {
        return `name=${c.name}, seq=${c.seq}, services=${JSON.stringify((c as any).services)},invalidservices=${JSON.stringify((c as any).invalidservices)}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});

export type CommandSysGetAgentReq = Command.Command & {
    serviceid: string;
    netinfo?: Command.NetEntry;
    includeTags: string[];
    excludeTags: string[];
    excludeAgentIds: string[];
};
Command.CommandDefine.RegisterCommand(SysCommandName.sys_getagent_req, {
    encoder: (c: Command.Command, writer: BufferWriter): ErrorCode => {
        let command: CommandSysGetAgentReq = c as CommandSysGetAgentReq;
        writer.writeU16(Buffer.byteLength(command.serviceid, 'utf-8'));
        writer.writeString(command.serviceid, 'utf-8');
        let encodeStrings = (w: BufferWriter, v?: string[]) => {
            if (v) {
                w.writeU16(v.length);
                for (let i = 0; i < v.length; i++) {
                    w.writeU16(Buffer.byteLength(v[i], 'utf-8'));
                    w.writeString(v[i], 'utf-8');
                }
            } else {
                w.writeU16(0);
            }
        }

        if (command.netinfo) {
            let w: BufferWriter = new BufferWriter();
            w.writeU16(Buffer.byteLength(command.netinfo.name, 'utf-8'));
            w.writeString(command.netinfo.name, 'utf-8');
            w.writeU8(command.netinfo.accessType);
            encodeStrings(w, command.netinfo.ipv4);
            encodeStrings(w, command.netinfo.ipv6);
            if (command.netinfo.udp === 0) {
                w.writeU8(0);
            } else if (command.netinfo.udp === 1) {
                w.writeU8(1);
            } else {
                w.writeU8(2);
            }
            if (command.netinfo.tcp === 0) {
                w.writeU8(0);
            } else if (command.netinfo.tcp === 1) {
                w.writeU8(1);
            } else {
                w.writeU8(2);
            }
            let buffer: Buffer = w.render();
            writer.writeU16(buffer.length);
            if (buffer.length) {
                writer.writeBytes(buffer);
            }
        } else {
            writer.writeU16(0);
        }
        
        encodeStrings(writer, command.includeTags);
        encodeStrings(writer, command.excludeTags);
        encodeStrings(writer, command.excludeAgentIds);
        
        return ErrorCode.succ;
    },
    decoder: (reader: BufferReader): {err: ErrorCode, body?: {} & any} => {
        let decodeStrings = (): string[] => {
            let ret: string[] = [];
            let count = reader.readU16();
            if (count === 0) {
                return ret;
            }
            for (let i = 0; i < count; i++) {
                let len: number = reader.readU16();
                let v: string = reader.readString('utf-8', len);
                ret.push(v);
            }
            return ret;
        }

        let len: number = reader.readU16();
        let serviceid: string = reader.readString('utf-8', len);

        let netinfo: Command.NetEntry | null = null;
        len = reader.readU16();
        if (len > 0) {
            len = reader.readU16();
            let name: string = reader.readString('utf-8', len);
            let accessType: Command.AccessNetType = reader.readU8() as Command.AccessNetType;
            let ipv4: string[] = decodeStrings();
            let ipv6: string[] = decodeStrings();
            let udp: number = reader.readU8();
            let tcp: number = reader.readU8();
            netinfo = {name, accessType, ipv4, ipv6, udp, tcp};
        }

        let includeTags: string[] = decodeStrings();
        let excludeTags: string[] = decodeStrings();
        let excludeAgentIds: string[] = decodeStrings();

        return {err: ErrorCode.succ, body: {serviceid, netinfo, includeTags, excludeTags, excludeAgentIds}};
    },
    printer: (c: Command.Command): string => {
        let command: CommandSysGetAgentReq = c as CommandSysGetAgentReq;
        let netinfo = command.netinfo ? JSON.stringify(command.netinfo!) : '[]';
        let includeTags = JSON.stringify(command.includeTags);
        let excludeTags = JSON.stringify(command.excludeTags);
        let excludeAgentIds = JSON.stringify(command.excludeAgentIds);
        return `name=${c.name}, seq=${c.seq},netinfo=${netinfo}, includeTags=${includeTags},excludeTags=${excludeTags},excludeAgentIds=${excludeAgentIds}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});


export type CommandSysGetAgentResp = Command.Command & {
    agentid: string;
    netinfo?: Command.NetEntry;
};
Command.CommandDefine.RegisterCommand(SysCommandName.sys_getagent_resp, {
    encoder: (c: Command.Command, writer: BufferWriter): ErrorCode => {
        let encodeStrings = (w: BufferWriter, v?: string[]) => {
            if (v) {
                w.writeU16(v.length);
                for (let i = 0; i < v.length; i++) {
                    w.writeU16(Buffer.byteLength(v[i], 'utf-8'));
                    w.writeString(v[i], 'utf-8');
                }
            } else {
                w.writeU16(0);
            }
        }

        let command: CommandSysGetAgentResp  = c as CommandSysGetAgentResp;
        writer.writeU16(command.agentid.length);
        if (command.agentid.length) {
            writer.writeString(command.agentid, 'utf-8');
        }
        if (command.netinfo) {
            let w: BufferWriter = new BufferWriter();
            w.writeU16(Buffer.byteLength(command.netinfo.name, 'utf-8'));
            w.writeString(command.netinfo.name, 'utf-8');
            w.writeU8(command.netinfo.accessType);
            encodeStrings(w, command.netinfo.ipv4);
            encodeStrings(w, command.netinfo.ipv6);
            if (command.netinfo.udp === 0) {
                w.writeU8(0);
            } else if (command.netinfo.udp === 1) {
                w.writeU8(1);
            } else {
                w.writeU8(2);
            }
            if (command.netinfo.tcp === 0) {
                w.writeU8(0);
            } else if (command.netinfo.tcp === 1) {
                w.writeU8(1);
            } else {
                w.writeU8(2);
            }
            let buffer: Buffer = w.render();
            writer.writeU16(buffer.length);
            if (buffer.length) {
                writer.writeBytes(buffer);
            }
        } else {
            writer.writeU16(0);
        }
        return ErrorCode.succ;
    },
    decoder: (reader: BufferReader): {err: ErrorCode, body?: {} & any} => {
        let len: number = reader.readU16();
        if (!len) {
            return {err: ErrorCode.succ, body: {agentid: ''}};    
        }
        let agentid: string = reader.readString('utf-8', len);

        len = reader.readU16();
        if (!len) {
            return {err: ErrorCode.succ, body: {agentid}};    
        }
        len = reader.readU16();
        let name: string = reader.readString('utf-8', len);

        let accessType: Command.AccessNetType = reader.readU8() as Command.AccessNetType;

        let ipv4: string[] = [];
        let count: number = reader.readU16();
        for(let i = 0; i < count; i++) {
            len = reader.readU16();
            let ip: string = reader.readString('utf-8', len);
            ipv4.push(ip);
        }

        let ipv6: string[] = [];
        count = reader.readU16();
        for(let i = 0; i < count; i++) {
            len = reader.readU16();
            let ip: string = reader.readString('utf-8', len);
            ipv6.push(ip);
        }

        let udp: number = reader.readU8();
        let tcp: number = reader.readU8();

        return {err: ErrorCode.succ, body: {agentid, netinfo: {name,accessType, ipv4, ipv6, udp, tcp}}};
    },
    printer: (c: Command.Command): string => {
        let command: CommandSysGetAgentResp = c as CommandSysGetAgentResp;
        let netinfo = command.netinfo ? JSON.stringify(command.netinfo!) : '[]';
        return `name=${c.name}, seq=${c.seq},agentid=${command.agentid},netinfo=${netinfo}, to=${JSON.stringify(c.to)}`;
    }
});


export type CommandSysPingReq = Command.Command & {
    key: string;
};
Command.CommandDefine.RegisterCommand(SysCommandName.sys_ping_req, {
    encoder: (c: Command.Command, writer: BufferWriter): ErrorCode => {
        let command: CommandSysPingReq = c as CommandSysPingReq;
        writer.writeU16(Buffer.byteLength(command.key, 'utf-8'));
        writer.writeString(command.key, 'utf-8');
        return ErrorCode.succ;
    },
    decoder: (reader: BufferReader): {err: ErrorCode, body?: {} & any} => {
        let len: number = reader.readU16();
        let key: string = reader.readString('utf-8', len);
        return {err: ErrorCode.succ, body: {key}};
    },
    printer: (c: Command.Command): string => {
        return `name=${c.name}, seq=${c.seq}, key=${(c as any).key}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});


export type CommandSysHeartbeatLocalResp = Command.Command & {

};
Command.CommandDefine.RegisterCommand(SysCommandName.sys_heartbeatlocal_resp, {
    encoder: (c: Command.Command, writer: BufferWriter): ErrorCode => {
        return ErrorCode.succ;
    },
    decoder: (reader: BufferReader): {err: ErrorCode, body?: {} & any} => {
        return {err: ErrorCode.succ, body: {}};
    },
    printer: (c: Command.Command): string => {
        return `name=${c.name}, seq=${c.seq}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});


export type CommandSysStartServiceReq = Command.Command & {
    serviceid: string;
    param: string[];
};
Command.CommandDefine.RegisterCommand(SysCommandName.sys_startservice_req, {
    encoder: (c: Command.Command, writer: BufferWriter): ErrorCode => {
        let command: CommandSysStartServiceReq  = c as CommandSysStartServiceReq;
        writer.writeU16(Buffer.byteLength(command.serviceid, 'utf-8'));
        writer.writeString(command.serviceid, 'utf-8');
        writer.writeU16(command.param.length);
        command.param.forEach((item) => {
            writer.writeU16(Buffer.byteLength(item, 'utf-8'));
            writer.writeString(item, 'utf-8');
        });
        
        return ErrorCode.succ;
    },
    decoder: (reader: BufferReader): {err: ErrorCode, body?: {} & any} => {
        let len: number = reader.readU16();
        let serviceid: string = reader.readString('utf-8', len);
        let param: string[] = [];
        let count: number = reader.readU16();
        for (let i = 0; i < count; i++) {
            let len: number = reader.readU16();
            let v: string = reader.readString('utf-8', len);
            param.push(v);
        }
        return {err: ErrorCode.succ, body: {serviceid, param}};
    },
    printer: (c: Command.Command): string => {
        return `name=${c.name}, seq=${c.seq},param=${JSON.stringify((c as CommandSysStartServiceReq).param)}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});

export type CommandSysStartServiceResp = Command.Command & {
    err: ErrorCode;
};
Command.CommandDefine.RegisterCommand(SysCommandName.sys_startservice_resp, {
    encoder: (c: Command.Command, writer: BufferWriter): ErrorCode => {
        writer.writeU8((c as CommandSysStartServiceResp).err);
        return ErrorCode.succ;
    },
    decoder: (reader: BufferReader): {err: ErrorCode, body?: {} & any} => {
        return {err: ErrorCode.succ, body: {err: reader.readU8()}};
    },
    printer: (c: Command.Command): string => {
        return `name=${c.name}, seq=${c.seq},err=${(c as CommandSysStartServiceResp).err}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});

export type CommandSysStopServiceReq = Command.Command & {
    serviceid: string;
};
Command.CommandDefine.RegisterCommand(SysCommandName.sys_stopservice_req, {
    encoder: (c: Command.Command, writer: BufferWriter): ErrorCode => {
        let command: CommandSysStopServiceReq = c as CommandSysStopServiceReq;
        writer.writeU16(Buffer.byteLength(command.serviceid, 'utf-8'));
        writer.writeString(command.serviceid, 'utf-8');
        return ErrorCode.succ;
    },
    decoder: (reader: BufferReader): {err: ErrorCode, body?: {} & any} => {
        let len: number = reader.readU16();
        let serviceid: string = reader.readString('utf-8', len);
        return {err: ErrorCode.succ, body: {serviceid}};
    },
    printer: (c: Command.Command): string => {
        return `name=${c.name}, seq=${c.seq},serviceid=${(c as CommandSysStopServiceReq).serviceid}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});

export type CommandSysStopServiceResp = Command.Command & {
    err: ErrorCode;
};
Command.CommandDefine.RegisterCommand(SysCommandName.sys_stopservice_resp, {
    encoder: (c: Command.Command, writer: BufferWriter): ErrorCode => {
        writer.writeU8((c as CommandSysStopServiceResp).err);
        return ErrorCode.succ;
    },
    decoder: (reader: BufferReader): {err: ErrorCode, body?: {} & any} => {
        return {err: ErrorCode.succ, body: {err: reader.readU8()}};
    },
    printer: (c: Command.Command): string => {
        return `name=${c.name}, seq=${c.seq},err=${(c as CommandSysStopServiceResp).err}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});


export type CommandSysUploadLogReq = Command.Command & {
    taskNamespace: Command.Namespace,
    logname: string;
};
Command.CommandDefine.RegisterCommand(SysCommandName.sys_uploadlog_req, {
    encoder: (c: Command.Command, writer: BufferWriter): ErrorCode => {
        let command: CommandSysUploadLogReq = c as CommandSysUploadLogReq;
        if (command.taskNamespace.agentid) {
            writer.writeU16(Buffer.byteLength(command.taskNamespace.agentid, 'utf-8'));
            writer.writeString(command.taskNamespace.agentid, 'utf-8');    
        } else {
            writer.writeU16(0);
        }
        if (command.taskNamespace.serviceid) {
            writer.writeU16(Buffer.byteLength(command.taskNamespace.serviceid, 'utf-8'));
            writer.writeString(command.taskNamespace.serviceid, 'utf-8');    
        } else {
            writer.writeU16(0);
        }
        if (command.taskNamespace.taskid) {
            writer.writeU16(Buffer.byteLength(command.taskNamespace.taskid, 'utf-8'));
            writer.writeString(command.taskNamespace.taskid, 'utf-8');    
        } else {
            writer.writeU16(0);
        }
        writer.writeU16(Buffer.byteLength(command.logname, 'utf-8'));
        writer.writeString(command.logname, 'utf-8');
        return ErrorCode.succ;
    },
    decoder: (reader: BufferReader): {err: ErrorCode, body?: {} & any} => {
        let len: number = reader.readU16();
        let agentid: string | undefined;
        if (len) {
            agentid = reader.readString('utf-8', len);
        }

        len = reader.readU16();
        let serviceid: string | undefined;
        if (len) {
            serviceid = reader.readString('utf-8', len);
        }

        len = reader.readU16();
        let taskid: string | undefined;
        if (len) {
            taskid = reader.readString('utf-8', len);
        }
        let taskNamespace: Command.Namespace = {agentid, serviceid, taskid};

        len = reader.readU16();
        let logname: string = reader.readString('utf-8', len);
        return {err: ErrorCode.succ, body: {taskNamespace, logname}};
    },
    printer: (c: Command.Command): string => {
        return `name=${c.name}, seq=${c.seq},logname=${(c as CommandSysUploadLogReq).logname},taskNamespace=${JSON.stringify((c as any).taskNamespace)}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});

export type CommandSysUploadLogResp = Command.Command & {
    err: ErrorCode;
    url: string;
};
Command.CommandDefine.RegisterCommand(SysCommandName.sys_uploadlog_resp, {
    encoder: (c: Command.Command, writer: BufferWriter): ErrorCode => {
        let command: CommandSysUploadLogResp = c as CommandSysUploadLogResp;
        writer.writeU8(command.err);
        writer.writeU16(Buffer.byteLength(command.url, 'utf-8'));
        writer.writeString(command.url, 'utf-8');
        return ErrorCode.succ;
    },
    decoder: (reader: BufferReader): {err: ErrorCode, body?: {} & any} => {
        let err = reader.readU8();
        let len: number = reader.readU16();
        let url: string = reader.readString('utf-8', len);
        return {err: ErrorCode.succ, body: {err, url}};
    },
    printer: (c: Command.Command): string => {
        return `name=${c.name}, seq=${c.seq},err=${(c as CommandSysUploadLogResp).err},url=${(c as any).url} from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});


export type CommandSysUpdateServiceReq = Command.Command & {
    serviceid: string;
    servicename: string;
    newversion: string;
    url: string;
    md5: string;
};
Command.CommandDefine.RegisterCommand(SysCommandName.sys_updateservice_req, {
    encoder: (c: Command.Command, writer: BufferWriter): ErrorCode => {
        let command: CommandSysUpdateServiceReq = c as CommandSysUpdateServiceReq;
        writer.writeU16(Buffer.byteLength(command.serviceid, 'utf-8'));
        writer.writeString(command.serviceid, 'utf-8');

        writer.writeU16(Buffer.byteLength(command.servicename, 'utf-8'));
        writer.writeString(command.servicename, 'utf-8');

        writer.writeU16(Buffer.byteLength(command.newversion, 'utf-8'));
        writer.writeString(command.newversion, 'utf-8');

        writer.writeU16(Buffer.byteLength(command.url, 'utf-8'));
        writer.writeString(command.url, 'utf-8');
        return ErrorCode.succ;
    },
    decoder: (reader: BufferReader): {err: ErrorCode, body?: {} & any} => {
        let len: number = reader.readU16();
        let serviceid: string = reader.readString('utf-8', len);

        len = reader.readU16();
        let servicename: string = reader.readString('utf-8', len);

        len = reader.readU16();
        let newversion: string = reader.readString('utf-8', len);

        len = reader.readU16();
        let url: string = reader.readString('utf-8', len);

        len = reader.readU16();
        let md5: string = reader.readString('utf-8', len);

        return {err: ErrorCode.succ, body: {serviceid, servicename, newversion, url, md5}};
    },
    printer: (c: Command.Command): string => {
        return `name=${c.name}, seq=${c.seq},err=${(c as CommandSysStopServiceResp).err}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});

export type CommandSysRunTaskReq = Command.Command & {
    jobid: string;
    serviceid: string;
    taskid: string;
    version: string;
    url: string;
    md5: string;
    param: string[];
};
Command.CommandDefine.RegisterCommand(SysCommandName.sys_runtask_req, {
    encoder: (c: Command.Command, writer: BufferWriter): ErrorCode => {
        let command: CommandSysRunTaskReq = c as CommandSysRunTaskReq;

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
        return ErrorCode.succ;
    },
    decoder: (reader: BufferReader): {err: ErrorCode, body?: {} & any} => {
        let len: number = reader.readU16();
        let jobid: string = reader.readString('utf-8', len);

        len = reader.readU16();
        let serviceid: string = reader.readString('utf-8', len);

        len = reader.readU16();
        let taskid: string = reader.readString('utf-8', len);

        len = reader.readU16();
        let version: string = reader.readString('utf-8', len);

        len = reader.readU16();
        let url: string = reader.readString('utf-8', len);

        len = reader.readU16();
        let md5: string = reader.readString('utf-8', len);

        let param: string[] = [];
        let count: number = reader.readU16();
        for (let i = 0; i < count; i++) {
            let len: number = reader.readU16();
            let v: string = reader.readString('utf-8', len);
            param.push(v);
        }

        return {err: ErrorCode.succ, body: {jobid, serviceid, taskid, version, url, md5, param}};
    },
    printer: (c: Command.Command): string => {
        let command: CommandSysRunTaskReq = c as CommandSysRunTaskReq;
        let info = {
            jobid: command.jobid,
            serviceid: command.serviceid,
            taskid: command.taskid,
            version: command.version,
            url: command.url,
            md5: command.md5,
            param: command.param,
        }
        return `name=${c.name}, seq=${c.seq},info=${JSON.stringify(info)}, to=${JSON.stringify(c.to)}`;
    }
});

export type CommandSysRunTaskResp = Command.Command & {
    err: ErrorCode;
};
Command.CommandDefine.RegisterCommand(SysCommandName.sys_runtask_resp, {
    encoder: (c: Command.Command, writer: BufferWriter): ErrorCode => {
        writer.writeU8((c as CommandSysRunTaskResp).err);
        return ErrorCode.succ;
    },
    decoder: (reader: BufferReader): {err: ErrorCode, body?: {} & any} => {
        return {err: ErrorCode.succ, body: {err: reader.readU8()}};
    },
    printer: (c: Command.Command): string => {
        return `name=${c.name}, seq=${c.seq},err=${(c as CommandSysRunTaskResp).err}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});

export type CommandSysStopTaskReq = Command.Command & {
    serviceid: string;
    taskid: string;
};
Command.CommandDefine.RegisterCommand(SysCommandName.sys_stoptask_req, {
    encoder: (c: Command.Command, writer: BufferWriter): ErrorCode => {
        let command: CommandSysStopTaskReq = c as CommandSysStopTaskReq;
        writer.writeU16(Buffer.byteLength(command.serviceid, 'utf-8'));
        writer.writeString(command.serviceid, 'utf-8');

        writer.writeU16(Buffer.byteLength(command.taskid, 'utf-8'));
        writer.writeString(command.taskid, 'utf-8');
        return ErrorCode.succ;
    },
    decoder: (reader: BufferReader): {err: ErrorCode, body?: {} & any} => {
        let len: number = reader.readU16();
        let serviceid: string = reader.readString('utf-8', len);

        len = reader.readU16();
        let taskid: string = reader.readString('utf-8', len);
        return {err: ErrorCode.succ, body: {serviceid, taskid}};
    },
    printer: (c: Command.Command): string => {
        return `name=${c.name}, seq=${c.seq},serviceid=${(c as any).serviceid}, taskid=${(c as any).taskid}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});

export type CommandSysStopTaskResp = Command.Command & {
    err: ErrorCode;
};
Command.CommandDefine.RegisterCommand(SysCommandName.sys_stoptask_resp, {
    encoder: (c: Command.Command, writer: BufferWriter): ErrorCode => {
        writer.writeU8((c as CommandSysStopTaskResp).err);
        return ErrorCode.succ;
    },
    decoder: (reader: BufferReader): {err: ErrorCode, body?: {} & any} => {
        return {err: ErrorCode.succ, body: {err: reader.readU8()}};
    },
    printer: (c: Command.Command): string => {
        return `name=${c.name}, seq=${c.seq},err=${(c as CommandSysStopTaskResp).err}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});

export type CommandSysTaskFinishReq = Command.Command & {
    taskid: string;
    jobid: string;
    msg: string;
    code: number;
    urls: string[];
};
Command.CommandDefine.RegisterCommand(SysCommandName.sys_taskfinish_req, {
    encoder: (c: Command.Command, writer: BufferWriter): ErrorCode => {
        let command: CommandSysTaskFinishReq = c as CommandSysTaskFinishReq;

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
        return ErrorCode.succ;
    },
    decoder: (reader: BufferReader): {err: ErrorCode, body?: {} & any} => {
        let len: number = reader.readU16();
        let taskid: string = reader.readString('utf-8', len);

        len = reader.readU16();
        let jobid: string = reader.readString('utf-8', len);

        len = reader.readU16();
        let msg: string = reader.readString('utf-8', len);

        let code: number = reader.readU8();

        let urls: string[] = [];
        let count: number = reader.readU16();
        for (let i = 0; i < count; i++) {
            let len: number = reader.readU16();
            let v: string = reader.readString('utf-8', len);
            urls.push(v);
        }

        return {err: ErrorCode.succ, body: {taskid, jobid, msg, urls, code}};
    },
    printer: (c: Command.Command): string => {
        let command: CommandSysTaskFinishReq = c as CommandSysTaskFinishReq;
        let info = {
            jobid: command.jobid,
            taskid: command.taskid,
            code: command.code,
            msg: command.msg,
            urls: command.urls,
        }
        return `name=${c.name}, seq=${c.seq},info=${JSON.stringify(info)}, to=${JSON.stringify(c.to)}`;
    }
});

export type CommandSysTaskFinishResp = Command.Command & {
    err: ErrorCode;
};
Command.CommandDefine.RegisterCommand(SysCommandName.sys_taskfinish_resp, {
    encoder: (c: Command.Command, writer: BufferWriter): ErrorCode => {
        writer.writeU8((c as CommandSysTaskFinishResp).err);
        return ErrorCode.succ;
    },
    decoder: (reader: BufferReader): {err: ErrorCode, body?: {} & any} => {
        return {err: ErrorCode.succ, body: {err: reader.readU8()}};
    },
    printer: (c: Command.Command): string => {
        return `name=${c.name}, seq=${c.seq},err=${(c as CommandSysTaskFinishResp).err}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});

export type CommandSysAttachEventReq = Command.Command & {
    eventname: string;
};
Command.CommandDefine.RegisterCommand(SysCommandName.sys_attachevent_req, {
    encoder: (c: Command.Command, writer: BufferWriter): ErrorCode => {
        let command: CommandSysAttachEventReq = c as CommandSysAttachEventReq;
        writer.writeU16(Buffer.byteLength(command.eventname, 'utf-8'));
        writer.writeString(command.eventname, 'utf-8');
        return ErrorCode.succ;
    },
    decoder: (reader: BufferReader): {err: ErrorCode, body?: {} & any} => {
        let len: number = reader.readU16();
        let eventname: string = reader.readString('utf-8', len);
        return {err: ErrorCode.succ, body: {eventname}};
    },
    printer: (c: Command.Command): string => {
        return `name=${c.name}, seq=${c.seq},eventname=${(c as CommandSysAttachEventReq).eventname}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});

export type CommandSysAttachEventResp = Command.Command & {
    err: ErrorCode;
    cookie: number;
};
Command.CommandDefine.RegisterCommand(SysCommandName.sys_attachevent_resp, {
    encoder: (c: Command.Command, writer: BufferWriter): ErrorCode => {
        writer.writeU8((c as CommandSysAttachEventResp).err);
        writer.writeU32((c as CommandSysAttachEventResp).cookie);
        return ErrorCode.succ;
    },
    decoder: (reader: BufferReader): {err: ErrorCode, body?: {} & any} => {
        return {err: ErrorCode.succ, body: {err: reader.readU8(), cookie: reader.readU32()}};
    },
    printer: (c: Command.Command): string => {
        return `name=${c.name}, seq=${c.seq},err=${(c as CommandSysAttachEventResp).err}, cookie=${(c as CommandSysAttachEventResp).cookie}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});

export type CommandSysDetachEventReq = Command.Command & {
    eventname: string;
    cookie: number;
};
Command.CommandDefine.RegisterCommand(SysCommandName.sys_detachevent_req, {
    encoder: (c: Command.Command, writer: BufferWriter): ErrorCode => {
        let command: CommandSysDetachEventReq = c as CommandSysDetachEventReq;
        writer.writeU16(Buffer.byteLength(command.eventname, 'utf-8'));
        writer.writeString(command.eventname, 'utf-8');
        writer.writeU32(command.cookie);
        return ErrorCode.succ;
    },
    decoder: (reader: BufferReader): {err: ErrorCode, body?: {} & any} => {
        let len: number = reader.readU16();
        let eventname: string = reader.readString('utf-8', len);
        return {err: ErrorCode.succ, body: {eventname, cookie: reader.readU32()}};
    },
    printer: (c: Command.Command): string => {
        return `name=${c.name}, seq=${c.seq},eventname=${(c as CommandSysDetachEventReq).eventname}, cookie=${(c as CommandSysDetachEventReq).cookie}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});

export type CommandSysDetachEventResp = Command.Command & {
    err: ErrorCode;
};
Command.CommandDefine.RegisterCommand(SysCommandName.sys_detachevent_resp, {
    encoder: (c: Command.Command, writer: BufferWriter): ErrorCode => {
        writer.writeU8((c as CommandSysDetachEventResp).err);
        return ErrorCode.succ;
    },
    decoder: (reader: BufferReader): {err: ErrorCode, body?: {} & any} => {
        return {err: ErrorCode.succ, body: {err: reader.readU8()}};
    },
    printer: (c: Command.Command): string => {
        return `name=${c.name}, seq=${c.seq},err=${(c as CommandSysDetachEventResp).err}, from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});

export type CommandSysFireEventReq = Command.Command & {
    eventname: string;
    err: ErrorCode;
    param: any[];
};
Command.CommandDefine.RegisterCommand(SysCommandName.sys_fireevent_req, {
    encoder: (c: Command.Command, writer: BufferWriter): ErrorCode => {
        let command: CommandSysFireEventReq  = c as CommandSysFireEventReq;
        writer.writeU16(Buffer.byteLength(command.eventname, 'utf-8'));
        writer.writeString(command.eventname, 'utf-8');
        writer.writeU8(command.err);
        if (command.param) {
            let strParam: string = JSON.stringify(command.param);
            writer.writeU16(Buffer.byteLength(strParam, 'utf-8'));
            writer.writeString(strParam, 'utf-8');
        } else {
            writer.writeU16(0);
        }
        
        return ErrorCode.succ;
    },
    decoder: (reader: BufferReader): {err: ErrorCode, body?: {} & any} => {
        let len: number = reader.readU16();
        let eventname: string = reader.readString('utf-8', len);
        let err: ErrorCode = reader.readU8() as ErrorCode;
        let param: any[] = [];
        len = reader.readU16();
        if (len) {
            param = JSON.parse(reader.readBytes(len, true).toString('utf-8'));
        }
        return {err: ErrorCode.succ, body: {eventname, err, param}};
    },
    printer: (c: Command.Command): string => {
        return `name=${c.name}, seq=${c.seq},eventname=${(c as CommandSysFireEventReq).eventname},err=${(c as CommandSysFireEventReq).err},param=${JSON.stringify((c as any).param)} from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});

export type CommandSysUserApiReq = Command.Command & {
    apiname: string;
    bytes: Buffer
    param: any;
};
Command.CommandDefine.RegisterCommand(SysCommandName.sys_userapi_req, {
    encoder: (c: Command.Command, writer: BufferWriter): ErrorCode => {
        let command: CommandSysUserApiReq  = c as CommandSysUserApiReq;
        writer.writeU16(Buffer.byteLength(command.apiname, 'utf-8'));
        writer.writeString(command.apiname, 'utf-8');
        if (command.bytes.length) {
            writer.writeU16(command.bytes.length);
            writer.writeBytes(command.bytes);
        } else {
            writer.writeU16(0);
        }
        if (command.param) {
            let strParam: string = JSON.stringify(command.param);
            writer.writeU16(Buffer.byteLength(strParam, 'utf-8')); 
            writer.writeString(strParam, 'utf-8');
        } else {
            writer.writeU16(0); 
        }
        return ErrorCode.succ;
    },
    decoder: (reader: BufferReader): {err: ErrorCode, body?: {} & any} => {
        let len: number = reader.readU16();
        let apiname: string = reader.readString('utf-8', len);
        let bytes: Buffer = Buffer.from('');
        len = reader.readU16();
        if (len) {
            bytes = reader.readBytes(len);
        }
        let param: any;
        let paramLen: number = reader.readU16();
        if (paramLen) {
            param = JSON.parse(reader.readString('utf-8', paramLen));
        } 
        return {err: ErrorCode.succ, body: {apiname, bytes, param}};
    },
    printer: (c: Command.Command): string => {
        return `name=${c.name}, seq=${c.seq},apiname=${(c as CommandSysUserApiReq).apiname},param=${JSON.stringify((c as CommandSysUserApiReq).param)} from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});

export type CommandSysUserApiResp = Command.Command & {
    bytes: Buffer;
    err: ErrorCode;
    param: any;
};

Command.CommandDefine.RegisterCommand(SysCommandName.sys_userapi_resp, {
    encoder: (c: Command.Command, writer: BufferWriter): ErrorCode => {
        let command: CommandSysUserApiResp  = c as CommandSysUserApiResp;
        writer.writeU8(command.err);
        if (command.bytes.length) {
            writer.writeU16(command.bytes.length);
            writer.writeBytes(command.bytes);
        } else {
            writer.writeU16(0);
        }
        if (command.param) {
            let strParam: string = JSON.stringify(command.param);
            writer.writeU16(Buffer.byteLength(strParam, 'utf-8')); 
            writer.writeString(strParam, 'utf-8');
        } else {
            writer.writeU16(0); 
        }
        return ErrorCode.succ;
    },
    decoder: (reader: BufferReader): {err: ErrorCode, body?: {} & any} => {
        let err: ErrorCode = reader.readU8() as ErrorCode;
        let bytes: Buffer = Buffer.from('');
        let len: number = reader.readU16();
        if (len) {
            bytes = reader.readBytes(len);
        }
        let param: any;
        let paramLen: number = reader.readU16();
        if (paramLen) {
            param = JSON.parse(reader.readString('utf-8', paramLen));
        } 
        return {err: ErrorCode.succ, body: {err,bytes,param}};
    },
    printer: (c: Command.Command): string => {
        return `name=${c.name}, seq=${c.seq},err=${(c as CommandSysUserApiResp).err},param=${JSON.stringify((c as CommandSysUserApiResp).param)} from=${JSON.stringify(c.from)}, to=${JSON.stringify(c.to)}`;
    }
});