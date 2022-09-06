import { ErrorCode, RandomGenerator, Logger, TaskClientInterface, ClientExitCode, sleep } from '../../base';
import { AgentManager } from './agentManager'
import { BDTERROR, ActionType, Agent, Testcase, Task, Action, ActionAbstract } from './type'
import { request, ContentType } from "./request"


import * as path from "path"

export class ActionBase {
    public action: Action
    public m_interface?: TaskClientInterface;
    public agentManager?: AgentManager;
    public logger?: Logger;
    public state: string;
    public errorInfo: string;
    constructor(action: Action) {
        this.action = action;
        this.state = "new";
        this.errorInfo = "";
    }
    async checkAgent() {
        this.state = "ready";
        await this.agentManager!.checkBdtPeerClient(this.action.LN)
    }
    async init(_interface: TaskClientInterface, task?: Task): Promise<{ err: number, log: string }> {
        this.m_interface = _interface;
        this.logger = _interface.getLogger();
        this.agentManager = AgentManager.createInstance(_interface);
        this.state = "init";
        await this.checkAgent();
        return { err: BDTERROR.success, log: "task run success" }
    }
    async save(): Promise<{ err: number, log: string }> {
        this.state = "finished"
        return { err: BDTERROR.success, log: "task run success" }
    }
}

