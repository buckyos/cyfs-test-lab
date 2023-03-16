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
exports.PutContextAction = void 0;
const action_1 = require("../../action");
const common_1 = require("../../../common");
const cyfs = __importStar(require("../../../cyfs"));
class PutContextAction extends action_1.BaseAction {
    static create_by_parent(action, logger) {
        let run = new PutContextAction({
            local: action.local,
            remote: action.local,
            input: JSON.parse(JSON.stringify(action.input)),
            parent_action: action.action_id,
            expect: { err: 0 },
        }, logger);
        return { err: common_1.ErrorCode.succ, action: run };
    }
    static create_by_parent_for_remote(action, logger) {
        let run = new PutContextAction({
            local: action.remote,
            remote: action.remote,
            input: JSON.parse(JSON.stringify(action.input)),
            parent_action: action.action_id,
            expect: { err: 0 },
        }, logger);
        return { err: common_1.ErrorCode.succ, action: run };
    }
    static async put_noc_random_context(req, local, logger) {
        let action = new PutContextAction({
            local: local,
            remote: local,
            input: {
                timeout: 30 * 1000,
                ndn_level: cyfs.NDNAPILevel.NDC
            },
            expect: { err: 0 },
        }, logger);
        let put_local = await action.start(req);
        return { err: put_local.err, log: put_local.log, action, context: put_local.resp.context };
    }
    async start(req) {
        this.action.type = "PutContextLocalAction";
        this.action.action_id = `PutContextLocalAction-${Date.now()}`;
        return await super.start(req);
    }
    async run(req) {
        // 获取连接池中的cyfs stack
        let local = this.local;
        // 推送context
        let begin_time = Date.now();
        let context = cyfs.TransContext.new(local.dec_id, req.context_path);
        this.logger.info(`create context ${context.desc().calculate_id().to_base_58()}`);
        for (let device of req.deviceid_list) {
            context.body_expect().content().device_list.push(new cyfs.TransContextDevice(device, req.chunk_codec_desc));
        }
        this.logger.info(`${JSON.stringify(context.device_list())}`);
        let info_context = await local.trans().put_context({
            common: {
                level: this.action.input.ndn_level,
                flags: 1,
            },
            context: context,
            access: cyfs.AccessString.full()
        });
        this.logger.info(`put_context err =  ${JSON.stringify(info_context.err)}`);
        this.action.output = {
            total_time: Date.now() - begin_time
        };
        if (info_context.err) {
            return { err: common_1.ErrorCode.fail, log: `put_context fail `, resp: { context } };
        }
        return { err: common_1.ErrorCode.succ, log: "success", resp: { context } };
    }
}
exports.PutContextAction = PutContextAction;
