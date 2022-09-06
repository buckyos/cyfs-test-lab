import {ErrorCode, Namespace, BufferWriter, ServiceClientInterface, Logger, sleep} from '../../base';
import{RandomGenerator} from "./generator"
import * as net from 'net';
import {EventEmitter} from 'events';
import { BdtLpc, BdtLpcCommand ,BdtLpcResp} from './lpc';
import { BdtPeer } from './peer';
import * as ChildProcess from 'child_process';
import * as os from 'os';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as SysProcess from 'process';
import * as crypto from 'crypto';



type PeerInfo = {
    peer?: BdtPeer;
}
export class BdtPeerManager extends EventEmitter{
    static manager?: BdtPeerManager;
    private m_server: net.Server;
    private m_localServerPort: number = 0;
    private m_logger: Logger;
    private m_interface:ServiceClientInterface
    private m_peerIndex: number = 1;
    private m_peers: Map<string, PeerInfo>;
    private m_platform: string;
    private m_lpcStatus : boolean;
    private is_perf : boolean = false;
    private utilTool? : UtilTool


    on(event: 'peer', listener: (peer: BdtPeer) => void): this;
    on(event: 'unlive', listener: (peerName: string) => void): this;

    on(event: string, listener: (...args: any[]) => void): this {
        super.on(event, listener);
        return this;
    }

    once(event: 'peer', listener: (peer: BdtPeer) => void): this;
    once(event: 'unlive', listener: (peerName: string) => void): this;

    once(event: string, listener: (...args: any[]) => void): this {
        super.once(event, listener);
        return this;
    }

    static createInstance(_interface:ServiceClientInterface): BdtPeerManager {
        if (!BdtPeerManager.manager) {
            BdtPeerManager.manager = new BdtPeerManager(_interface);
        }
        return BdtPeerManager.manager;
    }

