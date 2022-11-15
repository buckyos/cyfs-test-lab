import { sleep } from '../../../base';
import { BDTERROR, ActionType, Agent, Testcase, Task, Action, ActionAbstract } from '../type'
import {BaseAction} from "./baseAction"

export class FastQAPerfAction extends BaseAction implements ActionAbstract {
    async run(): Promise<{ err: number, log: string }> {
        this.action.type = ActionType.FasTQA;
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
        if (this.action.config!.firstQA_question) {
            FirstQ = 1 ;
            //FirstQ = this.action.config!.firstQA_question!;
            this.action.fileSize = Buffer.byteLength(this.action.config!.firstQA_question!)
            this.logger?.info(`Set FirstQ question size ${this.action.fileSize}`)
            let err = await RN.bdtClient!.set_question(this.action.config!.firstQA_question);
            if (err) {
                return { err: BDTERROR.connnetFailed, log: `${this.action.RN!} set_question info failed ` }
            }
        }else{
            this.action.fileSize = 0;
        }
        // 判断RN是否要进行FristQA,answer 数据设置
        if (this.action.config!.firstQA_answer) {
            this.logger?.info(`Set FirstQ answer size ${Buffer.byteLength(this.action.config!.firstQA_answer!)}`)
            this.action.fileSize = this.action.fileSize + Buffer.byteLength(this.action.config!.firstQA_answer!)
            let err = await RN.bdtClient!.set_answer(this.action.config!.firstQA_answer);
            if (err) {
                return { err: BDTERROR.connnetFailed, log: `${this.action.RN!} set_answer info failed ` }
            }
        }
        // 判断是否要发起直连，默认不直连
        if (!this.action.config!.known_eps) {
            this.action.config!.known_eps = 0
        }
        // (3) ConnectAction 建立连接
        let info = await LN!.bdtClient!.connect(RN!.bdtClient!.device_object!, FirstQ, this.action.config!.known_eps, this.action.config!.accept_answer!, this.action.config!.conn_tag!)
        // (4) ConnectAction 建立连接对结果的检查
        if (info.err) {
            return { err: BDTERROR.connnetFailed, log: `${this.action.LN} conenct ${this.action.RN!} err =${info.err}` }
        }
        this.action.calculate_time = info.read_time;
        this.logger!.info(`${this.action.LN} conenct ${this.action.RN} success,time = ${info.time!} ,read answer time = ${info.read_time},stream_name = ${info.conn?.stream_name}`)
        // 检查fristQA answer 
        if (info.answer) {
            this.logger!.info(`recv answer len = ${Buffer.byteLength(info.answer)}`)
            if (info.answer != this.action.config.firstQA_answer) {
                this.logger!.error(`send answer = ${this.action.config.firstQA_answer} ,recv answer = ${info.answer.length}`);
                return { err: BDTERROR.connnetFailed, log: `${this.action.LN!} conenct ${this.action.RN!} , FristQA answer is error` }
            }
        }
        //校验RN 连接成功
        let check = await RN.bdtClient!.remark_accpet_conn_name(info.conn!.TempSeq, LN!.bdtClient!.peerid!, this.action.config!.conn_tag);
        if (check.err) {
            // 等待2s再试一次，监听事件可能有网络延时
            await sleep(2000);
            check = await await RN.bdtClient!.remark_accpet_conn_name(info.conn!.TempSeq, LN!.bdtClient!.peerid!, this.action.config!.conn_tag);
            if (check.err) {
                return { err: BDTERROR.connnetFailed, log: ` ${this.action.RN!} confirm failed` }
            }
        } 
        if(check.conn!.TempSeq != info.conn!.TempSeq){
            return { err: BDTERROR.connnetFailed, log: `${this.action.LN!} conenct ${this.action.RN!} , ${check.conn!.TempSeq} != ${info.conn!.TempSeq}` } 
        }
        this.action.set_time = check.conn?.confirm_time;
         // 检查FirstQA question 
        if (check.conn?.question!) {
            this.logger!.info(`recv question len = ${Buffer.byteLength(check.conn!.question)}`)
            if (check.conn?.question != this.action.config.firstQA_question) {
                this.logger!.error(`send question = ${FirstQ} ,recv question = ${check.conn?.question?.length}`);
                return {err:BDTERROR.connnetFailed,log:`${this.action.LN} conenct ${this.action.RN} , FristQA question is error`}
            }
        }
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