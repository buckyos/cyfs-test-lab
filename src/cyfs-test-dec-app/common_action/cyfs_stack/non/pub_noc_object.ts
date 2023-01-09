import {BaseAction,ActionAbstract,Action} from "../../action";
import { ErrorCode, Logger} from '../../../base';
import * as cyfs from "../../../cyfs";
import {StackManager,CyfsDriverType} from "../../../cyfs-driver-client"


/**
 * 输入数据
 */
 type TestInput = {
    object_id : cyfs.ObjectId,
    level: cyfs.NONAPILevel,
}

export class PutNocObjectAction extends BaseAction implements ActionAbstract {
    static create_by_parent(action:Action,logger:Logger): {err:number,action?:PutNocObjectAction}{
        let run =  new PutNocObjectAction({
            local : action.local,
            remote : action.remote,
            input : {
                timeout : action.input.timeout,
            },
            parent_action : action.action_id!,
            expect : {err:0},

        },logger)
        return {err:ErrorCode.succ,action:run}
    }
    async start(req:TestInput): Promise<{ err: number; log: string; resp?: any; }> {
        this.action.type = "PutNocObjectAction";
        this.action.action_id = `PutNocObjectAction-${Date.now()}`
        return await super.start(req)
    }
    async run(req:TestInput): Promise<{ err: number, log: string, resp?:{file_id?:cyfs.ObjectId} }> {
        // 获取连接池中的cyfs stack
        let stack_manager = StackManager.createInstance();
        let local_get = stack_manager.get_cyfs_satck(this.action.local!);
        let remote_get = stack_manager.get_cyfs_satck(this.action.remote!);
        if (local_get.err) {
            this.logger.info(`StackManager not found cyfs satck`);
            return {err:ErrorCode.notFound,log:`协议栈未初始化`}
        }
        if (remote_get.err) {
            this.logger.info(`StackManager not found cyfs satck`);
            return {err:ErrorCode.notFound,log:`协议栈未初始化`}
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
