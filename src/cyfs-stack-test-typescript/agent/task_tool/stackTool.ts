import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, sleep} from '../../agent/base';
import {EventEmitter} from 'events';
import * as WSParams from "./ws_params"


export const StackError = {
    success: 0, //执行成功
    LNAgentError: 1, //测试框架连接测试设备报错
    RNAgentError: 2, //测试框架连接测试设备报错
    reportDataFailed: 3, //报存测试数据报错
    testDataError: 4 ,//使用测试数据校验失败报错
    timeout: 5, //执行用例超时报错

    connect_cyfs_client_faild : 1001, 
}



export class StackPeer extends EventEmitter{
    private m_peerName?: string;
    public tags?: string; //tags 定义 [tag]_[number] Ubuntu20_0019_1 Ubuntu20_0019 第一个协议栈
    public state?: number; // 0 未初始 1 实例化   2 可使用 -1 销毁
    private m_agentid: string;
    public deviceId?: string;

    private m_interface: TaskClientInterface;
    private m_timeout: number;

    private m_unliveCookie?: number;

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
    constructor(options: {
        agentid: string;
        _interface: TaskClientInterface;
        timeout: number;
        tags : string;
    }) {
        super();
        this.m_agentid = options.agentid;
        this.m_interface = options._interface;
        this.m_timeout = options.timeout;
        this.tags = options.tags;
        this.state  = 0;

    }
    
    async start_client(stack_type:string,SDK_type:string,log_type:string = 'trace'): Promise<{err: number, peerName?: string,log?:string}> {
        let param = {
            stack_type,
            SDK_type,
            log_type
        }
        let info = await this.m_interface.callApi('start_client', Buffer.from(''), param, this.m_agentid!, 0);
        if(info.err){
            this.m_interface.getLogger().error(`callApi start_client failed ,err = ${JSON.stringify(info)} `)
            return {err:info.err,log:info.value.log}
        }
        this.m_peerName = info.value.peerName
        return info.value;
    }

    async open_stack(stack_type:string,dec_id?:string,http_port?:number,ws_port?:number): Promise<{err: ErrorCode, deviceId?: string,log?:string}> {
        let param = {
            peerName:this.m_peerName,
            stack_type,
            dec_id,
            http_port,
            ws_port
        }
        let info = await this.m_interface.callApi('open_stack', Buffer.from(''), param, this.m_agentid!, 0);
        if(info.err){
            this.m_interface.getLogger().error(`callApi open_stack failed ,err = ${JSON.stringify(info)} `)
            return {err:info.err,log:info.value.log}
        }
        this.deviceId = info.value.deviceId
        return info.value;
    }
    async put_obejct(obj_type:number,put_object_params:WSParams.PutObjectParmas): Promise<WSParams.PutObjectResp>{
        let param = {
            peerName:this.m_peerName,
            obj_type,
            put_object_params,
        }
        let info = await this.m_interface.callApi('put_obejct', Buffer.from(''), param, this.m_agentid!, 0);
        if(info.err){
            this.m_interface.getLogger().error(`callApi put_obejct failed ,err = ${JSON.stringify(info)} `)
            return {err:info.err,log:info.value.log}
        }
        return info.value;
    }
    async get_obejct(obj_type:number,get_object_params:WSParams.GetObjectParmas): Promise<WSParams.GetObjectResp>{
        let param = {
            peerName:this.m_peerName,
            obj_type,
            get_object_params,
        }
        let info = await this.m_interface.callApi('get_obejct', Buffer.from(''), param, this.m_agentid!, 0);
        if(info.err){
            this.m_interface.getLogger().error(`callApi get_obejct failed ,err = ${JSON.stringify(info)} `)
            return {err:info.err,log:info.value.log}
        }
        return info.value;
    }

    async destoryPeer(): Promise<{err: ErrorCode}> {
        let param = {
            peerName:this.m_peerName,
        }
        let info = await this.m_interface.callApi('destoryPeer', Buffer.from(''), param, this.m_agentid!, 0);
        if(info.err){
            this.m_interface.getLogger().error(`callApi destoryPeer failed ,err = ${JSON.stringify(info)} `)
            return {err:info.err}
        }
        return info.value;
    }

}



export class StackPeerProxy {
    private m_interface: TaskClientInterface;
    private m_timeout: number;
    public m_peers: StackPeer[] = [];
    private record : any;
    //public m_peers: Map<string, StackPeer>;
    constructor(_interface: TaskClientInterface,timeout: number) {
        this.m_interface = _interface;
        this.m_timeout = timeout;
        
    }

    newPeer(agentid: string,tags:string): StackPeer {
        let peer: StackPeer = new StackPeer({
            agentid,
            _interface: this.m_interface,
            timeout: this.m_timeout,
            tags : tags,
        });

        peer.on('unlive', () => {
            this.m_interface.getLogger().error( 'peer unlive, maybe exception');
        });
        this.m_peers.push(peer)
        return peer;
    }
    getPeer(name:string):{err:ErrorCode,peer?:StackPeer}{
        for(let i in this.m_peers){
            if(this.m_peers[i].tags! == name && this.m_peers[i].state != -1){
                return {err:0,peer:this.m_peers[i]}
            }
        }
        return {err:1}
    }


    async exit(type:string='finish') {
       let promise_list = []  
       for(let i in this.m_peers){
            promise_list.push(new Promise(async(V)=>{
                await this.m_peers[i].destoryPeer()
                V("")
            }))
       }
       for(let i in promise_list){
           await promise_list[i]
       }
    }
}