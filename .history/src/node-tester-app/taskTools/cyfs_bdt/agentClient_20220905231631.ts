import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, sleep, RandomGenerator} from '../../base';
import {BdtPeerClientConfig,InitBdtPeerClientData} from "./labAgent"
import {Agent,Peer,BDTERROR} from './type'
import {BdtPeerClient} from "./bdtPeerClient"
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
        let IPInfo = await this.m_interface.callApi('utilRequest', Buffer.from(''), {
            name : "getIPInfo"
        }, this.m_agentid!, 10*1000);
        this.logger.info(`${this.tags} get ipinfo = ${JSON.stringify(IPInfo)}`)
        if(IPInfo.err || IPInfo.value.ipInfo.IPv4 == undefined  || IPInfo.value.ipInfo.IPv6 == undefined){  
            return {err:ErrorCode.exception,log:`${this.tags} get ipinfo failed`}
        }
        this.ipInfo = IPInfo.value.ipInfo;
        return {err:ErrorCode.succ,log:`${this.tags} get ipinfo success`}
    }
    async uploadLog(testcaseId:string):Promise<{err:ErrorCode,log?:string,url?:string}>{
        let result = await this.m_interface.callApi('utilRequest', Buffer.from(''), {
            name : "uploadLog",
            logName : `${testcaseId}_${this.tags}.zip`
        }, this.m_agentid!, 10*1000);
        this.logger.info(`${this.tags} uploadLog = ${JSON.stringify(result)}`)
        if(result.value.upload?.err ){  
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
    
    async reportAgent(report_agent:boolean,report_bdtClient:boolean) :Promise<{err:ErrorCode,log:string}>{
        
    }

}