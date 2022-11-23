import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../base';
import {TestRunner} from '../../taskTools/cyfs_bdt/testRunner';
import {Testcase,Task,ActionType,Resp_ep_type} from "../../taskTools/cyfs_bdt/type"
import {labAgent,BdtPeerClientConfig,LabSnList,IPv6Agent,randShuffle} from "../../taskTools/cyfs_bdt/labAgent"
import  * as BDTAction from "../../taskTools/cyfs_bdt/bdtAction"
import {AgentManager} from '../../taskTools/cyfs_bdt/agentManager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agentManager = AgentManager.createInstance(_interface);
    await agentManager.initAgentList(labAgent);
    //(2) 创建测试用例执行器 TestRunner
    let testRunner = new TestRunner(_interface);
    let testcaseName = "FastQA_Perf_Stream_UDP_NetWork_500"
    let testcase:Testcase = {
        TestcaseName: testcaseName,
        testcaseId: `${testcaseName}_${Date.now()}`,
        remark: `测试网络因素影响:
        (1)LN -> RN 发起连接请求 Question 带有 500 Bytes请求数据 
        (2)RN 监听连接请求，收到连接请求后，解析Question,confrim 时回复500 Bytes响应数据`,
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
            logType:"info",
            udp_sn_only : 0,
            SN :LabSnList,
            resp_ep_type:Resp_ep_type.All, 
    }
    // 每台机器运行一个bdt 客户端
    await agentManager.allAgentStartBdtPeer(config)
    await agentManager.uploadSystemInfo(testcase.testcaseId,2000);
    //(4) 测试用例执行器添加测试任务
    
    for(let [i,j] of randShuffle(labAgent.length)){
        if(i != j &&  labAgent[j].NAT == 0 && labAgent[i].NAT != 0 ){
            let info = await testRunner.createPrevTask({
                LN : `${labAgent[i].tags[0]}$1`,
                RN : `${labAgent[j].tags[0]}$1`,
                timeout : 5*30*1000,
                action : []
            })
            // 1.1 LN -> RN 连接10次
            for(let x=0;x<1;x++){
                let connect_1 =  `${Date.now()}_${RandomGenerator.string(10)}`;
                info = await testRunner.prevTaskAddAction(new BDTAction.FastQAPerfAction({
                    type : ActionType.FasTQA,
                    LN : `${labAgent[i].tags[0]}$1`,
                    RN : `${labAgent[j].tags[0]}$1`,
                    config:{
                        conn_tag: connect_1,
                        firstQA_answer : 500,
                        firstQA_question : 500,
                        accept_answer : 1,
                        timeout : 60*1000,
                    },
                    expect : {err:0},    
                }))
            }           
            await testRunner.prevTaskRun();
        }
        
    }

    await testRunner.waitFinished()
    
    
}
