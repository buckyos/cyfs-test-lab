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
exports.DeleteDataAction = void 0;
const action_1 = require("../../action");
const common_1 = require("../../../common");
const cyfs = __importStar(require("../../../cyfs"));
const get_data_1 = require("./get_data");
class DeleteDataAction extends action_1.BaseAction {
    static create_by_parent(action, logger) {
        let run = new DeleteDataAction({
            local: action.local,
            remote: action.remote,
            input: action.input,
            parent_action: action.action_id,
            expect: { err: 0 },
        }, logger);
        return { err: common_1.ErrorCode.succ, action: run };
    }
    async start(req) {
        this.action.type = "DeleteDataAction";
        this.action.action_id = `DeleteDataAction-${Date.now()}`;
        return await super.start(req);
    }
    async run(req) {
        // 获取连接池中的cyfs stack
        let stack = this.local;
        // get_data 失败
        let get_data = await get_data_1.GetDataAction.create_by_parent(this.action, this.logger).action.start(req);
        if (get_data.err) {
            return { err: get_data.err, log: get_data.log };
        }
        let object_id = get_data.resp.object_id;
        let inner_path = get_data.resp.inner_path;
        // delete_data
        let begin_send = Date.now();
        let put_result = await stack.ndn_service().delete_data({
            common: {
                level: cyfs.NDNAPILevel.NDC,
                flags: 1,
            },
            object_id,
            //range: req.range,
            inner_path,
        });
        let opt_time = Date.now() - begin_send;
        if (put_result.err) {
            return { err: put_result.val.code, log: put_result.val.msg };
        }
        return { err: common_1.ErrorCode.succ, log: "success", resp: { opt_time, object_id } };
    }
}
exports.DeleteDataAction = DeleteDataAction;
