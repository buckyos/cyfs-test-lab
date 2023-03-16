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
exports.BuildDirFromObjectMapAction = void 0;
const action_1 = require("../../action");
const common_1 = require("../../../common");
const cyfs = __importStar(require("../../../cyfs"));
class BuildDirFromObjectMapAction extends action_1.BaseAction {
    static create_by_parent(action, logger) {
        let run = new BuildDirFromObjectMapAction({
            local: action.local,
            remote: action.remote,
            input: action.input,
            parent_action: action.action_id,
            expect: { err: 0 },
        }, logger);
        return { err: common_1.ErrorCode.succ, action: run };
    }
    static create_by_parent_remote_noc(action, logger) {
        let run = new BuildDirFromObjectMapAction({
            local: action.remote,
            remote: action.remote,
            input: action.input,
            parent_action: action.action_id,
            expect: { err: 0 },
        }, logger);
        return { err: common_1.ErrorCode.succ, action: run };
    }
    async start(req) {
        this.action.type = "BuildDirFromObjectMapAction";
        this.action.action_id = `BuildDirFromObjectMapAction-${Date.now()}`;
        return await super.start(req);
    }
    async run(req) {
        // 获取连接池中的cyfs stack
        let stack = this.local;
        let begin_send = Date.now();
        let get_result = await stack.util().build_dir_from_object_map({
            common: {
                target: this.action.remote.device_id,
                flags: 1,
            },
            object_map_id: req.object_id,
            dir_type: cyfs.BuildDirType.Zip,
        });
        let opt_time = Date.now() - begin_send;
        if (get_result.err) {
            return { err: get_result.val.code, log: get_result.val.msg };
        }
        let object_id = get_result.unwrap().object_id;
        return { err: common_1.ErrorCode.succ, log: "success", resp: { opt_time, object_id } };
    }
}
exports.BuildDirFromObjectMapAction = BuildDirFromObjectMapAction;
