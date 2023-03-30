import { sleep,ErrorCode } from '../../../../base';
import { BDTERROR, ActionType, Agent, Testcase, Task, Action, ActionAbstract } from '../../type'
import {BaseAction} from "../base_action"

export class TcpCreateServerAction extends BaseAction implements ActionAbstract {
    async run(): Promise<{ err: number, log: string }> {
        this.action.type = ActionType.tcp_create_server;
        // (1) 检查测试bdt 客户端
        let LN = await this.agent_manager!.get_bdt_peer_client(this.action.LN);
        if (LN.err) {
            return { err: LN.err, log: `${this.action.LN} bdt client not exist` }
        }
        if(LN.client!.tcp_server.has(this.action.config.port!.toString())){
            return {
                err : ErrorCode.succ,
                log : "success"
            }
        }
        let answer_size = 0;
        let listener_recv =false;
        if(this.action.config.firstQA_answer){
            this.logger!.info(`${this.action.LN} tcp client set answer_size = ${this.action.config.firstQA_answer},listener_recv = ${listener_recv}`);
            answer_size = this.action.config.firstQA_answer
            listener_recv = true;
        }
        // (2) 创建tcp server
        let result1 = await LN.client!.create_tcp_server(this.action.config.address!,this.action.config.port,listener_recv,answer_size);        
        return {
            err : result1.result.result,
            log : result1.result.msg
        }
    }
}