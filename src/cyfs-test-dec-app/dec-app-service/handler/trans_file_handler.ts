import { ErrorCode, Logger, sleep } from '../../common';
import * as cyfs from "../../cyfs";
import * as path from "path";
import { BaseHandler } from "./base_handler"
import { HandlerRequestObject, HandlerRequestObjectDecoder, HandlerApi, NotFoundError, InvalidParamError } from "../../dec-app-base"
import { StackManager} from "../../cyfs-test-util"
/**
 * 操作描述：
 * handler：remote 监听文件传输行为（ 参数group 设置传输组,get_object 获取file 对象，post_object 获取context对象，trans 创建传输任务，完成下载流程） 
 */

export class TransFileHandler extends BaseHandler {
    async start(req: HandlerRequestObject): Promise<HandlerRequestObject> {
        // 封装一些操作
        this.handler_info.type = "TransFileHandler"
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
        let target = cyfs.ObjectId.from_base_58(param.target).unwrap();
        let target_device_id = cyfs.DeviceId.try_from_object_id(target).unwrap();
        let get_file_object_begin = Date.now();
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
        let get_file_object_time = Date.now() - get_file_object_begin;
        if(get_file.err){
            return {
                TransFileHandlerResp: {
                    result: get_file.val.code,
                    msg: get_file.val.msg,
                }
            }
        }
        console.info(`get file object resp : ${get_file.unwrap().object.object_id}`)
        
        // 构建下载context
        let context = cyfs.TransContext.new(this.stack.dec_id, param!.context_path!)
        console.info(`create context ${context.desc().calculate_id().to_base_58()}`)
        // 设置context 的源列表,具体编码方式 TO DO
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
            console.info(`${context.desc().calculate_id().to_base_58()} context add device source ${device_id} ${JSON.stringify(chunk_codec_desc)}`)
            context.body_expect().content().device_list.push(new cyfs.TransContextDevice(device_id,chunk_codec_desc!));
        }
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
            context: context,
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
        console.info(`put_context object resp : ${JSON.stringify(put_context.unwrap())}`)
        // 创建文件传输任务
        let stack_manager = StackManager.createInstance();
        let local_tool = stack_manager.driver!.get_client(this.handler_info.local.peer_name).client!.get_util_tool();
        let download_begin = Date.now();
        let local_path_info = await local_tool.get_cache_path();
        let save_path = local_path_info.cache_path!.file_download;
        if(local_path_info.platform== "linux"){
            save_path = save_path + "/" + param.file_name
        }else{
            save_path = path.join(save_path, param.file_name!)
        }
        let create_task = await this.stack.trans().create_task({
            common: {
                req_path: param.req_path,
                level: cyfs.NDNAPILevel.Router,
                flags: 1,
            },
            object_id: file_id,
            // 保存到的本地目录or文件
            local_path: save_path,
            // 源设备(hub)列表
            device_list: [target_device_id],
            group: param!.group,
            context: param!.context_path,
            auto_start: true
        })
        if(create_task.err){
            return {
                TransFileHandlerResp: {
                    result: create_task.val.code,
                    msg: create_task.val.msg,
                }
            }
        }
        console.info(`create_task : ${JSON.stringify(create_task)}`);
        let task_id  = create_task.unwrap().task_id
        while (true) {
            let info_check = await this.stack.trans().get_task_state({
                common: {
                    // api级别
                    level: cyfs.NDNAPILevel.NDN,
                    flags: 1,
                },
                task_id: task_id,
            });
            console.info(`get_task_state : ${JSON.stringify(info_check)}`);
            if (info_check.unwrap().state.state == cyfs.TransTaskState.Pending || info_check.unwrap().state.state == cyfs.TransTaskState.Downloading) {
                await sleep(1000);
            } else {
                break;
            }

        };
        let download_time = Date.now() - download_begin;
        let md5 = await (await local_tool.md5_file(save_path)).md5
        return {
            TransFileHandlerResp: {
                result: 0,
                task_id : task_id,
                msg: "success",
                download_time,
                md5,
                get_file_object_time
            }
        }
    }
}
