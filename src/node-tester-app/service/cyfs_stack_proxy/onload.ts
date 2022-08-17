import { ErrorCode, Namespace,Logger, BufferWriter, ServiceClientInterface, RandomGenerator, NetHelper, sleep } from '../../base';
import * as net from 'net';
import { fstat } from 'fs';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as SysProcess from 'process';
import WebSocket from "ws";
import  httpProxy from "http-proxy";  
import HttpProxyAgent from  'http-proxy-agent';
import {EventEmitter} from 'events';
import  http from "http";
import fetch from 'node-fetch';

class ProxyManager extends EventEmitter {
    private stack_type? : string;
    private logger: Logger;
    private stack_http_url? : string ;
    private stack_ws_url? : string;
    private local_ws? : WebSocket;
    private local_http? :httpProxy;
    private local_http_ws? :WebSocket;
    private state: number; // 0 未初始 1 初始化中 2 可使用 -1 销毁
    on(event: 'ws_message', listener: (msg:any) => void):this;
    on(event: 'unlive', listener: (msg:string) => void):this;
    on(event: string, listener: (...args: any[]) => void): this {
        super.on(event, listener);
        return this;
    }
    once(event: 'ws_message', listener: (msg:any) => void):this;
    once(event: 'unlive', listener: (msg:string) => void):this;
    once(event: string, listener: (...args: any[]) => void): this {
        super.once(event, listener);
        return this;
    }
    constructor(logger: Logger){
        super();
        this.logger = logger;
        this.state = 0 ;
    }
    init(stack_type:string):{err: ErrorCode, log?: string}{
        this.logger.info(`init cyfs stack ProxyManager type =${stack_type}`)
        this.stack_type = stack_type;
        if(stack_type == "runtime"){
            this.stack_http_url = "http://127.0.0.1:1322";
            this.stack_ws_url = "ws://127.0.0.1:1323";
        }else if(stack_type == "ood"){
            this.stack_http_url = "http://127.0.0.1:1318";
            this.stack_ws_url = "ws://127.0.0.1:1319";
        }
        this.start_http_proxy();
        this.start_ws_proxy();
        return {err:ErrorCode.succ,log:"start success"}
    }

    start_http_proxy():{err: ErrorCode, log?: string}{

        this.local_http = httpProxy.createProxyServer({});
        this.local_http.listen(20002);
        
        return {err:ErrorCode.succ,log:"start_http_proxy success"}
    }
    async proxy_http_req(method:string,host:string,headers_str:string,postData?:string) {

        
        let headers= JSON.parse(headers_str)
        headers.host = this.stack_http_url!.split("//")[1];
        const response = await fetch(this.stack_http_url!+host, {
            method: method,
            body: postData,
            headers,
            //rawHeaders
        });
        //this.logger.info(`${(await response.arrayBuffer())}`);
        this.logger.info("\n"+JSON.stringify(response.headers));
        let status = response.status;
        
        let header = JSON.stringify(response.headers.raw()) ;
        let statusText = response.statusText;
        // await response.json();
        // await response.text()
        let arrayBuffer = await response.arrayBuffer();
        this.logger.info(arrayBuffer)
        //let body = response.body.;
        return {json:{response,header,status,statusText},arrayBuffer:Buffer.from(arrayBuffer)}
        //this.local_http!.once("proxyRes",)
    }
    // start_http_proxy():{err: ErrorCode, log?: string}{
    //     this.local_http_ws = new WebSocket(this.stack_http_url!)
    //     this.local_http_ws!.on('close', () => {
    //         this.emit('unlive', this.stack_type!);
    //     })
    
    //     this.local_http_ws!.on('message', message => {
    //         this.logger.info(`recv http message from stack`)
    //         this.emit('http_message', message);
    //     })
    //     return {err:ErrorCode.succ,log:"start_http_proxy success"}
        
    // }
    // async proxy_http_req(message:any){
    //     this.logger.info(`proxy send ws request`)
    //     this.local_http_ws!.send(message);
    // }
    async start_ws_proxy(){
        this.local_ws = new WebSocket(this.stack_ws_url!);
        const checkAlive = setInterval(() => {
            this.logger.info(`send pong`);
            this.local_ws!.ping();
        }, 5 * 1000)
        this.local_ws!.on('close', () => {
            this.emit('unlive', this.stack_type!);
        })
        this.local_ws!.on('pong', () => {
            this.logger.info(`pong`);
        })
    
        this.local_ws!.on('message', message => {
            this.logger.info(`recv message from stack`)
            this.emit('ws_message', message);
        })
        while(this.state!>=0){
            await sleep(5000);
            this.logger.info(` 当前运行状态 ${this.state}`)
        }
        return {err:ErrorCode.succ,log:"start_ws_proxy success"}
        
    }
    async proxy_ws_req(message:any){
        this.logger.info(`proxy send ws request`)
        this.local_ws!.send(message);
    }

}

export async function ServiceMain(_interface: ServiceClientInterface) {

    _interface.getLogger().info(`=========start service namespace=${JSON.stringify(_interface.getNamespace())}`);
    let manager: ProxyManager =new ProxyManager(_interface.getLogger());
    manager.on('unlive', (msg: string) => {
        _interface.fireEvent('unlive', ErrorCode.fail, msg);
    });
    manager.on('ws_message',(msg:any)=>{
        _interface.fireEvent('accept', ErrorCode.succ,msg);
    })
    _interface.registerApi('start_client', async (from: Namespace, bytes: Buffer, param: { stack_type: string}): Promise<any> => {
        _interface.getLogger().debug(`remote call start_client,cyfs stack proxy will be inited`);
        let startInfo = await manager.init(param.stack_type);
        return { err: startInfo.err, bytes: Buffer.from(''), value: startInfo };
    });
    // _interface.registerApi('proxy_http', async (from: Namespace, bytes: Buffer, param: { message:any}): Promise<any> => {
    //     _interface.getLogger().debug(`remote call proxy_http,${JSON.stringify(param.message)}`);
    //     let startInfo = await manager.proxy_http_req(param.message);
    //     return { err: ErrorCode.succ, bytes: Buffer.from(''), value:  {log:"run successs"}};
    // });
    _interface.registerApi('proxy_http', async (from: Namespace, bytes: Buffer, param: { host:string,method:string,headers:string,postData?:string}): Promise<any> => {
        _interface.getLogger().debug(`remote call proxy_http,${JSON.stringify(param)}`);
        //let res : http.ServerResponse = new http.ServerResponse(param.req);
        let startInfo = await manager.proxy_http_req(param.method,param.host,param.headers,param.postData);
        return { err: ErrorCode.succ, bytes: startInfo.arrayBuffer, value: startInfo.json };
    });
    _interface.registerApi('proxy_ws', async (from: Namespace, bytes: Buffer, param: { message:any}): Promise<any> => {
        _interface.getLogger().debug(`remote call proxy_ws ${param.message}`);
        let startInfo = await manager.proxy_ws_req(param.message);
        return { err: ErrorCode.succ, bytes: Buffer.from(''), value: {log:"run successs"} };
    });

}