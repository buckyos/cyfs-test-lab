import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, sleep, RandomGenerator} from '../../base';
import {EventEmitter} from 'events';

type ConnectionStat = {
    connTime?: number;
    sendFileTime?: number;
} & any


let connRecvList :Array<string> = [""];


export class BdtConnection extends EventEmitter {
    public local:string;
    public remote:string;
    public TempSeq:string;
    public port : string;
    public id : string;
    public conn_tag? :string;
    public question? : string;
    private m_agentid: string;
    private m_connName?: string;
    private m_interface: TaskClientInterface;
    private m_peerName: string; 
    private m_timeout: number;
    public state : number; // 0：未连接 ，1：已连接 ，2 已启动recv,-1 ：已经释放连接
    private m_connInfo:string;
    get connName(): string {
        return this.m_connName!;
    }

    set connName(n: string) {
        this.m_connName = n;
    }

    constructor(options: {
        agentid: string;
        peerName: string;
        connName: string; 
        _interface: TaskClientInterface;
        timeout: number;
        question?:string;
        conn_tag?:string;
    }) {
        super();
        this.m_agentid = options.agentid;
        this.m_connInfo = options.connName;
        this.m_peerName = options.peerName;
        this.m_interface = options._interface;
        this.m_timeout = options.timeout;
        this.state = 1;
        this.local =  this.m_connInfo.split(", ")[1].split(":")[1]
        this.remote =  this.m_connInfo.split(", ")[2].split(":")[1]
        this.TempSeq = this.m_connInfo.split("), ")[0].split("TempSeq(")[1]
        this.port = this.m_connInfo.split(", ")[3].split(":")[1]
        this.id = this.m_connInfo.split(", ")[4].split(":")[1].split(" }}")[0]   
        this.m_connName = this.TempSeq;
        this.question = options.question;
        this.conn_tag = options.conn_tag;
    }

    async confirm(answer?: string): Promise<ErrorCode> {
        let param = {
            peerName: this.m_peerName,
            connName: this.m_connInfo!,
            answer,
        };

        let ret = await this.m_interface.callApi('confirm',  Buffer.from(''), param, this.m_agentid!, this.m_timeout);
        return ret.err;
    }
    
    async close(): Promise<ErrorCode> {
        let param = {
            peerName: this.m_peerName,
            connName: this.m_connInfo!,
        };

        let ret = await this.m_interface.callApi('closeConnection',  Buffer.from(''), param, this.m_agentid!, this.m_timeout);
        this.state = -1;
        return ret.err;
    }

    async sendFile(fileSize: number): Promise<{err: ErrorCode, time?: number, hash?: string}> {
        let param = {
            peerName: this.m_peerName,
            connName: this.m_connInfo!,
            fileSize
        }

        let info = await this.m_interface.callApi('sendFile', Buffer.from(''), param, this.m_agentid!, 0);
        if (!info.value) {
            this.m_interface.getLogger().error(`sendFile, service return invalid param`);
            return {err: ErrorCode.invalidParam};
        }
        return {err: info.err, time: info.value.time, hash: info.value.hash};
    }
    

