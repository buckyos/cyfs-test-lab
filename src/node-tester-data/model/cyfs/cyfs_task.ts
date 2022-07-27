import { PrismaClient,cyfs_task } from '@prisma/client'
import {prisma} from ".."
export type TaskModel = {
    task_id: string
    testcaseId: string | null
    LN?: string | null
    RN?: string | null
    clients?: string | null
    action?: string | null
    child_action?: string | null
    expect?: string | null
    result?: string | null
    state?: string | null
    timeout?: number | null
    createTime?: string | null
  }
export class CyfsTask{
    private prisma :PrismaClient
    constructor(){
      this.prisma = prisma;
    }
    async add(task:TaskModel){
        try {

          const result = await this.prisma.cyfs_task.create({data:{
              testcaseId : task.testcaseId,
              task_id: task.task_id,
              LN:task.LN,
              RN:task.RN,
              clients:task.clients,
              action:task.action,
              child_action:task.child_action,
              expect: task.expect,
              result: task.result,
              state:task.state,
              timeout:task.timeout,
              createTime: Date.now().toString(),
          }})
          return {err:0,log:`${task.task_id} add record success`}
        } catch (error) {
          return {err:1,log:`${JSON.stringify(error)}`} 
        }
        
    }
}