

import { RandomGenerator, sleep } from '../../../base';
import { BDTERROR, ActionType, Agent, Testcase, Task, Action, ActionAbstract } from '../type'
import {BaseAction} from "./baseAction"
import * as path from "../path";

export class SendFileListAction extends BaseAction implements ActionAbstract {
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
        let randFileList = []
        for(let i = 0;i<this.action.fileNum!;i++){
            randFileList.push(await RN.bdtClient!.util_client!.createFile(this.action.fileSize!)); 
        }
        // (2) 构造测试数据
        // RN生成测试文件
        
        // LN获取本地下载缓存文件路径
        let LNcachePath = await LN.bdtClient!.util_client!.getCachePath();
        // LN cache RN device 对象信息
        let prev = await LN.bdtClient!.addDevice(RN.bdtClient!.device_object!);
        if(prev){
            return { err: prev, log: `SendFileListAction run failed, addDevice err = ${JSON.stringify(prev)},LN = ${this.action.LN},RN = ${this.action.RN}` }
        }
        // (3) BDT 传输  File
        // cyfs-base 计算文件Object 
        await sleep(5000);
        let send_time = Date.now();
        for(let randFile of randFileList){
            let result = await new Promise<{err:number,log:string,action:Action}>(async(V)=>{
                const action : Action =  JSON.parse(JSON.stringify(this.action));
                action.action_id = action.action_id + "_" + RandomGenerator.string(10);
                action.parent_action = this.action.action_id;
                let calculate = await RN.bdtClient!.calculateFile(randFile.filePath!, action.fileSize!);
                if(calculate.err){
                    V({ err: calculate.err, log: `SendFileListAction run failed, calculateFile err = ${JSON.stringify(calculate)},LN = ${action.LN},RN = ${action.RN}`,action }) 
                }
                action.calculate_time = calculate.calculate_time;
                // RN 将文件保存到BDT NDN 中
                let setRunning = RN.bdtClient!.setFile(randFile.filePath!, calculate.file!);
                let setResult = await setRunning;
                if(action.fileSize!>100*1024*1024){
                    await sleep(10*1000);
                }
                if(setResult.err){
                    V({ err: setResult.err, log: `SendFileListAction run failed, setFile err = ${JSON.stringify(setResult)},LN = ${action.LN},RN = ${action.RN}`,action })
                }
                action.set_time = setResult.set_time;
                let savePath = path.join(LNcachePath.cache_path!.file_download, randFile.fileName!)
                let download = await LN.bdtClient!.downloadFile(calculate.file!, savePath, RN.bdtClient!.peerid!)
                if(download.err){
                    V({ err: download.err, log: `SendFileListAction run failed, downloadFile err = ${JSON.stringify(download)},LN = ${action.LN},RN = ${action.RN}` ,action }) 
                }
                    
                let check = await LN.bdtClient!.downloadTaskListener(download.session!, 2000, action.config.timeout);
                if(check.err){
                    V({ err: check.err, log: `SendFileListAction run failed, downloadTaskListener err = ${JSON.stringify(check.state)},LN = ${action.LN},RN = ${action.RN}` ,action })
                }
                action.send_time = send_time + check.time!;
                V({err:BDTERROR.success,log:`send file success`,action})
            })
            result.action.result = {err:result.err,log:result.log}
            this.logger?.info(`#### child_actions ${result.action.action_id} run finished`)
            this.child_actions.push(result.action)
            
        }
        // (5) 保存数据
        this.action.info = {}
        this.action.send_time = (Date.now() - send_time)*1000;
        this.action.fileSize = this.action.fileSize! * this.action.fileNum!;
        this.action.type = ActionType.send_file_list; 
        return { err: BDTERROR.success, log: "SendFileListAction run success" }
    }
}