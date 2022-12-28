import { sleep } from '../../../base';
import { BDTERROR, ActionType, Agent, Testcase, Task, Action, ActionAbstract } from '../type'
import {BaseAction} from "./base_action"

export class TcpCreateServerAction extends BaseAction implements ActionAbstract {
    async run(): Promise<{ err: number, log: string }> {
        this.action.type = ActionType.tcp_create_server;
        // (1) 检查测试bdt 客户端
        let LN = await this.agentManager!.get_bdt_peer_client(this.action.LN);
        if (LN.err) {
            return { err: LN.err, log: `${this.action.LN} bdt client not exist` }
        }
        // (2) 创建tcp server
        let result1 = await LN.client!.create_tcp_server(this.action.config.address!,this.action.config.port);        
        return {
            err : result1.result.result,
            log : result1.result.msg
        }
    }
}