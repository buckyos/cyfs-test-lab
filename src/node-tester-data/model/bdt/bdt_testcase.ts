
import { PrismaClient,bdt_testcase} from '@prisma/client'
import {prisma} from "../"
export type TestcaseModel = {
  testcase_id: string 
    TestcaseName: string 
    remark?: string 
    agentList?: string 
    environment?: string 
    taskMult?: string 
    createTime?: string
    result?: string
    errorList?: string ,
    total?: number 
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
            testcaseId : testcase.testcase_id,
            remark: testcase.remark,
            agentList:testcase.agentList,
            environment:testcase.environment,
            taskMult:String(testcase.taskMult) ,
            result:String(testcase.result) ,
            errorList:testcase.errorList,
            createTime: Date.now().toString(),
            total:testcase.total,
            success:testcase.success,
            failed:testcase.failed,
            date:testcase.date,
        }})
        return {err:0,log:`${testcase.testcase_id} add record success`}
      } catch (error) {
        console.info(error)
        return {err:0,log:` ${JSON.stringify(error)}`}
      }
        
    }
    async report(environment:string){
      try {
        const result = await this.prisma.bdt_testcase.findMany({
          where: { environment },orderBy:[{id : "asc"}]  
        });
        return {err:0,log:"getRecords success",result}
      } catch (error) {
        return {err:1,log:`${error}`}
      }
    }
    async query(testcaseId:string){
      try {
        const result = await this.prisma.bdt_testcase.findMany({
          where: { testcaseId },orderBy:[{id : "asc"}]  
        });
        return {err:0,log:"getRecords success",result}
      } catch (error) {
        return {err:1,log:`${error}`}
      }
    }
}