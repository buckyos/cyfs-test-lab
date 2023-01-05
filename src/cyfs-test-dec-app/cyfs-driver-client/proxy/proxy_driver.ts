
import { CyfsStackDriver } from "../cyfs_driver"
import { ErrorCode, Logger, TaskClient, LocalStorageJson, DirHelper, RandomGenerator, GlobalConfig, Namespace, LocalMaster, TaskClientInterface, ClientExitCode } from "../../base"
import { CyfsStackProxyClient } from "./proxy_client"
import * as os from 'os';
import { REAL_MACHINE_LIST } from "../../config/cyfs_driver_config"
const Base = require('../../base/common/base.js');
import path from "path";
import fs from "fs-extra";

export class CyfsStackProxyDriver implements CyfsStackDriver {
    private stack_client_map: Map<string, CyfsStackProxyClient>
    private logger: Logger;
    private local_storage: LocalStorageJson;
    private namespace: Namespace;
    private local_master?: LocalMaster;
    private agentid?: string;
    private platform: string;
    private interface?: TaskClientInterface;
    constructor(log_path: string) {
        this.stack_client_map = new Map();
        DirHelper.setRootDir(path.join(__dirname, "../../"));
        Base.BX_SetLogLevel(Base.BLOG_LEVEL_DEBUG);
        Base.BX_EnableFileLog(log_path, `cyfs_stack_real_driver_${Date.now()}`, '.log');
        Base.blog.enableConsoleTarget(false);
        this.logger = new Logger(Base.blog.info, Base.blog.debug, Base.blog.error, log_path);
        this.logger.info(`CyfsStackDriverManager init,logger = ${log_path}`)
        let deviceConfig = path.join(DirHelper.getConfigDir(), 'deviceId.json');
        try {
            if (!fs.existsSync(deviceConfig)) {
                fs.writeFileSync(deviceConfig, JSON.stringify({ deviceId: RandomGenerator.string(64) }));
            }
        } catch (e) {
            this.logger.error(`start failed, e=${e}`);
        }
        let local_storage = new LocalStorageJson({
            file: path.join(DirHelper.getConfigDir(), 'deviceId.json'),
            logger: this.logger
        });
        this.local_storage = local_storage;
        // TODO 应该从配置文件中加载
        this.namespace = { agentid: this.agentid!, serviceid: "678", taskid: "1" };
        this.platform = os.platform();
    }

    async init(): Promise<{ err: ErrorCode, log: string }> {
        // 加载device id
        await this.local_storage.load();
        let info = await this.local_storage!.get('deviceId');
        this.agentid = info.value!;
        this.namespace.agentid = this.agentid;
        // 初始化测试框架服务
        let local_master: LocalMaster = new LocalMaster({
            agentid: this.agentid!,
            version: GlobalConfig.version,
            heartbeatIntervalTime: GlobalConfig.heartbeatIntervalTime,
            logger: this.logger!,
            storage: this.local_storage,
            platform: this.platform,
        });
        this.local_master = local_master;
        let err = this.local_master!.init(GlobalConfig.ip, GlobalConfig.port);
        if (err) {
            this.logger!.error(`CyfsStackProxyDriver init server failed, err=${err}`);
            return { err: ErrorCode.connectProxyClientFailed, log: "local_master init failed" };
        }
        err = await this.local_master!.start();
        if (err) {
            this.logger!.error(`CyfsStackProxyDriver start server failed, err=${err}`);
            return { err: ErrorCode.connectProxyClientFailed, log: "local_master start failed" };
        }
        this.logger!.info(`CyfsStackProxyDriver init server success`);

        return { err: ErrorCode.succ, log: "init success" }
    }

    async start(): Promise<{ err: ErrorCode, log: string }> {
        // 实例化一个 本地 Task Client
        let taskClientProxy = this.local_master!.newTaskClient(this.namespace, "1", true);
        // 运行本地Task 脚本连接测试节点，启动CYFS协议栈代理隧道
        let task: TaskClient = new TaskClient({
            namespace: this.namespace,
            version: "1",
            heartbeatIntervalTime: GlobalConfig.heartbeatIntervalTime,
            argv: [],
            logger: this.logger,
            storage: this.local_storage,
            key: taskClientProxy.key,
            platform: this.platform,
        });
        let err = task.init('127.0.0.1', this.local_master!.getLlocalServerPort()!);
        if (err) {
            this.logger!.info(`[task taskid=${this.namespace.taskid}] task client init failed, err=${err}`);
            return { err: ErrorCode.connectProxyClientFailed, log: "task client init failed" };;
        }
        err = await task.start();
        if (err) {
            this.logger!.info(`[task taskid=${this.namespace.taskid}] task client start, err=${err}`);
            return { err: ErrorCode.connectProxyClientFailed, log: "task client start failed" };;
        }
        this.logger!.info(`[task taskid=${this.namespace.taskid}] task client start success`);
        this.interface = task as TaskClientInterface;
        return { err: ErrorCode.succ, log: "init success" }
    }
    async stop(): Promise<{ err: ErrorCode, log: string }> {
        if (!this.interface) {
            return { err: ErrorCode.notExist, log: "please start frist" }
        }
        this.interface!.exit(ClientExitCode.succ, "success")
        this.interface = undefined;
        return { err: ErrorCode.succ, log: "init success" }
    }
    async restart(): Promise<{ err: ErrorCode, log: string }> {
        await this.stop();
        return await this.start();
    }
    async load_config(): Promise<{ err: ErrorCode, log: string }> {
        let run_list: Array<Promise<{ err: ErrorCode, log: string }>> = [];
        for (let agent of REAL_MACHINE_LIST) {
            run_list.push(new Promise(async (V) => {
                let client = new CyfsStackProxyClient({
                    _interface: this.interface!,
                    peer_name: agent.peer_name,
                    stack_type: agent.stack_type,
                    timeout: 60 * 1000,
                    ws_port: agent.ws_port,
                    http_port: agent.http_port,
                })
                let result = await client.init();
                if (result.err) {
                    this.logger.error(`${agent.peer_name} start CyfsStackProxyClient fialed `)
                    V(result);
                }
                this.stack_client_map.set(agent.peer_name, client)
                V(result);
            }))

        }
        for (let run of run_list) {
            let result = await run;
            if (result.err) {
                return result;
            }
        }
        return { err: ErrorCode.succ, log: "init success" }
    }
    get_client(name: string): { err: ErrorCode, log: string, client?: CyfsStackProxyClient } {
        if (!this.stack_client_map.has(name)) {
            return { err: ErrorCode.notFound, log: "cleint not found" }
        }
        this.logger.info(`CyfsStackProxyDriver get_client ${name} success`)
        return { err: ErrorCode.succ, log: "init success", client: this.stack_client_map.get(name)! }
    }
    add_client(name: string, client: CyfsStackProxyClient): { err: ErrorCode, log: string } {
        if (this.stack_client_map.has(name)) {
            return { err: ErrorCode.invalidState, log: "cleint is exist" }
        }
        this.stack_client_map.set(name, client);
        return { err: ErrorCode.succ, log: "init success" }
    }
}





