import { ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, sleep, RandomGenerator } from '../../base';
import { EventEmitter } from 'events';
import { Agent, Peer, BDTERROR } from './type'
import { UtilClient } from "./util_client"
import { request, ContentType } from "./request";
import * as path from "./path";
import * as config from "./config";
import * as api from "./action_api"



export class TcpStack extends EventEmitter {
    public tags: string; // 机器标签
    private m_interface: TaskClientInterface; //测试框架服务
    private logger: Logger; //日志
    private m_agentid: string; // 测试框架 id
    public client_name: string;  // 客户端名称
    public peer_name?: string;  // 客户端名称
    private m_conns: Map<string, TcpStream>; // TCP Stream 连接池
    private m_timeout: number; // 超时设置
    // BDT 协议栈配置
    public address?: string;

    private m_unliveCookie?: number;
    private m_acceptCookie?: number;



    public stack_list: Map<string, Buffer>;


    constructor(_interface: TaskClientInterface, agentid: string, tags: string, client_name: string) {
        super();
        this.m_agentid = agentid;
        this.tags = tags;
        this.m_interface = _interface;
        this.logger = _interface.getLogger();
        this.m_conns = new Map();
        this.stack_list = new Map();
        this.client_name = client_name;
        this.m_timeout = 60 * 1000;

    }
    async create_tcp_server(address: string, listener_recv:boolean,port: number = 22223,answer_size:number=0): Promise<api.CreateTcpServerResp> {
        this.peer_name = `${this.tags}_${port}`;
        // 创建一个TCP server ,监听连接请求
        let info = await this.m_interface.callApi('createBdtLpcListener', Buffer.from(''), {
            client_name: this.client_name,
            event_type: "ListenerTcpConnectEvent",
            event_name: `tcpAccept_${this.peer_name}`,
            action: {
                CreateTcpServerReq: {
                    name: this.peer_name,
                    port,
                    address,
                    answer_size
                }
            }

        }, this.m_agentid!, 10 * 1000);
        this.logger.debug(`callApi createBdtLpcListener result = ${info.value.result},msg = ${info.value.msg}`)
        let result: api.LpcActionApi = info.value;
        if (!result.CreateTcpServerResp || result.CreateTcpServerResp.result) {
            this.logger.error(`${this.tags} autoAccept failed,err =${info.err} ,info =${JSON.stringify(info.value)}`);

        }
        if (this.m_acceptCookie == undefined) {
            // 收到连接请求 创建tcp stream
            let rnAccept = await this.m_interface.attachEvent(`tcpAccept_${this.peer_name}`,async (err: ErrorCode, namespace: Namespace, json: string) => {
                let eventIfo: api.LpcActionApi = JSON.parse(json);
                if (eventIfo.ListenerTcpConnectEvent) {
                    this.logger.info(`${this.tags} ${this.client_name} 触发 tcp accept conn = ${JSON.stringify(eventIfo)}`);
                    
                    let tcp_stream = new TcpStream({
                        agentid: this.m_agentid,
                        client_name: this.client_name!,
                        peer_name: this.peer_name!,
                        _interface: this.m_interface,
                        timeout: this.m_timeout,
                        stream_name: eventIfo.ListenerTcpConnectEvent.stream_name,
                        sequence_id : eventIfo.ListenerTcpConnectEvent.sequence_id,
                    });
                    // tcp stream 监听数据接收事件
                    if(listener_recv){
                        let listener = await tcp_stream.listener_recv(); 
                    }
                    this.m_conns.set(eventIfo.ListenerTcpConnectEvent.stream_name, tcp_stream);
                    
                }
            }, this.m_agentid, this.m_timeout);
            this.m_acceptCookie = rnAccept.cookie!;
        }
        this.address = result.CreateTcpServerResp?.address;
        return result.CreateTcpServerResp!
    }

    async tcp_connect(address: string, conn_tag: string,listener_recv:boolean=false,question_size:number=0): Promise<{resp:api.TcpConnectResp,tcp_stream?:TcpStream}> {
        let action: api.LpcActionApi = {
            TcpConnectReq: {
                name: this.peer_name!,
                address,
                question_size,
            }
        }
        let info = await this.m_interface.callApi('sendBdtLpcCommand', Buffer.from(""), {
            client_name: this.client_name,
            action
        }, this.m_agentid, 0);
        this.logger.debug(`callApi tcp_connect BuckyResult result = ${JSON.stringify(info.value)}`)
        let result: api.LpcActionApi = info.value;
        if (!result.TcpConnectResp || result.TcpConnectResp.result) {
            this.logger.error(`${this.client_name} ${this.peer_name} connect failed,err =${JSON.stringify(result)}`)
            return {resp:result.TcpConnectResp!}
        }
        let tcp_stream = new TcpStream({
            agentid: this.m_agentid,
            client_name: this.client_name!,
            peer_name: this.peer_name!,
            _interface: this.m_interface,
            timeout: this.m_timeout,
            stream_name: result.TcpConnectResp!.stream_name!,
            conn_tag,
            sequence_id : result.TcpConnectResp!.sequence_id!,
        });
        this.m_conns.set(result.TcpConnectResp!.stream_name!, tcp_stream);
        if(listener_recv == true){
            let listener = await tcp_stream.listener_recv();
        }
        return {resp:result.TcpConnectResp!,tcp_stream}
    }

