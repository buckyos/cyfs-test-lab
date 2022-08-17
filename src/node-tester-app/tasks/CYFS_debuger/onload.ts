import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../base';

import {TestRunner,Testcase,Task,Agent} from '../../taskTools/cyfs_stack/stackRunner';
import { CustumObjectType} from '../../taskTools/cyfs_stack/ws_params';
var date = require("silly-datetime");


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
        remark : "测试NON put_object操作100次，并发数10 操作流程 （1）A put object B (2)B get object Noc check",
        environment : "lab",
        test_date :  date.format(new Date(),'YYYY/MM/DD'),
        agentList,
        taskList,
        taskMult:10
    }
    //_interface.getLogger().info(JSON.stringify(testcase))
    //测试用例执行
    await testRunner.testCaseRunner(testcase);
}
