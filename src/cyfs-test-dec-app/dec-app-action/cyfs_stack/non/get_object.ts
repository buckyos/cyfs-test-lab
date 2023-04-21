import {BaseAction,ActionAbstract,Action} from "../../../cyfs-test-util";
import { ErrorCode, Logger} from '../../../common';
import * as cyfs from "../../../cyfs";
/**
 * 输入数据
 */
 type TestInput = {
    object_id: cyfs.ObjectId,
}
type TestOutput = {
    opt_time : number,
    object_raw : Uint8Array
}

export class GetObjectAction extends BaseAction implements ActionAbstract {
    static create_by_parent(action:Action,logger:Logger): {err:number,action?:GetObjectAction}{
        let run =  new GetObjectAction({
            local : action.local,
            remote : action.remote,
            input : action.input,
            parent_action : action.action_id!,
            expect : {err:0},
        },logger)
        return {err:ErrorCode.succ,action:run}
    }
    static create_by_parent_local_noc(action:Action,logger:Logger): {err:number,action?:GetObjectAction}{
        let run =  new GetObjectAction({
            local : action.local,
            remote : action.local,
            input : action.input,
            parent_action : action.action_id!,
            expect : {err:0},
        },logger)
        return {err:ErrorCode.succ,action:run}
    }
    static create_by_parent_remote_noc(action:Action,logger:Logger): {err:number,action?:GetObjectAction}{
        let run =  new GetObjectAction({
            local : action.remote!,
            remote : action.remote,
            input : action.input,
            parent_action : action.action_id!,
            expect : {err:0},
        },logger)
        return {err:ErrorCode.succ,action:run}
    }
    async start(req:TestInput): Promise<{ err: number; log: string; resp?: TestOutput }> {
        this.action.type = "GetObjectAction";
        this.action.action_id = `GetObjectAction-${Date.now()}`
        return await super.start(req)
    }
    async run(req:TestInput): Promise<{ err: number, log: string, resp?:TestOutput}> {
        // 获取连接池中的cyfs stack
        let stack = this.local!;
        let begin_send = Date.now();
        let get_result  =await stack.non_service().get_object({
            common: {
                level: this.action.input.non_level!,
                target : this.action.remote!.device_id!,
                flags: 0,

            },
            object_id:req.object_id,
        })
        let opt_time = Date.now() - begin_send;
        if(get_result.err){
            return {err:get_result.val.code,log:get_result.val.msg}
        }
        let object_raw = get_result.unwrap().object.object_raw 
        return { err: ErrorCode.succ, log: "success",resp:{opt_time,object_raw}}
       
    }
}
