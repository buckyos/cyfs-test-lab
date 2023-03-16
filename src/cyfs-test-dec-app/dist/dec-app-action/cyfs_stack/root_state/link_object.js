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
exports.LinkObjectAction = void 0;
const action_1 = require("../../action");
const common_1 = require("../../../common");
const cyfs = __importStar(require("../../../cyfs"));
class LinkObjectAction extends action_1.BaseAction {
    static create_by_parent(action, logger) {
        let run = new LinkObjectAction({
            local: action.local,
            remote: action.remote,
            input: action.input,
            parent_action: action.action_id,
            expect: { err: 0 },
        }, logger);
        return { err: common_1.ErrorCode.succ, action: run };
    }
    static create_by_parent_for_remote(action, logger) {
        let run = new LinkObjectAction({
            local: action.remote,
            remote: action.remote,
            input: action.input,
            parent_action: action.action_id,
            expect: { err: 0 },
        }, logger);
        return { err: common_1.ErrorCode.succ, action: run };
    }
    async start(req) {
        this.action.type = "ObjectLinkReqPathAction";
        this.action.action_id = `ObjectLinkReqPathAction-${Date.now()}`;
        return await super.start(req);
    }
    async run(req) {
        // 获取连接池中的cyfs stack
        let local = this.local;
        this.logger.info(`local : ${local.local_device_id().object_id.to_base_58()}`);
        // 将对象挂载
        let op_env = (await local.root_state_stub(local.local_device_id().object_id, local.dec_id).create_path_op_env()).unwrap();
        let lock_await = await op_env.lock([req.req_path], cyfs.JSBI.BigInt(5000));
        if (lock_await.err) {
            return { err: lock_await.val.code, log: lock_await.val.msg };
        }
        let modify_path = await op_env.insert_with_path(req.req_path, req.object_id);
        this.logger.info(`${local.local_device_id().object_id.to_base_58()} op_env.insert_with_path ${JSON.stringify(req)},result = ${JSON.stringify(modify_path)} `);
        let commit_result = await op_env.commit();
        this.logger.info(`root state link path ,root_path =${req.req_path} ,object = ${req.object_id} result= ${JSON.stringify(commit_result)}`);
        // 修改对象权限
        let modify_access = await local.root_state_meta_stub(local.local_device_id().object_id, local.dec_id).add_access(cyfs.GlobalStatePathAccessItem.new(req.req_path, req.access));
        if (modify_access.err) {
            this.logger.error(`${req.req_path} root_state_meta_stub add_access error ,will retry`);
            modify_access = await local.root_state_meta_stub(local.local_device_id().object_id, local.dec_id).add_access(cyfs.GlobalStatePathAccessItem.new(req.req_path, req.access));
        }
        this.logger.info(`${req.req_path} root_state_meta_stub add_access result = ${JSON.stringify(modify_access)}`);
        if (modify_access.err) {
        }
        this.logger.info(`get_object_by_path inner_path: ${req.req_path}`);
        let check_result = await local.root_state_accessor().get_object_by_path({
            common: {
                // 来源DEC
                dec_id: local.dec_id,
                // 目标设备
                target: local.local_device_id().object_id,
                flags: 1
            },
            inner_path: req.req_path,
        });
        this.logger.info(`get_object_by_path result: ${JSON.stringify(check_result)}`);
        if (check_result.err) {
            this.logger.error(`${local.local_device_id().object_id.to_base_58()} get req_path ${req.req_path}  result =  ${JSON.stringify(check_result)}`);
            let get_noc = await this.local.non_service().get_object({
                common: {
                    dec_id: local.dec_id,
                    flags: 1,
                    level: cyfs.NONAPILevel.NOC,
                },
                object_id: req.object_id
            });
            this.logger.error(`get object by noc ,result = ${JSON.stringify(get_noc)}`);
            return { err: common_1.ErrorCode.fail, log: `${JSON.stringify(check_result)}` };
        }
        else {
            this.logger.info(`${local.local_device_id().object_id.to_base_58()} get req_path ${req.req_path}  object =  ${check_result.unwrap().object.object.object_id.to_base_58()}`);
            return { err: common_1.ErrorCode.succ, log: "success" };
        }
    }
}
exports.LinkObjectAction = LinkObjectAction;
