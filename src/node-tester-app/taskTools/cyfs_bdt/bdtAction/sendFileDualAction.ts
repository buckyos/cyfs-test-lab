
import { sleep } from '../../../base';
import { BDTERROR, ActionType, Agent, Testcase, Task, Action, ActionAbstract } from '../type'
import {BaseAction} from "./baseAction"
import * as path from "../path";

export class SendFileDualAction extends BaseAction implements ActionAbstract {
    async run(): Promise<{ err: number, log: string }> {
        // (1) 检查测试bdt 客户端

        let LN = await this.agentManager!.getBdtPeerClient(this.action.LN);
        let RN = await this.agentManager!.getBdtPeerClient(this.action.RN!);
        let User = await this.agentManager!.getBdtPeerClient(this.action.Users![0]);
        if (LN.err) {
            return { err: LN.err, log: `${this.action.LN} bdt client not exist` }
        }
        if (RN.err) {
            return { err: RN.err, log: `${this.action.RN} bdt client not exist` }
        }
        if (User.err) {
            return { err: User.err, log: `${this.action.Users![0]} bdt client not exist` }
        }
        // (2) 构造测试数据
        // RN生成测试文件
        let randFile = await RN.bdtClient!.util_client!.createFile(this.action.fileSize!);
        // LN获取本地下载缓存文件路径
        let LNcachePath = await LN.bdtClient!.util_client!.getCachePath();
        let UserCachePath = await User.bdtClient!.util_client!.getCachePath();
        // LN cache RN device 对象信息
        let prev = await LN.bdtClient!.addDevice(RN.bdtClient!.device_object!);
        if(prev){
            return { err: prev, log: `SendFileAction run failed, addDevice err = ${JSON.stringify(prev)},LN = ${this.action.LN},RN = ${this.action.RN}` }
        }
        // (3) BDT 传输  File
        // cyfs-base 计算文件Object 
        let calculate = await RN.bdtClient!.calculateFile(randFile.filePath!, this.action.fileSize!);
        if(calculate.err){
            return { err: calculate.err, log: `SendFileAction run failed, calculateFile err = ${JSON.stringify(calculate)},LN = ${this.action.LN},RN = ${this.action.RN}` }
        }
        // RN 将文件保存到BDT NDN 中
        let setRunning = RN.bdtClient!.setFile(randFile.filePath!, calculate.file!);
        if (!this.action.config.not_wait_upload_finished) {
            let setResult = await setRunning;
            if(setResult.err){
                return { err: setResult.err, log: `SendFileAction run failed, setFile err = ${JSON.stringify(setResult)},LN = ${this.action.LN},RN = ${this.action.RN}` }
            }
        }
        // User 先下载文件
        {
            let prev = await User.bdtClient!.addDevice(RN.bdtClient!.device_object!);
            if(prev){
                return { err: prev, log: `SendFileAction run failed, addDevice err = ${JSON.stringify(prev)},User = ${this.action.Users![0]},RN = ${this.action.RN}` }
            }
            let savePath = path.join(UserCachePath.cache_path!.file_download, randFile.fileName!)
            let download = await User.bdtClient!.downloadFile(calculate.file!, savePath, RN.bdtClient!.peerid!)
            if(download.err){
                return { err: download.err, log: `SendFileAction run failed, downloadFile err = ${JSON.stringify(download)},LN = ${this.action.LN},RN = ${this.action.RN}` }
            }
                
            let check = await User.bdtClient!.downloadTaskListener(download.session!, 2000, this.action.config.timeout);
            if(check.err){
                return { err: check.err, log: `SendFileAction run failed, downloadTaskListener err = ${JSON.stringify(check)},LN = ${this.action.LN},RN = ${this.action.RN}` }
            }
        }
        // LN 从User 和 RN 下载文件
        let savePath = path.join(LNcachePath.cache_path!.file_download, randFile.fileName!)
        let download = await LN.bdtClient!.downloadFile(calculate.file!, savePath, RN.bdtClient!.peerid!,User.bdtClient!.peerid!)
        if(download.err){
            return { err: download.err, log: `SendFileAction run failed, downloadFile err = ${JSON.stringify(download)},LN = ${this.action.LN},RN = ${this.action.RN}` }
        }
            
        let check = await LN.bdtClient!.downloadTaskListener(download.session!, 2000, this.action.config.timeout);
        if(check.err){
            return { err: check.err, log: `SendFileAction run failed, downloadTaskListener err = ${JSON.stringify(check.state)},LN = ${this.action.LN},RN = ${this.action.RN}` }
        }
        let setResult = await setRunning;
        if(setResult.err){
            return { err: setResult.err, log: `SendFileAction run failed, setFile err = ${JSON.stringify(setResult)},LN = ${this.action.LN},RN = ${this.action.RN}` }
        }
        // (4) 校验结果
        let LN_hash = await LN.bdtClient!.util_client!.md5File(savePath);
        if (LN_hash.md5 != randFile.md5) {
            return { err: BDTERROR.recvDataFailed, log: `download file calculate md5 failed ,LN =${LN_hash.md5},RN = ${randFile.md5} ` }
        }
        // (5) 保存数据
        this.action.send_time = check.time
        this.action.info = {}
        this.action.info.hash_LN = LN_hash.md5
        this.action.info.hash_RN = randFile.md5
        this.action.calculate_time = calculate.calculate_time
        this.action.set_time = setResult.set_time
        this.action.send_time = check.time
        return { err: BDTERROR.success, log: "SendFileAction run success" }
    }
}