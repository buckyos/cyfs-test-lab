import {BaseAction,ActionAbstract,Action} from "../../action";
import { ErrorCode, Logger} from '../../../common';
import * as cyfs from "../../../cyfs";
import {HandlerApi,HandlerRequestObject,HandlerRequestObjectDecoder,PrepareTransFileHandlerReq,HandlerType, PrepareTransFileHandlerResp} from "../../../dec-app-base"

/**
 * post_object 到目标协议栈，触发监听器
*/

export class PrepareTransFileRequest extends BaseAction implements ActionAbstract {
    static create_by_parent(action:Action,logger:Logger): {err:number,action?:PrepareTransFileRequest}{
        let run =  new PrepareTransFileRequest({
            local : action.local,
            remote : action.remote,
            input : action.input,
            parent_action : action.action_id!,
            expect : {err:0},
        },logger)
        return {err:ErrorCode.succ,action:run}
    }
    async start(req:PrepareTransFileHandlerReq): Promise<{ err: number; log: string; resp?: PrepareTransFileHandlerResp }> {
        this.action.type = "PrepareTransFileRequest";
        this.action.action_id = `PrepareTransFileRequest-${Date.now()}`
        return await super.start(req)
    }
    async run(req:PrepareTransFileHandlerReq): Promise<{ err: number, log: string, resp?:PrepareTransFileHandlerResp}> {
        // 获取连接池中的cyfs stack
        let local = this.local!;
        let request : HandlerApi = {
            PrepareTransFileHandlerReq :req
        }
        let handler_request = HandlerRequestObject.create(local.local_device_id().object_id,HandlerType.PrepareTransFile,this.action.action_id!,JSON.stringify(request),new Uint8Array(0));
        let result =  await local.non_service().post_object({
            common: {
                req_path: req.req_path,
                dec_id : local.dec_id,
                level: cyfs.NONAPILevel.Router,
                target : this.action.remote?.device_id,
                flags: 1,
            },
            object : new cyfs.NONObjectInfo(handler_request.calculate_id(),handler_request.to_vec().unwrap()),
        });
        if(result.err){
            return { err: result.val.code, log: result.val.msg}
        }
        let response = result.unwrap();
        let response_object = new HandlerRequestObjectDecoder().from_raw( response.object!.object_raw).unwrap();
        this.logger.info(`post_object resp = ${JSON.stringify(response_object.request_json)}`);
        return { err: ErrorCode.succ, log: "success",resp:JSON.parse(response_object.request_json).PrepareTransFileHandlerResp!}
       
    }
}
