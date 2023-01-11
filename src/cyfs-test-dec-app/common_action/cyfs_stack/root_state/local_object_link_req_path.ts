import {BaseAction,ActionAbstract,Action} from "../../action";
import { ErrorCode, Logger} from '../../../base';
import * as cyfs from "../../../cyfs";
import {StackManager,CyfsDriverType} from "../../../cyfs-driver-client"


/**
 * 输入数据
 */
 type TestInput = {
    object_id : cyfs.ObjectId,
    req_path : string,
    access : cyfs.AccessString
}

export class LocalObjectLinkReqPathAction extends BaseAction implements ActionAbstract {
    static create_by_parent(action:Action,logger:Logger): {err:number,action?:LocalObjectLinkReqPathAction}{
        let run =  new LocalObjectLinkReqPathAction({
            local : action.local,
            remote : action.remote,
            input : action.input,
            parent_action : action.action_id!,
            expect : {err:0},

        },logger)
        return {err:ErrorCode.succ,action:run}
    }
    async start(req:TestInput): Promise<{ err: number; log: string; resp?: any; }> {
        this.action.type = "ObjectLinkReqPathAction";
        this.action.action_id = `ObjectLinkReqPathAction-${Date.now()}`
        return await super.start(req)
    }
    async run(req:TestInput): Promise<{ err: number, log: string, resp?:{file_id?:cyfs.ObjectId} }> {
        // 获取连接池中的cyfs stack
        let stack_manager = StackManager.createInstance();
        let local_get = stack_manager.get_cyfs_satck(this.action.local!);
        if (local_get.err) {
            this.logger.info(`StackManager not found cyfs satck`);
            return {err:ErrorCode.notFound,log:`协议栈未初始化`}
        }
        let local = local_get.stack!;

        this.logger.info(`local : ${local.local_device_id().object_id.to_base_58()}`)
        // 将对象挂载
        let op_env = (await local.root_state_stub(local.local_device_id().object_id,local.dec_id).create_path_op_env()).unwrap();
        let modify_path = await op_env.insert_with_path(req.req_path!,req.object_id);
        this.logger.info(`${local.local_device_id().object_id.to_base_58()} op_env.insert_with_path ${JSON.stringify(req)},result = ${JSON.stringify(modify_path)} `);
        let commit_result = await op_env.commit();
        // 修改对象权限
        let test = await local.root_state_meta_stub(local.local_device_id().object_id,local.dec_id).add_access(cyfs.GlobalStatePathAccessItem.new(
            req.req_path!,
            req.access
        ));
        this.logger.info(`${req.req_path} root_state_meta_stub add_access result = ${test}`);
        let check_result = await local.root_state_accessor().get_object_by_path({
            common: {
                // 来源DEC
                dec_id: local.dec_id,
                // 目标设备
                target: local.local_device_id().object_id,
                flags: 1
            },
            inner_path: req.req_path!,
        }); 
        if(check_result.err){
            this.logger.error(`${local.local_device_id().object_id.to_base_58()} get req_path ${req.req_path!}  result =  ${JSON.stringify(check_result)}`)
            return { err: ErrorCode.fail, log: `${JSON.stringify(check_result)}`}
        }else{
            this.logger.info(`${local.local_device_id().object_id.to_base_58()} get req_path ${req.req_path!}  object =  ${check_result.unwrap().object.object.object_id.to_base_58()}`)
            return { err: ErrorCode.succ, log: "success"}
        }  
       
       
    }
}
