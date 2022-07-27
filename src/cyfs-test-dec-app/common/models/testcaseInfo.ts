import * as cyfs from "../../cyfs";
import mongoose from "mongoose";
import {stack} from '../utils/stack';
import {DEC_ID_BASE58} from "../../config/decApp"
import {Model} from "./model";
import {requestService} from '../utils/request'
const Testcase = new mongoose.Schema({
    testcaseId: {
      type: String,
      required: true,
      unique : true,
    },
    system: {
        type: String,
    },
    module: {
        type: String,
    },
    type: {
        type: String,
    },
    priority: {
        type: String,
    },
    level: {
        type: String,
    },
    author: {
        type: String,
    },
    create_time: {
        type: Number,
    },
    update_time: {
        type: Number,
    },
    testcase_name: {
        type: String,
    },
    precondition: {
        type: String,
    },
    postcondition: {
        type: String,
    },
    expect_result: {
        type: String,
    },
    input_data: {
        type: String,
    }
})
export const TestcaseModel = mongoose.model("Testcase", Testcase);


export type testcaseInfo = {
    owner?:string,
    testcaseId: String,
    system:  String,
    module: String,
    type: String,
    priority: String,
    level:  String,
    author: String,
    create_time:  Number,
    update_time:  Number,
    testcase_name: String,
    precondition: String,
    postcondition:  String,
    expect_result:  String,
    input_data: String
}
export type testcaseInfoUpdate = {
    system?:  String,
    module?: String,
    type?: String,
    priority?: String,
    level?:  String,
    author?: String,
    create_time?:  Number,
    update_time?:  Number,
    testcase_name?: String,
    precondition?: String,
    postcondition?:  String,
    expect_result?:  String,
    input_data?: String
}


export class TestcaseManger extends  Model{

    constructor() {
        super();
    }
    // async init(){
    //     await this.initStack
    // }
    async recordOne(params:testcaseInfo):Promise<{err:boolean,log:string}>{
        return new Promise(async(v)=>{

            console.info(`添加一条testcase 记录 ${JSON.stringify(params)}`)
            try {
                let testcase = new TestcaseModel(params).save().then((recordInfo:any)=> {
                    console.log(`保存到mongo:${JSON.stringify(recordInfo)}`) 
                    v({err:false,log:"保存数据成功"}) 
                })
            } catch (error) {
                console.info(error)
                v({err:true,log:"mongo 报存数据失败"})
            }
            
            })  
    }
    async findRecordAll():Promise<{err:boolean,log:string,datas?:Array<testcaseInfo>}> {
        return new Promise(async(v)=>{
            let query =TestcaseModel.find().sort({update_time:-1}).exec((err, docs)=>{
                if(err){
                    v({err:true,log:`${err}`});
                }else{
                    v({err:false,datas:docs,log:"查询成功"})
                }
            });
        })    
    }

    async findRecordById(testcaseId:string):Promise<{err:boolean,log:string,datas?:Array<testcaseInfo>}> {
        return new Promise(async(v)=>{
            let query =TestcaseModel.find({testcaseId:`${testcaseId}`}).sort({update_time:-1}).exec((err, docs)=>{
                if(err){
                    v({err:true,log:`${err}`});
                }else{
                    v({err:false,datas:docs,log:"查询成功"})
                }
            });
        })    
    }
    async findRecordByModule(system:string,module?:string):Promise<{err:boolean,log:string,datas?:Array<testcaseInfo>}> {
        return new Promise(async(v)=>{
            let query =TestcaseModel.find({module,system}).sort({update_time:-1}).exec((err, docs)=>{
                if(err){
                    v({err:true,log:`${err}`});
                }else{
                    v({err:false,datas:docs,log:"查询成功"})
                }
            });
        })    
    }
    async deleteLocal():Promise<{err:boolean,log:string}> {
        return new Promise(async(v)=>{
            let query =TestcaseModel.deleteMany(function(err){
                if(err){
                    console.log('删除失败')
                } else {
                    console.log('删除成功')
                }
            })
    
        })
    }
    async deleteById(testcaseId:string):Promise<{err:boolean,log:string}> {
        return new Promise(async(v)=>{
            let query =TestcaseModel.deleteMany({testcaseId:testcaseId},function(err){
                if(err){
                    console.log('删除失败')
                } else {
                    console.log('删除成功')
                }
            })
    
        })
    }


