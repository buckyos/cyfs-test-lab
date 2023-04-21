import {BaseAction,ActionAbstract,Action} from "../../../cyfs-test-util";
import { ErrorCode, Logger} from '../../../common';
import * as cyfs from "../../../cyfs";
import { StackManager} from "../../../cyfs-test-util"

/**
 * 输入数据
 */
type TestInput = {
    rand_file :boolean,
    chunk_size : number,
    file_size : number,
    req_path?: string,
    level: cyfs.NDNAPILevel,
    referer_object?: cyfs.NDNDataRefererObject[],
    flags: number,
    asscess?:cyfs.AccessString
}
type TestOutput = {
    file_id : cyfs.ObjectId,
    file_name?: string;
    file_path?: string ;
    md5?: string;
}

export class PublishFileAction extends BaseAction implements ActionAbstract {

    static create_by_parent(action:Action,logger:Logger): {err:number,action?:PublishFileAction}{
        let run =  new PublishFileAction({
            local :  action.local,
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
    static create_by_parent_for_remote(action:Action,logger:Logger): {err:number,action?:PublishFileAction}{
        let run =  new PublishFileAction({
            local :  action.remote!,
            remote : action.remote,
            input : {
                timeout : action.input.timeout,
                chunk_size : action.input.chunk_size
            },
            parent_action : action.action_id!,
            expect : {err:0},

        },logger)
        return {err:ErrorCode.succ,action:run}
    }
    async start(req:TestInput): Promise<{ err: number; log: string; resp?: TestOutput; }> {
        this.action.type = "PublishFileAction";
        this.action.action_id = `PublishFileAction-${Date.now()}`
        return await super.start(req)
    }
    async run(req:TestInput): Promise<{ err: number, log: string, resp?:TestOutput }> { 
        // 获取连接池中的cyfs stack
        let local = this.local!;
        // 获取测试驱动中的工具类
        this.logger.info(`PublishFileAction : local : ${local.local_device_id().object_id.to_base_58()}`)
        this.logger.info(`PublishFileAction: remote : ${this.action.remote!.device_id}`)
        // 如果没有文件，创建测试文件
        let file_name:string|undefined;
        let file_path :string;
        let md5: string = ""
        if( req.rand_file){
            let stack_manager = StackManager.createInstance();
            let file_source = this.local!;
            // 获取测试驱动中的工具类
            let file_source_tool = stack_manager.driver!.get_client(this.action.local.peer_name).client!.get_util_tool();
            this.logger.info(`publish file device : ${file_source.local_device_id().object_id.to_base_58()}`);
            // 创建测试文件
            let local_file = await file_source_tool.create_file(req.file_size!);
            file_name = local_file.file_name!
            file_path = local_file.file_path!
            md5 = local_file.md5!
            this.logger.info(`local_file : ${JSON.stringify(local_file)}`);
        }
        // 发布文件
        let begin_time = Date.now();
        let info1 = await local.trans().publish_file({
            common: {
                // api级别
                dec_id : local.dec_id,
                req_path : req.req_path,
                level: req.level,
                referer_object : req.referer_object,           
                flags: req.flags,
            },
            owner: this.action.local!.device_id!,
            local_path: file_path!,
            chunk_size: this.action.input.chunk_size!,
            access : req.asscess
        });
        this.action.output!.total_time = Date.now() - begin_time; 
        if(info1.err){
            this.logger.error(`publish_file error : ${JSON.stringify(info1)} `);
            return { err: info1.val.code, log: info1.val.msg}
        }else{
            this.logger.info(`publish_file : ${JSON.stringify(info1.unwrap())}`);
            return { err: ErrorCode.succ, log: "success",resp:{file_id:info1.unwrap().file_id,file_name,file_path:file_path!,md5}}
        }
     
    }
}
