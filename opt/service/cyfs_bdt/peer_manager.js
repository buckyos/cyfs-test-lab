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
exports.BdtPeerManager = void 0;
const base_1 = require("../../base");
const generator_1 = require("./generator");
const net = __importStar(require("net"));
const events_1 = require("events");
const lpc_1 = require("./lpc");
const peer_1 = require("./peer");
const ChildProcess = __importStar(require("child_process"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const SysProcess = __importStar(require("process"));
const util_1 = require("./util");
class BdtPeerManager extends events_1.EventEmitter {
    constructor(_interface) {
        super();
        this.m_localServerPort = 0;
        this.m_peerIndex = 1;
        this.is_perf = false;
        this.m_interface = _interface;
        this.m_server = net.createServer();
        this.m_logger = _interface.getLogger();
        this.m_peers = new Map();
        this.m_platform = _interface.getPlatform();
        this.m_lpcStatus = false;
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
        if (!BdtPeerManager.manager) {
            BdtPeerManager.manager = new BdtPeerManager(_interface);
        }
        return BdtPeerManager.manager;
    }
    async stopBdtWin32() {
        return new Promise(async (v) => {
            this.m_logger.info(`Stop Process bdt-toools`);
            let process = ChildProcess.exec(`taskkill /f /t /im bdt-tools.exe`);
            process.on('exit', (code, singal) => {
                v('');
            });
        });
    }
    async stopBdtLinux() {
        return new Promise(async (v) => {
            this.m_logger.info(`Stop Process bdt-toools`);
            let process = ChildProcess.exec(`sudo kill -9 $(pidof bdt-tools)`);
            process.on('exit', (code, singal) => {
                v('');
            });
        });
    }
    _initPeer(peer) {
        peer.on('unlive', () => {
            this.m_logger.error(`===================peer unlive `);
            this.emit('unlive', peer.peerid);
        });
    }
    async init() {
        this.utilTool = new util_1.UtilTool(this.m_interface, this.m_logger);
        // init BdtPeerManager,must kill other bdt-tools
        if (this.m_platform === 'win32') {
            await this.stopBdtWin32();
            await base_1.sleep(2000);
        }
        else if (this.m_platform === 'linux') {
            await this.stopBdtLinux();
            await base_1.sleep(2000);
        }
        // listener new connection from bdt-tools
        this.m_server.on('connection', (socket) => {
            let lpc = new lpc_1.BdtLpc({
                logger: this.m_logger,
            });
            let onCommand = (l, c) => {
                if (c.json.name !== 'started') {
                    this.m_logger.error(`peer manager start bdtpeer failed, for first command not started`);
                }
                else {
                    let info = this.m_peers.get(c.json.peer_name);
                    this.m_logger.info(`recv new connection  from bdt-tools,command =  ${JSON.stringify(c.json)} `);
                    if (info) {
                        let peer = new peer_1.BdtPeer({
                            logger: this.m_logger,
                            peer_name: c.json.peer_name,
                        });
                        peer.initFromLpc(lpc);
                        this._initPeer(peer);
                        lpc.on('close', (l, err) => {
                            this.emit('unlive', c.json.peer_name);
                            this.m_logger.error(`peer manager delete peer name=${peer.peer_name}`);
                            this.m_peers.delete(c.json.peer_name);
                            this.m_logger.info(`peer manager peers ${this.m_peers}`);
                            this.m_lpcStatus = false;
                        });
                        lpc.on('error', () => {
                            this.emit('unlive', c.json.peer_name);
                            this.m_peers.delete(c.json.peer_name);
                            this.m_lpcStatus = false;
                        });
                        info.peer = peer;
                        this.emit('peer', peer);
                    }
                }
            };
            lpc.once('command', onCommand);
            lpc.initFromListener(socket);
        });
        this.m_server.on('error', (error) => {
            this.m_logger.info(`local server init failed for net error, error=${error}`);
        });
        await new Promise((v) => {
            this.m_server.once('listening', () => {
                this.m_localServerPort = this.m_server.address().port;
                this.m_logger.error(`============, port=${this.m_localServerPort}`);
                v(base_1.ErrorCode.succ);
            });
            this.m_server.listen();
        });
        return base_1.ErrorCode.succ;
    }
    async startPeer(logType = 'trace') {
        var _a;
        let exefile = '';
        this.m_logger.info(`os type ${os.arch()}`);
        this.m_logger.info(`os type ${this.m_platform}`);
        let bdt_tools;
        // test dif os type
        if (this.m_platform === 'win32') {
            exefile = 'bdt-tools.exe';
            bdt_tools = path.join(SysProcess.cwd(), exefile);
        }
        else if (this.m_platform === 'linux') {
            exefile = 'bdt-tools';
            bdt_tools = path.join(SysProcess.cwd(), exefile);
            await ChildProcess.exec(`chmod +x ${bdt_tools}`, { cwd: path.dirname(bdt_tools) });
        }
        else if (this.m_platform === 'hiwifi') {
            exefile = 'bdt-tools-hiwifi';
        }
        else if (os.arch() == 'arm') {
            exefile = 'bdt-tools-android32';
            bdt_tools = path.join(SysProcess.cwd(), exefile);
            await ChildProcess.exec(`chmod +x ${bdt_tools}`, { cwd: path.dirname(bdt_tools) });
        }
        else if (os.arch() == 'arm64') {
            exefile = 'bdt-tools-android64';
            bdt_tools = path.join(SysProcess.cwd(), exefile);
            await ChildProcess.exec(`chmod +x ${bdt_tools}`, { cwd: path.dirname(bdt_tools) });
        }
        else {
            exefile = 'bdt-tools';
            bdt_tools = path.join(SysProcess.cwd(), exefile);
            await ChildProcess.exec(`chmod +x ${bdt_tools}`, { cwd: path.dirname(bdt_tools) });
        }
        this.m_logger.info(`bdt path ${bdt_tools}`);
        let peerName = `${generator_1.RandomGenerator.string(32)}`;
        let sub = ChildProcess.spawn(`${path.join(SysProcess.cwd(), exefile)}`, [this.m_localServerPort.toString(), peerName, this.m_logger.dir()], { stdio: 'ignore', cwd: SysProcess.cwd(), detached: true, windowsHide: true, env: { CYFS_CONSOLE_LOG_LEVEL: `${logType}`, CYFS_FILE_LOG_LEVEL_KEY: `${logType}`, RUST_LOG: `${logType}` } });
        sub.unref();
        this.m_peers.set(peerName, {});
        this.m_logger.info(`####bdt-tools ${peerName} start`);
        this.m_lpcStatus = true;
        let check = 5;
        while (check > 0) {
            if ((_a = this.m_peers.get(peerName)) === null || _a === void 0 ? void 0 : _a.peer) {
                return { err: base_1.ErrorCode.succ, peerName };
            }
            await base_1.sleep(2000);
            check--;
        }
        return { err: base_1.ErrorCode.timeout, peerName };
    }
    async utilRequest(command) {
        return await this.utilTool.utilRequest(command);
    }
    async sendBdtLpcCommand(command) {
        if (!this.m_peers.has(command.json.peerName)) {
            this.m_logger.error(`${command.json.peerName} not exist`);
            return { err: base_1.ErrorCode.notExist };
        }
        let result = await this.m_peers.get(command.json.peerName).peer.sendBdtLpcCommand(command);
        return result;
    }
    async createBdtLpcListener(command) {
        if (!this.m_peers.has(command.json.peerName)) {
            return { err: base_1.ErrorCode.notExist };
        }
        let peerName = command.json.peerName;
        let eventName = command.json.eventName;
        let result = await this.m_peers.get(peerName).peer.createBdtLpcListener(command, async (eventArg) => {
            this.m_interface.fireEvent(`${eventName}`, base_1.ErrorCode.succ, eventArg);
        });
        return result;
    }
}
exports.BdtPeerManager = BdtPeerManager;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ub2RlLXRlc3Rlci1hcHAvc2VydmljZS9jeWZzX2JkdC9wZWVyX21hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHFDQUFxRztBQUNyRywyQ0FBMEM7QUFDMUMseUNBQTJCO0FBQzNCLG1DQUFvQztBQUNwQywrQkFBeUQ7QUFDekQsaUNBQWlDO0FBQ2pDLDREQUE4QztBQUM5Qyx1Q0FBeUI7QUFFekIsMkNBQTZCO0FBQzdCLG9EQUFzQztBQUV0QyxpQ0FBK0I7QUFNL0IsTUFBYSxjQUFlLFNBQVEscUJBQVk7SUFxQzVDLFlBQVksVUFBaUM7UUFDekMsS0FBSyxFQUFFLENBQUM7UUFuQ0osc0JBQWlCLEdBQVcsQ0FBQyxDQUFDO1FBRzlCLGdCQUFXLEdBQVcsQ0FBQyxDQUFDO1FBSXhCLFlBQU8sR0FBYSxLQUFLLENBQUM7UUE2QjlCLElBQUksQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFDO1FBQzlCLElBQUksQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ25DLElBQUksQ0FBQyxRQUFRLEdBQUcsVUFBVSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUN6QixJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUMzQyxJQUFJLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQztJQUU3QixDQUFDO0lBN0JELEVBQUUsQ0FBQyxLQUFhLEVBQUUsUUFBa0M7UUFDaEQsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDMUIsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQztJQUtELElBQUksQ0FBQyxLQUFhLEVBQUUsUUFBa0M7UUFDbEQsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7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QyxDQUFBO1FBQ3RFLENBQUMsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxNQUFNLENBQUM7SUFDbEIsQ0FBQztDQUNKO0FBak5ELHdDQWlOQyIsImZpbGUiOiJzZXJ2aWNlL2N5ZnNfYmR0L3BlZXJfbWFuYWdlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7RXJyb3JDb2RlLCBOYW1lc3BhY2UsIEJ1ZmZlcldyaXRlciwgU2VydmljZUNsaWVudEludGVyZmFjZSwgTG9nZ2VyLCBzbGVlcH0gZnJvbSAnLi4vLi4vYmFzZSc7XHJcbmltcG9ydHtSYW5kb21HZW5lcmF0b3J9IGZyb20gXCIuL2dlbmVyYXRvclwiXHJcbmltcG9ydCAqIGFzIG5ldCBmcm9tICduZXQnO1xyXG5pbXBvcnQge0V2ZW50RW1pdHRlcn0gZnJvbSAnZXZlbnRzJztcclxuaW1wb3J0IHsgQmR0THBjLCBCZHRMcGNDb21tYW5kICxCZHRMcGNSZXNwfSBmcm9tICcuL2xwYyc7XHJcbmltcG9ydCB7IEJkdFBlZXIgfSBmcm9tICcuL3BlZXInO1xyXG5pbXBvcnQgKiBhcyBDaGlsZFByb2Nlc3MgZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XHJcbmltcG9ydCAqIGFzIG9zIGZyb20gJ29zJztcclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgKiBhcyBTeXNQcm9jZXNzIGZyb20gJ3Byb2Nlc3MnO1xyXG5pbXBvcnQgKiBhcyBjcnlwdG8gZnJvbSAnY3J5cHRvJztcclxuaW1wb3J0IHtVdGlsVG9vbH0gZnJvbSBcIi4vdXRpbFwiXHJcblxyXG5cclxudHlwZSBQZWVySW5mbyA9IHtcclxuICAgIHBlZXI/OiBCZHRQZWVyO1xyXG59XHJcbmV4cG9ydCBjbGFzcyBCZHRQZWVyTWFuYWdlciBleHRlbmRzIEV2ZW50RW1pdHRlcntcclxuICAgIHN0YXRpYyBtYW5hZ2VyPzogQmR0UGVlck1hbmFnZXI7XHJcbiAgICBwcml2YXRlIG1fc2VydmVyOiBuZXQuU2VydmVyO1xyXG4gICAgcHJpdmF0ZSBtX2xvY2FsU2VydmVyUG9ydDogbnVtYmVyID0gMDtcclxuICAgIHByaXZhdGUgbV9sb2dnZXI6IExvZ2dlcjtcclxuICAgIHByaXZhdGUgbV9pbnRlcmZhY2U6U2VydmljZUNsaWVudEludGVyZmFjZVxyXG4gICAgcHJpdmF0ZSBtX3BlZXJJbmRleDogbnVtYmVyID0gMTtcclxuICAgIHByaXZhdGUgbV9wZWVyczogTWFwPHN0cmluZywgUGVlckluZm8+O1xyXG4gICAgcHJpdmF0ZSBtX3BsYXRmb3JtOiBzdHJpbmc7XHJcbiAgICBwcml2YXRlIG1fbHBjU3RhdHVzIDogYm9vbGVhbjtcclxuICAgIHByaXZhdGUgaXNfcGVyZiA6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgIHByaXZhdGUgdXRpbFRvb2w/IDogVXRpbFRvb2xcclxuXHJcblxyXG4gICAgb24oZXZlbnQ6ICdwZWVyJywgbGlzdGVuZXI6IChwZWVyOiBCZHRQZWVyKSA9PiB2b2lkKTogdGhpcztcclxuICAgIG9uKGV2ZW50OiAndW5saXZlJywgbGlzdGVuZXI6IChwZWVyTmFtZTogc3RyaW5nKSA9PiB2b2lkKTogdGhpcztcclxuXHJcbiAgICBvbihldmVudDogc3RyaW5nLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkKTogdGhpcyB7XHJcbiAgICAgICAgc3VwZXIub24oZXZlbnQsIGxpc3RlbmVyKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBvbmNlKGV2ZW50OiAncGVlcicsIGxpc3RlbmVyOiAocGVlcjogQmR0UGVlcikgPT4gdm9pZCk6IHRoaXM7XHJcbiAgICBvbmNlKGV2ZW50OiAndW5saXZlJywgbGlzdGVuZXI6IChwZWVyTmFtZTogc3RyaW5nKSA9PiB2b2lkKTogdGhpcztcclxuXHJcbiAgICBvbmNlKGV2ZW50OiBzdHJpbmcsIGxpc3RlbmVyOiAoLi4uYXJnczogYW55W10pID0+IHZvaWQpOiB0aGlzIHtcclxuICAgICAgICBzdXBlci5vbmNlKGV2ZW50LCBsaXN0ZW5lcik7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGNyZWF0ZUluc3RhbmNlKF9pbnRlcmZhY2U6U2VydmljZUNsaWVudEludGVyZmFjZSk6IEJkdFBlZXJNYW5hZ2VyIHtcclxuICAgICAgICBpZiAoIUJkdFBlZXJNYW5hZ2VyLm1hbmFnZXIpIHtcclxuICAgICAgICAgICAgQmR0UGVlck1hbmFnZXIubWFuYWdlciA9IG5ldyBCZHRQZWVyTWFuYWdlcihfaW50ZXJmYWNlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIEJkdFBlZXJNYW5hZ2VyLm1hbmFnZXI7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3RydWN0b3IoX2ludGVyZmFjZTpTZXJ2aWNlQ2xpZW50SW50ZXJmYWNlKSB7XHJcbiAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICB0aGlzLm1faW50ZXJmYWNlID0gX2ludGVyZmFjZTtcclxuICAgICAgICB0aGlzLm1fc2VydmVyID0gbmV0LmNyZWF0ZVNlcnZlcigpO1xyXG4gICAgICAgIHRoaXMubV9sb2dnZXIgPSBfaW50ZXJmYWNlLmdldExvZ2dlcigpO1xyXG4gICAgICAgIHRoaXMubV9wZWVycyA9IG5ldyBNYXAoKTtcclxuICAgICAgICB0aGlzLm1fcGxhdGZvcm0gPSBfaW50ZXJmYWNlLmdldFBsYXRmb3JtKCk7XHJcbiAgICAgICAgdGhpcy5tX2xwY1N0YXR1cyA9IGZhbHNlOyAgIFxyXG4gICAgICAgICAgICAgXHJcbiAgICB9XHJcbiAgICBhc3luYyBzdG9wQmR0V2luMzIoKXtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoYXN5bmModik9PntcclxuICAgICAgICAgICAgdGhpcy5tX2xvZ2dlci5pbmZvKGBTdG9wIFByb2Nlc3MgYmR0LXRvb29sc2ApXHJcbiAgICAgICAgICAgIGxldCBwcm9jZXNzID0gQ2hpbGRQcm9jZXNzLmV4ZWMoYHRhc2traWxsIC9mIC90IC9pbSBiZHQtdG9vbHMuZXhlYClcclxuICAgICAgICAgICAgcHJvY2Vzcy5vbignZXhpdCcsIChjb2RlOiBudW1iZXIsIHNpbmdhbDogYW55KT0+IHtcclxuICAgICAgICAgICAgICAgIHYoJycpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KVxyXG4gICAgICAgIFxyXG4gICAgfVxyXG4gICAgYXN5bmMgc3RvcEJkdExpbnV4KCl7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGFzeW5jKHYpPT57XHJcbiAgICAgICAgICAgIHRoaXMubV9sb2dnZXIuaW5mbyhgU3RvcCBQcm9jZXNzIGJkdC10b29vbHNgKVxyXG4gICAgICAgICAgICBsZXQgcHJvY2VzcyA9IENoaWxkUHJvY2Vzcy5leGVjKGBzdWRvIGtpbGwgLTkgJChwaWRvZiBiZHQtdG9vbHMpYClcclxuICAgICAgICAgICAgcHJvY2Vzcy5vbignZXhpdCcsIChjb2RlOiBudW1iZXIsIHNpbmdhbDogYW55KT0+IHtcclxuICAgICAgICAgICAgICAgIHYoJycpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KVxyXG4gICAgICAgIFxyXG4gICAgfVxyXG4gICAgcHJvdGVjdGVkIF9pbml0UGVlcihwZWVyOiBCZHRQZWVyKSB7XHJcbiAgICAgICAgcGVlci5vbigndW5saXZlJywgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLm1fbG9nZ2VyLmVycm9yKGA9PT09PT09PT09PT09PT09PT09cGVlciB1bmxpdmUgYCk7XHJcbiAgICAgICAgICAgIHRoaXMuZW1pdCgndW5saXZlJywgcGVlci5wZWVyaWQpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgaW5pdCgpOiBQcm9taXNlPEVycm9yQ29kZT4ge1xyXG4gICAgICAgIHRoaXMudXRpbFRvb2wgPSBuZXcgVXRpbFRvb2wodGhpcy5tX2ludGVyZmFjZSx0aGlzLm1fbG9nZ2VyKTtcclxuICAgICAgICAvLyBpbml0IEJkdFBlZXJNYW5hZ2VyLG11c3Qga2lsbCBvdGhlciBiZHQtdG9vbHNcclxuICAgICAgICBpZiAodGhpcy5tX3BsYXRmb3JtID09PSAnd2luMzInKSB7XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc3RvcEJkdFdpbjMyKCk7XHJcbiAgICAgICAgICAgIGF3YWl0IHNsZWVwKDIwMDApXHJcbiAgICAgICAgfWVsc2UgaWYgKHRoaXMubV9wbGF0Zm9ybSA9PT0gJ2xpbnV4Jyl7XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc3RvcEJkdExpbnV4KCk7XHJcbiAgICAgICAgICAgIGF3YWl0IHNsZWVwKDIwMDApXHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIGxpc3RlbmVyIG5ldyBjb25uZWN0aW9uIGZyb20gYmR0LXRvb2xzXHJcbiAgICAgICAgdGhpcy5tX3NlcnZlci5vbignY29ubmVjdGlvbicsIChzb2NrZXQ6IG5ldC5Tb2NrZXQpID0+IHtcclxuICAgICAgICAgICAgbGV0IGxwYzogQmR0THBjID0gbmV3IEJkdExwYyh7XHJcbiAgICAgICAgICAgICAgICBsb2dnZXI6IHRoaXMubV9sb2dnZXIsXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgbGV0IG9uQ29tbWFuZCA9IChsOiBCZHRMcGMsIGM6IEJkdExwY0NvbW1hbmQpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChjLmpzb24ubmFtZSAhPT0gJ3N0YXJ0ZWQnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tX2xvZ2dlci5lcnJvcihgcGVlciBtYW5hZ2VyIHN0YXJ0IGJkdHBlZXIgZmFpbGVkLCBmb3IgZmlyc3QgY29tbWFuZCBub3Qgc3RhcnRlZGApO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgaW5mbyA9IHRoaXMubV9wZWVycy5nZXQoYy5qc29uLnBlZXJfbmFtZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tX2xvZ2dlci5pbmZvKGByZWN2IG5ldyBjb25uZWN0aW9uICBmcm9tIGJkdC10b29scyxjb21tYW5kID0gICR7SlNPTi5zdHJpbmdpZnkoYy5qc29uKX0gYClcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5mbykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcGVlcjogQmR0UGVlciA9IG5ldyBCZHRQZWVyKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlcjogdGhpcy5tX2xvZ2dlcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZXJfbmFtZTogYy5qc29uLnBlZXJfbmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBlZXIuaW5pdEZyb21McGMobHBjKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5faW5pdFBlZXIocGVlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxwYy5vbignY2xvc2UnLCAobDogQmR0THBjLCBlcnI6IGJvb2xlYW4pID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdCgndW5saXZlJywgYy5qc29uLnBlZXJfbmFtZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1fbG9nZ2VyLmVycm9yKGBwZWVyIG1hbmFnZXIgZGVsZXRlIHBlZXIgbmFtZT0ke3BlZXIucGVlcl9uYW1lfWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5tX3BlZXJzLmRlbGV0ZShjLmpzb24ucGVlcl9uYW1lKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubV9sb2dnZXIuaW5mbyhgcGVlciBtYW5hZ2VyIHBlZXJzICR7dGhpcy5tX3BlZXJzfWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5tX2xwY1N0YXR1cyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBscGMub24oJ2Vycm9yJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lbWl0KCd1bmxpdmUnLCBjLmpzb24ucGVlcl9uYW1lKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubV9wZWVycy5kZWxldGUoYy5qc29uLnBlZXJfbmFtZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1fbHBjU3RhdHVzID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW5mby5wZWVyID0gcGVlcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lbWl0KCdwZWVyJywgcGVlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBscGMub25jZSgnY29tbWFuZCcsIG9uQ29tbWFuZCk7XHJcblxyXG4gICAgICAgICAgICBscGMuaW5pdEZyb21MaXN0ZW5lcihzb2NrZXQpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMubV9zZXJ2ZXIub24oJ2Vycm9yJywgKGVycm9yOiBFcnJvcikgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLm1fbG9nZ2VyLmluZm8oYGxvY2FsIHNlcnZlciBpbml0IGZhaWxlZCBmb3IgbmV0IGVycm9yLCBlcnJvcj0ke2Vycm9yfWApO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZTxFcnJvckNvZGU+KCh2KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMubV9zZXJ2ZXIub25jZSgnbGlzdGVuaW5nJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tX2xvY2FsU2VydmVyUG9ydCA9ICh0aGlzLm1fc2VydmVyLmFkZHJlc3MoKSBhcyBuZXQuQWRkcmVzc0luZm8pLnBvcnQhO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tX2xvZ2dlci5lcnJvcihgPT09PT09PT09PT09LCBwb3J0PSR7dGhpcy5tX2xvY2FsU2VydmVyUG9ydH1gKTtcclxuICAgICAgICAgICAgICAgIHYoRXJyb3JDb2RlLnN1Y2MpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy5tX3NlcnZlci5saXN0ZW4oKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICByZXR1cm4gRXJyb3JDb2RlLnN1Y2M7XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgc3RhcnRQZWVyKGxvZ1R5cGU6c3RyaW5nID0gJ3RyYWNlJyk6IFByb21pc2U8e2VycjpFcnJvckNvZGUscGVlck5hbWU6c3RyaW5nfT4ge1xyXG4gICAgICAgIGxldCBleGVmaWxlOiBzdHJpbmcgPSAnJztcclxuICAgICAgICB0aGlzLm1fbG9nZ2VyLmluZm8oYG9zIHR5cGUgJHtvcy5hcmNoKCl9YClcclxuICAgICAgICB0aGlzLm1fbG9nZ2VyLmluZm8oYG9zIHR5cGUgJHt0aGlzLm1fcGxhdGZvcm0gfWApXHJcbiAgICAgICAgbGV0IGJkdF90b29scztcclxuICAgICAgICAvLyB0ZXN0IGRpZiBvcyB0eXBlXHJcbiAgICAgICAgaWYgKHRoaXMubV9wbGF0Zm9ybSA9PT0gJ3dpbjMyJykge1xyXG4gICAgICAgICAgICBleGVmaWxlID0gJ2JkdC10b29scy5leGUnO1xyXG4gICAgICAgICAgICBiZHRfdG9vbHMgPSBwYXRoLmpvaW4oU3lzUHJvY2Vzcy5jd2QoKSwgZXhlZmlsZSlcclxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMubV9wbGF0Zm9ybSA9PT0gJ2xpbnV4Jykge1xyXG4gICAgICAgICAgICBleGVmaWxlID0gJ2JkdC10b29scyc7XHJcbiAgICAgICAgICAgIGJkdF90b29scyA9IHBhdGguam9pbihTeXNQcm9jZXNzLmN3ZCgpLCBleGVmaWxlKVxyXG4gICAgICAgICAgICBhd2FpdCBDaGlsZFByb2Nlc3MuZXhlYyhgY2htb2QgK3ggJHtiZHRfdG9vbHN9YCwgeyBjd2Q6IHBhdGguZGlybmFtZShiZHRfdG9vbHMpfSlcclxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMubV9wbGF0Zm9ybSA9PT0gJ2hpd2lmaScpIHtcclxuICAgICAgICAgICAgZXhlZmlsZSA9ICdiZHQtdG9vbHMtaGl3aWZpJztcclxuICAgICAgICB9IGVsc2UgaWYob3MuYXJjaCgpID09ICdhcm0nKSB7XHJcbiAgICAgICAgICAgIGV4ZWZpbGUgPSAnYmR0LXRvb2xzLWFuZHJvaWQzMic7XHJcbiAgICAgICAgICAgIGJkdF90b29scyA9IHBhdGguam9pbihTeXNQcm9jZXNzLmN3ZCgpLCBleGVmaWxlKVxyXG4gICAgICAgICAgICBhd2FpdCBDaGlsZFByb2Nlc3MuZXhlYyhgY2htb2QgK3ggJHtiZHRfdG9vbHN9YCwgeyBjd2Q6IHBhdGguZGlybmFtZShiZHRfdG9vbHMpfSlcclxuICAgICAgICB9ZWxzZSBpZihvcy5hcmNoKCkgPT0gJ2FybTY0Jykge1xyXG4gICAgICAgICAgICBleGVmaWxlID0gJ2JkdC10b29scy1hbmRyb2lkNjQnO1xyXG4gICAgICAgICAgICBiZHRfdG9vbHMgPSBwYXRoLmpvaW4oU3lzUHJvY2Vzcy5jd2QoKSwgZXhlZmlsZSlcclxuICAgICAgICAgICAgYXdhaXQgQ2hpbGRQcm9jZXNzLmV4ZWMoYGNobW9kICt4ICR7YmR0X3Rvb2xzfWAsIHsgY3dkOiBwYXRoLmRpcm5hbWUoYmR0X3Rvb2xzKX0pXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgZXhlZmlsZSA9ICdiZHQtdG9vbHMnO1xyXG4gICAgICAgICAgICBiZHRfdG9vbHMgPSBwYXRoLmpvaW4oU3lzUHJvY2Vzcy5jd2QoKSwgZXhlZmlsZSlcclxuICAgICAgICAgICAgYXdhaXQgQ2hpbGRQcm9jZXNzLmV4ZWMoYGNobW9kICt4ICR7YmR0X3Rvb2xzfWAsIHsgY3dkOiBwYXRoLmRpcm5hbWUoYmR0X3Rvb2xzKX0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMubV9sb2dnZXIuaW5mbyhgYmR0IHBhdGggJHtiZHRfdG9vbHN9YClcclxuICAgICAgICBsZXQgcGVlck5hbWU6IHN0cmluZyA9IGAke1JhbmRvbUdlbmVyYXRvci5zdHJpbmcoMzIpfWA7XHJcbiAgICAgICAgbGV0IHN1YiA9IENoaWxkUHJvY2Vzcy5zcGF3bihgJHtwYXRoLmpvaW4oU3lzUHJvY2Vzcy5jd2QoKSwgZXhlZmlsZSl9YCwgW3RoaXMubV9sb2NhbFNlcnZlclBvcnQudG9TdHJpbmcoKSwgcGVlck5hbWUsIHRoaXMubV9sb2dnZXIuZGlyKCldLCB7c3RkaW86ICdpZ25vcmUnLCBjd2Q6IFN5c1Byb2Nlc3MuY3dkKCksIGRldGFjaGVkOiB0cnVlLCB3aW5kb3dzSGlkZTogdHJ1ZSxlbnY6e0NZRlNfQ09OU09MRV9MT0dfTEVWRUw6YCR7bG9nVHlwZX1gLENZRlNfRklMRV9MT0dfTEVWRUxfS0VZOmAke2xvZ1R5cGV9YCxSVVNUX0xPRzpgJHtsb2dUeXBlfWB9fSk7XHJcbiAgICAgICAgc3ViLnVucmVmKCk7XHJcbiAgICAgICAgdGhpcy5tX3BlZXJzLnNldChwZWVyTmFtZSwge30pO1xyXG4gICAgICAgIHRoaXMubV9sb2dnZXIuaW5mbyhgIyMjI2JkdC10b29scyAke3BlZXJOYW1lfSBzdGFydGApXHJcbiAgICAgICAgdGhpcy5tX2xwY1N0YXR1cyA9IHRydWU7XHJcbiAgICAgICAgbGV0IGNoZWNrID01XHJcbiAgICAgICAgd2hpbGUoY2hlY2s+MCl7XHJcbiAgICAgICAgICAgIGlmKHRoaXMubV9wZWVycy5nZXQocGVlck5hbWUpPy5wZWVyKXtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7ZXJyOiBFcnJvckNvZGUuc3VjYyxwZWVyTmFtZX07XHJcbiAgICAgICAgICAgIH0gXHJcbiAgICAgICAgICAgIGF3YWl0IHNsZWVwKDIwMDApO1xyXG4gICAgICAgICAgICBjaGVjayAtLVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4ge2VycjogRXJyb3JDb2RlLnRpbWVvdXQscGVlck5hbWV9O1xyXG4gICAgfVxyXG4gICAgYXN5bmMgdXRpbFJlcXVlc3QoY29tbWFuZDpCZHRMcGNDb21tYW5kKTpQcm9taXNlPEJkdExwY1Jlc3A+e1xyXG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnV0aWxUb29sIS51dGlsUmVxdWVzdChjb21tYW5kKTtcclxuICAgIH1cclxuICAgIGFzeW5jIHNlbmRCZHRMcGNDb21tYW5kKGNvbW1hbmQ6QmR0THBjQ29tbWFuZCk6UHJvbWlzZTxCZHRMcGNSZXNwPntcclxuICAgICAgICBpZighdGhpcy5tX3BlZXJzLmhhcyhjb21tYW5kLmpzb24ucGVlck5hbWUpKXsgXHJcbiAgICAgICAgICAgIHRoaXMubV9sb2dnZXIuZXJyb3IoYCR7Y29tbWFuZC5qc29uLnBlZXJOYW1lfSBub3QgZXhpc3RgKVxyXG4gICAgICAgICAgICByZXR1cm4ge2VycjogRXJyb3JDb2RlLm5vdEV4aXN0fTtcclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IHJlc3VsdCA9IGF3YWl0IHRoaXMubV9wZWVycy5nZXQoY29tbWFuZC5qc29uLnBlZXJOYW1lKSEucGVlciEuc2VuZEJkdExwY0NvbW1hbmQoY29tbWFuZCk7XHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuICAgIGFzeW5jIGNyZWF0ZUJkdExwY0xpc3RlbmVyKGNvbW1hbmQ6QmR0THBjQ29tbWFuZCk6UHJvbWlzZTxCZHRMcGNSZXNwPntcclxuICAgICAgICBpZighdGhpcy5tX3BlZXJzLmhhcyhjb21tYW5kLmpzb24ucGVlck5hbWUpKXsgXHJcbiAgICAgICAgICAgIHJldHVybiB7ZXJyOiBFcnJvckNvZGUubm90RXhpc3R9O1xyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgIHBlZXJOYW1lIDogc3RyaW5nID0gY29tbWFuZC5qc29uLnBlZXJOYW1lO1xyXG4gICAgICAgIGxldCAgZXZlbnROYW1lICA6IHN0cmluZyA9IGNvbW1hbmQuanNvbi5ldmVudE5hbWU7XHJcbiAgICAgICAgbGV0IHJlc3VsdCA9IGF3YWl0IHRoaXMubV9wZWVycy5nZXQocGVlck5hbWUpIS5wZWVyIS5jcmVhdGVCZHRMcGNMaXN0ZW5lcihjb21tYW5kLGFzeW5jKGV2ZW50QXJnKT0+e1xyXG4gICAgICAgICAgICB0aGlzLm1faW50ZXJmYWNlLmZpcmVFdmVudChgJHtldmVudE5hbWV9YCxFcnJvckNvZGUuc3VjYyxldmVudEFyZylcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfVxyXG59XHJcblxyXG5cclxuXHJcbiJdfQ==
