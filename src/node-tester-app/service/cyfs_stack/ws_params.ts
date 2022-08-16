import * as cyfs from "./typescript/cyfs/cyfs_node"

export type ForwardRequest = {
    message_type: string;   //消息号,  如get_object/put_object/get_data 保持和接口一致
    req: any;               //消息体, 如 cyfs.NDNGetDataOutputRequest 保持和请求包一致
}

export type ForwardResponse = {
    err : number;
    log? : string;
    data_size?: number, //操作数据大小
    opt_time?: number, //操作时间
    resp?: any;      //对应的回包
}

export type  NONOutputRequestCommon = {
    req_path?: string;
    dec_id?: string;
    level: cyfs.NONAPILevel;
    target?: string;
    flags: number;
}

export type PutObjectParmas = {
    obj_type : number;
    common : NONOutputRequestCommon
}

export type PutObjectResp = {
    err : number;
    log? : string;
    object_id? : string;
    object_raw? : Uint8Array;
    opt_time?:number;
    data_size?:number;
}


export type GetObjectParmas = {
    obj_id : string;
    inner_path? : string;
    common : NONOutputRequestCommon
}

export type GetObjectResp = {
    err : number;
    log? : string;
    object_id? :string;
    object_raw? : Uint8Array;
    obj_info? : any;
    opt_time?:number;
    data_size?:number;
}