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
exports.PutObjectAction = void 0;
const action_1 = require("../../action");
const common_1 = require("../../../common");
const cyfs = __importStar(require("../../../cyfs"));
class PutObjectAction extends action_1.BaseAction {
    static async create_random_text_object(peer, logger) {
        let action = new PutObjectAction({
            local: peer,
            remote: peer,
            input: {
                timeout: 30 * 1000,
                non_level: cyfs.NONAPILevel.NOC
            },
            expect: { err: 0 },
        }, logger);
        let test_object = cyfs.TextObject.create(cyfs.ObjectId.default(), common_1.RandomGenerator.string(100), common_1.RandomGenerator.string(100), common_1.RandomGenerator.string(100));
        let object_raw = test_object.to_vec().unwrap();
        let create_result = await action.start({ object_raw });
        return test_object;
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
        let put_result = await stack.non_service().put_object({
            common: {
                level: this.action.input.non_level,
                target: this.action.remote.device_id,
                flags: 0,
            },
            object: cyfs.NONObjectInfo.new_from_object_raw(req.object_raw).unwrap()
        });
        let opt_time = Date.now() - begin_send;
        if (put_result.err) {
            return { err: put_result.val.code, log: put_result.val.msg };
        }
        this.logger.info(`put object result = ${put_result.unwrap()}`);
        return { err: common_1.ErrorCode.succ, log: "success", resp: { opt_time } };
    }
}
exports.PutObjectAction = PutObjectAction;
