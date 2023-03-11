import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, sleep, RandomGenerator} from '../../base';
import {BdtPeerClientConfig,InitBdtPeerClientData} from "./labAgent"
import {Agent,Peer,BDTERROR, Task} from './type'
import {BdtPeerClient} from "./bdtPeerClient"
import {AgentClient} from "./agentClient"
export class AgentManager {
    static manager?: AgentManager;
    private m_interface: TaskClientInterface;
    public agentMap : Map<string,AgentClient>
    public agentListState : Array<{name:string,state:string}>
   
    constructor(_interface: TaskClientInterface){
        this.m_interface = _interface;
        this.agentMap = new Map();
        this.agentListState = [];
    }
    static create_instance(_interface:TaskClientInterface): AgentManager {
        if (!AgentManager.manager) {
            AgentManager.manager = new AgentManager(_interface);
        }
        return AgentManager.manager;
    }

    async init_agent_list(agents:Array<Agent>){
        let initList : Array<any> = []
        for(let i in agents){
            initList.push(new Promise<{result:{err:ErrorCode,log:string},client:AgentClient,name:string}>(async(V)=>{
                let client = new AgentClient(this.m_interface,agents[i]);
                let result = await client.init();
                V({result:result,client,name:agents[i].tags[0]});
            }))
        }
        for(let i in initList){
            
            let res = await initList[i];
            this.agentListState.push({name:res.name,state:res.result})
            if(res.result!.err){
                this.m_interface.getLogger().error(res.result!.log);
            }else{
                this.m_interface.getLogger().info(`### init agent ${res.name} success`)
                this.agentMap.set(res.name,res.client);
            }
        }
    }
    
    async checkBdtPeerClient(name:string):Promise<{err:number,log?:string}> {
        let agentName = name.split("_")[0];
        let BDTIndex = name.split("_")[1];
        
        if(!this.agentMap.has(agentName) || !this.agentMap.get(agentName)!.bdtPeerMap.has(BDTIndex)){
            return {err:BDTERROR.AgentError,log:`${name} not exsit`}
        }
        return {err:BDTERROR.success,log:`check BdtPeerClient success`};
    }
    async getBdtPeerClient(name:string):Promise<{err:number,log?:string,bdtClient?:BdtPeerClient}> {
        let agentName = name.split("$")[0];
        let BDTIndex = name.split("$")[1];
        if(!this.agentMap.has(agentName)){
            this.m_interface.getLogger().error(`agent ${agentName} not exsit , agent list = ${this.agentMap.keys()}`)
            return {err:BDTERROR.AgentError,log:` agent ${agentName} not exsit`}
        }
        return this.agentMap.get(agentName)!.getBdtPeerClient(BDTIndex);
    }

