"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringifyComand = exports.decodeCommand = exports.encodeCommand = exports.CommandDefine = exports.NamespaceHelper = exports.ClientExitCode = exports.AccessNetType = void 0;
const errcode_1 = require("../../common/errcode");
const writer_1 = require("../../common/writer");
//agent接入到这个网络的方式 
var AccessNetType;
(function (AccessNetType) {
    AccessNetType[AccessNetType["any"] = 0] = "any";
    AccessNetType[AccessNetType["wire"] = 1] = "wire";
    AccessNetType[AccessNetType["wifi"] = 2] = "wifi";
})(AccessNetType = exports.AccessNetType || (exports.AccessNetType = {}));
var ClientExitCode;
(function (ClientExitCode) {
    ClientExitCode[ClientExitCode["succ"] = 0] = "succ";
    ClientExitCode[ClientExitCode["failed"] = 1] = "failed";
    ClientExitCode[ClientExitCode["killed"] = 2] = "killed";
    ClientExitCode[ClientExitCode["exception"] = 3] = "exception";
})(ClientExitCode = exports.ClientExitCode || (exports.ClientExitCode = {}));
class NamespaceHelper {
    static isNamespaceEqual(n1, n2) {
        return (n1.agentid === n2.agentid) && (n1.serviceid === n2.serviceid) && (n1.taskid === n2.taskid);
    }
}
exports.NamespaceHelper = NamespaceHelper;
NamespaceHelper.MasterAgentId = 'AgentMaster';
NamespaceHelper.LocalMasterServiceId = 'LocalMasterServiceId';
class CommandDefine {
    static RegisterCommand(name, coder) {
        CommandDefine.gCommandCoder.set(name, coder);
    }
    static getCoder(name) {
        return CommandDefine.gCommandCoder.get(name);
    }
}
exports.CommandDefine = CommandDefine;
CommandDefine.gCommandCoder = new Map();
function encodeNamespace(namespace, writer) {
    if (namespace.agentid) {
        writer.writeU16(Buffer.byteLength(namespace.agentid, 'utf8'));
        writer.writeString(namespace.agentid, 'utf8');
    }
    else {
        writer.writeU16(0);
    }
    if (namespace.serviceid) {
        writer.writeU16(Buffer.byteLength(namespace.serviceid, 'utf8'));
        writer.writeString(namespace.serviceid, 'utf8');
    }
    else {
        writer.writeU16(0);
    }
    if (namespace.taskid) {
        writer.writeU16(Buffer.byteLength(namespace.taskid, 'utf8'));
        writer.writeString(namespace.taskid, 'utf8');
    }
    else {
        writer.writeU16(0);
    }
    return errcode_1.ErrorCode.succ;
}
function decodeNamespace(reader) {
    // agentid
    let len = reader.readU16();
    let agentid;
    if (len > 0) {
        agentid = reader.readString('utf8', len);
    }
    // serviceid
    len = reader.readU16();
    let serviceid;
    if (len > 0) {
        serviceid = reader.readString('utf8', len);
    }
    // taskid
    len = reader.readU16();
    let taskid;
    if (len > 0) {
        taskid = reader.readString('utf8', len);
    }
    return { err: errcode_1.ErrorCode.succ, namespace: { agentid, serviceid, taskid } };
}
function encodeCommand(c, writer) {
    let coder = CommandDefine.getCoder(c.name);
    if (!coder) {
        return errcode_1.ErrorCode.notExist;
    }
    writer.writeU16(Buffer.byteLength(c.name, 'utf8'));
    writer.writeString(c.name, 'utf8');
    writer.writeU32(c.seq);
    let writerTo = new writer_1.BufferWriter();
    encodeNamespace(c.to, writerTo);
    let buffer = writerTo.render();
    writer.writeU16(buffer.length);
    writer.writeBytes(buffer);
    let writerFrom = new writer_1.BufferWriter();
    encodeNamespace(c.from, writerFrom);
    let buffer1 = writerFrom.render();
    writer.writeU16(buffer1.length);
    writer.writeBytes(buffer1);
    return coder.encoder(c, writer);
}
exports.encodeCommand = encodeCommand;
function decodeCommand(reader) {
    let len = reader.readU16();
    let name = reader.readString('utf8', len);
    let coder = CommandDefine.getCoder(name);
    if (!coder) {
        return { err: errcode_1.ErrorCode.notExist };
    }
    let seq = reader.readU32();
    let tolen = reader.readU16();
    let left = reader.left();
    let to = decodeNamespace(reader);
    if (to.err) {
        return to;
    }
    if (left - reader.left() !== tolen) {
        return { err: errcode_1.ErrorCode.fail };
    }
    let fromlen = reader.readU16();
    left = reader.left();
    let from = decodeNamespace(reader);
    if (from.err) {
        return from;
    }
    if (left - reader.left() !== fromlen) {
        return { err: errcode_1.ErrorCode.fail };
    }
    let body = coder.decoder(reader);
    if (body.err) {
        return body;
    }
    let command = { from: from.namespace, to: to.namespace, name, seq };
    Object.entries(body.body).forEach((item) => {
        command[item[0]] = item[1];
    });
    return { err: errcode_1.ErrorCode.succ, command };
}
exports.decodeCommand = decodeCommand;
function stringifyComand(c) {
    let coder = CommandDefine.getCoder(c.name);
    if (!coder) {
        return "";
    }
    return coder.printer(c);
}
exports.stringifyComand = stringifyComand;
