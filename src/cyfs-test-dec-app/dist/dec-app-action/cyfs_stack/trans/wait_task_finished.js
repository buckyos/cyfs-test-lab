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
exports.WaitTaskFinished = void 0;
const action_1 = require("../../action");
const common_1 = require("../../../common");
const cyfs = __importStar(require("../../../cyfs"));
class WaitTaskFinished extends action_1.BaseAction {
    static create_by_parent(action, logger) {
        /**
         * 父任务下载端 remote 查询任务状态
         */
        let run = new WaitTaskFinished({
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
        this.action.type = "WaitTaskFinished";
        this.action.action_id = `WaitTaskFinished-${Date.now()}`;
        return await super.start(req);
    }
    async run(req) {
        var _a;
        let local = this.local;
        if (!req.check_time) {
            req.check_time = 30;
        }
        let history_percent = 0;
        let check_percent = 0;
        while (req.check_time > 0) {
            let info_check = await local.trans().get_task_state({
                common: {
                    // api级别
                    level: cyfs.NDNAPILevel.NDN,
                    flags: 1,
                },
                task_id: req.task_id,
            });
            this.logger.info(`get_task_state : ${JSON.stringify(info_check)}`);
            if (info_check.unwrap().state.state == cyfs.TransTaskState.Pending || info_check.unwrap().state.state == cyfs.TransTaskState.Downloading) {
                let percent = (_a = info_check.unwrap().state.on_air_state) === null || _a === void 0 ? void 0 : _a.download_percent;
                this.logger.info(`${req.task_id} downloading percent = ${percent}`);
                if (percent) {
                    if (percent == history_percent) {
                        check_percent = check_percent + 1;
                    }
                    else {
                        history_percent = percent;
                    }
                }
                if (check_percent > 30) {
                    return { err: common_1.ErrorCode.timeout, log: `check task ${req.task_id},percent = ${percent},not update` };
                }
                await common_1.sleep(1000);
            }
            else {
                if (info_check.unwrap().state.state == cyfs.TransTaskState.Finished) {
                    return { err: common_1.ErrorCode.succ, log: "run success", resp: info_check.unwrap() };
                }
                else {
                    return { err: common_1.ErrorCode.fail, log: `error state ${JSON.stringify(info_check.unwrap().state.state)}`, resp: info_check.unwrap() };
                }
            }
            req.check_time = req.check_time - 1;
        }
        ;
        return { err: common_1.ErrorCode.timeout, log: `check task ${req.task_id} not finished` };
    }
}
exports.WaitTaskFinished = WaitTaskFinished;
