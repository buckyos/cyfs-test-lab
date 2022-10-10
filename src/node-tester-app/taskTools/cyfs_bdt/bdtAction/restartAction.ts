
import { sleep } from '../../../base';
import { BDTERROR, ActionType, Agent, Testcase, Task, Action, ActionAbstract } from '../type'
import {BaseAction} from "./baseAction"

export class RestartAction extends BaseAction implements ActionAbstract {
    async run(): Promise<{ err: number, log: string }> {

        // (1) 检查测试bdt 客户端
        let LN = await this.agentManager!.getBdtPeerClient(this.action.LN);
        if (LN.err) {
            return { err: LN.err, log: `${this.action.LN} bdt client not exist` }
        }
        if(this.action.config.restart){
            let target = await this.agentManager!.getBdtPeerClient(this.action.config.restart!.ndn_event_target);
            if (target.err) {
                return { err: LN.err, log: `${this.action.config.restart!.ndn_event_target} bdt client not exist` }
            }
            let info  = await LN.bdtClient!.restart(this.action.config.restart?.ndn_event,target.bdtClient!.peerid!);
            if(info){
                return { err: BDTERROR.success, log: `${this.action.LN} restart bdt client failed`}
            }
        }else{
            let info  = await LN.bdtClient!.restart();
            if(info){
                return { err: BDTERROR.success, log: `${this.action.LN} restart bdt client failed`}
            }
        }
        
        return { err: BDTERROR.success, log: "RestartAction run success" }
    }
}