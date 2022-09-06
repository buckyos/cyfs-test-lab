import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, sleep, RandomGenerator} from '../../base';
import {EventEmitter} from 'events';
import {Agent,Peer,BDTERROR} from './type'
import {UtilClient} from "./utilClient"
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
    public tags:string;
    public util_client? :UtilClient;
    public state : number;
    public NAT? : number;
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
        this.m_conns = new Map;
        this.state = 0;
        this.m_timeout = 60*1000;
        
    }

    
    async init():Promise<{err:number,log?:string}> {
        // 1. start bdt-tool
        let start_tool = await this.m_interface.callApi('startPeerClient', Buffer.from(''), {
            RUST_LOG : this.cache_peer_info!.RUST_LOG!
        }, this.m_agentid!, 10*1000);
        if(start_tool.err){
            this.logger.error(`${this.tags} start bdt-tools failed`)
            return  {err:start_tool.err,log:`${this.tags} start bdt-tools failed`}
        }
        this.logger.info(`${this.tags} start bdt-tools success peerName = ${start_tool.value.peerName}`);
        this.peerName = start_tool.value.peerName;
        this.util_client = new UtilClient(this.m_interface,this.m_agentid,this.tags,this.peerName!)
        await sleep(2000)
        // 2. start bdt stack
        let start_stack = await this.m_interface.callApi('sendBdtLpcCommand', Buffer.from(''), {
            name: 'create',
            peerName:this.peerName,
            addrInfo:this.cache_peer_info!.addrInfo,
            sn_files: this.cache_peer_info!.sn_files,
            active_pn_files: this.cache_peer_info!.active_pn_files,
            passive_pn_files:this.cache_peer_info!.passive_pn_files,
            known_peer_files:this.cache_peer_info!.known_peer_files,
            local:this.cache_peer_info!.local,
            chunk_cache:this.cache_peer_info!.chunk_cache,
            ep_type:this.cache_peer_info!.ep_type,
            ndn_event:this.cache_peer_info!.ndn_event,
            ndn_event_target:this.cache_peer_info!.ndn_event_target,
        }, this.m_agentid!, 10*1000);
        if(start_stack.err){
            this.logger.error(`${this.tags} start bdt stack failed`)
            return  {err:start_tool.err,log:`${this.tags} start bdt stack failed`}
        }
        this.logger.info(`${this.tags} start bdt client success peerName = ${start_tool.value.peerName},resp = ${JSON.stringify(start_stack.value)}`);
        this.device_object = start_stack.bytes;
        this.sn_resp_eps = start_stack.value.ep_resp;
        this.peerid = start_stack.value.id
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
    
    async getConnecion(conn_tag:string):Promise<{err:number,conn?:BdtConnection}>{

        for(let conn of this.m_conns.values()){
            if(conn.conn_tag === conn_tag){
                return {err:BDTERROR.success,conn}
            }
        }
        return {err:BDTERROR.NotFound}

    }

    async connect(remote: Buffer, question: string, known_eps: number,accept_answer: number, conn_tag:string, remote_sn?: string,): Promise<{err: ErrorCode, time?: number, conn?: BdtConnection,answer?:string}> {
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  remote, {
            name: 'connect',
            peerName: this.peerName,
            question,
            known_eps: known_eps?1:0,
            remote_sn,
            accept_answer : accept_answer?1:0,
        }, this.m_agentid, 0);
        if (info.err || info.value.result) {
            this.logger.error(`${this.tags} connect failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
            return {err:info.value.result,conn:undefined};
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
        return {err: ErrorCode.succ, time: info.value.time, conn,answer:info.value.answer};
    }
    async set_answer(answer: string): Promise<ErrorCode> {
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  Buffer.from(""), {
            name: 'set_answer',
            peerName: this.peerName,
            answer,
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} set_answer failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return info.err;
    }
    async autoAccept(): Promise<ErrorCode> {
        let info = await this.m_interface.callApi('createBdtLpcListener',  Buffer.from(""), {
            name: 'auto_accept',
            peerName: this.peerName,
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
                this.logger.info(`${this.tags} ${this.peerName} 触发 accept conn = ${eventIfo.stream_name}`);
                let conn = new BdtConnection({agentid:this.m_agentid,peerName:this.peerName!,stream_name:eventIfo.stream_name,_interface:this.m_interface ,timeout:this.m_timeout,question:eventIfo.question,conn_tag:this.conn_tag})         
                this.m_conns.set(eventIfo.stream_name,conn);
            }, this.m_agentid, this.m_timeout);
            this.m_acceptCookie = rnAccept.cookie!;
            return info.err;
        }else{
            return ErrorCode.succ
        }
        
    }
    async remark_accpet_conn_name(name:string,remote:string,conn_tag?:string):Promise<{err:number,conn?:BdtConnection}>{
        for(let conn of this.m_conns.values()){
            if(conn.stream_name == name ,conn.remote == remote){
                conn.conn_tag = conn_tag;
                return {err:BDTERROR.success,conn}
            }
        }       
        return {err:BDTERROR.RNCheckConnFailed}
    }

    /**
     * 销毁节点
     * 
     * state -1  空测试框架退出释放
     * state -2  用例操作退出，可能需要获取peer 信息
     */

    async destory(state?:number): Promise<ErrorCode> {
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
        };
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  Buffer.from(""), {
            peerName: this.peerName,
            name: 'exit',
        }, this.m_agentid, 0);
        if(state){
            this.state = -2;
        }else{
            this.state = -1;
        }
        if (info.err) {
            this.logger.error(`${this.tags} destory failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return info.err;
    }

    async addDevice(peer: Buffer): Promise<ErrorCode> {
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  peer, {
            name: 'add-device', 
            peerName: this.peerName,
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
            chunk_size,
            path,
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} calculateChunk failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return {err: info.err,calculate_time: info.value?.calculate_time,chunk_id: info.value?.chunk_id};
    }
    async setChunk(path:string,chunk_id: string): Promise<{err: ErrorCode, set_time?: number, chunk_id?: string}>{
        let info = await this.m_interface.callApi('sendBdtLpcCommand', Buffer.from(""), {
            name: 'set-chunk',
            peerName: this.peerName,
            path,
            chunk_id,
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} setChunk failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return {err: info.err,set_time: info.value?.set_time,chunk_id: info.value?.chunk_id};
    }
    async trackChunk(path:string,chunk_size:number): Promise<{err: ErrorCode, set_time?: number, calculate_time?: number, chunk_id?: string}>{
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  Buffer.from(""), {
            name: 'track-chunk',
            peerName: this.peerName,
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
            chunk_id,
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} checkChunk failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return {err: info.err,state:info.value?.state};
    }
    async checkChunkListener(chunk_id:string,interval:number,timeout:number): Promise<{err: ErrorCode,state?:string,time?:number}>{
        let begin = Date.now();
        while(Date.now() - timeout < begin){
            let check = await this.checkChunk(chunk_id);
            if( !check.state || !check.state.includes("Pending")){
                let time = Date.now() - begin;
                return {err:check.err,state:check.state,time}
            }
            await sleep(interval);
        }
        return {err: BDTERROR.timeout};
    }
    async calculateFile(path:string,chunk_size:number): Promise<{err: ErrorCode, calculate_time?: number, file?: Buffer,ObjectId?:string}>{
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  Buffer.from(""), {
            name: 'calculate-file',
            peerName: this.peerName,
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
            path,
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} setFile failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return {err: info.err,set_time: info.value?.set_time,file:info.bytes,ObjectId:info.value?.ObjectId};
    }
    async uploadFile(path:string,chunk_size:number): Promise<{err: ErrorCode, set_time?: number, calculate_time?: number, file?: Buffer,ObjectId?:string}>{
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  Buffer.from(""), {
            name: 'start-send-file',
            peerName: this.peerName,
            chunk_size,
            path,
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} uploadFile failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return {err: info.err,set_time: info.value?.set_time,file:info.bytes,ObjectId:info.value?.ObjectId,calculate_time: info.value?.calculate_time};
    }

    async downloadFile(file:Buffer ,save_path:string,peer_id:string,second_peer_id?:string): Promise<{err: ErrorCode, file?: Buffer,session?:string}>{
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  file, {
            name: 'start-download-file',
            peerName: this.peerName,
            peer_id,
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
            session,
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} downloadFileState failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return {err: info.err,state:info.value?.state};
    }
    async downloadTaskListener(session:string,interval:number,timeout:number): Promise<{err: ErrorCode,log?:string,state?:string,time?:number,record?:Array<{time:number,speed:string,progress:string}>}>{
        let begin = Date.now();
        let record:Array<{time:number,speed:string,progress:string}> = [{time:Date.now(),speed:"0",progress:"0"}];
        while(Date.now() - timeout < begin){
            let check = await this.downloadTaskState(session);
            if( !check.state || !check.state.includes("Downloading")){
                let time = Date.now() - begin;
                if(check.state!.includes("F")){

                }
                return {err:check.err,state:check.state,record,time}
            }
            record.push({
                time: Date.now(),
                speed : check.state!.split("(")[1].split(")")[0].split(",")[0],
                progress:check.state!.split("(")[1].split(")")[0].split(",")[1]
            })
            await sleep(interval);
        }
        return {err: BDTERROR.timeout};
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
    private m_agentid: string;
    private logger : Logger
    private m_stream_name?: string;
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
    }) {
        super();
        this.m_agentid = options.agentid;
        this.m_connInfo = options.stream_name;
        this.peerName = options.peerName;
        this.m_interface = options._interface;
        this.m_timeout = options.timeout;
        this.state = 1;
        this.local =  this.m_connInfo.split(", ")[1].split(":")[1]
        this.remote =  this.m_connInfo.split(", ")[2].split(":")[1]
        this.TempSeq = this.m_connInfo.split("), ")[0].split("TempSeq(")[1]
        this.port = this.m_connInfo.split(", ")[3].split(":")[1]
        this.id = this.m_connInfo.split(", ")[4].split(":")[1].split(" }}")[0]   
        this.m_stream_name = options.stream_name;
        this.question = options.question;
        this.conn_tag = options.conn_tag;
        this.logger = this.m_interface.getLogger();
        this.tags = options.tags
    }
    
    async close(): Promise<ErrorCode> {
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  Buffer.from(""), {
            name: 'add-device', 
            peerName: this.peerName,
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
            stream_name: this.stream_name,
            size: fileSize,
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} ${this.stream_name} send failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return {err: info.err,time: info.value?.time,hash:  info.value?.hash};
    }
    

    async recv(): Promise<{err: ErrorCode, size?: number, hash?: string}> {
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  Buffer.from(""), {
            name: 'recv',
            peerName: this.peerName,
            stream_name: this.stream_name,
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} ${this.stream_name} recv failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return {err: info.err,size: info.value?.size,hash:  info.value?.hash};
        
    }   
}