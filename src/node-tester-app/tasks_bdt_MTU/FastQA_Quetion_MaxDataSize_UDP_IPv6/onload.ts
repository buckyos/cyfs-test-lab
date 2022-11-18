import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../base';
import {TestRunner} from '../../taskTools/cyfs_bdt/testRunner';
import {Testcase,Task,ActionType,Resp_ep_type} from "../../taskTools/cyfs_bdt/type"
import {labAgent,BdtPeerClientConfig,LabSnList,IPv6Agent,randShuffle} from "../../taskTools/cyfs_bdt/labAgent"
import  * as BDTAction from "../../taskTools/cyfs_bdt/bdtAction"
import {AgentManager} from '../../taskTools/cyfs_bdt/agentManager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agentManager = AgentManager.createInstance(_interface);
    let agent_ipv6 = await IPv6Agent() ;
    await agentManager.initAgentList(agent_ipv6);
    //(2) 创建测试用例执行器 TestRunner
    let testRunner = new TestRunner(_interface);
    let testcaseName = "FastQA_Quetion_MaxDataSize_UDP_IPv6"
    let testcase:Testcase = {
        TestcaseName: testcaseName,
        testcaseId: `${testcaseName}_${Date.now()}`,
        remark: `操作步骤：
        (1)Device直接建立连接，在Syn和Ack过程中完成首次数据发送，FastQA机制
        (2)使用UDP协议，设置Quetion 100Byte
        (3)使用UDP协议，设置Quetion 1000Byte
        (4)使用UDP协议，设置Quetion 5000Byte
        (5)使用UDP协议，设置Quetion 25KB
        (6)使用UDP协议，设置Quetion 25KB + 1Byte,超出最大限制出现报错`,
        environment: "lab",
    };
    await testRunner.initTestcase(testcase);
    //(3) 创建BDT测试客户端
    let config : BdtPeerClientConfig = {
            eps:{
                ipv6:{
                    udp:true,
                }
            },
            logType:"info",
            udp_sn_only : 0,
            SN :LabSnList,
            resp_ep_type:Resp_ep_type.All, 
    }
    // 每台机器运行一个bdt 客户端
    await agentManager.allAgentStartBdtPeer(config)
    await agentManager.uploadSystemInfo(testcase.testcaseId,2000);
    //(4) 测试用例执行器添加测试任务
    
    for(let [i,j] of randShuffle(agent_ipv6.length)){
        if(i != j &&  agent_ipv6[i].ipv6 &&  agent_ipv6[j].ipv6 ){
            let info = await testRunner.createPrevTask({
                LN : `${agent_ipv6[i].tags[0]}$1`,
                RN : `${agent_ipv6[j].tags[0]}$1`,
                timeout : 5*30*1000,
                action : []
            })
            // 1.1 LN -> RN 连接10次
            for(let x=0;x<25;x++){
                let connect_1 =  `${Date.now()}_${RandomGenerator.string(10)}`;
                info = await testRunner.prevTaskAddAction(new BDTAction.ConnectAction({
                    type : ActionType.connect,
                    LN : `${agent_ipv6[i].tags[0]}$1`,
                    RN : `${agent_ipv6[j].tags[0]}$1`,
                    config:{
                        conn_tag: connect_1,
                        firstQA_answer : RandomGenerator.string(100),
                        firstQA_question : RandomGenerator.string(100+ x*1024),
                        accept_answer : 1,
                        timeout : 30*1000,
                    },
                    expect : {err:0},    
                }))
            }
            let connect_1 =  `${Date.now()}_${RandomGenerator.string(10)}`;
            info = await testRunner.prevTaskAddAction(new BDTAction.ConnectAction({
                type : ActionType.connect,
                LN : `${agent_ipv6[i].tags[0]}$1`,
                RN : `${agent_ipv6[j].tags[0]}$1`,
                config:{
                    conn_tag: connect_1,
                    firstQA_answer : RandomGenerator.string(100),
                    firstQA_question : RandomGenerator.string(1 + 25*1024),
                    accept_answer : 1,
                    timeout : 30*1000,
                },
                expect : {err:6},    
            }))
            await testRunner.prevTaskRun();
        }
    }

    await testRunner.waitFinished()
    
    
}