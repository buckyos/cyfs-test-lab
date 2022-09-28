import { sleep } from '../../../base';
import { BDTERROR, ActionType, Agent, Testcase, Task, Action, ActionAbstract } from '../type'
import {BaseAction} from "./baseAction"
import * as mypath from "../path"
export class ConnectListAction extends BaseAction implements ActionAbstract {
    async run(): Promise<{ err: number, log: string }> {

        // (1) 检查测试bdt 客户端
        let LN = await this.agentManager!.getBdtPeerClient(this.action.LN);
        let LN_agent = await this.agentManager!.getAgent(this.action.LN.split("$")[0]);
        if (LN.err) {
            return { err: LN.err, log: `${this.action.LN} bdt client not exist` }
        }
        let remote_list = LN_agent.agent!.cacheInfo!.remote_list;
        let remote_desc_list = [];
        for(let device of remote_list){
            remote_desc_list.push({
                device_path : mypath.join(LN_agent.agent!.cacheInfo!.RemoteDeviceCache,device)
            })
        }
        let FirstQ = ""
        // 判断是否要发起直连，默认不直连
        if (!this.action.config!.known_eps) {
            this.action.config!.known_eps = 0
        }
        let runInfo = await LN.bdtClient!.connectList(remote_desc_list,FirstQ, this.action.config!.known_eps, this.action.config!.accept_answer!, this.action.config!.conn_tag!)
        this.logger!.info(`### ConnectListAction = ${runInfo.records!}`)
        
        return { err: BDTERROR.success, log: "ConnectAction run success" }
    }
}