import {BaseAction,ActionAbstract,Action} from "../../action";
import { ErrorCode, Logger} from '../../../base';
import * as cyfs from "../../../cyfs";


/**
 * 输入数据
 */
 type TestInput = {
    object_id : cyfs.ObjectId,
    req_path : string,
    access : cyfs.AccessString
}

export class LinkObjectAction extends BaseAction implements ActionAbstract {
    static create_by_parent(action:Action,logger:Logger): {err:number,action?:LinkObjectAction}{
        let run =  new LinkObjectAction({
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
        let local = this.local!;
        this.logger.info(`local : ${local.local_device_id().object_id.to_base_58()}`)
        // 将对象挂载
        let op_env = (await local.root_state_stub(local.local_device_id().object_id,local.dec_id).create_path_op_env()).unwrap();
        let running  = await op_env.lock([req.req_path],cyfs.JSBI.BigInt(1000));
        let modify_path = await op_env.insert_with_path(req.req_path!,req.object_id);
        
        this.logger.info(`${local.local_device_id().object_id.to_base_58()} op_env.insert_with_path ${JSON.stringify(req)},result = ${JSON.stringify(modify_path)} `);
        let commit_result = await op_env.commit();
        this.logger.info(`root state link path ,root_path =${req.req_path} ,object = ${req.object_id} result= ${JSON.stringify(commit_result)}`);
        // 修改对象权限
        let modify_access = await local.root_state_meta_stub(local.local_device_id().object_id,local.dec_id).add_access(cyfs.GlobalStatePathAccessItem.new(
            req.req_path!,
            req.access
        ));
        if(modify_access.err){
            this.logger.error(`${req.req_path} root_state_meta_stub add_access error ,will retry`);
            modify_access = await local.root_state_meta_stub(local.local_device_id().object_id,local.dec_id).add_access(cyfs.GlobalStatePathAccessItem.new(
                req.req_path!,
                req.access
            ));
        }
        this.logger.info(`${req.req_path} root_state_meta_stub add_access result = ${JSON.stringify(modify_access)}`);
        if(modify_access.err){

        }
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
            let get_noc  =await this.local!.non_service().get_object({
                common :{
                    dec_id: local.dec_id,
                    flags: 1,
                    level : cyfs.NONAPILevel.NOC,
                },
                object_id : req.object_id
            })
            this.logger!.error(`get object by noc ,result = ${JSON.stringify(get_noc)}`)
            return { err: ErrorCode.fail, log: `${JSON.stringify(check_result)}`}
        }else{
            this.logger.info(`${local.local_device_id().object_id.to_base_58()} get req_path ${req.req_path!}  object =  ${check_result.unwrap().object.object.object_id.to_base_58()}`)
            return { err: ErrorCode.succ, log: "success"}
        }  
       
       
    }
}
