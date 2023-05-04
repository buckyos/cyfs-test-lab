import { ErrorCode, Logger} from '../../common';
import * as cyfs from "../../cyfs"
import { StackManager} from "./stack_manager"
import {ActionManager} from "./action_manager"
import {get_date} from "../tools"

const data_manager =  ActionManager.createInstance();

export type Action ={

    // 输入数据
    local : {
        peer_name : string,
        dec_id ? : string,
        type?: cyfs.CyfsStackRequestorType,
        device_id?:cyfs.ObjectId
    },   //local 设备
    input:{
        timeout : number, //超时时间
        req_path? : string,
        object_size? : number, // non 对象大小
        file_size? : number,   // 文件大小
        chunk_size? : number,  // chunk 大小
        common_non? : cyfs.NDNOutputRequestCommon ,// 协议栈参数  
        common_ndn? : cyfs.NONOutputRequestCommon ,// 协议栈参数  
        ndn_level?:cyfs.NDNAPILevel,
        non_level?:cyfs.NONAPILevel,
       
    },
    expect:{err:number};   //预期结果 
    // 默认数据
    type? : string, //操作类型
    begin_date  ? : string , //执行日期
    end_date  ? : string , //执行日期
    testcase_id? : string, // 测试用例id 
    action_id?:string, // action id
    remote? : {
        peer_name : string,
        dec_id ? : string,
        type?: cyfs.CyfsStackRequestorType
        device_id?:cyfs.ObjectId
    },  //remote 设备
    user_list? : Array<{
        peer_name : string,
        dec_id ? : string,
        type?: cyfs.CyfsStackRequestorType,
        device_id?:cyfs.ObjectId,
    }>, //其他协议栈列表 
    
    parent_action?:string, //父任务

    action_req?:any,   
    output?:{
        publish_time ? : number,
        send_object_time ? : Array<number>,
        send_file_time ? : Array<number>,
        total_time ? : number,
       
    }
    result?:{err:number,log?:string}; //实际结果   
}

export abstract  class ActionAbstract{
    abstract  start(req:any): Promise<{err:number,log:string}>;
    abstract  run(req:any): Promise<{err:number,log:string}>;
}


export class BaseAction implements ActionAbstract{
    public action: Action;
    public child_actions : Array<Action>;
    public local? : cyfs.SharedCyfsStack;
    private remote? : cyfs.SharedCyfsStack;
    private user_list? : Array<cyfs.SharedCyfsStack>;

    constructor(action: Action) {
        this.action = action;
        // 默认使用 StackManager 日志库
        this.child_actions = [];
    }

    async init_satck(){
        // 加载测试需要操作的协议栈
        let stack_manager = StackManager.createInstance();
        if(this.action.local){
            let local_get = stack_manager.get_cyfs_satck(this.action.local);
            if (local_get.err) {
                console.error(`${this.action.action_id} StackManager not found cyfs satck ${this.action.local.peer_name}`);
                return {err:ErrorCode.notFound,log:` ${JSON.stringify(this.action.local)} 协议栈未初始化`}
            }else{
                console.info(`${this.action.action_id} found stack local:  ${JSON.stringify(this.action.local.peer_name) }`);
                this.local = local_get.stack!
                this.action.local.device_id = this.local!.local_device_id().object_id
            }
        }
        if(this.action.remote){
            let remote_get = stack_manager.get_cyfs_satck(this.action.remote!);
            if (remote_get.err) {
                console.error(`${this.action.action_id} StackManager not found cyfs satck ${JSON.stringify(this.action.remote.peer_name)}`);
                return {err:ErrorCode.notFound,log:` ${JSON.stringify(this.action.remote.peer_name)} 协议栈未初始化`}
            }else{
                console.info(`${this.action.action_id} found stack remote: ${this.action.remote.peer_name}`);
                this.remote = remote_get.stack!
                this.action.remote.device_id = this.remote!.local_device_id().object_id
            }
        }
        if(this.action.user_list){
            this.user_list = [];
            for(let stack_info of this.action.user_list){
                let statck_get = stack_manager.get_cyfs_satck(stack_info);
                if (statck_get.err) {
                    console.error(`${this.action.action_id} StackManager not found cyfs satck ${stack_info.peer_name}`);
                    return {err:ErrorCode.notFound,log:` ${JSON.stringify(stack_info)} 协议栈未初始化`}
                }else{
                    console.info(`${this.action.action_id} found stack user: ${JSON.stringify(stack_info.peer_name)}`);
                    this.user_list.push(statck_get.stack!);
                    stack_info.device_id = statck_get.stack!.local_device_id().object_id
                }
            }
        }
        return {err:ErrorCode.succ,log:"success"}
    }
    get_remote(){
        console.error(`action ${this.action.action_id} use remote stack is unsafe`);
        return this.remote
    }
    get_user_list(){
        console.error(`action ${this.action.action_id} use user_list stack is unsafe`);
        return this.user_list
    }

    async start(req?:any): Promise<{ err: number, log: string,resp?:any}> {
        console.info(`<----------------------------- ${this.action.action_id} ${this.action.parent_action} start running -----------------------------> `)
        console.debug(`${this.action.action_id} req = ${JSON.stringify(req)} `)
        // 记录自定义参数
        this.action.action_req = req;
        // 初始化结果统计
        this.action.output= {};
        // 加载测试操作
        let init = await this.init_satck();
        if(init.err){
            return init;
        }
        // 执行测试任务
        return new Promise(async(V)=>{
            try {
                // 创建超时检测
                if(!this.action.input.timeout){
                    this.action.input.timeout = 60*1000;
                }
                let timer  =  setTimeout(async ()=>{
                    this.action.result = { err: ErrorCode.timeout, log: `${this.action.action_id} ${this.action.local.peer_name} ${this.action.remote?.peer_name} run timeout time = ${this.action.input.timeout}`};
                    console.error(`run timeout ${JSON.stringify(this.action.result)}`);
                    if(this.action.expect.err && this.action.expect.err == ErrorCode.timeout){
                        V({ err: ErrorCode.succ, log: `action run error ${this.action.expect.err} is expect` })
                    }
                    V({ err: ErrorCode.timeout, log: `${this.action.action_id} run timeout`});
                },this.action.input.timeout!)
                this.action.begin_date =  get_date();
                let result = await this.run(req);
                this.action.end_date =  get_date();
                console.debug(`${this.action.action_id} resp = ${JSON.stringify(result)} `)
                // 释放超时检测
                clearTimeout(timer); 
                this.action.result = result;
                data_manager.record_action(this.action);
                // 实际失败 预期失败
                if(this.action.result.err !=0 &&  this.action.result.err  == this.action.expect.err){
                    V({ err: ErrorCode.succ, log: `action run error ${this.action.expect.err} is expect`})
                }
                // 实际成功 预期失败
                if(this.action.result.err == 0  && this.action.expect.err != 0){
                    V({ err: ErrorCode.fail, log: `action not error expect = ${this.action.expect.err}`})
                }
                // 预期成功 返回实际结果
                V(result)
            } catch (e) {
                //测试程序异常，进行捕获
                console.error(`action run throw Error: ${e}`);
                V({ err: ErrorCode.exception, log: `${e}`})
            }
            
        })
    }
    async run(req:any):Promise<{ err: number, log: string,resp?:any}>{
        // 默认没有操作
        return { err: ErrorCode.succ, log: "Action run success" }
    }
}
