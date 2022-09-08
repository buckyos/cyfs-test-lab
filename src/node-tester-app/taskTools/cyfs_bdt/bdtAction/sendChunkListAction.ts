
import { sleep } from '../../../base';
import { BDTERROR, ActionType, Agent, Testcase, Task, Action, ActionAbstract } from '../type'
import {BaseAction} from "./baseAction"
import * as path from "path"

export class SendChunkListAction extends BaseAction implements ActionAbstract {
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
        // LN获取本地下载缓存文件路径
        let LNcachePath = await LN.bdtClient!.util_client!.getCachePath();
        // LN cache RN device 对象信息
        let prev = await LN.bdtClient!.addDevice(RN.bdtClient!.device_object!);

        // (3) BDT 传输  File
        // cyfs-base 计算chunk
        let calculate = await RN.bdtClient!.calculateChunk(randFile.filePath!, this.action.fileSize!);
        // RN 将文件保存到BDT NDN 中
        let setRunning = RN.bdtClient!.setChunk(randFile.filePath!, calculate.chunk_id!);
        if (!this.action.config.not_wait_upload_finished) {
            let setResult = await setRunning;
        }
        let download = await LN.bdtClient!.interestChunk(RN.bdtClient!.device_object!, calculate.chunk_id!);
        let check = await LN.bdtClient!.checkChunkListener(calculate.chunk_id!, 2000, this.action.config.timeout);
        let setResult = await setRunning;
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
