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
exports.ControlTaskGroup = void 0;
const action_1 = require("../../action");
const common_1 = require("../../../common");
const cyfs = __importStar(require("../../../cyfs"));
class ControlTaskGroup extends action_1.BaseAction {
    static create_by_parent(action, logger) {
        /**
         * 父任务下载端 remote 查询任务状态
         */
        let run = new ControlTaskGroup({
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
        this.action.type = "ControlTaskGroup";
        this.action.action_id = `ControlTaskGroup-${Date.now()}`;
        return await super.start(req);
    }
    async run(req) {
        let local = this.local;
        let info_check = await local.trans().control_task_group({
            common: {
                // api级别
                level: cyfs.NDNAPILevel.NDN,
                flags: 1,
            },
            group: req.group,
            action: req.action
        });
        this.logger.info(`control_task_group : ${JSON.stringify(info_check)}`);
        if (info_check.err) {
            return { err: info_check.val.code, log: info_check.val.msg };
        }
        else {
            return { err: common_1.ErrorCode.succ, log: "run success", resp: info_check.unwrap() };
        }
    }
}
exports.ControlTaskGroup = ControlTaskGroup;
