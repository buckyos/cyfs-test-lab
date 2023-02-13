import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, sleep, RandomGenerator} from '../../base';
import {BdtPeerClientConfig,InitBdtPeerClientData} from "./labAgent"
import {Agent,Peer,BDTERROR} from './type'
import {request,ContentType} from "./request";
import {BdtPeerClient} from "./bdt_client"
import {bdteEchartsCPU,bdteEchartsNetwork,bdteEchartsMem} from "./perfCharts"
import {CyfsStackClient,UtilTool} from "../cyfs_driver"
import {UtilClient} from "./bdt_util_tool"
import * as path from "path"
import * as fs from "fs-extra"
import * as myconfig from "./config"
var date = require("silly-datetime");
export class AgentClient implements CyfsStackClient {
    public tags : string; // 机器名称 tags
    public agentInfo : Agent;
    private ip? : Array<string>;// ip信息
    private m_agentid? : string; //节点对应的自动化测试框架节点
    public bdtPeerMap : Map<string,BdtPeerClient>
    public running_device : Array<string>;
    private agentMult : number;
    public bdt_port? : number; 
    private logUrl? : string; //日志下载
    private is_run : boolean;
    private m_interface: TaskClientInterface;
    private logger : Logger;
    private ipInfo?:{IPv4:Array<string>,IPv6:Array<string>}
    private state? : number;
    public util_client?: UtilClient;
    public cacheInfo? : {LocalDeviceCache:string,RemoteDeviceCache:string,local_list: Array<string>,remote_list:Array<string>};
    private is_report_perf : boolean;
    constructor(_interface: TaskClientInterface,agent:Agent){
        this.m_interface = _interface;
        this.logger = _interface.getLogger();
        this.tags = agent.tags[0];
        this.agentInfo = agent;
        this.bdtPeerMap = new Map();
        this.agentMult = 0;
        this.is_run = false;
        this.state = 0;
        this.running_device = [];
        this.is_report_perf = false;
    }
    async init():Promise<{err:number,log:string}> {
        return new Promise(async(V)=>{
            setTimeout(()=>{
                if(this.state == 0){
                    V({err:BDTERROR.timeout,log:`${this.tags} init client timeout`})
                }
            },20*1000)
            let agent = await this.m_interface.getAgent({} as any, [this.tags ],[],[], 10*1000);
            if (agent.err || agent.agentid == undefined ) {
                V({err:ErrorCode.netError,log:`${this.tags} connect bdt agent failed`}) 
            }
            this.m_agentid = agent.agentid!;
            //启动测试服务
            let err = await this.m_interface.startService([], this.m_agentid!, 10*1000);
            if (err) {
                V({err:ErrorCode.netError,log:`${this.tags} start agen Servicet failed`}) 
            }
            await sleep(5000);
            let IPInfo = await this.m_interface.callApi('utilRequest', Buffer.from(''), {
                name : "getIPInfo"
            }, this.m_agentid!, 10*1000);
            this.logger.info(`${this.tags} get ipinfo = ${JSON.stringify(IPInfo)}`)
            if(IPInfo.err || IPInfo.value.ipInfo.IPv4 == undefined  || IPInfo.value.ipInfo.IPv6 == undefined){  
                V({err:ErrorCode.exception,log:`${this.tags} get ipinfo failed`}) 
            }
            this.ipInfo = IPInfo.value.ipInfo;
            this.state = 1;
            V({err:ErrorCode.succ,log:`${this.tags} get ipinfo success`}) 
        })
        
    }
    get_util_tool():UtilTool{
        return this.util_client!
    }
    
    async start_bdt_Client(config:BdtPeerClientConfig,local?:string,bdt_port:number=50000):Promise<{err:number,log?:string,bdtClient?:BdtPeerClient,online_time?:number}>{
        if(myconfig.AgentConcurrencyIgnoreWAN && this.agentMult > 0 && this.agentInfo.NAT == 0){
            this.logger.error(`${this.tags} Perf test WAN agent Ignore WAN Concurrency BDT client`)
            return {err:BDTERROR.success,log:"Perf test WAN agent Ignore WAN Concurrency BDT client"}
        }
        let peer :Peer = await InitBdtPeerClientData(this.agentInfo,config);
        peer.bdt_port = bdt_port;
        this.bdt_port = bdt_port;
        let bdtClient = new BdtPeerClient(this.m_interface,this.m_agentid!,this.tags,peer)
        if(local){
            bdtClient.cache_peer_info.local =this.tags;
            bdtClient.cache_peer_info.device_tag =  local.split(".")[0];
            this.running_device.push(local);
        }
        let result = await bdtClient.init(this.agentMult);
        if(result.err){
            this.logger.error(`${this.tags} init bdt client faild port = ${bdt_port}`)
            return result
        }
        this.agentMult = this.agentMult + 1;
        this.logger.info(`${this.tags} add a new bdt client, agentMult = ${this.agentMult}`)
        this.bdtPeerMap.set(`${this.agentMult}`,bdtClient);
        return {err:result.err,log:result.log,bdtClient,online_time:bdtClient.online_time}
    }

    async get_bdt_client(index:string):Promise<{err:ErrorCode,log?:string,bdtClient?:BdtPeerClient}>{
        this.is_run = true;
        if(!this.bdtPeerMap.has(index)){
            return {err:BDTERROR.AgentError,log:`${this.tags} ${index} not exsit`}
        }
        let bdtClient = this.bdtPeerMap.get(index)!;
        if(bdtClient.state<-1 ){
            return {err:BDTERROR.AgentError,log:`${this.tags} ${index} state error,state = ${bdtClient.state}`}
        }
        return {err:BDTERROR.success,log:`${this.tags} ${index} get success`,bdtClient}
    }
    





}