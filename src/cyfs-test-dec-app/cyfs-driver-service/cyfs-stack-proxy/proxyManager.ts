import { ErrorCode, Namespace, Logger, ServiceClientInterface, RandomGenerator } from '../../base';
import * as net from 'net';
import { EventEmitter } from 'events';
import { UtilTool } from "./util"
import { BdtLpc, BdtLpcCommand, BdtLpcResp } from './lpc';
import * as path from 'path';
import * as fs from 'fs-extra';
export function Uint8Array_to_string(fileData: Uint8Array) {
    var dataString = "";
    for (var i = 0; i < fileData.length; i++) {
        dataString += String.fromCharCode(fileData[i]);
    }
    return dataString
}
export function string_to_Uint8Array(str: string) {
    var arr :Array<number> = [];
    for (var i = 0, j = str.length; i < j; ++i) {
        arr.push(str.charCodeAt(i));
    }
    var tmpUint8Array = new Uint8Array(arr);
    return tmpUint8Array
}

export class ProxyManager extends EventEmitter {
    private stack_type?: string;
    private log: Logger;
    private m_interface: ServiceClientInterface;
    private stack_http_port?: number;
    private stack_ws_port?: number;
    private util_tool: UtilTool;
    //本地socket 代理池 seq : SDK 到 协议栈序列号 , r_seq 协议栈到SDK序列号
    private socket_list: Array<{ socket: net.Socket, type: string, remote_address: string, remote_port: number, seq?: number, r_seq?: number }>;
    private cache_name: string;
    private root : string;
    private state: number; // 0 未初始 1 初始化中 2 可使用 -1 销毁
    on(event: string, listener: (...args: any[]) => void): this {
        super.on(event, listener);
        return this;
    }
    once(event: string, listener: (...args: any[]) => void): this {
        super.once(event, listener);
        return this;
    }
    constructor(_interface: ServiceClientInterface) {
        super();
        this.m_interface = _interface;
        this.log = _interface.getLogger();
        this.cache_name = RandomGenerator.string(10);
        this.state = 0;
        this.socket_list = [];
        this.root = path.join(this.log.dir(), `../${this.cache_name}_cache`)
        this.util_tool = new UtilTool(_interface, this.log,this.root);
        
    }
    init(stack_type: string): { err: ErrorCode, log?: string, cache_name: string } {
        this.log.info(`init cyfs stack ProxyManager type =${stack_type}`)
        this.stack_type = stack_type;
        if (stack_type == "runtime") {
            this.stack_http_port = 1322;
            this.stack_ws_port = 1323;
        } else if (stack_type == "ood") {
            this.stack_http_port = 1318;
            this.stack_ws_port = 1319;
        }
        this.util_tool.init_cache();
        return { err: ErrorCode.succ, log: "start success", cache_name: this.cache_name }
    }
    async build_tunnel(type: string, remote_address: string, remote_port: number) {
        let port = this.stack_ws_port!
        if (type == "http") {
            port = this.stack_http_port!
        } else if (type == "ws") {
            port = this.stack_ws_port!
        }
        try {
            let client = net.connect(port, "127.0.0.1", () => {
                this.log.info(`${client.remoteAddress}_${client.remotePort} begin connect tcp 127.0.0.1:${port}`)
                this.socket_list!.push({
                    type,
                    remote_address,
                    remote_port,
                    socket: client,
                    seq: 0,
                    r_seq: 0,
                })
                let r_seq = 0;
                client.setKeepAlive(true, 2000)
                client.on('data', async (buf) => {
                    r_seq = r_seq + 1;
                    this.log.info(` ${this.cache_name} TCP Client ${port} resp stack data ${client.remoteAddress}:${client.remotePort},r_seq = ${r_seq}`);
                    let msg_u8 = buf as Uint8Array;
                    let info = await this.m_interface.fireEvent(`${remote_address}_${remote_port}`, ErrorCode.succ, r_seq, Uint8Array_to_string(msg_u8))
                })
            });
            if(!client.remoteAddress || !client.remotePort){
                return { err: ErrorCode.exception,log: `proxy client ${client.remoteAddress}_${client.remotePort}`};
            }
            return { err: ErrorCode.succ, log: `proxy client ${client.remoteAddress}_${client.remotePort}` };
        } catch (error) {
            return { err: ErrorCode.exception, log: `${error}` };
        }
    }
    async end_tunnel(type: string, remote_address: string, remote_port: number) {
        for (let i in this.socket_list) {
            if (this.socket_list[i].type == type && this.socket_list[i].remote_address == remote_address && this.socket_list[i].remote_port == remote_port) {
                this.socket_list[i].socket.end();
            }
        }
        return ErrorCode.notFound
    }
    async proxy_data(type: string, remote_address: string, remote_port: number, seq: number, bytes: Buffer) {
        for (let i in this.socket_list) {
            if (this.socket_list[i].type == type && this.socket_list[i].remote_address == remote_address && this.socket_list[i].remote_port == remote_port) {
                this.socket_list[i].socket.write(string_to_Uint8Array(bytes.toString()));
            }
        }
        return ErrorCode.notFound
    }
    async util_request(command: BdtLpcCommand): Promise<BdtLpcResp> {
        return await this.util_tool!.util_request(command);
    }
}