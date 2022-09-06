import {ErrorCode, RandomGenerator, Logger, TaskClientInterface, ClientExitCode, sleep} from '../../base';
import {AgentClient,AgentManager,BdtPeerClient,BdtConnection} from './bdtTool'
import {BDTERROR,ActionType,Agent,Testcase,Task,Action,ActionAbstract} from './type'
import {request,ContentType} from "./request"

export class ActionBase {
    public action :Action
    public m_interface?:TaskClientInterface; 
    public agentManager? : AgentManager;
    public logger? : Logger;
    public state : string;
    public errorInfo : string;
    constructor(action:Action){
        this.action = action;
        this.state = "new";
        this.errorInfo = "";
    }
    async checkAgent(){
        this.state = "ready";
        await this.agentManager!.checkBdtPeerClient(this.action.LN) 
    }
    async init(_interface:TaskClientInterface,task?:Task):Promise<{err:number,log:string}> {
        this.m_interface = _interface;
        this.logger = _interface.getLogger();
        this.agentManager =  AgentManager.createInstance(_interface);
        this.state = "init";
        await this.checkAgent();  
        return {err:BDTERROR.success,log:"task run success"}
    }
    async save():Promise<{err:number,log:string}>{
        this.state = "finished" 
        return {err:BDTERROR.success,log:"task run success"}
    }
}

export class ConnectAction extends ActionBase implements ActionAbstract {
    async run():Promise<{err:number,log:string}>{

        // (1) 检查测试bdt 客户端
        let LN = await this.agentManager!.getBdtPeerClient(this.action.LN);
        let RN = await this.agentManager!.getBdtPeerClient(this.action.RN!);
        if(LN.err){
            return {err:LN.err,log:`${this.action.LN} bdt client not exist`}
        }
        if(RN.err){
            return {err:RN.err,log:`${this.action.RN} bdt client not exist`}
        }
        // (2) ConnectAction 操作的参数设置
        // 判断LN是否要进行FristQA  question数据发送
        let FirstQ = ""
        if(this.action.config!.firstQA_question){
            FirstQ = this.action.config!.firstQA_question!;
            this.action.fileSize = Buffer.byteLength(this.action.config!.firstQA_question!)
        }
        // 判断RN是否要进行FristQA,answer 数据设置
        if(this.action.config!.firstQA_answer){
            let err = await RN.bdtClient!.set_answer(this.action.config!.firstQA_answer);
            if(err){
                return {err:BDTERROR.connnetFailed,log:`${this.action.RN!} set_answer info failed `}
            }
        }
        // 判断是否要发起直连，默认不直连
        if(!this.action.config!.known_eps){
            this.action.config!.known_eps = 0
        }
        // (3) ConnectAction 建立连接
        let info =  await LN!.bdtClient!.connect(RN!.bdtClient!.device_object!,FirstQ, this.action.config!.known_eps,this.action.config!.accept_answer!,this.action.config!.conn_tag!) 
        // (4) ConnectAction 建立连接对结果的检查
        if(info.err){
            return {err:BDTERROR.connnetFailed,log:`${this.action.LN} conenct ${this.action.RN!} err =${info.err}`}
        }
        this.logger!.info(`${this.action.LN} conenct ${this.action.RN} success,time = ${info.time!}`)
        // 检查fristQA answer 
        if(info.answer){
            if(info.answer != RN!.bdtClient!.FristQA_answer){
                return {err:BDTERROR.connnetFailed,log:`${ this.action.LN!} conenct ${this.action.RN!} , FristQA answer is error`}
            }
        }
        //校验RN 连接成功
        let check = await RN.bdtClient!.remark_accpet_conn_name(info.conn!.stream_name,LN!.bdtClient!.peerid!,this.action.config!.conn_tag);
        if(check.err){
            return {err:BDTERROR.connnetFailed,log:` ${this.action.RN!} confirm failed`}
        }
        
        if(check.conn?.question!){
            if(check.conn?.question! != FirstQ){
                //return {err:BDTERROR.connnetFailed,log:`${action.LN!.peer?.tags} conenct ${action.RN!.peer?.tags} , FristQA question is error`}
            }
        }
        // (5) 保存测试数据
        if(!this.action.info){
            this.action.info = {conn : []};
        }else{
            this.action.info.conn = [];
        }
        this.action.info!.conn!.push(info.conn!.stream_name!); 
        this.action.connect_time = info.time
        this.action.info!.conn_name = info.conn!.stream_name
        return {err:BDTERROR.success,log:"ConnectAction run success"}
    }
}

