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
exports.ShareFileAddAccessHandler = void 0;
const cyfs = __importStar(require("../../cyfs"));
const base_handler_1 = require("./base_handler");
const dec_app_base_1 = require("../../dec-app-base");
/**
 * 操作描述：
 * handler：remote 监听文件传输行为（ 参数group 设置传输组,get_object 获取file 对象，post_object 获取context对象，trans 创建传输任务，完成下载流程）
 */
class ShareFileAddAccessHandler extends base_handler_1.BaseHandler {
    async start(req) {
        // 封装一些操作
        this.handler_info.type = "ShareFileAddAccessHandler";
        return await super.start(req);
    }
    async run(req) {
        // 默认没有操作返回报错
        if (!req.ShareFileAddAccessHandlerReq) {
            return dec_app_base_1.InvalidParamError;
        }
        let request_info = req.ShareFileAddAccessHandlerReq;
        // 将对象挂载
        let op_env = (await this.stack.root_state_stub(this.stack.local_device_id().object_id, this.stack.dec_id).create_path_op_env()).unwrap();
        let modify_path = await op_env.insert_with_path(request_info.req_path, cyfs.ObjectId.from_base_58(request_info.file_id).unwrap());
        this.logger.info(`${this.stack.local_device_id().object_id.to_base_58()} op_env.insert_with_path ${JSON.stringify(req)},result = ${JSON.stringify(modify_path)} `);
        let commit_result = await op_env.commit();
        // 修改对象权限
        let test = await this.stack.root_state_meta_stub(this.stack.local_device_id().object_id, this.stack.dec_id).add_access(cyfs.GlobalStatePathAccessItem.new(request_info.req_path, cyfs.AccessString.full()));
        this.logger.info(`${request_info.req_path} root_state_meta_stub add_access result = ${test}`);
        // 检查是否关联成功
        let check_result = await this.stack.root_state_accessor().get_object_by_path({
            common: {
                // 来源DEC
                dec_id: this.stack.dec_id,
                // 目标设备
                target: this.stack.local_device_id().object_id,
                flags: 1
            },
            inner_path: request_info.req_path,
        });
        if (check_result.err) {
            this.logger.error(`${this.stack.local_device_id().object_id.to_base_58()} get req_path ${request_info.req_path}  result =  ${JSON.stringify(check_result)}`);
            return {
                ShareFileAddAccessHandlerResp: { result: check_result.val.code, msg: check_result.val.msg }
            };
        }
        return {
            ShareFileAddAccessHandlerResp: {
                result: 0,
                msg: "success",
            }
        };
    }
}
exports.ShareFileAddAccessHandler = ShareFileAddAccessHandler;
