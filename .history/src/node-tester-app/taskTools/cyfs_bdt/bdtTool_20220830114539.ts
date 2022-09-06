import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, sleep, RandomGenerator} from '../../base';
import {EventEmitter} from 'events';
import {BdtPeerClientConfig,InitBdtPeerClientData} from "./labAgent"
import {Agent,Peer,BDTERROR} from './type'
import { BdtPeer } from '../../service/cyfs_bdt/peer';


export class AgentClient {
    private tags : string; // 机器名称 tags
    private agentInfo : Agent;
    private ip? : Array<string>;// ip信息
    private m_agentid? : string; //节点对应的自动化测试框架节点
    public bdtPeerMap : Map<string,BdtPeerClient>
    private agentMult : number;
    private logUrl? : string; //日志下载
    private m_interface: TaskClientInterface;
    private logger : Logger;
    private ipInfo?:{IPv4:Array<string>,IPv6:Array<string>}
    
    constructor(_interface: TaskClientInterface,agent:Agent){
        this.m_interface = _interface;
        this.logger = _interface.getLogger();
        this.tags = agent.tags[0];
        this.agentInfo = agent;
        this.bdtPeerMap = new Map();
        this.agentMult = 0;
    }
    async init():Promise<{err:ErrorCode,log:string}> {
        let agent = await this.m_interface.getAgent({} as any, [this.tags ],[],[], 10*1000);
        if (agent.err || agent.agentid == undefined ) {
            return {err:ErrorCode.netError,log:`${this.tags} connect bdt agent failed`}
        }
        this.m_agentid = agent.agentid!;
        //启动测试服务
        let err = await this.m_interface.startService([], this.m_agentid!, 10*1000);
        if (err) {
            return {err:ErrorCode.netError,log:`${this.tags} start agen Servicet failed`}
        }
        await sleep(2000);
        // let IPInfo = await this.m_interface.callApi('utilRequest', Buffer.from(''), {
        //     name : "getIPInfo"
        // }, this.m_agentid!, 10*1000);
        // this.logger.info(`${this.tags} get ipinfo = ${JSON.stringify(IPInfo)}`)
        // if(IPInfo.err || IPInfo.value.ipInfo.IPv4 == undefined  || IPInfo.value.ipInfo.IPv6 == undefined){  
        //     return {err:ErrorCode.exception,log:`${this.tags} get ipinfo failed`}
        // }
        // this.ipInfo = IPInfo.value.ipInfo;
        return {err:ErrorCode.succ,log:`${this.tags} get ipinfo success`}
    }
    async uploadLog(testcaseId:string):Promise<{err:ErrorCode,log?:string,url?:string}>{
        let result = await this.m_interface.callApi('utilRequest', Buffer.from(''), {
            name : "uploadLog",
            logName : `${testcaseId}_${this.tags}.zip`
        }, this.m_agentid!, 10*1000);
        this.logger.info(`${this.tags} uploadLog = ${JSON.stringify(result)}`)
        if(result.value.upload.err ){  
            return {err:ErrorCode.exception,log:`${this.tags} uploadLog failed`}
        }
        return {err:ErrorCode.exception,log:`${this.tags} uploadLog success`,url:result.value.upload?.url}
    }
    
    async startPeerClient(config:BdtPeerClientConfig):Promise<{err:number,log?:string,bdtClient?:BdtPeerClient}>{
        let peer :Peer = await InitBdtPeerClientData(this.agentInfo,config);
        let bdtClient = new BdtPeerClient(this.m_interface,this.m_agentid!,this.tags,peer)
        let result = await bdtClient.init();
        if(result.err){
            return result
        }
        this.agentMult = this.agentMult + 1;
        this.logger.info(`${this.tags} add a new bdt client, agentMult = ${this.agentMult}`)
        this.bdtPeerMap.set(`${this.agentMult}`,bdtClient);
        return {err:result.err,log:result.log,bdtClient}
    }
    async getBdtPeerClient(index:string):Promise<{err:ErrorCode,log?:string,bdtClient?:BdtPeerClient}>{
        if(!this.bdtPeerMap.has(index)){
            return {err:BDTERROR.AgentError,log:`${this.tags} ${index} not exsit`}
        }
        let bdtClient = this.bdtPeerMap.get(index)!;
        if(bdtClient.state){
            return {err:BDTERROR.AgentError,log:`${this.tags} ${index} state error,state = ${bdtClient.state}`}
        }
        return {err:BDTERROR.success,log:`${this.tags} ${index} get success`,bdtClient}
    }
    

}

export class AgentManager {
    static manager?: AgentManager;
    private m_interface: TaskClientInterface;
    public agentMap : Map<string,AgentClient>
    constructor(_interface: TaskClientInterface){
        this.m_interface = _interface;
        this.agentMap = new Map()
    }
    static createInstance(_interface:TaskClientInterface): AgentManager {
        if (!AgentManager.manager) {
            AgentManager.manager = new AgentManager(_interface);
        }
        return AgentManager.manager;
    }

