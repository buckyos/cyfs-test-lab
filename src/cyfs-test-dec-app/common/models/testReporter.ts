import mongoose from "mongoose";
import {TestcaseManger} from "./testcaseInfo";
import {stack} from '../utils/stack';
import {DEC_ID_BASE58} from "../../config/decApp"
import {Model} from "./model";
import {requestService} from '../utils/request'
const TestReporter = new mongoose.Schema({
    reporterName: {
      type: String,
      required: true,
      unique : true,
    },
    create_time: {
        type: String,
    },
    system: {
        type: String,
    },
    module: {
        type: String,
    },
    report_path: {
        type: String,
    },
    report_url:{
        type: String,
        required: false,
    },
    logPaths:[{
        type: String,
        required: false,
    }],
    objectId:{
        type: String,
        required: false,
    },
})
export const TestReporterModel = mongoose.model("TestReporter", TestReporter);


export type TestReporterInfo = {
    reporterName?:string,
    objectId? :string,
    create_time? : number,
    system?: string,
    module?: string,
    report_path?: string,
    report_url?: string,
    
}


export class TestReporterManger extends  Model{

    constructor() {
        super();
    }
    async recordOne(params:TestReporterInfo):Promise<{err:boolean,log:string}>{
        return new Promise(async(v)=>{
            params.create_time = Date.now();
            console.info(`添加一条 TestReporterInfo 记录 ${JSON.stringify(params)}`)
            try {
                let testcase = new TestReporterModel(params).save().then((recordInfo:any)=> {
                    console.log(`保存到mongo:${JSON.stringify(recordInfo)}`) 
                    v({err:false,log:"保存数据成功"}) 
                })
            } catch (error) {
                console.info(error)
                v({err:true,log:"mongo 报存数据失败"})
            }
            
        })  
    }
    async findRecordAll():Promise<{err:boolean,log:string,datas?:Array<TestReporterInfo>}>{
        return new Promise(async(v)=>{
            let query =TestReporterModel.find().sort({update_time:-1}).exec((err, docs)=>{
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
    async findRecordByName(name:string):Promise<{err:boolean,log:string,datas?:Array<TestReporterInfo>}> {
        return new Promise(async(v)=>{
            let query =TestReporterModel.find({name:`${name}`}).sort({update_time:-1}).exec((err, docs)=>{
                if(err){
                    v({err:true,log:`${err}`});
                }else{
                    v({err:false,datas:docs,log:"查询成功"})
                }
            });
        })    
    }
    async findFromNON(page_index:number ,page_size:number):Promise<{err:boolean,log:string,datas?:Array<TestReporterInfo>}>{
        let res_qa =  await requestService("testReporter/list",{
            dec_id : DEC_ID_BASE58,
            page_size,
            page_index,
        })
        if(res_qa.err){
            console.info(`OOD 运行测试用例：${res_qa.msg}`)
        }
        return {
            err : res_qa.err,
            log : res_qa.msg,
            datas : res_qa.data.data
        };
    }
    async deleteNONObjectById(objectId:string ):Promise<{err:boolean,log:string}>{
        let res_qa =  await requestService("testReporter/delete",{
            dec_id : DEC_ID_BASE58,
            objectId : objectId,
        })
        if(res_qa.err){
            console.info(`OOD 运行测试用例：${res_qa.msg}`)
        }
        return {
            err : res_qa.err,
            log : res_qa.msg,
        };
    }
        //  reporterName:string,
        //  system: string,
        //  module : string,
        //  cmd : string,
        //  timeout : number

}