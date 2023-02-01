import { BaseAction, ActionAbstract } from "../../action";
import { ErrorCode, Logger,sleep } from '../../../base';
import * as cyfs from "../../../cyfs";
import { StackManager, CyfsDriverType ,PeerInfo} from "../../../cyfs-driver-client"
import { PublishFileAction } from "../trans/publish_file"
import { PutContextAction } from "../trans/put_context"
import { PubObjectCrossZone } from "./put_object_cross_zone"
import * as path from "path";
/**
 * 输入数据
 */
type TestInput = {
    req_path?: string,
    file_source_device? : PeerInfo,
    group? : string,
    context_path?: string,
}
/**
 * 输出结果
 */
type TestOutput = {
    file_id?:cyfs.ObjectId,
    task_id?:string,
}
/**
 * 操作描述：
 * 
 * 设备 ：file_source_device 发布文件的设备，默认是local
 * 设备 ：local  协议栈中保存文件的设备
 * 设备 ：remote 协议栈中文件下载端 
 * 
 * 流程
 * （1) 文件上传流程： file_source_device -》 local ： PublishFileAction 上传文件
 * （2) 文件访问权限的修改 ： local修改指定req_path的权限为full
 * （3）将文件对象挂载root_state 路径req_path上
 * （4）文件下载源Context管理流程： local 创建 context，设置下载的源列表,将Context对象挂载root_state 路径req_path上
 * （5）下载端创建handler：remote 监听文件传输行为（ 参数group 设置传输组,get_object 获取file 对象，post_object 获取context对象，trans 创建传输任务，完成下载流程） 
 * （6）下载端创建handler：remote 监听context更新行为 
 * （7）上传端维护context 下载源列表 ： local 更新本地context 对象，并且post_object 推送context 到 remote
 */

export class TransFileAction extends BaseAction implements ActionAbstract {
    async start(req:TestInput): Promise<{ err: number; log: string, resp?: TestOutput}> {
        this.action.type = "TransFileAction"
        this.action.action_id = `TransFileAction-${Date.now()}`
        return await super.start(req);
    }
    async run(req: TestInput): Promise<{ err: ErrorCode, log: string,resp?: TestOutput }> {
        let local = this.local!;
        let remote = this.remote!;
        // 获取连 接池中的cyfs stack ,用来上传文件的设备file_source_device
        // file_source_device 默认为 local
        let stack_manager = StackManager.createInstance();
        if(!req.file_source_device){
            req.file_source_device = this.action.local
        }
        let file_source_device = stack_manager.get_cyfs_satck(req.file_source_device);
        if (file_source_device.err) {
            this.logger.info(`StackManager not found cyfs satck`);
            return {err:ErrorCode.notFound,log:`协议栈未初始化`}
        }
        let file_source = file_source_device.stack!;
        // 获取测试驱动中的工具类
        let local_tool = stack_manager.driver!.get_client(this.action.local.peer_name).client!.get_util_tool();
        let remote_tool = stack_manager.driver!.get_client(this.action.remote!.peer_name).client!.get_util_tool();
        let file_source_tool = stack_manager.driver!.get_client(req.file_source_device!.peer_name).client!.get_util_tool();
        this.logger.info(`publish file device : ${file_source.local_device_id().object_id.to_base_58()}`);
        // 创建测试文件
        let local_file = await file_source_tool.create_file(this.action.input.file_size!);
        this.logger.info(`local_file : ${JSON.stringify(local_file)}`);
        // 发布文件子任务
        let publish_begin =  Date.now();
        let info1 = await PublishFileAction.create_by_parent(req.file_source_device,this.action, this.logger).action!.start({
            local_path: local_file.file_path!,
            chunk_size: this.action.input.chunk_size!,
            req_path: req.req_path!,
            level: this.action.input.ndn_level!,
            flags: 1,
        });
        this.action.output!.publish_time =Date.now() - publish_begin;
        if (info1.err) {
            return info1;
        }       
        // 推送obejct   
        let file_id: cyfs.ObjectId = info1.resp!.file_id!;
        // 发送文件对象
        let send_file_object_info = await PubObjectCrossZone.create_by_parent(this.action, this.logger).action!.start({
            object_id: file_id,
            level: this.action.input.non_level!,
            req_path : req.req_path!
        });
        stack_manager.logger!.info(JSON.stringify(send_file_object_info));
        // 下载端创建 TransContext  
        this.logger.info(`info_non_put : ${JSON.stringify(send_file_object_info)}`);
        let create_context_info = await PutContextAction.create_by_parent(this.action, this.logger).action!.start({
            context_path : req.context_path!,
            chunk_codec_desc : cyfs.ChunkCodecDesc.Stream(),
            deviceid_list : [local.local_device_id(),remote.local_device_id()]
        });
        stack_manager.logger!.info(JSON.stringify(create_context_info));
        // 开始传输文件
        let info2 = await remote.trans().create_task({
            common: {
                req_path : req.req_path,
                level: this.action.input.ndn_level!,
                flags: 1,
            },
            object_id: file_id,
            // 保存到的本地目录or文件
            local_path: path.join((await remote_tool.get_cache_path()).cache_path!.file_download, local_file.file_name!),
            // 源设备(hub)列表
            device_list: [local.local_device_id()],
            group: req!.group,
            context: req!.context_path,
            auto_start: true
        })
        this.logger.info(`create_task : ${JSON.stringify(info2)}`);
        while (true) {
            let info_check = await remote.trans().get_task_state({
                common: {
                    // api级别
                    level: cyfs.NDNAPILevel.NDN,
                    flags: 1,
                },
                task_id: info2.unwrap().task_id,
            });
            this.logger.info(`get_task_state : ${JSON.stringify(info_check)}`);
            if (info_check.unwrap().state.state == cyfs.TransTaskState.Pending  || info_check.unwrap().state.state == cyfs.TransTaskState.Downloading) {
                await sleep(1000); 
            }else{
                break;
            }
            
        };
        // 对下载端的文件hash进行校验
        let remote_hash = await remote_tool.md5_file(path.join((await remote_tool.get_cache_path()).cache_path!.file_download, local_file.file_name!))
        if(remote_hash.md5 != local_file.md5){
            return { err: ErrorCode.invalidState, log: `cehck hash failed local = ${local_file.md5} remote= ${remote_hash.md5}` }
        }
        return { err: ErrorCode.succ, log: "run success" ,resp:{file_id,task_id:info2.unwrap().task_id}}
    }
}