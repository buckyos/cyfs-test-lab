"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BdtLpc = void 0;
const common_1 = require("../../common");
const events_1 = require("events");
class BdtLpc extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.m_version = 1;
        this.m_cmd_seq = 0;
        this.m_bQueue = false;
        this.m_logger = options.logger;
        this.m_sendCaches = [];
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
    initFromListener(socket) {
        this.m_socket = socket;
        this._initSocket();
        return common_1.ErrorCode.succ;
    }
    _next_cmd_seq() {
        return this.m_cmd_seq++;
    }
    send(command) {
        command.seq = this._next_cmd_seq();
        this.m_logger.debug(`bdtlpc send command to bdt.exe, seq=${command.seq}, name=${command.json.name}`);
        let info = this._encodeMsg(command);
        if (info.err) {
            this.m_logger.error(`bdtlpc send command to bdt.exe failed,for encode failed, err=${info.err}}`);
            return info.err;
        }
        return this._send(info.buffer);
    }
    async wait_resp(command) {
        let err = this.send(command);
        if (err !== common_1.ErrorCode.succ) {
            return { err };
        }
        return await new Promise((v) => {
            let onFunc = (lpc, resp) => {
                if (resp.json.name !== "ping" && resp.seq === command.seq) {
                    lpc.removeListener('command', onFunc);
                    v({ err: common_1.ErrorCode.succ, resp });
                }
            };
            this.on('command', onFunc);
        });
    }
    _send(buff) {
        if (this.m_bQueue) {
            this.m_sendCaches.push(buff);
            return common_1.ErrorCode.succ;
        }
        try {
            this.m_bQueue = !this.m_socket.write(buff);
            return common_1.ErrorCode.succ;
        }
        catch (e) {
            this.m_logger.error(`bdtlpc send failed, error=${e}, s=${this.m_id}`);
            return common_1.ErrorCode.fail;
        }
    }
    _initSocket() {
        this.m_socket.on('drain', () => {
            if (this.m_sendCaches.length) {
                let buff = Buffer.concat(this.m_sendCaches);
                this.m_sendCaches = [];
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
            //2 = length(2)
            while (this.m_recvCache && this.m_recvCache.length > 2) {
                let msgInfo = this._decodeMsg();
                if (msgInfo.err) {
                    this.m_logger.error(`bdtlpc decode failed, err=${msgInfo.err}`);
                    if (msgInfo.err !== common_1.ErrorCode.noMoreData) {
                        this.m_recvCache = Buffer.from('');
                    }
                    break;
                }
                this.emit('command', this, msgInfo.command);
            }
        });
        this.m_socket.on('error', (err) => {
            this.emit('error', this, common_1.ErrorCode.fail);
        });
        this.m_socket.on('close', (had_error) => {
            this.m_logger.error(`bdtlpc socket close ${had_error}`);
            this.emit('close', this, had_error);
        });
    }
    _decodeMsg() {
        try {
            let decodeOffset = 0;
            if (this.m_recvCache.length < 4) {
                this.m_logger.error(`not get length when decode for no more data, length=${this.m_recvCache.length}, need=${4 + decodeOffset}`);
                return { err: common_1.ErrorCode.noMoreData };
            }
            let length = this.m_recvCache.readUInt32LE(decodeOffset);
            decodeOffset += 4;
            if (this.m_recvCache.length < 4 + length) {
                this.m_logger.error(`not get length when decode for no more data, length=${this.m_recvCache.length}, need=${4 + decodeOffset}`);
                return { err: common_1.ErrorCode.noMoreData };
            }
            let seq = this.m_recvCache.readUInt32LE(decodeOffset);
            decodeOffset += 4;
            let bytesLength = this.m_recvCache.readUInt32LE(decodeOffset);
            decodeOffset += 4;
            let bytes = Buffer.from('');
            if (bytesLength) {
                bytes = this.m_recvCache.slice(decodeOffset, decodeOffset + bytesLength);
                decodeOffset += bytesLength;
            }
            let jsonLength = length - 8 - bytesLength;
            let jsonBuffer = this.m_recvCache.slice(decodeOffset, decodeOffset + jsonLength);
            decodeOffset += jsonLength;
            this.m_recvCache = this.m_recvCache.slice(decodeOffset);
            //this.m_logger.debug(`-----------------${jsonBuffer.toString('utf-8')}, decodeOffset=${decodeOffset}, length=${this.m_recvCache!.length}`);
            let json = JSON.parse(jsonBuffer.toString('utf-8'));
            let command = { seq, bytes, json };
            return { err: common_1.ErrorCode.succ, command };
        }
        catch (e) {
            this.m_logger.error(`bdtlpc decode msg exception, e=${e}`);
            return { err: common_1.ErrorCode.exception };
        }
    }
    _encodeMsg(command) {
        try {
            let buffer = Buffer.allocUnsafe(4 /*total*/ + 4 /*seq*/ + 4 /*bytes length*/);
            let jsonStr = JSON.stringify(command.json);
            let total = 4 + 4 + command.bytes.length + jsonStr.length;
            buffer.writeUInt32LE(total, 0);
            buffer.writeUInt32LE(command.seq, 4);
            buffer.writeUInt32LE(command.bytes.length, 8);
            buffer = Buffer.concat([buffer, command.bytes, Buffer.from(jsonStr)]);
            return { err: common_1.ErrorCode.succ, buffer };
        }
        catch (e) {
            this.m_logger.error(`bdtlpc encode msg exception, e=${e}`);
            return { err: common_1.ErrorCode.exception };
        }
    }
}
exports.BdtLpc = BdtLpc;
