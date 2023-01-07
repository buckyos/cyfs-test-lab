import {BaseAction,ActionAbstract} from "../../action";
import { ErrorCode, Logger} from '../../../base';
import * as cyfs from "../../../cyfs";
import {StackManager,CyfsDriverType} from "../../../cyfs-driver-client"

export class PutNocObjectAction extends BaseAction implements ActionAbstract {
    async run(req:{
        object_id : cyfs.ObjectId,
        level: cyfs.NONAPILevel,
    }): Promise<{ err: number, log: string, resp?:{file_id?:cyfs.ObjectId} }> {
        // 获取连接池中的cyfs stack
        this.action.type = "PutNocObjectAction";
        let stack_manager = StackManager.createInstance();
        let local_get = stack_manager.get_cyfs_satck(this.action.local.peer_name,this.action.local.dec_id,this.action.local.type);
        let remote_get = stack_manager.get_cyfs_satck(this.action.remote!.peer_name,this.action.remote!.dec_id,this.action.remote!.type);
        if(local_get.err || remote_get.err){
            this.logger.info(`StackManager not found cyfs satck`);
        }
        let local = local_get.stack!;
        let remote = remote_get.stack!;
        this.logger.info(`local : ${local.local_device_id().object_id.to_base_58()}`)
        this.logger.info(`remote : ${remote.local_device_id().object_id.to_base_58()}`)
        let begin_time = Date.now();
        let info_non_get = await local.non_service().get_object({
            common:{
                // api级别
                level: cyfs.NONAPILevel.NOC,
                flags: 1,
            },
            object_id: req.object_id,
            
        })
        this.logger.info(`info_non_get : ${ JSON.stringify(info_non_get.unwrap())}`);
        let info_non_put =await local.non_service().put_object({
            common: {                    
                // api级别
                level: req.level,
                // 用以处理默认行为
                target: remote.local_device_id().object_id,
            
                flags: 1,
            },
            object: info_non_get.unwrap().object,
        
        })
        this.logger.info(`put object : ${JSON.stringify(info_non_put)}`);
        this.action.output! = {
            total_time : Date.now() - begin_time,
        }
        if(info_non_put.err){
            return { err: info_non_put.val.code, log: info_non_put.val.msg}
        }
        return { err: ErrorCode.succ, log: "success"}
       
    }
}
