import {ErrorCode, RandomGenerator, Logger, TaskClientInterface, ClientExitCode, sleep} from '../../base';
import {AgentManager} from './agent_manager';
import {BDTERROR,ActionType,Agent,Testcase,Task,Action,ActionAbstract} from './type';
import {request,ContentType} from "./request";
import * as config from "./config"
import * as fs from 'fs';
import * as path from 'path';

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
    private JSONReport :{TestcaseInfo:any,TaskList:Array<any>,actionList:Array<{taskId:string,data:Array<any>}> };
    constructor(_interface:TaskClientInterface,is_perf:boolean=false){
        this.m_interface = _interface;
        this.logger = this.m_interface.getLogger();
        this.agentManager =  AgentManager.createInstance(_interface); 
        this.errorList = [];
        this.is_perf = is_perf;
        this.taskList = [];
        this.state = "wait"; 
        this.total = 0;
        this.JSONReport = {TestcaseInfo:{},TaskList:[],actionList:[]};
        this.success = 0;
        this.failed = 0;
    }
    async initTestcase(testcase:Testcase){
        this.Testcase = testcase;
        this.state = "run";
        this.Testcase!.date = date.format(new Date(),'YYYY/MM/DD');
        this.begin_time = Date.now();
        this.Testcase!.errorList = [];
        
        if(fs.existsSync(path.join(__dirname,"../dev_config.js"))){
            let dev_config =require("../dev_config")
            this.Testcase.environment = dev_config.testcase_version;
        }else{
            this.Testcase.environment = testcase.testcaseId; 
        }
        
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
    async runTask(task:Task):Promise<{err:number,log:string, record : {taskId:string,data:Array<any>}}>{
        // 判断机器状态是否正常，机器不正常
        return new Promise(async(V)=>{
            let check = await this.agentManager.checkBdtCliList(task.LN,task.RN,task.Users);
            task.state = "run" ;
            if(!task.timeout){
                task.timeout = 5*60*1000;
            }
            let record : {taskId:string,data:Array<any>} = {taskId:task.task_id!,data:[]}
            setTimeout(() => {
                if(this.state=="run"){
                    V({err:BDTERROR.timeout,record,log:`${task.task_id} run timeout ${task.timeout},LN = ${task.LN} , RN = ${task.RN}`});
                }
            }, task.timeout);
            
            for(let i in task.action){
                await task.action[i].init(this.m_interface,task,Number(i),this.Testcase!.date!);
                let result = await task.action[i].start();
                record.data.push(task.action[i].record());
                record.data = record.data.concat(task.action[i].record_child());
                if(result.err){
                    task.state = "failed"
                    return V({err:result.err,record,log:result.log});
                }
            }
            task.state = "success" ;       
            return V({err:BDTERROR.success,record,log:"task run success"}) 
        })
        
    }
    // 添加测试任务
    async addTask(task:Task):Promise<{err:number,log:string}>{
        this.total++
        task.testcaseId = this.Testcase!.testcaseId!;
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
    async saveTestcase() {
        this.logger.info(`### ReportTestcase`)
        this.JSONReport.TestcaseInfo = {
            TestcaseName:this.Testcase!.TestcaseName,
            testcaseId:this.Testcase!.testcaseId,
            remark:this.Testcase!.remark,
            agentList: JSON.stringify(this.agentManager.agentListState),
            environment:this.Testcase!.environment,
            taskMult: config.MaxConcurrency,
            result: this.Testcase!.result,
            errorList : JSON.stringify(this.errorList),
            total: this.total,
            success : this.success!,
            failed : this.failed!,
            date:this.Testcase!.date,
        }
        
    }
    async saveTask() {
        this.logger.info(`### ReportTask`)
        for(let i in this.taskList){
            this.JSONReport.TaskList.push({
                task_id:this.taskList[i].task_id ,
                testcaseId:this.Testcase!.testcaseId,
                LN:this.taskList[i].LN,
                RN:this.taskList[i].RN,
                Users: JSON.stringify(this.taskList[i].Users),
                expect_status : this.taskList[i].expect_status,
                result:JSON.stringify(this.taskList[i].result!.err),
                resultLog : JSON.stringify(this.taskList[i].result!.log),
                state : this.taskList[i]!.state,
                date:this.Testcase!.date,
                environment:this.Testcase!.environment,
            })
        }
        return
    }
    async saveMysql(){
        if(config.ReportTestcase){
            let run = await request("POST","api/bdt/testcase/add",this.JSONReport.TestcaseInfo,ContentType.json)
            this.logger.info(`api/bdt/testcase/add resp: ${JSON.stringify(run)}`)
        }
        if(config.ReportTask){
            let run_task =await request("POST","api/bdt/task/addList",{
                taskInfoList:this.JSONReport.TaskList  
            },ContentType.json)
            this.logger.info(`api/bdt/task/add resp:  ${JSON.stringify(run_task)}`)
        }
        if(config.ReportAction){
            for(let info of this.JSONReport.actionList){
                let run_task =await request("POST","api/bdt/action/addList",{
                    list:info.data
                },ContentType.json)
                this.logger.info(`##${info.taskId} api/bdt/task/add resp:  ${JSON.stringify(run_task)}`)
            }
            
        }
        return;
    }
    async saveAgentPerfInfo() {
        if(config.SaveAgentPerfInfo){
           await this.agentManager.saveAgentPerfInfo(this.Testcase!.testcaseId);
        }
        return;
    }
    async saveJson(){
        fs.writeFileSync(path.join(this.logger.dir(),`./testReport.json`),JSON.stringify(this.JSONReport));
        return;
    }
    // 实现Task 执行队列
    async executeQueue(task:Task){
        this.runTask(task).then(async result  => {
            task.result = result;
            this.JSONReport.actionList.push(result.record)
            if(result.err){
                this.logger.error(`#####${task.task_id} ${task.LN} 运行失败，err = ${result.log}`)
                this.failed++ 
                this.errorList.push({taskId:result.record.taskId,error:result.log})
                this.logger.error(result.log);
                
                if(config.ErrorBreak){
                   await this.exitTestcase(result.err,result.log);
                }
            }else{
                this.logger.info(`#####${task.task_id} 运行成功`)
                this.success++ 
            }
            return result;
        })
        .catch(error => {
            task.result = {err:ErrorCode.exception,log:`${error}`}
            this.failed++ ;
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
        if(this.activeTaskNum < config.MaxConcurrency && this.taskRunner.length > 0) {
            const task = this.taskRunner.shift();
            this.activeTaskNum++;
            await this.executeQueue(task!);    
        }else{
            this.logger.info(`runQueue is Max activeTaskNum = ${this.activeTaskNum} ,wait task =${this.taskRunner.length}`)
        }
        return;
    }
    async saveRecord() {
        await this.saveTestcase();
        await this.saveTask();
        await this.agentManager.reportAgent(this.Testcase!.testcaseId,config.ReportAgent,config.ReportBDTPeer,config.ReportAgentCheckRun);
        await this.saveJson();
        await this.saveMysql();
        await this.saveAgentPerfInfo();
        return;
    }
    // 退出测试用例
    async exitTestcase(err:number,log:string){
        this.end_time = Date.now();
        setTimeout(async()=>{
            await this.agentManager.stopService();
            await this.m_interface.exit(err,log);
        },5*60*1000)
        if(this.failed==0){
            this.Testcase!.result = 0;
        }else{
            this.Testcase!.result = this.failed;
        }
        // 保存日志测试数据
        try {
            await this.agentManager.uploadLog(this.Testcase!.testcaseId)
            await this.saveRecord();
        } catch (error) {
            this.logger.error(error);
        }
        //打印错误数据
        this.logger.info(`######## Tescase run finished ,testcaseId = ${this.Testcase!.testcaseId}`)
        this.logger.info(`######## run total = ${this.total}`)
        this.logger.info(`######## success = ${this.success} `)
        this.logger.info(`######## failed = ${this.failed}`)
        this.logger.info(`######## ErrorList:`)
        for(let i in this.errorList){
            this.logger.info(`######## ErrorIndex ${i} taskid: ${this.errorList[i].taskId} , Error = ${this.errorList[i].error} `)
        }
        await this.agentManager.stopService();
        await this.m_interface.exit(err,log);
    }

    async waitFinished(check:number = 5){
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





