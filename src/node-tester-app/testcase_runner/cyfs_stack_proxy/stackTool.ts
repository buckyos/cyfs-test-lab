import { ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, sleep } from '../../base';
import { EventEmitter } from 'events';
import httpProxy from "http-proxy";
import http from "http";
import { WebSocket, Server } from "ws";


import express from "express";

import querystring from "querystring"
export const StackError = {
    success: 0, //执行成功
    LNAgentError: 1, //测试框架连接测试设备报错
    RNAgentError: 2, //测试框架连接测试设备报错
    reportDataFailed: 3, //报存测试数据报错
    testDataError: 4,//使用测试数据校验失败报错
    timeout: 5, //执行用例超时报错
    connect_cyfs_client_faild: 1001,
}

export function stringToUint8Array(str: string) {
    var arr = [];
    for (var i = 0, j = str.length; i < j; ++i) {
        arr.push(str.charCodeAt(i));
    }

    var tmpUint8Array = new Uint8Array(arr);
    return tmpUint8Array
}
export class StackProxyClient extends EventEmitter {
    private peerName: string; // 测试节点标签
    private stack_type: string;  // 测试节点协议栈类型
    private state: number; // 0 未初始 1 初始化中 2 可使用 -1 销毁
    private m_agentid?: string;
    private ws_port: number;
    private http_port: number;
    private local_ws?: Array<WebSocket>;
    private local_http?: http.Server;
    private timeout: number;
    private log: Logger;
    private m_interface: TaskClientInterface;
    constructor(options: {
        _interface: TaskClientInterface;
        peerName: string;
        stack_type: string;
        timeout: number;
        ws_port: number;
        http_port: number;
    }) {
        super();
        this.peerName = options.peerName;
        this.m_interface = options._interface;
        this.stack_type = options.stack_type;
        this.timeout = options.timeout;
        this.log = this.m_interface.getLogger();
        this.state = 0;
        this.ws_port = options.ws_port;
        this.http_port = options.http_port;
        this.local_ws = [];
    }
    async init(): Promise<{ err: ErrorCode, log?: string }> {
        // 连接测试节点
        this.state = 1;
        let agent = await this.m_interface.getAgent({} as any, [this.peerName], [], [], this.timeout);
        if (agent.err || agent.agentid == undefined) {
            this.log.error(`连接测试节点 ${this.peerName}失败`)
            return { err: StackError.LNAgentError, log: "连接测试节点失败" }
        }
        this.m_agentid = agent.agentid!;
        // 测试节点启动测试服务     
        let err = await this.m_interface.startService([], this.m_agentid, this.timeout);
        if (err) {
            this.log.error(`${this.peerName} 测试节点启动服务失败`)
            return { err: StackError.LNAgentError, log: "测试节点启动服务失败" }
        }
        // 本地启动http 代理监听
        this.start_http_proxy();
        // 本地启动ws 代理监听
        this.start_ws_proxy()
        // 测试节点代理服务连接协议栈
        let info = await this.m_interface.callApi('start_client', Buffer.from(''), { stack_type: this.stack_type }, this.m_agentid!, 0);
        this.state = 2;
        return { err: ErrorCode.succ, log: "启动成功" }
    }

