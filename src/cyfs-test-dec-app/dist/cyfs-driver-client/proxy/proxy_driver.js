"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CyfsStackProxyDriver = void 0;
const common_1 = require("../../common");
const cyfs_driver_base_1 = require("../../cyfs-driver-base");
const proxy_client_1 = require("./proxy_client");
const os = __importStar(require("os"));
const Base = require('../../base/common/base.js');
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
class CyfsStackProxyDriver {
    constructor(log_path) {
        this.stack_client_map = new Map();
        common_1.DirHelper.setRootDir(path_1.default.join(__dirname, "../../"));
        Base.BX_SetLogLevel(Base.BLOG_LEVEL_INFO);
        Base.BX_EnableFileLog(log_path, `cyfs_stack_real_driver_${Date.now()}`, '.log');
        Base.blog.enableConsoleTarget(false);
        this.logger = new common_1.Logger(Base.blog.info, Base.blog.debug, Base.blog.error, log_path);
        this.logger.info(`CyfsStackDriverManager init,logger = ${log_path}`);
        let deviceConfig = path_1.default.join(common_1.DirHelper.getConfigDir(), 'deviceId.json');
        try {
            if (!fs_extra_1.default.existsSync(deviceConfig)) {
                fs_extra_1.default.writeFileSync(deviceConfig, JSON.stringify({ deviceId: common_1.RandomGenerator.string(64) }));
            }
        }
        catch (e) {
            this.logger.error(`start failed, e=${e}`);
        }
        let local_storage = new common_1.LocalStorageJson({
            file: path_1.default.join(common_1.DirHelper.getConfigDir(), 'deviceId.json'),
            logger: this.logger
        });
        this.local_storage = local_storage;
        // TODO 应该从配置文件中加载
        this.namespace = { agentid: this.agentid, serviceid: "678", taskid: "2" };
        this.platform = os.platform();
    }
    async init() {
        // 加载device id
        await this.local_storage.load();
        let info = await this.local_storage.get('deviceId');
        this.agentid = info.value;
        this.namespace.agentid = this.agentid;
        // 初始化测试框架服务
        this.logger.info(`$$$$$$    LocalMaster : ${JSON.stringify(this.agentid)}`);
        let local_master = new cyfs_driver_base_1.LocalMaster({
            agentid: this.agentid,
            version: cyfs_driver_base_1.GlobalConfig.version,
            heartbeatIntervalTime: cyfs_driver_base_1.GlobalConfig.heartbeatIntervalTime,
            logger: this.logger,
            storage: this.local_storage,
            platform: this.platform,
        });
        this.local_master = local_master;
        let err = this.local_master.init(cyfs_driver_base_1.GlobalConfig.ip, cyfs_driver_base_1.GlobalConfig.port);
        if (err) {
            this.logger.error(`CyfsStackProxyDriver init server failed, err=${err}`);
            return { err: common_1.ErrorCode.connectProxyClientFailed, log: "local_master init failed" };
        }
        err = await this.local_master.start();
        if (err) {
            this.logger.error(`CyfsStackProxyDriver start server failed, err=${err}`);
            return { err: common_1.ErrorCode.connectProxyClientFailed, log: "local_master start failed" };
        }
        this.logger.info(`CyfsStackProxyDriver init server success`);
        return { err: common_1.ErrorCode.succ, log: "init success" };
    }
    async start() {
        // 实例化一个 本地 Task Client
        let taskClientProxy = this.local_master.newTaskClient(this.namespace, "1", true);
        // 运行本地Task 脚本连接测试节点，启动CYFS协议栈代理隧道
        this.logger.info(`$$$$$$    TaskClient : ${JSON.stringify(this.namespace)}`);
        let task = new cyfs_driver_base_1.TaskClient({
            namespace: this.namespace,
            version: "1",
            heartbeatIntervalTime: cyfs_driver_base_1.GlobalConfig.heartbeatIntervalTime,
            argv: [],
            logger: this.logger,
            storage: this.local_storage,
            key: taskClientProxy.key,
            platform: this.platform,
        });
        let err = task.init('127.0.0.1', this.local_master.getLlocalServerPort());
        if (err) {
            this.logger.info(`[task taskid=${this.namespace.taskid}] task client init failed, err=${err}`);
            return { err: common_1.ErrorCode.connectProxyClientFailed, log: "task client init failed" };
            ;
        }
        err = await task.start();
        if (err) {
            this.logger.info(`[task taskid=${this.namespace.taskid}] task client start, err=${err}`);
            return { err: common_1.ErrorCode.connectProxyClientFailed, log: "task client start failed" };
            ;
        }
        this.logger.info(`[task taskid=${this.namespace.taskid}] task client start success`);
        this.interface = task;
        return { err: common_1.ErrorCode.succ, log: "init success" };
    }
    async stop() {
        if (!this.interface) {
            return { err: common_1.ErrorCode.notExist, log: "please start frist" };
        }
        this.interface.exit(cyfs_driver_base_1.ClientExitCode.succ, "success");
        this.interface = undefined;
        return { err: common_1.ErrorCode.succ, log: "init success" };
    }
    async restart() {
        await this.stop();
        return await this.start();
    }
    async load_config(agent_list) {
        let run_list = [];
        this.logger.info(`proxy_driver will load agent len = ${agent_list.length} `);
        for (let agent of agent_list) {
            this.logger.info(`proxy_driver will load agent ${agent.peer_name}`);
            run_list.push(new Promise(async (V) => {
                let client = new proxy_client_1.CyfsStackProxyClient({
                    _interface: this.interface,
                    peer_name: agent.peer_name,
                    stack_type: agent.stack_type,
                    timeout: 60 * 1000,
                    ws_port: agent.ws_port,
                    http_port: agent.http_port,
                    ood_daemon_status_port: agent.ood_daemon_status_port,
                });
                let result = await client.init();
                if (result.err) {
                    this.logger.error(`${agent.peer_name} start CyfsStackProxyClient fialed `);
                    V(result);
                }
                this.stack_client_map.set(agent.peer_name, client);
                V(result);
            }));
        }
        for (let run of run_list) {
            let result = await run;
            console.info(result);
            if (result.err) {
                return result;
            }
        }
        return { err: common_1.ErrorCode.succ, log: "init success" };
    }
    get_client(name) {
        if (!this.stack_client_map.has(name)) {
            return { err: common_1.ErrorCode.notFound, log: "cleint not found" };
        }
        this.logger.info(`CyfsStackProxyDriver get_client ${name} success`);
        return { err: common_1.ErrorCode.succ, log: "init success", client: this.stack_client_map.get(name) };
    }
    add_client(name, client) {
        if (this.stack_client_map.has(name)) {
            return { err: common_1.ErrorCode.invalidState, log: "cleint is exist" };
        }
        this.stack_client_map.set(name, client);
        return { err: common_1.ErrorCode.succ, log: "init success" };
    }
}
exports.CyfsStackProxyDriver = CyfsStackProxyDriver;
