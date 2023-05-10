import {load_cyfs_driver_client_conf,GlobalConfig, Namespace, LocalMaster, TaskClientInterface, ClientExitCode ,TaskClient,ErrorCode, Logger, LocalStorageJson, DirHelper, RandomGenerator,} from '../cyfs-driver-base';
import { DMCProxyClient} from "./dmc_client"
import * as os from 'os';
import path from "path";
import fs from "fs-extra";


export interface DMCClientConfig {
    peer_name : string,
    os : string,
}

export class DMCProxyDriver  {
    private stack_client_map: Map<string, DMCProxyClient>
    private logger: Logger;
    private local_storage: LocalStorageJson;
    private namespace: Namespace;
    private local_master?: LocalMaster;
    private agentid?: string;
    private platform: string;
    private interface?: TaskClientInterface;
    constructor(log_path: string) {
        this.stack_client_map = new Map();
        DirHelper.setRootDir(path.join(__dirname, "../"));
        this.logger = new Logger(console.info, console.debug, console.error, log_path);
        console.info(`CyfsStackDriverManager init  = ${log_path}`)
        let deviceConfig = path.join(DirHelper.getConfigDir(), 'deviceId.json');
        try {
            if (!fs.existsSync(deviceConfig)) {
                fs.writeFileSync(deviceConfig, JSON.stringify({ deviceId: RandomGenerator.string(64) }));
            }
        } catch (e) {
            console.error(`start failed, e=${e}`);
        }
        let local_storage = new LocalStorageJson({
            file: path.join(DirHelper.getConfigDir(), 'deviceId.json'),
        });
        this.local_storage = local_storage;
        // TODO 应该从配置文件中加载
        this.namespace = { agentid: this.agentid!, serviceid: "1391", taskid: "2" };
        this.platform = os.platform();
    }
    async init(): Promise<{ err: ErrorCode, log: string }> {
        // 加载device id
        await this.local_storage.load();
        let info = await this.local_storage!.get('deviceId');
        this.agentid = info.value!;
        this.namespace.agentid = this.agentid;
        // 初始化测试框架服务
        let config = load_cyfs_driver_client_conf();
        console.info(`$$$$$$ LocalMaster : ${JSON.stringify(this.agentid)} GlobalConfig = ${JSON.stringify(config)}`);
        let local_master: LocalMaster = new LocalMaster({
            agentid: this.agentid!,
            version: config.version,
            heartbeatIntervalTime: config.heartbeatIntervalTime,
            logger:this.logger,
            storage: this.local_storage,
            platform: this.platform,
        });
        this.local_master = local_master;
        let err = this.local_master!.init(GlobalConfig.agentServer.host, GlobalConfig.agentServer.port);
        if (err) {
            console.error(`CyfsStackProxyDriver init server failed, err=${err}`);
            return { err: ErrorCode.connectProxyClientFailed, log: "local_master init failed" };
        }
        err = await this.local_master!.start();
        if (err) {
            console.error(`CyfsStackProxyDriver start server failed, err=${err}`);
            return { err: ErrorCode.connectProxyClientFailed, log: "local_master start failed" };
        }
        console.info(`CyfsStackProxyDriver init server success`);

        return { err: ErrorCode.succ, log: "init success" }
    }

    async start(): Promise<{ err: ErrorCode, log: string }> {
        // 实例化一个 本地 Task Client
        let taskClientProxy = this.local_master!.newTaskClient(this.namespace, "1", true);
        // 运行本地Task 脚本连接测试节点，启动CYFS协议栈代理隧道
        console.info(`$$$$$$    TaskClient : ${JSON.stringify(this.namespace)}`);
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
            console.info(`[task taskid=${this.namespace.taskid}] task client init failed, err=${err}`);
            return { err: ErrorCode.connectProxyClientFailed, log: "task client init failed" };;
        }
        err = await task.start();
        if (err) {
            console.info(`[task taskid=${this.namespace.taskid}] task client start, err=${err}`);
            return { err: ErrorCode.connectProxyClientFailed, log: "task client start failed" };;
        }
        console.info(`[task taskid=${this.namespace.taskid}] task client start success`);
        this.interface = task as TaskClientInterface;
        return { err: ErrorCode.succ, log: "init success" }
    }
    async stop(): Promise<{ err: ErrorCode, log: string }> {
        if (!this.interface) {
            return { err: ErrorCode.notExist, log: "please start frist" }
        }
        for(let client of this.stack_client_map.values()){
            await this.interface!.stopService(client.agentid()) 
        }
        //this.interface!.exit(ClientExitCode.succ, "success")
        this.interface = undefined;
        return { err: ErrorCode.succ, log: "init success" }
    }
    async restart(): Promise<{ err: ErrorCode, log: string }> {
        await this.stop();
        return await this.start();
    }
    async load_config(agent_list : Array<DMCClientConfig>): Promise<{ err: ErrorCode, log: string }>{
        let run_list: Array<Promise<{ err: ErrorCode, log: string }>> = [];
        console.info(`proxy_driver will load agent len = ${agent_list.length} `);
        for (let agent of agent_list) {
            console.info(`proxy_driver will load agent ${agent.peer_name}`);
            run_list.push(new Promise(async (V) => {
                let client = new DMCProxyClient({
                    _interface: this.interface!,
                    peer_name: agent.peer_name,
                    timeout: 60 * 1000,
                })
                let result = await client.init();
                if (result.err) {
                    console.error(`${agent.peer_name} start DMCProxyClient fialed `)
                    V(result);
                }
                this.stack_client_map.set(agent.peer_name, client)
                V(result);
            }))

        }
        for (let run of run_list) {
            let result = await run;
            console.info(result)
            if (result.err) {
                return result;
            }
        }
        return { err: ErrorCode.succ, log: "init success" }
    }
    get_client(name: string): { err: ErrorCode, log: string, client?: DMCProxyClient } {
        if (!this.stack_client_map.has(name)) {
            console.info(`not found ${name}`)
            return { err: ErrorCode.notFound, log: "cleint not found" }
        }
        console.info(`CyfsStackProxyDriver get_client ${name} success`)
        return { err: ErrorCode.succ, log: "init success", client: this.stack_client_map.get(name)! }
    }
    add_client(name: string, client: DMCProxyClient): { err: ErrorCode, log: string } {
        if (this.stack_client_map.has(name)) {
            return { err: ErrorCode.invalidState, log: "cleint is exist" }
        }
        this.stack_client_map.set(name, client);
        return { err: ErrorCode.succ, log: "init success" }
    }
}





