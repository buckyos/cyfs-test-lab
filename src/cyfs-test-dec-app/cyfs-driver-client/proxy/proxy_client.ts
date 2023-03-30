import { CyfsStackClient, UtilTool } from "../cyfs_driver"
import { ErrorCode, Logger } from "../../common"
import {  Namespace, TaskClientInterface } from "../../cyfs-driver-base"
import { EventEmitter } from 'events';
import net from "net";
import { ProxyUtilTool } from "./proxy_util_tool"
import * as cyfs from "../../cyfs"
import { tgz } from "compressing";
import { sleep } from "cyfs-sdk";


export function Uint8Array_to_string(fileData: Uint8Array) {
    var dataString = "";
    for (var i = 0; i < fileData.length; i++) {
        dataString += String.fromCharCode(fileData[i]);
    }
    return dataString
}
export function string_to_Uint8Array(str: string) {
    var arr: Array<number> = [];
    for (var i = 0, j = str.length; i < j; ++i) {
        arr.push(str.charCodeAt(i));
    }
    var tmpUint8Array = new Uint8Array(arr);
    return tmpUint8Array
}

export class CyfsStackProxyClient extends EventEmitter implements CyfsStackClient {
    private peer_name: string; // 测试节点标签
    private stack_type: string;  // 测试节点协议栈类型
    private state: number; // 0 未初始 1 初始化中 2 可使用 -1 销毁
    private m_util_tool?: ProxyUtilTool;
    private m_agentid?: string;
    private ws_port: number;
    private http_port: number;
    private ood_daemon_status_port?:number;
    private timeout: number;
    private logger: Logger;
    private m_interface: TaskClientInterface;
    constructor(options: {
        _interface: TaskClientInterface;
        peer_name: string;
        stack_type: string;
        timeout: number;
        ws_port: number;
        http_port: number;
        ood_daemon_status_port?:number;
    }) {
        super();
        this.peer_name = options.peer_name;
        this.m_interface = options._interface;
        this.stack_type = options.stack_type;
        this.timeout = options.timeout;
        this.logger = this.m_interface.getLogger();
        this.state = 0;
        this.ws_port = options.ws_port;
        this.http_port = options.http_port;
        this.ood_daemon_status_port = options.ood_daemon_status_port;
    }
    async init(): Promise<{ err: ErrorCode, log: string }> {
        // 连接测试节点
        this.logger.info(`init driver client  ${this.peer_name} ${this.stack_type},ws =${this.ws_port} http =${this.http_port} ood_daemon_status_port = ${this.ood_daemon_status_port}`)
        this.state = 1;
        let agent = await this.m_interface.getAgent({} as any, [this.peer_name], [], [], this.timeout);
        if (agent.err || agent.agentid == undefined) {
            this.logger.error(`连接测试节点 ${this.peer_name}失败`)
            return { err: ErrorCode.connectProxyClientFailed, log: "连接测试节点失败" }
        }
        this.m_agentid = agent.agentid!;
        // 测试节点启动测试服务     
        let err = await this.m_interface.startService([], this.m_agentid, this.timeout);
        if (err) {
            this.logger.error(`${this.peer_name} 测试节点启动服务失败`)
            return { err: ErrorCode.connectProxyClientFailed, log: "测试节点启动服务失败" }
        }
        let info = await this.m_interface.callApi('start_client', Buffer.from(''), { stack_type: this.stack_type }, this.m_agentid!, 0);
        this.m_util_tool = new ProxyUtilTool(this.m_interface, this.m_agentid, this.peer_name, info.value.cacheName);
        this.start_proxy("ws", this.ws_port);
        this.start_proxy("http", this.http_port);
        
        if(this.stack_type=="ood" && this.ood_daemon_status_port){
            this.start_proxy("ood-daemon-status", this.ood_daemon_status_port);
        }
        this.state = 2;
        return { err: ErrorCode.succ, log: `${this.peer_name}启动成功` }
    }

    get_util_tool(): ProxyUtilTool {
        this.logger.info(`ProxyUtilTool ${this.peer_name} get_util_tool`)
        return this.m_util_tool!
    }

