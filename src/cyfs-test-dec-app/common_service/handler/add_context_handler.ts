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

export class AddContextHandler extends BaseHandler {
    async start(req: HandlerRequestObject): Promise<HandlerRequestObject> {
        // 封装一些操作
        this.handler_info.type = "AddContextHandler"
        return await super.start(req);
    }
    async run(req: HandlerApi): Promise<HandlerApi> {
        // 默认没有操作返回报错
        if (!req.AddContextHandlerReq) {
            return InvalidParamError
        }
        let param = req.AddContextHandlerReq!
        
        let context_cache  = cyfs.TransContext.new(this.stack.dec_id, param!.context_path!);
        let context_id = context_cache.desc().calculate_id().to_base_58();
        if(param.deviceid_list){
            context_cache.body_expect().content().device_list = [];
            for (let device of param.deviceid_list!) {
                let chunk_codec_desc : cyfs.ChunkCodecDesc = cyfs.ChunkCodecDesc.Stream();
                if(param.chunk_codec_desc?.stream){
                    //param.chunk_codec_desc.stream[0],param.chunk_codec_desc.stream[1],param.chunk_codec_desc.stream[2]
                    chunk_codec_desc = cyfs.ChunkCodecDesc.Stream();
                }else if(param.chunk_codec_desc?.raptor){
                    //param.chunk_codec_desc?.raptor[0],param.chunk_codec_desc?.raptor[1],param.chunk_codec_desc?.raptor[2]
                    chunk_codec_desc = cyfs.ChunkCodecDesc.Raptor();
                }
                else if(param.chunk_codec_desc?.unknown){
                    chunk_codec_desc = cyfs.ChunkCodecDesc.Unknown();
                }
                let  device_id = cyfs.DeviceId.from_base_58(device.toString()).unwrap();
                this.logger.info(`${context_cache.desc().calculate_id().to_base_58()} context add device source ${device_id} ${JSON.stringify(chunk_codec_desc)}`)
                context_cache.body_expect().content().device_list.push(new cyfs.TransContextDevice(device_id,chunk_codec_desc!));
            }
        }
        let put_context = await this.stack.trans().put_context({
            common: {
                dec_id: this.stack.dec_id,
                // api级别
                level: cyfs.NDNAPILevel.NDC,
                // 需要处理数据的关联对象，主要用以chunk/file等
                flags: 1,
            },
            context: context_cache,
            access: cyfs.AccessString.full(),
        });
        if(put_context.err){
            return {
                AddContextHandlerResp: {
                    result: put_context.val.code,
                    msg: put_context.val.msg,
                }
            }
        }
       
        return {
            AddContextHandlerResp: {
                result: 0,
                msg: "success",
                context_id,
            }
        }
    }
}
