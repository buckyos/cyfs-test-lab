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
const Base = require('../../../common/base.js');
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const common_1 = require("../../../common");
const cyfs_driver_base_1 = require("../../../cyfs-driver-base");
const command_1 = require("../../command");
async function main() {
    let index = 2;
    if (!process.argv[index]) {
        return;
    }
    let paramPath = process.argv[index++];
    let param = {};
    try {
        param = JSON.parse(fs.readFileSync(paramPath, { encoding: 'utf-8' }));
    }
    catch (err) {
        return;
    }
    // let dir = process.argv[index++];
    // let version: string = process.argv[index++];
    // let servicename: string = process.argv[index++]
    // let agentid: string = process.argv[index++];
    // let serviceid: string = process.argv[index++];
    // let port: number = parseInt(process.argv[index++]);
    // let other: string[] = process.argv.slice(index++);
    common_1.DirHelper.setRootDir(param.root);
    Base.BX_SetLogLevel(Base.BLOG_LEVEL_DEBUG);
    Base.BX_EnableFileLog(param.logPath, `${path.basename(process.argv[1], '.js')}`, '.log');
    Base.blog.enableConsoleTarget(false);
    Base.blog.info(`current dir=${process.cwd()}, rootdir=${common_1.DirHelper.getRootDir()}`);
    common_1.FileUploader.getInstance().init(cyfs_driver_base_1.GlobalConfig.fileUploadServer.host, cyfs_driver_base_1.GlobalConfig.fileUploadServer.port);
    process.on('unhandledRejection', (err) => {
        Base.blog.error(`unhandledRejection e=${err.stack}`);
    });
    process.on('uncaughtException', err => {
        Base.blog.error(`uncaughtException e=${err},  at ${err.stack}`);
    });
    let logger = new common_1.Logger(Base.blog.info, Base.blog.debug, Base.blog.error, param.logPath);
    let storage = new common_1.LocalStorageJson({
        file: path.join(common_1.DirHelper.getConfigDir(), `service_${param.servicename}.json`),
        logger,
    });
    let service = new cyfs_driver_base_1.ServiceClient({
        namespace: param.namespace,
        version: param.version,
        heartbeatIntervalTime: cyfs_driver_base_1.GlobalConfig.heartbeatIntervalTime,
        argv: param.userData,
        logger,
        storage,
        key: param.key,
        platform: param.platform,
    });
    let err = service.init('127.0.0.1', param.port);
    if (err) {
        Base.blog.info(`[service id=${param.namespace.serviceid}] init server failed, err=${err}`);
        return;
    }
    let watchTimer;
    let restartWatchTimer = () => {
        if (watchTimer) {
            clearTimeout(watchTimer);
        }
        watchTimer = setTimeout(() => {
            Base.blog.error("service exit timeout 100 s");
            service.exit(command_1.ClientExitCode.killed, 'father exit', 100 * 1000);
        }, 100 * 1000);
    };
    process.on('message', (data) => {
        restartWatchTimer();
    });
    restartWatchTimer();
    err = await service.start();
    if (err) {
        Base.blog.info(`[service id=${param.namespace.serviceid}] start server failed, err=${err}`);
        return;
    }
    let serviceDir = common_1.DirHelper.getServiceDir(param.servicename);
    process.chdir(serviceDir);
    let filePath = path.join(serviceDir, 'onload.js');
    if (!fs.existsSync(filePath)) {
        await service.exit(command_1.ClientExitCode.failed, 'service onload.js not exist', 60 * 1000);
        return;
    }
    let loadModule = require(filePath);
    loadModule.ServiceMain(service);
}
main();
