import { BaseAction, ActionAbstract ,Action} from "../../action";
import { ErrorCode, Logger,sleep } from '../../../base';
import * as cyfs from "../../../cyfs";
import { StackManager, CyfsDriverType ,PeerInfo} from "../../../cyfs-driver-client"
import { PublishFileAction } from "./publish_file"
import { PutContextAction } from "./put_context"
import  {LinkObjectAction} from "../root_state";
import {PrepareTransFileRequest} from "../handler"
import {PrepareTransFileHandlerResp} from "../../../common_base"
/**
 * 输入数据
 */
type TestInput = {
    req_path?: string, // req_path 权限控制路径
    group? : string, // 文件传输任务分组
    context_path?: string, // 文件传输任务下载源
    auto_start:boolean, // 任务是否自动开始
    action?:cyfs.TransTaskControlAction, //设置传输任务的初始状态
    action_wait?:number, // action 操作的间隔时间
    deviceid_list?:Array<cyfs.ObjectId>, // 设置context 的deviceid_list
    not_set_context?: boolean,
    chunk_codec_desc? : {
        unknown?: boolean,
        stream?:[number|undefined, number|undefined, number|undefined],
        raptor?:[number|undefined, number|undefined, number|undefined]
    },
}
/**
 * 输出结果
 */
type TestOutput = PrepareTransFileHandlerResp 

export class PrepareFileTask extends BaseAction implements ActionAbstract {

    static create_by_parent(action:Action,logger:Logger): {err:number,action?:PrepareFileTask}{
        let run =  new PrepareFileTask({
            local :  action.local,
            remote : action.remote!,
            input : action.input,
            parent_action : action.action_id!,
            expect : {err:0},

        },logger)
        return {err:ErrorCode.succ,action:run}
    }

    async start(req:TestInput): Promise<{ err: number; log: string, resp?: PrepareTransFileHandlerResp,file_info?:{file_name:string,file_id:string} }> {
        this.action.type = "PrepareFileTask"
        this.action.action_id = `PrepareFileTask-${Date.now()}`
        return await super.start(req);
    }
    async run(req: TestInput): Promise<{ err: ErrorCode, log: string,resp?: PrepareTransFileHandlerResp,file_info?:{file_name:string,file_id:string}  }> {
        let local = this.local!;
        // 获取连 接池中的cyfs stack ,用来上传文件的设备file_source_device
        let stack_manager = StackManager.createInstance();

        // 获取测试驱动中的工具类
        let file_source_tool = stack_manager.driver!.get_client(this.action.local.peer_name).client!.get_util_tool();
        this.logger.info(`publish file device : ${this.local!.local_device_id().object_id.to_base_58()}`);
        // 创建测试文件
        let local_file = await file_source_tool.create_file(this.action.input.file_size!);
        this.logger.info(`local_file : ${JSON.stringify(local_file)}`);
        // 发布文件子任务
        let publish_begin =  Date.now();
        let info1 = await PublishFileAction.create_by_parent(this.action, this.logger).action!.start({
            local_path: local_file.file_path!,
            chunk_size: this.action.input.chunk_size!,
            req_path: req.req_path!,
            level: this.action.input.ndn_level!,
            flags: 1,
        });
        this.action.output!.publish_time =Date.now() - publish_begin;
        if (info1.err) {
            return {err:info1.err,log:info1.log};
        }          
        let file_id: cyfs.ObjectId = info1.resp!.file_id;       
        // 将文件对象挂载在root_state
        let link_file = await LinkObjectAction.create_by_parent(this.action,this.logger).action!.start({
            object_id : file_id,
            req_path : req.req_path! , // + `/${RandomGenerator.string(10)}`
            access : cyfs.AccessString.full()
        })
        if (link_file.err) {
            return {err:link_file.err,log:link_file.log};
        }   
        // Post object 通知remote 下载文件
        if(!req.deviceid_list){
            req.deviceid_list = [local.local_device_id().object_id]
        }
        if(!req.chunk_codec_desc){
            req.chunk_codec_desc  = {stream:[0,0,0]}
        }
        let result  = await PrepareTransFileRequest.create_by_parent(this.action,this.logger).action!.start({
            req_path: req.req_path!,
            target : local.local_device_id().to_base_58(),
            context_path : req.context_path!, 
            group: req.group!,
            file_id : file_id.to_base_58(),
            file_name : local_file.file_name!,
            auto_start : req.auto_start,
            not_set_context : req.not_set_context,
            action :req.action,
            action_wait : req.action_wait,
            chunk_codec_desc : req.chunk_codec_desc,
            deviceid_list : req.deviceid_list,
        })
                
        return {
            err : result.err,
            log : result.log,
            resp : result.resp,
            file_info : {
                file_id : file_id.to_base_58(),
                file_name : local_file.file_name!,
            }
        };
    }
}
