import * as cyfs from "../../cyfs";
import { HandlerRequestObject, HandlerRequestObjectDecoder,HandlerApi,NotFoundError} from "../../dec-app-base"
import { ErrorCode, Logger,sleep } from '../../common';
import {PeerInfo} from "../../cyfs-driver-client"

export type HandlerInfo ={
    // 默认数据
    type? : string, //操作类型
    begin_date  ? : string , //执行日期
    end_date  ? : string , //执行日期
    action_id?:string, // action id
    // 输入数据
    local : PeerInfo,   //local 设备
    request?:HandlerApi,
    response?:HandlerApi,
    total_time?:number,
}

export class BaseHandler {
    public stack : cyfs.SharedCyfsStack;
    public handler_info:HandlerInfo;
    public logger: Logger;
    constructor(stack : cyfs.SharedCyfsStack,local:PeerInfo,logger: Logger){
        this.stack = stack
        this.handler_info = {
            local
        }
        this.logger = logger
    }
    async start(req:HandlerRequestObject):Promise<HandlerRequestObject>{
        // 封装一些操作
        // 捕获异常
        try {
            this.handler_info.action_id = req.id;
            let json_data : HandlerApi = JSON.parse(req.request_json) ;
            let buffer = req.request_buffer;
            // 运行总时间统计
            let begin_run = Date.now();
            let result = await this.run(json_data);
            let total_time = Date.now() - begin_run;
            return HandlerRequestObject.create(this.stack.local_device_id().object_id,req.request_type,req.id,JSON.stringify(result),Buffer.from(""));
        } catch (err) {
            this.logger.error(`${JSON.stringify(err)}`)
            let result : HandlerApi = {
                InvalidParam :{
                    result : ErrorCode.invalidParam,
                    msg : `decode request param error =${JSON.stringify(err)}`,
                    data : req.request_json 
                }
            }
            return HandlerRequestObject.create(this.stack.local_device_id().object_id,req.request_type,req.id,JSON.stringify(result),Buffer.from(""));
        }
        

    }
    async run(req:HandlerApi):Promise<HandlerApi>{
        // 默认没有操作返回报错
        return NotFoundError
        
    }
}




