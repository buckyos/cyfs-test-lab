

import { ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, sleep, RandomGenerator } from '../../base';
import { EventEmitter } from 'events';
import { Agent, Peer, BDTERROR } from './type'
import { UtilClient } from "./util_client"
import { request, ContentType } from "./request";
import * as path from "./path";
import * as config from "./config";
import * as api from "./action_api"



export class BdtStack extends EventEmitter {
    public tags: string; // 机器标签
    private m_interface: TaskClientInterface; //测试框架服务
    private logger: Logger; //日志
    private m_agentid: string; // 测试框架 id
    public client_name?: string;  // 客户端名称
    public peer_name: string;  // BDT 协议栈名称
    public peerid: string;  // BDT 协议栈device id
    public device_object: Buffer; //  BDT 协议栈device 对象
    private m_conns: Map<string, BdtConnection>; // BDT Stream 连接池
    private m_timeout: number; // 超时设置
    // BDT 协议栈配置
    public answer_size?: number; //FastQA FastStream连接的answer_size
    public question_size?: number; //FastQA FastStream 连接的question_size
    public conn_tag?: string; //BDT Stream 连接标签
   
    private m_unliveCookie?: number;
    private m_acceptCookie?: number;
    public cache_peer_info: Peer;
    public ep_resp: Array<string>;
    public ep_info: Array<string>;
    public online_time: number;
    public online_sn: Array<string>;
    

    public stack_list: Map<string, Buffer>;


    constructor(_interface: TaskClientInterface, agentid: string, tags: string, peer: Peer,resp : api.CreateStackResp,client_name:string,device_object:Buffer) {
        super();
        this.m_agentid = agentid;
        this.tags = tags;
        this.m_interface = _interface;
        this.logger = _interface.getLogger();
        this.cache_peer_info = peer
        this.m_conns = new Map();
        this.stack_list = new Map();
        this.m_timeout = 60 * 1000;
        this.peer_name = resp.peer_name;
        this.peerid = resp.device_id;
        this.online_sn = resp.online_sn;
        this.online_time = resp.online_time;
        this.ep_resp = resp.ep_resp
        this.ep_info = resp.ep_info
        this.client_name = client_name;   
        this.device_object = device_object;   
    }
    // 测试相关操作
    async getConnection(conn_tag: string): Promise<{ err: number, conn?: BdtConnection }> {

        for (let conn of this.m_conns.values()) {
            if (conn.conn_tag === conn_tag) {
                return { err: BDTERROR.success, conn }
            }
        }
        return { err: BDTERROR.NotFound }

    }


