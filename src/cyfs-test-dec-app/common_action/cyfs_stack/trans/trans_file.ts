import { BaseAction, ActionAbstract,Action} from "../../action";
import { ErrorCode, Logger,RandomGenerator,sleep } from '../../../base';
import * as cyfs from "../../../cyfs";
import { StackManager, CyfsDriverType ,PeerInfo} from "../../../cyfs-driver-client"
import { PublishFileAction } from "./publish_file"
import { PutContextAction } from "./put_context"

import  {LinkObjectAction} from "../root_state/link_object";
import { TransFileRequest } from "../handler"
import {TransFileHandlerResp} from "../../../common_base"
import * as path from "path";
/**
 * 输入数据
 */
type TestInput = {
    req_path?: string,
    group? : string,
    context_path?: string,
}

type TestOutput = TransFileHandlerResp
/**
 * 操作描述：
 * 
 * 设备 ：file_source_device 发布文件的设备，默认是local
 * 设备 ：local  协议栈中保存文件的设备
 * 设备 ：remote 协议栈中文件下载端 
 * 
 * 流程
 * （1）remote： 创建 handler 监听器,监听其他设备的post object 请求
 * （2)local： local ： PublishFileAction 上传文件
 * （3) local: 文件访问权限的修改 ： local修改指定req_path的权限为full
 * （4）local: 将文件对象挂载root_state 路径req_path上
 *  (5) loacl: 发送post_object HandlerRequest TransFileRequest 到remote设备
    * （6）remote: remote 触发handler 执行下载文件流程
    * （7）remote: 从local 设备获取file 对象信息 
    * （8）remote: 根据local 提供的device_list构造context
    * （9）remote: create_task 开始传输文件，检查传输任务直到完成
    *  (10) remote: remote 返回 handler执行结果
*  (11) loacl: loacl收到post_object返回结果 
 */

export class TransFileAction extends BaseAction implements ActionAbstract {
    static create_by_parent(action:Action,logger:Logger): {err:number,action?:TransFileAction}{
        let run =  new TransFileAction({
            local :  action.local,
            remote : action.remote!,
            input : action.input,
            parent_action : action.action_id!,
            expect : {err:0},

        },logger)
        return {err:ErrorCode.succ,action:run}
    }
    async start(req:TestInput): Promise<{ err: number; log: string, resp?: TestOutput}> {
        this.action.type = "TransFileAction"
        this.action.action_id = `TransFileAction-${Date.now()}`
        return await super.start(req);
    }
    async run(req: TestInput): Promise<{ err: ErrorCode, log: string,resp?: TestOutput }> {
        let local = this.local!;
        // 获取连 接池中的cyfs stack ,用来上传文件的设备file_source_device
        // file_source_device 默认为 local
        let stack_manager = StackManager.createInstance();
        let file_source = this.local!;
        // 获取测试驱动中的工具类
        let file_source_tool = stack_manager.driver!.get_client(this.action.local.peer_name).client!.get_util_tool();
        this.logger.info(`publish file device : ${file_source.local_device_id().object_id.to_base_58()}`);
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
        let result  = await TransFileRequest.create_by_parent(this.action,this.logger).action!.start({
            req_path: req.req_path!,
            target : local.local_device_id().to_base_58(),
            context_path : req.context_path, 
            group: req.group!,
            file_id : file_id.to_base_58(),
            file_name : local_file.file_name!,
            chunk_codec_desc : {stream:[0,0,0]},
            deviceid_list : [local.local_device_id().object_id],
        })     
        return result;
    }
}