export class ConnectAction extends ActionBase implements ActionAbstract {
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
        // (2) ConnectAction 操作的参数设置
        // 判断LN是否要进行FristQA  question数据发送
        let FirstQ = ""
        if (this.action.config!.firstQA_question) {
            FirstQ = this.action.config!.firstQA_question!;
            this.action.fileSize = Buffer.byteLength(this.action.config!.firstQA_question!)
        }
        // 判断RN是否要进行FristQA,answer 数据设置
        if (this.action.config!.firstQA_answer) {
            let err = await RN.bdtClient!.set_answer(this.action.config!.firstQA_answer);
            if (err) {
                return { err: BDTERROR.connnetFailed, log: `${this.action.RN!} set_answer info failed ` }
            }
        }
        // 判断是否要发起直连，默认不直连
        if (!this.action.config!.known_eps) {
            this.action.config!.known_eps = 0
        }
        // (3) ConnectAction 建立连接
        let info = await LN!.bdtClient!.connect(RN!.bdtClient!.device_object!, FirstQ, this.action.config!.known_eps, this.action.config!.accept_answer!, this.action.config!.conn_tag!)
        // (4) ConnectAction 建立连接对结果的检查
        if (info.err) {
            return { err: BDTERROR.connnetFailed, log: `${this.action.LN} conenct ${this.action.RN!} err =${info.err}` }
        }
        this.logger!.info(`${this.action.LN} conenct ${this.action.RN} success,time = ${info.time!} ,stream_name = ${info.conn!.stream_name}`)
        // 检查fristQA answer 
        if (info.answer) {
            if (info.answer != RN!.bdtClient!.FristQA_answer) {
                return { err: BDTERROR.connnetFailed, log: `${this.action.LN!} conenct ${this.action.RN!} , FristQA answer is error` }
            }
        }
        //校验RN 连接成功
        let check = await RN.bdtClient!.remark_accpet_conn_name(info.conn!.TempSeq, LN!.bdtClient!.peerid!, this.action.config!.conn_tag);
        if (check.err) {
            // 等待2s再试一次，监听事件可能有网络延时
            await sleep(2000);
            check = await await RN.bdtClient!.remark_accpet_conn_name(info.conn!.TempSeq, LN!.bdtClient!.peerid!, this.action.config!.conn_tag);
            if (check.err) {
                return { err: BDTERROR.connnetFailed, log: ` ${this.action.RN!} confirm failed` }
            }
        } 
        if(check.conn!.TempSeq != info.conn!.TempSeq){
            return { err: BDTERROR.connnetFailed, log: `${this.action.LN!} conenct ${this.action.RN!} , ${check.conn!.TempSeq} != ${info.conn!.TempSeq}` } 
        }
         // 检查FirstQA question 和 answer
        if (check.conn?.question!) {
            if (check.conn?.question! != FirstQ) {
                return {err:BDTERROR.connnetFailed,log:`${this.action.LN} conenct ${this.action.RN} , FristQA question is error`}
            }
        }
        // (5) 保存测试数据
        if (!this.action.info) {
            this.action.info = { conn: [] };
        } else {
            this.action.info.conn = [];
        }
        this.action.info!.conn!.push(info.conn!.stream_name!);
        this.action.connect_time = info.time
        this.action.info!.conn_name = info.conn!.stream_name
        return { err: BDTERROR.success, log: "ConnectAction run success" }
    }
}
export class CloseConnectAction extends ActionBase implements ActionAbstract {
    async run(): Promise<{ err: number, log: string }> {

        // (1) 检查测试bdt 客户端
        let LN = await this.agentManager!.getBdtPeerClient(this.action.LN);
        if (LN.err) {
            return { err: LN.err, log: `${this.action.LN} bdt client not exist` }
        }
        let info =await LN.bdtClient!.getConnection(this.action.config.conn_tag!); 
        if(info.err){
            return { err: info.err, log: `${this.action.LN} Connecion ${this.action.config.conn_tag!} not exist` } 
        }
        let close = await info.conn!.close();
        if(close){
            return { err: close, log: `${this.action.LN} Connecion ${this.action.config.conn_tag!} close failed` } 
        }
        return { err: BDTERROR.success, log: "CloseConnectAction run success" }
    }
}
export class DestoryAction extends ActionBase implements ActionAbstract {
    async run(): Promise<{ err: number, log: string }> {

        // (1) 检查测试bdt 客户端
        let LN = await this.agentManager!.getBdtPeerClient(this.action.LN);
        if (LN.err) {
            return { err: LN.err, log: `${this.action.LN} bdt client not exist` }
        }
        let info  = await LN.bdtClient!.destory();
        if(info){
            return { err: BDTERROR.success, log: `${this.action.LN} destory bdt client failed`}
        }
        return { err: BDTERROR.success, log: "DestoryAction run success" }
    }
}
export class SendStreamAction extends ActionBase implements ActionAbstract {
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
        // (2) 检查连接是否存在
        let LN_connInfo = await LN.bdtClient!.getConnection(this.action.config.conn_tag!);
        let RN_connInfo = await RN.bdtClient!.getConnection(this.action.config.conn_tag!);
        if (LN_connInfo.err || RN_connInfo.err) {
            return { err: BDTERROR.optExpectError, log: `conn not found,LN err = ${LN_connInfo.err} ,RN err = ${RN_connInfo.err}` }
        }
        // (3) 传输 BDT Stream
        let recv = RN_connInfo.conn!.recv();
        let send = await LN_connInfo.conn!.send(this.action.fileSize!)
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
        // (5) 保存数据
        if (!this.action.info) {
            this.action.info = {};
        }
        this.action.send_time = send.time;
        this.action.info!.hash_LN = send.hash;
        this.action.info!.hash_RN = recvInfo.hash!;

        return { err: BDTERROR.success, log: "SendStreamAction run success" }
    }
}
export class SendStreamNotReadAction extends ActionBase implements ActionAbstract {
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
        // (2) 检查连接是否存在
        let LN_connInfo = await LN.bdtClient!.getConnection(this.action.config.conn_tag!);

        if (LN_connInfo.err ) {
            return { err: BDTERROR.optExpectError, log: `conn not found,LN err = ${LN_connInfo.err} ,` }
        }
        // (3) 传输 BDT Stream
   
        let send = await LN_connInfo.conn!.send(this.action.fileSize!)
        this.logger!.debug(`${this.action.LN} send stream,result = ${JSON.stringify(send)} `)
        // (4) 校验结果
        if (send.err) {
            return { err: BDTERROR.sendDataFailed, log: `${this.action.LN} send stream failed` }
        }

