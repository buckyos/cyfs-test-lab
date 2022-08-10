const Base = require('../../agent/base/common/base.js');
import * as path from 'path';
import * as fs from 'fs-extra';
import { DirHelper, FileUploader, GlobalConfig, Logger, LocalStorageJson, ServiceClient, ServiceClientInterface, TaskClient, TaskClientInterface } from '../../agent/base';
import { Agent, Task, Testcase, TestRunner } from '../../agent/task_tool/stackRunner';
import { CustumObjectType } from '../../agent/task_tool/ws_params';

var date = require("silly-datetime");


export async function agent_init() {

    let param: any = {"userData":[],"root":".","version":"1.2","md5":"","url":"","namespace":{"agentid":"undefined1-mhnWQWGJ","serviceid":"4","taskid":"CYFS_debuger"},"port":62891,"key":"ZnQxBzR7edDHJiH4QNHJ5rfxhzZXknw","localTest":true,"platform":"win32","logPath":"."}

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

    //begin connect to server ip=192.168.100.254 port=11080
    let err = task.init('192.168.100.254', 11080);
    if (err) {
        Base.blog.info(`[task taskid=${param.namespace.taskid}] init server failed, err=${err}`);
        return;
    }

    err = await task.start();
    if (err) {
        Base.blog.info(`[task taskid=${param.namespace.taskid}] start server failed, err=${err}`);
        return;
    }

    TaskMain(task as TaskClientInterface);
}

export async function TaskMain(_interface: TaskClientInterface) {
    // 测试用例demo说明: Zone2_Device1 机器使用CYFS协议栈ts_client 进行put_object 并且 get_object 检查数据操作，共执行100次，同时并发执行任务数10；
    
    // 测试节点
    let agentList:Array<Agent> = [
        {
            name : "Zone2_Device1", //名称标签
            cyfs_clients : [{
                name:"Zone2_Device1_ts_client", //   模拟协议栈 ${Agent.name}_0 、${Agent.name}_1 这样编号
                type:"runtime", //协议栈client 连接类型 runtime 、ood 、port
                SDK_type:"typescript",
            }],
            logType : "info", // 日志级别控制
            report : true, //报错cyfs库的性能数据
            report_time:10*1000, //间隔时间

        }
    ]
    // 测试用例执行的任务集合Task 和单个操作Action
    let taskList:Array<Task> = []
    for(let i =0;i<100;i++){
        taskList.push({
            LN : {name:"Zone2_Device1_ts_client"}, 
            RN : {name:"Zone2_Device1_ts_client"},  // remote
            clients : [],
            timeout : 100*1000, //超时时间
            action:[{
                type : "put_object_check",
                source : "Zone2_Device1_ts_client",
                target : "Zone2_Device1_ts_client",
                timeout : 100*1000,
                input_data : {
                    obj_type : CustumObjectType.MyText,
                    common : {
                        level: "router",
                        target: "Zone2_Device1_ts_client",
                        flags : 0
        
                    }
                },
                expect:{err:0,log:"run success"},
            }],
            expect:{err:0,log:"run success"},
        })
    }
    let testRunner = new TestRunner(_interface);
    //测试用例数据
    let testcase:Testcase = {
        TestcaseName:'NON_put_object',
        testcaseId : `NON_put_object_${Date.now()}`,
        remark : "测试NON put_object操作100次, 并发数10 操作流程 (1) A put object B (2) B get object Noc check",
        environment : "lab",
        test_date :  date.format(new Date(),'YYYY/MM/DD'),
        agentList,
        taskList,
        taskMult:10
    }
    _interface.getLogger().info(JSON.stringify(testcase))
    //测试用例执行
    await testRunner.testCaseRunner(testcase);
}
