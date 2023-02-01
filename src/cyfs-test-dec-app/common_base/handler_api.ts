import { ErrorCode } from '../base';
import * as cyfs from "../cyfs"

export enum HandlerType{
    TransFile = "trans-file",
    PrepareTransFile = "prepare-trans-file",
    UpdateContext = "update-context",
    AddContext = "add-context",
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
}
export type AddContextHandlerReq = {
    req_path: string,
    context_path : string,
    chunk_codec_desc? : {
        unknown?: boolean,
        stream?:Array<number>,
        raptor?: Array<number>,
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
        stream?:Array<number>,
        raptor?: Array<number>,
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
        stream?:Array<number>,
        raptor?: Array<number>
    },
    deviceid_list : Array<cyfs.ObjectId>,
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