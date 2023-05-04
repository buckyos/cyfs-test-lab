import {BaseAction,ActionAbstract,Action} from "../../../cyfs-test-util";
import { ErrorCode, Logger} from '../../../common';
import * as cyfs from "../../../cyfs";
import {HandlerApi} from "../../../dec-app-base"
import { StackManager} from "../../../cyfs-test-util"
import {PutDataAction} from "./put_data"
import {LinkObjectAction} from "../root_state/link_object"
import {PublishFileAction,PutContextAction,PublishDirAction} from "../trans"
import {GetObjectAction,BuildDirFromObjectMapAction} from "../non"
import * as fs from "fs-extra";
/**
 * 输入数据
 */
 type TestInput = {
    range?: cyfs.NDNDataRequestRange,
    req_path:string,
    context?:string,
    group?:string,
    object_type: string,
    chunk_size: number,
    file_size?: number,
}
type TestOutput = {
    send_time?:number,
    md5?:string,
    object_id?:cyfs.ObjectId,
    inner_path?:string
    hash : cyfs.HashValue
}

export class GetSharedDataAction extends BaseAction implements ActionAbstract {
    static create_by_parent(action:Action): {err:number,action?:GetSharedDataAction}{
        let run =  new GetSharedDataAction({
            local : action.local,
            remote : action.remote,
            input : action.input,
            parent_action : action.action_id!,
            expect : {err:0},
        })
        return {err:ErrorCode.succ,action:run}
    }
    async start(req:TestInput): Promise<{ err: number; log: string; resp?: TestOutput}> {
        this.action.type = "GetSharedDataAction";
        this.action.action_id = `GetSharedDataAction-${Date.now()}`
        return await super.start(req)
    }
    async run(req:TestInput): Promise<{ err: number, log: string, resp?: TestOutput}> {
        // 获取连接池中的cyfs stack
        let stack = this.local!;
        // remote 设备put_data 准备测试数据
        let object_id : cyfs.ObjectId;
        let md5_source : string = "";
        let dir_inner_path :string | undefined;
        if(req.object_type == "chunk"){
            let put_result = await PutDataAction.create_by_parent(this.action).action!.start({
                object_type: req.object_type,
                chunk_size: req.chunk_size,
                file_size: req.file_size,
            })
            if(put_result.err){
                return {err:put_result.err,log:put_result.log}
            }
            object_id = put_result.resp!.object_id;
            md5_source =  put_result.resp!.md5;
        }else if(req.object_type == "file"){
            this.action.input.chunk_size = req.chunk_size
            this.action.input.file_size = req.file_size
            let put_result = await PublishFileAction.create_by_parent_for_remote(this.action).action!.start({
                rand_file : true,
                file_size : req.file_size!,
                chunk_size: req.chunk_size!,
                req_path: req.req_path!,
                level: this.action.input.ndn_level!,
                flags: 1,
            })
            if(put_result.err){
                return {err:put_result.err,log:put_result.log}
            }
            object_id = put_result.resp!.file_id;
            md5_source =  put_result.resp!.md5!;
        }else if(req.object_type == "dir"){
            this.action.input.chunk_size = req.chunk_size
            this.action.input.file_size = req.file_size
            let put_result = await PublishDirAction.create_by_parent_for_remote(this.action).action!.start({
                rand_file : true,
                file_num : 2,
                file_size : req.file_size!,
                chunk_size: req.chunk_size!,
                req_path: req.req_path!,
                level: this.action.input.ndn_level!,
                flags: 1,
            })
            if(put_result.err){
                return {err:put_result.err,log:put_result.log}
            }
            let object_map_id = put_result.resp!.dir_id;
            md5_source = "dir";

            let dir_get = await BuildDirFromObjectMapAction.create_by_parent_remote_noc(this.action).action!.start({
                object_id:object_map_id
            })
            let dir_id = dir_get.resp!.object_id;
            object_id = dir_id;
            let dir_object_get = await GetObjectAction.create_by_parent_remote_noc(this.action).action!.start({
                object_id:dir_id,
            })
            let dir_object =  new cyfs.DirDecoder().from_raw(dir_object_get.resp!.object_raw!).unwrap() 
            dir_object.desc().content().obj_list().match({
                Chunk: (chunk_id: cyfs.ChunkId) => {
                    console.error(`obj_list in chunk not support yet! ${chunk_id}`);
                },
                ObjList: (obj_list) => {
                    for (const [inner_path, info] of obj_list.object_map().entries()) {
                         if(info.node().is_object_id()){
                            console.info(`Dir inner_path =  ${inner_path} object_id =  ${info.node().object_id}`);
                            dir_inner_path = inner_path.toString();
                            //break;
                         }
                    }
                }})
        }
        let stack_manager = StackManager.createInstance();
        let local_tool = stack_manager.driver!.get_client(this.action.local.peer_name).client!.get_util_tool();
        // remote 将 put_data 的object 关联到root_state req_path
        let link_action = await LinkObjectAction.create_by_parent_for_remote(this.action).action!.start({
            object_id:object_id!,
            req_path : req.req_path,
            access : cyfs.AccessString.full()
        })
        // local 创建context 对象
        if(req.context){
            let context_action =await PutContextAction.create_by_parent(this.action).action!.start({
                context_path: req.context,
                chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                deviceid_list: [this.get_remote()!.local_device_id()]
            });
            if(context_action.err){
                return {err:context_action.err,log:context_action.log}
            }
        }
        let begin_send = Date.now();
        let get_result =await stack.ndn_service().get_shared_data({
            common: {
                level: this.action.input.ndn_level!,
                req_path : req.req_path,
                flags: 1,
                target: this.action.remote?.device_id
            },
            object_id: object_id!,
            //range: req.range,
            context:req.context,
            group:req.group,
            inner_path : dir_inner_path
  
        });
        let send_time = Date.now() - begin_send;
        console.info(`get_data send_time = ${send_time} result =  ${get_result.err}`)
        if(get_result.err){
            console.error(`get_data  result =  ${get_result}`)
            return {err:get_result.val.code,log:get_result.val.msg}
        }
        let result = get_result.unwrap();
        //await fs.appendFileSync("E:\\cyfs\\data_get.txt", result.data as Buffer);
        let md5 = await local_tool.md5_buffer(result.data! as Buffer);
        let hash = cyfs.HashValue.hash_data(result.data!);
        if(md5 != md5_source && req.object_type != "dir"){
            return { err: ErrorCode.fail, log: `error data: ${md5} !=${md5_source}`} 
        }
        return { err: ErrorCode.succ, log: "success",resp: {send_time,md5,object_id:object_id!,inner_path : dir_inner_path,hash}}
       
    }
}
