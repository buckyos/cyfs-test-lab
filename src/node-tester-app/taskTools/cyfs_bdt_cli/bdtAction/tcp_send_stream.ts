import { sleep } from '../../../base';
import { BDTERROR, ActionType, Agent, Testcase, Task, Action, ActionAbstract } from '../type'
import {BaseAction} from "./base_action"

export class TcpSendStreamAction extends BaseAction implements ActionAbstract {
    async run(): Promise<{ err: number, log: string }> {
        this.action.type = ActionType.tcp_send_stream;
        // (1) 检查测试bdt 客户端
        let LN = await this.agentManager!.get_bdt_peer_client(this.action.LN);
        if (LN.err) {
            return { err: LN.err, log: `${this.action.LN} bdt client not exist` }
        }
        let RN = await this.agentManager!.get_bdt_peer_client(this.action.RN!);
        if (RN.err) {
            return { err: RN.err, log: `${this.action.RN} bdt client not exist` }
        }
        // (2) 获取tcp 客户端
        let tcp_ln = LN.client!.tcp_server.get("22223")!;
        let tcp_rn = RN.client!.tcp_server.get("22223")!;
        // (3) 获取tcp stream 连接
        let stream_ln = await tcp_ln.get_tcp_stream(this.action.config.conn_tag!);
        let stream_rn = await tcp_rn.get_tcp_stream(this.action.config.conn_tag!);
        
        let recv_promise =  stream_rn.tcp_stream!.recv();
        let send = await stream_ln.tcp_stream!.send(this.action.fileSize!);
        let recv = await recv_promise;
        if(send.result){
            return { err: send.result, log: send.msg }
        }
        if(recv.result){
            return { err: recv.result, log: recv.msg }
        }
        this.action.send_time = send.send_time;
        this.action.info = {
            hash_LN : send.hash,
            hash_RN : recv.hash,
        }

        return { err: BDTERROR.success, log: "ConnectMutAction run success" }
    }
}