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
    let testcaseName = "SN_SNCalled_UDP"
    let testcase:Testcase = {
        TestcaseName: testcaseName,
        testcaseId: `${testcaseName}_${Date.now()}`,
        remark: `SN 打洞流程性能测试`,
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
            SN :LabSnList,
            resp_ep_type:Resp_ep_type.Empty, 
    }
    // 每台机器运行一个bdt 客户端
    let agent_num = 2;
    await agentManager.allAgentStartBdtPeer(config,agent_num)
    
    //(4) 测试用例执行器添加测试任务

    for(let [i,j] of randShuffle(labAgent.length*agent_num)){
        let LN_index = i % labAgent.length;  
        let RN_index = j % labAgent.length; 
        let LN_client = (i - LN_index ) /labAgent.length + 1;  
        let RN_client = (j - RN_index) /labAgent.length + 1; 
        if(i != j && i>j &&labAgent[LN_index].NAT * labAgent[RN_index].NAT == 0 ){
            
            let info = await testRunner.createPrevTask({
                LN : `${labAgent[LN_index].tags[0]}$${LN_client}`,
                RN : `${labAgent[RN_index].tags[0]}$${RN_client}`,
                timeout : 5*30*1000,
                action : []
            })
            // 1.1 LN 连接 RN
            let connect_1 =  `${Date.now()}_${RandomGenerator.string(10)}`;
            info = await testRunner.prevTaskAddAction(new BDTAction.ConnectAction({
                type : ActionType.connect,
                LN : `${labAgent[LN_index].tags[0]}$${LN_client}`,
                RN : `${labAgent[RN_index].tags[0]}$${RN_client}`,
                config:{
                    conn_tag: connect_1,
                    timeout : 30*1000,
                },
                expect : {err:0},    
            })) 
            await testRunner.prevTaskRun();
        }
    }
    await testRunner.waitFinished(20)
    
    
}
