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
    private ood_daemon_http_port?:number;
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
            this.ood_daemon_http_port = 1330;
        }
        this.util_tool.init_cache();
        return { err: ErrorCode.succ, log: "start success", cache_name: this.cache_name }
    }
    async build_tunnel(type: string, remote_address: string, remote_port: number) {
        this.log.info(`#### build_tunnel ${type} ${remote_address} ${remote_port}`)
        let port = this.stack_ws_port!
        if (type == "http") {
            port = this.stack_http_port!
        } else if (type == "ws") {
            port = this.stack_ws_port!
        }else if (type == "ood-daemon-status") {
            port = this.ood_daemon_http_port!
        }
        return new Promise(async(resolve)=>{
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
                    client.setKeepAlive(true, 2000);
                    
                    client.on('data', async (buf) => {
                        r_seq = r_seq + 1;
                        
                        let msg_u8 = buf as Uint8Array;
                        //let data =   Buffer.from(Uint8Array_to_string(msg_u8))
                        if(msg_u8.length<30000){
                            this.log.info(` ${this.cache_name} TCP Client ${port} resp stack data ${client.remoteAddress}:${client.remotePort} length = ${msg_u8.length}`);
                            let info = await this.m_interface.fireEvent(`${remote_address}_${remote_port}`, ErrorCode.succ, Uint8Array_to_string(msg_u8))
                        }else{
                            let data1 = new Uint8Array(msg_u8.buffer.slice(0,30000))
                            let data2 =  new Uint8Array(msg_u8.buffer.slice(30000))
                            this.log.info(` ${this.cache_name} TCP Client ${port} resp stack data ${client.remoteAddress}:${client.remotePort} length = ${data1.length}`);
                            let info1 = await this.m_interface.fireEvent(`${remote_address}_${remote_port}`, ErrorCode.succ,Uint8Array_to_string(data1))
                            this.log.info(` ${this.cache_name} TCP Client ${port} resp stack data ${client.remoteAddress}:${client.remotePort} length = ${data2.length}`);
                            let info2 = await this.m_interface.fireEvent(`${remote_address}_${remote_port}`, ErrorCode.succ,Uint8Array_to_string(data2))
                        }
                        
                    })
                    client.on("error",async(err)=>{
                        this.log.error(`net connect error ${err}`);
                        resolve({ err: ErrorCode.fail, log: `${err.message}`}) ;
                    });
                    client.on("ready",async()=>{
                        this.log.info(`net connect success ${client.remoteAddress}_${client.remotePort}`);
                        resolve({ err: ErrorCode.succ, log: `proxy client ${client.remoteAddress}_${client.remotePort}`}) ;
                    })
                    client.on("connect",async()=>{
                        this.log.info(`net connect success ${client.remoteAddress}_${client.remotePort}`);
                        resolve({ err: ErrorCode.succ, log: `proxy client ${client.remoteAddress}_${client.remotePort}`}) ;
                    })
                });
                
            } catch (error) {
                resolve({ err: ErrorCode.exception, log: `${error}` }) ;
            }
        })
        
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
        this.log.info(`${type} ${remote_address} ${remote_port} recv proxy_data`);
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
