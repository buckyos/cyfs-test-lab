
import { RandomGenerator, sleep } from '../../../base';
import { BDTERROR, ActionType, Agent, Testcase, Task, Action, ActionAbstract } from '../type'
import {BaseAction} from "./baseAction"

export class CreateBDTStackAction extends BaseAction implements ActionAbstract {
    async run(): Promise<{ err: number, log: string }> {

        // (1) 检查测试bdt 客户端
        let LN = await this.agentManager!.getBdtPeerClient(this.action.LN);
        let resp = await this.agentManager!.getAgent(this.action.LN.split("$")[0]);
        if(resp.err){
            return { err: resp.err, log: `${this.action.LN} not exist`}
        }
        let  LN_Agent = resp.agent!;
        if(!LN_Agent!.bdt_port){
            LN_Agent!.bdt_port = 50000;
        }
        LN_Agent!.bdt_port =  LN_Agent!.bdt_port! + 4;
        if (LN.err) {
            return { err: LN.err, log: `${this.action.LN} bdt client not exist` }
        }
    
        let info  = await LN.bdtClient!.create_new_stack(LN_Agent!.tags, LN_Agent!.tags + "_"+ RandomGenerator.string(10),LN_Agent!.bdt_port);
        this.logger!.info(`#### ${this.action.LN} CreateBDTStack result = ${info}`)
        if(info.err){
            return { err: BDTERROR.success, log: `${this.action.LN} CreateBDTStack failed`}
        }
        
        this.action.set_time = info.sn_online_time;
        return { err: BDTERROR.success, log: `${this.action.LN}CreateBDTStackAction run success` }
    }
}