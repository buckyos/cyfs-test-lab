import { ErrorCode, Logger } from '../../base';
import * as net from 'net';
import { EventEmitter } from 'events';

export type BdtLpcCommand = {
    seq?: number;
    bytes: Buffer;
    json: { name: string, id: string } & any
};

export type BdtLpcResp = {
    err: ErrorCode,
    resp?: BdtLpcCommand
};

export type BdtLpcOptions = {
    logger: Logger;
};

export class BdtLpc extends EventEmitter {
    private m_socket?: net.Socket;
    private m_bQueue: boolean;
    private m_sendCaches: Buffer[];
    private m_recvCache?: Buffer;
    private m_version: number = 1;
    private m_logger: Logger;
    private m_id?: string;
    private m_cmd_seq: number = 0;

    on(event: 'error', listener: (lpc: BdtLpc, err: ErrorCode) => void): this;
    on(event: 'close', listener: (lpc: BdtLpc, err: boolean) => void): this;
    on(event: 'command', listener: (lpc: BdtLpc, c: BdtLpcCommand) => void): this;
    on(event: string, listener: (...args: any[]) => void): this {
        super.on(event, listener);
        return this;
    }

    once(event: 'error', listener: (lpc: BdtLpc, err: ErrorCode) => void): this;
    once(event: 'close', listener: (lpc: BdtLpc, err: boolean) => void): this;
    once(event: 'command', listener: (lpc: BdtLpc, c: BdtLpcCommand) => void): this;
    once(event: string, listener: (...args: any[]) => void): this {
        super.once(event, listener);
        return this;
    }

    constructor(options: BdtLpcOptions) {
        super();
        this.m_bQueue = false;
        this.m_logger = options.logger;
        this.m_sendCaches = [];
    }

    set id(s: string) {
        this.m_id = s;
    }

    async initFromListener(port: number): Promise<ErrorCode> {
        return new Promise(async(V)=>{
            this.m_logger.info(`begin connect 127.0.0.1:${port}`);
            this.m_socket = net.connect(port, "127.0.0.1", () => {
                this.m_logger.info(` connect tcp 127.0.0.1:${port} success`)
                this._initSocket();
                V(ErrorCode.succ)
            }).on('error', e => {
                this.m_logger.error(e);
                V(ErrorCode.fail)
            });
        }) 
    }

    private _next_cmd_seq(): number {
        return this.m_cmd_seq++;
    }

    send(command: BdtLpcCommand): ErrorCode {
        command.seq = this._next_cmd_seq();
        this.m_logger.debug(`bdtlpc send command to bdt.exe, seq=${command.seq!}, data=${JSON.stringify(command.json)}`);
        let info = this._encodeMsg(command);
        if (info.err) {
            this.m_logger.error(`bdtlpc send command to bdt.exe failed,for encode failed, err=${info.err}}`);
            return info.err;
        }
        return this._send(info.buffer!);
    }

    async wait_resp(command: BdtLpcCommand): Promise<{ err: ErrorCode, resp?: BdtLpcCommand }> {
        let err = this.send(command);
        if (err !== ErrorCode.succ) {
            return { err };
        }
        return await new Promise<{ err: ErrorCode, resp?: BdtLpcCommand }>((v) => {
            let onFunc = (lpc: BdtLpc, resp: BdtLpcCommand) => {
                if (resp.json.name !== "ping" && resp.seq! === command.seq!) {
                    lpc.removeListener('command', onFunc);
                    v({ err: ErrorCode.succ, resp })
                }
            };
            this.on('command', onFunc);
        });
    }

    private _send(buff: Buffer): ErrorCode {
        if (this.m_bQueue) {
            this.m_sendCaches.push(buff);
            return ErrorCode.succ;
        }

        try {
            this.m_bQueue = !this.m_socket!.write(buff);
            return ErrorCode.succ;
        } catch (e) {
            this.m_logger.error(`bdtlpc send failed, error=${e}, s=${this.m_id}`);
            return ErrorCode.fail;
        }
    }

