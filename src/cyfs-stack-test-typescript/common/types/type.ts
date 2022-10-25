import * as cyfs from "../../cyfs_node/cyfs_node";


export type Handler = {
    id : string ;
    type:cyfs.RouterHandlerCategory ;
    chain:cyfs.RouterHandlerChain ;
    index:number;
    filter:string;
    req_path?:string;
    default_action:cyfs.RouterHandlerAction, 
    myHandler?: any,
    routineType:string,
    runSum:number
}

export type ACL = {
    configFile? : string; //直接加载配置文件
    rules? : Array<string>; //加载配置规则
}

export type StackInfo = {
    stack : string;
    deviceName : string;
    handlerList : Array<Handler>;
    ACL? : ACL;
}


export type NDNoptInfo = {
    level : cyfs.NDNAPILevel;
    opt ? : string;
    objectType : string ; //chunk file dir
    chunkSize : number ;
    chunkNumber? : number;
    fileSize? : number ;
    dirInfo? : {deep:number,dirNum:number,fileNum:number,fileSize?:number}
}
export type InputInfo = {
    id? : string;
    testcaseName :string;
    expect?:ResultInfo
    opt : {
        optType : string;
        level : cyfs.NONAPILevel;
        source : string;
        target : string;
        sdec_id? : string;
        tdec_id? : string;
        NDNoptInfo? : NDNoptInfo,
        filter?:string,
        selectData?:{
            filter : string,
            page_size : number,
            page_index : number
        }
    }
    stackCfgList : Array<StackInfo>;
    handlerResetList? : Array<{deviceName:string,id:string,runSum:number}> ;
    relation? : Array<{stack1:string,stack2:string,isFriend:boolean}> ;
    owner? : string;
    timeout?:number;
    skip?: boolean;
    ext? : Array<{key:string,value:string}>;
}

export type ResultInfo = {
    err:    boolean;
    log?:   string;
    code?:  number
}

export enum StackType {
    Sim       = "sim",
    Real      = "real",
}

export type testSuiteJson = {
    system:     string
    module:     string;
    stack_type: StackType;
    testcaseList : Array<{
        name : string,
        id : string,
    }>
}


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
}