    async recvFile(): Promise<{err: ErrorCode, size?: number, hash?: string}> {
        let param = {
            peerName: this.m_peerName,
            connName: this.m_connInfo!,
        }
        //&& !connRecvList.includes(`${this.m_connInfo!}_${this.m_peerName}`)
        if(this.state >0 ){
            this.m_interface.getLogger().info(`##########${this.m_connInfo!}_${this.m_peerName} 开始启动recv 首次触发`);
            connRecvList.push(`${this.m_connInfo!}_${this.m_peerName}`)
            this.state =2 ;
            let info = await this.m_interface.callApi('recvFile', Buffer.from(''), param, this.m_agentid!, 0);
            if (!info.value) {
                this.m_interface.getLogger().info(`###warnning##recvFile, service return invalid param`);
                return {err: ErrorCode.invalidParam};
            }
            this.m_interface.getLogger().info(`  ${this.connName} recv stream成功 ${JSON.stringify(info)}`)
            return {err: info.err, size: info.value.size, hash: info.value.hash};
        }else{
            this.m_interface.getLogger().info(`##########${this.m_connInfo!}_${this.m_peerName} 已启动recv 不重复触发`);
            return {err: ErrorCode.succ};
        }   
        
    }
    async sendObject(object_id: string,obj_type:number): Promise<{err: ErrorCode, time?: number, hash?: string}> {
        return new Promise(async(V)=>{
            let param = {
                peerName: this.m_peerName,
                connName: this.m_connInfo!,
                object_id,
                obj_type
            }
            // 设置一个超时重试
            let sending = true;
            setTimeout(async()=>{
                if(sending){
                    return V({err: ErrorCode.timeout})
                }
            },20000)
            setTimeout(async()=>{
                if(sending){
                    let info = await this.m_interface.callApi('sendObject', Buffer.from(''), param, this.m_agentid!, 0);
                    sending = false;
                    if (!info.value) {
                        this.m_interface.getLogger().error(`recvObject, service return invalid param`);
                        return V({err: ErrorCode.invalidParam});
                    }
                    return V({err: info.err, time: info.value.time, hash: info.value.hash});
                }
            },10000)
            let info = await this.m_interface.callApi('sendObject', Buffer.from(''), param, this.m_agentid!, 0);
            sending = false;
            if (!info.value) {
                this.m_interface.getLogger().error(`recvObject, service return invalid param`);
                return V({err: ErrorCode.invalidParam});
            }
            return V({err: info.err, time: info.value.time, hash: info.value.hash});
        })
        
    }

    async recvObject(objPath: string,object_id?:string): Promise<{err: ErrorCode, size?: number, hash?: string}> {
        return new Promise(async(V)=>{
            let param = {
                peerName: this.m_peerName,
                connName: this.m_connInfo!,
                objPath,
                object_id
            }
            let sending = true;
            setTimeout(async()=>{
                if(sending){
                    return V({err: ErrorCode.timeout})
                }
            },20000)
            this.m_interface.getLogger().info(`##########${this.m_connInfo!}_${this.m_peerName} 开始启动recv object 首次触发`);
            connRecvList.push(`${this.m_connInfo!}_${this.m_peerName}`)
            this.state = 2 ;
            let info = await this.m_interface.callApi('recvObject', Buffer.from(''), param, this.m_agentid!, 0);
            sending =false;
            if (!info.value) {
                this.m_interface.getLogger().info(`###warnning## recvObject, service return invalid param`);
                return V({err: ErrorCode.invalidParam})
            }
            this.m_interface.getLogger().info(`  ${this.connName} recvObject  stream成功 ${JSON.stringify(info)}`)
            return V({err: info.err, size: info.value.size, hash: info.value.hash});
            
        })
           
        
    }

    async chunkSendFile(fileSize:number): Promise<{err: ErrorCode, chunkid: string,time?:number,size?:number,log?:string}>{
        let param = {
            peerName : this.m_peerName,
            fileSize : fileSize
        }
        let info = await this.m_interface.callApi('chunkSendFile', Buffer.from(''), param, this.m_agentid!, 0);
        if(info.err){
            this.m_interface.getLogger().error('set chunk failed')
            return {err:info.err,chunkid:''}
        }
        return {err:info.err,chunkid:info.value.chunkid,time:info.value.time,size:info.value.size}

    }
    async chunkRecvFile(peer: BdtPeer,chunkid: string,timeout:number): Promise<{err: ErrorCode, state?: string,time?:number}>{
        let param = {
            peerName : this.m_peerName,
            chunkid : chunkid,
            timeout : timeout
        }
        let info = await this.m_interface.callApi('chunkRecvFile', peer.peerinfo, param, this.m_agentid!, 0);
        if(info.err){
            this.m_interface.getLogger().error(`chunk recv failed,log = ${info.value.log}`)
            return {err:info.err}
        }
        return {err:info.err,state:info.value.state,time:info.value.time}
    }

   


    // async getStat(): Promise<{err: ErrorCode, stat?: ConnectionStat}> {
    //     let param = {
    //         peerName: this.m_peerName,
    //         connName: this.m_connName!,
    //     };

