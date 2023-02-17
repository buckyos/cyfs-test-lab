

import { sleep } from '../../../../base';
import { BDTERROR, ActionType, Agent, Testcase, Task, Action, ActionAbstract } from '../../type'
import {BaseAction} from "../base_action"
import path from "path";


export class BdtTransChunkAction extends BaseAction implements ActionAbstract {
    async run(): Promise<{ err: number, log: string }> {
        // (1) 检查测试bdt 客户端
        this.action.type = ActionType.send_chunk
        let LN = await this.agentManager!.getBdtCli(this.action.LN);
        let RN = await this.agentManager!.getBdtCli(this.action.RN!);
        if (LN.err) {
            return { err: LN.err, log: `${this.action.LN} bdt client not exist` }
        }
        if (RN.err) {
            return { err: RN.err, log: `${this.action.RN} bdt client not exist` }
        }
        // (2) LN 生成随机文件
        let create_file = await (await this.agentManager!.get_bdt_peer_client(this.action.LN)).client!.util_client!.createFile(this.action.fileSize!);
        let rn_cache_path = (await this.agentManager!.get_bdt_peer_client(this.action.LN)).client!.util_client!.cachePath;
        // (3) LN 上传文件chunk到 BDT
        let publish_result = await LN.bdt_stack!.track_chunk(create_file.filePath!,this.action.chunkSize!);
        if(!publish_result.resp || !publish_result.resp.result){
            return { err: publish_result.resp!.result!, log: publish_result.resp!.msg!}
        }
        this.action.calculate_time = publish_result.resp.calculate_time;
        this.action.set_time = publish_result.resp.set_time;
        // (4) RN 创建chunk 下载任务
        let remotes = [LN.bdt_stack!.peerid];
        let save_path = path.join(rn_cache_path!.file_download,create_file.fileName!);
        let begin  = Date.now();
        let create_task_result = await RN.bdt_stack!.interest_chunk(publish_result.resp!.chunk_id);
        if(!create_task_result.resp || !create_task_result.resp.result){
            return { err: create_task_result.resp!.result!, log: create_task_result.resp!.msg!}
        }
        // (5) RN 检查chunk 下载完成
        // 预期最小速度 1 MB/s
        while(Date.now()>(begin + this.action.chunkSize!/1000)){
            let check_state = await RN.bdt_stack!.check_chunk(publish_result.resp!.chunk_id);
            if(!check_state.resp || !check_state.resp.result){
                return { err: check_state.resp!.result!, log: check_state.resp!.msg!}
            }
            if(check_state.resp!.state == 4){
                let send_time = Date.now() - begin;
                this.action.send_time = send_time;
                return { err: BDTERROR.success, log: "BdtTransChunkAction run success" }
            }
            await sleep(1000);
        }
        return { err: BDTERROR.timeout, log: "BdtTransChunkAction run timeout ,speed less than 1MB/s" }
    }
}