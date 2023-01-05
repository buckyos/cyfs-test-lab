const Base = require('../../common/base.js');
import * as path from 'path';
import * as fs from 'fs-extra';
import { DirHelper, FileUploader, GlobalConfig, Logger, LocalStorageJson, ServiceClient, ServiceClientInterface } from '../..';
import { ClientExitCode } from '../../command';


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

    // let dir = process.argv[index++];
    // let version: string = process.argv[index++];
    // let servicename: string = process.argv[index++]
    // let agentid: string = process.argv[index++];
    // let serviceid: string = process.argv[index++];
    // let port: number = parseInt(process.argv[index++]);
    // let other: string[] = process.argv.slice(index++);

    DirHelper.setRootDir(param.root);

    Base.BX_SetLogLevel(Base.BLOG_LEVEL_INFO);
    Base.BX_EnableFileLog(param.logPath, `${path.basename(process.argv[1], '.js')}`, '.log');
    Base.blog.enableConsoleTarget(false);
    Base.blog.info(`current dir=${process.cwd()}, rootdir=${DirHelper.getRootDir()}`);

    FileUploader.getInstance().init(GlobalConfig.fileUploadServer.host, GlobalConfig.fileUploadServer.port);
    process.on('unhandledRejection', (err) => {
        Base.blog.error(`unhandledRejection e=${(err as any).stack}`);
    });
    process.on('uncaughtException', err => {
        Base.blog.error(`uncaughtException e=${err},  at ${err.stack}`);
    });

    let logger: Logger = new Logger(Base.blog.info, Base.blog.debug, Base.blog.error, param.logPath);

    let storage: LocalStorageJson = new LocalStorageJson({
        file: path.join(DirHelper.getConfigDir(), `service_${param.servicename}.json`),
        logger,
    });

    let service: ServiceClient = new ServiceClient({
        namespace: param.namespace,
        version: param.version,
        heartbeatIntervalTime: GlobalConfig.heartbeatIntervalTime,
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

    let watchTimer: NodeJS.Timer | undefined;
    let restartWatchTimer = () => {
        if (watchTimer) {
            clearTimeout(watchTimer);
        }

        watchTimer = setTimeout(() => {
            Base.blog.error("service exit timeout 100 s");
            service.exit(ClientExitCode.killed, 'father exit', 100 * 1000);
        }, 100 * 1000);
    }
    process.on('message', (data) => {
        restartWatchTimer();
    });
    restartWatchTimer();

    err = await service.start();
    if (err) {
        Base.blog.info(`[service id=${param.namespace.serviceid}] start server failed, err=${err}`);
        return ;
    }

    let serviceDir: string = DirHelper.getServiceDir(param.servicename);
    process.chdir(serviceDir);
    let filePath: string = path.join(serviceDir, 'onload.js');
    if (!fs.existsSync(filePath)) {
        await service.exit(ClientExitCode.failed, 'service onload.js not exist', 60 * 1000);
        return;
    }
    let loadModule = require(filePath);
    loadModule.ServiceMain(service as ServiceClientInterface);
}

main();