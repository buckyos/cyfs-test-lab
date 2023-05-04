import * as cyfs from "../../../cyfs";
import { BaseHandler } from "../base_handler"
import { HandlerRequestObject, HandlerRequestObjectDecoder, HandlerApi, NotFoundError, InvalidParamError } from "../../../dec-app-base"

/**
 * 操作描述：
 * handler：remote 监听文件传输行为（ 参数group 设置传输组,get_object 获取file 对象，post_object 获取context对象，trans 创建传输任务，完成下载流程） 
 */

export class ShareObjectWithTokenHandler extends BaseHandler {
    async start(req: HandlerRequestObject): Promise<HandlerRequestObject> {
        // 封装一些操作
        this.handler_info.type = "ShareObjectWithTokenHandler"
        return await super.start(req);
    }
    async run(req: HandlerApi): Promise<HandlerApi> {
        // 默认没有操作返回报错
        if (!req.UpdateContextHandlerReq) {
            return InvalidParamError
        }
        let param = req.UpdateContextHandlerReq!

       
        return {
            UpdateContextHandlerResp: {
                result: 0,
                msg: "success",
            }
        }
    }
}
