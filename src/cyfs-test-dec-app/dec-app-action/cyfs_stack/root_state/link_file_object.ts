import {BaseAction,ActionAbstract,Action} from "../../action";
import { ErrorCode, Logger} from '../../../common';
import * as cyfs from "../../../cyfs";

/**
 * 输入数据
 */
 type TestInput = {
    object_id : cyfs.ObjectId,
    req_path : string,
    access : cyfs.AccessString
}

export class LinkFileObjectAction extends BaseAction implements ActionAbstract {
    /**
     * 父任务只支持本地修改本地
     */
    static create_by_parent(action:Action,logger:Logger): {err:number,action?:LinkFileObjectAction}{
        let run =  new LinkFileObjectAction({
            local : action.local,
            remote : action.local,
            input : action.input,
            parent_action : action.action_id!,
            expect : {err:0},

        },logger)
        return {err:ErrorCode.succ,action:run}
    }
    async start(req:TestInput): Promise<{ err: number; log: string; resp?: any; }> {
        this.action.type = "LinkFileObjectAction";
        this.action.action_id = `LinkFileObjectAction-${Date.now()}`
        return await super.start(req)
    }
    async run(req:TestInput): Promise<{ err: number, log: string, resp?:{file_id?:cyfs.ObjectId} }> {
        // 获取连接池中的cyfs stack
        let local = this.local!;
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
