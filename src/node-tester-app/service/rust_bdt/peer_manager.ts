import {ErrorCode, Logger, sleep} from '../../base';
import{RandomGenerator} from "./generator"
import * as net from 'net';
import {EventEmitter} from 'events';
import { BdtLpc, BdtLpcCommand } from './lpc';
import { BdtPeer } from './peer';
import * as ChildProcess from 'child_process';
import * as os from 'os';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as SysProcess from 'process';
import {NatTypeDetector} from './detect_nattype';

import { resolve } from 'url';
import * as crypto from 'crypto';
import {request,ContentType} from "./request";

export type BdtPeerManagerOption = {
    logger: Logger;
    platform: string;
}

type PeerInfo = {
    peer?: BdtPeer;
}

export class BdtPeerManager extends EventEmitter{
    static manager?: BdtPeerManager;
    private m_server: net.Server;
    private m_localServerPort: number = 0;
    private m_logger: Logger;
    private m_peerIndex: number = 1;
    private m_peers: Map<string, PeerInfo>;
    private m_platform: string;
    private m_lpcStatus : boolean;
    private buffer_1M : Buffer ;
    private is_perf : boolean = false;

    on(event: 'peer', listener: (peer: BdtPeer) => void): this;
    on(event: 'unlive', listener: (peerName: string) => void): this;
    on(event: 'accept', listener: (connName:string,peerName: string,question:string) => void):this;
    on(event: 'recv_datagram', listener: (name:string,remote_id: string,sequence:string,hash:string,content:Buffer) => void):this;
    on(event: string, listener: (...args: any[]) => void): this {
        super.on(event, listener);
        return this;
    }

    once(event: 'peer', listener: (peer: BdtPeer) => void): this;
    once(event: 'unlive', listener: (peerName: string) => void): this;
    once(event: 'accept', listener: (connName:string,peerName: string,question:string) => void):this;
    once(event: 'recv_datagram', listener: (name:string,remote_id: string,sequence:string,hash:string,content:Buffer) => void):this;
    once(event: string, listener: (...args: any[]) => void): this {
        super.once(event, listener);
        return this;
    }

    static createInstance(logger: Logger, platform: string): BdtPeerManager {
        if (!BdtPeerManager.manager) {
            BdtPeerManager.manager = new BdtPeerManager({logger, platform});
        }
        return BdtPeerManager.manager;
    }

    constructor(options: BdtPeerManagerOption) {
        super();
        this.m_server = net.createServer();
        this.m_logger = options.logger;
        this.m_peers = new Map();
        this.m_platform = options.platform;
        this.m_lpcStatus = false;
        this.buffer_1M =  new Buffer (RandomGenerator.string(1000*1000))
        
    }
    async stopBdtWin32(){
        return new Promise(async(v)=>{
            console.info(`触发 stopBdt`)
            let process = ChildProcess.exec(`taskkill /f /t /im bdt_tools.exe`)
            process.on('exit', (code: number, singal: any)=> {
                //console.info(`stopZoneSimulator exit,pid = ${this.pid}`);
                v('');

            });
            process.stdout?.on('data', (data) => {
                let str:string = `${data.toString()}`;
                //console.info(`stopZoneSimulator output ${str}`)
            });
        })
        
    }
    async stopBdtLinux(){
        return new Promise(async(v)=>{
            console.info(`触发 stopBdt`)
            let process = ChildProcess.exec(`sudo kill -9 $(pidof bdt_tools)`)
            process.on('exit', (code: number, singal: any)=> {
                //console.info(`stopZoneSimulator exit,pid = ${this.pid}`);
                v('');

            });
            process.stdout?.on('data', (data) => {
                let str:string = `${data.toString()}`;
                //console.info(`stopZoneSimulator output ${str}`)
            });
        })
        
    }
    async init(): Promise<ErrorCode> {
        if (this.m_platform === 'win32') {
            await this.stopBdtWin32();
        }else if (this.m_platform === 'linux'){
            await this.stopBdtLinux();
        }
        // listen错误， 端口冲突会触发
        this.m_server.on('connection', (socket: net.Socket) => {
            let lpc: BdtLpc = new BdtLpc({
                logger: this.m_logger,
            });
            
            let onCommand = (l: BdtLpc, c: BdtLpcCommand) => {
                if (c.json.name !== 'started') {
                    this.m_logger.error(`peer manager start bdtpeer failed, for first command not 'started'`);
                } else {
                    let info = this.m_peers.get(c.json.peer_name);
                    if (info) {
                        let peer: BdtPeer = new BdtPeer({
                            logger: this.m_logger,
                            name: c.json.peer_name,
                        });
                        peer.initFromLpc(lpc);
                        this._initPeer(peer);
                        

                        lpc.on('close', (l: BdtLpc, err: boolean) => {
                            this.emit('unlive', c.json.peer_name);
                            this.m_logger.error(`peer manager delete peer name=${peer.name}`);
                            this.m_peers.delete(c.json.peer_name);
                            this.m_logger.info(`peer manager peers ${this.m_peers}`);
                            this.m_lpcStatus = false;
                            
                        });
                        lpc.on('error', () => {
                            this.emit('unlive', c.json.peer_name);
                            this.m_peers.delete(c.json.peer_name);
                            this.m_lpcStatus = false;
                            
                        });
    
                        info.peer = peer;
                        this.emit('peer', peer);
                    }
                }
            };
            lpc.once('command', onCommand);

            lpc.initFromListener(socket);
        });
        this.m_server.on('error', (error: Error) => {
            this.m_logger.info(`local server init failed for net error, error=${error}`);
        });

        await new Promise<ErrorCode>((v) => {
            this.m_server.once('listening', () => {
                this.m_localServerPort = (this.m_server.address() as net.AddressInfo).port!;
                this.m_logger.error(`============, port=${this.m_localServerPort}`);
                v(ErrorCode.succ);
            });
            this.m_server.listen();
        });
        
        return ErrorCode.succ;
    }

