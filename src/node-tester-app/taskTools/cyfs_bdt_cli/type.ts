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
    Expection: 6,
    NATExpectError:15, //目前NAT端口类型不支持连接
    optExpectError:16, // 异常操作导致失败
    NotFound :104,
    ConnCloesd : 105,
    ExpectionResult : 500, //错误结果
    perfTestError : 501, //性能测试出现bug，退出
    // BDT 操作报错
    BDTTimeout: 1000, //执行用例超时报错
    AddDeviceError : 1001,
    BDTClientTimeout : 1002,
    CalculateChunkError : 1003,
    SetChunkError : 1004,
    InterestChunkError : 1005,
    CheckChunkError : 1005,
    connnetFailed: 1006, //调用BDT connnet接口，BDT报错
    acceptFailed: 1007, //调用BDT accept接口，BDT报错
    confirmFailed: 1008, //调用BDT confirm接口，BDT报错
    SendStreamFailed: 1009,//调用BDT sendData接口，BDT报错
    RecvStreamFailed: 1010, //调用BDT recvData接口，BDT报错
    initPeerFailed: 1011, //初始化BDT协议栈报错
    destoryPeerFailed: 1012, //释放BDT节点报错
    setChunckFailed:1013, //local 创建 chunk失败
    interestChunkFailed:1014, //romte 接收chunk失败
    sendFileByChunkFailed:1015,//chunk传输文件报错  
    CloseConnectionFailed:1016,//关闭连接错误
    DestoryStackFailed:1017,//关闭连接错误
    RNCheckConnFailed:1018,//RN 检查连接错误
    CheckHashFailed : 1019,// 检查Hash 错误
    // 测试数据生成类型的报错
    RandFileError : 20000,
    GetCachePathError : 20001,
}
export const enum  Listern_type{
    auto_accept = "auto_accept",
    auto_response_stream = "auto_response_stream",
}

export const enum  ActionType {
    start = "start",
    restart = "restart",
    sn_online = "sn_online",
    connect = "connect",
    FasTQA = "FasTQA" ,
    FasTStream = "FasTStream" ,
    close_connect = "close-connect",
    destory = "destory",
    connect_second = "connect-second",  
    connect_reverse = "connect-reverse",  
    connect_mult = "connect-mult", 
    tunnel_connect = "tunnel_connect", 
    connect_send_stream = "connect_send-stream",
    send_stream = "send-stream",
    send_stream_just_send = "send-stream-just-send",
    send_stream_reverse = "send-stream-reverse",
    send_stream_mult = "send-stream-mult",
    send_stream_all = "send-stream-all",
    send_chunk = "send-chunk",
    send_file = "send-file" ,
    send_file_group = "send-file-group",
    send_file_list = "send-file-list",
    send_file_redirect = "send-file-redirect",
    send_file_mult = "send-file-mult",
    send_dir= "send-dir",
    send_chunk_list = "send-chunk-list",
    send_file_range = "send-file-range" ,
    send_file_object = "send-file-object" ,
    send_dir_object = "send-dir-object" ,
    sleep = "sleep",
    tcp_create_server = "tcp_create_server",
    tcp_connect = "tcp_connect",
    tcp_send_stream = "tcp_send_stream",
    Always_Run_IM = "Always_Run_IM" ,
    Always_Run_Web = "Always_Run_Web" ,
    Always_Run_NFT = "Always_Run_NFT" ,
    Always_Run_Video = "Always_Run_Video" ,
 };

 export const enum Resp_ep_type {
    Empty = "Empty",
    All = "All",
    effectiveEP_LAN = "effectiveEP_LAN",  
    effectiveEP_WAN = "effectiveEP_WAN",  
    default = "default", 
    SN_Resp = "SN_Resp",
    Auto = "Auto"
 }

export type Agent = {
    tags : Array<string>, 
    OS :string,
    area : string,
    NAT : number,
    ipv4 : Array<string>,
    ipv6 : Array<string>,
    router : string,
    portMap? : {tcp:Array<number>,udp:Array<number>} 
}

export type Peer ={
    agent : Agent,
    area:string,
    addrInfo: string[], 
    bdt_port_range? : number,
    client_port? : number,
    local?: string, 
    device_tag?:string,
    sn_files: string[], 
    knownPeer?: Buffer[],
    RUST_LOG?:string,
    local_device_list? : Array<string>,
    active_pn_files?:Array<string>, 
    passive_pn_files?:Array<string>,
    known_peer_files?:Array<string>,
    chunk_cache?:string,
    answer_size:number,
    ep_type?:string,
    ndn_event?:string,
    ndn_event_target?:string
    udp_sn_only :boolean,
    tcp_port_mapping? : string,
    listern_type? : string,
}
 
export type Action ={
    // 输入数据
    type? : ActionType, //操作类型
    testcaseId? : string, //用例ID
    task_id?:string, //Task ID
    action_id?:string, //action id
    parent_action?:string,//父任务
    LN : string, //LN 设备
    RN? : string,  // RN 设备
    Users? : Array<string>, 
    date  ? : string , //执行日期
    environment? : string; //环境
    config : {
       timeout : number, //超时时间
       known_eps?:number,
       range?:Array<{begin:number,end:number}>
       firstQA_question? :number,
       firstQA_answer? :number,
       accept_answer?:number, //是否接收FristQA answer 
       conn_tag?: string, //连接标记   
       not_wait_upload_finished?:boolean,
       address?:string,
       port? : number,
       shutdown_type? : string,
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
       LN_Resp?:any,
       RN_Resp?:any,
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
    calculate_time? : number, //cyfs_base 计算生成对象时间
    set_time?:number, // 本地set 时间
    expect:{err:number}; //预期结果
    result?:{err:number,log:string}; //实际结果   
}

export type Task ={
   testcaseId? : string, //用例ID
   task_id?:string, //Task ID
   timeout? : number, //超时时间
   LN : string, //LN 设备
   RN : string,  // RN 设备
   Users? : Array<string>, 
   action:Array<ActionAbstract>, // 操作集合
   result?:{err:number,log:string}; //实际结果 
   resultLog? : string,
   state?:string; 
   date  ? : string , //执行日期
   environment? : string; //环境
   expect_status? : string,
}
 export type Testcase ={
    TestcaseName:string, //用例名称
    testcaseId : string, //用例ID
    remark:string, //用例操作
    environment : string; //环境
    success?:number,
    failed?:number,
    result?:number,
    date? :string,
    errorList?:Array<{task_id?:string,
        err? : number,
        log?: string}>
}

export abstract  class ActionAbstract{
    abstract  start(): Promise<{err:number,log:string}>;
    abstract  run(): Promise<{err:number,log:string}>;
    abstract  save(): Promise<{err:number,log:string}>;
    abstract  init(_interface:TaskClientInterface,task?:Task,index?:number,date?:string): Promise<{err:number,log:string}>;
    abstract  record():any;
    abstract  record_child():any;
}
