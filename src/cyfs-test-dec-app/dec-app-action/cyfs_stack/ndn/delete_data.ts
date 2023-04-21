import {BaseAction,ActionAbstract,Action} from "../../../cyfs-test-util";
import { ErrorCode, Logger} from '../../../common';
import * as cyfs from "../../../cyfs";
import {GetDataAction} from "./get_data"
/**
 * 输入数据
 */
 type TestInput = {
    range?: cyfs.NDNDataRequestRange,
    req_path:string,
    context?:string,
    group?:string,
    object_type: string,
    chunk_size: number,
    file_size?: number,
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
        // get_data 失败
        let get_data = await GetDataAction.create_by_parent(this.action,this.logger).action!.start(req);
        if(get_data.err){
            return {err:get_data.err,log:get_data.log}
        }
        let object_id = get_data.resp!.object_id!;
        let inner_path = get_data.resp!.inner_path;
        // delete_data
        let begin_send = Date.now();
        let put_result =await stack.ndn_service().delete_data({
            common: {
                level: cyfs.NDNAPILevel.NDC,
                flags: 1,
            },
            object_id,
            //range: req.range,
            inner_path,
        });
        let opt_time = Date.now() - begin_send;
        if(put_result.err){
            return {err:put_result.val.code,log:put_result.val.msg}
        }
        return { err: ErrorCode.succ, log: "success",resp:{opt_time,object_id}}
       
    }
}
