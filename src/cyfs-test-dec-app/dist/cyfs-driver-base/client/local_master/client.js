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
exports.ClientProxy = void 0;
const common_1 = require("../../../common");
const command_1 = require("../../command");
const ChildProcess = __importStar(require("child_process"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const config_1 = require("../../../config/config");
class ClientProxy extends command_1.Channel {
    constructor(options) {
        super(options);
        this.m_key = common_1.RandomGenerator.string(32);
        this.m_dispatcher = new command_1.CommandDispatch();
    }
    get dispatcher() {
        return this.m_dispatcher;
    }
    get key() {
        return this.m_key;
    }
    onPing(c) {
        //do nothing
    }
    forkProcess(file, param) {
        let now = common_1.FormatDateHelper.now('MM-dd-HH-mm-ss-SS');
        param.logPath = common_1.DirHelper.getLogDir(`${now}-${common_1.RandomGenerator.string(4)}`);
        let paramPath = path.join(param.logPath, 'param.json');
        try {
            fs.writeFileSync(paramPath, JSON.stringify(param));
        }
        catch (err) {
            this.logger.error(`write param failed, err=${err}`);
        }
        this.m_process = ChildProcess.fork(file, [paramPath], { silent: true });
        this.m_process.on('error', (error) => {
            this.logger.error(`###### TASK CLIENT RUN ERROR,${error}`);
        });
        this.m_process.on('exit', (code, signal) => {
            this.logger.error(`###### TASK CLIENT RUN EXIST`);
            this.m_process = undefined;
            if (signal) {
                code = command_1.ClientExitCode.killed;
            }
            else {
                //主动退出
            }
            if (this.m_keepliveTimer) {
                clearInterval(this.m_keepliveTimer);
                this.m_keepliveTimer = undefined;
            }
            if (config_1.GlobalConfig.removeLog) {
                common_1.DirHelper.emptyDir(param.logPath, true);
            }
            let runConfig = path.join(common_1.DirHelper.getLogDir(), "running.pid");
            if (fs.existsSync(runConfig)) {
                fs.removeSync(runConfig);
            }
            this.emit('close', this, code);
        });
        this.m_keepliveTimer = setInterval(() => {
            this.m_process.send('1');
        }, 2000);
    }
    async stopProcess() {
        this.logger.info(`######  CLIENT stopProcess `);
        if (!this.m_process) {
            return common_1.ErrorCode.notExist;
        }
        return await new Promise((v) => {
            this.m_process.once('exit', () => {
                v(common_1.ErrorCode.succ);
            });
            this.m_process.kill();
        });
    }
}
exports.ClientProxy = ClientProxy;
