
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
        let calculate = await RN.bdtClient!.sendFile(randFile.filePath!, this.action.chunkSize!);
        
        if(calculate.err){
            return  { err: calculate.err, log: `SendFileGroupAction run failed, calculateFile err = ${JSON.stringify(calculate)},LN = ${this.action.LN},RN = ${this.action.RN}` }
        }
        this.action.calculate_time = calculate.calculate_time;
        // RN 将文件保存到BDT NDN 中
        let setResult = calculate;
        if(setResult.err){
            return { err: setResult.err, log: `SendFileGroupAction run failed, setFile err = ${JSON.stringify(setResult)},LN = ${this.action.LN},RN = ${this.action.RN}`} 
        }
        if(this.action.fileSize! >100*1024*1024){
            await sleep(10*1000);
        }
        this.action.set_time = setResult.set_time;
        let runList = []
        let begin_time = Date.now();
        let index = 0;
        for(let LN of Users){
            runList.push(new Promise<{action:Action,err:number,log:string}>(async(V)=>{
                
                const action : Action  =  JSON.parse(JSON.stringify(this.action));
                if(LN.err){
                    V({err:BDTERROR.AgentError,log:`${this.action.Users![index]} not exist`,action})
                }
                action.action_id = action.action_id + "_" + this.action.Users![index];
                action.parent_action = this.action.action_id;
                action.LN = this.action.Users![index];
                index++;
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
                    
                let check = await LN.bdtClient!.downloadTaskListener(download.session!, 5000, this.action.config.timeout);
                if(check.err){
                    V( { err: check.err, log: `SendFileGroupAction run failed, downloadTaskListener err = ${JSON.stringify(check.state)},LN = ${this.action.LN},RN = ${this.action.RN}`,action })
                }
                // (5) 保存数据
                action.send_time = check.time
                action.info = {}
                action.info.hash_RN = randFile.md5
                action.calculate_time = calculate.calculate_time
                action.set_time = setResult.set_time
                V({err:BDTERROR.success,log:`SendFileGroupAction run success`,action})
            }));
            
        }
        for(let index in runList){
            let result =  await runList[index];
            result.action.result = {err:result.err,log:result.log}
            this.logger?.info(`#### child_actions ${result.action.action_id} run finished`)
            this.child_actions.push(result.action)
        }
        this.action.fileSize = this.action.fileSize! * this.action.Users!.length;
        this.action.send_time = (Date.now() - begin_time)*1000;
        this.action.type = ActionType.send_file_group; 
        return { err: BDTERROR.success, log: "SendFileGroupAction run success" }
    }
}