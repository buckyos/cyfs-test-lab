import {BaseAction,ActionAbstract,Action} from "../../action";
import { ErrorCode, Logger} from '../../../base';
import * as cyfs from "../../../cyfs";
import {HandlerApi} from "../../../common_base"
import { StackManager, CyfsDriverType ,PeerInfo} from "../../../cyfs-driver-client"
import {PutDataAction} from "./put_data"
import {LinkObjectAction} from "../root_state/link_object"
/**
 * 输入数据
 */
 type TestInput = {
    //range: cyfs.NDNDataRequestRange,
    req_path:string,
    context:string,
    group:string,
    object_type: string,
    chunk_size: number,
    file_size?: number,
}


export class GetDataAction extends BaseAction implements ActionAbstract {
    static create_by_parent(action:Action,logger:Logger): {err:number,action?:GetDataAction}{
        let run =  new GetDataAction({
            local : action.local,
            remote : action.remote,
            input : action.input,
            parent_action : action.action_id!,
            expect : {err:0},
        },logger)
        return {err:ErrorCode.succ,action:run}
    }
    async start(req:TestInput): Promise<{ err: number; log: string; resp?:  cyfs.NDNGetDataOutputResponse ,send_time?:number,md5?:string}> {
        this.action.type = "GetDataAction";
        this.action.action_id = `GetDataAction-${Date.now()}`
        return await super.start(req)
    }
    async run(req:TestInput): Promise<{ err: number, log: string, resp?: cyfs.NDNGetDataOutputResponse,send_time?:number,md5?:string}> {
        // 获取连接池中的cyfs stack
        let stack = this.local!;
        // remote 设备put_data 准备测试数据
        let put_result = await PutDataAction.create_by_parent(this.action,this.logger).action!.start({
            object_type: req.object_type,
            chunk_size: req.chunk_size,
            file_size: req.file_size,
        })
        if(put_result.err){
            return {err:put_result.err,log:put_result.log}
        }
        
        let stack_manager = StackManager.createInstance();
        let local_tool = stack_manager.driver!.get_client(this.action.local.peer_name).client!.get_util_tool();
        // 将 put_data 的object 关联到root_state req_path
        let link_action = await LinkObjectAction.create_by_parent_for_remote(this.action,this.logger).action!.start({
            object_id : put_result.resp!.object_id,
            req_path : req.req_path,
            access : cyfs.AccessString.full()
        })
        let begin_send = Date.now();
        let get_result =await stack.ndn_service().get_data({
            common: {
                level: this.action.input.ndn_level!,
                req_path : req.req_path,
                flags: 1,
                target: this.action.remote?.device_id
            },
            object_id: put_result.resp!.object_id,
            //range: req.range,
            context:req.context,
            group:req.group,
  
        });
        let send_time = Date.now() - begin_send;
        if(get_result.err){
            return {err:get_result.val.code,log:get_result.val.msg}
        }
        let result = get_result.unwrap();
        let md5 = await local_tool.md5_buffer(result.data! as Buffer);
        return { err: ErrorCode.succ, log: "success",resp: result,send_time,md5}
       
    }
}
