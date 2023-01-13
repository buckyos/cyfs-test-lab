import { ErrorCode } from '../base';
import * as cyfs from "../cyfs"

export interface HandlerApi {
    NotFound? : NotFoundResp,
    InvalidParam? :InvalidParam, 
    TransFileHandlerReq?:TransFileHandlerReq,
    TransFileHandlerResp?:TransFileHandlerResp,
    PrepareTransFileHandlerReq?:PrepareTransFileHandlerReq,
    PrepareTransFileHandlerResp?:PrepareTransFileHandlerResp
}

export enum HandlerType{
    TransFile = "trans-file",
    PrepareTransFile = "prepare-trans-file",
    UpdateContext = "update-context",
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
    context_id : string,
    context_path? : string,
    group: string,
    file_id : string,
    file_name : string,
}

export type TransFileHandlerResp = {
    result: number,
    msg: string,
    task_id?:string,
    download_time? : number,
    md5? : string, 
}
export type PrepareTransFileHandlerReq = {
    req_path: string,
    target : string,
    context_id : string,
    context_path? : string,
    group: string,
    file_id : string,
    file_name : string,
    auto_start : boolean,
    action? : cyfs.TransTaskControlAction
    action_wait?:number,
}

export type PrepareTransFileHandlerResp = {
    result: number,
    msg: string,
    task_id?:string,
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