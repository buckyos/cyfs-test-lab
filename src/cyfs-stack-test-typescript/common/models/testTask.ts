import * as cyfs from '../../cyfs_node';
import mongoose from "mongoose";
import {TestcaseManger} from "./testcaseInfo";
import {stack} from '../utils/stack';
import {DEC_ID_BASE58} from "../../config/decApp"
import {Model} from "./model";
import {requestService} from '../utils/request'
const TestTask = new mongoose.Schema({
    name: {
      type: String,
      required: true,
      unique : true,
    },
    system: {
        type: String,
    },
    TestSuiteList: [{
        TestSuiteName:{
            type: String,
        },
        runCommand:{
            type: String,
        },
        runSum:{
            type: String,
        },
        TestSuiteObjectId:{
            type: String,
        },
        timeout:{
            type: Number,
        },

    }],
    agentName: {
        type: String,
    },
    agentId: {
        type: String,
    },
    describe: {
        type: String,
    },
    create_time: {
        type: String,
    },
    schedule:{
        type: String,
        required: false,
    }
})
export const TestTaskModel = mongoose.model("TestTask", TestTask);


export type TestTaskInfo = {
    name?:String,
    system?:String,
    TestSuiteList:Array<{
        TestSuiteName : String,
        runCommand: String,
        runSum : number,
        TestSuiteObjectId? : String,
        timeout:Number
    }>
    agentName? :String,
    agentId? : String, 
    describe? :String,
    create_time?:  Number,
    schedule?:String,
    
}


export class TestTaskManger extends  Model{

    constructor() {
        super();
    }
    async recordOne(params:TestTaskInfo):Promise<{err:boolean,log:string}>{
        return new Promise(async(v)=>{
            params.create_time = Date.now();
            console.info(`添加一条 TestTaskInfo 记录 ${JSON.stringify(params)}`)
            try {
                let testcase = new TestTaskModel(params).save().then((recordInfo:any)=> {
                    console.log(`保存到mongo:${JSON.stringify(recordInfo)}`) 
                    v({err:false,log:"保存数据成功"}) 
                })
            } catch (error) {
                console.info(error)
                v({err:true,log:"mongo 报存数据失败"})
            }
            
        })  
    }
    async findRecordAll():Promise<{err:boolean,log:string,datas?:Array<TestTaskInfo>}>{
        return new Promise(async(v)=>{
            let query =TestTaskModel.find().sort({update_time:-1}).exec((err, docs:any)=>{
                if(err){
                    v({err:true,log:`${err}`});
                }else{
                    v({err:false,datas:docs,log:"查询成功"})
                }
            });
        })  
    }
    async deleteOne(){

    }
    async findRecordByName(name:string):Promise<{err:boolean,log:string,datas?:Array<TestTaskInfo>}> {
        return new Promise(async(v)=>{
            let query =TestTaskModel.find({name:`${name}`}).sort({update_time:-1}).exec((err, docs:any)=>{
                if(err){
                    v({err:true,log:`${err}`});
                }else{
                    v({err:false,datas:docs,log:"查询成功"})
                }
            });
        })    
    }
    async runTask(name:string){
        let info = await this.findRecordByName(name);
        if(info.err || info.datas!.length == 0){
            return info;
        }
        let data = info.datas![0];
        let taskIdList = [];   
        for(let i in data.TestSuiteList){
            for(let j=0;j<data.TestSuiteList[i].runSum;j++){
                let res_qa =  await requestService("task/run",{
                    reporterName:data.name,
                    system: data.system,
                    module : data.TestSuiteList[i].TestSuiteName,
                    cmd : data.TestSuiteList[i].runCommand,
                    timeout : data.TestSuiteList[i].timeout
                })
                if(res_qa.err){
                    console.info(`运行测试任务：${res_qa.msg}`)
                }
                taskIdList.push({
                    suiteName:data.TestSuiteList[i].TestSuiteName,
                    id:res_qa.data.id
                })
            }
            
        }
        return {err:false,task:taskIdList};
    }
    async checkTask(id:string){
        let res_qa =  await requestService("task/check",{
            id
        })
        if(res_qa.err){
            console.info(`检查测试任务状态：${res_qa.msg}`)
        }
        return res_qa;
    }
    async stopTask(id:string){
        let res_qa =  await requestService("task/stop",{
            id
        })
        if(res_qa.err){
            console.info(`检查测试任务状态：${res_qa.msg}`)
        }
        return res_qa;
    }
    async taskList(){
        let res_qa =  await requestService("task/list",{
        })
        if(res_qa.err){
            console.info(`检查测试任务状态：${res_qa.msg}`)
            return{err:true,
                msg:res_qa.msg,
                taskList:"查询失败",
                taskListHistory:"查询失败",
                taskRunning : "查询失败"
            }
        }
        let taskList = "未执行测试任务等待队列：\n";
        let taskListHistory = "测试任务执行历史：\n";
        let taskRunning = "当前执行中测试任务：\n";
        if(res_qa.data!.task.taskRunning){
            
            taskRunning =taskRunning + `${res_qa.data!.task.taskRunning.reporterName}-${res_qa.data!.task.taskRunning.module}-${res_qa.data!.task.taskRunning.id}`
        }
        for(let i in res_qa.data!.task.taskList){
            taskList = taskList + `(${i}) ${res_qa.data!.task.taskList[Number(i)].reporterName}-${res_qa.data!.task.taskList[Number(i)].module}-${res_qa.data!.task.taskList[Number(i)].id}\n`
        }
        for(let i in res_qa.data!.task.taskListHistory){
            taskListHistory = taskListHistory + `(${i}) ${res_qa.data!.task.taskListHistory[Number(i)].reporterName}-${res_qa.data!.task.taskListHistory[Number(i)].module}-${res_qa.data!.task.taskListHistory[Number(i)].id}\n`
        }
        return {err:false,
            msg:res_qa.msg,
            taskList,
            taskListHistory,
            taskRunning,
        };
    }
        //  reporterName:string,
        //  system: string,
        //  module : string,
        //  cmd : string,
        //  timeout : number

}