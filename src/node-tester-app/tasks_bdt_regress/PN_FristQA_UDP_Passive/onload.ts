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
    let testcaseName = "PN_FristQA_UDP_Passive"
    let testcase:Testcase = {
        TestcaseName: testcaseName,
        testcaseId: `${testcaseName}_${Date.now()}`,
        remark: `## 前置条件
        LN 和 RN 使用UDP协议，且不能通过SN打洞连接成功
        # 操作流程：\n
        + （1）LN/RN 初始化本地BDT协议栈，设置被动PN
        + （2）LN 向 RN 发起首次连接，完成Frist Question Answer 流程
        + （3）LN 向 RN 发起二次连接，完成Frist Question Answer 流程
        + （4）RN 向 LN 发起反向连接，完成Frist Question Answer 流程`,
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
                timeout : 5*30*1000,
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
                    firstQA_answer : 100,
                    firstQA_question : 100,
                    accept_answer : 1,
                    timeout : 30*1000,
                },
                expect : {err:0},    
            }))
            
          
            // 2.1 LN 连接 RN
            let connect_2 =  `${Date.now()}_${RandomGenerator.string(10)}`;
            info = await testRunner.prevTaskAddAction(new BDTAction.ConnectAction({
                type : ActionType.connect_second,
                LN : `${labAgent[i].tags[0]}$1`,
                RN : `${labAgent[j].tags[0]}$1`,
                config:{
                    conn_tag: connect_2,
                    firstQA_answer : 100,
                    firstQA_question : 100,
                    accept_answer : 1,
                    timeout : 30*1000,
                },
                expect : {err:0},    
            }))
            let connect_3 =  `${Date.now()}_${RandomGenerator.string(10)}`;
            info = await testRunner.prevTaskAddAction(new BDTAction.ConnectAction({
                type : ActionType.connect_reverse,
                LN : `${labAgent[j].tags[0]}$1`,
                RN : `${labAgent[i].tags[0]}$1`,
                config:{
                    conn_tag: connect_3,
                    firstQA_answer : 100,
                    firstQA_question : 100,
                    accept_answer : 1,
                    timeout : 30*1000,
                },
                expect : {err:0},    
            }))
            
            await testRunner.prevTaskRun();
        }
    }


    await testRunner.waitFinished()
    
    
}
