import { ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, sleep, RandomGenerator } from '../../base';
import { EventEmitter } from 'events';
import { Agent, Peer, BDTERROR } from './type'
import { UtilClient } from "./bdt_util_tool"
import { request, ContentType } from "./request";
import * as path from "./path";
import * as config from "./config";
import * as api from "./action_api"
export class BdtPeerClient extends EventEmitter {
    public client_name?: string; 
    //public stack_list?: string; 
    private m_agentid: string;
    public peerid?: string;
    public device_object?: Buffer;
    private m_conns: Map<string, BdtConnection>;
    private m_interface: TaskClientInterface;
    private logger: Logger;
    public answer_size?: number;
    public question_size?: number;
    public conn_tag?: string;
    private m_timeout: number;
    private m_unliveCookie?: number;
    private m_acceptCookie?: number;
    public cache_peer_info: Peer;
    public sn_resp_eps?: string;
    public online_time?: number;
    public online_sn?: String;
    public tags: string;
    public util_client?: UtilClient;
    public state: number; // 0 : 实例化 ，1：客户端启动 2：BDT协议栈启动 -1：暂时退出 -2：执行完成销毁   -9999 异常导致退出
    public NAT?: number;
    public stack_list: Map<string, Buffer>;
    public is_set_question: boolean;
    public is_set_answer: boolean;
    on(event: 'unlive', listener: () => void): this;
    on(event: string, listener: (...args: any[]) => void): this {
        super.on(event, listener);
        return this;
    }
    once(event: 'unlive', listener: () => void): this;
    once(event: string, listener: (...args: any[]) => void): this {
        super.on(event, listener);
        return this;
    }
    constructor(_interface: TaskClientInterface, agentid: string, tags: string, peer: Peer) {
        super();
        this.m_agentid = agentid;
        this.tags = tags;
        this.m_interface = _interface;
        this.logger = _interface.getLogger();
        this.cache_peer_info = peer
        this.m_conns = new Map();
        this.state = 0;
        this.stack_list = new Map();
        this.m_timeout = 60 * 1000;
        this.is_set_question = false;
        this.is_set_answer = false;

    }


