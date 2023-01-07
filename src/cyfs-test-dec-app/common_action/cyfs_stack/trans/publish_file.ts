import {BaseAction,ActionAbstract} from "../../action";
import { ErrorCode, Logger} from '../../../base';
import * as cyfs from "../../../cyfs";
import {StackManager,CyfsDriverType} from "../../../cyfs-driver-client"

export class PublishFileAction extends BaseAction implements ActionAbstract {
    async run(req:{
        local_path : string,
        chunk_size : number,
        req_path?: string,
        level: cyfs.NDNAPILevel,
        referer_object?: cyfs.NDNDataRefererObject[],
        flags: number,
    }): Promise<{ err: number, log: string, resp?:{file_id?:cyfs.ObjectId} }> {
        // 获取连接池中的cyfs stack
        this.action.type = "publish_file";
        let stack_manager = StackManager.createInstance();
        let local_get = stack_manager.get_cyfs_satck(this.action.local.peer_name,this.action.local.dec_id,this.action.local.type);
        let remote_get = stack_manager.get_cyfs_satck(this.action.remote!.peer_name,this.action.remote!.dec_id,this.action.remote!.type);
        if(local_get.err || remote_get.err){
            this.logger.info(`StackManager not found cyfs satck`);
        }
        let local = local_get.stack!;
        let remote = remote_get.stack!;
        // 获取测试驱动中的工具类
        this.logger.info(`local : ${local.local_device_id().object_id.to_base_58()}`)
        this.logger.info(`remote : ${remote.local_device_id().object_id.to_base_58()}`)
        // 发布文件
        let begin_time = Date.now();
        let info1 = await remote.trans().publish_file({
            common: {
                // api级别
                dec_id : local.dec_id,
                req_path : req.req_path,
                level: req.level,
                referer_object : req.referer_object,
                target : remote.local_device_id().object_id,             
                flags: req.flags,
            },
            // 文件所属者
            owner: remote.local_device_id().object_id,
            // 文件的本地路径
            local_path: req.local_path,
            // chunk大小
            chunk_size: 4*1024*1024,
        });
        this.action.output! = {
            total_time : Date.now() - begin_time
        };
        this.logger.info(`publish_file : ${JSON.stringify(info1)}`);
        if(info1.err){
            return { err: info1.val.code, log: info1.val.msg}
        }
        return { err: ErrorCode.succ, log: "success",resp:{file_id:info1.unwrap().file_id}}
       
    }
}
