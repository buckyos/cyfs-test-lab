
import { sleep } from '../../../base';
import { BDTERROR, ActionType, Agent, Testcase, Task, Action, ActionAbstract } from '../type'
import {BaseAction} from "./baseAction"

export class CreateBDTStackAction extends BaseAction implements ActionAbstract {
    async run(): Promise<{ err: number, log: string }> {

        // (1) 检查测试bdt 客户端
        let LN = await this.agentManager!.getBdtPeerClient(this.action.LN);
        if (LN.err) {
            return { err: LN.err, log: `${this.action.LN} bdt client not exist` }
        }
    
        let info  = await LN.bdtClient!.create_new_stack();
        this.logger!.info(`#### ${this.action.LN} CreateBDTStack result = ${info}`)
        if(info.err){
            return { err: BDTERROR.success, log: `${this.action.LN} CreateBDTStack failed`}
        }
        
        this.action.set_time = info.sn_online_time;
        return { err: BDTERROR.success, log: "CreateBDTStackAction run success" }
    }
}