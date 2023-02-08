import {BaseAction,ActionAbstract,Action} from "../../action";
import { ErrorCode, Logger} from '../../../base';
import * as cyfs from "../../../cyfs";
import {HandlerApi} from "../../../common_base"
import { StackManager, CyfsDriverType ,PeerInfo} from "../../../cyfs-driver-client"
/**
 * 输入数据
 */
 type TestInput = {
    object_type: string,
    chunk_size: number,
    file_size?: number,
}
type TestOutput = {
    md5 : string,
    send_time : number,
    object_id : cyfs.ObjectId,
}

export class PutSharedDataAction extends BaseAction implements ActionAbstract {
    static create_by_parent(action:Action,logger:Logger): {err:number,action?:PutSharedDataAction}{
        let run =  new PutSharedDataAction({
            local : action.remote!,
            remote : action.remote,
            input : action.input,
            parent_action : action.action_id!,
            expect : {err:0},
        },logger)
        return {err:ErrorCode.succ,action:run}
    }
    async start(req:TestInput): Promise<{ err: number; log: string; resp?: TestOutput }> {
        this.action.type = "PutSharedDataAction";
        this.action.action_id = `PutSharedDataAction-${Date.now()}`
        return await super.start(req)
    }
    async run(req:TestInput): Promise<{ err: number, log: string, resp?:TestOutput}> {
        // 获取连接池中的cyfs stack
        let stack = this.local!;
        let stack_manager = StackManager.createInstance();
        let local_tool = stack_manager.driver!.get_client(this.action.local.peer_name).client!.get_util_tool();
        // 创建测试文件
        let data : Uint8Array;
        let object_id : cyfs.ObjectId;
        let length = 0;
        let md5 = "";
        if(req.object_type == "chunk"){
            let local_data = await local_tool.rand_cyfs_chunk_cache(req.chunk_size);
            data = local_data.chunk_data;
            object_id = local_data.chunk_id.calculate_id();
            length = req.chunk_size;
            md5 = await local_tool.md5_buffer(data as Buffer);
            this.logger.info(`put_data chunk  = ${local_data.chunk_id} object_id = ${object_id}`)
        }else{
            return {
                err: ErrorCode.fail, 
                log: "cyfs stack not support"
            }
        }
        this.logger.info(`random data success ${object_id.to_base_58()}`)
        let begin_send = Date.now();
        let put_result =await stack.ndn_service().put_shared_data({
            common: {
                level: cyfs.NDNAPILevel.NDC,
                flags: 1,
            },
            object_id ,
            length,
            data,
        });
        let send_time = Date.now() - begin_send;
        this.logger.info(`put_data send_time = ${send_time} result =  ${put_result.err}`)
        if(put_result.err){
            return {err:put_result.val.code,log:put_result.val.msg}
        }
        return { err: ErrorCode.succ, log: "success",resp:{md5,send_time,object_id}}
       
    }
}