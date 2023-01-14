import { ErrorCode, Logger, sleep } from '../../base';
import * as cyfs from "../../cyfs";
import * as path from "path";

import { BaseHandler } from "./base_handler"
import { HandlerRequestObject, HandlerRequestObjectDecoder, HandlerApi, NotFoundError, InvalidParamError } from "../../common_base"
import { StackManager, CyfsDriverType, PeerInfo } from "../../cyfs-driver-client"
/**
 * 操作描述：
 * handler：remote 监听文件传输行为（ 参数group 设置传输组,get_object 获取file 对象，post_object 获取context对象，trans 创建传输任务，完成下载流程） 
 */

export class UpdateContextHandler extends BaseHandler {
    async start(req: HandlerRequestObject): Promise<HandlerRequestObject> {
        // 封装一些操作
        this.handler_info.type = "UpdateContextHandler"
        return await super.start(req);
    }
    async run(req: HandlerApi): Promise<HandlerApi> {
        // 默认没有操作返回报错
        if (!req.TransFileHandlerReq) {
            return InvalidParamError
        }
        let param = req.TransFileHandlerReq!
        // 获取文件对象
        let file_id = cyfs.ObjectId.from_base_58(param.file_id).unwrap();
       
        return {
            TransFileHandlerResp: {
                result: 0,
                msg: "success",
            }
        }
    }
}
