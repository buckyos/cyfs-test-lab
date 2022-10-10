
import { sleep } from '../../../base';
import { BDTERROR, ActionType, Agent, Testcase, Task, Action, ActionAbstract } from '../type'
import {BaseAction} from "./baseAction"
import * as path from "path"
export class SendChunkAction extends BaseAction implements ActionAbstract {
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

        // (2) 构造测试数据
        // RN生成测试文件
        let randFile = await RN.bdtClient!.util_client!.createFile(this.action.chunkSize!);
        if(randFile.err){
            return { err: BDTERROR.RandFileError, log: `${this.action.RN} send chunk create randFile failed` }
        }
        this.action.fileSize =this.action.chunkSize;
        // LN获取本地下载缓存文件路径
        let LNcachePath = await LN.bdtClient!.util_client!.getCachePath();
        if(LNcachePath.err){
            return { err: BDTERROR.GetCachePathError, log: `${this.action.LN} send chunk get cache path failed` }
        }
        // LN cache RN device 对象信息
        let prev = await LN.bdtClient!.addDevice(RN.bdtClient!.device_object!);
        if(prev){
            return { err: BDTERROR.AddDeviceError, log: `SendChunkAction run failed, addDevice err = ${JSON.stringify(prev)},LN = ${this.action.LN},RN = ${this.action.RN}` }
        }
        // (3) BDT 传输  File
        // cyfs-base 计算chunk
        let calculate = await RN.bdtClient!.calculateChunk(randFile.filePath!, this.action.fileSize!);
        if(calculate.err){
            return { err: BDTERROR.CalculateChunkError, log: `${this.action.LN} calculate chunk failed` }
        }
        // RN 将文件保存到BDT NDN 中
        let setRunning = RN.bdtClient!.setChunk(randFile.filePath!, calculate.chunk_id!,this.action.fileSize!);
       
        // 判断是否要等待上传完成
        if (!this.action.config.not_wait_upload_finished) {
            let setResult = await setRunning;
            this.logger?.info(`calculate = ${calculate.chunk_id},setResult = ${setResult.chunk_id}`)
            if (setResult.err) {
                return { err: BDTERROR.SetChunkError, log: `SendChunkAction run failed,setChunk err = ${JSON.stringify(setResult)},LN = ${this.action.LN},RN = ${this.action.RN}` }
            }
        }
        let download = await LN.bdtClient!.interestChunk(RN.bdtClient!.device_object!, calculate.chunk_id!);
        if (download.err) {
            return { err: BDTERROR.InterestChunkError, log: `SendChunkAction run failed, interestChunk err = ${JSON.stringify(download)},LN = ${this.action.LN},RN = ${this.action.RN}` }
        }
        let check = await LN.bdtClient!.checkChunkListener(calculate.chunk_id!, 2000, this.action.config.timeout);
        if (check.err) {
            return { err: BDTERROR.CheckChunkError, log: `SendChunkAction run failed,checkChunkListener err = ${JSON.stringify(check.state)},LN = ${this.action.LN},RN = ${this.action.RN}` }
        }
        let setResult = await setRunning;
        this.logger?.info(`calculate = ${calculate.chunk_id},setResult = ${setResult.chunk_id}`)
        // (4) 校验结果
        // chunk 本身id基于hash计算,不需要校验
        // (5) 保存数据
        this.action.send_time = check.time
        this.action.info = {}
        this.action.calculate_time = calculate.calculate_time
        this.action.set_time = setResult.set_time
        this.action.send_time = check.time
        return { err: BDTERROR.success, log: "SendChunkAction run success" }
    }
}