    //     let statInfo = await this.m_interface.callApi('getStat', Buffer.from(''), param, this.m_agentid!, this.m_timeout);
    //     if (statInfo.err) {
    //         return statInfo;
    //     }
    // abcdef
    //     return {err: ErrorCode.succ, stat: statInfo.value};
    // }
}

export class BdtPeer extends EventEmitter{
    private m_peerName?: string;
    private m_agentid: string;
    private m_peerid?: string;
    private m_peerinfo?: Buffer;
    private m_conns: BdtConnection[];
    private m_interface: TaskClientInterface;
    private m_timeout: number;
    public FristQA_answer?:string;
    public conn_tag?:string;
    private m_establishCookie?: number;
    private m_sendedCookie?: number;
    private m_recvedCookie?: number;
    private m_connectionCookie?: number;
    private m_unliveCookie?: number;
    private m_acceptCookie?: number;
    public tags?:string;
    public state : number;
    public NAT? : number;
    on(event: 'unlive', listener: () => void): this;
    on(event: 'accept', listener: (RNconn:BdtConnection,peerName?:String,question?:string) => void):this;
    on(event: string, listener: (...args: any[]) => void): this {
        super.on(event, listener);
        return this;
    }

    once(event: 'unlive', listener: () => void): this;
    once(event: 'accept', listener: (RNconn:BdtConnection,peerName?:String,question?:string) => void):this;
    once(event: string, listener: (...args: any[]) => void): this {
        super.on(event, listener);
        return this;
    }

    constructor(options: {
        agentid: string;
        _interface: TaskClientInterface;
        timeout: number;
        tags? : string;
        NAT?:number
    }) {
        super();
        this.m_agentid = options.agentid;
        this.m_interface = options._interface;
        this.m_timeout = options.timeout;
        this.m_conns = [];
        this.state = 0;
        this.tags = options.tags;
        this.NAT = options.NAT;
    }

    get peername(): string {
        return this.m_peerName!;
    } 

    set peername(s: string) {
        this.m_peerName = s;
    }

    get agentid(): string {
        return this.m_agentid;
    }

    get peerid(): string {
        return this.m_peerid!;
    }

    set peerid(b: string) {
        this.m_peerid = b;
    }

    get peerinfo(): Buffer {
        return this.m_peerinfo!;
    }

    set peerinfo(b: Buffer) {
        this.m_peerinfo = b;
    }

