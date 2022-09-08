
import { sleep } from '../../../base';
import { BDTERROR, ActionType, Agent, Testcase, Task, Action, ActionAbstract } from '../type'
import {BaseAction} from "./baseAction"

export class DestoryAction extends BaseAction implements ActionAbstract {
    async run(): Promise<{ err: number, log: string }> {

        // (1) 检查测试bdt 客户端
        let LN = await this.agentManager!.getBdtPeerClient(this.action.LN);
        if (LN.err) {
            return { err: LN.err, log: `${this.action.LN} bdt client not exist` }
        }
        let info  = await LN.bdtClient!.destory(-1);
        if(info){
            return { err: BDTERROR.success, log: `${this.action.LN} destory bdt client failed`}
        }
        return { err: BDTERROR.success, log: "DestoryAction run success" }
    }
}