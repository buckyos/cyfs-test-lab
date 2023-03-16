import { BaseAction, ActionAbstract, Action, } from "../../action";
import { ErrorCode, Logger, RandomGenerator } from '../../../common';
import * as cyfs from "../../../cyfs";
import { PutObjectAction } from "../non/put_object"
import { PeerInfo } from "../../../dec-app-base";
/**
 * 输入数据
 */
type TestInput = {
    root_path : string;
    content_type: cyfs.ObjectMapSimpleContentType
    key : string;
    value : cyfs.ObjectId;
}
type TestOutput = {
    dec_root: cyfs.ObjectId;
    root: cyfs.ObjectId;
    revision: cyfs.JSBI;
    root_path : string;
    key_path: string;

}
export class PathEnvInsertWithKey extends BaseAction implements ActionAbstract {

    static async insert_key(peer: PeerInfo,input: TestInput){
        return await new PathEnvInsertWithKey({
            local:peer,
            input: {
                timeout : 30*1000,
                non_level : cyfs.NONAPILevel.NOC
            },
            expect: { err: 0 },
        }).start(input)
    }
    static create_by_parent(action: Action): { err: number, action?: PathEnvInsertWithKey } {
        let action_class = new PathEnvInsertWithKey({
            local: action.local,
            input: action.input,
            parent_action: action.action_id!,
            expect: { err: 0 },

        })
        return { err: ErrorCode.succ, action: action_class }
    }
    async start(req: TestInput): Promise<{ err: number; log: string; resp?: TestOutput; }> {
        this.action.type = "PathEnvInsertWithKey";
        this.action.action_id = `PathEnvInsertWithKey-${Date.now()}`
        return await super.start(req)
    }
    async run(req: TestInput): Promise<{ err: number, log: string, resp?: TestOutput }> {
        return new Promise(async (resolve, reject) => {
            // 获取连接池中的cyfs stack
            let stack = this.local!;
            let op_env = (await stack.root_state_stub().create_path_op_env()).mapErr(err => {
                return reject({ err: err.code, log: err.msg });
            }).unwrap();
            let create_result = (await op_env.create_new_with_path(req.root_path,req.content_type)).mapErr(err => {
                return reject({ err: err.code, log: err.msg });
            }).unwrap();
            //req.key
            let insert_ket = await op_env.insert_with_key(req.root_path, req.key,req.value);
            let check =  (await op_env.get_by_key(req.root_path,req.key)).mapErr(err => {
                return reject({ err: err.code, log: err.msg });
            }).unwrap();
            this.logger.info(`get_by_path success: ${check}`)
            let commit = (await op_env.commit()).mapErr(err => {
                return reject({ err: err.code, log: err.msg });
            }).unwrap();
            this.logger.info(`dec_root = ${commit.dec_root}`)
            this.logger.info(`root = ${commit.root}`)
            this.logger.info(`revision = ${commit.revision}`)
            resolve({
                err: ErrorCode.succ, log: "success", resp: {
                    dec_root: commit.dec_root,
                    root: commit.root,
                    revision: commit.revision,
                    root_path : req.root_path,
                    key_path: `${req.root_path}/${req.key}`
                }
            })
        })

    }
}