    async init(): Promise<ErrorCode> {
        let info = await this.m_interface.attachEvent('unlive', (err: ErrorCode,namespace: Namespace, peerName: string) => {
            if (peerName === this.m_peerName) {
                this.state = -1;
                this.m_interface.getLogger().info(`peer ${this.tags} emit unlive`)
                this.emit('unlive');
            }
        }, this.m_agentid, this.m_timeout);
        this.m_unliveCookie = info.cookie;

        return ErrorCode.succ;
    }
    getConnect(remote:string,conn_tag?:string):{err:boolean,conn?:BdtConnection}{
        this.m_interface.getLogger().info(`${this.m_peerid} get  ${remote} conn ,conn_tag = ${conn_tag} `)
        for(let i in this.m_conns){
            //this.m_interface.getLogger().info(`conn info :remote =  ${this.m_conns[i].remote}  ,conn_tag = ${this.m_conns[i].conn_tag} `)
            if( this.m_conns[i].remote == remote && this.m_conns[i].conn_tag == conn_tag){
                return {err:false,conn:this.m_conns[i]}
            }
        }
        this.m_interface.getLogger().info(`${this.tags}连接数： ${JSON.stringify(this.m_conns.length)}`)
        return {err:true}
    }
    async remark_accpet_conn_name(name:string,remote:string,conn_tag?:string):Promise<{err:boolean,conn?:BdtConnection}>{
        for(let x =0;x<10;x++){
            for(let i in this.m_conns){
                if(this.m_conns[i].connName == name && this.m_conns[i].remote == remote){
                    this.m_conns[i].conn_tag == conn_tag;
                    this.m_interface.getLogger().info(`${this.m_conns[i].connName} set conn_tag = ${conn_tag}`)
                    return {err:false,conn:this.m_conns[i]}
                }
            }
            await sleep(500);
        }
       
        return {err:true}
    }
    async containConn(remote:string,conn_tag?:string):Promise<{err:boolean,conn?:BdtConnection}>{
        for(let i =0;i<10;i++){
            let info = this.getConnect(remote,conn_tag)
            if(!info.err){
                return info;
            }
            await sleep(500);
        }
        return {err:true};
    }
    //第二次创建的时候，可以指定前一次创建的peerid，这个时候bdt会以同一个device去创建
    async start(addrInfo: string[], local: string, snFiles: string[], knownPeer?: Buffer[],RUST_LOG?:string,activePnFiles?:Array<string>, passivePnFiles?:Array<string>,knownPeerFiles?:Array<string>,chunk_cache?:string,FristQA_answer?:string,resp_ep_type?:string): Promise<{err:ErrorCode,ep_info?:string,ep_resp?:string}> {
        let param: any = {
            addrInfo,
            snFiles,
            local,
            RUST_LOG,
            activePnFiles,
            passivePnFiles,
            knownPeerFiles,
            chunk_cache,
            ep_type:resp_ep_type,

        };

        let writer: BufferWriter = new BufferWriter()
        if (knownPeer) {
            for (let index = 0; index < knownPeer.length; index++) {
                writer.writeU16(knownPeer[index].length);
                writer.writeBytes(knownPeer[index]);
            }
        }
        
        
        let info = await this.m_interface.callApi('startPeer', writer.render(), param, this.m_agentid, 0);
        this.m_interface.getLogger().debug(`startPeer, err=${info.err}, jsonvalue=${JSON.stringify(info.value)}`);

        
        if (info.err) {
            return {
                err : info.err
            };
        }

        if (!info.bytes || info.bytes!.length === 0 || !info.value || !info.value.peerName) {
            this.m_interface.getLogger().error(`startPeer, service return invalid param`);
            return {
                err : ErrorCode.invalidParam
            };
        }
        this.m_peerName = info.value.peerName;
        this.FristQA_answer = FristQA_answer ;
        this.m_peerinfo = info.bytes!;
        this.m_peerid = info.value.peerid;
        this.state = 1;
        return {
            err : ErrorCode.succ,
            ep_info : info.value.ep_info,
            ep_resp : info.value.ep_info,
        };
        
    }
    async startCreateLocalPeer(addrInfo: string[], local: string, snFiles: string[], knownPeer?: Buffer[],RUST_LOG?:string,activePnFiles?:string, passivePnFiles?:string): Promise<ErrorCode> {
        let param: any = {
            addrInfo,
            snFiles,
            local,
            RUST_LOG,
            activePnFiles,
            passivePnFiles
        };

        let writer: BufferWriter = new BufferWriter()
        if (knownPeer) {
            for (let index = 0; index < knownPeer.length; index++) {
                writer.writeU16(knownPeer[index].length);
                writer.writeBytes(knownPeer[index]);
            }
        }
        
        let info = await this.m_interface.callApi('createLocalPeer', writer.render(), param, this.m_agentid, 0);
        this.m_interface.getLogger().debug(`createLocalPeer, err=${info.err}, jsonvalue=${JSON.stringify(info.value)}`);
        if (info.err) {
            return info.err;
        }

        if (!info.bytes || info.bytes!.length === 0 || !info.value || !info.value.peerName) {
            this.m_interface.getLogger().error(`startPeer, service return invalid param`);
            return ErrorCode.invalidParam;
        }
        this.m_peerName = info.value.peerName;

        this.m_peerinfo = info.bytes!;
        this.m_peerid = info.value.peerid;
        this.state = 1;
        return ErrorCode.succ;
    }
    /**
     * 发起连接
     * @param peer 
     * @param question 
     * @param known_eps 
     * @param remote_sn 
     */

