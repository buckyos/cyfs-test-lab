import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, sleep, RandomGenerator} from '../../base';
import {EventEmitter} from 'events';
import {Agent,Peer,BDTERROR} from './type'
import {UtilClient} from "./utilClient"
import {request,ContentType} from "./request";
import * as path from "./path";
import * as config from "./config";
export class BdtPeerClient extends EventEmitter{
    public peerName?: string; //  
    private m_agentid: string; 
    public peerid?: string;
    public device_object?: Buffer;
    private m_conns: Map<string,BdtConnection>;
    private m_interface: TaskClientInterface;
    private logger : Logger;
    public FristQA_answer?:string;
    public conn_tag?:string;
    private m_timeout : number;
    private m_unliveCookie?: number;
    private m_acceptCookie?: number;
    public cache_peer_info: Peer;
    public sn_resp_eps? : string;
    public sn_online_time?:number;
    public tags:string;
    public util_client? :UtilClient;
    public state : number; // 0 : 实例化 ，1：客户端启动 2：BDT协议栈启动 -1：暂时退出 -2：执行完成销毁  
    public NAT? : number;
    public stack_list : Map<string,Buffer>;
    public is_set_question : boolean;
    public is_set_answer : boolean;
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
    constructor(_interface: TaskClientInterface,agentid:string,tags:string,peer:Peer) {
        super();
        this.m_agentid = agentid;
        this.tags = tags;
        this.m_interface = _interface;
        this.logger = _interface.getLogger();
        this.cache_peer_info = peer
        this.m_conns = new Map();
        this.state = 0; 
        this.stack_list = new Map();
        this.m_timeout = 60*1000;
        this.is_set_question = false;
        this.is_set_answer =false;
        
    }

    
    async init(index:number=1):Promise<{err:number,log?:string}> {
        return new Promise(async(resolve)=>{
            // 1. start bdt-tool
            if(config.RUST_LOG){
                this.cache_peer_info!.RUST_LOG = config.RUST_LOG;
            }
            setTimeout(()=>{
                if(this.state<2){
                    resolve({err:BDTERROR.timeout,log:`${this.tags} start bdt-tools timeout ,state = ${this.state}`})
                }
            },60*1000)
            // 测试
            // if(this.tags == "PC_0007"){
            //     this.cache_peer_info!.addrInfo[0] = this.cache_peer_info!.addrInfo[0].replace("udp","tcp");
            //     for(let i =0;i<0;i++){
            //         this.cache_peer_info.passive_pn_files!.push("pn-miner.desc")
            //     }
            // }
            let start_tool = await this.m_interface.callApi('startPeerClient', Buffer.from(''), {
                RUST_LOG : this.cache_peer_info!.RUST_LOG!
            }, this.m_agentid!, 10*1000);
            this.state = 1;
            if(start_tool.err){
                this.logger.error(`${this.tags} start bdt-tools failed`)
                return resolve({err:start_tool.err,log:`${this.tags} start bdt-tools failed`})  
            }
            
            this.logger.info(`${this.tags} start bdt-tools success peerName = ${start_tool.value.peerName}`);
            this.peerName = start_tool.value.peerName;
            this.util_client = new UtilClient(this.m_interface,this.m_agentid,this.tags,this.peerName!)
            
            let info1 = await this.util_client.getCachePath();
            if(info1.err){
                this.logger.error(`${this.tags} start bdt-tools  getCachePath failed ,err = ${info1.err}`)
                resolve({err:start_tool.err,log:`${this.tags} start bdt-tools failed,get cahce path error`})
            }
            // 设置 desc/sec 存放路径
            let local =  this.cache_peer_info!.local;
            let device_tag = this.cache_peer_info!.device_tag;
            if(!local){
                local = this.tags; 
                device_tag = this.peerName;
            }
            await sleep(2000)
            // 2. start bdt stack
            let start_stack = await this.m_interface.callApi('sendBdtLpcCommand', Buffer.from(''), {
                name: 'create',
                peerName: this.peerName,
                unique_id : this.peerName,
                addrInfo:this.cache_peer_info!.addrInfo,
                bdt_port : this.cache_peer_info!.bdt_port,
                sn_files: this.cache_peer_info!.sn_files,
                active_pn_files: this.cache_peer_info!.active_pn_files,
                passive_pn_files:this.cache_peer_info!.passive_pn_files,
                known_peer_files:this.cache_peer_info!.known_peer_files,
                local:local,
                device_tag,
                chunk_cache:this.cache_peer_info!.chunk_cache,
                ep_type:this.cache_peer_info!.ep_type,
                ndn_event:this.cache_peer_info!.ndn_event,
                ndn_event_target:this.cache_peer_info!.ndn_event_target,
                sn_only:this.cache_peer_info.udp_sn_only,
                tcp_port_mapping: this.cache_peer_info.tcp_port_mapping,
            }, this.m_agentid!, 10*1000);
            this.state = 2;
            if(start_stack.err){
                this.logger.error(`${this.tags} start bdt stack failed,err = ${start_stack.err}`)
                resolve({err:start_tool.err,log:`${this.tags} start bdt stack failed`})
            }
            this.logger.info(`${this.tags} start bdt client success peerName = ${start_tool.value.peerName},resp = ${JSON.stringify(start_stack.value)}`);
            this.device_object = start_stack.bytes;
            this.stack_list.set(this.peerName!,this.device_object!);
            this.sn_online_time = start_stack.value.online_time;
            this.sn_resp_eps = start_stack.value.ep_resp;
            this.peerid = start_stack.value.id
            //this.cache_peer_info!.local = path.join(this.util_client!.cachePath!.logPath!, start_stack.value.id)  ;
            // 3. attachEvent bdt-tool unlive
            let info = await this.m_interface.attachEvent(`unlive_${this.peerName}`, (err: ErrorCode,namespace: Namespace) => {
                this.state = -1;
                this.logger.error(`${this.tags} unlive_${this.peerName}`)
            }, this.m_agentid, this.m_timeout);
            this.m_unliveCookie = info.cookie;
            // 4. bdt client start autoAccept
            await this.autoAccept();
            resolve({err:BDTERROR.success,log:`${this.tags} start bdt stack success`})  
        })
        
    }
    async create_new_stack(local:string,device_tag:string,bdt_port:number):Promise<{err:number,log?:string,sn_online_time?:number,sn_resp_eps?:string,peerid?:string}> {
        // let local = path.join(this.util_client!.)
        // let device_tag =  "Device_"+RandomGenerator.string(10) 
        this.logger.info(`${this.tags} start run create_new_stack , local = ${local}  `)
        let unique_id = RandomGenerator.string(20);
        let start_stack = await this.m_interface.callApi('sendBdtLpcCommand', Buffer.from(''), {
            name: 'create',
            peerName: this.peerName,
            unique_id ,
            addrInfo:this.cache_peer_info!.addrInfo,
            bdt_port : bdt_port,
            sn_files: this.cache_peer_info!.sn_files,
            active_pn_files: this.cache_peer_info!.active_pn_files,
            passive_pn_files:this.cache_peer_info!.passive_pn_files,
            known_peer_files:this.cache_peer_info!.known_peer_files,
            chunk_cache:this.cache_peer_info!.chunk_cache,
            ep_type:this.cache_peer_info!.ep_type,
            local,
            device_tag,
            ndn_event:this.cache_peer_info!.ndn_event,
            ndn_event_target:this.cache_peer_info!.ndn_event_target,
            sn_only:this.cache_peer_info.udp_sn_only,
            tcp_port_mapping: this.cache_peer_info.tcp_port_mapping,
        }, this.m_agentid!, 10*1000);
        this.logger.info(`${this.tags} start run create_new_stack , result = ${start_stack}`)
        if(start_stack.err){
            return {err : start_stack.err}
        }
        let sn_online_time = start_stack.value.online_time;
        let sn_resp_eps = JSON.stringify({ep:start_stack.value.ep_resp}) ;
        let peerid = start_stack.value.id
        this.stack_list.set(unique_id,start_stack.bytes!);
        return {err:BDTERROR.success,log:`create bdt stack success`,sn_online_time,sn_resp_eps,peerid}
    }
    async reportAgent(testcaseId:string) :Promise<{err:ErrorCode,log:string}>{
        let run_action =await request("POST","api/bdt/client/add",{
            name : this.tags,
            testcaseId : testcaseId,
            peerName : this.peerName,
            peerid : this.peerid,
            peerInfo : JSON.stringify(this.cache_peer_info),
            sn_resp_eps : JSON.stringify(this.sn_resp_eps) ,
            online_time : this.sn_online_time,
        },ContentType.json)
        this.logger.info(`api/bdt/client/add resp:  ${JSON.stringify(run_action)}`)
        return {err:BDTERROR.success,log:`reportAgent to server success`}
    }
    getReportData(testcaseId:string){
        return{
            name : this.tags,
            testcaseId : testcaseId,
            peerName : this.peerName,
            peerid : this.peerid,
            peerInfo : JSON.stringify(this.cache_peer_info),
            sn_resp_eps : JSON.stringify(this.sn_resp_eps) ,
            online_time : this.sn_online_time,
        }
    }
    async restart(ndn_event?:string,ndn_event_target?:string):Promise<{err:number,log?:string}> {
        this.cache_peer_info.ndn_event = ndn_event;
        this.cache_peer_info.ndn_event_target = ndn_event_target;
        let exit =  await this.destory(-1);
        await sleep(2000)
        // 1. start bdt-tool
        let start_tool = await this.m_interface.callApi('startPeerClient', Buffer.from(''), {
            RUST_LOG : this.cache_peer_info!.RUST_LOG!
        }, this.m_agentid!, 10*1000);
        if(start_tool.err){
            this.logger.error(`${this.tags} start bdt-tools failed`)
            return  {err:start_tool.err,log:`${this.tags} start bdt-tools failed`}
        }
        this.state = 1;
        this.logger.info(`${this.tags} start bdt-tools success peerName = ${start_tool.value.peerName}`);
        this.peerName = start_tool.value.peerName;
        this.util_client = new UtilClient(this.m_interface,this.m_agentid,this.tags,this.peerName!)
        await sleep(2000)
        // 2. start bdt stack
        let start_stack = await this.m_interface.callApi('sendBdtLpcCommand', Buffer.from(''), {
            name: 'create',
            peerName: this.peerName,
            unique_id : this.peerName,
            addrInfo:this.cache_peer_info!.addrInfo,
            bdt_port : this.cache_peer_info!.bdt_port,
            sn_files: this.cache_peer_info!.sn_files,
            active_pn_files: this.cache_peer_info!.active_pn_files,
            passive_pn_files:this.cache_peer_info!.passive_pn_files,
            known_peer_files:this.cache_peer_info!.known_peer_files,
            local:this.cache_peer_info!.local,
            device_tag : this.cache_peer_info!.device_tag,
            chunk_cache:this.cache_peer_info!.chunk_cache,
            ep_type:this.cache_peer_info!.ep_type,
            ndn_event:this.cache_peer_info!.ndn_event,
            ndn_event_target:this.cache_peer_info!.ndn_event_target,
            sn_only:this.cache_peer_info.udp_sn_only,
            tcp_port_mapping: this.cache_peer_info.tcp_port_mapping,
        }, this.m_agentid!, 10*1000);
        if(start_stack.err){
            this.logger.error(`${this.tags} start bdt stack failed`)
            return  {err:start_tool.err,log:`${this.tags} start bdt stack failed`}
        }
        this.logger.info(`${this.tags} start bdt client success peerName = ${start_tool.value.peerName},resp = ${JSON.stringify(start_stack.value)}`);
        this.device_object = start_stack.bytes;
        this.sn_resp_eps = start_stack.value.ep_resp;
        this.peerid = start_stack.value.id
        this.state = 2;
        // 3. attachEvent bdt-tool unlive
        let info = await this.m_interface.attachEvent(`unlive_${this.peerName}`, (err: ErrorCode,namespace: Namespace) => {
            this.state = -1;
            this.logger.error(`${this.tags} unlive_${this.peerName}`)
        }, this.m_agentid, this.m_timeout);
        this.m_unliveCookie = info.cookie;
        // 4. bdt client start autoAccept
        await this.autoAccept();
        return  {err:BDTERROR.success,log:`${this.tags} start bdt stack success`}
    }
    async getConnection(conn_tag:string):Promise<{err:number,conn?:BdtConnection}>{

        for(let conn of this.m_conns.values()){
            if(conn.conn_tag === conn_tag){
                return {err:BDTERROR.success,conn}
            }
        }
        return {err:BDTERROR.NotFound}

    }

