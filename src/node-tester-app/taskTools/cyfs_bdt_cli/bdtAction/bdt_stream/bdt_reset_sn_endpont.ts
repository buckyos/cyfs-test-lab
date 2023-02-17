import { BDTERROR, ActionType, Agent, Testcase, Task, Action, ActionAbstract } from '../../type'
import {BaseAction} from "../base_action"

export class ResetSNAndEndpoint extends BaseAction implements ActionAbstract {
    async run(): Promise<{ err: number, log: string }> {
        this.action.type = ActionType.reset_bdt_stack;
        // (1) 检查测试bdt 客户端
        let LN = await this.agentManager!.getBdtCli(this.action.LN);
        let RN = await this.agentManager!.getBdtCli(this.action.RN!);
        if (LN.err) {
            return { err: LN.err, log: `${this.action.LN} bdt client not exist` }
        }
        if (RN.err) {
            return { err: RN.err, log: `${this.action.RN} bdt client not exist` }
        }
        let reset_ln = await LN.bdt_stack!.reset_stack({
            sn_list:this.action.config.sn_list!,
            endpoints:LN.bdt_stack!.cache_peer_info.addrInfo
        });
        let reset_rn = await RN.bdt_stack!.reset_stack({
            sn_list:this.action.config.sn_list!,
            endpoints:RN.bdt_stack!.cache_peer_info.addrInfo
        });
        if(reset_ln.err || reset_ln.result?.result){
            return {err:reset_ln.err,log:reset_ln.result!.msg}
        }
        if(reset_rn.err || reset_rn.result?.result){
            return {err:reset_rn.err,log:reset_rn.result!.msg}
        }
        return { err: BDTERROR.success, log: "ResetSNAndEndpoint run success" }
    }
}