    async check_connect(sequence_id: string, conn_tag: string): Promise<{ err: ErrorCode, tcp_stream?: TcpStream }> {
        let check_sum = 10;
        while(check_sum>0){
            for (let tcp_stream of this.m_conns.values()) {
                if (tcp_stream.frist_sequence_id == sequence_id) {
                    tcp_stream.conn_tag = conn_tag;
                    return { err: ErrorCode.succ, tcp_stream }
                }
            }
            await sleep(1000)
        }
        
        return { err: ErrorCode.notFound }
    }
    async get_tcp_stream(conn_tag: string): Promise<{ err: ErrorCode, tcp_stream?: TcpStream }> {
        for (let tcp_stream of this.m_conns.values()) {
            if (tcp_stream.conn_tag == conn_tag) {
                return { err: ErrorCode.succ, tcp_stream }
            }
        }
        return { err: ErrorCode.notFound }
    }

}

export class TcpStream extends EventEmitter {
    private m_agentid: string;
    private client_name: string;
    public stream_name: string;
    public frist_sequence_id? : string; //tcp 连接socket四元组可能不一样，通过frist_sequence_id 来做标记
    public peer_name: string;  // 客户端名称
    public conn_tag?: string;
    private m_interface: TaskClientInterface;
    private timeout: number;
    private logger: Logger;
    private m_listener_recv_cookie?: number;

    public recv_cookie : Map<string,api.TcpStreamListenerEvent>
    constructor(options: {
        agentid: string;
        client_name: string;
        peer_name: string;
        stream_name: string;
        _interface: TaskClientInterface;
        timeout: number;
        conn_tag?: string;
        sequence_id?:string;
    }) {
        super();
        this.m_agentid = options.agentid;
        this.client_name = options.client_name;
        this.stream_name = options.stream_name;
        this.peer_name = options.peer_name;
        this.m_interface = options._interface;
        this.logger = this.m_interface.getLogger();
        this.timeout = options.timeout;
        this.conn_tag = options.conn_tag;
        this.recv_cookie = new Map();
        this.frist_sequence_id = options.sequence_id;
    }
    set_frist_sequence_id(sequence_id:string){
        if(!this.frist_sequence_id){
            this.logger.info(`${this.stream_name} set sequence_id ${sequence_id} `)
            this.frist_sequence_id = sequence_id;
        }
    } 
    async send(file_szie: number): Promise<api.TcpStreamSendResp> {
        let action: api.LpcActionApi = {
            TcpStreamSendReq: {
                name: this.peer_name,
                stream_name: this.stream_name,
                file_szie
            }
        }
        let info = await this.m_interface.callApi('sendBdtLpcCommand', Buffer.from(""), {
            client_name: this.client_name,
            action,
        }, this.m_agentid, 0);
        let result: api.LpcActionApi = info.value;
        this.logger.info(`callApi tcp send result = ${JSON.stringify(result)}`)
        if (!result.TcpStreamSendResp || result.TcpStreamSendResp.result) {
            this.logger.error(`${this.client_name} ${this.stream_name} send failed,err =${JSON.stringify(result)}`)
        }
        this.set_frist_sequence_id(result.TcpStreamSendResp!.sequence_id);
        return result.TcpStreamSendResp!;
    }

    async listener_recv(): Promise<{ err: ErrorCode, log: string }> {
        let info = await this.m_interface.callApi('createBdtLpcListener', Buffer.from(''), {
            client_name: this.client_name,
            event_type: "TcpStreamListenerEvent",
            event_name: `${this.stream_name}_recv`,
            action: {
                TcpStreamListenerReq: {
                    name: this.peer_name,
                    stream_name: this.stream_name,
                }
            }

        }, this.m_agentid!, 10 * 1000);
        this.logger.info(`callApi createBdtLpcListener result = ${info.value.result},msg = ${info.value.msg}`)
        let result: api.LpcActionApi = info.value;
        if (!result.TcpStreamListenerResp || result.TcpStreamListenerResp.result) {
            this.logger.error(`${this.client_name} TcpStreamListener failed,err =${info.err} ,info =${JSON.stringify(info.value)}`);
            return { err: ErrorCode.fail, log: "return data error" }
        }
        if (this.m_listener_recv_cookie == undefined) {
            // 收到连接请求 创建tcp stream
            let rnAccept = await this.m_interface.attachEvent(`${this.stream_name}_recv`, (err: ErrorCode, namespace: Namespace, json: string) => {
                let eventIfo: api.LpcActionApi = JSON.parse(json);
                if (eventIfo.TcpStreamListenerEvent) {
                    this.logger.info(`${this.client_name} ${this.stream_name} recv tcp stream data ${JSON.stringify(eventIfo.TcpStreamListenerEvent)}`);
                    this.set_frist_sequence_id(eventIfo.TcpStreamListenerEvent!.sequence_id);
                    this.recv_cookie.set(eventIfo.TcpStreamListenerEvent.sequence_id,eventIfo.TcpStreamListenerEvent);  
                }
            }, this.m_agentid, this.timeout);
            this.m_listener_recv_cookie = rnAccept.cookie!;
        }
        return { err: result.TcpStreamListenerResp.result, log: result.TcpStreamListenerResp.msg }
    }
}