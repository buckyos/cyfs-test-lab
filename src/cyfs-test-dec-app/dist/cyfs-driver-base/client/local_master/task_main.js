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
//import { DirHelper, FileUploader, GlobalConfig, Logger, LocalStorageJson, } from '../..';
const common_1 = require("../../../common");
const cyfs_driver_base_1 = require("../../../cyfs-driver-base");
const common_2 = require("../../../common");
const command_1 = require("../../command");
const compressing = __importStar(require("compressing"));
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
    common_1.DirHelper.setRootDir(param.root);
    Base.BX_SetLogLevel(Base.BLOG_LEVEL_DEBUG);
    Base.BX_EnableFileLog(param.logPath, `${path.basename(process.argv[1], '.js')}`, '.log');
    Base.blog.enableConsoleTarget(false);
    Base.blog.info(`current dir=${process.cwd()}, rootdir=${common_1.DirHelper.getRootDir()}`);
    common_1.FileUploader.getInstance().init(cyfs_driver_base_1.GlobalConfig.fileUploadServer.host, cyfs_driver_base_1.GlobalConfig.fileUploadServer.port);
    let reportCrash = async (stack) => {
        if (!cyfs_driver_base_1.GlobalConfig.reportCrash) {
            return;
        }
        let file = ``;
        file = path.join(common_1.DirHelper.getTempDir(), file);
        fs.writeFileSync(file, `agentid=${param.namespace.agentid}, serviceid=${param.namespace.serviceid}, taskid=${param.namespace.taskid}, version=${param.version}\r\n`);
        fs.appendFileSync(file, stack);
        await common_1.FileUploader.getInstance().upload(file);
    };
    process.on('unhandledRejection', (err) => {
        Base.blog.error(`unhandledRejection e=${err.stack}`);
        reportCrash(`${err.stack}`);
    });
    process.on('uncaughtException', err => {
        Base.blog.error(`uncaughtException e=${err},  at ${err.stack}`);
        reportCrash(`${err.stack}`);
    });
    process.on('exit', () => {
        Base.blog.error(`#### task_main exit`);
    });
    let logger = new common_1.Logger(Base.blog.info, Base.blog.debug, Base.blog.error, param.logPath);
    let storage = new common_1.LocalStorageJson({
        file: path.join(common_1.DirHelper.getConfigDir(), `task_${param.namespace.taskid}.json`),
        logger,
    });
    let task = new cyfs_driver_base_1.TaskClient({
        namespace: param.namespace,
        version: param.version,
        heartbeatIntervalTime: cyfs_driver_base_1.GlobalConfig.heartbeatIntervalTime,
        argv: param.userData,
        logger,
        storage,
        key: param.key,
        platform: param.platform,
    });
    let watchTimer;
    let restartWatchTimer = () => {
        if (watchTimer) {
            clearTimeout(watchTimer);
        }
        watchTimer = setTimeout(() => {
            task.exit(command_1.ClientExitCode.killed, 'fathe exit', 60 * 1000);
        }, 60 * 1000);
    };
    process.on('message', (data) => {
        restartWatchTimer();
    });
    restartWatchTimer();
    let err = task.init('127.0.0.1', param.port);
    if (err) {
        Base.blog.info(`[task taskid=${param.namespace.taskid}] init server failed, err=${err}`);
        return;
    }
    err = await task.start();
    if (err) {
        Base.blog.info(`[task taskid=${param.namespace.taskid}] start server failed, err=${err}`);
        return;
    }
    if (!param.localTest) {
        let zipFile = path.join(common_1.DirHelper.getUpdateDir(), `${param.md5}.zip`);
        if (!fs.existsSync(zipFile) || common_2.getFileMd5(zipFile).md5 !== param.md5) {
            let err = await common_2.HttpDownloader.downloadByUrl(param.url, zipFile, param.md5);
            if (err) {
                Base.blog.error(`down task failed, err=${err} url=${param.url} md5=${param.md5}`);
                await task.exit(command_1.ClientExitCode.failed, `download task failed,url=${param.url} md5=${param.md5}`);
                return;
            }
        }
        let dir = common_1.DirHelper.getTaskDir(param.namespace.taskid);
        await compressing.zip.uncompress(zipFile, dir);
    }
    let taskDir = common_1.DirHelper.getTaskDir(param.namespace.taskid);
    let filePath = path.join(taskDir, 'onload.js');
    if (!fs.existsSync(filePath)) {
        await task.exit(command_1.ClientExitCode.failed, `task onload.js not exist`);
        return;
    }
    //
    let runConfig = path.join(common_1.DirHelper.getLogDir(), "running.pid");
    if (param.localTest) {
        fs.writeFileSync(runConfig, `${process.pid}\n`);
    }
    let loadModule = require(filePath);
    try {
        loadModule.TaskMain(task);
    }
    catch (error) {
        Base.blog.error(`task run expection,err = ${JSON.stringify(error)}`);
        task.runSum = 0;
    }
    let runSum = 0;
    while (true) {
        if (task.runSum != runSum) {
            Base.blog.info(`===========task run finished`);
            if (param.localTest) {
                fs.removeSync(runConfig);
            }
            break;
        }
        await common_2.sleep(5000);
    }
}
main();
