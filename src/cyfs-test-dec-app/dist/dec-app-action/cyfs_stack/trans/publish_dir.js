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
exports.PublishDirAction = void 0;
const action_1 = require("../../action");
const common_1 = require("../../../common");
const cyfs = __importStar(require("../../../cyfs"));
const cyfs_driver_client_1 = require("../../../cyfs-driver-client");
class PublishDirAction extends action_1.BaseAction {
    static create_by_parent(action, logger) {
        let run = new PublishDirAction({
            local: action.local,
            remote: action.local,
            input: {
                timeout: action.input.timeout,
                chunk_size: action.input.chunk_size
            },
            parent_action: action.action_id,
            expect: { err: 0 },
        }, logger);
        return { err: common_1.ErrorCode.succ, action: run };
    }
    static create_by_parent_for_remote(action, logger) {
        let run = new PublishDirAction({
            local: action.remote,
            remote: action.remote,
            input: {
                timeout: action.input.timeout,
                chunk_size: action.input.chunk_size
            },
            parent_action: action.action_id,
            expect: { err: 0 },
        }, logger);
        return { err: common_1.ErrorCode.succ, action: run };
    }
    async start(req) {
        this.action.type = "PublishDirAction";
        this.action.action_id = `PublishDirAction-${Date.now()}`;
        return await super.start(req);
    }
    async run(req) {
        // 获取连接池中的cyfs stack
        let local = this.local;
        // 获取测试驱动中的工具类
        this.logger.info(`PublishDirAction : local : ${local.local_device_id().object_id.to_base_58()}`);
        // 如果没有文件，创建测试文件
        // let file_name:string|undefined;
        // let file_path :string;
        //let md5: string = ""
        let stack_manager = cyfs_driver_client_1.StackManager.createInstance();
        let file_source = this.local;
        // 获取测试驱动中的工具类
        let file_source_tool = stack_manager.driver.get_client(this.action.local.peer_name).client.get_util_tool();
        this.logger.info(`publish dir device : ${file_source.local_device_id().object_id.to_base_58()}`);
        // 创建测试文件
        let local_dir = await file_source_tool.create_dir(req.file_num, req.file_size);
        let dir_path = local_dir.dir_path;
        let dir_name = local_dir.dir_name;
        // 发布文件
        let begin_time = Date.now();
        let info1 = await local.trans().publish_file({
            common: {
                // api级别
                dec_id: local.dec_id,
                req_path: req.req_path,
                level: req.level,
                referer_object: req.referer_object,
                flags: req.flags,
            },
            owner: this.action.local.device_id,
            local_path: dir_path,
            chunk_size: req.chunk_size,
            access: cyfs.AccessString.full()
        });
        this.action.output.total_time = Date.now() - begin_time;
        if (info1.err) {
            this.logger.error(`publish_file error : ${JSON.stringify(info1)} `);
            return { err: info1.val.code, log: info1.val.msg };
        }
        else {
            this.logger.info(`publish_file : ${JSON.stringify(info1.unwrap())}`);
            return { err: common_1.ErrorCode.succ, log: "success", resp: { dir_id: info1.unwrap().file_id, dir_name, dir_path: dir_path, file_list: local_dir.file_list } };
        }
    }
}
exports.PublishDirAction = PublishDirAction;