    async start_ws_proxy(): Promise<{ err: ErrorCode, log?: string }> {
        const app = express()
        const server = http.createServer(app)
        const wss = new WebSocket.Server({ server })
        server.listen(this.ws_port)
        this.log.info(`start ws listen ${this.ws_port}`)
        const checkAlive = setInterval(() => {
            if (this.local_ws) {
                this.log.info(`###### ${this.peerName} send ping from sdk`)
                for (let ws in this.local_ws) {
                    this.local_ws![ws].ping();
                }

            }
        }, 5 * 1000)

        wss.on('connection', async ws_in => {
            this.log.info(`### recv new ws connection ${this.local_ws!.length}`)
            this.local_ws!.push(ws_in);
            if (this.local_ws!.length == 1) {
                let index = 0;
                ws_in.on('pong', () => {
                    this.log.info(`###### ${this.peerName} recv pong from sdk`)
                })
                ws_in.on('close', () => {
                    this.log.info(`${this.peerName} ws connect close`)
                })
                // 接收sdk 转发 协议栈
                ws_in.on('message', async message => {
                    this.log.info(`###### ${this.peerName}  recv message from sdk,message = ${JSON.stringify(message)}`)
                    let param = {
                        message: message
                    }
                    let info = await this.m_interface.callApi('proxy_ws', Buffer.from(''), param, this.m_agentid!, 0);
                    this.log.info(`${JSON.stringify(info)}`);
                })
                let rnAccept = await this.m_interface.attachEvent('ws_message', (err: ErrorCode, namespace: Namespace, msg: string) => {
                    let buf_msg = stringToUint8Array(msg)

                    this.m_interface.getLogger().info(`######### ${this.peerName} ${this.local_ws![Number(index)].url} ${index} recv ws_message from stack ,send to sdk,msg =${buf_msg}`);

                    this.local_ws![index].send(buf_msg);

                }, this.m_agentid!);
            } else if (this.local_ws!.length == 2) {
                let index = 1;
                ws_in.on('pong', () => {
                    this.log.info(`###### ${this.peerName} recv pong from sdk`)
                })
                ws_in.on('close', () => {
                    this.log.info(`${this.peerName} ws connect close`)
                })
                // 接收sdk消息转发到目标协议栈
                ws_in.on('message', async message => {
                    this.log.info(`###### ${this.peerName}  recv message from sdk,message = ${JSON.stringify(message)}`)
                    let param = {
                        message: message
                    }
                    let info = await this.m_interface.callApi('proxy_ws1', Buffer.from(''), param, this.m_agentid!, 0);
                    this.log.info(`${JSON.stringify(info)}`);
                })
                let rnAccept = await this.m_interface.attachEvent('ws_message1', (err: ErrorCode, namespace: Namespace, msg: string) => {
                    let buf_msg = stringToUint8Array(msg)
                    this.m_interface.getLogger().info(`######### ${this.peerName} ${this.local_ws![Number(index)].url} ${index} recv ws_message1 from stack ,send to sdk,msg =${buf_msg}`);
                    this.local_ws![index].send(buf_msg);

                }, this.m_agentid!);
            }


        })
        wss.on('close', () => {
            clearInterval(checkAlive)
        })
        while (this.state! >= 0) {
            await sleep(5000);
            this.log.info(`${this.peerName} 当前运行状态 ${this.state}`)
        }
        return { err: ErrorCode.succ, log: "ws_proxy run finished" }
    }

    async start_http_proxy(): Promise<{ err: ErrorCode, log?: string }> {

        this.local_http = http.createServer(async (req, res) => {

            this.log.info(`${JSON.stringify(req.headers)}`);

            let host = req.url;
            let method = req.method;
            let rawHeaders = req.rawHeaders
            let headers = JSON.stringify(req.headers);
            //this.log.info(req);
            var postData = "";

            req.addListener('end', async () => {
                //为了内存安全，将postData copy 后释放，避免两次请求 postData合并 ,暂时忽略性能
                let sendData = postData;
                postData = "";
                //数据接收完毕
                this.log.info(`send http data ${sendData}`);
                let param
                if (method == "GET") {
                    param = {
                        host,
                        method,
                        headers

                    }
                } else {
                    param = {
                        host,
                        method,
                        headers,
                        postData: sendData,
                    }
                }
                let resp = await this.m_interface.callApi('proxy_http', Buffer.from(""), param, this.m_agentid!, 0);
                this.log.info(`${JSON.stringify(resp)}`);
                //res.write(resp.bytes!);
                res.writeHead(resp.value.status, resp.value.statusText, JSON.parse(resp.value.header))
                res.end(resp.bytes!);
                //res.end(JSON.stringify(resp.value.response));
            });
            req.addListener('data', (postDataStream) => {
                this.log.info(postDataStream);
                postData += postDataStream
            });

        });
        this.local_http.listen(this.http_port!)
        this.log.info(`start http listen ${this.http_port}`)
        while (this.state! >= 0) {
            await sleep(this.http_port!);
            this.log.info(`${this.peerName} 当前运行状态 ${this.state}`)
        }
        return { err: ErrorCode.succ, log: "http_proxy run finished" }
    }
}