    async remark_accpet_conn_name(TempSeq: string, remote: string, conn_tag?: string): Promise<{ err: number, conn?: BdtConnection }> {
        for (let conn of this.m_conns.values()) {
            if (conn.TempSeq == TempSeq && conn.remote == remote && !conn.conn_tag) {
                conn.conn_tag = conn_tag;
                return { err: BDTERROR.success, conn }
            }
        }
        return { err: BDTERROR.RNCheckConnFailed }
    }
    async destory(): Promise<ErrorCode> {

        if (this.m_acceptCookie) {
            await this.m_interface.detachEvent('accept', this.m_acceptCookie!, this.m_timeout);
            delete this.m_acceptCookie;
        }
        if (this.m_unliveCookie) {
            await this.m_interface.detachEvent('unlive', this.m_unliveCookie!, this.m_timeout);
            delete this.m_unliveCookie;
        }
        return BDTERROR.success;
    }
    // BDT 相关操作
    async connect(remote: Buffer, question_size: number, known_eps: number, accept_answer: number, conn_tag: string, remote_sn?: string,): Promise<{resp:api.ConnectResp,conn?:BdtConnection}> {
        
        let action :api.LpcActionApi = {
            ConnectReq :{
                peer_name: this.peer_name,
                //LpcCommand的json里面
                question_size,
                remote_sn: [],
                //标识链接过程中需要通过sn
                known_eps: known_eps ? true : false,
                // 是否直连
                driect: true,
                //是否首次接收数据
                accept_answer: accept_answer ? true : false, 
            }
        }
        let info = await this.m_interface.callApi('sendBdtLpcCommand', remote, {
            client_name: this.client_name,
            action
        }, this.m_agentid, 0);
        this.logger.debug(`callApi connect BuckyResult result = ${JSON.stringify(info.value)}`)
        let result : api.LpcActionApi  = info.value;
        if (!result.ConnectResp || result.ConnectResp.result) {
            return {resp:result.ConnectResp!};
        }
        this.logger.info(`${this.tags} connect success ,stream name = ${result.ConnectResp.stream_name}`)
        
        let fastQAInfo: FastQAInfo = {
            connect_time: result.ConnectResp.connect_time,
            calculate_time: result.ConnectResp.calculate_time,
            send_time : 0,
            recv_time : 0,
            total_time : result.ConnectResp.total_time,
            send_hash: result.ConnectResp.send_hash,
            recv_hash: result.ConnectResp.recv_hash,
        }
        let conn = new BdtConnection({
            agentid: this.m_agentid,
            client_name: this.client_name!,
            peer_name:this.peer_name,
            stream_name: result.ConnectResp.stream_name,
            _interface: this.m_interface,
            timeout: this.m_timeout,
            conn_tag
        });
        this.m_conns.set(result.ConnectResp.stream_name, conn);
        return {resp:result.ConnectResp,conn};
    }

