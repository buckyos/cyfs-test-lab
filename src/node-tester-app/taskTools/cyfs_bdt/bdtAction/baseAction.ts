import { ErrorCode, RandomGenerator, Logger, TaskClientInterface, ClientExitCode, sleep } from '../../../base';
import { AgentManager } from '../agentManager'
import { BDTERROR, ActionType, Agent, Testcase, Task, Action, ActionAbstract } from '../type'
import { request, ContentType } from "../request"
export class BaseAction implements ActionAbstract{
    public action: Action
    public m_interface?: TaskClientInterface;
    public agentManager?: AgentManager;
    public logger?: Logger;
    public state: string;
    public errorInfo: string;
   
    constructor(action: Action) {
        this.action = action;
        this.state = "new";
        this.errorInfo = "";
    }
    async checkAgent() {
        this.state = "ready";
        await this.agentManager!.checkBdtPeerClient(this.action.LN)
    }
    async init(_interface: TaskClientInterface,task:Task,index?:number): Promise<{ err: number, log: string }> {
        this.action.testcaseId = task!.testcaseId;
        this.action.task_id = task!.task_id;
        this.action.action_id = `${this.action.task_id!}_action${index}_${this.action.type}`;
        this.m_interface = _interface;
        this.logger = _interface.getLogger();
        this.agentManager = AgentManager.createInstance(_interface);
        this.state = "init";
        await this.checkAgent();
        return { err: BDTERROR.success, log: "task run success" }
    }
    async save(): Promise<{ err: number, log: string }> {
        let run_action =await request("POST","api/bdt/action/add",{
            task_id:this.action.task_id ,
            testcaseId:this.action!.testcaseId,
            type: this.action.type,
            action_id:this.action.action_id,
            parent_action :this.action.parent_action,
            LN:this.action.LN,
            RN:this.action.RN,
            Users: JSON.stringify(this.action.Users),
            config:JSON.stringify( this.action.config),
            info:JSON.stringify( this.action.info),
            fileSize : this.action.fileSize,
            chunkSize : this.action.chunkSize,
            connect_time : this.action.connect_time,
            set_time : this.action.set_time,
            send_time : this.action.send_time,
            expect:String(this.action.expect!.err),
            result: String(this.action.result!.err),
            result_log: String(this.action.result!.log),
        },ContentType.json);
        this.logger!.info(`api/bdt/action/add resp:  ${JSON.stringify(run_action)}`)
        return {err:BDTERROR.success,log:`reportAgent to server success`}
    }
    record(){
        return {
            task_id:this.action.task_id ,
            testcaseId:this.action!.testcaseId,
            type: this.action.type,
            action_id:this.action.action_id,
            parent_action :this.action.parent_action,
            LN:this.action.LN,
            RN:this.action.RN,
            Users: JSON.stringify(this.action.Users),
            config:JSON.stringify( this.action.config),
            info:JSON.stringify( this.action.info),
            fileSize : this.action.fileSize,
            chunkSize : this.action.chunkSize,
            connect_time : this.action.connect_time,
            set_time : this.action.set_time,
            send_time : this.action.send_time,
            expect:String(this.action.expect!.err),
            result: String(this.action.result!.err),
            result_log: String(this.action.result!.log),
        }
    }
    async start(): Promise<{ err: number, log: string }> {
        return new Promise(async(V)=>{
            try {
                this.state = "running";
                setTimeout(async ()=>{
                    if(this.state == "running"){
                        // 实际超时 预期失败
                        this.action.result = { err: BDTERROR.timeout, log: `${this.action.action_id} run timeout`};
                        if(this.action.expect.err){
                            V({ err: BDTERROR.success, log: "action expect err" })
                        }
                        // 实际超时 预期成功
                        V({ err: BDTERROR.timeout, log: `${this.action.action_id} run timeout`});
                    }
                },this.action.config.timeout!)
                let result = await this.run();
                this.action.result = result;
                this.state = "finished"
                // 实际失败 预期失败
                if(this.action.result.err !=0 && this.action.expect.err !=0 ){
                    V({ err: BDTERROR.success, log: "action expect err" })
                }
                // 实际成功 预期失败
                if(this.action.result.err == 0  && this.action.expect.err != 0){
                    V({ err: BDTERROR.ExpectionResult, log: "action expect err" })
                }
                // 预期成功 返回实际结果
                V(result)
            } catch (error) {
                //测试程序异常，进行捕获
                V({ err: BDTERROR.optExpectError, log: `${error}` })
            }
            
        })
    }
    async run():Promise<{ err: number, log: string }>{
        return { err: BDTERROR.success, log: "Action run success" }
    }

}
