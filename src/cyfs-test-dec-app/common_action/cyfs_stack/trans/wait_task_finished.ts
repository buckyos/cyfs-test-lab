import { BaseAction, ActionAbstract ,Action} from "../../action";
import { ErrorCode, Logger,sleep } from '../../../base';
import * as cyfs from "../../../cyfs";
/**
 * 输入数据
 */
type TestInput = {
    task_id: string,
    check_time? : number,
}
type TestOutput = {
    state: cyfs.TransTaskStateInfo,
    group?: string,
}
export class WaitTaskFinished extends BaseAction implements ActionAbstract {
    static create_by_parent(action:Action,logger:Logger): {err:number,action?:WaitTaskFinished}{
        /**
         * 父任务下载端 remote 查询任务状态
         */
        let run = new WaitTaskFinished({
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
        this.action.type = "WaitTaskFinished"
        this.action.action_id = `WaitTaskFinished-${Date.now()}`
        return await super.start(req);
    }
    async run(req: TestInput): Promise<{ err: number, log: string,resp?: TestOutput }> {
        let local = this.local!;
        if(!req.check_time){
            req.check_time = 20;
        }
        while (req.check_time>0) {
            let info_check = await local.trans().get_task_state({
                common: {
                    // api级别
                    level: cyfs.NDNAPILevel.NDN,
                    flags: 1,
                },
                task_id: req.task_id,
            });
            this.logger.info(`get_task_state : ${JSON.stringify(info_check)}`);
            if (info_check.unwrap().state.state == cyfs.TransTaskState.Pending || info_check.unwrap().state.state == cyfs.TransTaskState.Downloading) {
                await sleep(1000);
            } else {
                if(info_check.unwrap().state.state == cyfs.TransTaskState.Finished){
                    return { err: ErrorCode.succ, log: "run success" ,resp:info_check.unwrap()}
                }else{
                    return { err: ErrorCode.fail, log: `error state ${JSON.stringify(info_check.unwrap().state.state)}` ,resp:info_check.unwrap()}
                }
                
            }
            req.check_time = req.check_time - 1;

        };
        return { err: ErrorCode.timeout, log: "check task finished timeout"}       
    }
    
}
