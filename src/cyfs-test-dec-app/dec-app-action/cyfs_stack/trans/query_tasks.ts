import { BaseAction, ActionAbstract ,Action} from "../../../cyfs-test-util";
import { ErrorCode, Logger,sleep } from '../../../common';
import * as cyfs from "../../../cyfs";
/**
 * 输入数据
 */
type TestInput = {
    task_status: cyfs.TransTaskStatus,
    range? : [number|cyfs.JSBI,number],

}
type TestOutput = {
    task_list : cyfs.TransTaskInfo[]
    
}
export class QueryTaskAction extends BaseAction implements ActionAbstract {
    static create_by_parent(action:Action,logger:Logger): {err:number,action?:QueryTaskAction}{
        /**
         * 父任务下载端 remote 查询任务状态
         */
        let run = new QueryTaskAction({
            local :  action.remote!,
            remote : action.remote,
            input : {
                timeout : action.input.timeout,
            },
            parent_action : action.action_id!,
            expect : {err:0},

        },logger)
        return {err:ErrorCode.succ,action:run}
    }
    async start(req:TestInput): Promise<{ err: number; log: string, resp?: TestOutput}> {
        this.action.type = "QueryTaskAction"
        this.action.action_id = `QueryTaskAction-${Date.now()}`
        return await super.start(req);
    }
    async run(req: TestInput): Promise<{ err: number, log: string,resp?: TestOutput }> {
        let local = this.local!;
        let info_check = await local.trans().query_tasks({
            common: {
                // api级别
                level: cyfs.NDNAPILevel.NDN,
                flags: 1,
            },
            task_status: req.task_status,
            range: req.range,
        })
        this.logger.info(`get_task_state : ${JSON.stringify(info_check)}`);
        if(info_check.err){
            return {err: info_check.val.code, log: info_check.val.msg}
        }else{
            return { err: ErrorCode.succ, log: "run success" ,resp: {task_list:info_check.unwrap().task_list}}
        }
       
    }
}