export class SendStreamAction extends ActionBase implements ActionAbstract {
    async run():Promise<{err:number,log:string}>{
        // (1) 检查测试bdt 客户端
        let LN = await this.agentManager!.getBdtPeerClient(this.action.LN);
        let RN = await this.agentManager!.getBdtPeerClient(this.action.RN!);
        if(LN.err){
            return {err:LN.err,log:`${this.action.LN} bdt client not exist`}
        }
        if(RN.err){
            return {err:RN.err,log:`${this.action.RN} bdt client not exist`}
        }
        // (2) 检查连接是否存在
        let LN_connInfo = await LN.bdtClient!.getConnecion(this.action.config.conn_tag!);
        let RN_connInfo = await RN.bdtClient!.getConnecion(this.action.config.conn_tag!);
        if(LN_connInfo.err || RN_connInfo.err){
            return {err:BDTERROR.optExpectError,log:`conn not found,LN err = ${LN_connInfo.err} ,RN err = ${RN_connInfo.err}`}
        }
        // (3) 传输 BDT Stream
        let recv =  RN_connInfo.conn!.recv();
        let send = await LN_connInfo.conn!.send(this.action.fileSize!)
        this.logger!.debug(`${this.action.LN} send stream,result = ${ JSON.stringify(send) } `)
        // (4) 校验结果
        if(send.err){
            return {err:BDTERROR.sendDataFailed,log:`${this.action.LN} send stream failed`}
        }
        let recvInfo = await recv;
        this.logger!.debug(`${this.action.RN} recv stream,result = ${JSON.stringify(recvInfo)} `)
        if(recvInfo.err){
            return {err:BDTERROR.recvDataFailed,log:`${this.action.RN} recv stream failed`}
        }
        if(send.hash != recvInfo.hash){
            return {err:BDTERROR.sendDataFailed,log:"SendStreamAction recv data hash error"}
        }
        // (5) 保存数据
        if(!this.action.info){
            this.action.info = {};
        }
        this.action.send_time = send.time;
        this.action.info!.hash_LN = send.hash;
        this.action.info!.hash_RN = recvInfo.hash!;
        
        return {err:BDTERROR.success,log:"SendStreamAction run success"}
    }
}

export class SendChunkAction extends ActionBase implements ActionAbstract {
    async run():Promise<{err:number,log:string}>{
        // (1) 检查测试bdt 客户端
        let LN = await this.agentManager!.getBdtPeerClient(this.action.LN);
        let RN = await this.agentManager!.getBdtPeerClient(this.action.RN!);
        if(LN.err){
            return {err:LN.err,log:`${this.action.LN} bdt client not exist`}
        }
        if(RN.err){
            return {err:RN.err,log:`${this.action.RN} bdt client not exist`}
        }
        // (2) 检查连接是否存在
        let LN_connInfo = await LN.bdtClient!.getConnecion(this.action.config.conn_tag!);
        let RN_connInfo = await RN.bdtClient!.getConnecion(this.action.config.conn_tag!);
        if(LN_connInfo.err || RN_connInfo.err){
            return {err:BDTERROR.optExpectError,log:`conn not found,LN err = ${LN_connInfo.err} ,RN err = ${RN_connInfo.err}`}
        }
        // (3) 传输 BDT Stream
        let recv =  RN_connInfo.conn!.recv();
        let send = await LN_connInfo.conn!.send(this.action.fileSize!)
        this.logger!.debug(`${this.action.LN} send stream,result = ${ JSON.stringify(send) } `)
        // (4) 校验结果
        if(send.err){
            return {err:BDTERROR.sendDataFailed,log:`${this.action.LN} send stream failed`}
        }
        let recvInfo = await recv;
        this.logger!.debug(`${this.action.RN} recv stream,result = ${JSON.stringify(recvInfo)} `)
        if(recvInfo.err){
            return {err:BDTERROR.recvDataFailed,log:`${this.action.RN} recv stream failed`}
        }
        if(send.hash != recvInfo.hash){
            return {err:BDTERROR.sendDataFailed,log:"SendStreamAction recv data hash error"}
        }
        // (5) 保存数据
        if(!this.action.info){
            this.action.info = {};
        }
        this.action.send_time = send.time;
        this.action.info!.hash_LN = send.hash;
        this.action.info!.hash_RN = recvInfo.hash!;
        
        return {err:BDTERROR.success,log:"SendStreamAction run success"}
    }
}

export class SendFileAction extends ActionBase implements ActionAbstract {
    async run():Promise<{err:number,log:string}>{
        // (1) 检查测试bdt 客户端
        let LN = await this.agentManager!.getBdtPeerClient(this.action.LN);
        let RN = await this.agentManager!.getBdtPeerClient(this.action.RN!);
        if(LN.err){
            return {err:LN.err,log:`${this.action.LN} bdt client not exist`}
        }
        if(RN.err){
            return {err:RN.err,log:`${this.action.RN} bdt client not exist`}
        }
        // (2) 构造测试数据
        let randFile = await  RN.bdtClient!.createFile(this.action.fileSize!)
        // (3) BDT 传输  File

        // (4) 校验结果

        // (5) 保存数据

        return {err:BDTERROR.success,log:"SendFileAction run success"}
    }
}