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
exports.IsolateEnvInsertWithKey = void 0;
const action_1 = require("../../action");
const common_1 = require("../../../common");
const cyfs = __importStar(require("../../../cyfs"));
class IsolateEnvInsertWithKey extends action_1.BaseAction {
    static async insert_key(peer, input) {
        return await new IsolateEnvInsertWithKey({
            local: peer,
            input: {
                timeout: 30 * 1000,
                non_level: cyfs.NONAPILevel.NOC
            },
            expect: { err: 0 },
        }).start(input);
    }
    static create_by_parent(action) {
        let action_class = new IsolateEnvInsertWithKey({
            local: action.local,
            input: action.input,
            parent_action: action.action_id,
            expect: { err: 0 },
        });
        return { err: common_1.ErrorCode.succ, action: action_class };
    }
    async start(req) {
        this.action.type = "IsolateEnvInsertWithKey";
        this.action.action_id = `IsolateEnvInsertWithKey-${Date.now()}`;
        return await super.start(req);
    }
    async run(req) {
        return new Promise(async (resolve, reject) => {
            // 获取连接池中的cyfs stack
            let stack = this.local;
            let op_env = (await stack.root_state_stub().create_isolate_path_op_env()).mapErr(err => {
                return reject({ err: err.code, log: err.msg });
            }).unwrap();
            let create_result = (await op_env.load(req.root_env)).mapErr(err => {
                return reject({ err: err.code, log: err.msg });
            }).unwrap();
            //req.key
            let insert_ket = await op_env.insert_with_key(req.root_path, req.key, req.value);
            let check = (await op_env.get_by_key(req.root_path, req.key)).mapErr(err => {
                return reject({ err: err.code, log: err.msg });
            }).unwrap();
            this.logger.info(`get_by_path success: ${check}`);
            let commit = (await op_env.commit()).mapErr(err => {
                return reject({ err: err.code, log: err.msg });
            }).unwrap();
            this.logger.info(`dec_root = ${commit.dec_root}`);
            this.logger.info(`root = ${commit.root}`);
            this.logger.info(`revision = ${commit.revision}`);
            resolve({
                err: common_1.ErrorCode.succ, log: "success", resp: {
                    dec_root: commit.dec_root,
                    root: commit.root,
                    revision: commit.revision,
                    root_path: req.root_path,
                    key_path: `${req.root_path}/${req.key}`
                }
            });
        });
    }
}
exports.IsolateEnvInsertWithKey = IsolateEnvInsertWithKey;
