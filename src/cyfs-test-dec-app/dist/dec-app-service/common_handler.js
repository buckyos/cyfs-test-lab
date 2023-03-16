"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommonPostObjectHandler = void 0;
const cyfs = __importStar(require("../cyfs"));
const dec_app_base_1 = require("../dec-app-base");
const dec_app_base_2 = require("../dec-app-base");
const HandlerListenr = __importStar(require("./handler"));
class CommonPostObjectHandler {
    constructor(stack, local, logger) {
        this.logger = logger;
        this.local = local;
        this.stack = stack;
    }
    async call(param) {
        console.info(`recv CommonPostObjectHandler req_path = ${param.request.common.req_path}`);
        let [request, object_raw] = new dec_app_base_1.HandlerRequestObjectDecoder().raw_decode(param.request.object.object_raw).unwrap();
        console.info(`request decode success, type = ${request.request_type}, json = ${JSON.stringify(request.request_json)}`);
        let response = await this.handler_request(request);
        const result = {
            action: cyfs.RouterHandlerAction.Response,
            request: param.request,
            response: cyfs.Ok({
                object: new cyfs.NONObjectInfo(response.calculate_id(), response.to_vec().unwrap())
            })
        };
        return cyfs.Ok(result);
    }
    async handler_request(request) {
        switch (request.request_type) {
            case dec_app_base_2.HandlerType.TransFile: {
                return await (new HandlerListenr.TransFileHandler(this.stack, this.local, this.logger).start(request));
            }
            case dec_app_base_2.HandlerType.PrepareTransFile: {
                return await (new HandlerListenr.PrePareTransFileHandler(this.stack, this.local, this.logger).start(request));
            }
            case dec_app_base_2.HandlerType.UpdateContext: {
                return await (new HandlerListenr.UpdateContextHandler(this.stack, this.local, this.logger).start(request));
            }
            case dec_app_base_2.HandlerType.AddContext: {
                return await (new HandlerListenr.AddContextHandler(this.stack, this.local, this.logger).start(request));
            }
            case dec_app_base_2.HandlerType.ShareFileAddAccess: {
                return await (new HandlerListenr.ShareFileAddAccessHandler(this.stack, this.local, this.logger).start(request));
            }
            default: {
                let result = dec_app_base_1.NotFoundError;
                return dec_app_base_1.HandlerRequestObject.create(this.stack.local_device_id().object_id, request.request_type, request.id, JSON.stringify({ result }), Buffer.from(""));
            }
        }
        ;
    }
}
exports.CommonPostObjectHandler = CommonPostObjectHandler;
