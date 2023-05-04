import {ErrorCode} from '../../cyfs-test-base/errcode';
import * as net from 'net';
import {EventEmitter} from 'events';
import {Command, encodeCommand, decodeCommand, stringifyComand} from './command';
import {BufferReader} from '../../cyfs-test-base/reader';
import {BufferWriter} from '../../cyfs-test-base/writer';
import { Logger } from '../../cyfs-test-base/log';
import * as fs from 'fs-extra';

export type RpcMsg = {
    magic: Buffer;
    version: number;
    command: Command;
}
export type RpcOptions = {
    logger: Logger;
    filename?: string;
}
export class Rpc extends EventEmitter {
    private m_socket?: net.Socket;
    private m_bQueue: boolean;
    private m_sendCaches: Buffer[];
    private m_recvCache?: Buffer;
    private m_version: number = 1;
    private m_logger: Logger;
    private m_id?: string;
    private m_filename?: string;

    on(event: 'error', listener: (rpc: Rpc, err: ErrorCode) => void): this;
    on(event: 'close', listener: (rpc: Rpc, err: boolean) => void): this;
    on(event: 'establish', listener: (rpc: Rpc, ) => void): this;
    on(event: 'command', listener: (rpc: Rpc, c: Command) => void): this;
    on(event: string, listener: (...args: any[]) => void): this {
        super.on(event, listener);
        return this;
    }

    once(event: 'error', listener: (rpc: Rpc, err: ErrorCode) => void): this;
    once(event: 'close', listener: (rpc: Rpc, err: boolean) => void): this;
    once(event: 'establish', listener: (rpc: Rpc, ) => void): this;
    once(event: 'command', listener: (rpc: Rpc, c: Command) => void): this;
    once(event: string, listener: (...args: any[]) => void): this {
        super.once(event, listener);
        return this;
    }

    constructor(options: RpcOptions) {
        super();
        this.m_bQueue = false;
        this.m_logger = options.logger;
        this.m_sendCaches = [];
        this.m_filename = options.filename;
    }

    set id(s: string) {
        this.m_id = s;
    }

    connect(ip: string, port: number): ErrorCode {
        console.info(`begin connect to server ip=${ip} port=${port}`);
        this.m_socket = net.createConnection(port, ip);
        this.m_socket!.once('connect', () => {
            this._initSocket();

            this.emit('establish');
        });
        
        this.m_socket!.once('error', (err: Error) => {
            console.error(`connect failed, err=${err}`);
            this.emit('error', this, ErrorCode.fail);
        });

        return ErrorCode.succ;
    }

    initFromListener(socket: net.Socket): ErrorCode {
        this.m_socket = socket;
        this._initSocket();
        return ErrorCode.succ;
    }

    send(command: Command): ErrorCode {
        console.debug(`send command, ${stringifyComand(command)}`);
        let info = this._encodeMsg({magic: Buffer.from('12'), version: this.m_version, command});
        if (info.err) {
            console.error(`send encode msg failed,for encode failed, err=${info.err}, ${stringifyComand(command)}`);
            return info.err;
        }
        return this._send(info.buffer!);
    }

    private _send(buff: Buffer): ErrorCode {
        if (this.m_bQueue) {
            this.m_sendCaches.push(buff);
            return ErrorCode.succ;
        }

        try {
            if (this.m_filename) {
                fs.appendFileSync(this.m_filename+'.send', buff);
            }
            this.m_bQueue = !this.m_socket!.write(buff);
            return ErrorCode.succ;
        } catch (e) {
            console.error(`send failed, error=${e}, s=${this.m_id}`);
            return ErrorCode.fail;
        }
    }

