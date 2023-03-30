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
import {UtilTool} from "./util"


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

    static create_instance(_interface:ServiceClientInterface): BdtPeerManager {
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
            this.m_interface.fireEvent(`unlive_${peer.peer_name!}`,ErrorCode.succ)
            this.emit('unlive', peer.peerid);
        });
    }
    async init(): Promise<ErrorCode> {
        this.utilTool = new UtilTool(this.m_interface,this.m_logger);
        // init BdtPeerManager,must kill other bdt-tools
        if (this.m_platform === 'win32') {
            await this.stopBdtWin32();
            await sleep(2000)
        }else if (this.m_platform === 'linux'){
            await this.stopBdtLinux();
            await sleep(2000)
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



