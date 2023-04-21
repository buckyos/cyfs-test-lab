import {BaseAction,ActionAbstract} from "../../../cyfs-test-util"
import { ErrorCode, Logger, RandomGenerator} from '../../../common';
import { PeerInfo } from "../../../dec-app-base";
import * as cyfs from "../../../cyfs";

type TestInput = {
    object_raw : Uint8Array
}
type TestOutput = {
    opt_time : number,
}


export class PutObjectAction extends BaseAction implements ActionAbstract {

    static async create_random_text_object(peer:PeerInfo,logger:Logger):Promise<cyfs.TextObject>{
        let action =  new PutObjectAction({
            local : peer,
            remote : peer,
            input : {
                timeout : 30*1000,
                non_level : cyfs.NONAPILevel.NOC
            },
            expect : {err:0},
        },logger)
        let test_object = cyfs.TextObject.create(cyfs.ObjectId.default(),RandomGenerator.string(100),RandomGenerator.string(100),RandomGenerator.string(100));
        let object_raw = test_object.to_vec().unwrap()
        let create_result  = await action.start({object_raw});
        return test_object
    }

    async start(req:TestInput): Promise<{ err: number; log: string; resp?: TestOutput }> {
        this.action.type = "GetObjectAction";
        this.action.action_id = `GetObjectAction-${Date.now()}`
        return await super.start(req);
    }
    async run(req:TestInput): Promise<{ err: number, log: string, resp?:TestOutput}> {
        // 获取连接池中的cyfs stack
        let stack = this.local!;
        let begin_send = Date.now();
        let put_result  =await stack.non_service().put_object({
            common: {
                level: this.action.input.non_level!,
                target : this.action.remote!.device_id!,
                flags: 0,
            },
            object : cyfs.NONObjectInfo.new_from_object_raw(req.object_raw).unwrap()
        })
        let opt_time = Date.now() - begin_send;
        if(put_result.err){
            return {err:put_result.val.code,log:put_result.val.msg}
        }
        this.logger.info(`put object result = ${put_result.unwrap()}`);
        return { err: ErrorCode.succ, log: "success",resp:{opt_time}}
       
    }
}