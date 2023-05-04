import { BaseAction, ActionAbstract } from "../../../cyfs-test-util";
import { ErrorCode, Logger,sleep } from '../../../common';

import {GetDataAction} from "./get_data"
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

export class BuildGetDataGroupTreeAsync extends BaseAction implements ActionAbstract {
    async start(req:TestInput): Promise<{ err: number; log: string, resp?: TestOutput}> {
        this.action.type = "BuildGetDataGroupTreeAsync"
        this.action.action_id = `BuildGetDataGroupTreeAsync-${Date.now()}`
        return await super.start(req);
    }
    async run(req: TestInput): Promise<{ err: ErrorCode, log: string,resp?: TestOutput }> {
        let local = this.local!;        
        let task_result_list = []

        for(let task of req.task_list){
            let result = await GetDataAction.create_by_parent(this.action).action!.start({
                req_path:task.req_path,
                context:task.context_path,
                group:task.group,
                object_type: "chunk",
                chunk_size: 10*1024*1024, 
            })
            task_result_list.push({
                err : result.err,
                log : result.log,
                send_time: result.resp!.send_time,
                md5: result.resp!.md5,
                req_path: task.req_path,
                group :task.group,
                context_path: task.context_path,
            })
           
        }

        return {err:0,log:"success",resp:{task_list:task_result_list} };
    }
}
