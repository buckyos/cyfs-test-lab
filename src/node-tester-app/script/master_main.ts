import * as path from 'path';
import * as fs from 'fs-extra';
import { DirHelper, FileUploader, GlobalConfig, Logger, LocalStorageJson, LocalMaster, ClientExitCode } from '../base';
const Base = require('../base/common/base.js');


async function main() {
    let dir = process.argv[2];
    let agentid = process.argv[3];
    let platform = process.argv[4];
    let localTool = process.argv[5];

    DirHelper.setRootDir(dir);
    let logFolder = DirHelper.getLogDir();

    Base.BX_SetLogLevel(Base.BLOG_LEVEL_INFO);
    Base.BX_EnableFileLog(logFolder, `${path.basename(process.argv[1], '.js')}`, '.log');
    Base.blog.enableConsoleTarget(false);
    Base.blog.info(`current dir=${process.cwd()}, rootdir=${DirHelper.getRootDir()}`);

    FileUploader.getInstance().init(GlobalConfig.fileUploadServer.host, GlobalConfig.fileUploadServer.port);
    process.on('unhandledRejection', (err: any) => {
        Base.blog.error(`unhandledRejection e=${err.stack}`);
    });
    process.on('uncaughtException', (err: any) => {
        Base.blog.error(`uncaughtException e=${err},  at ${err.stack}`);
    });

    let logger: Logger = new Logger(Base.blog.info, Base.blog.debug, Base.blog.error, logFolder);

    let storage: LocalStorageJson = new LocalStorageJson({
        file: path.join(DirHelper.getConfigDir(), 'localmaster.json'),
        logger,
    });

    let localMaster: LocalMaster = new LocalMaster({
        agentid,
        version: GlobalConfig.version,
        heartbeatIntervalTime: GlobalConfig.heartbeatIntervalTime,
        logger,
        storage,
        platform,
    });

    let watchTimer: NodeJS.Timer | undefined;
    let restartWatchTimer = () => {
        if (watchTimer) {
            clearTimeout(watchTimer);
        }

        watchTimer = setTimeout(() => {
            Base.blog.info('father exit==============');
            localMaster.exit(ClientExitCode.killed, 'father exit', 10 * 1000);
        }, 60 * 1000);
    }
    process.on('message', (data:any) => {
        console.info(`send father keeplive============== ${Date.now()}`);
        let command: any;
        if (localTool) {
            try {
                command = JSON.parse(data);
                localMaster.runTaskLocal({
                    from: { agentid, serviceid: 'LocalMasterServiceId' },
                    to: { agentid, serviceid: 'LocalMasterServiceId' },
                    name: 'sys.runtask.req',
                    seq: 1,
                    jobid: '1',
                    serviceid: command.serviceid,
                    taskid: command.taskid,
                    version: '1.2',
                    url: '',
                    md5: '',
                    param: []
                }, true);
            } catch(err) {
                //console.log(`parse command failed, err=${err}`);
            }
        }
        restartWatchTimer();
    });
    restartWatchTimer();
    process.on('exit',()=>{
        Base.blog.error(`[master_main] exit`);
    })
    process.on('error',(error)=>{
        Base.blog.error(`[master_main] error ${error}`);
    })
    let err = localMaster.init(GlobalConfig.ip, GlobalConfig.port);
    if (err) {
        Base.blog.info(`[startup] init server failed, err=${err}`);
        return;
    }

    err = await localMaster.start();
    if (err) {
        Base.blog.info(`[startup] start server failed, err=${err}`);
    }
}

main();