    async startPeer(logType:string = 'trace'): Promise<{err: ErrorCode, peerName?: string}> {
        let exefile: string = '';
        this.m_logger.info(`os type ${os.arch()}`)
        this.m_logger.info(`os type ${this.m_platform }`)
        let bdt_tools;
        if (this.m_platform === 'win32') {
            //await this.stopBdtWin32();
            exefile = 'bdt-tools.exe';
            bdt_tools = path.join(SysProcess.cwd(), `bdt-tools.exe`)
        } else if (this.m_platform === 'linux') {
            exefile = 'bdt-tools';
            //添加执行权限
            //await this.stopBdtLinux();
            bdt_tools = path.join(SysProcess.cwd(), `bdt-tools`)
            await ChildProcess.exec(`chmod +x ${bdt_tools}`, { cwd: path.dirname(bdt_tools)})
        } else if (this.m_platform === 'hiwifi') {
            exefile = 'bdt2_hiwifi';
        } else if(os.arch() == 'arm') {
            exefile = 'bdt2_android32';
            //添加执行权限
            bdt_tools = path.join(SysProcess.cwd(), `bdt2_android32`)
            await ChildProcess.exec(`chmod +x ${bdt_tools}`, { cwd: path.dirname(bdt_tools)})
        }else if(os.arch() == 'arm64') {
            exefile = 'bdt2_android64';
            //添加执行权限
            bdt_tools = path.join(SysProcess.cwd(), `bdt2_android64`)
            await ChildProcess.exec(`chmod +x ${bdt_tools}`, { cwd: path.dirname(bdt_tools)})
        } else {
            exefile = 'bdt-tools';
            //添加执行权限
            bdt_tools = path.join(SysProcess.cwd(), `bdt_tools`)
            await ChildProcess.exec(`chmod +x ${bdt_tools}`, { cwd: path.dirname(bdt_tools)})
        }
        if(await fs.pathExistsSync(path.join(SysProcess.cwd(), '32bit.cfg'))){
            exefile =  'bdt2_32.exe'
        }
        this.m_logger.info(`bdt path ${bdt_tools}`)
        let peerName: string = `${RandomGenerator.string(32)}`;
        if(this.m_platform != 'localhost'){
            let sub = ChildProcess.spawn(`${path.join(SysProcess.cwd(), exefile)}`, [this.m_localServerPort.toString(), peerName, this.m_logger.dir()], {stdio: 'ignore', cwd: SysProcess.cwd(), detached: true, windowsHide: true,env:{CYFS_CONSOLE_LOG_LEVEL:`${logType}`,CYFS_FILE_LOG_LEVEL_KEY:`${logType}`,RUST_LOG:`${logType}`}});
            //let sub = ChildProcess.spawn(`${path.join(SysProcess.cwd(), exefile)}`, [this.m_localServerPort.toString(), peerName, this.m_logger.dir()], {stdio: 'ignore', cwd: SysProcess.cwd(), detached: false, windowsHide: false,env:{CYFS_CONSOLE_LOG_LEVEL:`${logType}`,CYFS_FILE_LOG_LEVEL_KEY:`${logType}`,RUST_LOG:`${logType}`}});
            sub.unref();
        }else{
            this.m_logger.info(`${this.m_localServerPort.toString()} ${peerName} ${this.m_logger.dir()}`);
            this.m_logger.info(peerName);
            this.m_logger.info(this.m_logger.dir());
            await sleep(10000)
            
        }
        
       
        this.m_peers.set(peerName, {});
        this.m_lpcStatus = true;
        
        return {err: ErrorCode.succ, peerName};
    }
    
    async destoryPeer(peerName: string): Promise<{err: ErrorCode}> {
        this.m_lpcStatus = false;
        this.m_logger.info(`destoryPeer ${peerName}`)
        await this.stopReport();
        if (!this.m_peers.has(peerName)) {
            return {err: ErrorCode.notExist};
        }
        await sleep(2000);
        this.m_peers.get(peerName)!.peer!.destory();
        //删除peer,避免向bdt协议栈继续发生请求
        this.m_peers.delete(peerName)
        return {err: ErrorCode.succ};
    }
    async stopReport(): Promise<{err: ErrorCode}>{
        this.is_perf = false;
        return {err: ErrorCode.succ};
    }
    async reportSystemInfo(agent:string, time:number=5000,testcaseId?:string): Promise<{err: ErrorCode}>{
        if(this.is_perf){
            return {err: ErrorCode.succ};
        }
        if(this.m_peers.size == 0){
            console.error(`reportSystemInfo not peer`)
            return {err: ErrorCode.fail};
        }
        this.m_peers.forEach(async(value: PeerInfo, key: string, map: Map<string, PeerInfo>)=>{
            this.m_logger.info(`peerInfo: ${key}  ${value}`)
            if(value.peer && this.is_perf == false){
                this.is_perf = true;
                while(this.is_perf){
                    let info =await  value.peer!.getSystemInfo();
                    if(info.err){
                        return {err: ErrorCode.fail}
                    }
                    let perf = {
                        name:agent,
                        testcaseId:testcaseId,
                        cpu_usage: info.cpu_usage!, 
                        total_memory: info.total_memory!, 
                        used_memory:info.used_memory!, 
                        received_bytes: info.received_bytes!, 
                        transmitted_bytes: info.transmitted_bytes!, 
                        ssd_disk_total:info.ssd_disk_total!, 
                        ssd_disk_avail: info.ssd_disk_avail!, 
                        hdd_disk_total: info.hdd_disk_total!, 
                        hdd_disk_avail:info.hdd_disk_avail!, 
                    }
                    this.m_logger.info(`### send SystemInfo to http ${perf}`)
                    let result =  await request("POST","api/base/system_info/report",JSON.stringify(perf),ContentType.json);
                    this.m_logger.info(JSON.stringify(result))
                    await sleep(time)
                }
            }
        })        
        return {err: ErrorCode.succ};
       
    }

