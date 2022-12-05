import { sleep } from '../../../base';
import { BDTERROR, ActionType, Agent, Testcase, Task, Action, ActionAbstract } from '../type'
import { BaseAction } from "./baseAction"

export class ConnectAndSendPerfAction extends BaseAction implements ActionAbstract {
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
        if (this.action.config!.firstQA_question && this.action.config!.firstQA_question != LN.bdtClient!.question_size) {
            FirstQ = 1 ;
            this.logger?.info(`Set FirstQ question size ${this.action.fileSize}`)
            let err = await LN.bdtClient!.set_question(this.action.config!.firstQA_question);
            if (err) {
                return { err: BDTERROR.connnetFailed, log: `${this.action.RN!} set_question info failed ` }
            }
        }
        // 判断RN是否要进行FristQA,answer 数据设置
        if (this.action.config!.firstQA_answer && this.action.config!.firstQA_answer != RN.bdtClient!.answer_size) {
            this.logger?.info(`Set FirstQ answer size ${this.action.config!.firstQA_answer!}`)
            
            let err = await RN.bdtClient!.set_answer(this.action.config!.firstQA_answer);
            if (err) {
                return { err: BDTERROR.connnetFailed, log: `${this.action.RN!} set_answer info failed ` }
            }
        }
        this.action.fileSize = LN.bdtClient?.question_size! + RN.bdtClient?.answer_size!;
        // 判断是否要发起直连，默认不直连
        if (!this.action.config!.known_eps) {
            this.action.config!.known_eps = 0
        }
        // (3) ConnectAction 建立连接
        let connect_info = await LN.bdtClient!.connect_send_stream(this.action.config.conn_tag!, RN.bdtClient!.device_object!, this.action.config.firstQA_question!, 0);

        if (connect_info.resp.result != 0) {
            return { err: connect_info.resp.result, log: connect_info.resp.msg }
        }
        // (4) ConnectAction 建立连接对结果的检查
        
        //校验RN 连接成功
        let check = await RN.bdtClient!.remark_accpet_conn_name(connect_info.conn!.TempSeq, LN!.bdtClient!.peerid!, this.action.config!.conn_tag);
        if (check.err) {
            // 等待2s再试一次，监听事件可能有网络延时
            await sleep(2000);
            check = await await RN.bdtClient!.remark_accpet_conn_name(connect_info.conn!.TempSeq, LN!.bdtClient!.peerid!, this.action.config!.conn_tag);
            if (check.err) {
                return { err: BDTERROR.connnetFailed, log: ` ${this.action.RN!} confirm failed` }
            }
        }
        if (check.conn!.TempSeq != check.conn!.TempSeq) {
            return { err: BDTERROR.connnetFailed, log: `${this.action.LN!} conenct ${this.action.RN!} , ${check.conn!.TempSeq} != ${connect_info.conn!.TempSeq}` }
        }
        
        // 检查FirstQA question 
        // 检查fristQA answer 
        if (connect_info.conn?.fastQAInfo!.recv_hash) {
            this.logger!.info(`recv answer hash = ${connect_info.conn?.fastQAInfo!.recv_hash}`)
            if (connect_info.conn?.fastQAInfo!.recv_hash != check.conn?.fastQAInfo?.send_hash) {
                this.logger!.error(`send answer = ${connect_info.conn?.fastQAInfo!.recv_hash} ,recv answer = ${check.conn?.fastQAInfo?.send_hash}`);
                return { err: BDTERROR.connnetFailed, log: `${this.action.LN!} conenct ${this.action.RN!} , FristQA answer is error` }
            }
        }
        if (check.conn?.fastQAInfo?.recv_hash) {
            this.logger!.info(`recv question hash = ${check.conn?.fastQAInfo?.recv_hash}`)
            if (check.conn?.fastQAInfo?.recv_hash != connect_info.conn?.fastQAInfo!.send_hash) {
                this.logger!.error(`send question = ${connect_info.conn?.fastQAInfo!.send_hash} ,recv question = ${check.conn?.fastQAInfo?.recv_hash}`);
                return { err: BDTERROR.connnetFailed, log: `${this.action.LN} conenct ${this.action.RN} , FristQA question is error` }
            }
        }
        // (5) 保存测试数据
        if (!this.action.info) {
            this.action.info = { conn: [] };
        } else {
            this.action.info.conn = [];
        }
        this.action.set_time = check.conn?.fastQAInfo?.comfirm_time;
        this.action.calculate_time = check.conn?.fastQAInfo?.calculate_time! + connect_info.conn?.fastQAInfo!.calculate_time!;
        this.action.connect_time = connect_info.conn?.fastQAInfo!.connect_time
        this.action.fileSize = this.action.config.firstQA_question! + this.action.config.firstQA_answer!;
        this.action.send_time =  connect_info.conn?.fastQAInfo!.total_time!;
        this.action.info!.conn_name = connect_info.conn?.stream_name
        this.action.info.LN_Resp = connect_info.conn?.fastQAInfo;
        this.action.info.RN_Resp = check.conn?.fastQAInfo;
        return { err: BDTERROR.success, log: "ConnectAction run success" }
    }
}