    async init(index: number = 1): Promise<{ err: number, log?: string }> {
        return new Promise(async (resolve) => {
            // 1. start bdt-tool
            if (config.RUST_LOG) {
                this.cache_peer_info!.RUST_LOG = config.RUST_LOG;
            }
            setTimeout(() => {
                if (this.state < 2) {
                    resolve({ err: BDTERROR.timeout, log: `${this.tags} start bdt-tools timeout ,state = ${this.state}` })
                }
            }, 60 * 1000)
            let start_tool = await this.m_interface.callApi('startPeerClient', Buffer.from(''), {
                RUST_LOG: this.cache_peer_info!.RUST_LOG!
            }, this.m_agentid!, 10 * 1000);
            this.logger.debug(`callApi startPeerClient BuckyResult result = ${start_tool.value.result},msg = ${start_tool.value.msg}`)
            this.state = 1;
            if (start_tool.err) {
                this.logger.error(`${this.tags} start bdt-tools failed`)
                return resolve({ err: start_tool.err, log: `${this.tags} start bdt-tools failed` })
            }

            this.logger.info(`${this.tags} start bdt-tools success client_name = ${start_tool.value.client_name}`);
            this.client_name = start_tool.value.client_name;
            this.util_client = new UtilClient(this.m_interface, this.m_agentid, this.tags, this.client_name!)

            let info1 = await this.util_client.get_cache_path();
            if (info1.err) {
                this.logger.error(`${this.tags} start bdt-tools  getCachePath failed ,err = ${info1.err}`)
                resolve({ err: start_tool.err, log: `${this.tags} start bdt-tools failed,get cahce path error` })
            }
            // 设置 desc/sec 存放路径
            let local = this.cache_peer_info!.local;
            let device_tag = this.cache_peer_info!.device_tag;
            if (!local) {
                local = this.tags;
                device_tag = this.client_name;
            }
            await sleep(2000)
            // 2. start bdt stack
            let unique_id = RandomGenerator.string(20);            
            let start_stack = await this.m_interface.callApi('sendBdtLpcCommand', Buffer.from(''), {
                client_name: this.client_name,
                action: {
                    CreateStackReq :{
                        peer_name : unique_id,
                        addrs: this.cache_peer_info!.addrInfo!,
                        bdt_port: this.cache_peer_info!.bdt_port,
                        sn: this.cache_peer_info!.sn_files,
                        active_pn: this.cache_peer_info!.active_pn_files!,
                        passive_pn: this.cache_peer_info!.passive_pn_files!,
                        local: local,
                        area : this.cache_peer_info!.area,
                        device_tag,
                        chunk_cache: this.cache_peer_info!.chunk_cache!,
                        ep_type: this.cache_peer_info!.ep_type,
                        ndn_event: this.cache_peer_info!.ndn_event,
                        ndn_event_target: this.cache_peer_info!.ndn_event_target,
                        sn_only: this.cache_peer_info.udp_sn_only,
                    }
                } 
                
            }, this.m_agentid!, 10 * 1000);
            this.logger.debug(`callApi create BuckyResult result = ${start_stack.value.result},msg = ${start_stack.value.msg}`)
            this.state = 2;
            if (start_stack.err) {
                this.logger.error(`${this.tags} start bdt stack failed,err = ${start_stack.err}`)
                resolve({ err: start_tool.err, log: `${this.tags} start bdt stack failed` })
            }
            this.logger.info(`${this.tags} start bdt client success client_name = ${start_tool.value.client_name},resp = ${JSON.stringify(start_stack.value)}`);
            this.device_object = start_stack.bytes;
            this.stack_list.set(this.client_name!, this.device_object!);
            this.online_time = start_stack.value.online_time;
            this.online_sn = start_stack.value.online_sn;
            this.sn_resp_eps = start_stack.value.ep_resp;
            this.peerid = start_stack.value.id
            //this.cache_peer_info!.local = path.join(this.util_client!.cachePath!.logPath!, start_stack.value.id)  ;
            // 3. attachEvent bdt-tool unlive
            let info = await this.m_interface.attachEvent(`unlive_${this.client_name}`, (err: ErrorCode, namespace: Namespace) => {
                this.state = -9999;
                this.logger.error(`${this.tags} maybe panic unlive_${this.client_name}`)
            }, this.m_agentid, this.m_timeout);
            this.m_unliveCookie = info.cookie;
            // 4. bdt client start autoAccept
            //this.answer_size = this.cache_peer_info.answer_size;
            if(this.cache_peer_info.listern_type == "auto_accept"){
                await this.autoAccept(this.cache_peer_info.answer_size);
            }else if (this.cache_peer_info.listern_type == "auto_response_stream"){
                //await this.auto_response_stream(this.cache_peer_info.answer_size);
            }
            
            resolve({ err: BDTERROR.success, log: `${this.tags} start bdt stack success` })
        })

    }
    async create_new_stack(local: string, device_tag: string, bdt_port: number): Promise<{ err: number, log?: string, online_time?: number, sn_resp_eps?: string, peerid?: string }> {
        // let local = path.join(this.util_client!.)
        // let device_tag =  "Device_"+RandomGenerator.string(10) 
        this.logger.info(`${this.tags} start run create_new_stack , local = ${local}  `)
        let unique_id = RandomGenerator.string(20);
        let start_stack = await this.m_interface.callApi('sendBdtLpcCommand', Buffer.from(''), {
            client_name: this.client_name,
            action: {
                CreateStackReq :{
                    peer_name : unique_id,
                    addrs: this.cache_peer_info!.addrInfo!,
                    bdt_port,
                    sn: this.cache_peer_info!.sn_files,
                    active_pn: this.cache_peer_info!.active_pn_files!,
                    passive_pn: this.cache_peer_info!.passive_pn_files!,
                    local: local,
                    area : this.cache_peer_info!.area,
                    device_tag,
                    chunk_cache: this.cache_peer_info!.chunk_cache!,
                    ep_type: this.cache_peer_info!.ep_type,
                    ndn_event: this.cache_peer_info!.ndn_event,
                    ndn_event_target: this.cache_peer_info!.ndn_event_target,
                    sn_only: this.cache_peer_info.udp_sn_only,
                }
            } 
            
        }, this.m_agentid!, 10 * 1000);
        this.logger.debug(`callApi create BuckyResult result = ${start_stack.value.result},msg = ${start_stack.value.msg}`)
        this.logger.info(`${this.tags} start run create_new_stack , result = ${start_stack}`)
        if (start_stack.err) {
            return { err: start_stack.err }
        }
        let online_time = start_stack.value.online_time;
        let sn_resp_eps = JSON.stringify({ ep: start_stack.value.ep_resp });
        let peerid = start_stack.value.id
        this.stack_list.set(unique_id, start_stack.bytes!);
        return { err: BDTERROR.success, log: `create bdt stack success`, online_time, sn_resp_eps, peerid }
    }
    async reportAgent(testcaseId: string): Promise<{ err: ErrorCode, log: string }> {
        let run_action = await request("POST", "api/bdt/client/add", {
            name: this.tags,
            testcaseId: testcaseId,
            client_name: this.client_name,
            peerid: this.peerid,
            peerInfo: JSON.stringify(this.cache_peer_info),
            sn_resp_eps: JSON.stringify(this.sn_resp_eps),
            online_time: this.online_time,
            online_sn: this.online_sn,
        }, ContentType.json)
        this.logger.info(`api/bdt/client/add resp:  ${JSON.stringify(run_action)}`)
        return { err: BDTERROR.success, log: `reportAgent to server success` }
    }
    getReportData(testcaseId: string) {
        return {
            name: this.tags,
            testcaseId: testcaseId,
            client_name: this.client_name,
            peerid: this.peerid,
            peerInfo: JSON.stringify(this.cache_peer_info),
            sn_resp_eps: JSON.stringify(this.sn_resp_eps),
            online_time: this.online_time,
            status: `${this.state}`,
        }
    }
    async restart(ndn_event?: string, ndn_event_target?: string): Promise<{ err: number, log?: string }> {
        this.cache_peer_info.ndn_event = ndn_event;
        this.cache_peer_info.ndn_event_target = ndn_event_target;
        let exit = await this.destory(-1);
        await sleep(2000)
        // 1. start bdt-tool
        let start_tool = await this.m_interface.callApi('startPeerClient', Buffer.from(''), {
            RUST_LOG: this.cache_peer_info!.RUST_LOG!
        }, this.m_agentid!, 10 * 1000);
        this.logger.debug(`callApi startPeerClient BuckyResult result = ${start_tool.value.result},msg = ${start_tool.value.msg}`)
        if (start_tool.err) {
            this.logger.error(`${this.tags} start bdt-tools failed`)
            return { err: start_tool.err, log: `${this.tags} start bdt-tools failed` }
        }
        this.state = 1;
        this.logger.info(`${this.tags} start bdt-tools success client_name = ${start_tool.value.client_name}`);
        this.client_name = start_tool.value.client_name;
        this.util_client = new UtilClient(this.m_interface, this.m_agentid, this.tags, this.client_name!)
        await sleep(2000)
        // 2. start bdt stack
        let start_stack = await this.m_interface.callApi('sendBdtLpcCommand', Buffer.from(''), {
            name: 'create',
            client_name: this.client_name,
            unique_id: this.client_name,
            addrInfo: this.cache_peer_info!.addrInfo,
            bdt_port: this.cache_peer_info!.bdt_port,
            sn_files: this.cache_peer_info!.sn_files,
            active_pn_files: this.cache_peer_info!.active_pn_files,
            passive_pn_files: this.cache_peer_info!.passive_pn_files,
            known_peer_files: this.cache_peer_info!.known_peer_files,
            local: this.cache_peer_info!.local,
            device_tag: this.cache_peer_info!.device_tag,
            chunk_cache: this.cache_peer_info!.chunk_cache,
            ep_type: this.cache_peer_info!.ep_type,
            ndn_event: this.cache_peer_info!.ndn_event,
            ndn_event_target: this.cache_peer_info!.ndn_event_target,
            sn_only: this.cache_peer_info.udp_sn_only,
            tcp_port_mapping: this.cache_peer_info.tcp_port_mapping,
        }, this.m_agentid!, 10 * 1000);
        this.logger.debug(`callApi create BuckyResult result = ${start_stack.value.result},msg = ${start_stack.value.msg}`)
        if (start_stack.err) {
            this.logger.error(`${this.tags} start bdt stack failed`)
            return { err: start_tool.err, log: `${this.tags} start bdt stack failed` }
        }
        this.logger.info(`${this.tags} start bdt client success client_name = ${start_tool.value.client_name},resp = ${JSON.stringify(start_stack.value)}`);
        this.device_object = start_stack.bytes;
        this.sn_resp_eps = start_stack.value.ep_resp;
        this.peerid = start_stack.value.id
        this.state = 2;
        // 3. attachEvent bdt-tool unlive
        let info = await this.m_interface.attachEvent(`unlive_${this.client_name}`, (err: ErrorCode, namespace: Namespace) => {
            this.state = -9999;
            this.logger.error(`${this.tags} unlive_${this.client_name}`)
        }, this.m_agentid, this.m_timeout);
        this.m_unliveCookie = info.cookie;
        // 4. bdt client start autoAccept
        await this.autoAccept();
        return { err: BDTERROR.success, log: `${this.tags} start bdt stack success` }
    }
    async getConnection(conn_tag: string): Promise<{ err: number, conn?: BdtConnection }> {

        for (let conn of this.m_conns.values()) {
            if (conn.conn_tag === conn_tag) {
                return { err: BDTERROR.success, conn }
            }
        }
        return { err: BDTERROR.NotFound }

    }

