export enum NAT_Type{
    Public = 0,
    FullCone = 1,
    RestrictedCone = 1,
    PortRestrictedCone = 2,
    Symmetric = 3, 
}

export type AgentData = {
    tags : Array<string>,
    type : NAT_Type,
    ipv4 : Array<string>,
    ipv6 : Array<string>,
    portMap? : string, 
    error?:boolean,
    router : string,
}
//错误编码
export const BDTERROR = {
    success: 0, //执行成功
    LNAgentError: 1, //测试框架连接测试设备报错
    RNAgentError: 2, //测试框架连接测试设备报错
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
    DestoryStackFailed:100,//关闭连接错误
}

export const enum  taskType {
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
    all = "SN_Resp",
 }
 export type Agent= {
     name : string, //名称
     NAT:number,
     router?:string,//路由器编号
     eps : Array<string>, //EP配置
     SN : Array<string>, //SN
     agentMult:number,  //节点运行的协议栈数量 ${Agent.name}_0 、${Agent.name}_1 这样编号
     resp_ep_type?:Resp_ep_type,
     device_eps? : Array<string> ,
     SNResp_eps? : Array<string> ,
     agentid?:string, //节点对应的自动化测试框架节点
     logType? : string, //BDT 日志级别控制
     logUrl?:string, //日志下载
     report_time?:number, //间隔时间
     chunk_cache?:string, //节点的chunk缓存模式
     firstQA_answer?:string, //firstQA_answer 字符串长度
     ndn_event?:string,
     ndn_event_target?:string
     PN?:{ //节点的PN数据配置
         activePnFiles:Array<string>, //主动PN列表
         passivePnFiles:Array<string>, //被动PN列表
         knownPeerFiles:Array<string> //已知的PN节点列表
     };

 
 }