    async connect(peer: BdtPeer, question: string, known_eps: number,accept_answer: number, conn_tag?:string, remote_sn?: string,): Promise<{err: ErrorCode, time?: number, conn?: BdtConnection,answer?:string}> {
        let param = {
            peerName: this.m_peerName,
            question,
            known_eps,
            remote_sn,
            accept_answer,
        };

        let info = await this.m_interface.callApi('connect',  peer.peerinfo, param, this.m_agentid, 0);
        if (info.err) {
            return {err:info.err,conn:undefined};
        }

        if (!info.value || !info.value.connName) {
            this.m_interface.getLogger().error(`connect, service return invalid param`);
            return {err: ErrorCode.invalidParam};
        }
        let conn = new BdtConnection({
            agentid: this.m_agentid,
            peerName: this.m_peerName!,
            connName: info.value.connName, 
            _interface: this.m_interface,
            timeout: this.m_timeout,
            conn_tag
        });
        this.m_conns.push(conn);

        return {err: ErrorCode.succ, time: info.value.time, conn,answer:info.value.answer};
    }
    async set_answer(answer: string): Promise<ErrorCode> {
        let param = {
            peerName: this.m_peerName,
            answer,
        };
        let ret = await this.m_interface.callApi('set_answer',  Buffer.from(''), param, this.m_agentid!, this.m_timeout);
        return ret.err;
    }

    /**
     * accept+confirm操作
     */

    async autoAccept(): Promise<ErrorCode> {
        let param = {
            peerName: this.m_peerName,
            answer:this.FristQA_answer,
        }
        //监听accept 
        if(this.m_acceptCookie==undefined){
            let info = await this.m_interface.callApi('autoAccept',  Buffer.from(''), param, this.m_agentid, 0);
            let rnAccept = await this.m_interface.attachEvent('accept', (err: ErrorCode,namespace: Namespace, connName: string,peerName:string,question:string) => {
                this.m_interface.getLogger().info(`${this.tags} ${peerName} 触发 accept conn = ${connName}`);
                if(this.peername === peerName){
                    let RNconn = new BdtConnection({agentid:this.m_agentid,peerName:peerName,connName,_interface:this.m_interface ,timeout:this.m_timeout,question,conn_tag:this.conn_tag})
                    this.emit('accept', RNconn,peerName,question);
                }
            }, this.m_agentid, this.m_timeout);
            this.m_acceptCookie = rnAccept.cookie!;
            return info.err;
        }else{
            return ErrorCode.succ
        }
        
    }
    addConn(conn:BdtConnection){
        this.m_conns.push(conn);

    }
    /**
     * RN 节点等待接收报文包
     */

    async accept(): Promise<{err: ErrorCode, conn?: BdtConnection, question?: string}> {
        let param = {
            peerName: this.m_peerName,
        }

        let info = await this.m_interface.callApi('accept',  Buffer.from(''), param, this.m_agentid, 0);
        if (info.err) {
            return info;
        }

        let conn = new BdtConnection({
            agentid: this.m_agentid,
            peerName: this.m_peerName!,
            connName: info.value.connName, 
            _interface: this.m_interface,
            timeout: this.m_timeout,
        });
        this.m_conns.push(conn);

        return {err: ErrorCode.succ, conn, question: info.value.question};
    }

    /**
     * service 里面暂时未支持该接口
     */

    async resUsage(): Promise<{err: ErrorCode, mem: number, vmem: number, handle: number}> {
        let param = {
            peerName: this.m_peerName,
        };

        let resUsageInfo = await this.m_interface.callApi('resUsage', Buffer.from(''), param, this.m_agentid!, this.m_timeout);
        
        return {err: resUsageInfo.err, mem: resUsageInfo.value.mem, vmem: resUsageInfo.value.vmem, handle: resUsageInfo.value.handle};
    }
    /**
     * 销毁节点
     */

    async destory(): Promise<ErrorCode> {
        for (let i = 0; i < this.m_conns.length; i++) {
            if(this.m_conns[i].state === 1){
                await this.m_conns[i].close();
            }
            
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
            peerName: this.m_peerName,
        };
        let info = await this.m_interface.callApi('destoryPeer', Buffer.from(''), param, this.m_agentid!, this.m_timeout);
        this.state = -1;
        if (info.err) {
            return info.err;
        }

        return ErrorCode.succ;
    }

