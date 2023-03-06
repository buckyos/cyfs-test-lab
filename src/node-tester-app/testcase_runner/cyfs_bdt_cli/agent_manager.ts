import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, sleep, RandomGenerator} from '../../base';
import {BdtCliConfig,InitBdtCliData} from "./lab_agent"
import {Agent,Peer,BDTERROR, Task} from './type'
import {BdtCli} from "./bdt_cli"
import {AgentClient} from "./agent_client"
import {BdtConnection,BdtStack,FastQAInfo} from "./bdt_stack"
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
    
    async checkBdtCli(name:string):Promise<{err:number,log?:string}> {
        let agentName = name.split("$")[0];
        let BDTIndex = name.split("$")[1];
        
        if(!this.agentMap.has(agentName) || !this.agentMap.get(agentName)!.bdtPeerMap.has(BDTIndex)){
            return {err:BDTERROR.AgentError,log:`${name} not exsit`}
        }
        return {err:BDTERROR.success,log:`check BdtCli success`};
    }
    async getBdtCli(name:string):Promise<{err:number,log?:string,bdt_stack?: BdtStack}> {
        let agentName = name.split("$")[0];
        let client_index = name.split("$")[1];
        let stack_index = name.split("$")[2];
        if(!stack_index){
            stack_index = "0"
        }
        if(!this.agentMap.has(agentName)){
            this.m_interface.getLogger().error(`agent ${agentName} not exsit , agent list = ${this.agentMap.keys()}`)
            return {err:BDTERROR.AgentError,log:` agent ${agentName} not exsit`}
        }
        return this.agentMap.get(agentName)!.getBdtCli(client_index,stack_index);
    }
    async get_bdt_stack(name:string):Promise<{err:number,log?:string,bdt_stack?: BdtStack}> {
        let agentName = name.split("$")[0];
        let client_index = name.split("$")[1];
        let stack_index = name.split("$")[2];
        if(!this.agentMap.has(agentName)){
            this.m_interface.getLogger().error(`agent ${agentName} not exsit , agent list = ${this.agentMap.keys()}`)
            return {err:BDTERROR.AgentError,log:` agent ${agentName} not exsit`}
        }
        return this.agentMap.get(agentName)!.getBdtCli(client_index,stack_index);
    }
    async get_bdt_peer_client(name:string):Promise<{err:number,log?:string,client?: BdtCli}> {
        let agentName = name.split("$")[0];
        let client_index = name.split("$")[1];
        if(!this.agentMap.has(agentName)){
            this.m_interface.getLogger().error(`agent ${agentName} not exsit , agent list = ${this.agentMap.keys()}`)
            return {err:BDTERROR.AgentError,log:` agent ${agentName} not exsit`}
        }
        return this.agentMap.get(agentName)!.get_bdt_peer_client(client_index);
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
    async checkBdtCliList(LN:string,RN?:string,Users?:Array<string>):Promise<{err:number,log?:string}> {
        let result = await this.checkBdtCli(LN);
        if(result.err){
            return result
        }
        if(RN){
            result = await this.checkBdtCli(RN);
            if(result.err){
                return result
            }
        }
        if(Users){
            for(let i in Users){
                result = await this.checkBdtCli(Users[i]);
                if(result.err){
                    return result
                }
            }    
        }
        return {err:BDTERROR.AgentError};
    }
    async saveAgentPerfInfo(testcase_id:string){
        for(let agent of this.agentMap.values()){
            let run = await agent.saveAgentPerfInfo(testcase_id)
        }
        return {err:BDTERROR.success,log:`save test log to server success`}
    }
    async createBdtCli(agentName:string,config:BdtCliConfig):Promise<{err:number,log?:string,bdtClient?:BdtCli}>{
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
    async all_agent_start_bdt_peer(config:BdtCliConfig, num:number=1,clean:boolean=false){
        let taskList = []
        if(clean == true){
            await this.allAgentCleanCache(); 
        }
        for(let agent of this.agentMap.values()){
            taskList.push(new Promise(async(V)=>{
                
                let taskAgent = []
                let client_port = 22222;
                if(config.client_port){
                    client_port = config.client_port;
                }
                for(let j=0;j<num;j++){
                    let peer_name = agent.cacheInfo!.local_list[j]
                    
                    if(!peer_name){
                        peer_name = agent.tags + "_" + RandomGenerator.string(10);
                    }
                    this.m_interface.getLogger().info(`start peer ${peer_name}`)
                    let result =  await agent.startPeerClient(config,peer_name,client_port);
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
    async allAgentStartTcpServer(port:number=22223,answer_size:number=0){
        let taskList = []
        for(let agent of this.agentMap.values()){
            taskList.push(new Promise(async(V)=>{
                this.m_interface.getLogger().info(`### ${agent.tags} start tcp server ${port}`)
                let start = await agent.startTcpServer(port,answer_size)
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
                    //let result = await agent.
                    await agent.stopService();
                }))  
            }
            for(let run of list){
                await run;
            }
            return V("run finished")
        })
        
    }
    async uploadSystemInfo(testcase_id:string,interval: number){
        return new Promise(async(V)=>{
            setTimeout(()=>{
                V("")
            },10000)
            let taskList = []
            for(let agent of this.agentMap.values()){
                taskList.push(new Promise(async(V)=>{
                    let ret =await agent.uploadSystemInfo(testcase_id,interval)
                    V(ret)
                }))
            }
            for(let i in taskList){
                await taskList[i]
            }
            V("")
        })
        
        
    } 
    async uploadLog(testcase_id:string):Promise<{err:ErrorCode,log:string}>{
        let taskList = []
        for(let agent of this.agentMap.values()){
            taskList.push(agent.uploadLog(testcase_id));
        }
        for(let i in taskList){
            await taskList[i]
        }
        return {err:BDTERROR.success,log:`save test log to server success`}
    }
    async removeNdcData():Promise<{err:ErrorCode,log:string}>{
        let taskList = []
        for(let agent of this.agentMap.values()){
            taskList.push(agent.removeNdcData());
        }
        for(let i in taskList){
            await taskList[i]
        }
        return {err:BDTERROR.success,log:`removeNdcData success `}
    }
    async reportAgent(testcase_id: string,report_agent:boolean,report_bdtClient:boolean,check_run?:boolean) :Promise<{err:ErrorCode,log:string}>{
        let taskList = []
        for(let agent of this.agentMap.values()){
            taskList.push(agent.reportAgent(testcase_id,report_agent,report_bdtClient,check_run));
        }
        for(let i in taskList){
            await taskList[i]
        }
        return {err:BDTERROR.success,log:`reportAgent to server success`}
    }
}
