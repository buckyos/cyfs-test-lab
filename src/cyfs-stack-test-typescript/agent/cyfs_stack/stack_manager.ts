import {ErrorCode, Logger, sleep} from '../../agent/base';
import * as net from 'net';
import {EventEmitter} from 'events';
import * as ChildProcess from 'child_process';
import * as os from 'os';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as SysProcess from 'process';
import { resolve } from 'url';
import * as crypto from 'crypto';
import {request,ContentType} from "./request";
import{RandomGenerator} from "./generator"
import {StackPeer} from "./stack_ws"
import {StackClient} from "./typescript/stack_client"
import * as WSParams from "./ws_params"
import {StackLpc, StackLpcCommand} from './lpc';
export type BdtPeerManagerOption = {
    logger: Logger;
    platform: string;
}


type PeerInfo = {

    type: string;
    lanuage:string;
    ws_stack?: StackPeer;
    ts_stack?:StackClient;
}

/**
 * StackManager 支持多种语言CYFS-SDK 控制CYFS 协议栈
 * TS-SDK 直接通过npm cyfs库直接调用
 * Rust-SDK 使用Rust 进行封装，通过Ws和测试框架通讯。
 * 其他语言仿照Rust实现ws服务和测试框架通讯 
 */

export class StackManager extends EventEmitter{
    static manager?: StackManager;
    private m_server: net.Server;
    private m_localServerPort: number = 0;
    private m_logger: Logger;
    private m_peerIndex: number = 1;
    private m_peers: Map<string, PeerInfo>;
    private m_platform: string;
    private m_lpcStatus : boolean;

    on(event: 'peer', listener: (peer: StackPeer) => void): this;
    on(event: 'unlive', listener: (peerName: string) => void): this;

    on(event: string, listener: (...args: any[]) => void): this {
        super.on(event, listener);
        return this;
    }

    once(event: 'peer', listener: (peer: StackPeer) => void): this;
    once(event: 'unlive', listener: (peerName: string) => void): this;

    once(event: string, listener: (...args: any[]) => void): this {
        super.once(event, listener);
        return this;
    }


    static createInstance(logger: Logger, platform: string): StackManager {
        if (!StackManager.manager) {
            StackManager.manager = new StackManager({logger, platform});
        }
        return StackManager.manager;
    }
    constructor(options: BdtPeerManagerOption) {
        super();
        this.m_server = net.createServer();
        this.m_logger = options.logger;
        this.m_peers = new Map();
        this.m_platform = options.platform;
        this.m_lpcStatus = false;        
    }

