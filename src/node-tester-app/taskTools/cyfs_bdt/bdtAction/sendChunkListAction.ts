
import { RandomGenerator, sleep } from '../../../base';
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
        
        this.action.fileSize =this.action.chunkSize! * this.action.fileNum!;
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
        let chunk_list = []
        let calculate_time = 0;
        let set_time = 0;
        for(let i =0;i<this.action.fileNum!;i++){
            // RN生成测试文件
            let randFile = await RN.bdtClient!.util_client!.createFile(this.action.chunkSize!);
            if(randFile.err){
                return { err: BDTERROR.RandFileError, log: `${this.action.RN} send chunk create randFile failed` }
            }
            let trackChunk = await RN.bdtClient!.trackChunk(randFile.filePath!, this.action.fileSize!);
            if(trackChunk.err){
                return { err: BDTERROR.setChunckFailed, log: `${this.action.RN} send chunk setChunckFailed failed` }
            }
            calculate_time = calculate_time + trackChunk.calculate_time!;
            set_time = set_time + trackChunk.set_time!;
            chunk_list.push({chunk_id :trackChunk.chunk_id!} )
        }
        let task_name = RandomGenerator.string(15); 
        let download = await LN.bdtClient!.interestChunkList(RN.bdtClient!.device_object!, task_name,chunk_list);
        if (download.err) {
            return { err: BDTERROR.InterestChunkError, log: `interestChunkList run failed, interestChunk err = ${JSON.stringify(download)},LN = ${this.action.LN},RN = ${this.action.RN}` }
        }
        
        let check = await LN.bdtClient!.checkChunkListListener(download.session!, 2000, this.action.config.timeout);
        if (check.err) {
            return { err: BDTERROR.CheckChunkError, log: `checkChunkListListener run failed,checkChunkListener err = ${JSON.stringify(check.state)},LN = ${this.action.LN},RN = ${this.action.RN}` }
        }
        // (4) 校验结果
        // chunk 本身id基于hash计算,不需要校验
        // (5) 保存数据
        this.action.send_time = check.time
        this.action.info = {}
        this.action.calculate_time = calculate_time
        this.action.set_time = set_time
        this.action.send_time = check.time
        return { err: BDTERROR.success, log: "SendChunkListAction run success" }
    }
}
