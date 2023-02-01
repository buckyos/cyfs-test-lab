import { BaseAction, ActionAbstract ,Action} from "../../action";
import { ErrorCode, Logger,sleep } from '../../../base';
import * as cyfs from "../../../cyfs";
/**
 * 输入数据
 */
type TestInput = {
    group: string,
    action : cyfs.TransTaskGroupControlAction
}

export class ControlTaskGroup extends BaseAction implements ActionAbstract {
    static create_by_parent(action:Action,logger:Logger): {err:number,action?:ControlTaskGroup}{
        /**
         * 父任务下载端 remote 查询任务状态
         */
        let run = new ControlTaskGroup({
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
    async start(req:TestInput): Promise<{ err: number; log: string, resp?: cyfs.TransControlTaskGroupOutputResponse}> {
        this.action.type = "ControlTaskGroup"
        this.action.action_id = `ControlTaskGroup-${Date.now()}`
        return await super.start(req);
    }
    async run(req: TestInput): Promise<{ err: number, log: string,resp?: cyfs.TransControlTaskGroupOutputResponse }> {
        let local = this.local!;
        let info_check = await local.trans().control_task_group({
            common: {
                // api级别
                level: cyfs.NDNAPILevel.NDN,
                flags: 1,
            },
            group : req.group,
            action : req.action
        });
        this.logger.info(`control_task_group : ${JSON.stringify(info_check)}`);
        if(info_check.err){
            return {err: info_check.val.code, log: info_check.val.msg}
        }else{
            return { err: ErrorCode.succ, log: "run success" ,resp:info_check.unwrap()}
        }
       
    }
}
