import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../base';
import {TestRunner} from '../../taskTools/cyfs_bdt/testRunner';
import {Testcase,Task,ActionType,Resp_ep_type} from "../../taskTools/cyfs_bdt/type"
import {labAgent,BdtPeerClientConfig,LabSnList,randShuffle} from "../../taskTools/cyfs_bdt/labAgent"
import  * as BDTAction from "../../taskTools/cyfs_bdt/bdtAction"
import {AgentManager} from '../../taskTools/cyfs_bdt/agentManager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agentManager = AgentManager.createInstance(_interface);
    await agentManager.initAgentList(labAgent);
    //(2) 创建测试用例执行器 TestRunner
    let testRunner = new TestRunner(_interface);
    let testcaseName = "BDT_SN_restart_issuse"
    let testcase:Testcase = {
        TestcaseName: testcaseName,
        testcaseId: `${testcaseName}_${Date.now()}`,
        remark: `# 验证 SN 服务重启后，设备无法连接SN的问题`,
        environment: "lab",
    };
    await testRunner.initTestcase(testcase);
    //(3) 创建BDT测试客户端
    let config : BdtPeerClientConfig = {
            eps:{
                ipv4:{
                    udp:true,
                    tcp:true,
                }
            },
            logType:"info",
            //udp_sn_only : 1,
            SN :LabSnList,
            resp_ep_type:Resp_ep_type.All, 
    }
    // 每台机器运行一个bdt 客户端
    await agentManager.allAgentStartBdtPeer(config)
    //(4) 测试用例执行器添加测试任务
    for(let i=0;i<10;i++){
        let info = await testRunner.createPrevTask({
            LN : `PC_0013$1`,
            RN : `PC_0016$1`,
            timeout : 5*30*1000,
            action : []
        })
        // 1.1 LN 连接 RN
        let connect_1 =  `${Date.now()}_${RandomGenerator.string(10)}`;
        info = await testRunner.prevTaskAddAction(new BDTAction.SleepAction({
            type : ActionType.send_stream,
            LN : `PC_0013$1`,
            RN : `PC_0016$1`,
            fileSize : 10*1024*1024,
            config:{
                conn_tag: connect_1,
                timeout : 60*1000,
            },
            expect : {err:0},      
        })) 
        let connect_2 =  `${Date.now()}_${RandomGenerator.string(10)}`;
        info = await testRunner.prevTaskAddAction(new BDTAction.ConnectAction({
            type : ActionType.connect,
            LN : `PC_0013$1`,
            RN : `PC_0016$1`,
            config:{
                conn_tag: connect_2,
                timeout : 30*1000,
            },
            expect : {err:0},    
        }))
        info = await testRunner.prevTaskAddAction(new BDTAction.SendStreamAction({
            type : ActionType.send_stream,
            LN : `PC_0013$1`,
            RN : `PC_0016$1`,
            fileSize : 10*1024*1024,
            config:{
                conn_tag: connect_2,
                timeout : 30*1000,
            },
            expect : {err:0},      
        }))
        await testRunner.prevTaskRun();
    }

    await testRunner.waitFinished()
    
    
}
