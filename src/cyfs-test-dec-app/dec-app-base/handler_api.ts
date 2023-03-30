import * as cyfs from "../cyfs"
export enum ErrorCode {
    succ = 0,
    fail = 1,
    noMoreData = 2,
    unknownCommand = 3,
    netError = 4,
    exist = 5,
    notExist = 6,
    exception = 7,
    notChange = 8,
    invalidState = 9,
    timeout = 10,
    md5NotMatch = 11,
    notSupport = 12,
    invalidParam = 13,
    notFound = 14,
    waiting = 15,
    break = 16,
    connectProxyClientFailed =1000,
    cyfsStackOnlineTimeout = 10001,
    cyfsStackOnlineFailed = 10002,
}

export enum HandlerType{
    // NON 操作
    PutObject = "PutObject",
    GetObject = "GetObject",
    // root_state 相关操作
    // NDN 操作
    TransFile = "TransFile",
    PrepareTransFile = "PrepareTransFile",
    UpdateContext = "UpdateContext",
    AddContext = "AddContext",
    ShareFileAddAccess = "ShareFileAddAccess",
    // 
    OS_IO_ReadFile = "OS_IO_ReadFile",
    OS_IO_WriteFile = "OS_IO_WriteFile",
    OS_IO_RunFile = "OS_IO_RunFile",
    OS_Network_HttpListern = "OS_Network_HttpListern",
    OS_Network_HttpRequest = "OS_Network_HttpRequest",


}

export interface HandlerApi {
    NotFound? : NotFoundResp,
    InvalidParam? :InvalidParam, 
    TransFileHandlerReq?:TransFileHandlerReq,
    TransFileHandlerResp?:TransFileHandlerResp,
    PrepareTransFileHandlerReq?:PrepareTransFileHandlerReq,
    PrepareTransFileHandlerResp?:PrepareTransFileHandlerResp,
    AddContextHandlerReq?:AddContextHandlerReq,
    AddContextHandlerResp?:AddContextHandlerResp,
    UpdateContextHandlerReq?:UpdateContextHandlerReq,
    UpdateContextHandlerResp?:UpdateContextHandlerResp,
    ShareFileAddAccessHandlerReq?:ShareFileAddAccessHandlerReq,
    ShareFileAddAccessHandlerResp?:ShareFileAddAccessHandlerResp,
    PutObjectReq?:PutObjectReq,
    PutObjectResp?:PutObjectResp,
    // 系统磁盘IO 、网络请求等操作
    OS_IO_ReadFileReq?:OS_IO_ReadFileReq,
    OS_IO_ReadFileResp?:OS_IO_ReadFileResp,
    OS_IO_WriteFileReq?:OS_IO_WriteFileReq,
    OS_IO_WriteFileResp?:OS_IO_WriteFileResp,
    OS_IO_RunFileReq?:OS_IO_RunFileReq,
    OS_IO_RunFileResp?:OS_IO_RunFileResp,
    OS_Network_HttpListernReq?:OS_Network_HttpListernReq,
    OS_Network_HttpListernResp?:OS_Network_HttpListernResp, 
    OS_Network_HttpRequestReq?:OS_Network_HttpRequestReq,
    OS_Network_HttpRequestResp?:OS_Network_HttpRequestResp,
}


export type OS_Network_HttpRequestReq = {
    method : string,
    url : string,
    data : string,
}
export type OS_Network_HttpRequestResp = {
    result: number,
    msg: string,
    response : string,
}

export type OS_Network_HttpListernReq = {
    port : number,
}
export type OS_Network_HttpListernResp = {
    result: number,
    msg: string,
    ip : string,
}

export type OS_IO_RunFileReq = {
    file_path?: string,
    cmd? : string,
}
export type OS_IO_RunFileResp = {
    result: number,
    msg: string,
    output : string,
}

export type OS_IO_WriteFileReq = {
    file_path: string,
    data: string,
}
export type OS_IO_WriteFileResp = {
    result: number,
    msg: string,
}

export type OS_IO_ReadFileReq = {
    file_path: string,
}
export type OS_IO_ReadFileResp = {
    result: number,
    msg: string,
    data?: string,
}


export type PutObjectReq = {
    message: string,
}
export type PutObjectResp = {
    result: number,
    msg: string,
    message_resp: string,
}

export type ShareFileAddAccessHandlerReq = {
    req_path: string,
    file_id:string,
}
export type ShareFileAddAccessHandlerResp = {
    result: number,
    msg: string,
}

export type AddContextHandlerReq = {
    req_path: string,
    context_path : string,
    chunk_codec_desc? : {
        unknown?: boolean,
        stream?:[number|undefined, number|undefined, number|undefined]
        raptor?: [number|undefined, number|undefined, number|undefined]
    },
    deviceid_list? : Array<cyfs.ObjectId>,
}

export type AddContextHandlerResp = {
    result: number,
    msg: string,
    context_id? : string,
}

export type UpdateContextHandlerReq = {
    req_path: string,
    context_id : string,
    chunk_codec_desc? : {
        unknown?: boolean,
        stream?:[number|undefined, number|undefined, number|undefined],
        raptor?: [number|undefined, number|undefined, number|undefined]
    },
    deviceid_list? : Array<cyfs.ObjectId>,
}

export type UpdateContextHandlerResp = {
    result: number,
    msg: string,
}

export type NotFoundResp = {
    result: number,
    msg: string,
}

export type InvalidParam = {
    result: number,
    msg: string,
    data : string, 
}
export type TransFileHandlerReq = {
    req_path: string,
    target : string,
    context_path? : string,
    group: string,
    file_id : string,
    file_name : string,
    chunk_codec_desc? : {
        unknown?: boolean,
        stream?:Array<number>,
        raptor?: Array<number>,
    },
    deviceid_list? : Array<cyfs.ObjectId>,
}

export type TransFileHandlerResp = {
    result: number,
    msg: string,
    task_id?:string,
    download_time? : number,
    get_file_object_time?:number,
    md5? : string, 
}
export type PrepareTransFileHandlerReq = {
    req_path: string,
    target : string,
    context_path : string,
    not_set_context? : boolean,
    group: string,
    file_id : string,
    file_name : string,
    auto_start : boolean,
    action? : cyfs.TransTaskControlAction,
    action_wait?:number,
    chunk_codec_desc? : {
        unknown?: boolean,
        stream?:[number|undefined, number|undefined, number|undefined],
        raptor?: [number|undefined, number|undefined, number|undefined]
    },
    deviceid_list? : Array<cyfs.ObjectId>,
}

export type PrepareTransFileHandlerResp = {
    result: number,
    msg: string,
    task_id?:string,
    context_id?:string,
    get_file_object_time?:number
}
export const NotFoundError : HandlerApi = {
    NotFound : {
        result :ErrorCode.notFound,
        msg : "NotFoundError"
    }
}
export const InvalidParamError : HandlerApi = {
    NotFound : {
        result :ErrorCode.invalidParam,
        msg : "InvalidParamError"
    }
}