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
exports.RegisterCommonHandler = void 0;
const action_1 = require("../../action");
const common_1 = require("../../../common");
const cyfs = __importStar(require("../../../cyfs"));
const dec_app_service_1 = require("../../../dec-app-service");
/**
 * 协议栈注册handler监听器
 *
 */
class RegisterCommonHandler extends action_1.BaseAction {
    static create_by_parent(action, logger) {
        let run = new RegisterCommonHandler({
            local: action.remote,
            input: action.input,
            parent_action: action.action_id,
            expect: { err: 0 },
        }, logger);
        return { err: common_1.ErrorCode.succ, action: run };
    }
    async start(req) {
        this.action.type = "RegisterCommonHandler";
        this.action.action_id = `RegisterCommonHandler-${Date.now()}`;
        return await super.start(req);
    }
    async run(req) {
        // 获取连接池中的cyfs stack
        let local = this.local;
        //  修改 GlobalStatePath 权限
        let req_path = new cyfs.RequestGlobalStatePath(local.dec_id, req.req_path).toString();
        let test_access_global = await local.root_state_meta_stub(local.local_device_id().object_id, local.dec_id).add_access(cyfs.GlobalStatePathAccessItem.new(req_path, cyfs.AccessString.full()));
        let test_gloab_req = await local.root_state_meta_stub(local.local_device_id().object_id, local.dec_id).add_access(cyfs.GlobalStatePathAccessItem.new(req.req_path, cyfs.AccessString.full()));
        //local.root_state_meta_stub().add_object_meta()
        let result = await local.router_handlers().add_post_object_handler(cyfs.RouterHandlerChain.Handler, this.action.action_id, 0, undefined, req_path, cyfs.RouterHandlerAction.Default, new dec_app_service_1.CommonPostObjectHandler(this.local, this.action.local, this.logger));
        if (result.err) {
            return { err: result.val.code, log: result.val.msg };
        }
        return { err: common_1.ErrorCode.succ, log: "success" };
    }
}
exports.RegisterCommonHandler = RegisterCommonHandler;
