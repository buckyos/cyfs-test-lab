import * as cyfs from "../../cyfs";
import { BaseHandler } from "./base_handler"
import { HandlerRequestObject, HandlerRequestObjectDecoder, HandlerApi, NotFoundError, InvalidParamError } from "../../dec-app-base"

/**
 * 操作描述：
 * handler：remote 监听文件传输行为（ 参数group 设置传输组,get_object 获取file 对象，post_object 获取context对象，trans 创建传输任务，完成下载流程） 
 */

export class ShareFileAddAccessHandler extends BaseHandler {
    async start(req: HandlerRequestObject): Promise<HandlerRequestObject> {
        // 封装一些操作
        this.handler_info.type = "ShareFileAddAccessHandler"
        return await super.start(req);
    }
    async run(req: HandlerApi): Promise<HandlerApi> {
        // 默认没有操作返回报错
        if (!req.ShareFileAddAccessHandlerReq) {
            return InvalidParamError
        }
        let request_info = req.ShareFileAddAccessHandlerReq!
        // 将对象挂载
        let op_env = (await this.stack.root_state_stub(this.stack.local_device_id().object_id,this.stack.dec_id).create_path_op_env()).unwrap();
        let modify_path = await op_env.insert_with_path(request_info.req_path!,cyfs.ObjectId.from_base_58(request_info.file_id).unwrap());
        this.logger.info(`${this.stack.local_device_id().object_id.to_base_58()} op_env.insert_with_path ${JSON.stringify(req)},result = ${JSON.stringify(modify_path)} `);
        let commit_result = await op_env.commit();
        // 修改对象权限
        let test = await this.stack.root_state_meta_stub(this.stack.local_device_id().object_id,this.stack.dec_id).add_access(cyfs.GlobalStatePathAccessItem.new(
            request_info.req_path!,
            cyfs.AccessString.full(),
        ));
        this.logger.info(`${request_info.req_path} root_state_meta_stub add_access result = ${test}`);
        // 检查是否关联成功
        let check_result = await this.stack.root_state_accessor().get_object_by_path({
            common: {
                // 来源DEC
                dec_id: this.stack.dec_id,
                // 目标设备
                target: this.stack.local_device_id().object_id,
                flags: 1
            },
            inner_path: request_info.req_path!,
        }); 
        if(check_result.err){
            this.logger.error(`${this.stack.local_device_id().object_id.to_base_58()} get req_path ${request_info.req_path!}  result =  ${JSON.stringify(check_result)}`)
            return{
                ShareFileAddAccessHandlerResp:{ result: check_result.val.code, msg : check_result.val.msg}
            } 
        }
        return {
            ShareFileAddAccessHandlerResp: {
                result: 0,
                msg: "success",
            }
        }
    }
}
