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
    let testcaseName = "SN_Online_DeviceNum"
    let testcase:Testcase = {
        TestcaseName: testcaseName,
        testcaseId: `${testcaseName}_${Date.now()}`,
        remark: `# 测试SN 在线Device 数量`,
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
            SN : LabSnList,
            //SN :['sn-miner_xiao.desc',],
            resp_ep_type:Resp_ep_type.SN_Resp, 
    }
    // 每台机器运行一个bdt 客户端
    let agent_num = 1 ;
    let stack_num = 20;
    await agentManager.allAgentStartBdtPeer(config,agent_num)

    let mult =5;
    while(mult--){
        for(let i = 0;i< labAgent.length;i++){
            let info = await testRunner.createPrevTask({
                LN : `${labAgent[i].tags[0]}$1`,
                RN : `${labAgent[i].tags[0]}$1`,
                timeout : 20*30*1000,
                action : []
            })
            // 1.1 LN 连接 RN
            for(let x=0;x<stack_num;x++){
                info = await testRunner.prevTaskAddAction(new BDTAction.CreateBDTStackAction({
                    type : ActionType.start,
                    LN : `${labAgent[i].tags[0]}$1`,
                    config:{
                        timeout : 40*1000,
                    },
                    expect : {err:0},    
                }))
            }
            await testRunner.prevTaskRun();
        }
    }
    
    await testRunner.waitFinished(20)
    
    
}
