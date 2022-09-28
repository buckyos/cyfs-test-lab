import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../base';
import {TestRunner} from '../../taskTools/cyfs_bdt/testRunner';
import {Testcase,Task,ActionType,Resp_ep_type} from "../../taskTools/cyfs_bdt/type"
import {labAgent,BdtPeerClientConfig,LabSnList,randShuffle} from "../../taskTools/cyfs_bdt/labAgent"
import  * as BDTAction from "../../taskTools/cyfs_bdt/bdtAction"
import {AgentManager} from '../../taskTools/cyfs_bdt/agentManager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agentManager = AgentManager.createInstance(_interface);
    // let agentList = [    
    // ]
    // for(let agent of labAgent){
    //     if(agent.tags[0]=="PC_0009" || agent.tags[0]=="PC_0016"){
    //         agentList.push(agent)
    //     }
    // }
    await agentManager.initAgentList(labAgent);
    //await agentManager.allAgentCleanCache();
    //(2) 创建测试用例执行器 TestRunner
    let testRunner = new TestRunner(_interface);
    let testcaseName = "BDT_connect_list"
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
                }
            },
            logType:"info",
            SN :LabSnList,
            resp_ep_type:Resp_ep_type.Empty, 
    }
    // 每台机器运行一个bdt 客户端
    let agent_num = 5;
    await agentManager.allAgentStartBdtPeer(config,agent_num)
    

    for(let LN in labAgent){
        for(let x =1;x<=agent_num;x++){
            let info = await testRunner.createPrevTask({
                LN : `${labAgent[LN].tags[0]}${x}`,
                RN : ``,
                timeout : 5*30*1000,
                action : []
            })
             
            // 1.1 LN 连接 RN
            let connect_1 =  `${Date.now()}_${RandomGenerator.string(10)}`;
            info = await testRunner.prevTaskAddAction(new BDTAction.ConnectListAction ({
                type : ActionType.send_stream,
                LN : `${labAgent[LN].tags[0]}${x}`,
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
