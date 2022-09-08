

import { sleep } from '../../../base';
import { BDTERROR, ActionType, Agent, Testcase, Task, Action, ActionAbstract } from '../type'
import {BaseAction} from "./baseAction"

export class SendStreamAction extends BaseAction implements ActionAbstract {
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
        // (2) 检查连接是否存在
        let LN_connInfo = await LN.bdtClient!.getConnection(this.action.config.conn_tag!);
        let RN_connInfo = await RN.bdtClient!.getConnection(this.action.config.conn_tag!);
        if (LN_connInfo.err || RN_connInfo.err) {
            return { err: BDTERROR.optExpectError, log: `conn not found,LN err = ${LN_connInfo.err} ,RN err = ${RN_connInfo.err}` }
        }
        // (3) 传输 BDT Stream
        let recv = RN_connInfo.conn!.recv();
        let send = await LN_connInfo.conn!.send(this.action.fileSize!)
        this.logger!.debug(`${this.action.LN} send stream,result = ${JSON.stringify(send)} `)
        // (4) 校验结果
        if (send.err) {
            return { err: BDTERROR.sendDataFailed, log: `${this.action.LN} send stream failed` }
        }
        let recvInfo = await recv;
        this.logger!.debug(`${this.action.RN} recv stream,result = ${JSON.stringify(recvInfo)} `)
        if (recvInfo.err) {
            return { err: BDTERROR.recvDataFailed, log: `${this.action.RN} recv stream failed` }
        }
        if (send.hash != recvInfo.hash) {
            return { err: BDTERROR.sendDataFailed, log: "SendStreamAction recv data hash error" }
        }
        // (5) 保存数据
        if (!this.action.info) {
            this.action.info = {};
        }
        this.action.send_time = send.time;
        this.action.info!.hash_LN = send.hash;
        this.action.info!.hash_RN = recvInfo.hash!;

        return { err: BDTERROR.success, log: "SendStreamAction run success" }
    }
}