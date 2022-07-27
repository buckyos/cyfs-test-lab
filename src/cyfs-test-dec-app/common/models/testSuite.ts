import * as cyfs from "../../cyfs";
import mongoose from "mongoose";
import {TestcaseManger} from "./testcaseInfo";
import {stack} from '../utils/stack';
import {DEC_ID_BASE58} from "../../config/decApp"
import {Model} from "./model";
import {requestService} from '../utils/request'
import * as path from "path";
import * as fs from "fs-extra"
const TestSuite = new mongoose.Schema({
    name: {
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
    describe: {
        type: String,
    },
    author: {
        type: String,
    },
    evn: {
        type: String,
    },
    configList: [{
        type: String,
    }],
    testcaseRunner: {
        type: String,
    },
    testcaseIds: [{
        type: String,
    }],
    create_time: {
        type: String,
    },
    
    dirId:{
        type: String,
        required: false,
    }
})
export const TestSuiteModel = mongoose.model("TestSuite", TestSuite);


export type TestSuiteInfo = {
    name?:String,
    system?:String,
    module?:String,
    evn?:String,
    describe? :String,
    author?: String,
    configList?:Array<String>,
    testcaseRunner?:String,
    testcaseIds? :Array<String>,
    create_time?:  Number,
    dirId?:String,

    
}


export class TestSuiteManger extends  Model{

    constructor() {
        super();
    }
    async recordOne(params:TestSuiteInfo):Promise<{err:boolean,log:string}>{
        return new Promise(async(v)=>{
            params.create_time = Date.now();
            console.info(`添加一条 TestSuiteInfo 记录 ${JSON.stringify(params)}`)
            try {
                let testcase = new TestSuiteModel(params).save().then((recordInfo:any)=> {
                    console.log(`保存到mongo:${JSON.stringify(recordInfo)}`) 
                    v({err:false,log:"保存数据成功"}) 
                })
            } catch (error) {
                console.info(error)
                v({err:true,log:"mongo 报存数据失败"})
            }
            
        })  
    }
    async findRecordAll():Promise<{err:boolean,log:string,datas?:Array<TestSuiteInfo>}>{
        return new Promise(async(v)=>{
            let query =TestSuiteModel.find().sort({update_time:-1}).exec((err, docs)=>{
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
    async createSimulatorSuiteBySystem(){

    }

    async createTestSuiteByModel(params:TestSuiteInfo){
         //创建用例数据列表
         const importString = `import {testSuiteJson} from '../../common' \nexport const datas :testSuiteJson = {\nsystem:"${params.system}",\nmodule : "${params.module}",\ntestcaseList : [\n`
         const endString= `]\n}`
         let testcaseString = ""
         let tmg = new TestcaseManger();
         let info =  await tmg.findRecordByModule(params.system!.toString(),params.module!.toString())
         for(let i in info.datas){
             testcaseString = testcaseString + `{id:"${info.datas![Number(i)].testcaseId}",name:"${info.datas![Number(i)].testcase_name}"},\n`
         }
         let outString = importString + testcaseString + endString;
         //复制文件到 TestSuite 里面生成测试用例集合
         let run = fs.copySync(path.join(__dirname,`../../TestSuiteTool/${params.testcaseRunner}`),path.join(__dirname,`../../TestSuite/${params.name}`))
         fs.writeFileSync(path.join(__dirname,`../../TestSuite/${params.name}/data.ts`),outString)
         let res2 = await this.recordOne(params)
         if(res2.err){
             return {err:res2.err,log:res2.log}
         }else{
             return {err:false,log:"创建测试用例集成功"}
         }
    }
    async  createTestSuiteByIds(params:TestSuiteInfo) {
        //创建用例数据列表
        const importString = `import {testSuiteJson} from '../../common' \nexport const datas :testSuiteJson = {\nsystem:"${params.system}",\nmodule : "${params.module}",\ntestcaseList : [\n`
        const endString= `]\n}`
        let testcaseString = ""
        let tmg = new TestcaseManger();
        for(let i in params.testcaseIds!){
            let info =await tmg.findRecordById(params.testcaseIds![i].toString());
            if(info.err){
                return info 
            }
            testcaseString = testcaseString + `{id:"${info.datas![0].testcaseId}",name:"${info.datas![0].testcase_name}"},\n`
        }
        let outString = importString + testcaseString + endString;
        //复制文件到 TestSuite 里面生成测试用例集合
        let run = fs.copySync(path.join(__dirname,`../../TestSuiteTool/${params.testcaseRunner}`),path.join(__dirname,`../../TestSuite/${params.name}`))
        fs.writeFileSync(path.join(__dirname,`../../TestSuite/${params.name}/data.ts`),outString)
        let res2 = await this.recordOne(params)
        if(res2.err){
            return {err:res2.err,log:res2.log}
        }else{
            return {err:false,log:"创建测试用例集成功"}
        }
    }
    async createSuiteByFile(params:TestSuiteInfo,filePath:string):Promise<{err:boolean,log:string}>{
        // //将文件保存到本地testSuite目录
        // let savePath = path.join(__dirname,"../../TestSuite",params.name.toString())
        // let res0 = await fs.copySync(filePath,savePath);
        // //将数据存到NDC
        // let res1 = await this.stack.trans().add_file({
        //     owner:this.stack.local_device().calculate_id(),
        //     local_path: savePath,
        //     chunk_size: 4*1024*1024     // chunk大小4M
        // })
        // if(res1.err){
        //     return {err:res1.err,log:res1.val.toString()}
        // }
        // let dirId =  res1.unwrap().file_id.to_base_58()
        // //保存数据到自己Mongo
        // params.dirId = dirId;
        // let res2 = await this.recordOne(params)
        // if(res2.err){
        //     return {err:res2.err,log:res2.log}
        // }else{
        //     return {err:false,log:"创建测试用例集成功"}
        // }  
        return {err:true,log:"创建测试用例集失败"} 
    }

}