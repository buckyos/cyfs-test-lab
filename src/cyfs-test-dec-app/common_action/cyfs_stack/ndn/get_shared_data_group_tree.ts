import { BaseAction, ActionAbstract } from "../../action";
import { ErrorCode, Logger,sleep } from '../../../base';
import * as cyfs from "../../../cyfs";
import { StackManager, CyfsDriverType ,PeerInfo} from "../../../cyfs-driver-client"
import  {LinkObjectAction} from "../root_state/link_object";
import { RegisterCommonHandler } from "../handler"
import {TransFileHandlerResp} from "../../../common_base"
import * as path from "path";
import {GetSharedDataAction} from "./get_shared_data"
/**
 * 输入数据
 */
type TestInput = {
    root_req_path : string,
    task_list : Array<{
        object_type: string,
        chunk_size: number,
        file_size?: number,
        req_path: string,
        group : string,
        context_path: string,
    }>
}

type TestOutput = {
    task_list : Array<{
        err : number,
        log : string,
        task_id? : string,
        req_path: string,
        group : string,
        context_path: string,
        md5?:string,
        send_time?:number,
        
    }>
}


export class BuildGetSharedDataGroupTree extends BaseAction implements ActionAbstract {
    async start(req:TestInput): Promise<{ err: number; log: string, resp?: TestOutput}> {
        this.action.type = "BuildGetSharedDataGroupTree"
        this.action.action_id = `BuildGetSharedDataGroupTree-${Date.now()}`
        return await super.start(req);
    }
    async run(req: TestInput): Promise<{ err: ErrorCode, log: string,resp?: TestOutput }> {
        let local = this.local!;

        
        let task_result_list = []
        let task_running_list = []
        for(let task of req.task_list){
            task_running_list.push(GetSharedDataAction.create_by_parent(this.action,this.logger).action!.start({
                req_path:task.req_path,
                context:task.context_path,
                group:task.group,
                object_type: "chunk",
                chunk_size: 4*1024*1024, 
            }))
           
        }
        for(let index in task_running_list){
            let  task_action = await task_running_list[index];
            task_result_list.push({
                err : task_action.err,
                log : task_action.log,
                send_time: task_action.resp!.send_time,
                md5: task_action.resp!.md5,
                req_path: req.task_list[index].req_path,
                group : req.task_list[index].group,
                context_path: req.task_list[index].context_path,
            })
        }
        return {err:0,log:"success",resp:{task_list:task_result_list} };
    }
}