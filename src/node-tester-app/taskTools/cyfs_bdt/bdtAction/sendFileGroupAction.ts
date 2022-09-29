
import { RandomGenerator, sleep } from '../../../base';
import { BDTERROR, ActionType, Agent, Testcase, Task, Action, ActionAbstract } from '../type'
import {BaseAction} from "./baseAction"
import * as path from "../path";
import { number } from 'echarts';

export class SendFileGroupAction extends BaseAction implements ActionAbstract {
    async run(): Promise<{ err: number, log: string }> {
        // (1) 检查测试bdt 客户端

        let RN = await this.agentManager!.getBdtPeerClient(this.action.RN!);
        let Users = [];
        for(let i in this.action.Users){
            Users.push(await this.agentManager!.getBdtPeerClient(this.action.Users[Number(i)]));
        }
        if (RN.err) {
            return { err: RN.err, log: `${this.action.RN} bdt client not exist` }
        }

        // (2) 构造测试数据
        // RN生成测试文件
        let randFile = await RN.bdtClient!.util_client!.createFile(this.action.fileSize!);
        let calculate = await RN.bdtClient!.calculateFile(randFile.filePath!, this.action.fileSize!);
        if(calculate.err){
            return  { err: calculate.err, log: `SendFileGroupAction run failed, calculateFile err = ${JSON.stringify(calculate)},LN = ${this.action.LN},RN = ${this.action.RN}` }
        }
        // RN 将文件保存到BDT NDN 中
        let setRunning = RN.bdtClient!.setFile(randFile.filePath!, calculate.file!);
        let setResult = await setRunning;
        if(setResult.err){
            return { err: setResult.err, log: `SendFileGroupAction run failed, setFile err = ${JSON.stringify(setResult)},LN = ${this.action.LN},RN = ${this.action.RN}`} 
        }
        let runList = []
        for(let LN of Users){
            runList.push(new Promise<{action:Action,err:number,log:string}>(async(V)=>{
                let action  = this.action;
                action.action_id = action.action_id + RandomGenerator.string(10);
                
                // LN获取本地下载缓存文件路径
                let LNcachePath = await LN.bdtClient!.util_client!.getCachePath();
                // LN cache RN device 对象信息
                let prev = await LN.bdtClient!.addDevice(RN.bdtClient!.device_object!);
                if(prev){
                   V({ err: prev, log: `SendFileGroupAction run failed, addDevice err = ${JSON.stringify(prev)},LN = ${this.action.LN},RN = ${this.action.RN}`,action })
                }
                // (3) BDT 传输  File
                // cyfs-base 计算文件Object 
                
                let savePath = path.join(LNcachePath.cache_path!.file_download, randFile.fileName!)
                let download = await LN.bdtClient!.downloadFile(calculate.file!, savePath, RN.bdtClient!.peerid!)
                if(download.err){
                    V( { err: download.err, log: `SendFileGroupAction run failed, downloadFile err = ${JSON.stringify(download)},LN = ${this.action.LN},RN = ${this.action.RN}`,action }) 
                }
                    
                let check = await LN.bdtClient!.downloadTaskListener(download.session!, 2000, this.action.config.timeout);
                if(check.err){
                    V( { err: check.err, log: `SendFileGroupAction run failed, downloadTaskListener err = ${JSON.stringify(check)},LN = ${this.action.LN},RN = ${this.action.RN}`,action })
                }
                // (4) 校验结果
                let LN_hash = await LN.bdtClient!.util_client!.md5File(savePath);
                if (LN_hash.md5 != randFile.md5) {
                    V({ err: BDTERROR.recvDataFailed, log: `download file calculate md5 failed ,LN =${LN_hash.md5},RN = ${randFile.md5} `,action })
                }
                // (5) 保存数据
                action.send_time = check.time
                action.info = {}
                action.info.hash_LN = LN_hash.md5
                action.info.hash_RN = randFile.md5
                action.calculate_time = calculate.calculate_time
                action.set_time = setResult.set_time
            }));
            
        }
        for(let index in runList){
            let result =  await runList[index];
            result.action.result = {err:result.err,log:result.log}
            this.child_actions.push(result.action)
        } 
        return { err: BDTERROR.success, log: "SendFileGroupAction run success" }
    }
}