    getPeerLogDir(peerName: string): string {
        return '';
    }

    async connect(peerName: string, remote: Buffer, question: string, known_eps: boolean,accept_answer: boolean, remote_sn?: string): Promise<{err: ErrorCode, connName?: string,time?:number,answer?: string}> {
        if (!this.m_peers.has(peerName)) {
            return {err: ErrorCode.notExist};
        }

        return await this.m_peers.get(peerName)!.peer!.connect(remote, question, known_eps, accept_answer,remote_sn);
    }

    async autoAccept(peerName: string,answer?:string): Promise<{err: ErrorCode}> {
        if (!this.m_peers.has(peerName)) {
            return {err: ErrorCode.notExist};
        }
        this.m_peers.get(peerName)!.peer!.autoAccept(async(connName,name,question: string)=>{
            this.m_logger.info(`${peerName} accept event autoAccept ${name}`)
            if(peerName == name){
                this.emit('accept', connName,peerName,question);
                this.m_logger.info(`${name} emit autoAccept ${connName},${peerName}`)
            }
            
        },answer);
        return {err: ErrorCode.succ}
    }

    async accept(peerName: string): Promise<{err: ErrorCode, question?: string, connName?: string}> {
        if (!this.m_peers.has(peerName)) {
            return {err: ErrorCode.notExist};
        }

        return await this.m_peers.get(peerName)!.peer!.accept();
    }

    async confirm(peerName: string, connName: string, answer: string): Promise<{err: ErrorCode}> {
        if (!this.m_peers.has(peerName)) {
            return {err: ErrorCode.notExist};
        }

        return await this.m_peers.get(peerName)!.peer!.confirm(connName, answer);
    }
    async set_answer(peerName: string,answer: string): Promise<{err: ErrorCode}> {
        if (!this.m_peers.has(peerName)) {
            return {err: ErrorCode.notExist};
        }

        return await this.m_peers.get(peerName)!.peer!.set_answer(answer);
    }
    async close(peerName: string, connName: string, which: string): Promise<{err: ErrorCode}> {
        this.m_lpcStatus = false;
        if (!this.m_peers.has(peerName)) {
            return {err: ErrorCode.notExist};
        }

        return await this.m_peers.get(peerName)!.peer!.close(connName, which);
    }

    async reset(peerName: string, connName: string): Promise<{err: ErrorCode}> {
        if (!this.m_peers.has(peerName)) {
            return {err: ErrorCode.notExist};
        }

        return await this.m_peers.get(peerName)!.peer!.reset(connName);
    }

    async send_object(peerName: string, connName: string, object_id: string,obj_type:number): Promise<{err: ErrorCode, time?: number, hash?: string}> {
        if (!this.m_peers.has(peerName)) {
            return {err: ErrorCode.notExist};
        }
        let object_path = path.join(this.m_logger.dir(),`../${peerName}_obj`);
        if(obj_type == 1){
            object_path = path.join(object_path,"chunk_obj",object_id)
        }else if(obj_type == 2){
            object_path = path.join(object_path,"file_obj",object_id)
        }else if(obj_type == 3){
            object_path = path.join(object_path,"dir_obj",object_id)
        }else if(obj_type == 4){
            object_path = path.join(object_path,"dir_map",object_id)
        }

        return await this.m_peers.get(peerName)!.peer!.send_object(connName, object_path,obj_type);
    }

    async recv_object(peerName: string, connName: string,objPath: string,object_id?:string): Promise<{err: ErrorCode, size?: number, hash?: string}> {
        if (!this.m_peers.has(peerName)) {
            return {err: ErrorCode.notExist};
        }
        let obj_path = path.join(this.m_logger.dir(),`../${peerName}_obj`);
        let file_obj_path = path.join(this.m_logger.dir(),`../${peerName}_obj/file_obj`);
        let dir_obj_path = path.join(this.m_logger.dir(),`../${peerName}_obj/dir_obj`);
        let dir_map_path = path.join(this.m_logger.dir(),`../${peerName}_obj/dir_map`);
        if(!fs.pathExistsSync(obj_path)){
            fs.mkdirpSync(obj_path)
        }
        if(!fs.pathExistsSync(file_obj_path)){
            fs.mkdirpSync(file_obj_path)
         }
         if(!fs.pathExistsSync(dir_obj_path)){
            fs.mkdirpSync(dir_obj_path)
        }
        if(!fs.pathExistsSync(dir_map_path)){
            fs.mkdirpSync(dir_map_path)
        }
        let runresp =  this.m_peers.get(peerName)!.peer!.recv_object(connName,obj_path);
        
        let resp = await runresp;
        if(object_id && resp.object_id && object_id != resp.object_id){
            this.m_logger.error(`recv object error ${object_id} !=  ${resp.object_id}`)
        }
        return resp
    }

    async send(peerName: string, connName: string, fileSize: number): Promise<{err: ErrorCode, time?: number, hash?: string}> {
        if (!this.m_peers.has(peerName)) {
            return {err: ErrorCode.notExist};
        }

        return await this.m_peers.get(peerName)!.peer!.send(connName, fileSize);
    }

    async recv(peerName: string, connName: string): Promise<{err: ErrorCode, size?: number, hash?: string}> {
        if (!this.m_peers.has(peerName)) {
            return {err: ErrorCode.notExist};
        }

        return await this.m_peers.get(peerName)!.peer!.recv(connName);
    }


    async getNatType():Promise<{err: ErrorCode,natInfo:string}>{
        //console.log('开始nat类型检测');
        let detector = new NatTypeDetector('dfsgshssd');
        let result = await detector.detect();
        //console.log(JSON.stringify(result));
        return {err:ErrorCode.succ,natInfo:JSON.stringify(result)}
    }

