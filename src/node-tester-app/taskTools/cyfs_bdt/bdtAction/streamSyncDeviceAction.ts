import { RandomGenerator, sleep } from '../../../base';
import { BDTERROR, ActionType, Agent, Testcase, Task, Action, ActionAbstract } from '../type'
import {BaseAction} from "./baseAction"
import {BdtPeerClient,BdtConnection} from "../bdtPeerClient"
import * as path from "../path";
export class StreamSyncDeviceAction extends BaseAction implements ActionAbstract {

    async send_device(LN : BdtConnection,RN :BdtConnection,send_path:string,save_path:string,file_name:string): Promise<{ err: number, log: string }>{
        let recv = RN!.recv_object(save_path,file_name);
        let send = await LN.send_object(send_path,1)
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
        return { err: BDTERROR.success, log: "send_object run success" }
    }
    async run(): Promise<{ err: number, log: string }> {
        // (1) 检查测试bdt 客户端
         for(let agentA of this.agentManager!.agentMap.values()){
            let cache_path =  agentA.cacheInfo!.LocalDeviceCache;
            let device_list = agentA.cacheInfo!.local_list; 
            let clientA = agentA.bdtPeerMap.get(`1`);
            if(!clientA){
                continue;
            }
            
            for(let agentB of this.agentManager!.agentMap.values()){
                if(agentA.tags == agentB.tags){
                    continue;
                }
                let save_cache =  agentB.cacheInfo!.RemoteDeviceCache;
                let clientB = agentB.bdtPeerMap.get(`1`);
                let conn_tag = RandomGenerator.string(20)
                let conn = await clientA!.connect(clientB!.device_object!,"",0,0,conn_tag);
                if(conn.err){
                    continue;
                }
                let check = await clientB!.remark_accpet_conn_name(conn.conn!.TempSeq, clientA!.peerid!, conn_tag);
                if (check.err) {
                    // 等待2s再试一次，监听事件可能有网络延时
                    await sleep(1000);
                    check = await clientB!.remark_accpet_conn_name(conn.conn!.TempSeq, clientA!.peerid!, conn_tag);
                    if (check.err) {
                        continue;
                    }
                }
                for(let device of device_list){
                    let send_path = path.join(cache_path,device);
                    let save_path = save_cache;
                    let result =  await this.send_device(conn.conn!,check.conn!,send_path,save_path,device);
                    if (result.err){
                        continue;
                    }
                }
                
            }            
         } ;
        // (2) 构造测试数据
        
        return { err: BDTERROR.success, log: "SendFileAction run success" }
    }
}