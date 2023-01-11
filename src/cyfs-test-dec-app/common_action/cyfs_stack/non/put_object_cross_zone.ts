import {BaseAction,ActionAbstract,Action} from "../../action";
import { ErrorCode, Logger} from '../../../base';
import * as cyfs from "../../../cyfs";
import {StackManager,CyfsDriverType} from "../../../cyfs-driver-client"
import {LocalObjectLinkReqPathAction} from "../root_state"

/**
 * 输入数据
 */
 type TestInput = {
    object_id : cyfs.ObjectId,
    level: cyfs.NONAPILevel,
    req_path?: string,
}

/**
 * 跨zone 传输对象，通过get object 实现
 * 
 */
export class PubObjectCrossZone extends BaseAction implements ActionAbstract {
    static create_by_parent(action:Action,logger:Logger): {err:number,action?:PubObjectCrossZone}{
        let run =  new PubObjectCrossZone({
            local : action.local,
            remote : action.remote,
            input : action.input,
            parent_action : action.action_id!,
            expect : {err:0},

        },logger)
        return {err:ErrorCode.succ,action:run}
    }
    async start(req:TestInput): Promise<{ err: number; log: string; resp?: any; }> {
        this.action.type = "PubObjectCrossZone";
        this.action.action_id = `PubObjectCrossZone-${Date.now()}`
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
        //从本地noc 获取完整对象
        let info_non_get = await local.non_service().get_object({
            common:{
                // api级别
                level: cyfs.NONAPILevel.NOC,
                flags: 1,
            },
            object_id: req.object_id,
            
        })
        this.logger.info(`info_non_get : ${ JSON.stringify(info_non_get.unwrap())}`);
        //修改文件对象挂载root_state,并且赋予权限
        let root_state_action  = await LocalObjectLinkReqPathAction.create_by_parent(this.action,this.logger).action!.start({
            req_path :  req.req_path!,
            object_id : req.object_id!,
            access : cyfs.AccessString.full()
        });
        this.logger.info(`root_state_action = ${JSON.stringify(root_state_action)}`);
        if(root_state_action.err){
            return root_state_action
        }
        // 将对象发送到目标设备
        this.logger.info(`will put object  ${req.level} ${req.object_id} `);

        let info_non_get_info = await remote.non_service().get_object({
            common: {
                req_path : req.req_path,

                // 来源DEC
                dec_id : remote.dec_id,
            
                // api级别
                level: cyfs.NONAPILevel.Router,
            
                // 用以处理默认行为
                target : local.local_device_id().object_id,
            
                flags: 1,
            },

            object_id: req.object_id,
        })

        this.logger.info(`get object : ${JSON.stringify(info_non_get_info)}`);
        
        this.action.output! = {
            total_time : Date.now() - begin_time,
        }
        if(info_non_get_info.err){
            return { err: info_non_get_info.val.code, log: info_non_get_info.val.msg}
        }
        return { err: ErrorCode.succ, log: "success"}
       
    }
}
