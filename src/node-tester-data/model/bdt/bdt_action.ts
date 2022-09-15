import { PrismaClient} from '@prisma/client'
import {prisma} from "../"
export interface ActionModel{
  testcaseId?: string 
  task_id?: string 
  action_id?: string 
  type?: string 
  LN?: string
  RN?: string 
  Users?: string 
  parent_action?: string 
  config?: string 
  info?: string 
  fileSize?: number 
  chunkSize?: number
  connect_time?: number 
  set_time?: number 
  send_time?: number 
  expect?: string 
  result?: string 
  result_log?: string 
  date?:string,
}



export class BdtAction{
    private prisma :PrismaClient
    constructor(){
      this.prisma = prisma;
    }
    async add(action:ActionModel){
        try {
          const result = await this.prisma.bdt_action.create({data:{
            testcaseId : action.testcaseId,
            task_id: action.task_id,
            action_id : action.action_id,
            type: action.type,
            LN: action.LN,
            RN:action.RN,
            Users: action.Users,
            parent_action:action.parent_action,
            config: action.config,
            info: action.info,
            fileSize: action.fileSize ,
            chunkSize:action.chunkSize ,
            connect_time:action.connect_time ,
            send_time:action.send_time ,
            set_time:action.set_time ,
            result:action.result,
            resultLog : action.result_log!,
            expect:action.expect,
            date : action.date,
            createTime: Date.now().toString(),
          }})
          
          return {err:0,log:` ${action.task_id} ${action.type} add record success`}
        } catch (error) {
          console.info(error)
          return {err:1,log:`${error}`}
        }
        
    }
}