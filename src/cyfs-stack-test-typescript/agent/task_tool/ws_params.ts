

export const CustumObjectType = {
    MyText : 38502,
    MyTest : 38503,   
}

export enum NONAPILevel {
    NOC = "noc",
    NON = "non",
    Router = "router"
}
export type  NONOutputRequestCommon = {
    req_path?: string;
    dec_id?: string;
    level: string;
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