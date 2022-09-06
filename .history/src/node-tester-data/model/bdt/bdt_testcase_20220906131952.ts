
import { PrismaClient,bdt_testcase} from '@prisma/client'
import {prisma} from "../"
export type TestcaseModel = {
    testcaseId: string 
    TestcaseName: string 
    remark?: string 
    agentList?: string 
    total?: number 
    environment?: string 
    taskMult?: string 
    createTime?: string
    result?: string
    errorList?: string ,
    success?:number,
    failed?:number,
    date?:string,
  }

export class BdtTestcase{
    private prisma :PrismaClient
    constructor(){
      this.prisma = prisma;
    }
    async add(testcase:TestcaseModel){
      console.info(`add testcase ${JSON.stringify(testcase)}`)
        try {
          const result = await this.prisma.bdt_testcase.create({data:{
            TestcaseName: testcase.TestcaseName,
            testcaseId : testcase.testcaseId,
            remark: testcase.remark,
            agentList:testcase.agentList,
            taskList:testcase.taskList,
            environment:testcase.environment,
            taskMult:String(testcase.taskMult) ,
            result:String(testcase.result) ,
            errorList:testcase.errorList,
            createTime: Date.now().toString(),
            success:testcase.success,
            failed:testcase.failed,
            date:testcase.date,
        }})
        return {err:0,log:`${testcase.testcaseId} add record success`}
      } catch (error) {
        console.info(error)
        return {err:0,log:` ${JSON.stringify(error)}`}
      }
        
    }
}