    async start_proxy(type: string, port: number): Promise<{ err: ErrorCode, log: string }> {
        this.logger.info(` ${this.peer_name} create proxy ${type} ${port}`);
        return new Promise(async (V) => {
            let timer =  setTimeout(()=>{
                this.logger.error(` ${this.peer_name} TCP Client start timeout`);
                V({ err: ErrorCode.timeout, log: `20s timeout` })
            },20*1000)
            let tcpServer = net.createServer(async (c) => {
                // 这个c 是上层业请求端
                this.logger.info(` ${this.peer_name} TCP Client ${port} connect ${c.remoteAddress}:${c.remotePort}`);
                // 创建tunnel
                let param = {
                    type,
                    remote_address: c.remoteAddress,
                    remote_port: c.remotePort
                }
                let info = await this.m_interface.callApi('build_tunnel', Buffer.from(""), param, this.m_agentid!, 0);
                this.logger.info(`${this.peer_name} build_tunnel result = ${info}`)
                if (info.err || info.value.err) {
                    this.logger.error(`${this.peer_name} build_tunnel err = ${JSON.stringify(info)}`)
                    clearTimeout(timer); 
                    V({ err: info.value.err!, log: info.value.log! })
                }
                // 添加保活探针
                c.setKeepAlive(true, 20*1000)
                // 监听测试框架事件，返回SDK 报文数据
                let recv_r_req = 0;
                let rnAccept = await this.m_interface.attachEvent(`${c.remoteAddress}_${c.remotePort}`, async (err: ErrorCode, namespace: Namespace, msg: string) => {
                    this.logger.info(` ${this.peer_name} TCP Client ${port} write msg ${c.remoteAddress}:${c.remotePort}`);
                    // 实现序列化发送, 返回给SDK
                    let msg_u8 = string_to_Uint8Array(msg);
                    c.write(msg_u8);

                }, this.m_agentid!);
                let seq = -1;
                let running = 0;
                c.on('data', async (buf) => {
                    seq = seq + 1;
                    const seq_index = seq;
                    while(seq_index > running){
                        await sleep(1)
                    }
                    let param = {
                        //seq,
                        type,
                        remote_address: c.remoteAddress,
                        remote_port: c.remotePort
                    }
                    //if()
                    let msg_u8 = buf as Uint8Array;
                    let data =   Buffer.from(Uint8Array_to_string(msg_u8))
                    this.logger.info(` ${this.peer_name} TCP Client ${port} read data ${c.remoteAddress}:${c.remotePort} size = ${data.length}`);
                    if(data.length<30000){
                        let info = await this.m_interface.callApi('proxy_data',data , param, this.m_agentid!, 0);
                    }else{
                        let data1 =  data.buffer.slice(0,30000)
                        let data2 =  data.buffer.slice(30000)
                        this.logger.debug(`send data ${seq_index} ${running} part1 size = ${data1.byteLength}`)
                        let info1 = await this.m_interface.callApi('proxy_data',Buffer.from(data1) , param, this.m_agentid!, 0);
                        this.logger.debug(`send data ${seq_index} ${running} part1 size = ${data1.byteLength} finished`)
                        this.logger.debug(`send data ${seq_index} ${running} part2 size = ${data2.byteLength}`)
                        let info2 = await this.m_interface.callApi('proxy_data',Buffer.from(data2) , param, this.m_agentid!, 0);
                        this.logger.debug(`send data ${seq_index} ${running} part2 size = ${data2.byteLength} finished`)
                        
                    }
                    running = running + 1;
                    //console.info(` ${this.peer_name} TCP Client ${port} read data ${c.remoteAddress}:${c.remotePort} size = ${data.length}`);
                    //console.info(` ${this.peer_name} TCP Client data = ${data}`);
                    
                })
                c.on("end", async () => {
                    let info = await this.m_interface.callApi('end_tunnel', Buffer.from(""), param, this.m_agentid!, 0);

                })
                c.on('error', async (err) => {
                    this.logger.info(`${this.peer_name} client ${port} proxy error ${err}`)
                    await this.m_interface.detachEvent(`${c.remoteAddress}_${c.remotePort}`, rnAccept.cookie!)
                    this.state = -1;
                });
            });
            tcpServer.listen({ host: "127.0.0.1", port, }, () => {
                this.logger.info(`${this.peer_name} TCP Server start`)
                clearTimeout(timer); 
                V({ err: ErrorCode.succ, log: `start proxy success` })
            });

        })

    }
}