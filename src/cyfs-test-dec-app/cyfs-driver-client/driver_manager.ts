import { CyfsStackClient, CyfsStackDriver } from "./cyfs_driver";
import { CyfsStackProxyDriver } from "./proxy/proxy_driver";
import { CyfsStackSimulatorDriver } from "./simulator/simulator_driver";
import { DirHelper, LocalStorageJson, Logger, RandomGenerator, LocalMaster, GlobalConfig, ClientExitCode } from "../base";
import path from "path";
import * as fs from "fs-extra";
import * as os from 'os';
const Base = require('../base/common/base.js');

export enum CyfsDriverType {
    real_machine = "real_machine",
    simulator = "Simulator",
}

export class CyfsStackDriverManager {
    static manager?: CyfsStackDriverManager;
    private agentid?: string;
    private logger?: Logger;
    private root: string;
    private local_master?: LocalMaster;
    private local_storage?: LocalStorageJson;
    
    static createInstance(): CyfsStackDriverManager {
        if (!CyfsStackDriverManager.manager) {
            CyfsStackDriverManager.manager = new CyfsStackDriverManager();
        }
        return CyfsStackDriverManager.manager;
    }
    constructor() {
        this.root = path.join(__dirname, "../");

    }
    async init() {
        // 初始化测试日志配置
        DirHelper.setRootDir(this.root);
        let logFolder = DirHelper.getLogDir();
        Base.BX_SetLogLevel(Base.BLOG_LEVEL_DEBUG);
        Base.BX_EnableFileLog(logFolder, `cyfs_stack_driver_${Date.now()}`, '.log');
        Base.blog.enableConsoleTarget(false);
        this.logger = new Logger(Base.blog.info, Base.blog.debug, Base.blog.error, logFolder);
        this.logger.info(`CyfsStackDriverManager init,logger = ${logFolder}`)
        // 加载本地测试框架device配置
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
        await local_storage.load();
        let info = await local_storage!.get('deviceId');
        this.agentid = info.value!;
        this.local_storage = local_storage;
        this.logger.info(`local agentid = ${this.agentid}`)
        

    }
    
    async create_driver(type: CyfsDriverType): Promise<CyfsStackDriver> {
        this.logger!.info(`create cyfs stack test driver,type = ${type}`);
        if (type == CyfsDriverType.real_machine) {
            return new CyfsStackProxyDriver(this.local_master,this.logger!, this.local_storage!,{});
        } else if (type == CyfsDriverType.simulator) {
            return new CyfsStackSimulatorDriver(this.logger!);
        } else {
            //默认使用模拟器
            return new CyfsStackSimulatorDriver(this.logger!);
        }
    }
    async exit_local_master() {
        this.local_master!.exit(ClientExitCode.killed, 'father exit', 10 * 1000);
    }
    get_logger() {
        return this.logger;
    }
}