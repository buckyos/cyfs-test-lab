import {TaskClientInterface} from '../../base';
export enum NAT_Type{
    Public = 0,
    FullCone = 1,
    RestrictedCone = 1,
    PortRestrictedCone = 2,
    Symmetric = 3, 
}
//错误编码
export const BDTERROR = {
    success: 0, //执行成功
    AgentError: 1, //测试框架连接测试设备报错
    reportDataFailed: 3, //报存测试数据报错
    testDataError: 4 ,//使用测试数据校验失败报错
    timeout: 5, //执行用例超时报错
    connnetFailed: 6, //调用BDT connnet接口，BDT报错
    acceptFailed: 7, //调用BDT accept接口，BDT报错
    confirmFailed: 8, //调用BDT confirm接口，BDT报错
    sendDataFailed: 9,//调用BDT sendData接口，BDT报错
    recvDataFailed: 10, //调用BDT recvData接口，BDT报错
    initPeerFailed: 11, //初始化BDT协议栈报错
    destoryPeerFailed: 12, //释放BDT节点报错
    setChunckFailed:13, //local 创建 chunk失败
    interestChunkFailed:14, //romte 接收chunk失败
    NATExpectError:15, //目前NAT端口类型不支持连接
    optExpectError:16, // 异常操作导致失败
    craeteHubError:17, //创建hub失败
    hubDownloadFailed:18, //hub 下载文件失败  
    sendFileByChunkFailed:19,//chunk传输文件报错  
    CloseConnectionFailed:100,//关闭连接错误
    DestoryStackFailed:101,//关闭连接错误
    RNCheckConnFailed:102,//RN 检查连接错误
    NotFound :104,
    perfTestError : 1000, //性能测试出现bug，退出
}

export const enum  ActionType {
    start = "start",
    restart = "restart",
    connect = "connect",
    shutdown = "shutdown",
    exit = "destory",
    connect_second = "connect-second",  
    connect_reverse = "connect-reverse",  
    connect_mult = "connect-mult", 
    connect_send_stream = "connect_send-stream",
    send_stream = "send-stream",
    send_stream_just_send = "send-stream-just-send",
    send_stream_reverse = "send-stream-reverse",
    send_stream_mult = "send-stream-mult",
    send_stream_all = "send-stream-all",
    send_chunk = "send-chunk",
    send_file = "send-file" ,
    send_file_redirect = "send-file-redirect",
    send_file_mult = "send-file-mult",
    send_dir= "send-dir",
    send_chunk_list = "send-chunk-list",
    send_file_range = "send-file-range" ,
    send_file_object = "send-file-object" ,
    send_dir_object = "send-dir-object" ,
    Always_Run_IM = "Always_Run_IM" ,
    Always_Run_Web = "Always_Run_Web" ,
    Always_Run_NFT = "Always_Run_NFT" ,
    Always_Run_Video = "Always_Run_Video" ,
 };

 export const enum Resp_ep_type {
    Empty = "Empty",
    effectiveEP_LAN = "effectiveEP_LAN",  
    effectiveEP_WAN = "effectiveEP_WAN",  
    default = "default", 
    SN_Resp = "SN_Resp",
 }

export type Agent = {
    tags : Array<string>, 
    OS :string
    NAT : number,
    ipv4 : Array<string>,
    ipv6 : Array<string>,
    router : string,
    portMap? : {tcp:Array<number>,udp:Array<number>} 
}

export type Peer ={
    agent : Agent,
    addrInfo: string[], 
    local?: string, 
    sn_files: string[], 
    knownPeer?: Buffer[],
    RUST_LOG?:string,
    active_pn_files?:Array<string>, 
    passive_pn_files?:Array<string>,
    known_peer_files?:Array<string>,
    chunk_cache?:string,
    FristQA_answer?:string,
    ep_type?:string,
    ndn_event?:string,
    ndn_event_target?:string
}
 
export type Action ={
    // 输入数据
    type : ActionType, //操作类型
    action_id?:string, //action id
    parent_action?:string,//父任务
    LN : string, //LN 设备
    RN? : string,  // RN 设备
    Users? : Array<string>, 
    config : {
       timeout : number, //超时时间
       known_eps?:number,
       range?:Array<{begin:number,end:number}>
       firstQA_question? :string,
       firstQA_answer? :string,
       accept_answer?:number, //是否接收FristQA answer 
       conn_tag?: string, //连接标记   
       not_wait_upload_finished?:boolean,
       restart? : {
            ndn_event : string,
            ndn_event_target : string,
       },
       ndn_event_config? :{
            is_connect : Boolean,
            is_cache_data : Boolean,
        }
   },
    info? : {
       LN_NAT?:string,
       RN_NAT?:string,
       Users_NAT?:Array<{name:string,NAT:string}>, 
       fileName?:string, // 文件名称
       conn?:Array<string>,
       conn_name?:string, //连接名称
       hash_LN? : string, //文件hash值
       hash_RN? : string, //文件hash值
       record?:Array<{  //下载进度记录
           time: number;
           speed: string;
           progress: string;}>,
   },
    fileSize? : number, //数据大小
    chunkSize?:number,  //chunk 大小
    fileNum?:number, // 文件数量
    connect_time?: number, //连接时间
    send_time? : number, //传输时间
    calculate_time? : number,
    set_time?:number, // 本地set 时间
    expect?:{err:number,log?:string}; //预期结果
    result?:{err:number,log:string}; //实际结果   
}

export type Task ={
   task_id?:string,
   timeout? : number, //超时时间
   LN : string, //LN 设备
   RN : string,  // RN 设备
   Users? : Array<string>, 
   action:Array<ActionAbstract>, // 操作集合
   result?:{err:number,log:string}; //实际结果 
   state?:string; 
   expect_status? : number,
}
 export type Testcase ={
    TestcaseName:string, //用例名称
    testcaseId : string, //用例ID
    remark:string, //用例操作
    environment : string; //环境
    taskMult:number, //任务的并发数量限制
    MaxTaskNum?:number, // 运行最大任务数
    success?:number,
    failed?:number,
    result?:number,
    date? :string,
    errorList?:Array<{task_id?:string,
        err? : number,
        log?: string}>
}

export abstract  class ActionAbstract{
    abstract  run(): Promise<{err:number,log:string}>;
    abstract  save(): Promise<{err:number,log:string}>;
    abstract  init(_interface:TaskClientInterface,task?:Task): Promise<{err:number,log:string}>;
}
