import { ErrorCode, Logger, sleep } from '../../common';
import * as cyfs from "../../cyfs";
import * as path from "path";

import { BaseHandler } from "./base_handler"
import { HandlerRequestObject, HandlerRequestObjectDecoder, HandlerApi, NotFoundError, InvalidParamError,HandlerType } from "../../dec-app-base"

/**
 * 操作描述：
 * handler：remote 监听文件传输行为（ 参数group 设置传输组,get_object 获取file 对象，post_object 获取context对象，trans 创建传输任务，完成下载流程） 
 */

export class PutObjectHandler extends BaseHandler {
    async start(req: HandlerRequestObject): Promise<HandlerRequestObject> {
        // 封装一些操作
        this.handler_info.type = "PutObjectHandler"
        return await super.start(req);
    }
    async run(req: HandlerApi): Promise<HandlerApi> {
        // 默认没有操作返回报错
        if (!req.PutObjectReq) {
            return InvalidParamError
        }
        let save_object = HandlerRequestObject.create(this.stack.local_device_id().object_id,HandlerType.PutObject,`message-${Date.now()}`,JSON.stringify(req),new Uint8Array(0));

        let result = await this.stack.non_service().put_object({
            common : {
                flags : 1,
                level : cyfs.NONAPILevel.NOC
            },
            object : cyfs.NONObjectInfo.new_from_object_raw(save_object.to_vec().unwrap()).unwrap(),
        })
        if(result.err){
            return {
                PutObjectResp: {
                    result: result.val.code,
                    msg: result.val.msg,
                    message_resp : result.val.msg, 
                }
            }
        }
        return {
            PutObjectResp: {
                result: 0,
                msg: "success",
                message_resp : `save ${save_object.calculate_id()} to ood noc success`, 
            }
        }
    }
}
