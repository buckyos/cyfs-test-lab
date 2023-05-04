import * as cyfs from "../../cyfs";
import { BaseHandler } from "./base_handler"
import { HandlerRequestObject, HandlerRequestObjectDecoder, HandlerApi, NotFoundError, InvalidParamError } from "../../dec-app-base"

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
        if (!req.UpdateContextHandlerReq) {
            return InvalidParamError
        }
        let param = req.UpdateContextHandlerReq!
        let context_id = cyfs.ObjectId.from_base_58(param.context_id).unwrap();
        // 获取文件对象
        let get_context =  await this.stack.trans().get_context({
            common: {
                dec_id: this.stack.dec_id,
                // api级别
                level: cyfs.NDNAPILevel.NDC,
                // 需要处理数据的关联对象，主要用以chunk/file等
                flags: 1,
            },
            context_id,
        })
        if(get_context.err){
            return {
                UpdateContextHandlerResp: {
                    result: get_context.val.code,
                    msg: get_context.val.msg,
                }
            }
        }
        let context_cache  = get_context.unwrap().context;
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
                console.info(`${context_cache.desc().calculate_id().to_base_58()} context add device source ${device_id} ${JSON.stringify(chunk_codec_desc)}`)
                context_cache.body_expect().content().device_list.push(new cyfs.TransContextDevice(device_id,chunk_codec_desc!));
            }
        }
        context_cache.body_expect().increase_update_time(
            cyfs.bucky_time_now()
        );
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
                UpdateContextHandlerResp: {
                    result: put_context.val.code,
                    msg: put_context.val.msg,
                }
            }
        }
       
        return {
            UpdateContextHandlerResp: {
                result: 0,
                msg: "success",
            }
        }
    }
}
