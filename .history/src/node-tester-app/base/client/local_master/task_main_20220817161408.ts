const Base = require('../../common/base.js');
import * as path from 'path';
import * as fs from 'fs-extra';
import { DirHelper, FileUploader, GlobalConfig, Logger, LocalStorageJson, TaskClient, TaskClientInterface } from '../..';
import { getFileMd5, HttpDownloader, sleep } from '../../common';
import { ClientExitCode } from '../../command';
import * as compressing from 'compressing';

async function main() {
    let index = 2;
    if (!process.argv[index]) {
        return ;
    }
    let paramPath = process.argv[index++];
    let param: any = {};
    try {
        param = JSON.parse(fs.readFileSync(paramPath, {encoding: 'utf-8'}));
    } catch (err) {
        return;
    }

    DirHelper.setRootDir(param.root);

    Base.BX_SetLogLevel(Base.BLOG_LEVEL_DEBUG);
    Base.BX_EnableFileLog(param.logPath, `${path.basename(process.argv[1], '.js')}`, '.log');
    Base.blog.enableConsoleTarget(false);
    Base.blog.info(`current dir=${process.cwd()}, rootdir=${DirHelper.getRootDir()}`);

    FileUploader.getInstance().init(GlobalConfig.fileUploadServer.host, GlobalConfig.fileUploadServer.port);
    
    let reportCrash = async (stack: string) => {
        if (!GlobalConfig.reportCrash) {
            return;
        }

        let file: string = ``;
        file = path.join(DirHelper.getTempDir(), file);
        fs.writeFileSync(file, `agentid=${param.namespace.agentid}, serviceid=${param.namespace.serviceid}, taskid=${param.namespace.taskid}, version=${param.version}\r\n`);
        fs.appendFileSync(file, stack);

        await FileUploader.getInstance().upload(file);
    }
    process.on('unhandledRejection', (err) => {
        Base.blog.error(`unhandledRejection e=${(err as any).stack}`);
        reportCrash(`${(err as any).stack}`);
    });
    process.on('uncaughtException', err => {
        Base.blog.error(`uncaughtException e=${err},  at ${err.stack}`);
        reportCrash(`${err.stack}`);
    });

    let logger: Logger = new Logger(Base.blog.info, Base.blog.debug, Base.blog.error, param.logPath);

    let storage: LocalStorageJson = new LocalStorageJson({
        file: path.join(DirHelper.getConfigDir(), `task_${param.namespace.taskid}.json`),
        logger,
    });

    let task: TaskClient = new TaskClient({
        namespace: param.namespace,
        version: param.version,
        heartbeatIntervalTime: GlobalConfig.heartbeatIntervalTime,
        argv: param.userData,
        logger,
        storage,
        key: param.key,
        platform: param.platform,
    });

    let watchTimer: NodeJS.Timer | undefined;
    let restartWatchTimer = () => {
        if (watchTimer) {
            clearTimeout(watchTimer);
        }

        watchTimer = setTimeout(() => {
            task.exit(ClientExitCode.killed, 'fathe exit', 60 * 1000);
        }, 60 * 1000);
    }
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
        let zipFile: string = path.join(DirHelper.getUpdateDir(), `${param.md5}.zip`);
        if (!fs.existsSync(zipFile) || getFileMd5(zipFile).md5 !== param.md5) {
            let err = await HttpDownloader.downloadByUrl(param.url, zipFile, param.md5);
            if (err) {
                Base.blog.error(`down task failed, err=${err} url=${param.url} md5=${param.md5}`);
                await task.exit(ClientExitCode.failed, `download task failed,url=${param.url} md5=${param.md5}`);
                return;
            }
        }
        let dir = DirHelper.getTaskDir(param.namespace.taskid);
        await compressing.zip.uncompress(zipFile, dir);
    }

    let taskDir: string = DirHelper.getTaskDir(param.namespace.taskid);
    let filePath: string = path.join(taskDir, 'onload.js');
    if (!fs.existsSync(filePath)) {
        await task.exit(ClientExitCode.failed, `task onload.js not exist`);
        return;
    }
    //
    let runConfig = path.join(DirHelper.getLogDir(),"running.pid")
    if(param.localTest){
        fs.writeFileSync(runConfig,`${process.pid}\n`);
    }
    let loadModule = require(filePath);
    try {
        loadModule.TaskMain(task as TaskClientInterface);
    } catch (error) {
        Base.blog.error(`task run expection,err = ${JSON.stringify(error)}`);
        task.runSum = 0;
    }
    
    let runSum = 0;
    while(true){
        if(task.runSum!=runSum){
            Base.blog.info(`===========task run finished`);
            if(param.localTest){
                fs.removeSync(runConfig);
            }
            break;
        }
        await sleep(5000)
    }
}
    

main();