    constructor(_interface:ServiceClientInterface) {
        super();
        this.m_interface = _interface;
        this.m_server = net.createServer();
        this.m_logger = _interface.getLogger();
        this.m_peers = new Map();
        this.m_platform = _interface.getPlatform();
        this.m_lpcStatus = false;   
             
    }
    async stopBdtWin32(){
        return new Promise(async(v)=>{
            this.m_logger.info(`Stop Process bdt-toools`)
            let process = ChildProcess.exec(`taskkill /f /t /im bdt-tools.exe`)
            process.on('exit', (code: number, singal: any)=> {
                v('');
            });
        })
        
    }
    async stopBdtLinux(){
        return new Promise(async(v)=>{
            this.m_logger.info(`Stop Process bdt-toools`)
            let process = ChildProcess.exec(`sudo kill -9 $(pidof bdt-tools)`)
            process.on('exit', (code: number, singal: any)=> {
                v('');
            });
        })
        
    }
    protected _initPeer(peer: BdtPeer) {
        peer.on('unlive', () => {
            this.m_logger.error(`===================peer unlive `);
            this.emit('unlive', peer.peerid);
        });
    }
    async init(): Promise<ErrorCode> {
        this.utilTool = new UtilTool(this.m_interface,this.m_logger);
        // init BdtPeerManager,must kill other bdt-tools
        if (this.m_platform === 'win32') {
            await this.stopBdtWin32();
        }else if (this.m_platform === 'linux'){
            await this.stopBdtLinux();
        }
        // listener new connection from bdt-tools
        this.m_server.on('connection', (socket: net.Socket) => {
            let lpc: BdtLpc = new BdtLpc({
                logger: this.m_logger,
            });
            
            let onCommand = (l: BdtLpc, c: BdtLpcCommand) => {
                if (c.json.name !== 'started') {
                    this.m_logger.error(`peer manager start bdtpeer failed, for first command not started`);
                } else {
                    let info = this.m_peers.get(c.json.peer_name);
                    this.m_logger.info(`recv new connection  from bdt-tools,command =  ${JSON.stringify(c.json)} `)
                    if (info) {
                        let peer: BdtPeer = new BdtPeer({
                            logger: this.m_logger,
                            peer_name: c.json.peer_name,
                        });
                        peer.initFromLpc(lpc);
                        this._initPeer(peer);
                        lpc.on('close', (l: BdtLpc, err: boolean) => {
                            this.emit('unlive', c.json.peer_name);
                            this.m_logger.error(`peer manager delete peer name=${peer.peer_name}`);
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

    async startPeer(logType:string = 'trace'): Promise<{err:ErrorCode,peerName:string}> {
        let exefile: string = '';
        this.m_logger.info(`os type ${os.arch()}`)
        this.m_logger.info(`os type ${this.m_platform }`)
        let bdt_tools;
        // test dif os type
        if (this.m_platform === 'win32') {
            exefile = 'bdt-tools.exe';
            bdt_tools = path.join(SysProcess.cwd(), exefile)
        } else if (this.m_platform === 'linux') {
            exefile = 'bdt-tools';
            bdt_tools = path.join(SysProcess.cwd(), exefile)
            await ChildProcess.exec(`chmod +x ${bdt_tools}`, { cwd: path.dirname(bdt_tools)})
        } else if (this.m_platform === 'hiwifi') {
            exefile = 'bdt-tools-hiwifi';
        } else if(os.arch() == 'arm') {
            exefile = 'bdt-tools-android32';
            bdt_tools = path.join(SysProcess.cwd(), exefile)
            await ChildProcess.exec(`chmod +x ${bdt_tools}`, { cwd: path.dirname(bdt_tools)})
        }else if(os.arch() == 'arm64') {
            exefile = 'bdt-tools-android64';
            bdt_tools = path.join(SysProcess.cwd(), exefile)
            await ChildProcess.exec(`chmod +x ${bdt_tools}`, { cwd: path.dirname(bdt_tools)})
        } else {
            exefile = 'bdt-tools';
            bdt_tools = path.join(SysProcess.cwd(), exefile)
            await ChildProcess.exec(`chmod +x ${bdt_tools}`, { cwd: path.dirname(bdt_tools)})
        }
        this.m_logger.info(`bdt path ${bdt_tools}`)
        let peerName: string = `${RandomGenerator.string(32)}`;
        let sub = ChildProcess.spawn(`${path.join(SysProcess.cwd(), exefile)}`, [this.m_localServerPort.toString(), peerName, this.m_logger.dir()], {stdio: 'ignore', cwd: SysProcess.cwd(), detached: true, windowsHide: true,env:{CYFS_CONSOLE_LOG_LEVEL:`${logType}`,CYFS_FILE_LOG_LEVEL_KEY:`${logType}`,RUST_LOG:`${logType}`}});
        sub.unref();
        this.m_peers.set(peerName, {});
        this.m_logger.info(`####bdt-tools ${peerName} start`)
        this.m_lpcStatus = true;
        let check =5
        while(check>0){
            if(this.m_peers.get(peerName)?.peer){
                return {err: ErrorCode.succ,peerName};
            } 
            await sleep(2000);
            check --
        }
        return {err: ErrorCode.timeout,peerName};
    }
    async utilRequest(command:BdtLpcCommand):Promise<BdtLpcResp>{
        return await this.utilTool!.utilRequest(command);
    }
    async sendBdtLpcCommand(command:BdtLpcCommand):Promise<BdtLpcResp>{
        if(!this.m_peers.has(command.json.peerName)){ 
            this.m_logger.error(`${command.json.peerName} not exist`)
            return {err: ErrorCode.notExist};
        }
        let result = await this.m_peers.get(command.json.peerName)!.peer!.sendBdtLpcCommand(command);
        return result;
    }
    async createBdtLpcListener(command:BdtLpcCommand):Promise<BdtLpcResp>{
        if(!this.m_peers.has(command.json.peerName)){ 
            return {err: ErrorCode.notExist};
        }
        let  peerName : string = command.json.peerName;
        let  eventName  : string = command.json.eventName;
        let result = await this.m_peers.get(peerName)!.peer!.createBdtLpcListener(command,async(eventArg)=>{
            this.m_interface.fireEvent(`${eventName}`,ErrorCode.succ,eventArg)
        });
        return result;
    }
}


export class UtilTool {
    private m_interface:ServiceClientInterface
    private m_logger: Logger;
    constructor(_interface:ServiceClientInterface,logger:Logger){
        this.m_logger = logger;
        this.m_interface = _interface;
    }

    async utilRequest(command:BdtLpcCommand):Promise<BdtLpcResp>{
        if(!command.json.name){
            return {err:ErrorCode.notFound}
        }
        switch(command.json.name){
            case "createFile" : {
                return await this.createFile(command);
            };
            case "createDir" : {
                return  await this.createDir(command);
            };
            case "md5" : {
                return await this.md5(command);
            }; 
            case "getIPInfo" : {
                return  await this.getIPInfo(command);
            };
            case "uploadLog":{
                return await this.uploadLog(command);
            };
            case "uploadCacheFile":{
                return await this.uploadCacheFile(command);
            };
            case "getCachePath":{

            }
        }
        this.m_logger.info(`#### not found utilRequest req_path `)
        return {err:ErrorCode.notFound}
    }
    async _createFile(filePath:string,fileSize:number){
        let same =  new Buffer (RandomGenerator.string(999983)) 
        if(fileSize>90*1024*1024){
            same = new Buffer (RandomGenerator.string(10*999983)) 
        }
        let randBuffer = new Buffer(''); 
        while(fileSize>(same.length+200)){
            randBuffer = Buffer.concat([randBuffer,new Buffer ( RandomGenerator.string(100)),same,new Buffer ( RandomGenerator.string(100))]);
            await fs.appendFileSync(filePath,randBuffer)
            fileSize = fileSize - randBuffer.byteLength;
            this.m_logger.info(`add buffer ${randBuffer.length} `)
            await sleep(50);
        }
        await fs.appendFileSync(filePath,new Buffer (RandomGenerator.string(fileSize)))
    }
    async _md5(filePath:string){
        let fsHash = crypto.createHash('md5')
        let fileInfo = fs.readFileSync(filePath,)
        fsHash.update(fileInfo)
        let md5 = fsHash.digest('hex')
        return md5;
    }
    async createFile(command:BdtLpcCommand):Promise<BdtLpcResp>{
        if(!command.json.fileSize || !command.json.peerName){
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`)
            return {err:ErrorCode.unknownCommand}
        }
        let peer = this._peerCachePath(command.json.peerName)
        let fileName = `${RandomGenerator.string(10)}.txt`
        let fileSize : number = command.json.fileSize!;
        let filePath = path.join(peer.cache_path.file_upload,`${fileName}`)
        //创建文件夹
        if(!fs.existsSync(peer.cache_path.file_upload)){
            await fs.mkdirpSync(peer.cache_path.file_upload);
        }
        //生成文件
        
        await this._createFile(filePath,fileSize);
        let md5 = this._md5(filePath);
        return {err:ErrorCode.succ,resp:{
            json : {
                fileName,
                filePath,
                md5
            },
            bytes : Buffer.from("")
        }}
    }
    _peerCachePath(peerName:string){
        return{cache_path :{
            file_upload:path.join(this.m_logger.dir(),`../${peerName}_cache`,"file_upload"),
            file_download:path.join(this.m_logger.dir(),`${peerName}_cache`,"file_download"),
            NamedObject:path.join(this.m_logger.dir(),`${peerName}_cache`,"NamedObject")
        }}
    }
    async getCachePath(command:BdtLpcCommand):Promise<BdtLpcResp>{
        if( !command.json.peerName){
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`)
            return {err:ErrorCode.unknownCommand}
        }
        let peer = this._peerCachePath(command.json.peerName)
        return {err:ErrorCode.succ,resp:{
            json : {
                cache_path : peer.cache_path,
            },
            bytes : Buffer.from("")
        }}
    }
    async createDir(command:BdtLpcCommand):Promise<BdtLpcResp>{
        if( !command.json.peerName|| !command.json.fileSize || !command.json.dirNumber || !command.json.fileNumber || !command.json.deep){
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`)
            return {err:ErrorCode.unknownCommand}
        }
        let peer = this._peerCachePath(command.json.peerName)
        let dirName = RandomGenerator.string(10);
        let dirPath = path.join(peer.cache_path.file_upload,`${dirName}`)
        //创建文件夹
        if(!fs.existsSync(peer.cache_path.file_upload)){
            await fs.mkdirpSync(peer.cache_path.file_upload);
        }
        await RandomGenerator.createRandomDir(dirPath,command.json.dirNumber,command.json.fileNumber,command.json.fileSize,command.json.deep);
        return {err:ErrorCode.succ,resp:{
            json : {
                dirName,
                dirPath,
            },
            bytes : Buffer.from("")
        }}
    }
    async md5(command:BdtLpcCommand):Promise<BdtLpcResp>{
        if(!command.json.filePath){
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`)
            return {err:ErrorCode.unknownCommand}
        }
        let md5 = this._md5(command.json.filePath);
        return {err:ErrorCode.succ,resp:{
            json : {
                md5,
            },
            bytes : Buffer.from("")
        }}
    }
    async getIPInfo(command:BdtLpcCommand):Promise<BdtLpcResp>{
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
        return {err:ErrorCode.succ,resp:{
            json : {
                ipInfo:{IPv4:IPv4List,IPv6:IPv6List}
            },
            bytes : Buffer.from("")
        }}
    }
    async uploadLog(command:BdtLpcCommand):Promise<BdtLpcResp>{
        this.m_logger.info(`command : ${JSON.stringify(command.json)}`)
        if(!command.json.logName){
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`)
            return {err:ErrorCode.unknownCommand}
        }
        
        let zip = await this.m_interface.zip(this.m_interface.getLogger().dir(),command.json.logName)
        let upload = await this.m_interface.uploadFile(zip.dstPath!,"logs");
        this.m_logger.info(`upload log to server ,result = ${JSON.stringify(upload)}`)
        return {err:ErrorCode.succ,resp:{
            json : {
                upload,
            },
            bytes : Buffer.from("")
        }}
    }
    async uploadCacheFile(command:BdtLpcCommand,peer?: BdtPeer):Promise<BdtLpcResp>{
        if(!peer ||!command.json.cacheType || !command.json.logName){
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`)
            return {err:ErrorCode.unknownCommand}
        }
        let dir = ""
        if(command.json.cacheType=="file_download"){
            dir = peer.cache_path.file_download
        }else if(command.json.cacheType=="file_upload"){
            dir = peer.cache_path.file_upload
        }else if(command.json.cacheType=="NamedObject"){
            dir = peer.cache_path.NamedObject
        }else{
            return {err:ErrorCode.unknownCommand}
        }
        let zip = await this.m_interface.zip(this.m_interface.getLogger().dir(),command.json.logName)
        let upload = await this.m_interface.uploadFile(zip.dstPath!,"logs");
        return {err:ErrorCode.succ,resp:{
            json : {
                upload,
            },
            bytes : Buffer.from("")
        }}
    }
}
