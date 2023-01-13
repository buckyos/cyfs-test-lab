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
        let context_id = cyfs.ObjectId.from_base_58(param.context_id).unwrap();
        let target = cyfs.ObjectId.from_base_58(param.target).unwrap();
        let target_device_id = cyfs.DeviceId.try_from_object_id(target).unwrap();
        let get_file = await this.stack.non_service().get_object({
            common: {
                req_path: param.req_path,
                // 来源DEC
                dec_id: this.stack.dec_id,
                // api级别
                level: cyfs.NONAPILevel.Router,

                // 用以处理默认行为
                target: target,

                flags: 1,
            },

            object_id: file_id,
        })
        if(get_file.err){
            return {
                TransFileHandlerResp: {
                    result: get_file.val.code,
                    msg: get_file.val.msg,
                }
            }
        }
        this.logger.info(`get file object resp : ${get_file.unwrap().object.object_id}`)
        
        // 获取context
        let get_context = await this.stack.trans().get_context({
            common: {
                req_path: param.req_path,
                // 来源DEC
                dec_id: this.stack.dec_id,
                // api级别
                level: cyfs.NDNAPILevel.Router,
                // 用以处理默认行为
                target: target,
                // 需要处理数据的关联对象，主要用以chunk/file等
                flags: 1,
            },
            context_id: context_id,
            context_path: param.context_path
        });
        if(get_context.err){
            return {
                TransFileHandlerResp: {
                    result: get_context.val.code,
                    msg: get_context.val.msg,
                }
            }
        }
        this.logger.info(`get context object resp : ${get_context.unwrap().context.calculate_id()}`)
        
        let put_context = await this.stack.trans().put_context({
            common: {
                req_path: param.req_path,
                // 来源DEC
                dec_id: this.stack.dec_id,
                // api级别
                level: cyfs.NDNAPILevel.NDC,
                // 需要处理数据的关联对象，主要用以chunk/file等
                flags: 1,
            },
            context: get_context.unwrap().context,
            access: cyfs.AccessString.full(),
        });
        if(put_context.err){
            return {
                TransFileHandlerResp: {
                    result: put_context.val.code,
                    msg: put_context.val.msg,
                }
            }
        }
        this.logger.info(`get context object resp : ${get_context.unwrap().context.calculate_id()}`)
        
        return {
            TransFileHandlerResp: {
                result: 0,
                msg: "success",
            }
        }
    }
}
