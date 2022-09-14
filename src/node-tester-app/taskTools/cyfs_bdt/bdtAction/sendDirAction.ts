import { sleep } from '../../../base';
import { BDTERROR, ActionType, Agent, Testcase, Task, Action, ActionAbstract } from '../type'
import {BaseAction} from "./baseAction"
import {BdtPeerClient} from "../bdtPeerClient"
import * as path from "../path";
export class SendDirAction extends BaseAction implements ActionAbstract {

    async send_object(LN : BdtPeerClient,RN :BdtPeerClient,obj_type:number,file_id:string): Promise<{ err: number, log: string }>{
        let LN_connInfo = await LN.getConnection(this.action.config.conn_tag!);
        let RN_connInfo = await RN.getConnection(this.action.config.conn_tag!);
        if (LN_connInfo.err || RN_connInfo.err) {
            return { err: BDTERROR.optExpectError, log: `conn not found,LN err = ${LN_connInfo.err} ,RN err = ${RN_connInfo.err}` }
        }
        let filePath = LN.util_client!.cachePath?.NamedObject!
        if(obj_type == 2){
            filePath = path.join(filePath,"file_obj")
        }else if(obj_type == 3){
            filePath = path.join(filePath,"dir_obj")
        }else if(obj_type == 4){
            filePath = path.join(filePath,"dir_map")
        }
        filePath = path.join(filePath,file_id)
        // (3) 传输 BDT Stream
        let recv = RN_connInfo.conn!.recv_object(RN.util_client!.cachePath!.NamedObject);
        let send = await LN_connInfo.conn!.send_object(filePath,obj_type)
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
        let randFile = await RN.bdtClient!.util_client!.createDir(this.action.fileNum!,this.action.fileSize!,1,1);
        // LN获取本地下载缓存文件路径
        let LNcachePath = await LN.bdtClient!.util_client!.getCachePath();
        // LN cache RN device 对象信息
        let prev = await LN.bdtClient!.addDevice(RN.bdtClient!.device_object!);
        // (3) RN set Dir
        let setDir = await RN.bdtClient!.setDir(randFile.dirPath!, RN.bdtClient!.util_client!.cachePath?.NamedObject!,this.action.chunkSize!);
        // (4) BDT 传输  NameObject
        let send_object = await this.send_object(RN.bdtClient!,LN.bdtClient!,3,setDir.dir_id!)
        if(send_object.err){
            this.logger!.error(send_object.log)
            return send_object
        }
        for(let file of setDir.dir_map!){
            let send_object = await this.send_object(RN.bdtClient!,LN.bdtClient!,2,file.file_id)
            if(send_object.err){
                this.logger!.error(send_object.log)
                return send_object
            }
        }
        // cyfs-base 计算文件Object 
        let peer_id:string = RN.bdtClient!.peerid!
        let mkdir = await LN.bdtClient!.util_client!.createPath(randFile.dirName!);
        let download_dir = await LN.bdtClient!.downloadDir(LN.bdtClient!.util_client!.cachePath!.file_download,randFile.dirName!,peer_id,LN.bdtClient!.util_client!.cachePath!.NamedObject!,setDir.dir_id!,setDir.dir_map!)
        // RN 将文件保存到BDT NDN 中
     
        let check = await LN.bdtClient!.downloadDirTaskListener(download_dir.session!, 2000, this.action.config.timeout);
       
        // (5) 保存数据
        this.action.send_time = check.time
        this.action.fileSize = this.action.fileSize! * this.action.fileNum!
        this.action.info = {}
        this.action.send_time = check.time
        return { err: BDTERROR.success, log: "SendFileAction run success" }
    }
}