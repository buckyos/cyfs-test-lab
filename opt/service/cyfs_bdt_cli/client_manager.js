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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BdtClientManager = void 0;
const base_1 = require("../../base");
const events_1 = require("events");
const lpc_1 = require("./lpc");
const lpc_client_1 = require("./lpc_client");
const ChildProcess = __importStar(require("child_process"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const SysProcess = __importStar(require("process"));
const util_1 = require("./util");
class BdtClientManager extends events_1.EventEmitter {
    constructor(_interface) {
        super();
        this.m_localServerPort = 0;
        this.m_peerIndex = 1;
        this.is_perf = false;
        this.m_interface = _interface;
        this.m_logger = _interface.getLogger();
        this.m_peers = new Map();
        this.m_platform = _interface.getPlatform();
        this.m_lpcStatus = false;
        this.bdt_port_index = 25000;
    }
    on(event, listener) {
        super.on(event, listener);
        return this;
    }
    once(event, listener) {
        super.once(event, listener);
        return this;
    }
    static createInstance(_interface) {
        if (!BdtClientManager.manager) {
            BdtClientManager.manager = new BdtClientManager(_interface);
        }
        return BdtClientManager.manager;
    }
    async stop_server_win() {
        return new Promise(async (v) => {
            this.m_logger.info(`Stop Process bdt-toools`);
            let process = ChildProcess.exec(`taskkill /f /t /im bdt-cli.exe`);
            process.on('data', (data) => {
                this.m_logger.info(`taskkill /f /t /im bdt-cli.exe : ${data}`);
            });
            process.on('exit', (code, singal) => {
                v('');
            });
        });
    }
    async stop_server_linux() {
        return new Promise(async (v) => {
            this.m_logger.info(`Stop Process bdt-cli`);
            let process = ChildProcess.exec(`sudo kill -9 $(pidof bdt-cli)`);
            process.on('data', (data) => {
                this.m_logger.info(`sudo kill -9 $(pidof bdt-cli : ${data}`);
            });
            process.on('exit', (code, singal) => {
                v('');
            });
        });
    }
    async init() {
        this.utilTool = new util_1.UtilTool(this.m_interface, this.m_logger);
        if (this.m_platform === 'win32') {
            this.exefile = path.join(SysProcess.cwd(), 'bdt-cli.exe');
        }
        else if (this.m_platform === 'linux') {
            this.exefile = path.join(SysProcess.cwd(), 'bdt-cli');
            this.m_logger.info(`chmod +x ${this.exefile}`);
            await ChildProcess.exec(`chmod +x ${this.exefile}`, { cwd: path.dirname(SysProcess.cwd()) });
        }
        else if (os.arch() == 'arm') {
            this.exefile = path.join(SysProcess.cwd(), 'bdt-cli-android32');
            await ChildProcess.exec(`chmod +x ${this.exefile}`, { cwd: path.dirname(SysProcess.cwd()) });
        }
        else if (os.arch() == 'arm64') {
            this.exefile = path.join(SysProcess.cwd(), 'bdt-cli-android64');
            await ChildProcess.exec(`chmod +x ${this.exefile}`, { cwd: path.dirname(SysProcess.cwd()) });
        }
        else {
            this.exefile = path.join(SysProcess.cwd(), 'bdt-cli');
            await ChildProcess.exec(`chmod +x ${this.exefile}`, { cwd: path.dirname(SysProcess.cwd()) });
        }
        return base_1.ErrorCode.succ;
    }
    async kill_server() {
        if (this.m_platform === 'linux') {
            await this.stop_server_linux();
        }
        if (this.m_platform === 'win32') {
            await this.stop_server_win();
        }
        await base_1.sleep(5000);
    }
    async start_peer(log_type = 'trace', client_name, port, kill_server = false) {
        if (kill_server) {
            await this.kill_server();
        }
        this.bdt_port_index = this.bdt_port_index + 2000;
        return new Promise(async (V) => {
            let lpc = new lpc_1.BdtLpc({
                logger: this.m_logger,
            });
            // 尝试连接现有客户端
            let connect = await this.connect_bdt_cli(lpc, port, 1);
            let check_timeout = true;
            // 没有现有端口 客户端 ，启动一个新的
            let log_path = path.join(this.m_logger.dir(), client_name);
            if (connect.err) {
                this.m_logger.info(`os type ${os.arch()}`);
                this.m_logger.info(`os type ${this.m_platform}`);
                this.m_logger.info(`run bdt cli path ${this.exefile}`);
                fs.removeSync(log_path);
                let sub = ChildProcess.spawn(`${this.exefile}`, [port.toString(), client_name, log_path, __dirname, this.bdt_port_index.toString()], { stdio: 'ignore', cwd: SysProcess.cwd(), detached: true, windowsHide: true, env: { CYFS_CONSOLE_LOG_LEVEL: `${log_type}`, CYFS_FILE_LOG_LEVEL_KEY: `${log_type}`, RUST_LOG: `${log_type}` } });
                sub.unref();
                await base_1.sleep(2000);
                this.m_logger.info(`####bdt-cli ${client_name} start`);
                let re_conn = await this.connect_bdt_cli(lpc, port);
                if (re_conn.err) {
                    check_timeout = false;
                    return V({ err: base_1.ErrorCode.fail, client_name: `${client_name}` });
                }
            }
            let onCommand = (l, c) => {
                var _a;
                let action = c.json;
                if (!((_a = action === null || action === void 0 ? void 0 : action.Started) === null || _a === void 0 ? void 0 : _a.client_name)) {
                    this.m_logger.error(`peer manager start bdtpeer failed, for first command not started`);
                }
                else {
                    client_name = action.Started.client_name;
                    this.m_logger.info(`recv new connection  from bdt-tools,command =  ${JSON.stringify(c.json)} `);
                    let peer = new lpc_client_1.LpcClient({
                        client_name: action.Started.client_name,
                        logger: this.m_logger,
                    });
                    let result = peer.initFromLpc(lpc);
                    lpc.on('close', (l, err) => {
                        this.emit('unlive', c.json.client_name);
                        this.m_logger.error(`peer manager delete peer name=${peer.client_name}`);
                        this.m_peers.delete(c.json.client_name);
                        this.m_logger.info(`peer manager peers ${this.m_peers}`);
                        this.m_lpcStatus = false;
                    });
                    lpc.on('error', () => {
                        this.emit('unlive', c.json.client_name);
                        this.m_peers.delete(c.json.client_name);
                        this.m_lpcStatus = false;
                    });
                    this.m_logger.info(`insert ${client_name} into peers list`);
                    this.m_peers.set(client_name, { peer });
                    this.emit('peer', peer);
                    check_timeout = false;
                    return V({ err: base_1.ErrorCode.succ, client_name: `${client_name}` });
                }
            };
            lpc.once('command', onCommand);
            setTimeout(() => {
                if (check_timeout) {
                    return V({ err: base_1.ErrorCode.timeout, client_name: `${client_name}` });
                }
            }, 20 * 1000);
        });
    }
    async connect_bdt_cli(lpc, port = 22222, run_sum = 5) {
        while (run_sum > 0) {
            run_sum = run_sum - 1;
            let result = await lpc.initFromListener(port);
            if (result == 0) {
                return { err: result };
            }
            await base_1.sleep(1000);
        }
        return { err: base_1.ErrorCode.fail };
    }
    async util_request(command) {
        return await this.utilTool.utilRequest(command);
    }
    async send_bdt_lpc_command(client_name, command) {
        if (!this.m_peers.has(client_name)) {
            this.m_logger.error(`${client_name} not exist`);
            return { err: base_1.ErrorCode.notExist };
        }
        let result = await this.m_peers.get(client_name).peer.sendBdtLpcCommand(command);
        return result;
    }
    async create_bdt_lpc_listener(client_name, event_name, event_type, command) {
        if (!this.m_peers.has(client_name)) {
            this.m_logger.error(`${client_name} not exist`);
            return { err: base_1.ErrorCode.notExist };
        }
        let result = await this.m_peers.get(client_name).peer.createBdtLpcListener(event_type, command, async (eventArg) => {
            this.m_interface.fireEvent(`${event_name}`, base_1.ErrorCode.succ, eventArg);
        });
        return result;
    }
}
exports.BdtClientManager = BdtClientManager;
