import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../base';
import {TestRunner} from '../../taskTools/cyfs_bdt/testRunner';
import {Testcase,Task,ActionType,Resp_ep_type} from "../../taskTools/cyfs_bdt/type"
import {labAgent,BdtPeerClientConfig,LabSnList,randShuffle,PNType} from "../../taskTools/cyfs_bdt/labAgent"
import  * as BDTAction from "../../taskTools/cyfs_bdt/bdtAction"
import {AgentManager} from '../../taskTools/cyfs_bdt/agentManager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agentManager = AgentManager.createInstance(_interface);
    await agentManager.initAgentList(labAgent);
    //(2) 创建测试用例执行器 TestRunner
    let testRunner = new TestRunner(_interface);
    let testcaseName = "PN_NDN_UDP_Passive"
    let testcase:Testcase = {
        TestcaseName: testcaseName,
        testcaseId: `${testcaseName}_${Date.now()}`,
        remark: `## 前置条件
        LN 和 RN 使用UDP协议，且不能通过SN打洞连接成功
        ## 操作流程：\n
        + （1）LN/RN 初始化本地BDT协议栈,使用被动PN
        + （2）LN 向 RN 发起首次连接。
        + （3）LN 向 RN 发送10M大小 文件 数据
        + （4）RN 向 LN 发送10M大小 文件 数据 `,
        environment: "lab",
    };
    await testRunner.initTestcase(testcase);
    //(3) 创建BDT测试客户端
    let config : BdtPeerClientConfig = {
            eps:{
                ipv4:{
                    udp:true,
                }
            },
            PN : PNType.passive,
            logType:"info",
            SN :LabSnList,
            resp_ep_type:Resp_ep_type.SN_Resp, 
    }
    // 每台机器运行一个bdt 客户端
    await agentManager.allAgentStartBdtPeer(config)
    //(4) 测试用例执行器添加测试任务
    for(let [i,j] of randShuffle(labAgent.length)){
        if(i != j && labAgent[i].NAT + labAgent[j].NAT >= 5 ){
            let info = await testRunner.createPrevTask({
                LN : `${labAgent[i].tags[0]}$1`,
                RN : `${labAgent[j].tags[0]}$1`,
                timeout : 5*60*1000,
                action : []
            })
            // 1.1 LN 连接 RN
            let connect_1 =  `${Date.now()}_${RandomGenerator.string(10)}`;
            info = await testRunner.prevTaskAddAction(new BDTAction.ConnectAction({
                type : ActionType.connect,
                LN : `${labAgent[i].tags[0]}$1`,
                RN : `${labAgent[j].tags[0]}$1`,
                config:{
                    conn_tag: connect_1,
                    timeout : 160*1000,
                },
                expect : {err:0},    
            }))
            // 1.2 RN -> LN 发送数据
            info = await testRunner.prevTaskAddAction(new BDTAction.SendFileAction({
                type : ActionType.send_file,
                LN : `${labAgent[i].tags[0]}$1`,
                RN : `${labAgent[j].tags[0]}$1`,
                fileSize : 10*1024*1024,
                chunkSize : 4*1024*1024,
                config:{
                    timeout : 160*1000,
                },
                expect : {err:0},      
            }))
            // 1.3 LN -> RN 发送数据
            info = await testRunner.prevTaskAddAction(new BDTAction.SendFileAction({
                type : ActionType.send_file,
                LN : `${labAgent[j].tags[0]}$1`,
                RN : `${labAgent[i].tags[0]}$1`,
                fileSize : 10*1024*1024,
                chunkSize : 4*1024*1024,
                config:{
                    timeout : 160*1000,
                },
                expect : {err:0},      
            }))
            await testRunner.prevTaskRun();
        }
    }
    await testRunner.waitFinished()
    
    
}
