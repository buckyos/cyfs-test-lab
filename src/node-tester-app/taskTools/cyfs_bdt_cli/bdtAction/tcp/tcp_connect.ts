import { sleep } from '../../../../base';
import { BDTERROR, ActionType, Agent, Testcase, Task, Action, ActionAbstract } from '../../type'
import {BaseAction} from "../base_action"

export class TcpConnectAction extends BaseAction implements ActionAbstract {
    async run(): Promise<{ err: number, log: string }> {
        this.action.type = ActionType.tcp_connect;
        // (1) 检查测试bdt 客户端
        let LN = await this.agentManager!.get_bdt_peer_client(this.action.LN);
        if (LN.err) {
            return { err: LN.err, log: `${this.action.LN} bdt client not exist` }
        }
        let RN = await this.agentManager!.get_bdt_peer_client(this.action.RN!);
        if (RN.err) {
            return { err: RN.err, log: `${this.action.RN} bdt client not exist` }
        }
        // (2) 获取启动的tcp 服务
        let tcp_ln = LN.client!.tcp_server.get("22223")!;
        let tcp_rn = RN.client!.tcp_server.get("22223")!;
        //（3）建立tcp 连接
        let question_szie = 0;
        let recv_data = false;
        if(this.action.config.firstQA_question){
            question_szie = this.action.config.firstQA_question;
        }
        let result = await tcp_ln.tcp_connect(tcp_rn.address!,this.action.config.conn_tag!,recv_data,question_szie);
        if(result.resp.result !=0){
            return { err: result.resp.result, log: result.resp.msg }
        }
        let check_rn =await  tcp_rn.check_connect(result.resp.sequence_id,this.action.config.conn_tag!)
        if(check_rn.err){
            this.logger!.info(`RN check tcp stream error`);
        }

        this.action.connect_time = result.resp.connect_time;

        return { err: BDTERROR.success, log: "ConnectMutAction run success" }
    }
}