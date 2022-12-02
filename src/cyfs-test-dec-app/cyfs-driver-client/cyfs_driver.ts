import {ErrorCode} from "../base"
import * as cyfs from "../cyfs"


export type CyfsStackClientConfig = {
    peer_name : string,
    zone_tag : string,
    stack_type : string,
    bdt_port:number,
    http_port:number,
    ws_port: number,
}


export abstract  class CyfsStackDriver{
    // 初始化CYFS Stack测试驱动
    abstract init():Promise<{err:ErrorCode,log:string}>; 
    // 启动 
    abstract start():Promise<{err:ErrorCode,log:string}>;
    // 停止
    abstract stop():Promise<{err:ErrorCode,log:string}>;
    // 重启
    abstract restart():Promise<{err:ErrorCode,log:string}>;
    // 加载配置文件初始化CYFS Stack 测试客户端
    abstract load_config():Promise<{err:ErrorCode,log:string}>;
    // 添加一个 CYFS Stack 测试客户端
    abstract add_client(name:string,client:CyfsStackClient):{err:ErrorCode,log:string}
    // 获取一个CYFS Stack 测试客户端
    abstract get_client(name:string):{err:ErrorCode,log:string,client?:CyfsStackClient}
}

export abstract  class CyfsStackClient{
    //实例化一个 TS CYFS Stack 
    abstract open_stack():Promise<{err:ErrorCode,log:string,stack?:cyfs.SharedCyfsStack}>;
    //获取工具类
    abstract get_util_tool():UtilTool
}

export abstract class UtilTool{
    //创建测试文件
    abstract create_file(file_size:number):Promise<{err:ErrorCode,log?:string,file_name?:string,file_path?:string,md5?:string}>;
    //创建测试文件夹
    abstract create_dir(file_number:number,file_size:number,dir_number?:number,deep?:string):Promise<{err:ErrorCode,log?:string,dir_name?:string,dir_path?:string}>;
    //计算文件hash md5算法
    abstract md5_file(file_path:string):Promise<{err:ErrorCode,md5?:string}>;
    //文件缓存目录
    abstract get_cache_path():Promise<{err:ErrorCode,cache_path? : {file_upload:string,file_download:string}}>
}