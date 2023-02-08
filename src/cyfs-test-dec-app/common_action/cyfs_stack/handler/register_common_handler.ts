import {BaseAction,ActionAbstract,Action} from "../../action";
import { ErrorCode, Logger} from '../../../base';
import * as cyfs from "../../../cyfs";
import {StackManager,CyfsDriverType} from "../../../cyfs-driver-client"
import {PeerInfo,CustumObjectType} from "../../../common_base"
import {CommonPostObjectHandler} from "../../../common_service"
/**
 * 输入数据
 */
 type TestInput = {
    req_path?: string,
}

/**
 * 协议栈注册handler监听器
 * 
 */
export class RegisterCommonHandler extends BaseAction implements ActionAbstract {
    static create_by_parent(action:Action,logger:Logger): {err:number,action?:RegisterCommonHandler}{
        let run =  new RegisterCommonHandler({
            local :  action.remote!,
            input : action.input,
            parent_action : action.action_id!,
            expect : {err:0},

        },logger)
        return {err:ErrorCode.succ,action:run}
    }
    async start(req:TestInput): Promise<{ err: number; log: string; resp?: any; }> {
        this.action.type = "RegisterCommonHandler";
        this.action.action_id = `RegisterCommonHandler-${Date.now()}`
        return await super.start(req)
    }
    async run(req:TestInput): Promise<{ err: number, log: string, resp?:{file_id?:cyfs.ObjectId} }> {
        // 获取连接池中的cyfs stack
        let local = this.local!;
        //  修改 GlobalStatePath 权限
        let req_path = new cyfs.RequestGlobalStatePath(local.dec_id, req.req_path!).toString()
        let test_access_global = await local.root_state_meta_stub(local.local_device_id().object_id, local.dec_id).add_access(cyfs.GlobalStatePathAccessItem.new(
            req_path!,
            cyfs.AccessString.full()
        ));
        let test_gloab_req = await local.root_state_meta_stub(local.local_device_id().object_id, local.dec_id).add_access(cyfs.GlobalStatePathAccessItem.new(
            req.req_path!,
            cyfs.AccessString.full()
        ));
        //local.root_state_meta_stub().add_object_meta()
        let result =  await local.router_handlers().add_post_object_handler(
            cyfs.RouterHandlerChain.Handler,
            this.action.action_id!,
            0,
            undefined, 
            req_path!,
            cyfs.RouterHandlerAction.Default,
            new CommonPostObjectHandler(this.local!,this.action.local,this.logger)
        );
        if(result.err){
            return { err: result.val.code, log: result.val.msg}
        }
        return { err: ErrorCode.succ, log: "success"}
       
    }
}
