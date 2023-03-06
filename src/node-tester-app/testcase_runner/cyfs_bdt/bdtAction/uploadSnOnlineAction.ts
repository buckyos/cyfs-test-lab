
import { RandomGenerator, sleep } from '../../../base';
import { BDTERROR, ActionType, Agent, Testcase, Task, Action, ActionAbstract } from '../type'
import {BaseAction} from "./baseAction"

export class UploadSnOnlineAction extends BaseAction implements ActionAbstract {
    async run(): Promise<{ err: number, log: string }> {
        this.action.type = ActionType.sn_online;
        // (1) 检查测试bdt 客户端
        let LN = await this.agent_manager!.getBdtPeerClient(this.action.LN);
        let resp = await this.agent_manager!.getAgent(this.action.LN.split("$")[0]);
        if(resp.err){
            return { err: resp.err, log: `${this.action.LN} not exist`}
        }
        this.action.connect_time = LN.bdtClient?.online_time!;
        return { err: BDTERROR.success, log: `${this.action.LN} UploadSnOnlineAction run success` }
    }
}