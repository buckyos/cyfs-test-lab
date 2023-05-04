
import { CyfsStackClient, CyfsStackClientConfig } from "../cyfs_driver"
import { ErrorCode, Logger } from "../../cyfs-test-base"
import { LocalUtilTool } from "./local_util_tool"
import path from "path";
import * as cyfs from "../../cyfs";
import * as fs from "fs-extra";
export class CyfsStackSimulatorClient implements CyfsStackClient {
    private peer_name: string; // 测试节点标签
    private stack_type: string;  // 测试节点协议栈类型
    private zone_tag: string;
    private m_util_tool: LocalUtilTool;
    private ws_port: number;
    private http_port: number;
    private bdt_port: number;
    private cache_path: string;
    constructor(options: CyfsStackClientConfig, cache_path: string) {
        this.peer_name = options.peer_name;
        this.stack_type = options.stack_type;
        this.zone_tag = options.zone_tag;
        this.ws_port = options.ws_port;
        this.http_port = options.http_port;
        this.bdt_port = options.bdt_port;
        this.cache_path = path.join(cache_path,this.peer_name);
        this.m_util_tool = new LocalUtilTool(this.cache_path)
    }

    get_util_tool(): LocalUtilTool {
        console.info(`CyfsStackSimulatorClient ${this.peer_name} get_util_tool`)
        return this.m_util_tool!
    }
    async init(): Promise<{ err: ErrorCode, log: string }> {
        if(fs.pathExistsSync(this.cache_path)){
            console.info(`CyfsStackSimulatorClient ${this.peer_name} remove cache data`)
            //fs.removeSync(this.cache_path)
        }
        fs.mkdirpSync(this.cache_path)
        this.m_util_tool.init();
        return {err:ErrorCode.succ,log:"init client remove cache file"}
    }


}