    private _initSocket() {
        this.m_socket!.on('drain', () => {
            if (this.m_sendCaches.length) {
                let buff = Buffer.concat(this.m_sendCaches);
                this.m_sendCaches = [];
                this.m_bQueue = !this.m_socket!.write(buff);
            } else {
                this.m_bQueue = false;
            }
        });

        this.m_socket!.on('data', (data: Buffer) => {
            if (this.m_recvCache) {
                this.m_recvCache = Buffer.concat([this.m_recvCache, data]);
            } else {
                this.m_recvCache = data;
            }

            //2 = length(2)
            while (this.m_recvCache && this.m_recvCache.length > 2) {
                let msgInfo = this._decodeMsg();
                if (msgInfo.err) {
                    this.m_logger.error(`bdtlpc decode failed, err=${msgInfo.err}`);
                    if (msgInfo.err !== ErrorCode.noMoreData) {
                        this.m_recvCache = Buffer.from('');
                    }
                    break;
                }

                this.emit('command', this, msgInfo.command!);
            }
        });

        this.m_socket!.on('error', (err) => {
            this.m_logger.error(`socket error = ${err}`)
            this.emit('error', this, ErrorCode.fail);
        })

        this.m_socket!.on('close', (had_error) => {
            this.m_logger.error(`bdtlpc socket close ${had_error}`);
            this.emit('close', this, had_error);
        });
    }

    private _decodeMsg(): { err: ErrorCode, command?: BdtLpcCommand } {
        try {
            let decodeOffset: number = 0;
            if (this.m_recvCache!.length < 4) {
                this.m_logger.error(`not get length when decode for no more data, length=${this.m_recvCache!.length}, need=${4 + decodeOffset}`);
                return { err: ErrorCode.noMoreData };
            }
            let length = this.m_recvCache!.readUInt32LE(decodeOffset);
            decodeOffset += 4;

            if (this.m_recvCache!.length < 4 + length) {
                this.m_logger.error(`not get length when decode for no more data, length=${this.m_recvCache!.length}, need=${4 + decodeOffset}`);
                return { err: ErrorCode.noMoreData };
            }

            let seq = this.m_recvCache!.readUInt32LE(decodeOffset);
            decodeOffset += 4;

            let bytesLength = this.m_recvCache!.readUInt32LE(decodeOffset);
            decodeOffset += 4;

            let bytes: Buffer = Buffer.from('');
            if (bytesLength) {
                bytes = this.m_recvCache!.slice(decodeOffset, decodeOffset + bytesLength);
                decodeOffset += bytesLength;
            }

            let jsonLength = length - 8 - bytesLength;
            let jsonBuffer = this.m_recvCache!.slice(decodeOffset, decodeOffset + jsonLength);
            decodeOffset += jsonLength;
            this.m_recvCache = this.m_recvCache!.slice(decodeOffset);
            //this.m_logger.debug(`-----------------${jsonBuffer.toString('utf-8')}, decodeOffset=${decodeOffset}, length=${this.m_recvCache!.length}`);

            let json = JSON.parse(jsonBuffer.toString('utf-8'));

            let command: BdtLpcCommand = { seq, bytes, json };
            return { err: ErrorCode.succ, command };
        } catch (e) {
            this.m_logger.error(`bdtlpc decode msg exception, e=${e}`);
            return { err: ErrorCode.exception };
        }
    }

    private _encodeMsg(command: BdtLpcCommand): { err: ErrorCode, buffer?: Buffer } {
        try {
            let buffer: Buffer = new Buffer(4/*total*/ + 4/*seq*/ + 4/*bytes length*/);

            let jsonStr = JSON.stringify(command.json);
            let total: number = 4 + 4 + command.bytes.length + jsonStr.length;
            buffer.writeUInt32LE(total, 0);
            buffer.writeUInt32LE(command.seq!, 4);
            buffer.writeUInt32LE(command.bytes.length, 8);

            buffer = Buffer.concat([buffer, command.bytes, Buffer.from(jsonStr)]);

            return { err: ErrorCode.succ, buffer };
        } catch (e) {
            this.m_logger.error(`bdtlpc encode msg exception, e=${e}`);
            return { err: ErrorCode.exception };
        }
    }
}