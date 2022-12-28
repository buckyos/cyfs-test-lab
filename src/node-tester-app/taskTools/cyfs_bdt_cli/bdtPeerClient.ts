import { ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, sleep, RandomGenerator } from '../../base';
import { EventEmitter } from 'events';
import { Agent, Peer, BDTERROR } from './type'
import { UtilClient } from "./utilClient"
import { request, ContentType } from "./request";
import * as path from "./path";
import * as config from "./config";
import * as api from "./action_api"
import {BdtConnection,BdtStack,FastQAInfo} from "./bdt_stack"
import {TcpStack,TcpStream} from "./tcp_stack"

export class BdtPeerClient extends EventEmitter {
    public client_name?: string;  // 客户端名称
    private m_agentid: string; // 测试框架 id
    private m_interface: TaskClientInterface;
    private m_timeout: number;
    private m_unliveCookie?: number;
    private m_acceptCookie?: number;
    private logger: Logger;
    public port : number;
    public bdt_port_range : number;
    // 协议栈列表
    public stack_num : number;
    public stack_list: Map<string, BdtStack>;
    public tcp_server: Map<string, TcpStack>;
    public tags: string;
    public cache_peer_info: Peer;
    public util_client?: UtilClient; // 工具类
    public state: number; // 0 : 实例化 ，1：客户端启动 2：BDT协议栈启动 -1：暂时退出 -2：执行完成销毁   -9999 异常导致退出
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
        this.state = 0;
        this.stack_num = 0;
        this.stack_list = new Map();
        this.tcp_server = new Map();
        this.m_timeout = 60 * 1000;
        this.port = peer.client_port!;
        this.bdt_port_range = peer.bdt_port_range!;
        this.client_name = `${tags}_${this.port}`;
    }


    async init(index: number = 1): Promise<{ err: number, log?: string }> {
        return new Promise(async (resolve) => {
            // 1. 连接或启动bdt 测试客户端
            if (config.RUST_LOG) {
                this.cache_peer_info!.RUST_LOG = config.RUST_LOG;
            }
            setTimeout(() => {
                if (this.state < 2) {
                    resolve({ err: BDTERROR.timeout, log: `${this.tags} start bdt-tools timeout ,state = ${this.state}` })
                }
            }, 60 * 1000)
            let start_tool = await this.m_interface.callApi('startPeerClient', Buffer.from(''), {
                RUST_LOG: this.cache_peer_info!.RUST_LOG!,
                client_name : this.client_name,
                port : this.port,
                kill_server : true,
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

            let info1 = await this.util_client.getCachePath();
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
            // 2. 实例化一个bdt 协议栈
            let peer_name = `${this.client_name}_${this.stack_num}`;            
            let start_stack = await this.m_interface.callApi('sendBdtLpcCommand', Buffer.from(''), {
                client_name: this.client_name,
                action: {
                    CreateStackReq :{
                        peer_name : peer_name,
                        addrs: this.cache_peer_info!.addrInfo!,
                        bdt_port: this.bdt_port_range,
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
            this.bdt_port_range = this.bdt_port_range + 10;
            if (start_stack.err) {
                this.logger.error(`${this.tags} start bdt stack failed,err = ${start_stack.err}`)
                resolve({ err: start_tool.err, log: `${this.tags} start bdt stack failed` })
            }
            let result : api.LpcActionApi = start_stack.value;
            
            if(!result.CreateStackResp){
                this.logger.error(`${this.tags} start bdt stack response error data ${result}`)
                resolve({ err: start_tool.err, log: `${this.tags} start bdt stack failed` })
            }
            let device =  start_stack.bytes!;
            this.logger.info(`${this.tags} start bdt client success client_name = ${this.client_name},resp = ${JSON.stringify(start_stack.value)}`);
            let bdt_stack = new BdtStack(this.m_interface,this.m_agentid,this.tags,this.cache_peer_info,result.CreateStackResp!,this.client_name!,device)
            this.stack_list.set(`${this.stack_num}`,bdt_stack)
            this.stack_num = this.stack_num + 1;
            let autoAccept = await bdt_stack.autoAccept(this.cache_peer_info.answer_size);
            resolve({ err: BDTERROR.success, log: `${this.tags} start bdt stack success` })
        })

    }
    
    async create_tcp_server(address:string,port:number=22223):Promise<{tcp_stack:TcpStack,result:api.CreateTcpServerResp}>{
        let tcp_stack = new TcpStack(this.m_interface,this.m_agentid,this.tags,this.client_name!);
        let result = await tcp_stack.create_tcp_server(address,port);
        if(result.result==0){
            this.tcp_server.set(port.toString(),tcp_stack)
        }
        return {tcp_stack,result}
        
    }


    async reportAgent(testcaseId: string): Promise<{ err: ErrorCode, log: string }> {
        // let run_action = await request("POST", "api/bdt/client/add", {
        //     name: this.tags,
        //     testcaseId: testcaseId,
        //     client_name: this.client_name,
        //     peerid: this.peerid,
        //     peerInfo: JSON.stringify(this.cache_peer_info),
        //     sn_resp_eps: JSON.stringify(this.sn_resp_eps),
        //     online_time: this.online_time,
        //     online_sn: this.online_sn,
        // }, ContentType.json)
        // this.logger.info(`api/bdt/client/add resp:  ${JSON.stringify(run_action)}`)
        return { err: BDTERROR.success, log: `reportAgent to server success` }
    }
    getReportData(testcaseId: string) {
        return {
            name: this.tags,
            testcaseId: testcaseId,
            client_name: this.client_name,
            //peerid: this.peerid,
            peerInfo: JSON.stringify(this.cache_peer_info),
            //sn_resp_eps: JSON.stringify(this.sn_resp_eps),
            //online_time: this.online_time,
            status: `${this.state}`,
        }
    }

    async destory(state: number = -2): Promise<ErrorCode> {
        if (this.state == -2) {
            return ErrorCode.succ;
        }
        if (this.m_unliveCookie) {
            await this.m_interface.detachEvent('unlive', this.m_unliveCookie!, this.m_timeout);
            delete this.m_unliveCookie;
        }
        for(let bdt_stack of this.stack_list.values()){
            bdt_stack.destory();
        }
     
        let action : api.LpcActionApi = {
            Exit :{    
            }
        }
        this.m_interface.callApi('sendBdtLpcCommand', Buffer.from(""), {
            client_name: this.client_name,
            action,
        }, this.m_agentid, 0);
        await sleep(2000)
        this.state = state
        return BDTERROR.success;
    }
    async uploadSystemInfo(testcase_id: string, interval: number): Promise<{ err: ErrorCode }> {
        return new Promise(async (V) => {
            setTimeout(async () => {
                V({ err: ErrorCode.timeout })
            }, 10000)
            let action : api.LpcActionApi = {
                
                UploadSystemInfoReq :{
                    agent_name: this.tags,
                    testcase_id,
                    interval,
                }
            }
            let info = await this.m_interface.callApi('sendBdtLpcCommand', Buffer.from(""),{client_name : this.client_name,action}, this.m_agentid, 0);
            this.logger.debug(`callApi upload_system_info BuckyResult result = ${info.value}`)
            if (info.err || info.value.result) {
                this.logger.error(`${this.tags} uploadSystemInfo failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
            }
            V({ err: info.value.result })
        })

    }
}
