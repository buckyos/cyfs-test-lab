import { PrismaClient} from '@prisma/client'
import {prisma} from "../"
export interface BdtClientModel{
  testcaseId?: string 
  name?: string 
  peerid?: string 
  peerInfo?: string 
  sn_resp_eps?: string
}



export class BdtClient{
    private prisma :PrismaClient
    constructor(){
      this.prisma = prisma;
    }
    async add(action:BdtClientModel){
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
            result_log : action.result_log,
            expect:action.expect,
            createTime: Date.now().toString(),
          }})
          
          return {err:0,log:` ${action.name} add record success`}
        } catch (error) {
          console.info(error)
          return {err:1,log:`${error}`}
        }
        
    }
}