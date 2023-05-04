import { BaseAction, ActionAbstract,Action} from "../../../cyfs-test-util";
import { ErrorCode, Logger,RandomGenerator,sleep } from '../../../common';
import * as cyfs from "../../../cyfs";
import {HandlerRequestObject,HandlerType} from "../../../dec-app-base"

/**
 * 操作描述：
 * 
 * 设备 ：file_source_device 发布文件的设备，默认是local
 * 设备 ：local  协议栈中保存文件的设备
 * 设备 ：remote 协议栈中文件下载端 
 * 
 * 流程
 * （1）remote： 创建 handler 监听器,监听其他设备的post object 请求
 * （2)local： local ： PublishFileAction 上传文件
 * （3) local: 文件访问权限的修改 ： local修改指定req_path的权限为full
 * （4）local: 将文件对象挂载root_state 路径req_path上
 *  (5) loacl: 发送post_object HandlerRequest TransFileRequest 到remote设备
    * （6）remote: remote 触发handler 执行下载文件流程
    * （7）remote: 从local 设备获取file 对象信息 
    * （8）remote: 根据local 提供的device_list构造context
    * （9）remote: create_task 开始传输文件，检查传输任务直到完成
    *  (10) remote: remote 返回 handler执行结果
*  (11) loacl: loacl收到post_object返回结果 
 */


interface TestInput{
    handler_id : string
    chain : cyfs.RouterHandlerChain,
    index : number,
    root_req_path : string,
    filter?: string,
    default_action : cyfs.RouterHandlerAction,
    routine? : cyfs.RouterHandlerAclRoutine,
    token? : string
}
interface TestOutput{
    object_id : cyfs.ObjectId,
    share_req_path : string,
}

export class ShareObjectWithTokenAction extends BaseAction implements ActionAbstract {

    async start(req?:TestInput): Promise<{ err: number; log: string, resp?: TestOutput}> {
        this.action.type = "TransFileAction"
        this.action.action_id = `TransFileAction-${Date.now()}`
        return await super.start(req);
    }
    async run(req?: TestInput): Promise<{ err: number, log: string,resp?: TestOutput }> {
        // Create Test Object
        
        let handler_request = HandlerRequestObject.create(this.local.local_device_id().object_id,HandlerType.PutObject,RandomGenerator.string(50),JSON.stringify({
            test_data : RandomGenerator.string(20)
        }),new Uint8Array(0));
        const SHARE_REQ_PATH = `${req.root_req_path}/share-${handler_request.calculate_id().to_base_58()}`;
        let put_resp = await this.local!.non_service().put_object({
            common : {
                level : cyfs.NONAPILevel.NOC,
                flags : 1,
            },
            object : cyfs.NONObjectInfo.new_from_object_raw(handler_request.to_vec().unwrap()).unwrap()
        })
        if(put_resp.err){
            console.info(`ShareObjectWithTokenAction put object failed`)
            return {err : put_resp.val.code, log : put_resp.val.msg}
        }
        // Link to req path
        let op_env = (await this.local!.root_state_stub().create_path_op_env()).unwrap();
        let insert_check = await op_env.insert_with_path(SHARE_REQ_PATH,handler_request.calculate_id());
        if(insert_check.err){
            console.info(`ShareObjectWithTokenAction insert_with_path failed`)
            return {err : insert_check.val.code, log : insert_check.val.msg}
        }
        let commit = await op_env.commit();
        // Add Token access
        let item1 : cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(SHARE_REQ_PATH,cyfs.AccessString.full());
        item1.access = cyfs.GlobalStatePathGroupAccess.Handler();
        let add_access = (await this.local.root_state_meta_stub().add_access(item1));
        if(add_access.err){
            console.info(`ShareObjectWithTokenAction root_state_meta_stub add_access failed`)
            return {err : add_access.val.code, log : add_access.val.msg}
        }
        // Add req_path handler
        let add_handler = await this.local!.router_handlers().add_acl_handler(
            req.chain,
            req.handler_id,
            req.index,
            req.filter,
            SHARE_REQ_PATH,
            req.default_action,
            req.routine
        );
        return {err:ErrorCode.succ,log:"success",resp:{
            object_id : handler_request.calculate_id(),
            share_req_path : SHARE_REQ_PATH
        }}
    } 
}
