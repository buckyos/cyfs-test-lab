import {ErrorCode} from '../common/errcode';
import {BufferReader} from '../common/reader';
import {BufferWriter} from '../common/writer';

//agent接入到这个网络的方式 
export enum AccessNetType {
    any = 0,
    wire = 1,
    wifi = 2,
}
export type NetEntry = {
    name: string;
    accessType: AccessNetType;
    ipv4?: string[];
    ipv6?: string[];
    udp?: number;
    tcp?: number;
}

export enum ClientExitCode {
    succ = 0, //主动退出，并执行成功
    failed = 1, //主动退出，但是任务执行失败
    killed = 2, //被动退出
    exception = 3, //异常退出
}

export type Namespace = {
    agentid?: string;
    serviceid?: string;
    taskid?: string;
};

export class NamespaceHelper {
    public static MasterAgentId: string = 'AgentMaster';
    public static LocalMasterServiceId: string = 'LocalMasterServiceId';

    static isNamespaceEqual(n1: Namespace, n2: Namespace): boolean {
        return (n1.agentid === n2.agentid) && (n1.serviceid === n2.serviceid) && (n1.taskid === n2.taskid);
    }
}

export type Command = {
    from: Namespace;
    to: Namespace;
    name: string;
    seq: number;
};

export type CommandEncoder = (c: Command, writer: BufferWriter) => ErrorCode;
export type CommandDecoder = (reader: BufferReader) => {err: ErrorCode, body?: {} & any};
export type CommandPrinter = (c: Command) => string;
export type CommandCoder = {
    encoder: CommandEncoder;
    decoder: CommandDecoder;
    printer: CommandPrinter
}
export class CommandDefine {
    static gCommandCoder: Map<string, CommandCoder> = new Map();

    static RegisterCommand(name: string, coder: CommandCoder) {
        CommandDefine.gCommandCoder.set(name, coder);
    }

    static getCoder(name: string): CommandCoder | undefined {
        return CommandDefine.gCommandCoder.get(name);
    }
} 

function encodeNamespace(namespace: Namespace, writer: BufferWriter): ErrorCode {
    if (namespace.agentid) {
        writer.writeU16(Buffer.byteLength(namespace.agentid!, 'utf8'));
        writer.writeString(namespace.agentid, 'utf8')
    } else {
        writer.writeU16(0);
    }

    if (namespace.serviceid) {
        writer.writeU16(Buffer.byteLength(namespace.serviceid!, 'utf8'));
        writer.writeString(namespace.serviceid, 'utf8')
    } else {
        writer.writeU16(0);
    }

    if (namespace.taskid) {
        writer.writeU16(Buffer.byteLength(namespace.taskid!, 'utf8'));
        writer.writeString(namespace.taskid, 'utf8')
    } else {
        writer.writeU16(0);
    }

    return ErrorCode.succ;
}

function decodeNamespace(reader: BufferReader): {err: ErrorCode, namespace?: Namespace} {
    // agentid
    let len: number = reader.readU16();
    let agentid: string | undefined;
    if (len > 0) {
        agentid = reader.readString('utf8', len);
    }

    // serviceid
    len = reader.readU16();
    let serviceid: string | undefined;
    if (len > 0) {
        serviceid = reader.readString('utf8', len);
    }

    // taskid
    len = reader.readU16();
    let taskid: string | undefined;
    if (len > 0) {
        taskid = reader.readString('utf8', len);
    }

    return {err: ErrorCode.succ, namespace: {agentid, serviceid, taskid}};
}

export function encodeCommand(c: Command, writer: BufferWriter): ErrorCode {
    let coder = CommandDefine.getCoder(c.name);
    if (!coder) {
        return ErrorCode.notExist;
    }

    writer.writeU16(Buffer.byteLength(c.name, 'utf8'));
    writer.writeString(c.name, 'utf8');
    writer.writeU32(c.seq);

    let writerTo: BufferWriter = new BufferWriter();
    encodeNamespace(c.to, writerTo);
    let buffer: Buffer = writerTo.render();
    writer.writeU16(buffer.length);
    
    writer.writeBytes(buffer);

    let writerFrom: BufferWriter = new BufferWriter();
    encodeNamespace(c.from, writerFrom);
    let buffer1: Buffer = writerFrom.render();
    writer.writeU16(buffer1.length);
    writer.writeBytes(buffer1);

    return coder.encoder(c, writer);
}

export function decodeCommand(reader: BufferReader): {err: ErrorCode, command?: Command} {
    let len: number =  reader.readU16();
    let name: string = reader.readString('utf8', len);

    let coder = CommandDefine.getCoder(name);
    if (!coder) {
        return {err: ErrorCode.notExist};
    }
    
    let seq: number = reader.readU32();

    let tolen: number = reader.readU16();
    let left: number = reader.left();
    let to = decodeNamespace(reader);
    if (to.err) {
        return to;
    }
    if (left - reader.left() !== tolen) {
        return {err: ErrorCode.fail};
    }
    
    let fromlen: number = reader.readU16();
    left = reader.left();
    let from = decodeNamespace(reader);
    if (from.err) {
        return from;
    }
    if (left - reader.left() !== fromlen) {
        return {err: ErrorCode.fail};
    }

    let body = coder.decoder(reader);
    if (body.err) {
        return body;
    }

    let command: any = {from: from.namespace!, to: to.namespace!, name, seq};
    Object.entries(body.body!).forEach((item) => {
        command[item[0]] = item[1];
    });

    return {err: ErrorCode.succ, command};
}

export function stringifyComand(c: Command): string {
    let coder = CommandDefine.getCoder(c.name);
    if (!coder) {
        return "";
    }

    return coder.printer(c);
}




