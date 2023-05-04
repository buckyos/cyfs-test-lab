import * as cyfs from "../cyfs";
import { HandlerRequestObject, HandlerRequestObjectDecoder,NotFoundError} from "../dec-app-base"
import { ErrorCode, Logger, sleep } from '../common';
import { PeerInfo,HandlerType } from "../dec-app-base"

import * as HandlerListenr from "./handler"

export class CommonPostObjectHandler implements cyfs.RouterHandlerPostObjectRoutine {

    public stack: cyfs.SharedCyfsStack;
    public local: PeerInfo
    constructor( stack: cyfs.SharedCyfsStack,local: PeerInfo) {
        this.local = local;
        this.stack = stack;
    }
    async call(param: cyfs.RouterHandlerPostObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerPostObjectResult>> {
        console.info(`recv CommonPostObjectHandler req_path = ${param.request.common.req_path}`)
        let [request, object_raw] = new HandlerRequestObjectDecoder().raw_decode(param.request.object.object_raw).unwrap();
        console.info(`request decode success, type = ${request.request_type}, json = ${JSON.stringify(request.request_json)}`);
        let response = await this.handler_request(request);
        const result: cyfs.RouterHandlerPostObjectResult = {
            action: cyfs.RouterHandlerAction.Response,
            request: param.request,
            response: cyfs.Ok({
                object: new cyfs.NONObjectInfo(response.calculate_id(), response.to_vec().unwrap())
            })
        };
        return cyfs.Ok(result)
    }
    async handler_request(request: HandlerRequestObject): Promise<HandlerRequestObject> {
        switch (request.request_type) {
            case HandlerType.TransFile : {
                return await (new HandlerListenr.TransFileHandler(this.stack,this.local).start(request));
            }
            case HandlerType.PrepareTransFile: {
                return await (new HandlerListenr.PrePareTransFileHandler(this.stack,this.local).start(request));
            }
            case HandlerType.UpdateContext: {
                return await (new HandlerListenr.UpdateContextHandler(this.stack,this.local).start(request));
            }
            case HandlerType.AddContext: {
                return await (new HandlerListenr.AddContextHandler(this.stack,this.local).start(request));
            }
            case HandlerType.ShareFileAddAccess:{
                return await (new HandlerListenr.ShareFileAddAccessHandler(this.stack,this.local).start(request));
            }
            case HandlerType.PutObject:{
                return await (new HandlerListenr.PutObjectHandler(this.stack,this.local).start(request));
            }
            // docker 权限隔离简单测试
            // 磁盘相关操作
            case HandlerType.OS_IO_ReadFile:{
                return await (new HandlerListenr.ReadFIleHandler(this.stack,this.local).start(request));
            }
            case HandlerType.OS_IO_WriteFile:{
                return await (new HandlerListenr.WriteFIleHandler(this.stack,this.local).start(request));
            }
            case HandlerType.OS_IO_RunFile:{
                return await (new HandlerListenr.ReadFIleHandler(this.stack,this.local).start(request));
            }
            // 网络相关操作
            case HandlerType.OS_Network_HttpListern:{
                return await (new HandlerListenr.HttpServerHandler(this.stack,this.local).start(request));
            }
            case HandlerType.OS_Network_HttpRequest:{
                return await (new HandlerListenr.HttpRequestHandler(this.stack,this.local).start(request));
            }
            default: {
                let result = NotFoundError
                return HandlerRequestObject.create(this.stack.local_device_id().object_id,request.request_type, request.id,JSON.stringify({ result }), Buffer.from(""))
            }
        };
    }

}