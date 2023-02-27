import { BaseAction, ActionAbstract, Action, } from "../../action";
import { ErrorCode, Logger, RandomGenerator } from '../../../base';
import * as cyfs from "../../../cyfs";
import { PutObjectAction } from "../non/put_object"
import { PeerInfo } from "../../../common_base";
/**
 * 输入数据
 */
type TestInput = {
    content_type: cyfs.ObjectMapSimpleContentType
}
type TestOutput = {
    dec_root: cyfs.ObjectId;
    root: cyfs.ObjectId;
    revision: cyfs.JSBI;
}
export class RandomSingleOpEnv extends BaseAction implements ActionAbstract {

    static async rand_one(peer: PeerInfo,content_type: cyfs.ObjectMapSimpleContentType =cyfs.ObjectMapSimpleContentType.Map){
        return await new RandomSingleOpEnv({
            local:peer,
            input: {
                timeout : 30*1000,
                non_level : cyfs.NONAPILevel.NOC
            },
            expect: { err: 0 },
        }).start({content_type})
    }
    static create_by_parent(action: Action): { err: number, action?: RandomSingleOpEnv } {
        let action_class = new RandomSingleOpEnv({
            local: action.local,
            input: action.input,
            parent_action: action.action_id!,
            expect: { err: 0 },

        })
        return { err: ErrorCode.succ, action: action_class }
    }
    async start(req: TestInput): Promise<{ err: number; log: string; resp?: TestOutput; }> {
        this.action.type = "RandomSingleOpEnv";
        this.action.action_id = `RandomSingleOpEnv-${Date.now()}`
        return await super.start(req)
    }
    async run(req: TestInput): Promise<{ err: number, log: string, resp?: TestOutput }> {
        return new Promise(async (resolve, reject) => {
            // 获取连接池中的cyfs stack
            let stack = this.local!;
            let op_env = (await stack.root_state_stub().create_single_op_env()).mapErr(err => {
                return reject({ err: err.code, log: err.msg });
            }).unwrap();
            let create_result = (await op_env.create_new(req.content_type!)).mapErr(err => {
                return reject({ err: err.code, log: err.msg });
            }).unwrap();

            let test1_object = await PutObjectAction.create_random_text_object(this.action.local, this.logger);
            let insert_ket = await op_env.insert_with_key( test1_object.calculate_id().to_base_58(),test1_object.calculate_id());
            let check =  (await op_env.get_by_key(test1_object.calculate_id().to_base_58())).mapErr(err => {
                return reject({ err: err.code, log: err.msg });
            }).unwrap();
            this.logger.info(`get_by_key success: ${check}`)
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
                }
            })
        })

    }
}
