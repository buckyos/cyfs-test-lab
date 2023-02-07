import {BaseAction,ActionAbstract,Action} from "../../action";
import { ErrorCode, Logger} from '../../../base';
import * as cyfs from "../../../cyfs";
/**
 * 输入数据
 */
 type TestInput = {
    object_id: cyfs.ObjectId,
}
type TestOutput = {
    opt_time : number,
    object_id : cyfs.ObjectId
}

export class BuildDirFromObjectMapAction extends BaseAction implements ActionAbstract {
    static create_by_parent(action:Action,logger:Logger): {err:number,action?:BuildDirFromObjectMapAction}{
        let run =  new BuildDirFromObjectMapAction({
            local : action.local,
            remote : action.remote,
            input : action.input,
            parent_action : action.action_id!,
            expect : {err:0},
        },logger)
        return {err:ErrorCode.succ,action:run}
    }
    static create_by_parent_remote_noc(action:Action,logger:Logger): {err:number,action?:BuildDirFromObjectMapAction}{
        let run =  new BuildDirFromObjectMapAction({
            local : action.remote!,
            remote : action.remote,
            input : action.input,
            parent_action : action.action_id!,
            expect : {err:0},
        },logger)
        return {err:ErrorCode.succ,action:run}
    }
    async start(req:TestInput): Promise<{ err: number; log: string; resp?: TestOutput }> {
        this.action.type = "BuildDirFromObjectMapAction";
        this.action.action_id = `BuildDirFromObjectMapAction-${Date.now()}`
        return await super.start(req)
    }
    async run(req:TestInput): Promise<{ err: number, log: string, resp?:TestOutput}> {
        // 获取连接池中的cyfs stack
        let stack = this.local!;
        let begin_send = Date.now();
        let get_result  =await stack.util().build_dir_from_object_map({
            common: {
                target : this.action.remote!.device_id!,
                flags: 1,
            },
            object_map_id: req.object_id,
            dir_type: cyfs.BuildDirType.Zip,
        })
        let opt_time = Date.now() - begin_send;
        if(get_result.err){
            return {err:get_result.val.code,log:get_result.val.msg}
        }
        let object_id = get_result.unwrap().object_id 
        return { err: ErrorCode.succ, log: "success",resp:{opt_time,object_id}}
       
    }
}
