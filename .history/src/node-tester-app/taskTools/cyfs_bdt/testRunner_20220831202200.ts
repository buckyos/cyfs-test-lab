import {ErrorCode, RandomGenerator, Logger, TaskClientInterface, ClientExitCode, sleep} from '../../base';
import {AgentManager} from './agentManager';
import {BDTERROR,ActionType,Agent,Testcase,Task,Action,ActionAbstract} from './type';
import {request,ContentType} from "./request";
import * as config from "./config"
var date = require("silly-datetime");
const timeout = 300*1000;


export class TestRunner{
    private Testcase? : Testcase;// 测试用例
    private m_interface:TaskClientInterface; //测试框架接口
    private agentManager : AgentManager; // 测试设备列表
    private logger : Logger; //日志
    private taskRunner:Array<Task> = []; // 测试任务运行队列池
    private activeTaskNum: number = 0;
    private state : string; //用例执行状态，用例做控制
    private begin_time?: number;
    private end_time?:number;
    private is_perf:boolean;
    private total : number;
    private success : number;
    private failed : number;
    private errorList : Array<{taskId:string,error:string}>;
    private taskList : Array<Task>;
    private cacheTask? : Task;
    constructor(_interface:TaskClientInterface,is_perf:boolean=false){
        this.m_interface = _interface;
        this.logger = this.m_interface.getLogger();
        this.agentManager =  AgentManager.createInstance(_interface); 
        this.errorList = [];
        this.is_perf = is_perf;
        this.taskList = [];
        this.state = "wait"; 
        this.total = 0;
        this.success = 0;
        this.failed = 0;
    }
    async initTestcase(testcase:Testcase){
        this.Testcase = testcase;
        this.state = "run";
        this.Testcase!.date = date.format(new Date(),'YYYY/MM/DD');
        this.begin_time = Date.now();
        this.Testcase!.errorList = [];
    }

