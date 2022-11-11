import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../base';
import {TestRunner} from '../../taskTools/cyfs_bdt/testRunner';
import {Testcase,Task,ActionType,Resp_ep_type} from "../../taskTools/cyfs_bdt/type"
import {labAgent,BdtPeerClientConfig,LabSnList,randShuffle, PNType} from "../../taskTools/cyfs_bdt/labAgent"
import  * as BDTAction from "../../taskTools/cyfs_bdt/bdtAction"
import {AgentManager} from '../../taskTools/cyfs_bdt/agentManager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agentManager = AgentManager.createInstance(_interface);
    await agentManager.initAgentList(labAgent);
    //(2) 创建测试用例执行器 TestRunner
    let testRunner = new TestRunner(_interface);
    let testcaseName = "BDT_debuger"
    let testcase:Testcase = {
        TestcaseName: testcaseName,
        testcaseId: `${testcaseName}_${Date.now()}`,
        remark: `# 调试测试特殊场景使用`,
        environment: "lab",
    };
    await testRunner.initTestcase(testcase);
    //(3) 创建BDT测试客户端
    let config : BdtPeerClientConfig = {
            eps:{
                ipv4:{
                    udp:true,
                    //tcp:true,
                },
                ipv6:{
                    udp:true,
                    //tcp:true,
                }
            },
            logType:"info",
            udp_sn_only : 0,
            SN :LabSnList,
            PN : PNType.none,
            resp_ep_type:Resp_ep_type.effectiveEP_WAN, 
    }
    
    // 每台机器运行一个bdt 客户端
    await agentManager.allAgentStartBdtPeer(config)
    //(4) 测试用例执行器添加测试任务
    
    for(let i in labAgent){
        for(let j in labAgent){
            if(i != j &&  labAgent[i].tags[0] == "PC_0009" && labAgent[j].tags[0] == "PC_0007" ){
                let info = await testRunner.createPrevTask({
                    LN : `${labAgent[i].tags[0]}$1`,
                    RN : `${labAgent[j].tags[0]}$1`,
                    timeout : 5*30*1000,
                    action : []
                })
                // 1.1 LN -> RN 连接10次
                for(let x=0;x<1;x++){
                    let connect_1 =  `${Date.now()}_${RandomGenerator.string(10)}`;
                    info = await testRunner.prevTaskAddAction(new BDTAction.ConnectAction({
                        type : ActionType.connect,
                        LN : `${labAgent[i].tags[0]}$1`,
                        RN : `${labAgent[j].tags[0]}$1`,
                        config:{
                            conn_tag: connect_1,
                            firstQA_answer : RandomGenerator.string(100 + x*100),
                            firstQA_question : RandomGenerator.string(100),
                            accept_answer : 1,
                            timeout : 30*1000,
                        },
                        expect : {err:0},    
                    }))
                }
                
                await testRunner.prevTaskRun();
            }
        }
    }

    await testRunner.waitFinished()
    
    
}
