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
exports.ClientStack = void 0;
const common_1 = require("../../../common");
const command_1 = require("../../command");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const channel_1 = require("../../command/channel");
const SysUtil = __importStar(require("util"));
const compressing = __importStar(require("compressing"));
class ClientStack {
    constructor(options) {
        this.m_version = options.version;
        this.m_heartbeatIntervalTime = options.heartbeatIntervalTime;
        this.m_seq = 1;
        this.m_logger = options.logger;
        this.m_localStorage = options.storage;
        this.m_channelWithMaster = new channel_1.Channel({
            namespace: options.namespace,
            logger: options.logger,
            timeout: options.heartbeatIntervalTime * 3000,
        });
        this.m_key = options.key;
        this.m_platform = options.platform;
        this.m_dispatcher = new command_1.CommandDispatch();
    }
    get dispatcher() {
        return this.m_dispatcher;
    }
    get namespace() {
        return this.m_channelWithMaster.namespace;
    }
    get logger() {
        return this.m_channelWithMaster.logger;
    }
    get version() {
        return this.m_version;
    }
    set version(v) {
        this.m_version = v;
    }
    get localStorage() {
        return this.m_localStorage;
    }
    get heartbeatTime() {
        return this.m_heartbeatIntervalTime;
    }
    get nextSeq() {
        return this.m_seq++;
    }
    get channelWithMaster() {
        return this.m_channelWithMaster;
    }
    getPlatform() {
        return this.m_platform;
    }
    init(serverHost, serverPort) {
        this.m_ip = serverHost;
        this.m_port = serverPort;
        this.channelWithMaster.on('command', (channel, command) => {
            if (command_1.NamespaceHelper.isNamespaceEqual(command.to, this.namespace)) {
                this.dispatcher.dispatch(command);
            }
        });
        return common_1.ErrorCode.succ;
    }
    async start() {
        return await this._init();
    }
    async exit(code, msg, timeout) {
        await common_1.sleep(3000);
        process.exit(code);
    }
    getLogger() {
        return this.logger;
    }
    getNamespace() {
        return this.namespace;
    }
    async zip(srcfile, dstfileName) {
        let lstat = SysUtil.promisify(fs.lstat);
        let readFile = SysUtil.promisify(fs.readFile);
        let readDir = SysUtil.promisify(fs.readdir);
        let existFile = SysUtil.promisify(fs.exists);
        let unlink = SysUtil.promisify(fs.unlink);
        let copyFile = SysUtil.promisify(fs.copyFile);
        let copyDir = async (baseDir, file, dstDir) => {
            let absPath = path.join(baseDir, file);
            let stat = await lstat(absPath);
            if (stat.isFile()) {
                await copyFile(absPath, path.join(dstDir, file));
            }
            else {
                common_1.DirHelper.ensureDirExist(path.join(dstDir, file));
                let files = await readDir(absPath);
                for (let f of files) {
                    await copyDir(path.join(baseDir, file), f, path.join(dstDir, file));
                }
            }
        };
        try {
            if (!await existFile(srcfile)) {
                return { err: common_1.ErrorCode.notExist };
            }
            let dstPath = path.join(common_1.DirHelper.getTempDir(), dstfileName);
            if (fs.existsSync(dstPath)) {
                await unlink(dstPath);
            }
            let stat = await lstat(srcfile);
            if (stat.isFile()) {
                let copyedFile = path.join(common_1.DirHelper.getTempDir(), path.basename(srcfile));
                await copyFile(srcfile, copyedFile);
                await compressing.zip.compressFile(copyedFile, dstPath);
                await unlink(copyedFile);
            }
            else {
                await copyDir(path.dirname(srcfile), path.basename(srcfile), common_1.DirHelper.getTempDir());
                await compressing.zip.compressDir(path.join(common_1.DirHelper.getTempDir(), path.basename(srcfile)), dstPath);
                await common_1.DirHelper.emptyDir(path.join(common_1.DirHelper.getTempDir(), path.basename(srcfile)));
                await fs.rmdirSync(path.join(common_1.DirHelper.getTempDir(), path.basename(srcfile)));
            }
            return { err: common_1.ErrorCode.succ, dstPath };
        }
        catch (err) {
            this.logger.error(`zip failed, src=${srcfile}, dst=${dstfileName}, err=${err}`);
            return { err: common_1.ErrorCode.exception };
        }
    }
    async uploadFile(file, remoteDir) {
        if (!fs.existsSync(file)) {
            return { err: common_1.ErrorCode.notExist };
        }
        let info = await common_1.FileUploader.getInstance().upload(file, remoteDir);
        if (info.result !== 0) {
            this.m_logger.error(`uploadfile failed,info=${JSON.stringify(info)}`);
            return { err: common_1.ErrorCode.netError };
        }
        return { err: common_1.ErrorCode.succ, url: info.content.url };
    }
    report(opt, param) {
        return common_1.ErrorCode.succ;
    }
    async waitCommand(name, seq, timeout) {
        if (timeout && timeout < ClientStack.MinTimeout) {
            timeout = ClientStack.MinTimeout;
        }
        return await new Promise((v) => {
            let timeoutTimer = undefined;
            let cookieInfo;
            let clearTimer = () => {
                if (timeoutTimer) {
                    clearTimeout(timeoutTimer);
                    timeoutTimer = undefined;
                }
            };
            let startTimer = () => {
                if (timeout) {
                    timeoutTimer = setTimeout(() => {
                        timeoutTimer = undefined;
                        this.dispatcher.removeHandler(name, cookieInfo.cookie);
                        v({ err: common_1.ErrorCode.timeout });
                    }, timeout);
                }
            };
            cookieInfo = this.dispatcher.addHandler(name, (c) => {
                clearTimer();
                if (c.err && c.err === common_1.ErrorCode.waiting) {
                    startTimer();
                    return;
                }
                if (cookieInfo && !cookieInfo.err && cookieInfo.cookie) {
                    this.dispatcher.removeHandler(name, cookieInfo.cookie);
                }
                v({ err: common_1.ErrorCode.succ, c });
            }, (c) => {
                return c.seq === seq;
            });
            startTimer();
        });
    }
    _generateHeartbeatCommand() {
        let c = {
            from: this.namespace,
            to: { agentid: this.namespace.agentid, serviceid: command_1.NamespaceHelper.LocalMasterServiceId },
            name: command_1.SysCommandName.sys_ping_req,
            seq: this.nextSeq,
            key: this.m_key,
        };
        return c;
    }
    _isRetryRpc() {
        return false;
    }
    _beginHeartbeat() {
        this.m_heartbeatTimer = setInterval(async () => {
            let c = this._generateHeartbeatCommand();
            this.m_channelWithMaster.send(c);
        }, this.m_heartbeatIntervalTime);
    }
    _endHeartbeat() {
        if (this.m_heartbeatTimer) {
            clearInterval(this.m_heartbeatTimer);
            this.m_heartbeatTimer = undefined;
        }
    }
    async _init() {
        let info = await this._connectImpl(this.m_ip, this.m_port);
        if (info.err) {
            return info.err;
        }
        this.m_channelWithMaster.initFromRpc(info.rpc);
        let onTimeout = (c) => {
            this.m_channelWithMaster.removeListener('timeout', onTimeout);
            this._endHeartbeat();
            if (this._isRetryRpc()) {
                this._init();
            }
        };
        this.m_channelWithMaster.on('timeout', onTimeout);
        this._beginHeartbeat();
        return common_1.ErrorCode.succ;
    }
    async _connectImpl(ip, port) {
        do {
            let filename;
            // if (path.basename((require.main as any).filename) === 'master_main.js') {
            //     filename = path.join(DirHelper.getTempDir(), 'master_command');
            // }
            let rpc = new command_1.Rpc({ logger: this.m_logger, filename });
            let err = await new Promise((v) => {
                rpc.once('establish', (r) => {
                    rpc.removeAllListeners();
                    rpc.send(this._generateHeartbeatCommand());
                    v(common_1.ErrorCode.succ);
                });
                rpc.once('error', (r, errcode) => {
                    this.m_logger.debug(`connect to server failed,ip=${ip},port=${port} will retry`);
                    v(errcode);
                });
                let err = rpc.connect(ip, port);
                if (err) {
                    v(err);
                }
            });
            if (!err) {
                return { err: common_1.ErrorCode.succ, rpc };
            }
        } while (this._isRetryRpc());
        return { err: common_1.ErrorCode.fail };
    }
}
exports.ClientStack = ClientStack;
ClientStack.MinTimeout = 5000 * 1000;
