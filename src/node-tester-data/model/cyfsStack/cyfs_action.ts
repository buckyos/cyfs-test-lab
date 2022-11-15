import { PrismaClient,cyfs_action} from '@prisma/client'
import {prisma} from "../"
export interface ActionModel{
  testcaseId: string | null
  task_id?: string | null
  action_id?: string | null
  parent_action?: string | null
  type?: string | null
  source?: string | null
  target?: string | null
  input_data?: string | null
  timeout?: number | null
  data_size?: number | null
  opt_time?: number | null
  cache_size?: number | null
  result?: string | null
  expect?: string | null
  createTime?: string | null
}



export class CyfsAction{
    private prisma :PrismaClient
    constructor(){
      this.prisma = prisma;
    }
    // async add(action:ActionModel){
    //     try {
    //       const result = await this.prisma.cyfs_action.create({data:{
    //         testcaseId: action.testcaseId,
    //         task_id:action.task_id,
    //         action_id: action.action_id,
    //         parent_action:action.parent_action,
    //         type: action.type,
    //         source: action.source,
    //         target: action.target,
    //         input_data: action.input_data,
    //         timeout: action.timeout,
    //         data_size: action.data_size,
    //         opt_time: action.opt_time,
    //         cache_size: action.cache_size,
    //         result: action.result,
    //         expect: action.expect,
    //         createTime: Date.now().toString(),
    //       }})
          
    //       return {err:0,log:` ${action.task_id} ${action.type} add record success`}
    //     } catch (error) {
    //       console.info(error)
    //       return {err:2,log:`${error}`}
    //     }
        
    // }
}