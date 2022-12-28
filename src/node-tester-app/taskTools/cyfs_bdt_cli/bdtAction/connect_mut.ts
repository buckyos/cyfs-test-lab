import { sleep } from '../../../base';
import { BDTERROR, ActionType, Agent, Testcase, Task, Action, ActionAbstract } from '../type'
import {BaseAction} from "./base_action"

export class ConnectMutAction extends BaseAction implements ActionAbstract {
    async run(): Promise<{ err: number, log: string }> {

        // (1) 检查测试bdt 客户端
        let LN = await this.agentManager!.getBdtPeerClient(this.action.LN);
        let RN = await this.agentManager!.getBdtPeerClient(this.action.RN!);
        if (LN.err) {
            return { err: LN.err, log: `${this.action.LN} bdt client not exist` }
        }
        if (RN.err) {
            return { err: RN.err, log: `${this.action.RN} bdt client not exist` }
        }
        // (2) ConnectAction 操作的参数设置
        // 判断LN是否要进行FristQA  question数据发送
        let FirstQ = 0

        // 判断是否要发起直连，默认不直连
        if (!this.action.config!.known_eps) {
            this.action.config!.known_eps = 0
        }
        // (3) ConnectAction 建立连接
        let result = await LN!.bdt_stack!.connect_mut(this.action.fileNum!,RN!.bdt_stack!.device_object!, FirstQ, this.action.config!.known_eps, this.action.config!.accept_answer!, this.action.config!.conn_tag!)
        // (4) ConnectAction 建立连接对结果的检查
        let info = result.resp;
        let connect_error = 0;
        let total_time = 0;
        let success = 0;
        for(let connect_time of info.list ){
            if (connect_time == 0){
                connect_error = connect_error + 1;
            }else{
                total_time = total_time + connect_time
                success = success + 1;
            }
        }
        if (info.result) {
            return { err: info.result, log: info.msg }
        }
        this.logger!.info(`$$$$$  connect mut success = ${success} avg_time = ${total_time/success}`);
        // (5) 保存测试数据
        if (!this.action.info) {
            this.action.info = { conn: [] };
        } else {
            this.action.info.conn = [];
        }
        this.action.connect_time = total_time
        this.action.result = {err:connect_error,log:`connect error ${connect_error} time`}
        return { err: BDTERROR.success, log: "ConnectMutAction run success" }
    }
}