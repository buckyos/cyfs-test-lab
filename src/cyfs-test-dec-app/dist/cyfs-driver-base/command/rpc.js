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
exports.Rpc = void 0;
const errcode_1 = require("../../common/errcode");
const net = __importStar(require("net"));
const events_1 = require("events");
const command_1 = require("./command");
const reader_1 = require("../../common/reader");
const writer_1 = require("../../common/writer");
const fs = __importStar(require("fs-extra"));
class Rpc extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.m_version = 1;
        this.m_bQueue = false;
        this.m_logger = options.logger;
        this.m_sendCaches = [];
        this.m_filename = options.filename;
    }
    on(event, listener) {
        super.on(event, listener);
        return this;
    }
    once(event, listener) {
        super.once(event, listener);
        return this;
    }
    set id(s) {
        this.m_id = s;
    }
    connect(ip, port) {
        this.m_logger.info(`begin connect to server ip=${ip} port=${port}`);
        this.m_socket = net.createConnection(port, ip);
        this.m_socket.once('connect', () => {
            this._initSocket();
            this.emit('establish');
        });
        this.m_socket.once('error', (err) => {
            this.m_logger.error(`connect failed, err=${err}`);
            this.emit('error', this, errcode_1.ErrorCode.fail);
        });
        return errcode_1.ErrorCode.succ;
    }
    initFromListener(socket) {
        this.m_socket = socket;
        this._initSocket();
        return errcode_1.ErrorCode.succ;
    }
    send(command) {
        this.m_logger.debug(`send command, ${command_1.stringifyComand(command)}`);
        let info = this._encodeMsg({ magic: Buffer.from('12'), version: this.m_version, command });
        if (info.err) {
            this.m_logger.error(`send encode msg failed,for encode failed, err=${info.err}, ${command_1.stringifyComand(command)}`);
            return info.err;
        }
        return this._send(info.buffer);
    }
    _send(buff) {
        if (this.m_bQueue) {
            this.m_sendCaches.push(buff);
            return errcode_1.ErrorCode.succ;
        }
        try {
            if (this.m_filename) {
                fs.appendFileSync(this.m_filename + '.send', buff);
            }
            this.m_bQueue = !this.m_socket.write(buff);
            return errcode_1.ErrorCode.succ;
        }
        catch (e) {
            this.m_logger.error(`send failed, error=${e}, s=${this.m_id}`);
            return errcode_1.ErrorCode.fail;
        }
    }
    _initSocket() {
        this.m_socket.on('drain', () => {
            if (this.m_sendCaches.length) {
                let buff = Buffer.concat(this.m_sendCaches);
                this.m_sendCaches = [];
                if (this.m_filename) {
                    fs.appendFileSync(this.m_filename + '.send', buff);
                }
                this.m_bQueue = !this.m_socket.write(buff);
            }
            else {
                this.m_bQueue = false;
            }
        });
        this.m_socket.on('data', (data) => {
            if (this.m_recvCache) {
                this.m_recvCache = Buffer.concat([this.m_recvCache, data]);
            }
            else {
                this.m_recvCache = data;
            }
            if (this.m_filename) {
                fs.appendFileSync(this.m_filename + '.recv', data);
            }
            //8 = magic(2) + version(2) + length(4)
            while (this.m_recvCache && this.m_recvCache.length > 8) {
                let msgInfo = this._decodeMsg();
                if (msgInfo.err) {
                    this.m_logger.error(`decode failed, err=${msgInfo.err}`);
                    if (msgInfo.err !== errcode_1.ErrorCode.noMoreData) {
                        this.m_recvCache = Buffer.from('');
                    }
                    break;
                }
                this.emit('command', this, msgInfo.msg.command);
            }
        });
        this.m_socket.on('error', (err) => {
            this.m_logger.error(`socket error ${JSON.stringify(err)}`);
            this.emit('error', this, errcode_1.ErrorCode.fail);
        });
        this.m_socket.on('close', (had_error) => {
            this.m_logger.error(`socket close ${had_error}`);
            this.emit('close', this, had_error);
        });
    }
    _decodeMsg() {
        try {
            let decodeOffset = 0;
            if (this.m_recvCache.length < 2 + decodeOffset) {
                this.m_logger.error(`not get magic when decode for no more data, length=${this.m_recvCache.length}, need=${2 + decodeOffset}`);
                return { err: errcode_1.ErrorCode.noMoreData };
            }
            let magic = this.m_recvCache.slice(decodeOffset, decodeOffset + 2);
            decodeOffset += 2;
            if (this.m_recvCache.length < 2 + decodeOffset) {
                this.m_logger.error(`not get version when decode for no more data, length=${this.m_recvCache.length}, need=${2 + decodeOffset}`);
                return { err: errcode_1.ErrorCode.noMoreData };
            }
            let version = this.m_recvCache.readUInt16LE(decodeOffset);
            decodeOffset += 2;
            if (this.m_recvCache.length < 4 + decodeOffset) {
                this.m_logger.error(`not get length when decode for no more data, length=${this.m_recvCache.length}, need=${4 + decodeOffset}`);
                return { err: errcode_1.ErrorCode.noMoreData };
            }
            let length = this.m_recvCache.readUInt32LE(decodeOffset);
            decodeOffset += 4;
            if (this.m_recvCache.length < length + decodeOffset) {
                this.m_logger.debug(this.m_recvCache.toString());
                this.m_logger.error(`not get length when decode for no more data, length=${this.m_recvCache.length}<${length + decodeOffset}`);
                return { err: errcode_1.ErrorCode.noMoreData };
            }
            let body = this.m_recvCache.slice(decodeOffset, length + decodeOffset);
            decodeOffset += length;
            this.m_recvCache = this.m_recvCache.slice(decodeOffset);
            let reader = new reader_1.BufferReader(body, true);
            let cmdInfo = command_1.decodeCommand(reader);
            if (cmdInfo.err) {
                return { err: cmdInfo.err };
            }
            let msg = { magic, version, command: cmdInfo.command };
            return { err: errcode_1.ErrorCode.succ, msg };
        }
        catch (e) {
            this.m_logger.error(`[rpc] decode msg exception, e=${e}`);
            return { err: errcode_1.ErrorCode.exception };
        }
    }
    _encodeMsg(rpcMsg) {
        try {
            let buffer = Buffer.allocUnsafe(2 + 4);
            buffer.writeUInt16LE(rpcMsg.version, 0);
            let writer = new writer_1.BufferWriter();
            let err = command_1.encodeCommand(rpcMsg.command, writer);
            if (err) {
                return { err };
            }
            let body = writer.render();
            buffer.writeUInt32LE(body.length, 2);
            buffer = Buffer.concat([rpcMsg.magic.slice(0, 2), buffer, body]);
            return { err: errcode_1.ErrorCode.succ, buffer };
        }
        catch (e) {
            this.m_logger.error(`[rpc] encode msg exception, e=${e}`);
            return { err: errcode_1.ErrorCode.exception };
        }
    }
}
exports.Rpc = Rpc;