    async getIPInfo():Promise<{err: ErrorCode,ipInfo:any}>{
        var interfaces = require('os').networkInterfaces();
        this.m_logger.info(interfaces)
        var IPv4List:Array<string> = []
        var IPv6List:Array<string> = []
        for(var devName in interfaces){
            var iface = interfaces[devName];
            for(var i=0;i<iface.length;i++){
                var alias = iface[i];
                if( alias.family == 'IPv4' && alias.address !== '127.0.0.1' ){ //&& !alias.internal
                    IPv4List.push(alias.address);
                }
                if( alias.family == 'IPv6' && alias.address !== '127.0.0.1' ){ //&& !alias.internal
                    IPv6List.push(alias.address);
                }
            }
        }
        return {err:ErrorCode.succ,ipInfo:{IPv4:IPv4List,IPv6:IPv6List,platform:this.m_platform}};
    }

    async setChunk(peerName: string, content: Buffer): Promise<{err: ErrorCode, chunkid?: string}> {
        if (!this.m_peers.has(peerName)) {
            return {err: ErrorCode.notExist};
        }

        return await this.m_peers.get(peerName)!.peer!.setChunk(content);
    }

    async interestChunk(peerName: string, remote: Buffer, chunkid: string): Promise<{err: ErrorCode}> {
        if (!this.m_peers.has(peerName)) {
            return {err: ErrorCode.notExist};
        }

        return await this.m_peers.get(peerName)!.peer!.interestChunk(remote, chunkid);
    }

    async checkChunk(peerName: string, chunkid: string): Promise<{err: ErrorCode, state?: string}> {
        if (!this.m_peers.has(peerName)) {
            return {err: ErrorCode.notExist};
        }

        return await this.m_peers.get(peerName)!.peer!.checkChunk(chunkid);
    }
    async interestChunkList(peerName: string, remote: Buffer,chunk_list: Array<{chunk_id:string}>,timeout:number = 5*60*1000 ):Promise<{err:ErrorCode,log?:string,
        session?:string,state?:string,time?:number,record?:Array<{time:number,speed:string,progress:string}>}> {
        if (!this.m_peers.has(peerName)) {
            return {err: ErrorCode.notExist};
        }
        let start  =Date.now();
        let record:Array<{time:number,speed:string,progress:string}> = [{time:Date.now(),speed:"0",progress:"0"}];
        let download =  await this.m_peers.get(peerName)!.peer!.interestChunkList(remote, chunk_list);
        if(download.err){
            return download;
        }
        let sleeptime = 100;
        while(timeout>Date.now()-start){
            if(!this.m_peers.has(peerName)){ //|| this.m_lpcStatus === false
                return {err: ErrorCode.notExist,log:'bdt节点异常'};
            }
            let check =  await this.m_peers.get(peerName)!.peer!.checkChunkList(download.session!)
            // 下载完成
            if(check.state == "Ready"){
                let runtime = Date.now()-start;
                record.push({time:Date.now(),speed:"0",progress:"100"})
                return {err:ErrorCode.succ,session:download.session ,state:check.state,time:runtime*1000,record:record}
            }
            if(check.state?.includes("OnAir")){
                record.push({
                    time: Date.now(),
                    speed : check.state!.split("(")[1].split(")")[0].split(",")[0],
                    progress:check.state!.split("(")[1].split(")")[0].split(",")[1]
                })
            }
            //设置休眠时间
            if(sleeptime>1000){
                await sleep(1000)
            }else{
                await sleep(sleeptime);
                sleeptime = sleeptime*2;
            }     
        }
        return {err:ErrorCode.timeout,log:"download chunk list timeout"}
    }

