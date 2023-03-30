import { ErrorCode } from "../common"
import * as cyfs from "../cyfs"


export type CyfsStackClientConfig = {
    peer_name: string,
    zone_tag: string,
    stack_type: string,
    bdt_port: number,
    http_port: number,
    ws_port: number,
    ood_daemon_status_port?:number,
}

export enum CyfsDriverType {
    real_machine = "Real_machine",
    runtime = "Runtime",
    gateway = "Gateway",
    simulator = "Simulator",
    bdt_client = "Bdt_client",
    other = "Other"
}

export abstract class CyfsStackDriver {
    // 初始化CYFS Stack测试驱动
    abstract init(): Promise<{ err: ErrorCode, log: string }>;
    // 启动 
    abstract start(): Promise<{ err: ErrorCode, log: string }>;
    // 停止
    abstract stop(): Promise<{ err: ErrorCode, log: string }>;
    // 重启
    abstract restart(): Promise<{ err: ErrorCode, log: string }>;
    // 加载配置文件初始化CYFS Stack 测试客户端
    abstract load_config(agent_list : Array<CyfsStackClientConfig>): Promise<{ err: ErrorCode, log: string }>;
    // 添加一个 CYFS Stack 测试客户端
    abstract add_client(name: string, client: CyfsStackClient): { err: ErrorCode, log: string }
    // 获取一个CYFS Stack 测试客户端
    abstract get_client(name: string): { err: ErrorCode, log: string, client?: CyfsStackClient }
}

export abstract class CyfsStackClient {
    //获取工具类
    abstract get_util_tool(): UtilTool
}

export abstract class UtilTool {
    //创建测试文件
    abstract create_file(file_size: number): Promise<{ err: ErrorCode, log?: string, file_name?: string, file_path?: string, md5?: string }>;
    //创建测试文件夹
    abstract create_dir(file_number: number, file_size: number, dir_number?: number, deep?: string): Promise<{
        err: ErrorCode, log?: string, dir_name?: string, dir_path?: string, file_list?: Array<{
            file_name: string, md5: string,
        }>}>;
    //计算文件hash md5算法
    abstract md5_file(file_path: string): Promise<{ err: ErrorCode, md5?: string }>;
    //文件缓存目录
    abstract get_cache_path(): Promise<{ err: ErrorCode, platform?:string,cache_path?: { file_upload: string, file_download: string } }>
    
    //内存中生成随机cyfs Chunk 
    abstract rand_cyfs_chunk_cache(chunk_size: number): Promise<{ err: ErrorCode, chunk_id: cyfs.ChunkId, chunk_data: Uint8Array }>
    //内存中生成随机cyfs File
    abstract rand_cyfs_file_cache(owner: cyfs.ObjectId, file_size: number, chunk_size: number): Promise<{ err: ErrorCode, file: cyfs.File, file_data: Buffer, md5: string }>
    // 计算内存中Buffer md5
    abstract md5_buffer(file_data: Buffer): Promise<string>
}