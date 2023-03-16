import {BaseAction,ActionAbstract,Action} from "../../action";
import { ErrorCode, Logger} from '../../../common';
import * as cyfs from "../../../cyfs";
import {HandlerApi} from "../../../dec-app-base"
import { StackManager, CyfsDriverType ,PeerInfo} from "../../../cyfs-driver-client"
/**
 * 输入数据
 */
 type TestInput = {
    type: cyfs.NDNQueryFileParamType,
    // value: ObjectId | HashValue | string | ChunkId,
    file_id?: cyfs.ObjectId,
    hash?: cyfs.HashValue,
    quick_hash?: string,
    chunk_id?: cyfs.ChunkId,
}
type TestOutput = {
    list: cyfs.NDNQueryFileInfo[]
}

export class QueryFileAction extends BaseAction implements ActionAbstract {
    static create_by_parent(action:Action,logger:Logger): {err:number,action?:QueryFileAction}{
        let run =  new QueryFileAction({
            local : action.remote!,
            remote : action.remote,
            input : action.input,
            parent_action : action.action_id!,
            expect : {err:0},
        },logger)
        return {err:ErrorCode.succ,action:run}
    }
    async start(req:TestInput): Promise<{ err: number; log: string; resp?: TestOutput }> {
        this.action.type = "QueryFileAction";
        this.action.action_id = `QueryFileAction-${Date.now()}`
        return await super.start(req)
    }
    async run(req:TestInput): Promise<{ err: number, log: string, resp?:TestOutput}> {
        // 获取连接池中的cyfs stack
        let stack = this.local!;
        let begin_send =  Date.now();
        let query_result =await stack.ndn_service().query_file({
            common: {
                level: this.action.input.ndn_level!,
                flags: 1,
            },
            param : {
                type: req.type,
                // value: ObjectId | HashValue | string | ChunkId,
                file_id: req.file_id,
                hash: req.hash,
                quick_hash: req.quick_hash,
                chunk_id: req.chunk_id,
            }
        });
      
        let send_time = Date.now() - begin_send;
        this.logger.info(`query_file send_time = ${send_time} result =  ${query_result.err}`)
        if(query_result.err){
            this.logger.error(`query_file error, result =  ${query_result}`)
            return {err:query_result.val.code,log:query_result.val.msg}
        }
        this.logger.info(`query_file send_time = ${send_time} result =  ${JSON.stringify(query_result.unwrap())}`)
        return { err: ErrorCode.succ, log: "success",resp:{list:query_result.unwrap().list}}
       
    }
}