    private _initSocket() {
        this.m_socket!.on('drain', () => {
            if (this.m_sendCaches.length) {
                let buff = Buffer.concat(this.m_sendCaches);
                this.m_sendCaches = [];
                if (this.m_filename) {
                    fs.appendFileSync(this.m_filename+'.send', buff);
                }
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
            if (this.m_filename) {
                fs.appendFileSync(this.m_filename+'.recv', data);
            }

            //8 = magic(2) + version(2) + length(4)
            while (this.m_recvCache && this.m_recvCache.length > 8) {
                let msgInfo = this._decodeMsg();
                if (msgInfo.err) {
                    console.error(`decode failed, err=${msgInfo.err}`);
                    if (msgInfo.err !== ErrorCode.noMoreData) {
                        this.m_recvCache = Buffer.from('');
                    }
                    break;
                }
                
                this.emit('command', this, msgInfo.msg!.command);
            }
        });

        this.m_socket!.on('error', (err) => {
            console.error(`socket error ${JSON.stringify(err)}`);
            this.emit('error', this, ErrorCode.fail);
        })

        this.m_socket!.on('close', (had_error) => {
            console.error(`socket close ${had_error}`);
            this.emit('close', this, had_error);
        });
    }

    private _decodeMsg(): {err: ErrorCode, msg?: RpcMsg} {
        try {
            let decodeOffset: number = 0;

            if (this.m_recvCache!.length < 2 + decodeOffset) {
                console.error(`not get magic when decode for no more data, length=${this.m_recvCache!.length}, need=${2+decodeOffset}`);
                return { err: ErrorCode.noMoreData };
            }
            let magic = this.m_recvCache!.slice(decodeOffset, decodeOffset + 2);
            decodeOffset += 2;

            if (this.m_recvCache!.length < 2 + decodeOffset) {
                console.error(`not get version when decode for no more data, length=${this.m_recvCache!.length}, need=${2+decodeOffset}`);
                return { err: ErrorCode.noMoreData };
            }
            let version = this.m_recvCache!.readUInt16LE(decodeOffset);
            decodeOffset += 2;

            if (this.m_recvCache!.length < 4 + decodeOffset) {
                console.error(`not get length when decode for no more data, length=${this.m_recvCache!.length}, need=${4+decodeOffset}`);
                return { err: ErrorCode.noMoreData };
            }
            let length = this.m_recvCache!.readUInt32LE(decodeOffset);
            decodeOffset += 4;
            if (this.m_recvCache!.length < length + decodeOffset) {
                console.debug(this.m_recvCache!.toString())
                console.error(`not get length when decode for no more data, length=${this.m_recvCache!.length}<${length + decodeOffset}`);
                return { err: ErrorCode.noMoreData };
            }
            
            let body = this.m_recvCache!.slice(decodeOffset, length + decodeOffset);
            decodeOffset += length;
            this.m_recvCache = this.m_recvCache!.slice(decodeOffset);
            let reader: BufferReader = new BufferReader(body, true);
            let cmdInfo = decodeCommand(reader);
            if (cmdInfo.err) {
                return {err: cmdInfo.err};
            }

            let msg: RpcMsg = {magic, version, command: cmdInfo.command!};
            return { err: ErrorCode.succ,  msg}; 
        } catch (e) {
            console.error(`[rpc] decode msg exception, e=${e}`);
            return {err: ErrorCode.exception};
        }
    }

    private _encodeMsg(rpcMsg: RpcMsg): { err: ErrorCode, buffer?: Buffer } {
        try {
            let buffer: Buffer = Buffer.allocUnsafe(2 + 4);
            buffer.writeUInt16LE(rpcMsg.version, 0);
            let writer: BufferWriter = new BufferWriter();
            let err = encodeCommand(rpcMsg.command, writer);
            if (err) {
                return { err };
            }
            let body: Buffer = writer.render();
            buffer.writeUInt32LE(body.length, 2);
            buffer = Buffer.concat([rpcMsg.magic.slice(0, 2), buffer, body]);
            return { err: ErrorCode.succ, buffer };
        } catch (e) {
            console.error(`[rpc] encode msg exception, e=${e}`);
            return {err: ErrorCode.exception};
        }
    }
}