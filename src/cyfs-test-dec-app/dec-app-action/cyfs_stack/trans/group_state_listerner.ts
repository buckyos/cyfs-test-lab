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
type TestOutput = Array<{
    speed_when : cyfs.JSBI
    state: cyfs.DownloadTaskState,
    control_state : cyfs.DownloadTaskControlState,
    cur_speed? : number,
    speed? : number,
    history_speed?:number,
    group?: string,
}>
/**
 * 监听group 传输状态
 * group 连续10个检查周期没有速度，退出监听
 * 
 */
export class GroupStateListerner extends BaseAction implements ActionAbstract {
    static create_by_parent(action:Action,logger:Logger): {err:number,action?:GroupStateListerner}{
        /**
         * 父任务下载端 remote 查询任务状态
         */
        let run = new GroupStateListerner({
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
        this.action.type = "GroupStateListerner"
        this.action.action_id = `GroupStateListerner-${Date.now()}`
        return await super.start(req);
    }
    async run(req: TestInput): Promise<{ err: number, log: string,resp?: TestOutput }> {
        let local = this.local!;
        let record_list = [];
        let cur_speed_zero_count = 0;
        while(true){
            let speed_when = cyfs.bucky_time_now()
            let info_check = await local.trans().get_task_group_state({
                common: {
                    // api级别
                    level: cyfs.NDNAPILevel.NDN,
                    flags: 1,
                },
                group: req.group,
                //speed_when,
            });
            this.logger.info(`get_task_group_state : ${JSON.stringify(info_check)}`);
            if(info_check.err){
                return {err: info_check.val.code, log: info_check.val.msg}
            }else{
                record_list.push({
                    group:req.group,
                    speed_when,
                    control_state:info_check.unwrap().control_state,
                    cur_speed: info_check.unwrap().cur_speed,
                    speed : info_check.unwrap().speed,
                    history_speed: info_check.unwrap().history_speed, 
                    state : info_check.unwrap().state,
                })       
            }
            // 如果group 状态不是normal 退出
            if(info_check.unwrap().control_state != cyfs.DownloadTaskControlState.Normal){
                break;
            }
            // 如果下载状态 Err 也退出
            if(info_check.unwrap().state.Error){
                break;
            }
            // 检查当前速度
            if(info_check.unwrap().cur_speed == 0 || info_check.unwrap().speed == 0 ){
                cur_speed_zero_count = cur_speed_zero_count + 1
            }else{
                cur_speed_zero_count = 0
            }
            if(cur_speed_zero_count>10){
                break;
            }
            await sleep(1000)
        }
        return {err:ErrorCode.succ, log: `run finished`,resp:record_list}
       
    }
}