    async chunkSendFile(peerName:string , fileSize:number,save:boolean=false): Promise<{err: ErrorCode, chunkid?: string,time?:number,size?:number,log?:string}>{
        if (!this.m_peers.has(peerName)) {
            return {err: ErrorCode.notExist};
        }
        let seq = RandomGenerator.string(10);
        this.m_logger.info(`${seq} ${peerName} set chunk begin`)
        try {
            let randBuffer = new Buffer('');     
            while(fileSize>1024*1024){
                randBuffer = Buffer.concat([randBuffer,new Buffer ( RandomGenerator.string(24288)),this.buffer_1M,new Buffer ( RandomGenerator.string(24288)) ]);
                fileSize = fileSize - 1024*1024;
                this.m_logger.info(`${seq} add buffer 1024*1024 `)
                await sleep(50);
            }
            randBuffer = Buffer.concat([randBuffer,new Buffer (RandomGenerator.string(fileSize))])
            
            //将chunk文件存放在 /blog/chunkFiles 目录下
            if(!fs.existsSync(path.join(this.m_logger.dir(),`chunkFiles_${peerName}`))){
                
                await fs.mkdirSync(path.join(this.m_logger.dir(),`chunkFiles_${peerName}`));
            }
            let saveLog = 'not save'
            if(save){
                let fileName = RandomGenerator.string(10)
                this.m_logger.info(`save buffer to file ${fileName}.txt`)
                
                fs.writeFile(path.join(this.m_logger.dir(),`chunkFiles_${peerName}`,`./${fileName}.txt`), randBuffer, function(err){
                    if(err){
                        saveLog = String(err)
                    }else {
                        saveLog = 'save file success'
                    }
                })
            }
            this.m_logger.info(`save log :${saveLog}`)
            let start = new Date().getTime() ;
            let info = await this.setChunk(peerName,randBuffer);
            let end = new Date().getTime() ;
            return {err:info.err,chunkid:info.chunkid,time:(end-start)*1000,size:randBuffer.length}
        } catch (error) { 
            //异常退出
            this.m_logger.error(error);
            return{err:ErrorCode.exception,log:'create buffer failed'}
        }      

    }
    async chunkRecvFile(peerName: string, remote: Buffer, chunkid: string,timeout:number): Promise<{err: ErrorCode, log?:string,state?: string,time?:number,chunkid?:string}>{
        if(!this.m_peers.has(peerName)){ //|| this.m_lpcStatus === false
            return {err: ErrorCode.notExist,log:'bdt节点异常'};
        }
        let start = new Date().getTime() ;
        let end = new Date().getTime() ;
        let info = await this.m_peers.get(peerName)!.peer!.interestChunk(remote, chunkid);
        if(info.err!=ErrorCode.succ){
            return info
        }
        while(Date.now() < start+timeout){
            await sleep(500)
            this.m_logger.info(`${peerName} check peer state ${this.m_peers.has(peerName)}`)
            if(!this.m_peers.has(peerName)){ //|| this.m_lpcStatus === false
                return {err: ErrorCode.notExist,log:'bdt节点异常'};
            }
            let check = await this.m_peers.get(peerName)!.peer!.checkChunk(chunkid);
            if(check.err){
                this.m_logger.info(`checkchunk failed ,${JSON.stringify(check)}`)
                return {err: ErrorCode.fail};
            }
            if(check.state === 'Ready'){
                end = new Date().getTime();
                this.m_logger.info(`checkchunk chunk recv file success ,${JSON.stringify(check)}`)
                return {err:check.err,state:check.state,time:(end -start)*1000,chunkid:chunkid}
            }
        }
        return {err:ErrorCode.timeout,log:'运行超时退出'}
    }
    async startSendFile(peerName:string , fileSize:number,save:boolean=true,localFileName?:string,chunkSize?:number): Promise<{err:ErrorCode,log?:string,fileName?:string,
        session?:string,fileObject?:Buffer,time?:number,md5?:string,size?:number}>{
        if (!this.m_peers.has(peerName)) {
            return {err: ErrorCode.notExist};
        }
        let seq = RandomGenerator.string(10);
        this.m_logger.info(`${seq} ${peerName} startSendFile`)
        if(!localFileName){
            //创建文件流程
            let fileName = `${RandomGenerator.string(10)}.txt`
            let filePath = path.join(this.m_logger.dir(),`../chunkFiles_${peerName}`,`./${fileName}`)
            
            let randBuffer = new Buffer(''); 
            //设置随机字符大小，大于90M 一次生成10M左右
            let same =  new Buffer (RandomGenerator.string(1000*1000)) 
            if(fileSize>90*1024*1024){
                same = new Buffer (RandomGenerator.string(10*1000*1000)) 
            }   
            
            //将chunk文件存放在 /blog/chunkFiles 目录下
            if(!fs.existsSync(path.join(this.m_logger.dir(),`../chunkFiles_${peerName}`))){
                await fs.mkdirSync(path.join(this.m_logger.dir(),`../chunkFiles_${peerName}`));
            }
            //保存测试文件
            while(fileSize>(same.length+48576)){
                randBuffer = Buffer.concat([randBuffer,new Buffer ( RandomGenerator.string(24288)),same,new Buffer ( RandomGenerator.string(24288))]);
                 await fs.appendFileSync(filePath,randBuffer)
                fileSize = fileSize - randBuffer.length;
                this.m_logger.info(`${seq} add buffer ${randBuffer.length} `)
                await sleep(50);
            }
            await fs.appendFileSync(filePath,new Buffer (RandomGenerator.string(fileSize)))
            
            //计算文件hash
            let fsHash = crypto.createHash('md5')
            let fileInfo = fs.readFileSync(filePath)
            fsHash.update(fileInfo)
            let md5 = fsHash.digest('hex')
            // sendFile 运行
            let start = new Date().getTime() ;
            let info = await this.m_peers.get(peerName)!.peer!.startSendFile(filePath,chunkSize)
            let end = new Date().getTime() ;
            return {err:info.err,time:(end-start)*1000,size:randBuffer.length,session:info.session,fileObject:info.file,md5:md5,fileName:fileName}
        }else{ 
            //发送本地已有文件
             //计算文件hash
             let filePath = path.join(this.m_logger.dir(),`../chunkFiles_${peerName}`,`./${localFileName}`)
             let fsHash = crypto.createHash('md5')
             let fileInfo = fs.readFileSync(filePath)
             fsHash.update(fileInfo)
             let md5 = fsHash.digest('hex')
             // sendFile 运行
             let start = new Date().getTime() ;
             let info = await this.m_peers.get(peerName)!.peer!.startSendFile(filePath,chunkSize)
             let end = new Date().getTime() ;
             return {err:info.err,time:(end-start)*1000,size:fileInfo.length,session:info.session,fileObject:info.file,md5:md5,fileName:localFileName}
        }      

    }
    async startSendLocalFile(peerName:string , fileName:string): Promise<{err:ErrorCode,log?:string,fileName?:string,
        session?:string,fileObject?:Buffer,time?:number,md5?:string,size?:number}>{
        if (!this.m_peers.has(peerName)) {
            return {err: ErrorCode.notExist};
        }
        let filePath = path.join(__dirname,fileName);
        //计算文件hash
        let fsHash = crypto.createHash('md5')
        let fileInfo = fs.readFileSync(filePath)
        fsHash.update(fileInfo)
        let md5 = fsHash.digest('hex')
        // sendFile 运行
        let start = new Date().getTime() ;
        let info = await this.m_peers.get(peerName)!.peer!.startSendFile(filePath)
        let end = new Date().getTime() ;
        return {err:info.err,time:(end-start)*1000,size:fileInfo.length,session:info.session,fileObject:info.file,md5:md5,fileName:fileName}
    }
    async startDownloadFile(peerName: string,fileName:string,file:Buffer,remote:string,timeout:number,secondPeerId?:string): Promise<{err:ErrorCode,log?:string,
        session?:string,state?:string,time?:number,md5?:string,record?:Array<{time:number,speed:string,progress:string}>}>{
        if(!this.m_peers.has(peerName)){ //|| this.m_lpcStatus === false
            return {err: ErrorCode.notExist,log:'bdt节点异常'};
        }
        //将chunk文件存放在 /blog/chunkFiles 目录下
        if(!fs.existsSync(path.join(this.m_logger.dir(),`../chunkFiles_${peerName}`))){
            await fs.mkdirSync(path.join(this.m_logger.dir(),`../chunkFiles_${peerName}`));
        }
        //保存文件路径
        let filePath = path.join(this.m_logger.dir(),`../chunkFiles_${peerName}`,fileName)
        let start = Date.now();
        this.m_logger.info(`下载file 对象数据 :${file}`) 
        let info = await this.m_peers.get(peerName)!.peer!.startDownloadFile(remote,filePath,file,secondPeerId);
        if(info.err){
            this.m_logger.error(`${peerName} download_file start failed`) 
            return{err:info.err,log:`${peerName} download_file start failed`}
        }
        let record:Array<{time:number,speed:string,progress:string}> = [{time:Date.now(),speed:"0",progress:"0"}];
        let sleeptime = 100;
        while(timeout>Date.now()-start){
            if(!this.m_peers.has(peerName)){ //|| this.m_lpcStatus === false
                return {err: ErrorCode.notExist,log:'bdt节点异常'};
            }
            let check =  await this.m_peers.get(peerName)!.peer!.downloadFileState(info.session!)
            // 下载完成
            if(check.state == "Ready"){
                let runtime = Date.now()-start;
                 //计算文件md5值
                let fsHash = crypto.createHash('md5')
                let fileInfo = fs.readFileSync(filePath)
                fsHash.update(fileInfo)
                let md5 = fsHash.digest('hex')
                record.push({time:Date.now(),speed:"0",progress:"100"})
                return {err:ErrorCode.succ,state:check.state,time:runtime*1000,md5:md5,record:record}
            }
            if(check.state?.includes("OnAir")){
                record.push({
                    time: Date.now(),
                    speed : check.state!.split("(")[1].split(")")[0].split(",")[0],
                    progress:check.state!.split("(")[1].split(")")[0].split(",")[1]
                })
            }
            //设置休眠时间
            if(sleeptime>1000){
                await sleep(1000)
            }else{
                await sleep(sleeptime);
                sleeptime = sleeptime*2;
            }     
        }
        return {err:ErrorCode.timeout,log:"download file timeout"}
    }
    async startDownloadFileRange(peerName: string,fileName:string,file:Buffer,remote:string,timeout:number,ranges?:Array<{begin:number,end:number}>,secondPeerId?:string): Promise<{err:ErrorCode,log?:string,
        session?:string,state?:string,time?:number,md5?:string,record?:Array<{time:number,speed:string,progress:string}>}>{
        if(!this.m_peers.has(peerName)){ //|| this.m_lpcStatus === false
            return {err: ErrorCode.notExist,log:'bdt节点异常'};
        }
        //将chunk文件存放在 /blog/chunkFiles 目录下
        if(!fs.existsSync(path.join(this.m_logger.dir(),`../chunkFiles_${peerName}`))){
            await fs.mkdirSync(path.join(this.m_logger.dir(),`../chunkFiles_${peerName}`));
        }
        //保存文件路径
        let filePath = path.join(this.m_logger.dir(),`../chunkFiles_${peerName}`,fileName)
        let start = Date.now();
        this.m_logger.info(`下载file 对象数据 ,文件：${filePath} range = ${JSON.stringify(ranges)}`) 
        let info = await this.m_peers.get(peerName)!.peer!.startDownloadFileRange(remote,filePath,file,ranges,secondPeerId);
        if(info.err){
            this.m_logger.error(`${peerName} download_file start failed`) 
            return{err:info.err,log:`${peerName} download_file start failed`}
        }
        let record:Array<{time:number,speed:string,progress:string}> = [{time:Date.now(),speed:"0",progress:"0"}];
        let sleeptime = 100;
        while(timeout>Date.now()-start){
            if(!this.m_peers.has(peerName)){ //|| this.m_lpcStatus === false
                return {err: ErrorCode.notExist,log:'bdt节点异常'};
            }
            let check =  await this.m_peers.get(peerName)!.peer!.downloadFileState(info.session!)
            // 下载完成
            if(check.state == "Ready"){
                let runtime = Date.now()-start;
                 //计算文件md5值
                let fsHash = crypto.createHash('md5')
                let fileInfo = fs.readFileSync(filePath)
                fsHash.update(fileInfo)
                let md5 = fsHash.digest('hex')
                record.push({time:Date.now(),speed:"0",progress:"100"})
                return {err:ErrorCode.succ,state:check.state,time:runtime*1000,md5:md5,record:record}
            }
            if(check.state?.includes("OnAir")){
                record.push({
                    time: Date.now(),
                    speed : check.state!.split("(")[1].split(")")[0].split(",")[0],
                    progress:check.state!.split("(")[1].split(")")[0].split(",")[1]
                })
            }
            //设置休眠时间
            if(sleeptime>1000){
                await sleep(1000)
            }else{
                await sleep(sleeptime);
                sleeptime = sleeptime*2;
            }     
        }
        return {err:ErrorCode.timeout,log:"download file timeout"}
    }
    async startSendDir(peerName:string ,dirPath:string,fileNum:number,fileSize:number,chunkSize:number): Promise<{err:ErrorCode,log?:string,
        session?:string,dir_id?:string,time?:number,dir_obj_path?:string,dir_map_buffer?:Buffer}>{
        if (!this.m_peers.has(peerName)) {
            return {err: ErrorCode.notExist};
        }
        let dir_path = path.join(this.m_logger.dir(),`../${dirPath}`);
        
        if(!fs.pathExistsSync(dir_path)){
            await RandomGenerator.createRandomDir(dir_path,0,fileNum,fileSize);
            await sleep(50);
        }
        let obj_path = path.join(this.m_logger.dir(),`../${peerName}_obj`);
        let file_obj_path = path.join(this.m_logger.dir(),`../${peerName}_obj/file_obj`);
        let dir_obj_path = path.join(this.m_logger.dir(),`../${peerName}_obj/dir_obj`);
        let dir_map_path = path.join(this.m_logger.dir(),`../${peerName}_obj/dir_map`);
        if(!fs.pathExistsSync(obj_path)){
            fs.mkdirpSync(obj_path)
        }
        if(!fs.pathExistsSync(file_obj_path)){
            fs.mkdirpSync(file_obj_path)
         }
         if(!fs.pathExistsSync(dir_obj_path)){
            fs.mkdirpSync(dir_obj_path)
        }
        if(!fs.pathExistsSync(dir_map_path)){
            fs.mkdirpSync(dir_map_path)
        }
        let start  = Date.now();
        let info = await this.m_peers.get(peerName)!.peer!.startSendDir(dir_path,chunkSize,obj_path)
        let end = Date.now();
        let dir_map = info.dir_map;
        let dir_map_str = "";
        for(let i in dir_map){
            dir_map_str = dir_map_str + `${dir_map[Number(i)].name!},${dir_map[Number(i)].file_id!}\n`;
        }
        let dir_map_buffer = Buffer.from(dir_map_str)
        return {err:info.err,time:(end-start)*1000,session:info.session,dir_id:info.dir_id,dir_obj_path:obj_path,dir_map_buffer}
    }
    async startDownloadDir(peerName: string,dirName:string,dir_map_buffer:Buffer,dir_id:string,remote:string,timeout:number,secondPeerId?:string): Promise<{err:ErrorCode,log?:string,
        session?:string,state?:string,time?:number,record?:Array<{time:number,speed:string,progress:string}>}>{
        if(!this.m_peers.has(peerName)){ //|| this.m_lpcStatus === false
            return {err: ErrorCode.notExist,log:'bdt节点异常'};
        }
        
        //保存文件路径
        let dirPath = path.join(this.m_logger.dir(),`../${dirName}`)
        //将chunk文件存放在 /blog/chunkFiles 目录下
        if(!fs.existsSync(dirPath)){
            await fs.mkdirSync(dirPath);
        }
        // obj 缓存路径
        let obj_path = path.join(this.m_logger.dir(),`../${peerName}_obj`);
        let file_obj_path = path.join(this.m_logger.dir(),`../${peerName}_obj/file_obj`);
        let dir_obj_path = path.join(this.m_logger.dir(),`../${peerName}_obj/dir_obj`);
        let dir_map_path = path.join(this.m_logger.dir(),`../${peerName}_obj/dir_map`);
        if(!fs.pathExistsSync(obj_path)){
            fs.mkdirpSync(obj_path)
        }
        if(!fs.pathExistsSync(file_obj_path)){
            fs.mkdirpSync(file_obj_path)
         }
         if(!fs.pathExistsSync(dir_obj_path)){
            fs.mkdirpSync(dir_obj_path)
        }
        if(!fs.pathExistsSync(dir_map_path)){
            fs.mkdirpSync(dir_map_path)
        }
        // 获取 dir_map 数据
        let dir_map_file = dir_map_buffer.toString();
        let dir_map_list = dir_map_file.split("\n");
        let dir_map:Array<{name:string,file_id:string}> = [];
        for(let i in dir_map_list){
            let name = dir_map_list[i].split(",")[0];
            let file_id = dir_map_list[i].split(",")[1];
            if(name && file_id){
                dir_map.push({name,file_id});
            }
        }
        let start = Date.now();
        this.m_logger.info(`下载 dir 对象数据 :${dir_id}`) 
        let info = await this.m_peers.get(peerName)!.peer!.startDownloadDir(remote,dirPath,dir_map,dir_id,obj_path,secondPeerId);
        if(info.err){
            this.m_logger.error(`${peerName} download_dir start failed`) 
            return{err:info.err,log:`${peerName} download_dir start failed`}
        }
        let record:Array<{time:number,speed:string,progress:string}> = [{time:Date.now(),speed:"0",progress:"0"}];
        let sleeptime = 100;
        while(timeout>Date.now()-start){
            if(!this.m_peers.has(peerName)){ //|| this.m_lpcStatus === false
                return {err: ErrorCode.notExist,log:'bdt节点异常'};
            }
            let check =  await this.m_peers.get(peerName)!.peer!.downloadDirState(info.session!)
            // 下载完成
            if(check.state == "Ready"){
                let runtime = Date.now()-start;
      
                record.push({time:Date.now(),speed:"0",progress:"100"})
                return {err:ErrorCode.succ,state:check.state,time:runtime*1000,record:record}
            }
            if(check.state?.includes("OnAir")){
                record.push({
                    time: Date.now(),
                    speed : check.state!.split("(")[1].split(")")[0].split(",")[0],
                    progress:check.state!.split("(")[1].split(")")[0].split(",")[1]
                })
            }
            //设置休眠时间
            if(sleeptime>1000){
                await sleep(1000)
            }else{
                await sleep(sleeptime);
                sleeptime = sleeptime*2;
            }     
        }
        return {err:ErrorCode.timeout,log:"download file timeout"}
    }