    async initAgentList(agents:Array<Agent>){
        let initList : Array<any> = []
        for(let i in agents){
            initList.push(new Promise<{result:{err:ErrorCode,log:string},client:AgentClient,name:string}>(async(V)=>{
                let client = new AgentClient(this.m_interface,agents[i]);
                let result = await client.init();
                V({result:result,client,name:agents[i].tags[0]});
            }))
        }
        for(let i in initList){
            let res = await initList[i];
            if(res.result!.err){
                this.m_interface.getLogger().error(res.result!.log);
            }else{
                this.m_interface.getLogger().info(`### init agent ${res.name} success`)
                this.agentMap.set(res.name,res.client);
            }
        }
    }
    async checkBdtPeerClient(name:string):Promise<{err:number,log?:string}> {
        let agentName = name.split("_")[0];
        let BDTIndex = name.split("_")[1];
        
        if(!this.agentMap.has(agentName) || !this.agentMap.get(agentName)!.bdtPeerMap.has(BDTIndex)){
            return {err:BDTERROR.AgentError,log:`${name} not exsit`}
        }
        return {err:BDTERROR.success,log:`check BdtPeerClient success`};
    }
    async getBdtPeerClient(name:string):Promise<{err:number,log?:string,bdtClient?:BdtPeerClient}> {
        let agentName = name.split("$")[0];
        let BDTIndex = name.split("$")[1];
        if(!this.agentMap.has(agentName)){
            this.m_interface.getLogger().error(`agent ${agentName} not exsit , agent list = ${this.agentMap.keys()}`)
            return {err:BDTERROR.AgentError,log:` agent ${agentName} not exsit`}
        }
        return this.agentMap.get(agentName)!.getBdtPeerClient(BDTIndex);
    }
    async checkBdtPeerClientList(LN:string,RN?:string,Users?:Array<string>):Promise<{err:number,log?:string}> {
        let result = await this.checkBdtPeerClient(LN);
        if(result.err){
            return result
        }
        if(RN){
            result = await this.checkBdtPeerClient(RN);
            if(result.err){
                return result
            }
        }
        if(Users){
            for(let i in Users){
                result = await this.checkBdtPeerClient(Users[i]);
                if(result.err){
                    return result
                }
            }    
        }
        return {err:BDTERROR.AgentError};
    }
    
    async createBdtPeerClient(agentName:string,config:BdtPeerClientConfig):Promise<{err:number,log?:string,bdtClient?:BdtPeerClient}>{
        if(!this.agentMap.has(agentName)){
            return {err:BDTERROR.AgentError,log:`${agentName} not exsit`}
        }
        return this.agentMap.get(agentName)!.startPeerClient(config)

    }
    async allAgentStartBdtPeer(config:BdtPeerClientConfig,num:number=1){
        let taskList = []
        for(let agent of this.agentMap.values()){
            for(let j=0;j<num;j++){
                taskList.push(agent.startPeerClient(config))
            }
        } 
        for(let i in taskList){
            await taskList[i]
        }
    } 
    async uploadLog(testcaseId:string):Promise<{err:ErrorCode,log:string}>{
        let taskList = []
        for(let agent of this.agentMap.values()){
            taskList.push(agent.uploadLog(testcaseId));
        }
        for(let i in taskList){
            await taskList[i]
        }
        return {err:BDTERROR.success,log:`save test log to server success`}
    } 
}


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
    private m_establishCookie?: number;
    private m_sendedCookie?: number;
    private m_recvedCookie?: number;
    private m_connectionCookie?: number;
    private m_unliveCookie?: number;
    private m_acceptCookie?: number;
    public cache_peer_info: Peer;
    public sn_resp_eps? : string;
    public tags:string;
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
        if (info.err) {
            this.logger.error(`${this.tags} connect failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
            return {err:info.err,conn:undefined};
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

    async addDevice(peer: Buffer){
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  peer, {
            name: 'add-device', 
            peerName: this.peerName,
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} addDevice failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return info.err;
    }
    async createFile(fileSize:number):Promise<{err:ErrorCode,log?:string,fileName?:string,filePath?:string,md5?:string}>{
        let result = await this.m_interface.callApi('utilRequest', Buffer.from(''), {
            name : "createFile",
            peerName: this.peerName,
            fileSize,
        }, this.m_agentid!, 10*1000);
        this.logger.info(`${this.tags} createFile = ${JSON.stringify(result)}`)
        if(result.err ){  
            return {err:ErrorCode.exception,log:`${this.tags} createFile failed`}
        }
        return {err:ErrorCode.exception,log:`${this.tags} createFile success`,fileName:result.value.fileName,filePath:result.value.filePath,md5:result.value.md5}
    }
    async createDir(fileNumber:number,fileSize:number,dirNumber:number,deep:string):Promise<{err:ErrorCode,log?:string,dirName?:string,dirPath?:string}>{
        let result = await this.m_interface.callApi('utilRequest', Buffer.from(''), {
            name : "createDir",
            peerName: this.peerName,
            dirNumber,
            fileNumber,
            deep,
            fileSize,
        }, this.m_agentid!, 10*1000);
        this.logger.info(`${this.tags} createDir = ${JSON.stringify(result)}`)
        if(result.err ){  
            return {err:ErrorCode.exception,log:`${this.tags} createDir failed`}
        }
        return {err:ErrorCode.exception,log:`${this.tags} createDir success`,dirName:result.value.ddirName,dirPath:result.value.dirPath,}
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

    async downloadFile(file:Buffer ,peer_id:string,second_peer_id:string, path:string,chunk_size:number): Promise<{err: ErrorCode, set_time?: number, calculate_time?: number, file?: Buffer,ObjectId?:string}>{
        let info = await this.m_interface.callApi('sendBdtLpcCommand',  Buffer.from(""), {
            name: 'start-download-file',
            peerName: this.peerName,
            chunk_size,
            path,
        }, this.m_agentid, 0);
        if (info.err) {
            this.logger.error(`${this.tags} uploadFile failed,err =${info.err} ,info =${JSON.stringify(info.value)}`)
        }
        return {err: info.err,set_time: info.value?.set_time,file:info.bytes,ObjectId:info.value?.ObjectId,calculate_time: info.value?.calculate_time};
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

