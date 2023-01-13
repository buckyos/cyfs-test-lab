import { BaseAction, ActionAbstract } from "../../action";
import { ErrorCode, Logger,sleep } from '../../../base';
import * as cyfs from "../../../cyfs";
import { StackManager, CyfsDriverType ,PeerInfo} from "../../../cyfs-driver-client"
import { PublishFileAction } from "./publish_file"
import { PutContextAction } from "./put_context"
import { PubObjectCrossZone } from "../unstandard/put_object_cross_zone"
import * as path from "path";
/**
 * 输入数据
 */
type TestInput = {
    req_path?: string,
    file_source_device? : PeerInfo,
    group? : string,
    context_path?: string,
}
type TestOutput = {
    file_id?:cyfs.ObjectId,
    task_id?:string,
}
export class BuildTransGroupTree extends BaseAction implements ActionAbstract {
    async start(req:TestInput): Promise<{ err: number; log: string, resp?: TestOutput}> {
        this.action.type = "BuildTransGroupTree"
        this.action.action_id = `BuildTransGroupTree-${Date.now()}`
        return await super.start(req);
    }
    async run(req: TestInput): Promise<{ err: ErrorCode, log: string,resp?: TestOutput }> {
        let local = this.local!;
        
        return { err: ErrorCode.succ, log: "run success" ,}
    }
}
