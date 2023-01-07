import {BaseAction,ActionAbstract} from "../../action";
import { ErrorCode, Logger} from '../../../base';
import * as cyfs from "../../../cyfs";
import {StackManager,CyfsDriverType} from "../../../cyfs-driver-client"
import {PublishFileAction} from "./publish_file"
import {PutNocObjectAction} from "../non/pub_noc_object"
export class TransFileAction extends BaseAction implements ActionAbstract {
    async run(req?:{
        req_path : string,
    }): Promise<{ err: ErrorCode, log: string }> {
        // 获取连接池中的cyfs stack
        let stack_manager = StackManager.createInstance();
        let local_get = stack_manager.get_cyfs_satck(this.action.local.peer_name,this.action.local.dec_id,this.action.local.type);
        let remote_get = stack_manager.get_cyfs_satck(this.action.remote!.peer_name,this.action.remote!.dec_id,this.action.remote!.type);
        if(local_get.err || remote_get.err){
            this.logger.info(`StackManager not found cyfs satck`);
        }
        let local = local_get.stack!;
        let remote = remote_get.stack!;
        // 获取测试驱动中的工具类
        let local_tool = stack_manager.driver!.get_client(this.action.local.peer_name).client!.get_util_tool();
        let remote_tool = stack_manager.driver!.get_client(this.action.remote!.peer_name).client!.get_util_tool();
        this.logger.info(`local : ${local.local_device_id().object_id.to_base_58()}`)
        this.logger.info(`remote : ${remote.local_device_id().object_id.to_base_58()}`)
        // 创建测试文件
        let local_file = await remote_tool.create_file(this.action.input.file_size!);
        this.logger.info(`local_file : ${JSON.stringify(local_file)}`);
        // 发布文件
        let publish_action = new PublishFileAction({
            local : this.action.local,
            remote : this.action.local,
            input : {
                timeout : this.action.input.timeout,
            },
            parent_action : this.action.action_id!,
            expect : {err:0},

        },this.logger);
        let info1 =await publish_action.start({
            local_path : local_file.file_path,
            chunk_size : this.action.input.chunk_size,
            req_path : this.action.input.req_path!,
            level: this.action.input.ndn_level,
            flags: 1,
        });
        if(info1.err){
            return info1;
        }
        // 推送obejct   
        let file_id : cyfs.ObjectId  = info1.resp.file_id;
        // 发送文件对象
        let pub_object_action = new PutNocObjectAction({
                local : this.action.local,
                remote : this.action.local,
                input : {
                    timeout : this.action.input.timeout,
                },
                parent_action : this.action.action_id!,
                expect : {err:0},
            
        },this.logger);
        


        this.logger.info(`info_non_put : ${ JSON.stringify(info_non_put)}`);
        let context = cyfs.TransContext.new(dec_app_1,'/smoke_test')
        this.logger.info(`context ${context.desc().calculate_id().to_base_58()}`)
        context.body_expect().content().device_list.push( new cyfs.TransContextDevice(remote.local_device_id(),cyfs.ChunkCodecDesc.Stream()));
        this.logger.info(`${JSON.stringify(context.device_list())}`)
        let info_context = await local.trans().put_context({
            common: {
                // api级别
                level: cyfs.NDNAPILevel.NDN,             
                flags: 1,
            },
            context:context,
            access : cyfs.AccessString.full()

        });
        this.logger.info(`put_context err =  ${ JSON.stringify(info_context.err)}`);
        let info2 = await local.trans().create_task( {
            common: {
                // api级别
                level: cyfs.NDNAPILevel.NDN,             
                flags: 1,
            },
            object_id: info1.unwrap().file_id,
        
            // 保存到的本地目录or文件
            local_path: path.join((await local_tool.get_cache_path()).cache_path!.file_download,local_file.file_name!),
        
            // 源设备(hub)列表
            device_list: [remote.local_device_id()],
            group : `/smoke_test`,
            context : `/smoke_test`,
            auto_start: true
        })
        this.logger.info(`create_task : ${JSON.stringify(info2)}`);
        while (true){
            let info_check = await local.trans().get_task_state({
                common:  {
                    // api级别
                    level: cyfs.NDNAPILevel.NDN,             
                    flags: 1,
                },
            
                task_id: info2.unwrap().task_id,
            });
            this.logger.info(`get_task_state : ${JSON.stringify(info_check)}`);
            if(info_check.unwrap().state == cyfs.TransTaskState.Finished || info_check.unwrap().state == cyfs.TransTaskState.Err){
                break;
            }
            await sleep(1000); 
        };
        return { err: ErrorCode.succ, log: "run success" }
    }
}