    createPrevTask(task:Task):{err:number,log:string}{
        if(this.cacheTask){
            this.logger.error(`createPrevTask failed,task already exsit`)
            return {err:BDTERROR.optExpectError,log:"createPrevTask failed,task already exsit"}
        }
        this.cacheTask = task; 
        return {err:BDTERROR.success,log:"createPrevTasksuccess"}
    }
    prevTaskAddAction(action:ActionAbstract):{err:number,log:string}{
        if(!this.cacheTask){
            this.logger.error(`prevTaskAddAction failed,task not exsit`)
            return {err:BDTERROR.optExpectError,log:"prevTaskAddAction failed,task not exsit"}
        }
        this.cacheTask!.action.push(action); 
        return {err:BDTERROR.success,log:"prevTaskAddAction add success"}
    }
    prevTaskRun():{err:number,log:string}{
        if(!this.cacheTask){
            this.logger.error(`prevTaskRun failed,task not exsit`)
            return {err:BDTERROR.optExpectError,log:"prevTaskRun failed,task not exsit"}
        }
        let  task = this.cacheTask!;
        this.cacheTask = undefined;
        if(this.total>=config.MaxTaskNum){
            return {err:BDTERROR.optExpectError,log:"already run MaxTaskNum"}
        }
        this.addTask(task);
        
        return {err:BDTERROR.success,log:"prevTaskRun begin run"}
    }
    // 运行测试任务
    async runTask(task:Task):Promise<{err:number,log:string,taskId:string}>{
        // 判断机器状态是否正常，机器不正常
        let check = await this.agentManager.checkBdtPeerClientList(task.LN,task.RN,task.Users);
        task.state = "run" ;
        for(let i in task.action){
            await task.action[i].init(this.m_interface,task);
            let result = await task.action[i].run();
            if(result.err){
                task.state = "failed"
                return {err:result.err,taskId:task.task_id!,log:result.log};
            }
        }
        task.state = "success" ;       
        return {err:BDTERROR.success,taskId:task.task_id!,log:"task run success"}
    }
    // 添加测试任务
    async addTask(task:Task):Promise<{err:number,log:string}>{
        this.total++
        task.task_id = `${this.Testcase!.testcaseId!}_${RandomGenerator.string(10)}`;
        if(!task.expect_status){
            task.expect_status = "success";
        }
        task.state = "init" ;
        this.taskList.push(task)
        this.addQueue(task)    
        return {err:BDTERROR.success,log:"task add success"}
    }
    // 保存测试记录到中心化服务器
    async reportTestcase() {
        this.logger.info(`### ReportTestcase`)
        let run = await request("POST","api/bdt/testcase/add",{
            TestcaseName:this.Testcase!.TestcaseName,
            testcaseId:this.Testcase!.testcaseId,
            remark:this.Testcase!.remark,
            agentList: JSON.stringify(this.agentManager.agentListState),
            taskList: this.total,
            environment:this.Testcase!.environment,
            taskMult: config.MaxConcurrency,
            result: this.Testcase!.result,
            errorList : JSON.stringify(this.Testcase!.errorList),
            success : this.success!,
            failed : this.failed!,
            date:this.Testcase!.date,
        },ContentType.json)
        this.logger.info(`api/bdt/testcase/add resp: ${JSON.stringify(run)}`)
        return;
    }
    async reportTask() {
        this.logger.info(`### ReportTask`)
        let taskInfoList = [];
        for(let i in this.taskList){
            taskInfoList.push({
                task_id:this.taskList[i].task_id ,
                testcaseId:this.Testcase!.testcaseId,
                LN:this.taskList[i].LN,
                RN:this.taskList[i].RN,
                Users: JSON.stringify(this.taskList[i].Users),
                expect_status : this.taskList[i].expect_status,
                result:JSON.stringify(this.taskList[i].result),
                state : this.taskList[i]!.state,
            })
        }
        let run_task =await request("POST","api/bdt/task/addList",{
            taskInfoList  
        },ContentType.json)

        this.logger.info(`api/bdt/task/add resp:  ${JSON.stringify(run_task)}`)
    }
    // 实现Task 执行队列
    async executeQueue(task:Task){
        this.runTask(task).then(async result  => {
            if(result.err){
                this.failed++ 
                this.errorList.push({taskId:result.taskId,error:result.log})
                this.logger.error(result.log);
                if(config.ErrorBreak){
                   await this.exitTestcase(result.err,result.log);
                }
            }else{
                this.success++ 
                this.logger.info(result.log);
            }
            return result;
        })
        .catch(error => {
            this.failed++ 
            this.errorList.push({taskId:"Test Code Expection",error})
            this.logger.error(`task run failed ,err =${error},stack = ${error.stack}`);
            
        })
        .finally(async () => {
            this.logger.info(`### task run finally,start a new task `);
            this.activeTaskNum--;
            await this.runQueue();
        });
        return;
    }
    async addQueue(task:Task){
        this.taskRunner.push(task);
        await this.runQueue();
        return;
    }
    async runQueue(){
        if(this.activeTaskNum <= config.MaxConcurrency && this.taskRunner.length > 0) {
            const task = this.taskRunner.shift();
            this.activeTaskNum++;
            await this.executeQueue(task!);    
        }else{
            this.logger.info(`runQueue is Max activeTaskNum = ${this.activeTaskNum} ,wait task =${this.taskRunner.length}`)
        }
        return;
    }
    async saveRecord() {
        if(config.ReportTestcase){
            await this.reportTestcase();
        }
    }
    // 退出测试用例
    async exitTestcase(err:number,log:string){
        this.end_time = Date.now();
        this.logger.info(`######## Tescase run finished ,testcaseId = ${this.Testcase!.testcaseId}`)
        this.logger.info(`######## run total = ${this.total}`)
        this.logger.info(`######## success = ${this.success} `)
        this.logger.info(`######## failed = ${this.failed}`)
        this.logger.info(`######## ErrorList:`)
       for(let i in this.errorList){
        this.logger.info(`######## ErrorIndex ${i} taskid: ${this.errorList[i].taskId} , Error = ${this.errorList[i].error} `)
       }
       await this.saveRecord();
        await this.agentManager.uploadLog(this.Testcase!.testcaseId)
        this.m_interface.exit(err,log);
    }

    async waitFinished(){
        //1.检查次数
        let check = 5;
        while(true){
            if(this.activeTaskNum == 0){
                check--
            }
            if(check<0){
                break;
            }
            await sleep(1000)
        }
        this.exitTestcase(0,"")
    }


}





