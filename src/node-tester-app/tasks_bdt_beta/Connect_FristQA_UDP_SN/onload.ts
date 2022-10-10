import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../base';
import {TestRunner} from '../../taskTools/cyfs_bdt/testRunner';
import {Testcase,Task,ActionType,Resp_ep_type} from "../../taskTools/cyfs_bdt/type"
import {labAgent,BdtPeerClientConfig,LabSnList} from "../../taskTools/cyfs_bdt/labAgent"
import  * as BDTAction from "../../taskTools/cyfs_bdt/bdtAction"
import {AgentManager} from '../../taskTools/cyfs_bdt/agentManager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agentManager = AgentManager.createInstance(_interface);
    await agentManager.initAgentList(labAgent);
    //(2) 创建测试用例执行器 TestRunner
    let testRunner = new TestRunner(_interface);
    let testcaseName = "Connect_FristQA_UDP_SN"
    let testcase:Testcase = {
        TestcaseName: testcaseName,
        testcaseId: `${testcaseName}_${Date.now()}`,
        remark: `前置条件：
        （1）LN/RN 同时使用UDP协议EP
    操作步骤：
        (1) LN向RN发起首次连接，LN Sync 包question 带有100字节数据 ,RN ACK包 answer带有100字节数据
        (2) LN向RN发起二次连接，LN Sync 包question 带有100字节数据 ,RN ACK包 answer带有100字节数据
        (3) RN向LN发起反向连接，RN Sync 包question 带有100字节数据 ,LN ACK包 answer带有100字节数据
    测试节点数据限制：
        (1) 节点使用UDP通过SN连接
    预期结果：
        (1) LN 连接RN成功，连接过程中实现首次数据包发送`,
        environment: "lab",
    };
    await testRunner.initTestcase(testcase);
    //(3) 创建BDT测试客户端
    let config : BdtPeerClientConfig = {
            eps:{
                ipv4:{
                    udp:true,
            
                },
                ipv6:{
                    udp:true,
           
                }
            },
            logType:"info",
            SN :LabSnList,
            resp_ep_type:Resp_ep_type.SN_Resp, 
    }
    // 每台机器运行一个bdt 客户端
    await agentManager.allAgentStartBdtPeer(config)
    //(4) 测试用例执行器添加测试任务
    
    for(let i in labAgent){
        for(let j in labAgent){
            if(i != j &&  labAgent[j].NAT + labAgent[i].NAT <5 ){
                let info = await testRunner.createPrevTask({
                    LN : `${labAgent[i].tags[0]}$1`,
                    RN : `${labAgent[j].tags[0]}$1`,
                    timeout : 5*30*1000,
                    action : []
                })
                // 1.1 LN -> RN 连接10次
                for(let x=0;x<10;x++){
                    let connect_1 =  `${Date.now()}_${RandomGenerator.string(10)}`;
                    info = await testRunner.prevTaskAddAction(new BDTAction.ConnectAction({
                        type : ActionType.connect,
                        LN : `${labAgent[i].tags[0]}$1`,
                        RN : `${labAgent[j].tags[0]}$1`,
                        config:{
                            conn_tag: connect_1,
                            firstQA_answer : RandomGenerator.string(100),
                            firstQA_question : RandomGenerator.string(100),
                            accept_answer : 1,
                            timeout : 30*1000,
                        },
                        expect : {err:0},    
                    }))
                }
                
                // // 1.2 RN -> LN 连接10次
                // for(let x=0;x<10;x++){
                //     let connect_2 =  `${Date.now()}_${RandomGenerator.string(10)}`;
                //     info = await testRunner.prevTaskAddAction(new BDTAction.ConnectAction({
                //         type : ActionType.connect,
                //         LN : `${labAgent[j].tags[0]}$1`,
                //         RN : `${labAgent[i].tags[0]}$1`,
                //         fileSize : 10*1024*1024,
                //         config:{
                            
                //             conn_tag: connect_2,
                //             timeout : 30*1000,
                //             firstQA_answer : RandomGenerator.string(100),
                //             firstQA_question : RandomGenerator.string(100),
                //             accept_answer : 1,
                //         },
                //         expect : {err:0},      
                //     }))
                // }
                await testRunner.prevTaskRun();
            }
        }
    }

    await testRunner.waitFinished()
    
    
}
