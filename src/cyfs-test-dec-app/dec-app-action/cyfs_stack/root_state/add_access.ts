import { BaseAction, ActionAbstract, Action } from "../../../cyfs-test-util";
import { ErrorCode, Logger } from '../../../common';
import * as cyfs from "../../../cyfs";

/**
 * 输入数据
 */
type TestInput = {
    object_id: cyfs.ObjectId,
    req_path: string,
    access: cyfs.AccessString
}

export class AddAccess extends BaseAction implements ActionAbstract {
    static create_by_parent(action: Action, logger: Logger): { err: number, action?: AddAccess } {
        let run = new AddAccess({
            local: action.local,
            remote: action.remote,
            input: action.input,
            parent_action: action.action_id!,
            expect: { err: 0 },

        }, logger)
        return { err: ErrorCode.succ, action: run }
    }
    async start(req: TestInput): Promise<{ err: number; log: string; resp?: any; }> {
        this.action.type = "AddAccess";
        this.action.action_id = `AddAccess-${Date.now()}`
        return await super.start(req)
    }
    async run(req: TestInput): Promise<{ err: number, log: string, resp?: { file_id?: cyfs.ObjectId } }> {
        // 获取连接池中的cyfs stack
        let local = this.local!;

        // 修改对象权限
        let test = await local.root_state_meta_stub(local.local_device_id().object_id, local.dec_id).add_access(cyfs.GlobalStatePathAccessItem.new(
            req.req_path!,
            req.access
        ));
        this.logger.info(`${req.req_path} root_state_meta_stub add_access result = ${test}`);

        if (test.err) {
            return { err: ErrorCode.fail, log: `${JSON.stringify(test)}` }
        } else {
            return { err: ErrorCode.succ, log: "success" }
        }


    }
}
