import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, sleep} from '../../base';
import {EventEmitter} from 'events';
import  net from "net";

export const StackError = {
    success: 0, //执行成功
    LNAgentError: 1, //测试框架连接测试设备报错
    RNAgentError: 2, //测试框架连接测试设备报错
    reportDataFailed: 3, //报存测试数据报错
    testDataError: 4 ,//使用测试数据校验失败报错
    timeout: 5, //执行用例超时报错
    connect_cyfs_client_faild : 1001, 
}
export function Uint8ArrayToString(fileData:Uint8Array){
    var dataString = "";
    for (var i = 0; i < fileData.length; i++) {
      dataString += String.fromCharCode(fileData[i]);
    }
    return dataString
}
export function stringToUint8Array(str:string){
    var arr = [];
    for (var i = 0, j = str.length; i < j; ++i) {
      arr.push(str.charCodeAt(i));
    }
    var tmpUint8Array = new Uint8Array(arr);
    return tmpUint8Array
}
export class StackProxyClient extends EventEmitter{
    private peerName : string; // 测试节点标签
    private  stack_type : string;  // 测试节点协议栈类型
    private state: number; // 0 未初始 1 初始化中 2 可使用 -1 销毁
    private m_agentid?: string;
    private ws_port :number;
    private http_port :number;
    private timeout : number;
    private log : Logger;
    private m_interface: TaskClientInterface;
    constructor(options: {
        _interface: TaskClientInterface;
        peerName: string;
        stack_type : string;   
        timeout : number;
        ws_port :number; 
        http_port :number;   
    }) {
        super();
        this.peerName = options.peerName;
        this.m_interface = options._interface;
        this.stack_type = options.stack_type;
        this.timeout = options.timeout;
        this.log = this.m_interface.getLogger();
        this.state  = 0;
        this.ws_port = options.ws_port;
        this.http_port = options.http_port;
    }
    async init():Promise<{err: ErrorCode, log?: string}> {
        // 连接测试节点
        this.state = 1;
        let agent = await this.m_interface.getAgent({} as any, [this.peerName],[],[], this.timeout);
        if (agent.err || agent.agentid == undefined ) {
            this.log.error(`连接测试节点 ${this.peerName}失败`)
            return {err:StackError.LNAgentError,log:"连接测试节点失败"}
        }
        this.m_agentid = agent.agentid!;  
        // 测试节点启动测试服务     
        let err = await this.m_interface.startService([],this.m_agentid , this.timeout);
        if (err) {
            this.log.error(`${this.peerName} 测试节点启动服务失败`)
            return {err:StackError.LNAgentError,log:"测试节点启动服务失败"}
        }
        let info = await this.m_interface.callApi('start_client', Buffer.from(''), {stack_type:this.stack_type}, this.m_agentid!, 0);
        this.start_proxy("ws",this.ws_port);
        this.start_proxy("http",this.http_port);
        this.state = 2;
        return {err:ErrorCode.succ,log:"启动成功"}
    }

    async start_proxy(type:string,port:number){
        let tcpServer = net.createServer(async (c) => {
            this.log.info(` ${this.peerName} TCP Client ${port} connect ${c.remoteAddress}:${c.remotePort}`);
            // 创建tunnel
            let param = {
                type,
                remoteAddress :c.remoteAddress,
                remotePort: c.remotePort
            }
            let info = await this.m_interface.callApi('build_tunnel', Buffer.from(""), param, this.m_agentid!, 0);
            if(info.err){
                this.log.error(`build_tunnel`)
            }
            // 监听测试框架事件，返回SDK 报文数据
            let recv_r_req = 0;
            let rnAccept = await this.m_interface.attachEvent(`${c.remoteAddress}_${c.remotePort}`,async (err: ErrorCode,namespace: Namespace,r_req:number,msg: string) => {
                this.log.info(` ${this.peerName} TCP Client ${port} write msg ${c.remoteAddress}:${c.remotePort}`);
                // 实现序列化发送
                let recheck = 5;
                let msg_u8 = stringToUint8Array(msg);
                c.write(msg_u8);
                // while(recheck>0){
                //     recheck = recheck -1;
                //     if(recv_r_req == r_req -1){
                //         recv_r_req = r_req;
                        
                //         break;
                //     }
                //     await sleep(10);
                // }
                // if(recheck<=0){
                //     this.log.info(` ${this.peerName} TCP Client ${port} write msg err,r_req =${r_req},recv_r_req=${recv_r_req}`);
                // }
                
            }, this.m_agentid!);
            let seq = 0;
            c.on('data',async(buf)=>{
                this.log.info(` ${this.peerName} TCP Client ${port} read data ${c.remoteAddress}:${c.remotePort}`);
                seq = seq + 1;
                let param = {
                    seq,
                    type,
                    remoteAddress :c.remoteAddress,
                    remotePort: c.remotePort
                }
                let msg_u8 = buf as Uint8Array;
                let info = await this.m_interface.callApi('proxy_data', Buffer.from(Uint8ArrayToString(msg_u8)), param, this.m_agentid!, 0);
            })
            c.on('error', async (err) => {
                this.log.info(`${this.peerName} client ${port} proxy error ${err}`)
                await this.m_interface.detachEvent(`${c.remoteAddress}_${c.remotePort}`,rnAccept.cookie!)
                this.state = -1;
            }); 
        });
        tcpServer.listen({ host:"127.0.0.1",port, }, () => {
            this.log.info(`${this.peerName} TCP Server start`)
        });
        return tcpServer;
    } 
}