    async createFileSession(peerName: string,defaultHub: string ,timeout:number,fileName:string,file?:Buffer,fileSize?:number):Promise<{err:ErrorCode,log?:string,
        mds?:string,session?:string,fileObject?:Buffer,time?:number,md5?:string}>{
        //检查file 状态
        if(!this.m_peers.has(peerName)){ //|| this.m_lpcStatus === false
            return {err: ErrorCode.notExist,log:'bdt节点异常'};
        }
        //创建测试文件逻辑
        //如果传了文件大小，会创建文件
        const fileDir = path.join(this.m_logger.dir(),`../chunkFiles_${peerName}`)
        if(!fs.existsSync(fileDir)){
            await fs.mkdirSync(fileDir);
        }
        let filePath = path.join(fileDir,`${fileName}`)

        if(fileSize){
            //走第一次 file  size 创建文件流程
            let buffer_1M = RandomGenerator.string(1024*1024) 
            while(fileSize>1024*1024){
                fs.writeFileSync(filePath,buffer_1M,{ encoding:'utf-8' , mode: 438, flag: 'a+'})
                await sleep(50)
                fileSize = fileSize - 1024*1024
                this.m_logger.info(`write 1M into file `)
            }
            fs.writeFileSync(filePath,RandomGenerator.string(fileSize),{ encoding:'utf-8' , mode: 438, flag: 'a+'})

            //计算文件md5值
            let fsHash = crypto.createHash('md5')
            let fileInfo = fs.readFileSync(filePath)
            fsHash.update(fileInfo)
            let md5 = fsHash.digest('hex')
            let start =  Date.now();
            let hub =  await this.m_peers.get(peerName)!.peer!.createFileSession(defaultHub,filePath);
            if(hub.err){
                return {err:hub.err,log:"create hub error"}
            }
            return {err:hub.err,log:"create hub success",fileObject:hub.file,time:(Date.now()-start)*1000,md5:md5,session:hub.session}

        }else{
            this.m_logger.info(`file size is undefined`)
        }
        //根据 file object 创建 sesssion
        let start =  Date.now();
        let hub =  await this.m_peers.get(peerName)!.peer!.createFileSession(defaultHub,filePath,file);
        if(hub.err){
            return {err:hub.err,log:"create hub success"}
        }
        return {err:hub.err,session:hub.session,log:"create hub success",time:Date.now()-start};

    }

