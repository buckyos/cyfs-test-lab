
import { sleep } from '../../../base';
import { BDTERROR, ActionType, Agent, Testcase, Task, Action, ActionAbstract } from '../type'
import {BaseAction} from "./base_action"
export class CloseConnectAction extends BaseAction implements ActionAbstract {
    async run(): Promise<{ err: number, log: string }> {
        this.action.type = ActionType.close_connect
        // (1) 检查测试bdt 客户端
        let LN = await this.agentManager!.getBdtCli(this.action.LN);
        if (LN.err) {
            return { err: LN.err, log: `${this.action.LN} bdt client not exist` }
        }
        let info =await LN.bdt_stack!.getConnection(this.action.config.conn_tag!); 
        if(info.err){
            return { err: info.err, log: `${this.action.LN} Connecion ${this.action.config.conn_tag!} not exist` } 
        }
        let close = await info.conn!.shutdown("Both");
        return { err: close.err, log: close.result!.msg }
    }
}