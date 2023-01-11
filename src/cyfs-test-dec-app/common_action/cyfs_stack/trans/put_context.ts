import { BaseAction, ActionAbstract, Action } from "../../action";
import { ErrorCode, Logger } from '../../../base';
import * as cyfs from "../../../cyfs";
import { StackManager, CyfsDriverType } from "../../../cyfs-driver-client"
import { type } from "os";



/**
 * 输入数据
 */
type TestInput = {
    context_path: string,
    chunk_codec_desc: cyfs.ChunkCodecDesc,
    deviceid_list: Array<cyfs.DeviceId>
}
type TestOutput = {
    err: number, 
    log: string, 
    resp?: { context?: cyfs.TransContext}   
}

export class PutContextAction extends BaseAction implements ActionAbstract {
    static create_by_parent(action: Action, logger: Logger): { err: number, action?: PutContextAction } {
        let run = new PutContextAction({
            local: action.remote!,
            remote: action.remote,
            input: JSON.parse(JSON.stringify(action.input)),
            parent_action: action.action_id!,
            expect: { err: 0 },

        }, logger)
        return { err: ErrorCode.succ, action: run }
    }
    static async put_noc_random_context(req: TestInput,local: { peer_name: string; dec_id?: string | undefined; type?: cyfs.CyfsStackRequestorType | undefined; }, logger: Logger): Promise<{ err: number,log:string,action?: PutContextAction, context?: cyfs.TransContext }>  {
        let action = new PutContextAction({
            local: local,
            remote: local,
            input: {
                timeout: 30 * 1000,
                ndn_level : cyfs.NDNAPILevel.NDC
            },
            expect: { err: 0 },
        }, logger);
        let put_local = await action.start(req);
        return {err:put_local.err,log:put_local.log,action,context:put_local.resp!.context}

    }
    async start(req: TestInput): Promise<TestOutput> {
        this.action.type = "PutContextLocalAction";
        this.action.action_id = `PutContextLocalAction-${Date.now()}`
        return await super.start(req);
    }
    async run(req: TestInput): Promise<TestOutput> {
        // 获取连接池中的cyfs stack
        let local = this.local!;
        let remote = this.remote!;

        // 推送context
        let begin_time = Date.now();
        let context = cyfs.TransContext.new(local.dec_id, req!.context_path!)
        this.logger.info(`create context ${context.desc().calculate_id().to_base_58()}`)
        for (let device of req.deviceid_list) {
            context.body_expect().content().device_list.push(new cyfs.TransContextDevice(device, req.chunk_codec_desc));
        }

        this.logger.info(`${JSON.stringify(context.device_list())}`)
        let info_context = await local.trans().put_context({
            common: {
                level: this.action.input.ndn_level!,
                flags: 1,
            },
            context: context,
            access: cyfs.AccessString.full()

        });
        this.logger.info(`put_context err =  ${JSON.stringify(info_context.err)}`);

        this.action.output! = {
            total_time: Date.now() - begin_time
        };
        if (info_context.err) {
            return { err: ErrorCode.fail, log: `put_context fail `,resp:{context} }
        }

        return { err: ErrorCode.succ, log: "success",resp:{context}}

    }
}
