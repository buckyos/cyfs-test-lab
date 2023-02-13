import { ErrorCode, sleep } from '../../../base';
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
        let send = await stream_ln.tcp_stream!.send(this.action.fileSize!);
        if(send.result){
            return { err: send.result, log: send.msg }
        }
        let recv  = stream_rn.tcp_stream!.recv_cookie.get(send.sequence_id);
        if(!recv){
            // 5s重试一次,避免事件还未触发
            await sleep(5000);
            recv  = stream_rn.tcp_stream!.recv_cookie.get(send.sequence_id)
            if(!recv){
                return { err: ErrorCode.notFound, log: "RN check recv data failed"}
            }
        }
        this.action.send_time = send.send_time;
        this.action.info = {
            hash_LN : send.hash,
            hash_RN : recv.hash,
        }

        return { err: BDTERROR.success, log: "ConnectMutAction run success" }
    }
}