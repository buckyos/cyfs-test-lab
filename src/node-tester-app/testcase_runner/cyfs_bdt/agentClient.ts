import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, sleep, RandomGenerator} from '../../base';
import {BdtPeerClientConfig,InitBdtPeerClientData} from "./labAgent"
import {Agent,Peer,BDTERROR} from './type'
import {request,ContentType} from "./request";
import {BdtPeerClient} from "./bdtPeerClient"
import {bdteEchartsCPU,bdteEchartsNetwork,bdteEchartsMem} from "./perfCharts"
import * as path from "path"
import * as fs from "fs-extra"
import * as myconfig from "./config"
var date = require("silly-datetime");
export class AgentClient {
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
            // let ipv4s : Array<string> = IPInfo.value.ipInfo.IPv4;
            // let ipv6s : Array<string> = IPInfo.value.ipInfo.IPv6;
            // let ipList = ipv4s.concat(ipv6s);
            // let eps = this.agentInfo!.ipv4;
            // eps.concat(this.agentInfo!.ipv6);
            // for(let x=0;x<eps.length;x++){
            //     let ip = eps[x].substring(5);
            //     let contain = false;
            //     for(let j=0;j<ipList.length;j++){
            //         if(ip.indexOf(ipList[j])!=-1 || ip.indexOf('[::]')!=-1){
            //             contain = true;
            //         }
            //     }
            //     if(contain==false){
            //         this.logger.error(`节点 ${this.tags} IP 错误:${JSON.stringify(IPInfo)} EP:${JSON.stringify(eps)}`);
            //     }       
            // }
            this.ipInfo = IPInfo.value.ipInfo;
            let loadAgentCache = await this.loadAgentCache("clean");
            this.state = 1;
            V({err:ErrorCode.succ,log:`${this.tags} get ipinfo success`}) 
        })
        
    }
    async stopService(){
        await this.m_interface.stopService(this.m_agentid!)
    } 
    async upload_log(testcase_id:string):Promise<{err:ErrorCode,log?:string,url?:string}>{
        if(!this.is_run){
            return {err:ErrorCode.exception,log:`${this.tags}  not run`}
        }
        return new Promise(async(V)=>{
            let wait =true;
            setTimeout(async()=>{
                if(wait){
                    V({err:ErrorCode.timeout,log:`${this.tags} uploadLog timeout`}) 
                }
            },60*1000)
            let result = await this.m_interface.callApi('utilRequest', Buffer.from(''), {
                name : "uploadLog",
                logName : `${testcase_id}_${this.tags}.zip`
            }, this.m_agentid!, 10*1000);
            this.logger.info(`${this.tags} uploadLog = ${JSON.stringify(result)}`)
            wait = false;
            if(result.value.upload?.err ){  
                V({err:ErrorCode.exception,log:`${this.tags} uploadLog failed`}) 
            }
            this.logUrl = String(result.value.upload?.url).replace("192.168.200.175","cyfs-test-lab") ;
            this.logger.info(`### ${this.tags} run log url : ${this.logUrl}`);
            V({err:ErrorCode.exception,log:`${this.tags} uploadLog success`,url:this.logUrl}) 
        })
        
    }
     async  BDTPerfReport(testcase_id:string,agent:string,save_path:string){
        this.logger.info(`${this.tags} send api/base/system_info/getRecords req `)
        let run = await request("POST","api/base/system_info/getRecords",{name:agent,testcase_id},ContentType.json)
        this.logger.info(`api/base/system_info/getRecords resp ${JSON.stringify(run.log)} `)
        let timeList = [];
        let cpuList =[];
        let memList = [];
        let receivedList = [];
        let transmitted = [];
        let maxMem = 1*1024*1024;
        let maxNetworkSpeed = 1*1024*1024;
        for(let data of run.result){
            timeList.push(date.format(Number(data.create_time),'YYYY/MM/DD HH:mm:ss'));
            cpuList.push(data.cpu_usage);
            memList.push(data.used_memory);
            receivedList.push(data.received_bytes);
            transmitted.push(data.transmitted_bytes);
            if(data.used_memory>maxMem){
                maxMem = data.used_memory
            }
            if(data.received_bytes>maxNetworkSpeed){
                maxNetworkSpeed = data.received_bytes
            }
            if(data.transmitted_bytes>maxNetworkSpeed){
                maxNetworkSpeed = data.transmitted_bytes
            }
        }
        let dirPath = path.join(save_path,testcase_id)
        if(!fs.existsSync(dirPath)){
            fs.mkdirSync(dirPath);
        }
        let agentPath = path.join(dirPath,agent);
        if(!fs.existsSync(agentPath)){
            fs.mkdirSync(agentPath);
        }
        let cpuImg =  path.join(agentPath,`${agent}_Perf_CPU.png`)
        let memImg =  path.join(agentPath,`${agent}_Perf_MEM.png`)
        let networkImg =  path.join(agentPath,`${agent}_Perf_Network.png`)
        let test1 = bdteEchartsCPU(cpuImg,agent,timeList,cpuList,100);
        let test2 = bdteEchartsMem(memImg,agent,timeList,memList,maxMem);
        let test3 = bdteEchartsNetwork(networkImg,agent,timeList,receivedList,transmitted,maxNetworkSpeed);
        this.logger.info(`${this.tags} save perf info to local success`)
        if(myconfig.ReportAgentPerfWait){
            await sleep(myconfig.ReportAgentPerfWait)
        }else{
            await sleep(1000)
        }
        return run.length;
    }
    async save_agent_perf_info(testcase_id:string):Promise<{err:ErrorCode,log?:string}>{
        if(!this.is_run || !this.is_report_perf){
            this.logger.error(`${this.tags} not run or not report perf info`)
            return {err:ErrorCode.exception,log:`${this.tags}  not run`}
        }
        let result = await this.BDTPerfReport(testcase_id,this.tags,this.logger.dir());
        return {err : ErrorCode.succ,log:"save_agent_perf_info"}
    }
    async remove_ndc_data():Promise<{err:ErrorCode,remove_list?:string}>{
        let result = await this.m_interface.callApi('utilRequest', Buffer.from(''), {
            name : "remove_ndc_data",
        }, this.m_agentid!, 10*1000);
        this.logger.info(`${this.tags} remove_ndc_data = ${JSON.stringify(result)}`)
        if(result.err ){  
            return {err:ErrorCode.exception}
        }
        return {err:ErrorCode.succ,remove_list:result.value.remove_list}
    }  
    
    async startPeerClient(config:BdtPeerClientConfig,local?:string,bdt_port:number=50000):Promise<{err:number,log?:string,bdtClient?:BdtPeerClient,online_time?:number}>{
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

    async getBdtPeerClient(index:string):Promise<{err:ErrorCode,log?:string,bdtClient?:BdtPeerClient}>{
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
    
    async report_agent(testcase_id:string,report_agent:boolean,report_bdtClient:boolean,check_run:boolean = true) :Promise<{err:ErrorCode,log:string}>{
        if(!this.is_run && check_run){
            return {err:ErrorCode.exception,log:`${this.tags}  not run`}
        }
        if(report_agent){
            let run_action =await request("POST","api/bdt/agent/add",{
                testcase_id:testcase_id,
                name:this.agentInfo.tags[0],
                NAT :this.agentInfo.NAT,
                eps:JSON.stringify({ipv4:this.agentInfo.ipv4,ipv6:this.agentInfo.ipv6}),
                agentMult:this.agentMult,
                agentid:this.m_agentid,
                logUrl : this.logUrl,
                router : this.agentInfo.router,
                portMap : JSON.stringify(this.agentInfo.portMap)

            },ContentType.json)
            this.logger.info(`api/bdt/agent/add resp:  ${JSON.stringify(run_action)}`)
        }
        if(report_bdtClient){
            let list = [];
            for(let client of this.bdtPeerMap.values()){
                list.push(client.get_report_data(testcase_id));
            }
            let run_action =await request("POST","api/bdt/client/addList",{
                list
            },ContentType.json)
            this.logger.info(`api/bdt/client/addList resp:  ${JSON.stringify(run_action)}`)
        }
        return {err:BDTERROR.success,log:`report_agent to server success`}
    }
    async upload_system_info(testcase_id:string,interval: number) :Promise<{err:ErrorCode}>{
        if(!this.is_report_perf){
            this.is_report_perf = true;
            for(let client of this.bdtPeerMap.values()){
                let result =  await client.upload_system_info(testcase_id,interval);
                if(result.err == 0){
                    break;
                }
            }
        }else{
            this.logger.info(`Warn: agent is_report_perf`);
        }
        return {err:ErrorCode.succ}
    }

    async loadAgentCache(init?:string):Promise<{err:ErrorCode,LocalDeviceCache?:string,RemoteDeviceCache?:string,local_list?: Array<string>,remote_list?:Array<string>}>{
        let result = await this.m_interface.callApi('utilRequest', Buffer.from(''), {
            name : "loadAgentCache",
            agentName: this.tags,
            init
        }, this.m_agentid!, 10*1000);
        this.logger.info(`${this.tags} loadAgentCache = ${JSON.stringify(result)}`)
        if(result.err ){  
            return {err:ErrorCode.exception}
        }
        let LocalDeviceCache = result.value.LocalDeviceCache
        let RemoteDeviceCache = result.value.RemoteDeviceCache
        let local_list = result.value.local_list
        let remote_list = result.value.remote_list
        this.cacheInfo = {LocalDeviceCache,RemoteDeviceCache,local_list,remote_list};
        return {err:ErrorCode.succ,LocalDeviceCache,RemoteDeviceCache,local_list,remote_list}
    }
    async removeAgentCache(type:string):Promise<{err:ErrorCode,cachePath?:string}>{
        let result = await this.m_interface.callApi('utilRequest', Buffer.from(''), {
            name : "removeAgentCache",
            agentName: this.tags,
            type
        }, this.m_agentid!, 10*1000);
        this.logger.info(`${this.tags} removeAgentCache = ${JSON.stringify(result)}`)
        if(result.err ){  
            return {err:ErrorCode.exception}
        }
        let cachePath = result.value.cachePath
        return {err:ErrorCode.succ,cachePath}
    }

}