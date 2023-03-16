import {BaseAction,ActionAbstract,Action} from "../../action";
import { ErrorCode, Logger} from '../../../common';
import * as cyfs from "../../../cyfs";
import {HandlerRequestObject,HandlerRequestObjectDecoder} from "../../../dec-app-base"

/**
 * 输入数据
 */
 type TestInput = {
    req_path?: string,
    object_raw: Uint8Array
}

/**
 * post_object 到目标协议栈，触发监听器
 * 
 */
export class PostHandlerRequestObject extends BaseAction implements ActionAbstract {
    static create_by_parent(action:Action,logger:Logger): {err:number,action?:PostHandlerRequestObject}{
        let run =  new PostHandlerRequestObject({
            local : action.local,
            remote : action.remote,
            input : action.input,
            parent_action : action.action_id!,
            expect : {err:0},
        },logger)
        return {err:ErrorCode.succ,action:run}
    }
    async start(req:TestInput): Promise<{ err: number; log: string; resp?: any; }> {
        this.action.type = "PostHandlerRequestObject";
        this.action.action_id = `PostHandlerRequestObject-${Date.now()}`
        return await super.start(req)
    }
    async run(req:TestInput): Promise<{ err: number, log: string, resp?:any}> {
        // 获取连接池中的cyfs stack
        let local = this.local!;
        let result =  await local.non_service().post_object({
            common: {
                req_path: req.req_path,
                dec_id : local.dec_id,
                level: cyfs.NONAPILevel.Router,
                target : this.action.remote?.device_id,
                flags: 1,
            },
            object : cyfs.NONObjectInfo.new_from_object_raw(req.object_raw).unwrap(),
        });
        if(result.err){
            return { err: result.val.code, log: result.val.msg}
        }
        let response = result.unwrap();
        let response_object = new HandlerRequestObjectDecoder().from_raw( response.object!.object_raw).unwrap()
        return { err: ErrorCode.succ, log: "success",resp:JSON.parse(response_object.request_json)}
       
    }
}