    async getTransSessionState(peerName: string,sesssion:string,timeout?:number):Promise<{err:ErrorCode,state?:string,log?:string}>{
        if(!this.m_peers.has(peerName)){ //|| this.m_lpcStatus === false
            return {err: ErrorCode.notExist,log:'bdt节点异常'};
        }
        let check =  await this.m_peers.get(peerName)!.peer!.getTransSessionState(sesssion);
        if(check.err){
            this.m_logger.error(`${peerName} check session state failed`)  
        }

        return check;
    }

    async startTransSession(peerName: string,session:string,fileName:string,timeout:number,options?: {enable_upload: boolean}){
        if(!this.m_peers.has(peerName)){ //|| this.m_lpcStatus === false
            return {err: ErrorCode.notExist,log:'bdt节点异常'};
        }
        //将chunk文件存放在 /blog/chunkFiles 目录下
        if(!fs.existsSync(path.join(this.m_logger.dir(),`../chunkFiles_${peerName}`))){
            await fs.mkdirSync(path.join(this.m_logger.dir(),`../chunkFiles_${peerName}`));
        }
        //保存文件路径
        let filePath = path.join(this.m_logger.dir(),`../chunkFiles_${peerName}`,fileName)
        let start = Date.now();
        // let info = await this.m_peers.get(peerName)!.peer!.startTransSession(session,options);
        // if(info.err){
        //     this.m_logger.error(`${peerName} download_file add to hub failed`) 
        //     return{err:info.err,log:"add to hub failed"}
        // }
        while(timeout>Date.now()-start){
            if(!this.m_peers.has(peerName)){ //|| this.m_lpcStatus === false
                return {err: ErrorCode.notExist,log:'bdt节点异常'};
            }
            let check =  await this.m_peers.get(peerName)!.peer!.getTransSessionState(session)
            if(check.state == "Ready"){
                 //计算文件md5值
                let fsHash = crypto.createHash('md5')
                let fileInfo = fs.readFileSync(filePath)
                fsHash.update(fileInfo)
                let md5 = fsHash.digest('hex')
                return {err:ErrorCode.succ,state:check.state,time:Date.now()-start,md5:md5}
            }
            await sleep(5000);
        }
        return {err:ErrorCode.timeout,log:"download file timeout"}
        
    }
    async addDevice(peerName:string,target:Buffer){
        if(!this.m_peers.has(peerName)){ //|| this.m_lpcStatus === false
            return {err: ErrorCode.notExist,log:'bdt节点异常'};
        }
  
        let info = await this.m_peers.get(peerName)!.peer!.addDevice(target);
        //if(info)
        //等待三秒，添加device信息
        return {err:ErrorCode.succ,log:"add device success"};
    }


