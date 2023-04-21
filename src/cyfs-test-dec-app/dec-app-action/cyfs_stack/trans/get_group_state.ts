import { BaseAction, ActionAbstract ,Action} from "../../../cyfs-test-util";
import { ErrorCode, Logger,sleep } from '../../../common';
import * as cyfs from "../../../cyfs";
/**
 * 输入数据
 */
type TestInput = {
    group: string,
    speed_when?: cyfs.JSBI
}
type TestOutput = {
    state: cyfs.DownloadTaskState,
    control_state : cyfs.DownloadTaskControlState,
    cur_speed? : number,
    history_speed?:number,
    group?: string,
}
export class GetTransGroupState extends BaseAction implements ActionAbstract {
    static create_by_parent(action:Action,logger:Logger): {err:number,action?:GetTransGroupState}{
        /**
         * 父任务下载端 remote 查询任务状态
         */
        let run = new GetTransGroupState({
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
        this.action.type = "GetTransGroupState"
        this.action.action_id = `GetTransGroupState-${Date.now()}`
        return await super.start(req);
    }
    async run(req: TestInput): Promise<{ err: number, log: string,resp?: TestOutput }> {
        let local = this.local!;
        let info_check = await local.trans().get_task_group_state({
            common: {
                // api级别
                level: cyfs.NDNAPILevel.NDN,
                flags: 1,
            },
            group: req.group,
            speed_when : req.speed_when
        });
        this.logger.info(`get_task_group_state : ${JSON.stringify(info_check)}`);
        if(info_check.err){
            return {err: info_check.val.code, log: info_check.val.msg}
        }else{
            return { err: ErrorCode.succ, log: "run success" ,resp:{
                control_state:info_check.unwrap().control_state, 
                cur_speed: info_check.unwrap().cur_speed,
                history_speed: info_check.unwrap().history_speed,
                state : info_check.unwrap().state,
            }}
        }
       
    }
}
