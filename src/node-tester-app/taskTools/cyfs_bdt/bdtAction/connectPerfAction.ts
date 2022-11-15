import { sleep } from '../../../base';
import { BDTERROR, ActionType, Agent, Testcase, Task, Action, ActionAbstract } from '../type'
import {BaseAction} from "./baseAction"

export class ConnectPerfAction extends BaseAction implements ActionAbstract {
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
        // 判断是否要发起直连，默认不直连
        if (!this.action.config!.known_eps) {
            this.action.config!.known_eps = 0
        }
        // (3) ConnectAction 建立连接
        let info = await LN!.bdtClient!.connect(RN!.bdtClient!.device_object!, 0, this.action.config!.known_eps, this.action.config!.accept_answer!, this.action.config!.conn_tag!)
        // (4) ConnectAction 建立连接对结果的检查
        if (info.err) {
            return { err: BDTERROR.connnetFailed, log: `${this.action.LN} conenct ${this.action.RN!} err =${info.err}` }
        }
        this.logger!.info(`${this.action.LN} conenct ${this.action.RN} success,time = ${info.time!} ,stream_name = ${info.conn?.stream_name}`)      
        // (5) 保存测试数据
        if (!this.action.info) {
            this.action.info = { conn: [] };
        } else {
            this.action.info.conn = [];
        }
        this.action.info!.conn!.push(info.conn!.stream_name!);
        this.action.connect_time = info.time
        this.action.info!.conn_name = info.conn!.stream_name
        return { err: BDTERROR.success, log: "ConnectAction run success" }
    }
}