    async connect_mut(conn_sum:number,remote: Buffer, question_size: number, known_eps: number, accept_answer: number, conn_tag: string, remote_sn?: string,): Promise<{resp:api.ConnectMutResp}> {
        
        let action :api.LpcActionApi = {
            ConnectMutReq :{
                conn_sum,
                peer_name: this.peer_name,
                //LpcCommand的json里面
                question_size,
                remote_sn: [],
                //标识链接过程中需要通过sn
                known_eps: known_eps ? true : false,
                // 是否直连
                driect: true,
                //是否首次接收数据
                accept_answer: accept_answer ? true : false, 
            }
        }
        let info = await this.m_interface.callApi('sendBdtLpcCommand', remote, {
            client_name: this.client_name,
            action
        }, this.m_agentid, 0);
        this.logger.debug(`callApi connect BuckyResult result = ${JSON.stringify(info.value)}`)
        let result : api.LpcActionApi  = info.value;
        if (!result.ConnectMutResp || result.ConnectMutResp.result) {
            return {resp:info.value};
        }
        this.logger.info(`${this.tags} connect success ,stream name = ${JSON.stringify(result.ConnectMutResp)}`)
    
        return {resp:result.ConnectMutResp,};
    }
    async autoAccept(answer_size:number): Promise<api.ConfirmStreamEvent> {
        let action : api.LpcActionApi = {
            AutoAcceptReq : {
                peer_name: this.peer_name,
                answer_size,
            }
        }
        
        let info = await this.m_interface.callApi('createBdtLpcListener', Buffer.from(""), {
            client_name: this.client_name,
            event_type: "ConfirmStreamEvent",
            event_name: `autoAccept_${this.peerid}`,
            action,
        }, this.m_agentid, 0);
        this.logger.debug(`callApi auto_accept BuckyResult result = ${info.value.result},msg = ${info.value.msg}`)
        if (info.err) {
            this.logger.error(`${this.tags} autoAccept failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        //监听accept 
        if (this.m_acceptCookie == undefined) {
            let rnAccept = await this.m_interface.attachEvent(`autoAccept_${this.peerid}`, (err: ErrorCode, namespace: Namespace, json: string) => {
                let eventIfo: api.LpcActionApi = JSON.parse(json);
                this.logger.info(JSON.stringify(eventIfo));
                if (eventIfo.ConfirmStreamEvent) {
                    this.logger.info(`${this.tags} ${this.client_name} 触发 accept conn = ${eventIfo}`);
                    let fastQAInfo: FastQAInfo = {
                        comfirm_time: eventIfo.ConfirmStreamEvent.confirm_time,
                        file_szie : this.answer_size,
                        calculate_time: eventIfo.ConfirmStreamEvent.calculate_time,
                        send_hash: eventIfo.ConfirmStreamEvent.send_hash,
                        recv_hash: eventIfo.ConfirmStreamEvent.recv_hash,
                    }
                    let conn = new BdtConnection({ agentid: this.m_agentid,peer_name:this.peer_name, client_name: this.client_name!, stream_name: eventIfo.ConfirmStreamEvent.stream_name, _interface: this.m_interface, timeout: this.m_timeout,fastQAInfo, conn_tag: this.conn_tag})
                    this.m_conns.set(eventIfo.ConfirmStreamEvent.stream_name, conn);
                }
            }, this.m_agentid, this.m_timeout);
            this.m_acceptCookie = rnAccept.cookie!;

        }
        return info.value

    }
    async addDevice(peer: Buffer): Promise<ErrorCode> {
        let info = await this.m_interface.callApi('sendBdtLpcCommand', peer, {
            name: 'add-device',
            client_name: this.client_name,
            unique_id: this.client_name,
        }, this.m_agentid, 0);
        this.logger.debug(`callApi add-device BuckyResult result = ${info.value.result},msg = ${info.value.msg}`)
        if (info.err) {
            this.logger.error(`${this.tags} addDevice failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return info.err;
    }
}

export type FastQAInfo = {
    comfirm_time?:number,
    connect_time?: number,
    file_szie?: number,
    recv_time?: number,
    send_time?: number,
    total_time? : number,
    calculate_time?: number,
    send_hash?: string,
    recv_hash?: string,
}
export class BdtConnection extends EventEmitter {
    public local: string;
    public remote: string;
    public TempSeq: string;
    public port: string;
    public id: string;
    public conn_tag?: string;
    public fastQAInfo?: FastQAInfo;
    private m_agentid: string;
    private logger: Logger
    private m_stream_name: string;
    private m_interface: TaskClientInterface;
    public client_name: string;
    public peer_name: string; 
    private m_timeout: number;
    public state: number; // 0：未连接 ，1：已连接 ，2 已启动recv,-1 ：已经释放连接
    private m_connInfo: string;
    private tags?: string;
    get stream_name(): string {
        return this.m_stream_name!;
    }

    set stream_name(n: string) {
        this.m_stream_name = n;
    }

    constructor(options: {
        agentid: string;
        client_name: string;
        peer_name : string;
        stream_name: string;
        _interface: TaskClientInterface;
        timeout: number;
        fastQAInfo?: FastQAInfo;
        conn_tag?: string;
        tags?: string;
    }) {
        super();
        this.m_agentid = options.agentid;
        this.m_connInfo = options.stream_name;
        this.m_stream_name = options.stream_name;
        this.peer_name = options.peer_name;
        this.client_name = options.client_name;
        this.m_interface = options._interface;
        this.m_timeout = options.timeout;
        this.state = 1;
        this.local = this.m_connInfo.split(", ")[1].split(":")[1]
        this.remote = this.m_connInfo.split(", ")[2].split(":")[1]
        this.TempSeq = this.m_connInfo.split("), ")[0].split("TempSeq(")[1]
        this.port = this.m_connInfo.split(", ")[3].split(":")[1]
        this.id = this.m_connInfo.split(", ")[4].split(":")[1].split(" }}")[0]
        this.fastQAInfo = options.fastQAInfo;
        this.conn_tag = options.conn_tag;
        this.logger = this.m_interface.getLogger();
        this.tags = options.tags

    }
    async send_stream(fileSize: number): Promise<{err: ErrorCode ,result?:api.SendStreamResp}> {
        let action : api.LpcActionApi = {
            SendStreamReq : {
                peer_name: this.peer_name,
                stream_name: this.stream_name,
                size : fileSize
            }
        }
        let info = await this.m_interface.callApi('sendBdtLpcCommand', Buffer.from(""), {
            client_name: this.client_name,
            action
        }, this.m_agentid, 0);
        this.logger.debug(`callApi send BuckyResult result = ${info.value.result},msg = ${info.value.msg}`)
        let result : api.LpcActionApi  = info.value;
        this.state = -1;
        if (!result.SendStreamResp) {
            this.logger.error(`${this.tags} ${this.stream_name} shutdown failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
            return { err: ErrorCode.exception, result:result.SendStreamResp};
        }
        return { err: result.SendStreamResp!.result, result:result.SendStreamResp!};

    }


    async recv_stream():  Promise<{err: ErrorCode ,result?:api.RecvStreamResp}> {
        let action : api.LpcActionApi = {
            RecvStreamReq : {
                peer_name: this.peer_name,
                stream_name: this.stream_name,
            }
        }
        let info = await this.m_interface.callApi('sendBdtLpcCommand', Buffer.from(""), {
            client_name: this.client_name,
            action
        }, this.m_agentid, 0);
        this.logger.debug(`callApi recv BuckyResult result = ${info.value.result},msg = ${info.value.msg}`)
        let result : api.LpcActionApi  = info.value;
        this.state = -1;
        if (!result.RecvStreamResp) {
            this.logger.error(`${this.tags} ${this.stream_name} shutdown failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
            return { err: ErrorCode.exception, result:result.RecvStreamResp};
        }
        return { err: result.RecvStreamResp!.result, result:result.RecvStreamResp!};

    }
    async shutdown(shutdown_type:string): Promise<{err: ErrorCode ,result?:api.ShutdownResp}> {
        let action : api.LpcActionApi = {
            ShutdownReq : {
                peer_name: this.peer_name,
                stream_name: this.stream_name,
                shutdown_type : shutdown_type
            }
        }
        let info = await this.m_interface.callApi('sendBdtLpcCommand', Buffer.from(""),  {
            client_name: this.client_name,
            action
        }, this.m_agentid, 0);
        this.logger.debug(`callApi shutdown BuckyResult result = ${info.value.result},msg = ${info.value.msg}`)
        let result : api.LpcActionApi  = info.value;
        this.state = -1;
        if (!result.ShutdownResp) {
            this.logger.error(`${this.tags} ${this.stream_name} shutdown failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
            return { err: ErrorCode.exception, result:result.ShutdownResp};
        }
        return { err: result.ShutdownResp!.result, result:result.ShutdownResp!};

    }


    async send_object(obj_path: string, obj_type: number): Promise<{ err: ErrorCode, time?: number, hash?: string }> {
        let info = await this.m_interface.callApi('sendBdtLpcCommand', Buffer.from(""), {
            name: 'send_object',
            client_name: this.client_name,
            unique_id: this.client_name,
            stream_name: this.stream_name,
            obj_path,
            obj_type
        }, this.m_agentid, 0);
        this.logger.debug(`callApi send_object BuckyResult result = ${info.value.result},msg = ${info.value.msg}`)
        if (info.err) {
            this.logger.error(`${this.tags} ${this.stream_name} send failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return { err: info.err, time: info.value?.time, hash: info.value?.hash };
    }


    async recv_object(obj_path: string, file_name?: string): Promise<{ err: ErrorCode, size?: number, hash?: string }> {
        let info = await this.m_interface.callApi('sendBdtLpcCommand', Buffer.from(""), {
            name: 'recv_object',
            client_name: this.client_name,
            unique_id: this.client_name,
            stream_name: this.stream_name,
            file_name,
            obj_path,
        }, this.m_agentid, 0);
        this.logger.debug(`callApi recv_object BuckyResult result = ${info.value.result},msg = ${info.value.msg}`)
        if (info.err) {
            this.logger.error(`${this.tags} ${this.stream_name} recv_object failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return { err: info.err, size: info.value?.size, hash: info.value?.hash };

    }

}