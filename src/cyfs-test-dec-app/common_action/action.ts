import { ErrorCode, Logger} from '../base';
var date = require("silly-datetime");
import * as cyfs from "../cyfs"

export type Action ={
    // 默认数据
    type? : string, //操作类型
    begin_date  ? : string , //执行日期
    end_date  ? : string , //执行日期
    action_id?:string, // action id
    // 输入数据
    local : {
        peer_name : string,
        dec_id ? : string,
        type?: cyfs.CyfsStackRequestorType
    },   //local 设备
    remote? : {
        peer_name : string,
        dec_id ? : string,
        type?: cyfs.CyfsStackRequestorType
    },  //remote 设备
    user_list? : Array<string>, //其他协议栈列表 
    testcase_id? : string, // 测试用例id 
    parent_action?:string, //父任务
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
    output?:{
        send_time ? : number,
        total_time ? : number,
       
    }
    result?:{err:number,log?:string}; //实际结果   
}

export abstract  class ActionAbstract{
    abstract  start(req:any): Promise<{err:number,log:string}>;
    abstract  run(req:any): Promise<{err:number,log:string}>;
}
export class BaseAction implements ActionAbstract{
    public action: Action
    public logger: Logger;
    public child_actions : Array<Action>
   
    constructor(action: Action,logger:Logger) {
        this.action = action;
        this.logger = logger; 
        this.child_actions = [];
    }
    async start(req?:any): Promise<{ err: number, log: string,resp?:any}> {
        this.logger!.info(`##### ${this.action.action_id} ${this.action.parent_action} start running `)
        return new Promise(async(V)=>{
            try {
                // 创建超时检测
                if(!this.action.input.timeout){
                    this.action.input.timeout = 60*1000;
                }
                let timer  =  setTimeout(async ()=>{
                    this.action.result = { err: ErrorCode.timeout, log: `${this.action.action_id} ${this.action.local.peer_name} ${this.action.remote?.peer_name} run timeout time = ${this.action.input.timeout}`};
                    this.logger!.error(this.action.result);
                    if(this.action.expect.err && this.action.expect.err == ErrorCode.timeout){
                        V({ err: ErrorCode.succ, log: `action run error ${this.action.expect.err} is expect` })
                    }
                    V({ err: ErrorCode.timeout, log: `${this.action.action_id} run timeout`});
                },this.action.input.timeout!)
                this.action.begin_date =  date.format(new Date(),'YYYY/MM/DD HH:mm:SS');
                let result = await this.run(req);
                this.action.end_date =  date.format(new Date(),'YYYY/MM/DD HH:mm:SS');
                // 释放超时检测
                clearTimeout(timer); 
                this.action.result = result;
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
            } catch (error) {
                //测试程序异常，进行捕获
                this.logger!.error(error);
                V({ err: ErrorCode.exception, log: `${error}` })
            }
            
        })
    }
    async run(req:any):Promise<{ err: number, log: string,resp?:any}>{
        // 默认没有操作
        return { err: ErrorCode.succ, log: "Action run success" }
    }
}
