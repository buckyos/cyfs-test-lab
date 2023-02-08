import { BaseAction, ActionAbstract } from "../../action";
import { ErrorCode, Logger,sleep } from '../../../base';
import * as cyfs from "../../../cyfs";
import { StackManager, CyfsDriverType ,PeerInfo} from "../../../cyfs-driver-client"
import { PublishFileAction } from "./publish_file"
import { PutContextAction } from "./put_context"
import { PrepareFileTask } from "./prepare_file_task"
import  {LinkObjectAction} from "../root_state/link_object";
import { RegisterCommonHandler } from "../handler"
import {TransFileHandlerResp} from "../../../common_base"
import * as path from "path";
/**
 * 输入数据
 */
type TestInput = {
    root_req_path : string,
    task_list : Array<{
        req_path: string,
        group : string,
        context_path: string,
        auto_start?:boolean,
        action_wait?:number,
        action?: cyfs.TransTaskControlAction
    }>
}

type TestOutput = {
    task_list : Array<{
        err : number,
        log : string,
        task_id? : string,
        req_path: string,
        group : string,
        context_path: string,
        
    }>
}
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

export class BuildTransGroupTree extends BaseAction implements ActionAbstract {
    async start(req:TestInput): Promise<{ err: number; log: string, resp?: TestOutput}> {
        this.action.type = "BuildTransGroupTree"
        this.action.action_id = `BuildTransGroupTree-${Date.now()}`
        return await super.start(req);
    }
    async run(req: TestInput): Promise<{ err: ErrorCode, log: string,resp?: TestOutput }> {
        let local = this.local!;

        let action_handler = await RegisterCommonHandler.create_by_parent(this.action,this.logger!).action!.start({
            req_path: req.root_req_path,
        });
        this.logger.info(`add handler : ${action_handler}`);
        let task_result_list = []
        let task_running_list = []
        for(let task of req.task_list){
            if(task.auto_start == undefined){
                task.auto_start = true;
            }
            task_running_list.push(PrepareFileTask.create_by_parent(this.action,this.logger!).action!.start({
                req_path: task.req_path,
                context_path: task.context_path,
                group: task.group,
                auto_start:  task.auto_start!,
                action_wait : task.action_wait,
                action : task.action,
            }));
            
           
        }
        for(let index in task_running_list){
            let  task_action = await task_running_list[index];
            task_result_list.push({
                err : task_action.err,
                log : task_action.log,
                task_id : task_action.resp?.task_id,
                req_path: req.task_list[index].req_path,
                group : req.task_list[index].group,
                context_path: req.task_list[index].context_path,
            })
        }
        return {err:0,log:"success",resp:{task_list:task_result_list} };
    }
}