    async set_answer(answer_size: number): Promise<ErrorCode> {
        let info = await this.m_interface.callApi('sendBdtLpcCommand', Buffer.from(""), {
            name: 'set_answer',
            client_name: this.client_name,
            unique_id: this.client_name,
            answer_size,
        }, this.m_agentid, 0);
        this.logger.debug(`callApi set_answer BuckyResult result = ${info.value.result},msg = ${info.value.msg}`)
        if (info.err) {
            this.logger.error(`${this.tags} set_answer failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        } else {
            this.is_set_answer = true;
            this.answer_size = answer_size;
        }
        return info.err;
    }
    async set_question(question_size: number): Promise<ErrorCode> {
        let info = await this.m_interface.callApi('sendBdtLpcCommand', Buffer.from(""), {
            name: 'set_question',
            client_name: this.client_name,
            unique_id: this.client_name,
            question_size,
        }, this.m_agentid, 0);
        this.logger.debug(`callApi set_question BuckyResult result = ${info.value.result},msg = ${info.value.msg}`)
        if (info.err) {
            this.logger.error(`${this.tags} set_answer failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        } else {
            this.is_set_question = true;
            this.question_size = question_size;
        }
        return info.err;
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

    /**
     * 销毁节点
     * 
     * state -1  用例操作退出，可能需要获取peer 信息
     * state -2  空测试框架退出释放
     */

    async destory(state: number = -2): Promise<ErrorCode> {
        if (this.state == -2) {
            return ErrorCode.succ;
        }
        if (this.m_acceptCookie) {
            await this.m_interface.detachEvent('accept', this.m_acceptCookie!, this.m_timeout);
            delete this.m_acceptCookie;
        }
        if (this.m_unliveCookie) {
            await this.m_interface.detachEvent('unlive', this.m_unliveCookie!, this.m_timeout);
            delete this.m_unliveCookie;
        }
        let param: any = {
            client_name: this.client_name,
            unique_id: this.client_name,
        };
        // send exit bdt client will destory,not resp
        this.m_interface.callApi('sendBdtLpcCommand', Buffer.from(""), {
            client_name: this.client_name,
            unique_id: this.client_name,
            name: 'exit',
        }, this.m_agentid, 0);
        await sleep(2000)
        this.state = state
        return BDTERROR.success;
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
    async connect(remote: Buffer, question: number, known_eps: number, accept_answer: number, conn_tag: string, remote_sn?: string,): Promise<{resp:api.ConnectResp,conn?:BdtConnection}> {
        let info = await this.m_interface.callApi('sendBdtLpcCommand', remote, {
            name: 'connect',
            client_name: this.client_name,
            unique_id: this.client_name,
            question: accept_answer ? 1 : 0,
            known_eps: known_eps ? 1 : 0,
            remote_sn,
            accept_answer: accept_answer ? 1 : 0,
        }, this.m_agentid, 0);
        this.logger.debug(`callApi connect BuckyResult result = ${info.value.result},msg = ${info.value.msg}`)
        if (info.err || info.value.result) {
            this.logger.error(`${this.tags} connect failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
            return {resp:info.value};
        }
        if (!info.value || !info.value.stream_name) {
            this.m_interface.getLogger().error(`connect, service return invalid param,log = ${JSON.stringify(info.value)}`);
            return {resp:info.value};
        }
        this.logger.info(`${this.tags} connect success ,stream name = ${info.value.stream_name}`)
        let result : api.ConnectSendStreamResp  = info.value;
        let fastQAInfo: FastQAInfo = {
            connect_time: result.connect_time,
            calculate_time: result.calculate_time,
            send_time : result.send_time,
            recv_time : result.recv_time,
            total_time : result.total_time,
            send_hash: result.send_hash,
            recv_hash: result.recv_hash,
        }
        let conn = new BdtConnection({
            agentid: this.m_agentid,
            client_name: this.client_name!,
            stream_name: info.value.stream_name,
            _interface: this.m_interface,
            timeout: this.m_timeout,
            conn_tag
        });
        this.m_conns.set(info.value.stream_name, conn);
        return {resp:info.value,conn};
    }
    async autoAccept(answer_size?:number): Promise<api.ConfirmStreamEvent> {
        let info = await this.m_interface.callApi('createBdtLpcListener', Buffer.from(""), {
            name: 'auto_accept',
            client_name: this.client_name,
            unique_id: this.client_name,
            eventType: "confirm_resp",
            eventName: `autoAccept_${this.peerid}`,
            answer_size,
        }, this.m_agentid, 0);
        this.logger.debug(`callApi auto_accept BuckyResult result = ${info.value.result},msg = ${info.value.msg}`)
        if (info.err) {
            this.logger.error(`${this.tags} autoAccept failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        //监听accept 
        if (this.m_acceptCookie == undefined) {
            let rnAccept = await this.m_interface.attachEvent(`autoAccept_${this.peerid}`, (err: ErrorCode, namespace: Namespace, json: string) => {
                let eventIfo: api.ConfirmStreamEvent = JSON.parse(json);
                //this.logger.info(JSON.stringify(eventIfo));
                if (eventIfo.result == 0) {
                    this.logger.info(`${this.tags} ${this.client_name} 触发 accept conn = ${eventIfo.stream_name}`);
                    let fastQAInfo: FastQAInfo = {
                        comfirm_time: eventIfo.confirm_time,
                        file_szie : this.answer_size,
                        calculate_time: eventIfo.calculate_time,
                        send_hash: eventIfo.send_hash,
                        recv_hash: eventIfo.recv_hash,
                    }
                    let conn = new BdtConnection({ agentid: this.m_agentid, client_name: this.client_name!, stream_name: eventIfo.stream_name, _interface: this.m_interface, timeout: this.m_timeout,fastQAInfo, conn_tag: this.conn_tag})
                    this.m_conns.set(eventIfo.stream_name, conn);
                } else {
                    this.logger.error(`${this.tags} ${this.client_name} confirm 失败 `);
                }
            }, this.m_agentid, this.m_timeout);
            this.m_acceptCookie = rnAccept.cookie!;

        }
        return info.value

    }
    async uploadSystemInfo(testcaseId: string, interval: number): Promise<{ err: ErrorCode }> {
        return new Promise(async (V) => {
            setTimeout(async () => {
                V({ err: ErrorCode.timeout })
            }, 10000)
            let info = await this.m_interface.callApi('sendBdtLpcCommand', Buffer.from(""), {
                name: 'upload_system_info',
                agent_name: this.tags,
                client_name: this.client_name,
                unique_id: this.client_name,
                testcaseId,
                interval,
            }, this.m_agentid, 0);
            this.logger.debug(`callApi upload_system_info BuckyResult result = ${info.value.result},msg = ${info.value.msg}`)
            if (info.err || info.value.result) {
                this.logger.error(`${this.tags} uploadSystemInfo failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
            }
            V({ err: info.value.result })
        })

    }
}
type FastQAInfo = {
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
    private client_name: string;
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

    async close(): Promise<ErrorCode> {
        let info = await this.m_interface.callApi('sendBdtLpcCommand', Buffer.from(""), {
            name: 'close',
            client_name: this.client_name,
            unique_id: this.client_name,
            stream_name: this.stream_name,
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} ${this.stream_name} close failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        this.state = -1;
        return info.err;
    }

    async send(fileSize: number): Promise<{ err: ErrorCode, time?: number, hash?: string }> {
        let info = await this.m_interface.callApi('sendBdtLpcCommand', Buffer.from(""), {
            name: 'send',
            client_name: this.client_name,
            unique_id: this.client_name,
            stream_name: this.stream_name,
            size: fileSize,
        }, this.m_agentid, 0);
        this.logger.debug(`callApi send BuckyResult result = ${info.value.result},msg = ${info.value.msg}`)
        if (info.err || info.value.result) {
            this.logger.error(`${this.tags} ${this.stream_name} send failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
            return { err: BDTERROR.sendDataFailed, time: info.value?.time, hash: info.value?.hash };
        }
        return { err: info.err, time: info.value?.time, hash: info.value?.hash };
    }


    async recv(): Promise<{ err: ErrorCode, size?: number, hash?: string }> {
        let info = await this.m_interface.callApi('sendBdtLpcCommand', Buffer.from(""), {
            name: 'recv',
            client_name: this.client_name,
            unique_id: this.client_name,
            stream_name: this.stream_name,
        }, this.m_agentid, 0);
        this.logger.debug(`callApi recv BuckyResult result = ${info.value.result},msg = ${info.value.msg}`)
        if (info.err) {
            this.logger.error(`${this.tags} ${this.stream_name} recv failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
            return { err: BDTERROR.recvDataFailed, size: info.value?.size, hash: info.value?.hash };
        }
        return { err: info.err, size: info.value?.size, hash: info.value?.hash };

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