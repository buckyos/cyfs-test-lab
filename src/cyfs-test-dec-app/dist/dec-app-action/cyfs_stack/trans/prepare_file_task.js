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
exports.PrepareFileTask = void 0;
const action_1 = require("../../action");
const common_1 = require("../../../common");
const cyfs = __importStar(require("../../../cyfs"));
const publish_file_1 = require("./publish_file");
const root_state_1 = require("../root_state");
const handler_1 = require("../handler");
class PrepareFileTask extends action_1.BaseAction {
    static create_by_parent(action, logger) {
        let run = new PrepareFileTask({
            local: action.local,
            remote: action.remote,
            input: action.input,
            parent_action: action.action_id,
            expect: { err: 0 },
        }, logger);
        return { err: common_1.ErrorCode.succ, action: run };
    }
    async start(req) {
        this.action.type = "PrepareFileTask";
        this.action.action_id = `PrepareFileTask-${Date.now()}`;
        return await super.start(req);
    }
    async run(req) {
        let local = this.local;
        // 发布文件子任务
        let publish_begin = Date.now();
        let info1 = await publish_file_1.PublishFileAction.create_by_parent(this.action, this.logger).action.start({
            rand_file: true,
            file_size: this.action.input.file_size,
            chunk_size: this.action.input.chunk_size,
            req_path: req.req_path,
            level: this.action.input.ndn_level,
            flags: 1,
        });
        this.action.output.publish_time = Date.now() - publish_begin;
        if (info1.err) {
            return { err: info1.err, log: info1.log };
        }
        let file_id = info1.resp.file_id;
        // 将文件对象挂载在root_state
        let link_file = await root_state_1.LinkObjectAction.create_by_parent(this.action, this.logger).action.start({
            object_id: file_id,
            req_path: req.req_path,
            access: cyfs.AccessString.full()
        });
        if (link_file.err) {
            return { err: link_file.err, log: link_file.log };
        }
        // Post object 通知remote 下载文件
        if (!req.deviceid_list) {
            req.deviceid_list = [local.local_device_id().object_id];
        }
        if (!req.chunk_codec_desc) {
            req.chunk_codec_desc = { stream: [0, 0, 0] };
        }
        let result = await handler_1.PrepareTransFileRequest.create_by_parent(this.action, this.logger).action.start({
            req_path: req.req_path,
            target: local.local_device_id().to_base_58(),
            context_path: req.context_path,
            group: req.group,
            file_id: file_id.to_base_58(),
            file_name: info1.resp.file_name,
            auto_start: req.auto_start,
            not_set_context: req.not_set_context,
            action: req.action,
            action_wait: req.action_wait,
            chunk_codec_desc: req.chunk_codec_desc,
            deviceid_list: req.deviceid_list,
        });
        return {
            err: result.err,
            log: result.log,
            resp: result.resp,
            file_info: {
                file_id: file_id.to_base_58(),
                file_name: info1.resp.file_name,
            }
        };
    }
}
exports.PrepareFileTask = PrepareFileTask;
