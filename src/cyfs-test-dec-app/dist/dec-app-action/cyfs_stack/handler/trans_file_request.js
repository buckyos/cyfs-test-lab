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
exports.TransFileRequest = void 0;
const action_1 = require("../../action");
const common_1 = require("../../../common");
const cyfs = __importStar(require("../../../cyfs"));
const dec_app_base_1 = require("../../../dec-app-base");
/**
 * post_object 到目标协议栈，触发监听器
*/
class TransFileRequest extends action_1.BaseAction {
    static create_by_parent(action, logger) {
        let run = new TransFileRequest({
            local: action.local,
            remote: action.remote,
            input: action.input,
            parent_action: action.action_id,
            expect: { err: 0 },
        }, logger);
        return { err: common_1.ErrorCode.succ, action: run };
    }
    async start(req) {
        this.action.type = "TransFileRequest";
        this.action.action_id = `TransFileRequest-${Date.now()}`;
        return await super.start(req);
    }
    async run(req) {
        var _a;
        // 获取连接池中的cyfs stack
        let local = this.local;
        let request = {
            TransFileHandlerReq: req
        };
        let handler_request = dec_app_base_1.HandlerRequestObject.create(this.local.local_device_id().object_id, dec_app_base_1.HandlerType.TransFile, this.action.action_id, JSON.stringify(request), new Uint8Array(0));
        let result = await local.non_service().post_object({
            common: {
                req_path: req.req_path,
                dec_id: local.dec_id,
                level: cyfs.NONAPILevel.Router,
                target: (_a = this.action.remote) === null || _a === void 0 ? void 0 : _a.device_id,
                flags: 1,
            },
            object: new cyfs.NONObjectInfo(handler_request.calculate_id(), handler_request.to_vec().unwrap()),
        });
        if (result.err) {
            return { err: result.val.code, log: result.val.msg };
        }
        let response = result.unwrap();
        let response_object = new dec_app_base_1.HandlerRequestObjectDecoder().from_raw(response.object.object_raw).unwrap();
        this.logger.info(`post_object resp = ${JSON.stringify(response_object.request_json)}`);
        return { err: common_1.ErrorCode.succ, log: "success", resp: JSON.parse(response_object.request_json).TransFileHandlerResp };
    }
}
exports.TransFileRequest = TransFileRequest;
