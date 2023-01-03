
import { RandomGenerator, sleep } from '../../../base';
import { BDTERROR, ActionType, Agent, Testcase, Task, Action, ActionAbstract } from '../type'
import { BaseAction } from "./base_action"

export class SleepAction extends BaseAction implements ActionAbstract {
    async run(): Promise<{ err: number, log: string }> {

        if (!this.action.set_time) {
            this.action.set_time = 30000
        }
        let LN = await this.agentManager!.getBdtCli(this.action.LN);
        if (LN.err) {
            return { err: LN.err, log: `${this.action.LN} bdt client not exist` }
        }
        let RN = await this.agentManager!.getBdtCli(this.action.RN!);
        if (RN.err) {
            return { err: RN.err, log: `${this.action.RN} bdt client not exist` }
        } 
        let begin_time = Date.now();
        while (this.action.set_time! + begin_time > Date.now()) {
            // if(this.action.LN){
            //     let ping = await LN.bdt_stack!.util_client!.ping();
            // }
            // if(this.action.RN){
                
            //     let ping = await RN.bdt_stack!.util_client!.ping();
            // }
            await sleep(30*1000);
        }
        
        return { err: BDTERROR.success, log: `${this.action.LN} CreateBDTStackAction run success` }
    }
}