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

//测试输入数据

//hub 信息
export interface Hub {
    fileName : string,
    size : number,
    frist : number,
    owner : number,
    waitTime : number,
    waitList? : Array<number>,
    uploadList? : Array<number> | undefined,
    AgentList? : Array<number> | undefined,
    hubInfo? : HubInfo | undefined
}
//文件传输队列
export interface FileTask {
    LN : number, //发送节点
    RNs : Array<number> // 接收节点列表
    dual_source? : Array<number>, // 双源传输链路 LN -> Array(dual_source) ->RNs  
    size : number, //文件大小
    waitTime : number, // RN间接发起下载间隔
    sendInfo? : {
        fileName : string,
        agent : string,
        fileSzie : number,
        md5 : string,
        sesssion : string,
        time:number
    }
    recvList?:Array<{
        agent : string,
        md5 : string,
        sesssion : string,
        time:number

    }>
}

//文件传输队列
export interface ChunkTask {
    LN : number, //发送节点
    RNs : Array<number> // 接收节点列表
    size : number, //文件大小
    waitTime : number, // RN间接发起下载间隔
    sendInfo? : {
        agent : string,
        fileSzie : number,
        chunkid:string
        time:number
    }
    recvList?:Array<{
        agent : string,
        state : string,
        chunkid:string
        time:number

    }>
}


//stream 任务队列
export interface StreamTask {
    LN : number, //发送节点
    RN : number // 接收节点列表
    fileSize : number, //文件大小
    waitTime : number, // RN间接发起下载间隔
    connName? : string,
    frsitConnTime? : number,
    secondConnTime? : number,
    streamInfo? : Array<{
        LNfileHash? : string,
        RNfileHash? : string,
        time?:number
    }>
}

//测试节点信息
export interface AgentInfo {
    agent : any;
    sn : Array<string>,
    endpoint : Array<string>,
    agentId? : string | undefined,
    tags? : string | undefined,
    PN?:any

}


//测试输出数据

//传输组hub数据
export interface HubInfo  {
    name : string | undefined,
    owner : string | undefined,
    ownerPeerId:string | undefined,
    fileSize : number | undefined,
    fileObject: string | undefined,
    md5:string | undefined,
    deviceList:Array<HubDeviceInfo>
}

// hub 中每个device下载文件记录的数据
export interface HubDeviceInfo{
    deviceName:string| undefined,
    peerId : string| undefined,
    session:string| undefined,
    fileState : string| undefined,
    md5:string| undefined,
    time : number | undefined |string,
}