    async putDateToNonById(testcaseId:string,target:string){
        let datas = (await this.findRecordById(testcaseId)).datas;
        let targetId = cyfs.ObjectId.from_base_58(target).unwrap();
        for(let i in datas){
            let data = datas[Number(i)];
            data.owner = this.stack.local_device().calculate_id().to_base_58();
            let res_qa =  await requestService("testcase/create",data,targetId)
            if(res_qa.err){
                console.info(`同步本地testcase 数据到 OOD 失败：${res_qa.msg}`)
            }
            console.info(JSON.stringify(res_qa))
        }
        console.info(`同步本地testcase 数据到 OOD 成功`)
    }
    async putDateToNonByModule(system:string,module:string,target?:string){
        let datas = (await this.findRecordByModule(system,module)).datas;
        let targetId:cyfs.ObjectId;
        if(target){
            targetId = cyfs.ObjectId.from_base_58(target).unwrap();
        }else{
            targetId = this.stack.local_device().calculate_id();
        }
        
        for(let i in datas){
            let data = datas[Number(i)];
            data.owner = this.stack.local_device().calculate_id().to_base_58();
            let res_qa =  await requestService("testcase/create",data,targetId)
            if(res_qa.err){
                console.info(`同步本地testcase 数据到 OOD 失败：${res_qa.msg}`)
            }
            console.info(JSON.stringify(res_qa))
        }
        console.info(`同步本地testcase 数据到 OOD 成功`)
    }
    async putDateToNonAll(target:string){
        let datas = (await this.findRecordAll()).datas;
        let targetId = cyfs.ObjectId.from_base_58(target).unwrap();
        for(let i in datas){
            let data = datas[Number(i)];
            data.owner = this.stack.local_device().calculate_id().to_base_58();
            let res_qa =  await requestService("testcase/create",data,targetId)
            if(res_qa.err){
                console.info(`同步本地testcase 数据到 OOD 失败：${res_qa.msg}`)
            }
            console.info(JSON.stringify(res_qa))
        }
        console.info(`同步本地testcase 数据到 OOD 成功`)
    }
    async selectFromNoc(page_index:number,page_size:number,target:string){
        let targetId = cyfs.ObjectId.from_base_58(target).unwrap();
        let data = {
            dec_id:DEC_ID_BASE58,
            page_size,
            page_index
        }
        let res_qa =  await requestService("testcase/list",data,targetId)
        if(res_qa.err){
            console.info(`同步本地testcase 数据到 OOD 失败：${res_qa.msg}`)
        }
        return res_qa;
    }
    async updateDataById(testcaseId:String,data:testcaseInfoUpdate):Promise<{err:boolean,log:string}>{
        return new Promise(async(v)=>{
            let query =TestcaseModel.findOneAndUpdate({testcaseId},{$set: data},{},function(err, data){
                if(err) {
                    console.log('数据库发生错误')
                }
                else if(!data) {
                    console.log('未查找到相关数据')
                    console.log(data)
                    
                }else if(data){
                    console.log('修改数据成功')
                    console.log(data)
                }
            })
            v({err:false,log:"修改成功"})
        }) 
    }
    // async updateDataByModule(system:string,module:string,updateData:testcaseInfoUpdate){
    //     let datas = (await this.findRecordByModule(system,module)).datas;
    //     for(let i in datas){
    //         let data = datas[Number(i)];
    //         let run = await this.updateDataById(data.testcaseId,updateData);
    //     }
    //     console.info(`同步本地testcase 数据到 OOD 成功`)
    // }
    
}


