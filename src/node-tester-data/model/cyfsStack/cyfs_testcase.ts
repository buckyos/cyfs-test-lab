
import { PrismaClient,cyfs_testcase} from '@prisma/client'
import {prisma} from "../"
export type TestcaseModel = {
    testcase_id: string 
    testcase_name: string 
    remark?: string 
    agentList?: string 
    taskList?: string 
    environment?: string 
    taskMult?: string | number 
    createTime?: string
    result?: string| number  
    errorList?: string ,
    success?:number,
    failed?:number,
    test_date?: string 
  }

export class CyfsTestcase{
    private prisma :PrismaClient
    constructor(){
      this.prisma = prisma;
    }
    // async add(testcase:TestcaseModel){
    //   console.info(`add testcase ${JSON.stringify(testcase)}`)
    //     try {
    //       const result = await this.prisma.cyfs_testcase.create({data:{
    //         testcase_name: testcase.testcase_name,
    //         testcase_id : testcase.testcase_id,
    //         remark: testcase.remark,
    //         agentList:testcase.agentList,
    //         taskList:testcase.taskList,
    //         environment:testcase.environment,
    //         taskMult:String(testcase.taskMult) ,
    //         result:String(testcase.result) ,
    //         errorList:testcase.errorList,
    //         createTime: Date.now().toString(),
    //         success:testcase.success,
    //         failed:testcase.failed,
    //         test_date:testcase.test_date,
    //     }})
    //     return {err:0,log:`${testcase.testcase_id} add record success`}
    //   } catch (error) {
    //     return {err:0,log:` ${JSON.stringify(error)}`}
    //   }
        
    //  }
}