    async init(): Promise<ErrorCode> {
        // listen错误， 端口冲突会触发
        this.m_server.on('connection', (socket: net.Socket) => {
            let lpc: StackLpc = new StackLpc({
                logger: this.m_logger,
            });
            
            let onCommand = (l: StackLpc, c: StackLpcCommand) => {
                if (c.json.name !== 'started') {
                    this.m_logger.error(`peer manager start cyfspeer failed, for first command not 'started'`);
                } else {
                    let info = this.m_peers.get(c.json.peer_name);
                    if (info) {
                        let peer: StackPeer = new StackPeer({
                            logger: this.m_logger,
                            name: c.json.peer_name,
                        });
                        peer.initFromLpc(lpc);
                        this._initPeer(peer);
                        

                        lpc.on('close', (l: StackLpc, err: boolean) => {
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
    
                        info.ws_stack = peer;
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
    protected _initPeer(peer: StackPeer) {
        peer.on('unlive', () => {
            this.m_logger.error(`===================peer unlive, in peer manager`);
            this.emit('unlive', peer.name);
        });
    }

    async start_client(stack_type:string,SDK_type:string,log_type:string = 'trace'): Promise<{err: ErrorCode, peerName?: string,log?:string}> {
        let peerName = `${SDK_type}_${SDK_type}_${RandomGenerator.string(5)}`;

        this.m_logger.info(`current os type ${os.arch()},begin start_client ,stack_type =${stack_type},SDK_type = ${SDK_type},log_type=${log_type}`)

        if(SDK_type=="typescript"){
            // TS 直接进行操作
            let ts_stack = new StackClient({name:peerName,logger:this.m_logger});
            this.m_peers.set(peerName, {type:stack_type,lanuage:SDK_type,ts_stack});

        }else if(SDK_type=="rust"){
            // 启动 ws 服务进行操作
            //let sub = ChildProcess.spawn(`${path.join(SysProcess.cwd(), exefile)}`, [this.m_localServerPort.toString(), peerName, this.m_logger.dir()], {stdio: 'ignore', cwd: SysProcess.cwd(), detached: true, windowsHide: true,env:{CYFS_CONSOLE_LOG_LEVEL:`${logType}`,CYFS_FILE_LOG_LEVEL_KEY:`${logType}`,RUST_LOG:`${logType}`,rust_bdt:`${logType}`}});
            //sub.unref();
            this.m_lpcStatus = true;
        }
        return {err:ErrorCode.succ,peerName,log:"open stack success"}
    }

    async open_stack(peerName:string,stack_type:string,dec_id?:string,http_port?:number,ws_port?:number): Promise<{err: ErrorCode, deviceId?: string,log?:string}> {
        if (!this.m_peers.has(peerName)) {
            return {err: ErrorCode.notExist};
        }
        if(this.m_peers.get(peerName)!.ts_stack){
            let stack_client = this.m_peers.get(peerName)!.ts_stack!;
            let result = await stack_client.open_stack(stack_type,dec_id,http_port,ws_port)
            return result
        } else if(this.m_peers.get(peerName)!.ws_stack){
            let stack_client = this.m_peers.get(peerName)!.ws_stack!
            let result = await stack_client.open_stack(stack_type,dec_id,http_port,ws_port)
            return result
        }else{
            return {err: ErrorCode.notExist,log:"stack client must be inited"};
        }
    }

    async put_obejct(peerName:string,obj_type:number,put_object_params:WSParams.PutObjectParmas): Promise<WSParams.PutObjectResp>{
        if (!this.m_peers.has(peerName)) {
            return {err: ErrorCode.notExist};
        }
        if(this.m_peers.get(peerName)!.ts_stack){
            let stack_client = this.m_peers.get(peerName)!.ts_stack!;
            let result = await stack_client.put_obejct(obj_type,put_object_params)
            return result
        } else if(this.m_peers.get(peerName)!.ws_stack){
            let stack_client = this.m_peers.get(peerName)!.ws_stack!
            let result = await stack_client.put_obejct(obj_type,put_object_params)
            return result
        }else{
            return {err: ErrorCode.notExist,log:"stack client must be inited"};
        }
    }

    async get_obejct(peerName:string,obj_type:number,get_object_params:WSParams.GetObjectParmas): Promise<WSParams.GetObjectResp>{
        if (!this.m_peers.has(peerName)) {
            return {err: ErrorCode.notExist};
        }
        if(this.m_peers.get(peerName)!.ts_stack){
            let stack_client = this.m_peers.get(peerName)!.ts_stack!;
            let result = await stack_client.get_obejct(obj_type,get_object_params)
            return result
        } else if(this.m_peers.get(peerName)!.ws_stack){
            let stack_client = this.m_peers.get(peerName)!.ws_stack!
            let result = await stack_client.get_obejct(obj_type,get_object_params)
            return result
        }else{
            return {err: ErrorCode.notExist,log:"stack client must be inited"};
        }
    }

    async destoryPeer(peerName: string): Promise<{err: ErrorCode}> {
        this.m_lpcStatus = false;
        this.m_logger.info(`destoryPeer ${peerName}`)
        if (!this.m_peers.has(peerName)) {
            return {err: ErrorCode.notExist};
        }
        //后续需要停止进程操作
        this.m_peers.delete(peerName);
        return {err: ErrorCode.succ};
    }


}