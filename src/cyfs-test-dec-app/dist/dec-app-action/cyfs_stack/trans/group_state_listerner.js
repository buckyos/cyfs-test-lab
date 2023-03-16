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
exports.GroupStateListerner = void 0;
const action_1 = require("../../action");
const common_1 = require("../../../common");
const cyfs = __importStar(require("../../../cyfs"));
/**
 * 监听group 传输状态
 * group 连续10个检查周期没有速度，退出监听
 *
 */
class GroupStateListerner extends action_1.BaseAction {
    static create_by_parent(action, logger) {
        /**
         * 父任务下载端 remote 查询任务状态
         */
        let run = new GroupStateListerner({
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
        this.action.type = "GroupStateListerner";
        this.action.action_id = `GroupStateListerner-${Date.now()}`;
        return await super.start(req);
    }
    async run(req) {
        let local = this.local;
        let record_list = [];
        let cur_speed_zero_count = 0;
        while (true) {
            let speed_when = cyfs.bucky_time_now();
            let info_check = await local.trans().get_task_group_state({
                common: {
                    // api级别
                    level: cyfs.NDNAPILevel.NDN,
                    flags: 1,
                },
                group: req.group,
            });
            this.logger.info(`get_task_group_state : ${JSON.stringify(info_check)}`);
            if (info_check.err) {
                return { err: info_check.val.code, log: info_check.val.msg };
            }
            else {
                record_list.push({
                    group: req.group,
                    speed_when,
                    control_state: info_check.unwrap().control_state,
                    cur_speed: info_check.unwrap().cur_speed,
                    speed: info_check.unwrap().speed,
                    history_speed: info_check.unwrap().history_speed,
                    state: info_check.unwrap().state,
                });
            }
            // 如果group 状态不是normal 退出
            if (info_check.unwrap().control_state != cyfs.DownloadTaskControlState.Normal) {
                break;
            }
            // 如果下载状态 Err 也退出
            if (info_check.unwrap().state.Error) {
                break;
            }
            // 检查当前速度
            if (info_check.unwrap().cur_speed == 0 || info_check.unwrap().speed == 0) {
                cur_speed_zero_count = cur_speed_zero_count + 1;
            }
            else {
                cur_speed_zero_count = 0;
            }
            if (cur_speed_zero_count > 10) {
                break;
            }
            await common_1.sleep(1000);
        }
        return { err: common_1.ErrorCode.succ, log: `run finished`, resp: record_list };
    }
}
exports.GroupStateListerner = GroupStateListerner;