    async getAgent(name:string):Promise<{err:number,log?:string,agent?:AgentClient}>{
        if(!this.agentMap.has(name)){
            this.m_interface.getLogger().error(`agent ${name} not exsit , agent list = ${this.agentMap.keys()}`)
            return {err:BDTERROR.AgentError,log:` agent ${name} not exsit`}
        }
        return {err:BDTERROR.success,agent:this.agentMap.get(name),log:`get ${name} success`};
    } 
    async getRunningBDTClient():Promise<{err:number,log?:string,BDTClientInfo:Array<{name:string,device_list:Array<string>}>}>{
        let BDTClientInfo = [];
        for(let agent of this.agentMap.values()){
            BDTClientInfo.push({name:agent.tags,device_list:agent.running_device});
        }
        return {err:BDTERROR.success,BDTClientInfo,log:`get success`};
    } 
    async checkBdtPeerClientList(LN:string,RN?:string,Users?:Array<string>):Promise<{err:number,log?:string}> {
        let result = await this.checkBdtPeerClient(LN);
        if(result.err){
            return result
        }
        if(RN){
            result = await this.checkBdtPeerClient(RN);
            if(result.err){
                return result
            }
        }
        if(Users){
            for(let i in Users){
                result = await this.checkBdtPeerClient(Users[i]);
                if(result.err){
                    return result
                }
            }    
        }
        return {err:BDTERROR.AgentError};
    }
    async save_agent_perf_info(testcase_id:string){
        for(let agent of this.agentMap.values()){
            let run = await agent.save_agent_perf_info(testcase_id)
        }
        return {err:BDTERROR.success,log:`save test log to server success`}
    }
    async createBdtPeerClient(agentName:string,config:BdtPeerClientConfig):Promise<{err:number,log?:string,bdtClient?:BdtPeerClient}>{
        if(!this.agentMap.has(agentName)){
            return {err:BDTERROR.AgentError,log:`${agentName} not exsit`}
        }
        return this.agentMap.get(agentName)!.startPeerClient(config)

    }
    async allAgentCleanCache(type:string="all"){
        for(let agent of this.agentMap.values()){
            await  agent.removeAgentCache(type);
            agent.cacheInfo!.local_list = [];
        }
    }
    async all_agent_start_bdt_peer(config:BdtPeerClientConfig, num:number=1,clean:boolean=false){
        let taskList = []
        if(clean == true){
            await this.allAgentCleanCache(); 
        }
        for(let agent of this.agentMap.values()){
            taskList.push(new Promise(async(V)=>{
                
                let taskAgent = []
                let bdt_port = 50000 + RandomGenerator.integer(1,100)*10;
                if(config.bdt_port){
                    bdt_port = config.bdt_port;
                }
                for(let j=0;j<num;j++){
                    let peer_name = agent.cacheInfo!.local_list[j]
                    
                    if(!peer_name){
                        peer_name = agent.tags + "_" + RandomGenerator.string(10);
                    }
                    this.m_interface.getLogger().info(`start peer ${peer_name}`)
                    let result =  await agent.startPeerClient(config,peer_name,bdt_port);
                    bdt_port = bdt_port + 10;
                    await sleep(100);
                }
                await agent.loadAgentCache("init");

                V("run finished")
            }))
            
        } 
        for(let i in taskList){
            await taskList[i]
        }
    }
    async stopService(){
        return new Promise(async(V)=>{
            setTimeout(()=>{
                return V("run finished")
            },10000)
            let list = []
            for(let agent of this.agentMap.values()){
                list.push(new Promise(async(V)=>{
                    await agent.stopService();
                }))  
            }
            for(let run of list){
                await run;
            }
            return V("run finished")
        })
        
    }
    async upload_system_info(testcase_id:string,interval: number){
        return new Promise(async(V)=>{
            setTimeout(()=>{
                V("")
            },10000)
            let taskList = []
            for(let agent of this.agentMap.values()){
                taskList.push(new Promise(async(V)=>{
                    let ret =await agent.upload_system_info(testcase_id,interval)
                    V(ret)
                }))
            }
            for(let i in taskList){
                await taskList[i]
            }
            V("")
        })
        
        
    } 
    async upload_log(testcase_id:string):Promise<{err:ErrorCode,log:string}>{
        let taskList = []
        for(let agent of this.agentMap.values()){
            taskList.push(agent.upload_log(testcase_id));
        }
        for(let i in taskList){
            await taskList[i]
        }
        return {err:BDTERROR.success,log:`save test log to server success`}
    }
    async remove_ndc_data():Promise<{err:ErrorCode,log:string}>{
        let taskList = []
        for(let agent of this.agentMap.values()){
            taskList.push(agent.remove_ndc_data());
        }
        for(let i in taskList){
            await taskList[i]
        }
        return {err:BDTERROR.success,log:`remove_ndc_data success `}
    }
    async report_agent(testcase_id: string,report_agent:boolean,report_bdtClient:boolean,check_run?:boolean) :Promise<{err:ErrorCode,log:string}>{
        let taskList = []
        for(let agent of this.agentMap.values()){
            taskList.push(agent.report_agent(testcase_id,report_agent,report_bdtClient,check_run));
        }
        for(let i in taskList){
            await taskList[i]
        }
        return {err:BDTERROR.success,log:`report_agent to server success`}
    }
}