        // (5) 保存数据
        if (!this.action.info) {
            this.action.info = {};
        }
        this.action.send_time = send.time;
        this.action.info!.hash_LN = send.hash;
        return { err: BDTERROR.success, log: "SendStreamNotReadAction run success" }
    }
}
export class SendChunkAction extends ActionBase implements ActionAbstract {
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
        if(prev){
            return { err: prev, log: `SendChunkAction run failed, addDevice err = ${JSON.stringify(prev)},LN = ${this.action.LN},RN = ${this.action.RN}` }
        }
        // (3) BDT 传输  File
        // cyfs-base 计算chunk
        let calculate = await RN.bdtClient!.calculateChunk(randFile.filePath!, this.action.fileSize!);
        // RN 将文件保存到BDT NDN 中
        let setRunning = RN.bdtClient!.setChunk(randFile.filePath!, calculate.chunk_id!);
        if (!this.action.config.not_wait_upload_finished) {
            let setResult = await setRunning;
            if (setResult.err) {
                return { err: setResult.err, log: `SendChunkAction run failed,setChunk err = ${JSON.stringify(setResult)},LN = ${this.action.LN},RN = ${this.action.RN}` }
            }
        }
        let download = await LN.bdtClient!.interestChunk(RN.bdtClient!.device_object!, calculate.chunk_id!);
        if (download.err) {
            return { err: download.err, log: `SendChunkAction run failed, interestChunk err = ${JSON.stringify(download)},LN = ${this.action.LN},RN = ${this.action.RN}` }
        }
        let check = await LN.bdtClient!.checkChunkListener(calculate.chunk_id!, 2000, this.action.config.timeout);
        if (check.err) {
            return { err: check.err, log: `SendChunkAction run failed,checkChunkListener err = ${JSON.stringify(check)},LN = ${this.action.LN},RN = ${this.action.RN}` }
        }
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

export class SendChunkListAction extends ActionBase implements ActionAbstract {
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

export class SendFileAction extends ActionBase implements ActionAbstract {
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
        let randFile = await RN.bdtClient!.util_client!.createFile(this.action.fileSize!);
        // LN获取本地下载缓存文件路径
        let LNcachePath = await LN.bdtClient!.util_client!.getCachePath();
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
        let savePath = path.join(LNcachePath.cache_path!.file_download, randFile.fileName!)
        let download = await LN.bdtClient!.downloadFile(calculate.file!, savePath, RN.bdtClient!.peerid!)
        if(download.err){
            return { err: download.err, log: `SendFileAction run failed, downloadFile err = ${JSON.stringify(download)},LN = ${this.action.LN},RN = ${this.action.RN}` }
        }
            