    async chunkSendFile(fileSize:number): Promise<{err: ErrorCode, chunkid: string,time?:number,size?:number,log?:string}>{
        let param = {
            peerName : this.m_peerName,
            fileSize : fileSize
        }
        let info = await this.m_interface.callApi('chunkSendFile', Buffer.from(''), param, this.m_agentid!, 0);
        if(info.err){
            this.m_interface.getLogger().error('set chunk failed')
            return {err:info.err,chunkid:''}
        }
        return {err:info.err,chunkid:info.value.chunkid,time:info.value.time,size:info.value.size}

    }
    async chunkRecvFile(peer: BdtPeer,chunkid: string,timeout:number): Promise<{err: ErrorCode, state?: string,time?:number,chunkId?:string}>{
        let param = {
            peerName : this.m_peerName,
            chunkid : chunkid,
            timeout : timeout
        }
        let info = await this.m_interface.callApi('chunkRecvFile', peer.peerinfo, param, this.m_agentid!, 0);
        if(info.err){
            this.m_interface.getLogger().error(`chunk recv failed,log = ${info.value.log}`)
            return {err:info.err}
        }
        return {err:info.err,state:info.value.state,time:info.value.time,chunkId:info.value.chunkid}
    }
    async interestChunkList(peer: BdtPeer,chunk_list:  Array<{chunk_id:string}>,timeout:number): Promise<{err: ErrorCode, state?: string,time?:number,log?:string,session?:string,record?:Array<{time:number,speed:string,progress:string}>}>{
        let param = {
            peerName : this.m_peerName,
            chunk_list : chunk_list,
            timeout : timeout
        }
        let info = await this.m_interface.callApi('interestChunkList', peer.peerinfo, param, this.m_agentid!, 0);
        if(info.err){
            this.m_interface.getLogger().error(`chunk recv failed,log = ${info.value.log}`)
            return {err:info.err}
        }
        return {
            err:info.err,
            log:info.value.log,
            time:info.value.time,
            session:info.value.session,
            record : info.value.record
        }
    }
    async startSendFile(fileSize:number,localFileName?:string,chunkSize?:number,save:boolean=true): Promise<{err:ErrorCode,log?:string,fileName?:string,
        session?:string,fileObject?:Buffer,time?:number,md5?:string,size?:number}>{
        let param = {
            peerName : this.m_peerName,
            fileSize : fileSize,
            save : save,
            localFileName:localFileName,
            chunkSize :chunkSize
        }
        let info = await this.m_interface.callApi('startSendFile', Buffer.from(''), param, this.m_agentid!, 0);
        if(info.err){
            this.m_interface.getLogger().error('startSendFile set chunk failed')
            return {err:info.err,log:"startSendFile set chunk failed"}
        }
        this.m_interface.getLogger().info(`${this.tags}创建文件对象成功 ${JSON.stringify(info.bytes)}`)
        return {
                err:info.err,
                log:info.value.log,
                fileName:info.value.fileName,
                time:info.value.time,
                size:info.value.size,
                md5:info.value.md5,
                session:info.value.session,
                fileObject:info.bytes
            }

    }
    async startDownloadFile(fileName:string,file:Buffer,remote:string,timeout:number,secondPeerId?:string): Promise<{err:ErrorCode,log?:string,
        session?:string,state?:string,time?:number,md5?:string,record?:Array<{time:number,speed:string,progress:string}>}>{
        let param = {
            peerName : this.m_peerName,
            fileName,
            remote,
            timeout,
            secondPeerId,
        }
        this.m_interface.getLogger().info(`${this.tags}开始下载文件对象： ${JSON.stringify(file)}`)
        this.m_interface.getLogger().info(`${this.tags}的下载源 ${remote} ${secondPeerId}`)
        let info = await this.m_interface.callApi('startDownloadFile', Buffer.from(file), param, this.m_agentid!, 0);
        if(info.err){
            this.m_interface.getLogger().error(`startDownloadFile chunk recv failed,log = ${info.value.log}`)
            return {err:info.err}
        }
        return {
            err:info.err,
            log:info.value.log,
            time:info.value.time,
            md5:info.value.md5,
            session:info.value.session,
            record : info.value.record
        }
    }
    async startDownloadFileRange(fileName:string,file:Buffer,remote:string,timeout:number,range:Array<{begin:number,end:number}>,secondPeerId?:string): Promise<{err:ErrorCode,log?:string,
        session?:string,state?:string,time?:number,md5?:string,record?:Array<{time:number,speed:string,progress:string}>}>{
        let param = {
            peerName : this.m_peerName,
            fileName,
            remote,
            timeout,
            range,
            secondPeerId,
        }
        //this.m_interface.getLogger().info(`${this.tags}开始下载文件对象： ${JSON.stringify(file)}`)
        this.m_interface.getLogger().info(`${this.tags}的下载源 ${remote} ${secondPeerId}`)
        let info = await this.m_interface.callApi('startDownloadFileRange', Buffer.from(file), param, this.m_agentid!, 0);
        if(info.err){
            this.m_interface.getLogger().error(`startDownloadFileRange chunk recv failed,log = ${info.value.log}`)
            return {err:info.err}
        }
        return {
            err:info.err,
            log:info.value.log,
            time:info.value.time,
            md5:info.value.md5,
            session:info.value.session,
            record : info.value.record
        }
    }
    async startSendDir(dirPath:string,fileNum:number,fileSize:number,chunkSize:number): Promise<{err:ErrorCode,log?:string,dirName?:string,
        session?:string,dir_id?:string,time?:number,dir_obj_path?:string,dir_map?:Array<{name:string,file_id:string}>,dir_map_buffer?:Buffer}>{
        let param = {
            peerName : this.m_peerName,
            fileSize : fileSize,
            fileNum : fileNum,
            dirPath:dirPath,
            chunkSize :chunkSize
        }
        let info = await this.m_interface.callApi('startSendDir', Buffer.from(''), param, this.m_agentid!, 60*1000);
        if(info.err){
            this.m_interface.getLogger().error('startSendDir set chunk failed')
            return {err:info.err,log:"startSendDir set chunk failed"}
        }
        this.m_interface.getLogger().info(`${this.tags}创建文件对象成功 ${JSON.stringify(info.value.dir_id!)}`)
        let dir_map_file = info.bytes!.toString();
        let dir_map_list = dir_map_file.split("\n");
        let dir_map:Array<{name:string,file_id:string}> = [];
        for(let i in dir_map_list){
            let name = dir_map_list[i].split(",")[0];
            let file_id = dir_map_list[i].split(",")[1];
            if(name && file_id){
                dir_map.push({name,file_id});
            }
        }
        return {
                err:info.err,
                log:info.value.log,
                time:info.value.time,
                session:info.value.session,
                dir_id:info.value.dir_id,
                dir_obj_path:info.value.dir_obj_path,
                dir_map,
                dir_map_buffer:info.bytes 
            }

    }
    async startDownloadDir(dirPath:string,dir_obj_path:string,dir_map_buffer:Buffer,dir_id:string,remote:string,timeout:number,secondPeerId?:string): Promise<{err:ErrorCode,log?:string,
        session?:string,state?:string,time?:number,record?:Array<{time:number,speed:string,progress:string}>}>{
        let param = {
            peerName : this.m_peerName,
            dirPath,
            dir_obj_path,
            remote,
            dir_id,
            timeout,
            secondPeerId,
        }
        this.m_interface.getLogger().info(`${this.tags}开始下载文件对象`)
        this.m_interface.getLogger().info(`${this.tags}的下载源 ${remote} ${secondPeerId}`)
        let info = await this.m_interface.callApi('startDownloadDir', dir_map_buffer, param, this.m_agentid!, 0);
        if(info.err){
            this.m_interface.getLogger().error(`startDownloadDir chunk recv failed,log = ${info.value.log}`)
            return {err:info.err}
        }
        return {
            err:info.err,
            log:info.value.log,
            session:info.value.session,
            state:info.value.state,
            time:info.value.time,
            record:info.value.record,
        }
    }
    async createFileSession(hubName:string,fileName:string,timeout:number,fileSize?:number,file:Buffer=Buffer.from('')):Promise<{err:ErrorCode,log?:string,session?:string,fileObject?:Buffer,md5?:string}>{
        let param ={
            peerName : this.m_peerName,
            hubName : hubName,
            fileName : fileName,
            fileSize : fileSize,
            timeout : timeout 
        }
        this.m_interface.getLogger().info(`${this.m_peerName} createFileSession size : ${fileSize} ,file buffer : ${file.toString()}`)
        let info = await this.m_interface.callApi('createFileSession', Buffer.from(file), param, this.m_agentid!, 0);
        if(info.err){
            this.m_interface.getLogger().error(`createFileSession,err=${info.value.log}`)
            return {err:info.value.err,log:info.value.log}
        }
        return info.value;
    }
    //这个接口需要循环定时调用，startTransSession 内部进行了getTransSessionState 循环校验
    async getTransSessionState(session:any,timeout:number):Promise<{err:ErrorCode,log?:string}>{
        let param ={
            peerName : this.m_peerName,
            session : session,
            timeout : timeout
        }
        let info = await this.m_interface.callApi('getTransSessionState', Buffer.from(''), param, this.m_agentid!, 0);
        if(info.err){
            this.m_interface.getLogger().error(`check session state failed ,err=${info.value.log}`);
            return {err:info.value.err,log:info.value.log}
        }
        return info.value;

    }
    async startTransSession(session:string,fileName:string,timeout:number,options?: {enable_upload: boolean}):Promise<{err:ErrorCode,log?:string,md5?:string,time?:string,fileState?:string,localChunkList?:Array<string>}>{
        let param ={
            peerName : this.m_peerName,
            fileName : fileName,
            session : session,
            timeout : timeout,
            options : options,
        }
        let info = await this.m_interface.callApi('startTransSession', Buffer.from(''), param, this.m_agentid!, 0);
        if(info.err){
            this.m_interface.getLogger().error(`peer startTransSession failed,err=${info.value.log}`);
            return {err:info.value.err,log:info.value.log}
        }else{
            this.m_interface.getLogger().info(`peer startTransSession success,err=${info.value.log},session = ${session}`);
        }
        return info.value;
    }
    async addDevice(peer: BdtPeer){
        let param = {
            peerName: this.m_peerName,
        };
        this.m_interface.getLogger().info( `${this.tags} addDevice ${peer.tags} `);
        let info = await this.m_interface.callApi('addDevice',  peer.peerinfo, param, this.m_agentid, 0);
        if (info.err) {
            this.m_interface.getLogger().error(`addDevice failed,err=${info.value.log}`);
            return {err:info.err,conn:undefined};
        }
        return info
    }


