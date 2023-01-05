import { sleep } from '../../../base';
import { BDTERROR, ActionType, Agent, Testcase, Task, Action, ActionAbstract } from '../type'
import {BaseAction} from "./base_action"

export class ConnectAction extends BaseAction implements ActionAbstract {
    async run(): Promise<{ err: number, log: string }> {

        // (1) 检查测试bdt 客户端
        let LN = await this.agentManager!.getBdtCli(this.action.LN);
        let RN = await this.agentManager!.getBdtCli(this.action.RN!);
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
            this.action.fileSize = this.action.config!.firstQA_question;
            this.logger?.info(`Set FirstQ question size ${this.action.fileSize}`)
            // let err = await LN.bdt_stack!.set_question(this.action.config!.firstQA_question);
            // if (err) {
            //     return { err: BDTERROR.connnetFailed, log: `${this.action.RN!} set_question info failed ` }
            // }
        }else{
            this.action.fileSize = 0;
        }
        // 判断RN是否要进行FristQA,answer 数据设置
        if (this.action.config!.firstQA_answer) {
            this.logger?.info(`Set FirstQ answer size ${this.action.config!.firstQA_answer!}`)
            this.action.fileSize = this.action.fileSize + this.action.config!.firstQA_answer!
            // let err = await RN.bdt_stack!.set_answer(this.action.config!.firstQA_answer);
            // if (err) {
            //     return { err: BDTERROR.connnetFailed, log: `${this.action.RN!} set_answer info failed ` }
            // }
        }
        // 判断是否要发起直连，默认不直连
        if (!this.action.config!.known_eps) {
            this.action.config!.known_eps = 0
        }
        // (3) ConnectAction 建立连接
        let result = await LN!.bdt_stack!.connect(RN!.bdt_stack!.device_object!, FirstQ, this.action.config!.known_eps, this.action.config!.accept_answer!, this.action.config!.conn_tag!)
        // (4) ConnectAction 建立连接对结果的检查
        let info = result.resp;
        if (info.result) {
            return { err: info.result, log: info.msg }
        }
        this.action.calculate_time = info.calculate_time;
        this.logger!.info(`${this.action.LN} conenct ${this.action.RN} success, connect_time = ${info.connect_time!} stream_name = ${result.conn?.stream_name}`)
        
        //校验RN 连接成功
        let check = await RN.bdt_stack!.remark_accpet_conn_name(result.conn!.TempSeq, LN!.bdt_stack!.peerid!, this.action.config!.conn_tag);
        if (check.err) {
            // 等待2s再试一次，监听事件可能有网络延时
            await sleep(2000);
            check = await await RN.bdt_stack!.remark_accpet_conn_name(result.conn!.TempSeq, LN!.bdt_stack!.peerid!, this.action.config!.conn_tag);
            if (check.err) {
                return { err: BDTERROR.connnetFailed, log: ` ${this.action.RN!} confirm failed` }
            }
        } 
        if(check.conn!.TempSeq != result.conn!.TempSeq){
            return { err: BDTERROR.connnetFailed, log: `${this.action.LN!} conenct ${this.action.RN!} , ${check.conn!.TempSeq} != ${result.conn!.TempSeq}` } 
        }
        this.action.set_time = check.conn?.fastQAInfo?.calculate_time;
         // 检查FirstQA question 
         // 检查fristQA answer 
        // hash 为 空和default不校验 
        if(info.recv_hash && info.recv_hash != "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" && info.recv_hash != "0000000000000000000000000000000000000000000000000000000000000000"){
            if (info.recv_hash) {
                this.logger!.info(`recv answer hash = ${info.recv_hash}`)
                if (info.recv_hash != check.conn?.fastQAInfo?.send_hash) {
                    this.logger!.error(`send answer = ${info.recv_hash} ,recv answer = ${check.conn?.fastQAInfo?.send_hash}`);
                    return { err: BDTERROR.connnetFailed, log: `${this.action.LN!} conenct ${this.action.RN!} , FristQA answer is error` }
                }
            }
            if (check.conn?.fastQAInfo?.recv_hash) {
                this.logger!.info(`recv question hash = ${check.conn?.fastQAInfo?.recv_hash}`)
                if (check.conn?.fastQAInfo?.recv_hash != info.send_hash) {
                    this.logger!.error(`send question = ${info.send_hash} ,recv question = ${check.conn?.fastQAInfo?.recv_hash }`);
                    return {err:BDTERROR.connnetFailed,log:`${this.action.LN} conenct ${this.action.RN} , FristQA question is error`}
                }
            }
        } 
        
        // (5) 保存测试数据
        if (!this.action.info) {
            this.action.info = { conn: [] };
        } else {
            this.action.info.conn = [];
        }
        this.action.connect_time = info.connect_time
        this.action.info!.conn_name = result.conn!.stream_name
        return { err: BDTERROR.success, log: "ConnectAction run success" }
    }
}