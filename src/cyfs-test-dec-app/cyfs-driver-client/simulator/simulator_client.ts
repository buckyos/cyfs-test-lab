
import { CyfsStackClient, CyfsStackClientConfig } from "../cyfs_driver"
import { ErrorCode, Logger } from "../../base"
import { LocalUtilTool } from "./local_util_tool"
import path from "path";
import * as cyfs from "../../cyfs";

export class CyfsStackSimulatorClient implements CyfsStackClient {
    private peer_name: string; // 测试节点标签
    private stack_type: string;  // 测试节点协议栈类型
    private zone_tag: string;
    private m_util_tool: LocalUtilTool;
    private ws_port: number;
    private http_port: number;
    private bdt_port: number;
    private logger: Logger;
    private root: string;
    constructor(options: CyfsStackClientConfig, logger: Logger, root_path: string) {
        this.peer_name = options.peer_name;
        this.stack_type = options.stack_type;
        this.logger = logger;
        this.zone_tag = options.zone_tag;
        this.ws_port = options.ws_port;
        this.http_port = options.http_port;
        this.bdt_port = options.bdt_port;
        this.root = path.join(root_path, `${this.peer_name}_cache`)
        this.m_util_tool = new LocalUtilTool(this.logger, this.root)
    }

    get_util_tool(): LocalUtilTool {
        return this.m_util_tool!
    }
    async open_stack(): Promise<{ err: ErrorCode, log: string, stack?: cyfs.SharedCyfsStack }> {
        return { err: ErrorCode.succ, log: "init success" }
    }

}