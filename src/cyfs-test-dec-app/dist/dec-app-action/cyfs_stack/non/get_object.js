"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetObjectAction = void 0;
const action_1 = require("../../action");
const common_1 = require("../../../common");
class GetObjectAction extends action_1.BaseAction {
    static create_by_parent(action, logger) {
        let run = new GetObjectAction({
            local: action.local,
            remote: action.remote,
            input: action.input,
            parent_action: action.action_id,
            expect: { err: 0 },
        }, logger);
        return { err: common_1.ErrorCode.succ, action: run };
    }
    static create_by_parent_local_noc(action, logger) {
        let run = new GetObjectAction({
            local: action.local,
            remote: action.local,
            input: action.input,
            parent_action: action.action_id,
            expect: { err: 0 },
        }, logger);
        return { err: common_1.ErrorCode.succ, action: run };
    }
    static create_by_parent_remote_noc(action, logger) {
        let run = new GetObjectAction({
            local: action.remote,
            remote: action.remote,
            input: action.input,
            parent_action: action.action_id,
            expect: { err: 0 },
        }, logger);
        return { err: common_1.ErrorCode.succ, action: run };
    }
    async start(req) {
        this.action.type = "GetObjectAction";
        this.action.action_id = `GetObjectAction-${Date.now()}`;
        return await super.start(req);
    }
    async run(req) {
        // 获取连接池中的cyfs stack
        let stack = this.local;
        let begin_send = Date.now();
        let get_result = await stack.non_service().get_object({
            common: {
                level: this.action.input.non_level,
                target: this.action.remote.device_id,
                flags: 0,
            },
            object_id: req.object_id,
        });
        let opt_time = Date.now() - begin_send;
        if (get_result.err) {
            return { err: get_result.val.code, log: get_result.val.msg };
        }
        let object_raw = get_result.unwrap().object.object_raw;
        return { err: common_1.ErrorCode.succ, log: "success", resp: { opt_time, object_raw } };
    }
}
exports.GetObjectAction = GetObjectAction;
