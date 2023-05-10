
import {  Namespace, TaskClientInterface,ErrorCode, Logger,sleep } from "../cyfs-driver-base"
import { EventEmitter } from 'events';
import net from "net";
import { ProxyUtilTool } from "./util_tool"

export class DMCProxyClient extends EventEmitter  {
    private peer_name: string; // 测试节点标签
    private m_util_tool?: ProxyUtilTool;
    private m_agentid?: string;
    private timeout: number;
    private m_interface: TaskClientInterface;
    constructor(options: {
        _interface: TaskClientInterface;
        peer_name: string;
        timeout: number;
    }) {
        super();
        this.peer_name = options.peer_name;
        this.m_interface = options._interface;
        this.timeout = options.timeout;
    }
    agentid(){
        return this.m_agentid!
    }
    async init(): Promise<{ err: ErrorCode, log: string }> {
        // 连接测试节点
        console.info(`init dmc driver client`)
        let agent = await this.m_interface.getAgent({} as any, [this.peer_name], [], [], this.timeout);
        if (agent.err || agent.agentid == undefined) {
            console.error(`连接测试节点 ${this.peer_name}失败`)
            return { err: ErrorCode.connectProxyClientFailed, log: "连接测试节点失败" }
        }
        this.m_agentid = agent.agentid!;
        // 测试节点启动测试服务     
        let err = await this.m_interface.startService([], this.m_agentid, this.timeout);
        if (err) {
            console.error(`${this.peer_name} 测试节点启动服务失败`)
            return { err: ErrorCode.connectProxyClientFailed, log: "测试节点启动服务失败" }
        }
        console.info(`连接测试节点 ${this.peer_name} 成功`)
        this.m_util_tool = new ProxyUtilTool(this.m_interface, this.m_agentid, this.peer_name, this.peer_name);
        return { err: ErrorCode.succ, log: `${this.peer_name}启动成功` }
    }

    get_util_tool(): ProxyUtilTool {
        console.info(`ProxyUtilTool ${this.peer_name} get_util_tool`)
        return this.m_util_tool!
    }

    async start_server(){
        console.info(`${this.peer_name} send request start-server`)
        let result = await this.m_interface.callApi('start-server', Buffer.from(''), {
        }, this.m_agentid!, 10 * 1000);
        console.info(`${this.peer_name} start-server result = ${JSON.stringify(result)}`)
        return result.value;
    }
    async excute_cmd(cmd:string,timeout?:number):Promise<{code:number,print_data:string,error_stack?:string,error_msg?:string}>{
        console.info(`${this.peer_name} send request excute-cmd : ${cmd}`)
        let result = await this.m_interface.callApi('excute-cmd', Buffer.from(''), {
            cmd,
            timeout
        }, this.m_agentid!, 10 * 1000);
        console.info(`${this.peer_name} excute-cmd result = ${JSON.stringify(result)}`)
        return result.value;
    }
}