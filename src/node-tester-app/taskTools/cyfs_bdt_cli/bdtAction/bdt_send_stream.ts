

import { sleep } from '../../../base';
import { BDTERROR, ActionType, Agent, Testcase, Task, Action, ActionAbstract } from '../type'
import {BaseAction} from "./base_action"

export class SendStreamAction extends BaseAction implements ActionAbstract {
    async run(): Promise<{ err: number, log: string }> {
        // (1) 检查测试bdt 客户端
        this.action.type = ActionType.send_stream
        let LN = await this.agentManager!.getBdtCli(this.action.LN);
        let RN = await this.agentManager!.getBdtCli(this.action.RN!);
        if (LN.err) {
            return { err: LN.err, log: `${this.action.LN} bdt client not exist` }
        }
        if (RN.err) {
            return { err: RN.err, log: `${this.action.RN} bdt client not exist` }
        }
        // (2) 检查连接是否存在
        let LN_connInfo = await LN.bdt_stack!.getConnection(this.action.config.conn_tag!);
        let RN_connInfo = await RN.bdt_stack!.getConnection(this.action.config.conn_tag!);
        if (LN_connInfo.err || RN_connInfo.err) {
            return { err: BDTERROR.optExpectError, log: `conn not found,LN err = ${LN_connInfo.err} ,RN err = ${RN_connInfo.err}` }
        }
        // (3) 传输 BDT Stream
        let recv = RN_connInfo.conn!.recv_stream();
        let send_run = LN_connInfo.conn!.send_stream(this.action.fileSize!);
        // await sleep(500);
        // let shutdown = LN_connInfo.conn!
        let send = await send_run
        this.logger!.debug(`${this.action.LN} send stream,result = ${JSON.stringify(send)} `)
        // (4) 校验结果
        if (send.err) {
            return { err: send.err, log: `${send.result?.msg}`}
        }
        let recv_info = await recv;
        this.logger!.debug(`${this.action.RN} recv stream,result = ${JSON.stringify(recv_info)} `)
        if (recv_info.err) {
            return { err: recv_info.err, log: `${recv_info.result?.msg}` }
        }
        if (send.result!.hash != recv_info.result!.hash) {
            return { err: BDTERROR.CheckHashFailed, log: "SendStreamAction recv data hash error" }
        }
        // (5) 保存数据
        if (!this.action.info) {
            this.action.info = {};
        }
        this.action.send_time = send.result!.time;
        this.action.info!.hash_LN = send.result!.hash;
        this.action.info!.hash_RN = recv_info.result!.hash!;

        return { err: BDTERROR.success, log: "SendStreamAction run success" }
    }
}