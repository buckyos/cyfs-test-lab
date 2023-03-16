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
exports.PutSharedDataAction = void 0;
const action_1 = require("../../action");
const common_1 = require("../../../common");
const cyfs = __importStar(require("../../../cyfs"));
const cyfs_driver_client_1 = require("../../../cyfs-driver-client");
class PutSharedDataAction extends action_1.BaseAction {
    static create_by_parent(action, logger) {
        let run = new PutSharedDataAction({
            local: action.remote,
            remote: action.remote,
            input: action.input,
            parent_action: action.action_id,
            expect: { err: 0 },
        }, logger);
        return { err: common_1.ErrorCode.succ, action: run };
    }
    async start(req) {
        this.action.type = "PutSharedDataAction";
        this.action.action_id = `PutSharedDataAction-${Date.now()}`;
        return await super.start(req);
    }
    async run(req) {
        // 获取连接池中的cyfs stack
        let stack = this.local;
        let stack_manager = cyfs_driver_client_1.StackManager.createInstance();
        let local_tool = stack_manager.driver.get_client(this.action.local.peer_name).client.get_util_tool();
        // 创建测试文件
        let data;
        let object_id;
        let length = 0;
        let md5 = "";
        if (req.object_type == "chunk") {
            let local_data = await local_tool.rand_cyfs_chunk_cache(req.chunk_size);
            data = local_data.chunk_data;
            object_id = local_data.chunk_id.calculate_id();
            length = req.chunk_size;
            md5 = await local_tool.md5_buffer(data);
            this.logger.info(`put_data chunk  = ${local_data.chunk_id} object_id = ${object_id}`);
        }
        else {
            return {
                err: common_1.ErrorCode.fail,
                log: "cyfs stack not support"
            };
        }
        this.logger.info(`random data success ${object_id.to_base_58()}`);
        let begin_send = Date.now();
        let put_result = await stack.ndn_service().put_shared_data({
            common: {
                level: cyfs.NDNAPILevel.NDC,
                flags: 1,
            },
            object_id,
            length,
            data,
        });
        let send_time = Date.now() - begin_send;
        this.logger.info(`put_data send_time = ${send_time} result =  ${put_result.err}`);
        if (put_result.err) {
            return { err: put_result.val.code, log: put_result.val.msg };
        }
        return { err: common_1.ErrorCode.succ, log: "success", resp: { md5, send_time, object_id } };
    }
}
exports.PutSharedDataAction = PutSharedDataAction;
