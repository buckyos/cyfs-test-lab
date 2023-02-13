import {BaseAction,ActionAbstract,Action} from "../../action";
import { ErrorCode, Logger} from '../../../base';
import * as cyfs from "../../../cyfs";
import {HandlerApi,HandlerRequestObject,HandlerRequestObjectDecoder,HandlerType,ShareFileAddAccessHandlerReq,ShareFileAddAccessHandlerResp } from "../../../common_base"

/**
 * post_object 到目标协议栈，触发监听器
*/

export class ShareFileAddAccessRequest extends BaseAction implements ActionAbstract {
    static create_by_parent(action:Action,logger:Logger): {err:number,action?:ShareFileAddAccessRequest}{
        let run =  new ShareFileAddAccessRequest({
            local : action.local,
            remote : action.remote,
            input : action.input,
            parent_action : action.action_id!,
            expect : {err:0},
        },logger)
        return {err:ErrorCode.succ,action:run}
    }
    async start(req:ShareFileAddAccessHandlerReq): Promise<{ err: number; log: string; resp?: ShareFileAddAccessHandlerResp }> {
        this.action.type = "ShareFileAddAccessRequest";
        this.action.action_id = `ShareFileAddAccessRequest-${Date.now()}`
        return await super.start(req)
    }
    async run(req:ShareFileAddAccessHandlerReq): Promise<{ err: number, log: string, resp?:ShareFileAddAccessHandlerResp}> {
        // 获取连接池中的cyfs stack
        let local = this.local!;
        let request : HandlerApi = {
            ShareFileAddAccessHandlerReq :req
        }
        let handler_request = HandlerRequestObject.create(local.local_device_id().object_id,HandlerType.ShareFileAddAccess,this.action.action_id!,JSON.stringify(request),new Uint8Array(0));
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
        let resp : HandlerApi  = JSON.parse(response_object.request_json);
        if(!resp.ShareFileAddAccessHandlerResp){
            return { err: ErrorCode.invalidParam, log: "error response data",resp:resp.ShareFileAddAccessHandlerResp}
        }
        return { err: ErrorCode.succ, log: "success",resp:resp.ShareFileAddAccessHandlerResp!}
       
    }
}
