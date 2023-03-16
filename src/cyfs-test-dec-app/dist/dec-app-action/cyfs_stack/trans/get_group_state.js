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
exports.GetTransGroupState = void 0;
const action_1 = require("../../action");
const common_1 = require("../../../common");
const cyfs = __importStar(require("../../../cyfs"));
class GetTransGroupState extends action_1.BaseAction {
    static create_by_parent(action, logger) {
        /**
         * 父任务下载端 remote 查询任务状态
         */
        let run = new GetTransGroupState({
            local: action.remote,
            remote: action.remote,
            input: {
                timeout: action.input.timeout,
            },
            parent_action: action.action_id,
            expect: { err: 0 },
        }, logger);
        return { err: common_1.ErrorCode.succ, action: run };
    }
    async start(req) {
        this.action.type = "GetTransGroupState";
        this.action.action_id = `GetTransGroupState-${Date.now()}`;
        return await super.start(req);
    }
    async run(req) {
        let local = this.local;
        let info_check = await local.trans().get_task_group_state({
            common: {
                // api级别
                level: cyfs.NDNAPILevel.NDN,
                flags: 1,
            },
            group: req.group,
            speed_when: req.speed_when
        });
        this.logger.info(`get_task_group_state : ${JSON.stringify(info_check)}`);
        if (info_check.err) {
            return { err: info_check.val.code, log: info_check.val.msg };
        }
        else {
            return { err: common_1.ErrorCode.succ, log: "run success", resp: {
                    control_state: info_check.unwrap().control_state,
                    cur_speed: info_check.unwrap().cur_speed,
                    history_speed: info_check.unwrap().history_speed,
                    state: info_check.unwrap().state,
                } };
        }
    }
}
exports.GetTransGroupState = GetTransGroupState;
