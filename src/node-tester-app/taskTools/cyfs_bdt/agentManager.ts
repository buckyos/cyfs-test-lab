import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, sleep, RandomGenerator} from '../../base';
import {BdtPeerClientConfig,InitBdtPeerClientData} from "./labAgent"
import {Agent,Peer,BDTERROR} from './type'
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
    static createInstance(_interface:TaskClientInterface): AgentManager {
        if (!AgentManager.manager) {
            AgentManager.manager = new AgentManager(_interface);
        }
        return AgentManager.manager;
    }

    async initAgentList(agents:Array<Agent>){
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
    
    async createBdtPeerClient(agentName:string,config:BdtPeerClientConfig):Promise<{err:number,log?:string,bdtClient?:BdtPeerClient}>{
        if(!this.agentMap.has(agentName)){
            return {err:BDTERROR.AgentError,log:`${agentName} not exsit`}
        }
        return this.agentMap.get(agentName)!.startPeerClient(config)

    }
    async allAgentStartBdtPeer(config:BdtPeerClientConfig,num:number=1){
        let taskList = []
        for(let agent of this.agentMap.values()){
            for(let j=0;j<num;j++){
                taskList.push(agent.startPeerClient(config))
            }
        } 
        for(let i in taskList){
            await taskList[i]
        }
    } 
    async uploadLog(testcaseId:string):Promise<{err:ErrorCode,log:string}>{
        let taskList = []
        for(let agent of this.agentMap.values()){
            taskList.push(agent.uploadLog(testcaseId));
        }
        for(let i in taskList){
            await taskList[i]
        }
        return {err:BDTERROR.success,log:`save test log to server success`}
    }
    async reportAgent(testcaseId: string,report_agent:boolean,report_bdtClient:boolean) :Promise<{err:ErrorCode,log:string}>{
        let taskList = []
        for(let agent of this.agentMap.values()){
            taskList.push(agent.reportAgent(testcaseId,report_agent,report_bdtClient));
        }
        for(let i in taskList){
            await taskList[i]
        }
        return {err:BDTERROR.success,log:`reportAgent to server success`}
    }
}
