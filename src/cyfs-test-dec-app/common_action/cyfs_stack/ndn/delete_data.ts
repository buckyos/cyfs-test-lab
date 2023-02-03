import {BaseAction,ActionAbstract,Action} from "../../action";
import { ErrorCode, Logger} from '../../../base';
import * as cyfs from "../../../cyfs";
import {HandlerApi} from "../../../common_base"
import { StackManager, CyfsDriverType ,PeerInfo} from "../../../cyfs-driver-client"
/**
 * 输入数据
 */
 type TestInput = {
    object_id: cyfs.ObjectId,
    //range: cyfs.NDNDataRequestRange,
    inner_path: string,
}
type TestOutput = {
    opt_time : number,
    object_id : cyfs.ObjectId
}

export class DeleteDataAction extends BaseAction implements ActionAbstract {
    static create_by_parent(action:Action,logger:Logger): {err:number,action?:DeleteDataAction}{
        let run =  new DeleteDataAction({
            local : action.local,
            remote : action.remote,
            input : action.input,
            parent_action : action.action_id!,
            expect : {err:0},
        },logger)
        return {err:ErrorCode.succ,action:run}
    }
    async start(req:TestInput): Promise<{ err: number; log: string; resp?: TestOutput }> {
        this.action.type = "DeleteDataAction";
        this.action.action_id = `DeleteDataAction-${Date.now()}`
        return await super.start(req)
    }
    async run(req:TestInput): Promise<{ err: number, log: string, resp?:TestOutput}> {
        // 获取连接池中的cyfs stack
        let stack = this.local!;
        let begin_send = Date.now();
        let put_result =await stack.ndn_service().delete_data({
            common: {
                level: cyfs.NDNAPILevel.NDC,
                flags: 1,
            },
            object_id : req.object_id,
            //range: req.range,
            inner_path: req.inner_path,
        });
        let opt_time = Date.now() - begin_send;
        if(put_result.err){
            return {err:put_result.val.code,log:put_result.val.msg}
        }
        let object_id = put_result.unwrap().object_id
        return { err: ErrorCode.succ, log: "success",resp:{opt_time,object_id}}
       
    }
}