    protected _findConn(connName: string): BdtConnection | null {
        for (let i = 0; i < this.m_conns.length; i++) {
            if (this.m_conns[i].connName === connName) {
                return this.m_conns[i];
            }
        }

        return null;
    }
}


export class BdtProxy {
    private m_interface: TaskClientInterface;
    private m_timeout: number;
    public m_peers: BdtPeer[] = [];
    private record : any;

    constructor(_interface: TaskClientInterface,timeout: number) {
        this.m_interface = _interface;
        this.m_timeout = timeout;
    }

    newPeer(agentid: string,tags?:string,NAT?:number): BdtPeer {
        let peer: BdtPeer = new BdtPeer({
            agentid,
            _interface: this.m_interface,
            timeout: this.m_timeout,
            tags : tags,
            NAT
        });
        peer.on('unlive', () => {
            this.m_interface.getLogger().error( `peer unlive, maybe exception`);
            //this.exit('unlive');
        });
        this.m_peers.push(peer);

        return peer;
    }
    getPeer(name:string){
        for(let i in this.m_peers){
            if(this.m_peers[i].tags! == name && this.m_peers[i].state != -1){
                return {err:0,peer:this.m_peers[i]}
            }
        }
        return {err:1}
    }

    async exit(type:string='finish') {
        
        if(type == 'unlive'){
            await sleep(5*1000);
            for (let i = 0; i < this.m_peers.length; i++) {
                if(this.m_peers[i].state == -1){
                    continue;
                }
                let err = await this.m_peers[i].destory();
            }
            this.m_interface.exit(ClientExitCode.failed,'bdt2.exe 异常退出')
        }
        for (let i = 0; i < this.m_peers.length; i++) {
            if(this.m_peers[i].state == -1){
                continue;
            }
            let err = await this.m_peers[i].destory();
            //this.m_peers.shift();
            if(err){
                return{err,log:'destory bdt peer failed'}
            }
        }
    }
}
