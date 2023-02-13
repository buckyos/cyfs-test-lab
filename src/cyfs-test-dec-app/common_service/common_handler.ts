import * as cyfs from "../cyfs";
import { HandlerRequestObject, HandlerRequestObjectDecoder,NotFoundError} from "../common_base"
import { ErrorCode, Logger, sleep } from '../base';
import { PeerInfo,HandlerType } from "../common_base"

import * as HandlerListenr from "./handler"

export class CommonPostObjectHandler implements cyfs.RouterHandlerPostObjectRoutine {

    public stack: cyfs.SharedCyfsStack;
    public local: PeerInfo
    public logger: Logger;
    constructor( stack: cyfs.SharedCyfsStack,local: PeerInfo, logger: Logger) {
        this.logger = logger;
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
                return await (new HandlerListenr.TransFileHandler(this.stack,this.local,this.logger).start(request));
            }
            case HandlerType.PrepareTransFile: {
                return await (new HandlerListenr.PrePareTransFileHandler(this.stack,this.local,this.logger).start(request));
            }
            case HandlerType.UpdateContext: {
                return await (new HandlerListenr.UpdateContextHandler(this.stack,this.local,this.logger).start(request));
            }
            case HandlerType.AddContext: {
                return await (new HandlerListenr.AddContextHandler(this.stack,this.local,this.logger).start(request));
            }
            case HandlerType.ShareFileAddAccess:{
                return await (new HandlerListenr.ShareFileAddAccessHandler(this.stack,this.local,this.logger).start(request));
            }
            default: {
                let result = NotFoundError
                return HandlerRequestObject.create(this.stack.local_device_id().object_id,request.request_type, request.id,JSON.stringify({ result }), Buffer.from(""))
            }
        };
    }

}