    protected _initPeer(peer: BdtPeer) {
        peer.on('unlive', () => {
            this.m_logger.error(`===================peer unlive, in peer manager`);
            this.emit('unlive', peer.name);
        });
    }

    async sendDatagram(param:{peerName: string,contentSize: number,remote_id:string,plaintext:string,sequence?:string,create_time?:number,send_time?:number,author_id?:string,reservedVPort?:string}): Promise<{err: ErrorCode,hash?:string,time?:string,create_time?:string,send_time?:string,log?:string}>{
        if(!this.m_peers.has(param.peerName)){ //|| this.m_lpcStatus === false
            return {err: ErrorCode.notExist,log:'bdt节点异常'};
        }
        let content =  Buffer.from(RandomGenerator.string(param.contentSize)); 
        return await this.m_peers.get(param.peerName)!.peer!.sendDatagram(content,param.remote_id,param.plaintext,param.sequence,param.create_time,param.send_time,param.author_id,param.reservedVPort);
    }

    async recvDatagram(peerName: string,timeout:number): Promise<{err: ErrorCode}> {
        if (!this.m_peers.has(peerName)) {
            return {err: ErrorCode.notExist};
        }
        this.m_peers.get(peerName)!.peer!.recvDatagram(async(name:string,remote_id: string,sequence:string,hash:string,content:Buffer)=>{
            //this.m_logger.info(`${peerName} recv_datagram event emit`)
            if(peerName == name){
                this.m_logger.info(`${name} emit recv_datagram remote_id = ${remote_id},sequence = ${sequence}`)
                this.emit('recv_datagram', name,remote_id,sequence,hash,content);
                
            }
            
        },timeout);
        return {err: ErrorCode.succ}
    }
}