    async connect(remote: Buffer, question: number, known_eps: number,accept_answer: number, conn_tag:string, remote_sn?: string,): Promise<{err: ErrorCode, time?: number, conn?: BdtConnection,answer?:string,read_time?:number}> {
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  remote, {
            name: 'connect',
            peerName: this.peerName,
            unique_id : this.peerName,
            question:accept_answer?1:0,
            known_eps: known_eps?1:0,
            remote_sn,
            accept_answer : accept_answer?1:0,
        }, this.m_agentid, 0);
        if (info.err || info.value.result) {
            this.logger.error(`${this.tags} connect failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
            return {err: BDTERROR.connnetFailed};
        }
        if (!info.value || !info.value.stream_name) {
            this.m_interface.getLogger().error(`connect, service return invalid param,log = ${JSON.stringify(info.value)}`);
            return {err: ErrorCode.invalidParam};
        }
        this.logger.info(`${this.tags} connect success ,stream name = ${info.value.stream_name}`)
        let conn = new BdtConnection({
            agentid: this.m_agentid,
            peerName: this.peerName!,
            stream_name: info.value.stream_name, 
            _interface: this.m_interface,
            timeout: this.m_timeout,
            conn_tag
        });
        this.m_conns.set(info.value.stream_name,conn);
        return {err: ErrorCode.succ, time: info.value.time, read_time:info.value.read_time,conn,answer:info.value.answer};
    }
    async connectList(remote_desc_list: Array<{device_path:string}>, question: string, known_eps: number,accept_answer: number, conn_tag:string, remote_sn?: string,): Promise<{err: ErrorCode,records?:string}> {
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  Buffer.from(""), {
            name: 'connect-list',
            remote_desc_list,
            peerName: this.peerName,
            unique_id : this.peerName,
            question,
            known_eps: known_eps?1:0,
            remote_sn,
            accept_answer : accept_answer?1:0,
        }, this.m_agentid, 0);
        if (info.err || info.value.result) {
            this.logger.error(`${this.tags} connect failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
            return {err: BDTERROR.connnetFailed};
        }
        if (!info.value || !info.value.stream_name) {
            this.m_interface.getLogger().error(`connect, service return invalid param,log = ${JSON.stringify(info.value)}`);
            return {err: ErrorCode.invalidParam};
        }
        this.logger.info(`${this.tags} connect success ,stream name = ${info.value.records}`)

        return {err: ErrorCode.succ,records:info.value.records};
    }
    async set_answer(answer: string): Promise<ErrorCode> {
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  Buffer.from(answer), {
            name: 'set_answer',
            peerName: this.peerName,
            unique_id : this.peerName,
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} set_answer failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        } else{
            this.is_set_answer = true;
        }
        return info.err;
    }
    async set_question(question: string): Promise<ErrorCode> {
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  Buffer.from(question), {
            name: 'set_question',
            peerName: this.peerName,
            unique_id : this.peerName,
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} set_answer failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }else{
            this.is_set_question = true;
        }
        return info.err;
    }
    async autoAccept(): Promise<ErrorCode> {
        let info = await this.m_interface.callApi('createBdtLpcListener',  Buffer.from(""), {
            name: 'auto_accept',
            peerName: this.peerName,
            unique_id : this.peerName,
            answer : this.cache_peer_info.FristQA_answer,
            eventType : "confirm_resp",
            eventName : `autoAccept_${this.peerid}`
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} autoAccept failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        //监听accept 
        if(this.m_acceptCookie==undefined){
            let rnAccept = await this.m_interface.attachEvent(`autoAccept_${this.peerid}`, (err: ErrorCode,namespace: Namespace, json:string) => {
                let eventIfo = JSON.parse(json);
                if(eventIfo.result == 0){
                    this.logger.info(`${this.tags} ${this.peerName} 触发 accept conn = ${eventIfo.stream_name}`);
                    let conn = new BdtConnection({agentid:this.m_agentid,peerName:this.peerName!,stream_name:eventIfo.stream_name,_interface:this.m_interface ,timeout:this.m_timeout,question:eventIfo.question,conn_tag:this.conn_tag,confirm_time:eventIfo.confirm_time})         
                    this.m_conns.set(eventIfo.stream_name,conn);
                }else {
                    this.logger.error(`${this.tags} ${this.peerName} confirm 失败 `);
                }
            }, this.m_agentid, this.m_timeout);
            this.m_acceptCookie = rnAccept.cookie!;
            return info.err;
        }else{
            return ErrorCode.succ
        }
        
    }
    async remark_accpet_conn_name(TempSeq:string,remote:string,conn_tag?:string):Promise<{err:number,conn?:BdtConnection}>{
        for(let conn of this.m_conns.values()){
            if(conn.TempSeq == TempSeq && conn.remote == remote && !conn.conn_tag){
                conn.conn_tag = conn_tag;
                return {err:BDTERROR.success,conn}
            }
        }       
        return {err:BDTERROR.RNCheckConnFailed}
    }

    /**
     * 销毁节点
     * 
     * state -1  用例操作退出，可能需要获取peer 信息
     * state -2  空测试框架退出释放
     */

    async destory(state:number=-2): Promise<ErrorCode> {
        if(this.state == -2){
            return ErrorCode.succ;
        }
        if(this.m_acceptCookie){
            await this.m_interface.detachEvent('accept', this.m_acceptCookie!, this.m_timeout);
            delete this.m_acceptCookie;
        }
        if (this.m_unliveCookie) {
            await this.m_interface.detachEvent('unlive', this.m_unliveCookie!, this.m_timeout);
            delete this.m_unliveCookie;
        }
        let param: any = {
            peerName: this.peerName,
            unique_id : this.peerName,
        };
        // send exit bdt client will destory,not resp
        this.m_interface.callApi('sendBdtLpcCommand',  Buffer.from(""), {
            peerName: this.peerName,
            unique_id : this.peerName,
            name: 'exit',
        }, this.m_agentid, 0);
        await sleep(2000)
        this.state = state
        return BDTERROR.success;
    }

    async addDevice(peer: Buffer): Promise<ErrorCode> {
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  peer, {
            name: 'add-device', 
            peerName: this.peerName,
            unique_id : this.peerName,
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} addDevice failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return info.err;
    }
    async calculateChunk(path:string,chunk_size:number): Promise<{err: ErrorCode, calculate_time?: number, chunk_id?: string}>{
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  Buffer.from(""), {
            name: 'calculate-chunk',
            peerName: this.peerName,
            unique_id : this.peerName,
            chunk_size,
            path,
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} calculateChunk failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return {err: info.err,calculate_time: info.value?.calculate_time,chunk_id: info.value?.chunk_id};
    }
    async setChunk(path:string,chunk_id: string,chunk_size:number): Promise<{err: ErrorCode, set_time?: number, chunk_id?: string}>{
        let info = await this.m_interface.callApi('sendBdtLpcCommand', Buffer.from(""), {
            name: 'set-chunk',
            peerName: this.peerName,
            unique_id : this.peerName,
            path,
            chunk_id,
            chunk_size,
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} setChunk failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
            return {err: info.err,set_time: info.value?.set_time,chunk_id: info.value?.chunk_id};
        }
        let check =await this.checkChunk(info.value!.chunk_id)
        if(check.err){
            this.logger.error(`${this.tags} setChunk failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
            return {err: check.err,set_time: info.value?.set_time,chunk_id: info.value?.chunk_id};
        }
        return {err: info.err,set_time: info.value?.set_time,chunk_id: info.value?.chunk_id};
    }
    async trackChunk(path:string,chunk_size:number): Promise<{err: ErrorCode, set_time?: number, calculate_time?: number, chunk_id?: string}>{
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  Buffer.from(""), {
            name: 'track-chunk',
            peerName: this.peerName,
            unique_id : this.peerName,
            chunk_size,
            path,
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} uploadFile failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return {err: info.err,set_time: info.value?.set_time,chunk_id: info.value?.chunk_id,calculate_time: info.value?.calculate_time};
    }
    async interestChunk(remote:Buffer ,chunk_id:string): Promise<{err: ErrorCode}>{
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  remote, {
            name: 'interest-chunk',
            peerName: this.peerName,
            unique_id : this.peerName,
            chunk_id,
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} interestChunk failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return {err: info.err};
    }
    async checkChunk(chunk_id:string): Promise<{err: ErrorCode,state?:string}>{
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  Buffer.from(""), {
            name: 'check-chunk',
            peerName: this.peerName,
            unique_id : this.peerName,
            chunk_id,
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} checkChunk failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return {err: info.err,state:info.value?.state};
    }
    async checkChunkListener(chunk_id:string,interval:number,timeout:number): Promise<{err: ErrorCode,state?:string,time?:number}>{
        let begin = Date.now();
        let await_interval = 200;
        while(Date.now() - timeout < begin){
            let check = await this.checkChunk(chunk_id);
            if( !check.state || !check.state.includes("Pending")){
                let time = Date.now() - begin;
                return {err:check.err,state:check.state,time:time*1000}
            }
            if(await_interval<interval){
                await sleep(await_interval);
                await_interval = await_interval * 2;
            }else{
                await sleep(interval);
            }
        }
        return {err: BDTERROR.timeout};
    }
    async interestChunkList(remote:Buffer ,task_name:string,chunk_list: Array<{chunk_id:string}>): Promise<{err: ErrorCode,session?:string}>{
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  remote, {
            name: 'interest-chunk-list',
            peerName: this.peerName,
            unique_id : this.peerName,
            task_name,
            chunk_list,
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} interestChunkList failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return {err: info.err,session:info.value.session};
    }
    
    async checkChunkList(session:string): Promise<{err: ErrorCode,state?:string}>{
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  Buffer.from(""), {
            name: 'check-chunk-list',
            peerName: this.peerName,
            unique_id : this.peerName,
            session,
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} checkChunkList failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return {err: info.err,state:info.value?.state};
    }
    async checkChunkListListener(session:string,interval:number,timeout:number): Promise<{err: ErrorCode,state?:string,time?:number}>{
        let begin = Date.now();
        let await_interval = 200;
        while(Date.now() - timeout < begin){
            let check = await this.checkChunkList(session);
            if( !check.state  || (!check.state.includes("Downloading") && !check.state.includes("OnAir"))){
                let time = Date.now() - begin;
                if(check.state!.includes("Finished")){
                    return {err:BDTERROR.success,state:check.state,time:time*1000}
                }
                return {err:BDTERROR.interestChunkFailed,state:check.state,time:time*1000}
            }
            if(await_interval<interval){
                await sleep(await_interval);
                await_interval = await_interval * 2;
            }else{
                await sleep(interval);
            }
        }
        return {err: BDTERROR.timeout};
    }
    async sendFile(path:string,chunk_size:number): Promise<{err: ErrorCode, calculate_time?: number,set_time?: number, file?: Buffer,ObjectId?:string}>{
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  Buffer.from(""), {
            name: 'start-send-file',
            peerName: this.peerName,
            unique_id : this.peerName,
            chunk_size,
            path,
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} sendFile failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return {err: info.err,calculate_time: info.value?.calculate_time,set_time:info.value?.set_time ,file: info.bytes,ObjectId:info.value?.ObjectId};
    }
    async calculateFile(path:string,chunk_size:number): Promise<{err: ErrorCode, calculate_time?: number, file?: Buffer,ObjectId?:string}>{
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  Buffer.from(""), {
            name: 'calculate-file',
            peerName: this.peerName,
            unique_id : this.peerName,
            chunk_size,
            path,
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} calculateFile failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return {err: info.err,calculate_time: info.value?.calculate_time,file: info.bytes,ObjectId:info.value?.ObjectId};
    }
    async setFile(path:string,file:Buffer): Promise<{err: ErrorCode, set_time?: number, file?: Buffer,ObjectId?:string}>{
        let info = await this.m_interface.callApi('sendBdtLpcCommand', file, {
            name: 'set-file',
            peerName: this.peerName,
            unique_id : this.peerName,
            path,
            dir_object_path:this.util_client!.cachePath!.NamedObject
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} setFile failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return {err: info.err,set_time: info.value?.set_time,file:info.bytes,ObjectId:info.value?.ObjectId};
    }
    async downloadFile(file:Buffer ,save_path:string,peer_id:string,second_peer_id?:string): Promise<{err: ErrorCode, file?: Buffer,session?:string}>{
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  file, {
            name: 'start-download-file',
            peerName: this.peerName,
            unique_id : this.peerName,
            remotes:[peer_id],
            path:save_path,
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} downloadFile failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return {err: info.err,file:info.bytes,session:info.value?.session};
    }
    async downloadFileRange(file:Buffer ,save_path:string,peer_id:string,ranges:Array<{begin:number,end:number}> ,second_peer_id?:string): Promise<{err: ErrorCode, file?: Buffer,session?:string}>{
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  file, {
            name: 'start-download-file-range',
            peerName: this.peerName,
            unique_id : this.peerName,
            peer_id,
            ranges,
            path:save_path,
            second_peer_id
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} downloadFile failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return {err: info.err,file:info.bytes,session:info.value?.session};
    }
    async downloadTaskState(session:string): Promise<{err: ErrorCode,state?:string}>{
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  Buffer.from(""), {
            name: 'download-file-state',
            peerName: this.peerName,
            unique_id : this.peerName,
            session,
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} downloadFileState failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return {err: info.err,state:info.value?.state};
    }
    async downloadTaskListener(session:string,interval:number,timeout:number): Promise<{err: ErrorCode,state?:string,time?:number,record?:Array<{time:number,speed:string,progress:string}>}>{
        let begin = Date.now();
        let record:Array<{time:number,speed:string,progress:string}> = [{time:Date.now(),speed:"0",progress:"0"}];
        while(Date.now() - timeout < begin){
            let check = await this.downloadTaskState(session);
            let await_interval = 200;
            if( !check.state || (!check.state.includes("Downloading") && !check.state.includes("OnAir"))){
                let time = Date.now() - begin;
                if(check.state!.includes("Finished")){
                    return {err:BDTERROR.success,state:check.state,record,time:time*1000}
                }
                return {err:BDTERROR.sendDataFailed,state:check.state,record,time:time*1000}
            }
            record.push({
                time: Date.now(),
                speed : check.state!.split("(")[1].split(")")[0].split(",")[0],
                progress:check.state!.split("(")[1].split(")")[0].split(",")[1]
            })
            if(await_interval<interval){
                await sleep(await_interval);
                await_interval = await_interval * 2;
            }else{
                await sleep(interval);
            }
        }
        return {err: BDTERROR.timeout};
    }
    async setDir(path:string,object_path:string,chunk_size:number): Promise<{err: ErrorCode,dir_object_path?:string,session?:string,dir_id?:string,dir_map?:Array<{name:string,file_id:string}>}>{
        let info = await this.m_interface.callApi('sendBdtLpcCommand', Buffer.from(""), {
            name: 'start-send-dir',
            peerName: this.peerName,
            unique_id : this.peerName,
            path,
            chunk_size,
            dir_object_path : object_path
        }, this.m_agentid, 0);
        if (info.err || info.value.result) {
            this.logger.error(`${this.tags} setFile failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
            return {err: info.value.result}
        }
        let dir_object_path = info.value.dir_object_path;
        let session = info.value.session;
        let dir_id = info.value.dir_id;
        let dir_map = info.value.dir_map;

        return {err: info.err,dir_object_path,session,dir_id,dir_map};
    }
    async downloadDir(save_path:string,dir_name:string,peer_id:string,object_path:string,dir_id:string,dir_map:Array<{name:string,file_id:string}>,second_peer_id?:string): Promise<{err: ErrorCode, file?: Buffer,session?:string}>{
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  Buffer.from(""), {
            name: 'start-download-dir',
            peerName: this.peerName,
            unique_id : this.peerName,
            peer_id,
            path:save_path,
            dir_name,
            dir_object_path : object_path,
            dir_id,
            dir_map,
            second_peer_id
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} downloadFile failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return {err: info.err,file:info.bytes,session:info.value?.session};
    }
    async downloadDirTaskState(session:string): Promise<{err: ErrorCode,state?:string}>{
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  Buffer.from(""), {
            name: 'download-dir-state',
            peerName: this.peerName,
            unique_id : this.peerName,
            session,
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} downloadDirTaskState failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return {err: info.err,state:info.value?.state};
    }
    async downloadDirTaskListener(session:string,interval:number,timeout:number): Promise<{err: ErrorCode,state?:string,time?:number,record?:Array<{time:number,speed:string,progress:string}>}>{
        let begin = Date.now();
        let record:Array<{time:number,speed:string,progress:string}> = [{time:Date.now(),speed:"0",progress:"0"}];
        let await_interval = 200;
        while(Date.now() - timeout < begin){
            let check = await this.downloadDirTaskState(session);
            if( !check.state  || (!check.state.includes("Downloading") && !check.state.includes("OnAir"))){
                let time = Date.now() - begin;
                if(check.state!.includes("Finished")){
                    return {err:BDTERROR.success,state:check.state,record,time:time*1000}
                }
                return {err:BDTERROR.sendDataFailed,state:check.state,record,time:time*1000}
            }
            record.push({
                time: Date.now(),
                speed : check.state!.split("(")[1].split(")")[0].split(",")[0],
                progress:check.state!.split("(")[1].split(")")[0].split(",")[1]
            })
            if(await_interval<interval){
                await sleep(await_interval);
                await_interval = await_interval * 2;
            }else{
                await sleep(interval);
            }
            
        }
        return {err: BDTERROR.timeout};
    }
    async uploadFile(path:string,chunk_size:number): Promise<{err: ErrorCode, set_time?: number, calculate_time?: number, file?: Buffer,ObjectId?:string}>{
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  Buffer.from(""), {
            name: 'start-send-file',
            peerName: this.peerName,
            unique_id : this.peerName,
            chunk_size,
            path,
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} uploadFile failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return {err: info.err,set_time: info.value?.set_time,file:info.bytes,ObjectId:info.value?.ObjectId,calculate_time: info.value?.calculate_time};
    }
    async uploadSystemInfo(testcaseId:string,interval:number): Promise<{err: ErrorCode}>{
        return new Promise(async (V)=>{
            setTimeout(async()=>{
                V({err:ErrorCode.timeout}) 
            },10000)
            let info = await this.m_interface.callApi('sendBdtLpcCommand',  Buffer.from(""), {
                name: 'upload_system_info',
                agent_name : this.tags,
                peerName: this.peerName,
            unique_id : this.peerName,
                testcaseId,
                interval,
            }, this.m_agentid, 0);
            if (info.err || info.value.result) {
                this.logger.error(`${this.tags} uploadSystemInfo failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
            }
            V({err:info.value.result}) 
        })
        
    }
}
export class BdtConnection extends EventEmitter {
    public local:string;
    public remote:string;
    public TempSeq:string;
    public port : string;
    public id : string;
    public conn_tag? :string;
    public question? : string;
    public confirm_time? : number;
    private m_agentid: string;
    private logger : Logger
    private m_stream_name: string;
    private m_interface: TaskClientInterface;
    private peerName: string; 
    private m_timeout: number;
    public state : number; // 0：未连接 ，1：已连接 ，2 已启动recv,-1 ：已经释放连接
    private m_connInfo:string;
    private tags? : string;
    get stream_name(): string {
        return this.m_stream_name!;
    }

    set stream_name(n: string) {
        this.m_stream_name = n;
    }

    constructor(options: {
        agentid: string;
        peerName: string;
        stream_name: string; 
        _interface: TaskClientInterface;
        timeout: number;
        question?:string;
        conn_tag?:string;
        tags?:string;
        confirm_time?:number;
    }) {
        super();
        this.m_agentid = options.agentid;
        this.m_connInfo = options.stream_name;
        this.m_stream_name = options.stream_name;
        this.peerName = options.peerName;
        this.m_interface = options._interface;
        this.m_timeout = options.timeout;
        this.confirm_time = options.confirm_time;
        this.state = 1;
        this.local =  this.m_connInfo.split(", ")[1].split(":")[1]
        this.remote =  this.m_connInfo.split(", ")[2].split(":")[1]
        this.TempSeq = this.m_connInfo.split("), ")[0].split("TempSeq(")[1]
        this.port = this.m_connInfo.split(", ")[3].split(":")[1]
        this.id = this.m_connInfo.split(", ")[4].split(":")[1].split(" }}")[0]   
        this.question = options.question;
        this.conn_tag = options.conn_tag;
        this.logger = this.m_interface.getLogger();
        this.tags = options.tags
        
    }
    
    async close(): Promise<ErrorCode> {
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  Buffer.from(""), {
            name: 'close', 
            peerName: this.peerName,
            unique_id : this.peerName,
            stream_name: this.stream_name,
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} ${this.stream_name} close failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        this.state = -1;
        return info.err;
    }

    async send(fileSize: number): Promise<{err: ErrorCode, time?: number, hash?: string}> {
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  Buffer.from(""), {
            name: 'send',
            peerName: this.peerName,
            unique_id : this.peerName,
            stream_name: this.stream_name,
            size: fileSize,
        }, this.m_agentid, 0);
        if (info.err || info.value.result) {
            this.logger.error(`${this.tags} ${this.stream_name} send failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
            return {err: BDTERROR.sendDataFailed,time: info.value?.time,hash:  info.value?.hash};
        }
        return {err: info.err,time: info.value?.time,hash:  info.value?.hash};
    }
    

    async recv(): Promise<{err: ErrorCode, size?: number, hash?: string}> {
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  Buffer.from(""), {
            name: 'recv',
            peerName: this.peerName,
            unique_id : this.peerName,
            stream_name: this.stream_name,
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} ${this.stream_name} recv failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
            return {err: BDTERROR.recvDataFailed,size: info.value?.size,hash:  info.value?.hash};
        }
        return {err: info.err,size: info.value?.size,hash:  info.value?.hash};
        
    } 
    async send_object(obj_path: string,obj_type:number): Promise<{err: ErrorCode, time?: number, hash?: string}> {
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  Buffer.from(""), {
            name: 'send_object',
            peerName: this.peerName,
            unique_id : this.peerName,
            stream_name: this.stream_name,
            obj_path,
            obj_type
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} ${this.stream_name} send failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return {err: info.err,time: info.value?.time,hash:  info.value?.hash};
    }
    

    async recv_object(obj_path:string,file_name?:string): Promise<{err: ErrorCode, size?: number, hash?: string}> {
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  Buffer.from(""), {
            name: 'recv_object',
            peerName: this.peerName,
            unique_id : this.peerName,
            stream_name: this.stream_name,
            file_name,
            obj_path,
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} ${this.stream_name} recv_object failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return {err: info.err,size: info.value?.size,hash:  info.value?.hash};
        
    }  
}