        let check = await LN.bdtClient!.downloadTaskListener(download.session!, 2000, this.action.config.timeout);
        if(check.err){
            return { err: check.err, log: `SendFileAction run failed, downloadTaskListener err = ${JSON.stringify(check)},LN = ${this.action.LN},RN = ${this.action.RN}` }
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
export class SendFileRangeAction extends ActionBase implements ActionAbstract {
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
        let randFile = await RN.bdtClient!.util_client!.createFile(this.action.fileSize!);
        // LN获取本地下载缓存文件路径
        let LNcachePath = await LN.bdtClient!.util_client!.getCachePath();
        // LN cache RN device 对象信息
        let prev = await LN.bdtClient!.addDevice(RN.bdtClient!.device_object!);

        // (3) BDT 传输  File
        // cyfs-base 计算文件Object 
        let calculate = await RN.bdtClient!.calculateFile(randFile.filePath!, this.action.fileSize!);
        // RN 将文件保存到BDT NDN 中
        let setRunning = RN.bdtClient!.setFile(randFile.filePath!, calculate.file!);
        if (!this.action.config.not_wait_upload_finished) {
            let setResult = await setRunning;
        }
        let savePath = path.join(LNcachePath.cache_path!.file_download, randFile.fileName!)
        let download = await LN.bdtClient!.downloadFile(calculate.file!, savePath, RN.bdtClient!.peerid!)
        let check = await LN.bdtClient!.downloadTaskListener(download.session!, 2000, this.action.config.timeout);
        let setResult = await setRunning;
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
export class SendFileRedirectAction extends ActionBase implements ActionAbstract {
    async run(): Promise<{ err: number, log: string }> {
        // (1) 检查测试bdt 客户端

        let LN = await this.agentManager!.getBdtPeerClient(this.action.LN);
        let RN = await this.agentManager!.getBdtPeerClient(this.action.RN!);
        let CacheNode = await this.agentManager!.getBdtPeerClient(this.action.Users![0]);
        if (LN.err) {
            return { err: LN.err, log: `${this.action.LN} bdt client not exist` }
        }
        if (RN.err) {
            return { err: RN.err, log: `${this.action.RN} bdt client not exist` }
        }
        let ndn_event_target = CacheNode.bdtClient!.peerid!
        let ndn_event_type = this.action.config.restart!.ndn_event
        let add_cache = await RN.bdtClient!.restart(ndn_event_type,ndn_event_target)

        // (2) 构造测试数据
        // RN生成测试文件
        let randFile = await RN.bdtClient!.util_client!.createFile(this.action.fileSize!);
        // LN获取本地下载缓存文件路径
        let LNcachePath = await LN.bdtClient!.util_client!.getCachePath();
        // LN cache RN device 对象信息
        let prev = await LN.bdtClient!.addDevice(RN.bdtClient!.device_object!);
        if(prev){
            return { err: prev, log: `SendFileAction run failed, addDevice err = ${JSON.stringify(prev)},LN = ${this.action.LN},RN = ${this.action.RN}` }
        }
        // Cache Node 节点进行数据缓存
        if(this.action.config.ndn_event_config?.is_connect){
            
        }
        if(this.action.config.ndn_event_config?.is_cache_data){

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
        let savePath = path.join(LNcachePath.cache_path!.file_download, randFile.fileName!)
        let download = await LN.bdtClient!.downloadFile(calculate.file!, savePath, RN.bdtClient!.peerid!)
        if(download.err){
            return { err: download.err, log: `SendFileAction run failed, downloadFile err = ${JSON.stringify(download)},LN = ${this.action.LN},RN = ${this.action.RN}` }
        }
            
        let check = await LN.bdtClient!.downloadTaskListener(download.session!, 2000, this.action.config.timeout);
        if(check.err){
            return { err: check.err, log: `SendFileAction run failed, downloadTaskListener err = ${JSON.stringify(check)},LN = ${this.action.LN},RN = ${this.action.RN}` }
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
export class SendDirAction extends ActionBase implements ActionAbstract {
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
        let randFile = await RN.bdtClient!.util_client!.createFile(this.action.fileSize!);
        // LN获取本地下载缓存文件路径
        let LNcachePath = await LN.bdtClient!.util_client!.getCachePath();
        // LN cache RN device 对象信息
        let prev = await LN.bdtClient!.addDevice(RN.bdtClient!.device_object!);

        // (3) BDT 传输  File
        // cyfs-base 计算文件Object 
        let calculate = await RN.bdtClient!.calculateFile(randFile.filePath!, this.action.fileSize!);
        // RN 将文件保存到BDT NDN 中
        let setRunning = RN.bdtClient!.setFile(randFile.filePath!, calculate.file!);
        if (!this.action.config.not_wait_upload_finished) {
            let setResult = await setRunning;
        }
        let savePath = path.join(LNcachePath.cache_path!.file_download, randFile.fileName!)
        let download = await LN.bdtClient!.downloadFile(calculate.file!, savePath, RN.bdtClient!.peerid!)
        let check = await LN.bdtClient!.downloadTaskListener(download.session!, 2000, this.action.config.timeout);
        let setResult = await setRunning;
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