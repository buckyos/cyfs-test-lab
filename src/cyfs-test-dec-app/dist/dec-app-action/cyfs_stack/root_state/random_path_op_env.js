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
exports.RandomPathOpEnv = void 0;
const action_1 = require("../../action");
const common_1 = require("../../../common");
const cyfs = __importStar(require("../../../cyfs"));
const put_object_1 = require("../non/put_object");
class RandomPathOpEnv extends action_1.BaseAction {
    static async rand_one(peer, req) {
        return await new RandomPathOpEnv({
            local: peer,
            input: {
                timeout: 30 * 1000,
                non_level: cyfs.NONAPILevel.NOC
            },
            expect: { err: 0 },
        }).start(req);
    }
    static create_by_parent(action) {
        let action_class = new RandomPathOpEnv({
            local: action.local,
            input: action.input,
            parent_action: action.action_id,
            expect: { err: 0 },
        });
        return { err: common_1.ErrorCode.succ, action: action_class };
    }
    async start(req) {
        this.action.type = "RandomPathOpEnv";
        this.action.action_id = `RandomPathOpEnv-${Date.now()}`;
        return await super.start(req);
    }
    async run(req) {
        return new Promise(async (resolve, reject) => {
            // 获取连接池中的cyfs stack
            let stack = this.local;
            let op_env = (await stack.root_state_stub().create_path_op_env()).mapErr(err => {
                return reject({ err: err.code, log: err.msg });
            }).unwrap();
            let create_result = (await op_env.create_new(req.path, req.key, req.content_type)).mapErr(err => {
                return reject({ err: err.code, log: err.msg });
            }).unwrap();
            let root_path = `/${common_1.RandomGenerator.string(10)}`;
            let test1_object = await put_object_1.PutObjectAction.create_random_text_object(this.action.local, this.logger);
            let random_key_path = `${root_path}/${test1_object.desc().object_id().to_base_58()}`;
            let insert_ket = await op_env.insert_with_key(root_path, test1_object.calculate_id().to_base_58(), test1_object.calculate_id());
            let check = (await op_env.get_by_key(root_path, test1_object.calculate_id().to_base_58())).mapErr(err => {
                return reject({ err: err.code, log: err.msg });
            }).unwrap();
            this.logger.info(`get_by_key success: ${check}`);
            let commit = (await op_env.commit()).mapErr(err => {
                return reject({ err: err.code, log: err.msg });
            }).unwrap();
            this.logger.info(`dec_root = ${commit.dec_root}`);
            this.logger.info(`root = ${commit.root}`);
            this.logger.info(`revision = ${commit.revision}`);
            resolve({
                err: common_1.ErrorCode.succ, log: "success", resp: {
                    root_path,
                    random_key_path,
                    dec_root: commit.dec_root,
                    root: commit.root,
                    revision: commit.revision,
                }
            });
        });
    }
}
exports.RandomPathOpEnv = RandomPathOpEnv;
