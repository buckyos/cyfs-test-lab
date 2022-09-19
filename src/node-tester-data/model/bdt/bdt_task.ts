import { PrismaClient,bdt_task } from '@prisma/client'
import {prisma} from "../"
export type TaskModel = {
  task_id: string
  testcaseId: string
  LN: string 
  RN: string 
  Users: string 
  result: string 
  expect_status: string 
  state: string 
  date?:string,
  resultLog ?:string
  environment?:string
}
export class BdtTask{
    private prisma :PrismaClient
    constructor(){
      this.prisma = prisma;
    }
    async add(task:TaskModel){
        try {

          const result = await this.prisma.bdt_task.create({data:{
              testcaseId : task.testcaseId,
              task_id: task.task_id,
              LN:task.LN,
              RN:task.RN,
              Users: task.Users,
              result: task.result,
              state:task.state,
              expect_status:task.expect_status,
              date : task.date,
              environment : task.environment,
              resultLog: task.resultLog,
              createTime: Date.now().toString(),
          }})
          return {err:0,log:`${task.task_id} add record success`}
        } catch (error) {
          console.info(error)
          return {err:1,log:`${JSON.stringify(error)}`} 
        }
        
    }
}