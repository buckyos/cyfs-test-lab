import { BaseAction, ActionAbstract ,Action} from "../../action";
import { ErrorCode, Logger,sleep } from '../../../base';
import * as cyfs from "../../../cyfs";
import { StackManager, CyfsDriverType ,PeerInfo} from "../../../cyfs-driver-client"
import { PublishFileAction } from "./publish_file"
import { PutContextAction } from "./put_context"
import { PubObjectCrossZone } from "../non/put_object_cross_zone"
import * as path from "path";
/**
 * 输入数据
 */
type TestInput = {
    task_id: string,
}
type TestOutput = {
    state: cyfs.TransTaskStateInfo,
    group?: string,
}
export class GetTransTaskState extends BaseAction implements ActionAbstract {
    static create_by_parent(action:Action,logger:Logger): {err:number,action?:GetTransTaskState}{
        /**
         * 父任务下载端 remote 查询任务状态
         */
        let run = new GetTransTaskState({
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
        this.action.type = "GetTransTaskState"
        this.action.action_id = `GetTransTaskState-${Date.now()}`
        return await super.start(req);
    }
    async run(req: TestInput): Promise<{ err: number, log: string,resp?: TestOutput }> {
        let local = this.local!;
        let info_check = await local.trans().get_task_state({
            common: {
                // api级别
                level: cyfs.NDNAPILevel.NDN,
                flags: 1,
            },
            task_id: req.task_id,
        });
        this.logger.info(`get_task_state : ${JSON.stringify(info_check)}`);
        if(info_check.err){
            return {err: info_check.val.code, log: info_check.val.msg}
        }else{
            return { err: ErrorCode.succ, log: "run success" ,resp:info_check.unwrap()}
        }
       
    }
}
