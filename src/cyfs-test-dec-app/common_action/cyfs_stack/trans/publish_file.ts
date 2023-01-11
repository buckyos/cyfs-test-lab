import {BaseAction,ActionAbstract,Action} from "../../action";
import { ErrorCode, Logger} from '../../../base';
import * as cyfs from "../../../cyfs";
import {StackManager,CyfsDriverType,PeerInfo} from "../../../cyfs-driver-client"
import { type } from "os";

/**
 * 输入数据
 */
type TestInput = {
    local_path : string,
    chunk_size : number,
    req_path?: string,
    level: cyfs.NDNAPILevel,
    referer_object?: cyfs.NDNDataRefererObject[],
    flags: number,
}

export class PublishFileAction extends BaseAction implements ActionAbstract {

    static create_by_parent(file_source_device : PeerInfo,action:Action,logger:Logger): {err:number,action?:PublishFileAction}{
        let run =  new PublishFileAction({
            local :  file_source_device,
            remote : action.local,
            input : {
                timeout : action.input.timeout,
                chunk_size : action.input.chunk_size
            },
            parent_action : action.action_id!,
            expect : {err:0},

        },logger)
        return {err:ErrorCode.succ,action:run}
    }
    async start(req:TestInput): Promise<{ err: number; log: string; resp?: any; }> {
        this.action.type = "PublishFileAction";
        this.action.action_id = `PublishFileAction-${Date.now()}`
        return await super.start(req)
    }
    async run(req:TestInput): Promise<{ err: number, log: string, resp?:{file_id?:cyfs.ObjectId} }> { 
        // 获取连接池中的cyfs stack
        let local = this.local!;
        let remote = this.remote!;
        // 获取测试驱动中的工具类
        this.logger.info(`local : ${local.local_device_id().object_id.to_base_58()}`)
        this.logger.info(`remote : ${remote.local_device_id().object_id.to_base_58()}`)
        // 发布文件
        let begin_time = Date.now();
        let info1 = await remote.trans().publish_file({
            common: {
                // api级别
                dec_id : local.dec_id,
                req_path : req.req_path,
                level: req.level,
                referer_object : req.referer_object,
                target : remote.local_device_id().object_id,             
                flags: req.flags,
            },
            // 文件所属者
            owner: remote.local_device_id().object_id,
            // 文件的本地路径
            local_path: req.local_path,
            // chunk大小
            chunk_size: this.action.input.chunk_size!,
        });
        this.action.output! = {
            total_time : Date.now() - begin_time
        }; 
        if(info1.err){
            this.logger.error(`publish_file error : ${JSON.stringify(info1)} `);
            return { err: info1.val.code, log: info1.val.msg}
        }else{
            this.logger.info(`publish_file : ${JSON.stringify(info1.unwrap())}`);
            return { err: ErrorCode.succ, log: "success",resp:{file_id:info1.unwrap().file_id}}
        }
     
        
       
    }
}
