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
exports.GetDataAction = void 0;
const action_1 = require("../../action");
const common_1 = require("../../../common");
const cyfs = __importStar(require("../../../cyfs"));
const cyfs_driver_client_1 = require("../../../cyfs-driver-client");
const put_data_1 = require("./put_data");
const link_object_1 = require("../root_state/link_object");
const trans_1 = require("../trans");
const non_1 = require("../non");
class GetDataAction extends action_1.BaseAction {
    static create_by_parent(action, logger) {
        let run = new GetDataAction({
            local: action.local,
            remote: action.remote,
            input: action.input,
            parent_action: action.action_id,
            expect: { err: 0 },
        }, logger);
        return { err: common_1.ErrorCode.succ, action: run };
    }
    async start(req) {
        this.action.type = "GetDataAction";
        this.action.action_id = `GetDataAction-${Date.now()}`;
        return await super.start(req);
    }
    async run(req) {
        var _a;
        // 获取连接池中的cyfs stack
        let stack = this.local;
        // remote 设备put_data 准备测试数据
        let object_id;
        let md5_source = "";
        let dir_inner_path;
        if (req.object_type == "chunk") {
            let put_result = await put_data_1.PutDataAction.create_by_parent(this.action, this.logger).action.start({
                object_type: req.object_type,
                chunk_size: req.chunk_size,
                file_size: req.file_size,
            });
            if (put_result.err) {
                return { err: put_result.err, log: put_result.log };
            }
            object_id = put_result.resp.object_id;
            md5_source = put_result.resp.md5;
        }
        else if (req.object_type == "file") {
            this.action.input.chunk_size = req.chunk_size;
            this.action.input.file_size = req.file_size;
            let put_result = await trans_1.PublishFileAction.create_by_parent_for_remote(this.action, this.logger).action.start({
                rand_file: true,
                file_size: req.file_size,
                chunk_size: req.chunk_size,
                req_path: req.req_path,
                level: this.action.input.ndn_level,
                flags: 1,
            });
            if (put_result.err) {
                return { err: put_result.err, log: put_result.log };
            }
            object_id = put_result.resp.file_id;
            md5_source = put_result.resp.md5;
        }
        else if (req.object_type == "dir") {
            this.action.input.chunk_size = req.chunk_size;
            this.action.input.file_size = req.file_size;
            let put_result = await trans_1.PublishDirAction.create_by_parent_for_remote(this.action, this.logger).action.start({
                rand_file: true,
                file_num: 2,
                file_size: req.file_size,
                chunk_size: req.chunk_size,
                req_path: req.req_path,
                level: this.action.input.ndn_level,
                flags: 1,
            });
            if (put_result.err) {
                return { err: put_result.err, log: put_result.log };
            }
            let object_map_id = put_result.resp.dir_id;
            md5_source = "dir";
            let dir_get = await non_1.BuildDirFromObjectMapAction.create_by_parent_remote_noc(this.action, this.logger).action.start({
                object_id: object_map_id
            });
            let dir_id = dir_get.resp.object_id;
            object_id = dir_id;
            let dir_object_get = await non_1.GetObjectAction.create_by_parent_remote_noc(this.action, this.logger).action.start({
                object_id: dir_id,
            });
            let dir_object = new cyfs.DirDecoder().from_raw(dir_object_get.resp.object_raw).unwrap();
            dir_object.desc().content().obj_list().match({
                Chunk: (chunk_id) => {
                    this.logger.error(`obj_list in chunk not support yet! ${chunk_id}`);
                },
                ObjList: (obj_list) => {
                    for (const [inner_path, info] of obj_list.object_map().entries()) {
                        if (info.node().is_object_id()) {
                            this.logger.info(`Dir inner_path =  ${inner_path} object_id =  ${info.node().object_id}`);
                            dir_inner_path = inner_path.toString();
                            //break;
                        }
                    }
                }
            });
        }
        else if (req.object_type == "object_id") {
            object_id = req.object_id;
            md5_source = req.md5;
        }
        let stack_manager = cyfs_driver_client_1.StackManager.createInstance();
        let local_tool = stack_manager.driver.get_client(this.action.local.peer_name).client.get_util_tool();
        // remote 将 put_data 的object 关联到root_state req_path
        if (req.is_link_root_state) {
            let link_action = await link_object_1.LinkObjectAction.create_by_parent_for_remote(this.action, this.logger).action.start({
                object_id: object_id,
                req_path: req.req_path,
                access: cyfs.AccessString.full()
            });
        }
        // local 创建context 对象
        if (!req.not_set_context) {
            if (req.context) {
                let context_action = await trans_1.PutContextAction.create_by_parent(this.action, this.logger).action.start({
                    context_path: req.context,
                    chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                    deviceid_list: [this.get_remote().local_device_id()]
                });
                if (context_action.err) {
                    return { err: context_action.err, log: context_action.log };
                }
            }
        }
        let begin_send = Date.now();
        let target;
        if (!req.context && !req.not_set_context) {
            target = (_a = this.action.remote) === null || _a === void 0 ? void 0 : _a.device_id;
        }
        let get_result = await stack.ndn_service().get_data({
            common: {
                level: this.action.input.ndn_level,
                req_path: req.req_path,
                flags: 1,
                target,
            },
            object_id: object_id,
            //range: req.range,
            context: req.context,
            group: req.group,
            inner_path: dir_inner_path
        });
        let send_time = Date.now() - begin_send;
        this.logger.info(`get_data send_time = ${send_time} result =  ${get_result.err}`);
        if (get_result.err) {
            this.logger.error(`get_data  result =  ${get_result}`);
            return { err: get_result.val.code, log: get_result.val.msg };
        }
        let result = get_result.unwrap();
        let md5 = await local_tool.md5_buffer(result.data);
        let hash = cyfs.HashValue.hash_data(result.data);
        if (md5 != md5_source && req.object_type != "dir") {
            return { err: common_1.ErrorCode.fail, log: `error data: ${md5} !=${md5_source}` };
        }
        return { err: common_1.ErrorCode.succ, log: "success", resp: { send_time, md5, object_id: object_id, inner_path: dir_inner_path, hash } };
    }
}
exports.GetDataAction = GetDataAction;
