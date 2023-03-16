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
exports.CyfsStackSimulatorDriver = void 0;
const common_1 = require("../../common");
const simulator_client_1 = require("./simulator_client");
const ChildProcess = __importStar(require("child_process"));
const path_1 = __importDefault(require("path"));
const fs = __importStar(require("fs-extra"));
const Base = require('../../base/common/base.js');
class CyfsStackSimulatorDriver {
    constructor(log_path) {
        this.log_path = log_path;
        this.cache_path = path_1.default.join(this.log_path, "../cache");
        this.simulator_path = path_1.default.join(__dirname, "../../cyfs/zone-simulator.exe");
        this.stack_client_map = new Map();
        this.pid = 0;
        common_1.DirHelper.setRootDir(path_1.default.join(__dirname, "../../"));
        Base.BX_SetLogLevel(Base.BLOG_LEVEL_DEBUG);
        Base.BX_EnableFileLog(log_path, `cyfs_stack_simulator_driver_${Date.now()}`, '.log');
        Base.blog.enableConsoleTarget(false);
        this.logger = new common_1.Logger(Base.blog.info, Base.blog.debug, Base.blog.error, log_path);
    }
    async init() {
        // 加载配置文件中
        return { err: common_1.ErrorCode.succ, log: "init success" };
    }
    async start(debug = false) {
        if (debug) {
            return new Promise(async (v) => {
                this.logger.info(`####### start Zone Simulator ${this.simulator_path}`);
                while (!this.pid) {
                    await this.initPid();
                }
                v({ err: common_1.ErrorCode.succ, log: "start Zone Simulator success" });
            });
        }
        else {
            await this.stop();
            return new Promise(async (v) => {
                this.logger.info(`####### start Zone Simulator ${this.simulator_path}`);
                if (!fs.pathExistsSync(this.simulator_path)) {
                    v({ err: common_1.ErrorCode.succ, log: `${this.simulator_path} mot found, please run ./cyfs/build_zone_simulator.bat init Simulator` });
                }
                this.process = ChildProcess.spawn(this.simulator_path, [], { windowsHide: false, detached: false, stdio: 'ignore', cwd: path_1.default.dirname(this.simulator_path) });
                this.process.unref();
                while (!this.pid) {
                    await this.initPid();
                }
                v({ err: common_1.ErrorCode.succ, log: "start Zone Simulator success" });
            });
        }
    }
    async initPid() {
        this.logger.info(`begin initPid ${this.pid}`);
        return new Promise(async (v) => {
            var _a;
            let process = ChildProcess.exec(`tasklist|findstr /c:zone-simulator.exe`);
            process.on('exit', (code, singal) => {
                this.logger.info(`check finished,pid = ${this.pid}`);
                v(this.pid);
            });
            (_a = process.stdout) === null || _a === void 0 ? void 0 : _a.on('data', (data) => {
                let pid_data = `${data.toString()}`;
                this.logger.info(`check result = ${pid_data}`);
                let str = "0";
                if (pid_data.includes("Console")) {
                    str = pid_data.split('Console')[0].split(`zone-simulator.exe`)[1];
                }
                if (pid_data.includes("RDP-Tcp")) {
                    str = pid_data.split('RDP-Tcp')[0].split(`zone-simulator.exe`)[1];
                }
                this.logger.info(`cehck result split = ${str}`);
                this.logger.info(str);
                if (str) {
                    this.pid = Number(str);
                    v(this.pid);
                }
                else {
                    this.pid = 0;
                }
            });
            process.on("error", (err) => {
                this.logger.info(`initPid failed,err=${err}`);
                v(false);
            });
        });
    }
    async stop() {
        this.process = undefined;
        return new Promise(async (v) => {
            var _a;
            this.logger.info(`####### run stopZoneSimulator`);
            let process = ChildProcess.exec(`taskkill /f /t /im zone-simulator.exe`);
            process.on('exit', (code, singal) => {
                this.logger.info(`stopZoneSimulator exist`);
                v({ err: common_1.ErrorCode.succ, log: `stop success` });
            });
            (_a = process.stdout) === null || _a === void 0 ? void 0 : _a.on('data', (data) => {
                let str = `${data.toString()}`;
                v({ err: common_1.ErrorCode.succ, log: `stop success` });
            });
        });
    }
    async restart() {
        let result = await this.stop();
        if (result.err) {
            return result;
        }
        result = await this.start();
        return result;
    }
    async load_config(agent_list) {
        let run_list = [];
        for (let agent of agent_list) {
            run_list.push(new Promise(async (V) => {
                this.logger.info(`load CyfsStackSimulatorClient ${agent.peer_name}`);
                let client = new simulator_client_1.CyfsStackSimulatorClient(agent, this.logger, this.cache_path);
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
        this.logger.info(`CyfsStackSimulatorDriver get_client ${name} success`);
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
exports.CyfsStackSimulatorDriver = CyfsStackSimulatorDriver;
