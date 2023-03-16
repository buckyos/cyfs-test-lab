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
exports.AddAccess = void 0;
const action_1 = require("../../action");
const common_1 = require("../../../common");
const cyfs = __importStar(require("../../../cyfs"));
class AddAccess extends action_1.BaseAction {
    static create_by_parent(action, logger) {
        let run = new AddAccess({
            local: action.local,
            remote: action.remote,
            input: action.input,
            parent_action: action.action_id,
            expect: { err: 0 },
        }, logger);
        return { err: common_1.ErrorCode.succ, action: run };
    }
    async start(req) {
        this.action.type = "AddAccess";
        this.action.action_id = `AddAccess-${Date.now()}`;
        return await super.start(req);
    }
    async run(req) {
        // 获取连接池中的cyfs stack
        let local = this.local;
        // 修改对象权限
        let test = await local.root_state_meta_stub(local.local_device_id().object_id, local.dec_id).add_access(cyfs.GlobalStatePathAccessItem.new(req.req_path, req.access));
        this.logger.info(`${req.req_path} root_state_meta_stub add_access result = ${test}`);
        if (test.err) {
            return { err: common_1.ErrorCode.fail, log: `${JSON.stringify(test)}` };
        }
        else {
            return { err: common_1.ErrorCode.succ, log: "success" };
        }
    }
}
exports.AddAccess = AddAccess;
