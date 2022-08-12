const Base = require('../../agent/base/common/base.js');
import * as path from 'path';
import * as fs from 'fs-extra';
import { DirHelper, FileUploader, GlobalConfig, Logger, LocalStorageJson, TaskClient, TaskClientInterface } from '../../agent/base';
import { CustumObjectType } from '../../agent/forward/proto';
import { BuckyError, BuckyErrorCode, BuckyResult, Err, Ok } from '../../cyfs_node/cyfs_node';
    
export async function agent_init(): Promise<BuckyResult<TaskClientInterface>>{

    let param: any = {"userData":[],"root":".","version":"1.2","md5":"","url":"","namespace":{"agentid":"mhnWQWGJ","serviceid":"4","taskid":"CYFS_debuger"},"port":62891,"key":"ZnQxBzR7edDHJiH4QNHJ5rfxhzZXknw","platform":"win32","logPath":"."}

    DirHelper.setRootDir(param.root);

    Base.BX_SetLogLevel(Base.BLOG_LEVEL_DEBUG);
    Base.BX_EnableFileLog(param.logPath, `${path.basename(process.argv[1], '.js')}`, '.log');
    Base.blog.enableConsoleTarget(false);
    Base.blog.info(`current dir=${process.cwd()}, rootdir=${DirHelper.getRootDir()}`);

    FileUploader.getInstance().init(GlobalConfig.fileUploadServer.host, GlobalConfig.fileUploadServer.port);

    let logger: Logger = new Logger(Base.blog.info, Base.blog.debug, Base.blog.error, param.logPath);

    let storage: LocalStorageJson = new LocalStorageJson({
        file: path.join(DirHelper.getConfigDir(), `service_${param.servicename}.json`),
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

    let err = task.init(GlobalConfig.forwardServer.host, GlobalConfig.forwardServer.port);
    if (err) {
        Base.blog.info(`[task taskid=${param.namespace.taskid}] init server failed, err=${err}`);
        return Err(BuckyError.from(BuckyErrorCode.Failed));
    }

    err = await task.start();
    if (err) {
        Base.blog.info(`[task taskid=${param.namespace.taskid}] start server failed, err=${err}`);      
        return Err(BuckyError.from(BuckyErrorCode.Failed));

    }

    return Ok(task as TaskClientInterface);
}
