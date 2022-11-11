import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../base';
import {TestRunner} from '../../taskTools/cyfs_bdt/testRunner';
import {Testcase,Task,ActionType,Resp_ep_type} from "../../taskTools/cyfs_bdt/type"
import {labAgent,BdtPeerClientConfig,LabSnList} from "../../taskTools/cyfs_bdt/labAgent"
import  * as BDTAction from "../../taskTools/cyfs_bdt/bdtAction"
import {AgentManager} from '../../taskTools/cyfs_bdt/agentManager'
import { BDTERROR } from '../../taskTools/rust-bdt/type';

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agentManager = AgentManager.createInstance(_interface);
    await agentManager.initAgentList(labAgent);
    //(2) 创建测试用例执行器 TestRunner
    let testRunner = new TestRunner(_interface);
    let testcaseName = "NDN_ChunkTask_ChunkSize"
    let testcase:Testcase = {
        TestcaseName: testcaseName,
        testcaseId: `${testcaseName}_${Date.now()}`,
        remark: `前置条件：
        (1)LN/RN 同时使用IPv4/IPv6、TCP/UDP 协议EP
    操作步骤：
        // 为空 chunk 应该cyfs_base 限制
        (1) RN set_chunk 1 bytes 数据，LN interest_chunk;
        (2) RN set_chunk 1000 bytes 数据(一个MTU能传输)，LN interest_chunk;
        (3) RN set_chunk 1500 bytes 数据(两个MTU能传输)，LN interest_chunk;
        (4) RN set_chunk 10Mb 数据(最佳传输大小)，LN interest_chunk;
        (5) RN set_chunk 64Mb 数据(喷泉码限制)，LN interest_chunk;
    测试节点数据限制：
        (1) 所有机器组合
    预期结果：
        (1) 符合P2P NAT穿透,传输成功`,
        environment: "lab",
    };
    await testRunner.initTestcase(testcase);
    //(3) 创建BDT测试客户端
    let config : BdtPeerClientConfig = {
            eps:{
                ipv4:{
                    udp:true,
                    tcp:true,
                },
                ipv6:{
                    udp:true,
                    tcp:true,
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
            if(i != j && labAgent[i].NAT * labAgent[j].NAT < 6){
                let info = await testRunner.createPrevTask({
                    LN : `${labAgent[i].tags[0]}$1`,
                    RN : `${labAgent[j].tags[0]}$1`,
                    timeout : 5*60*1000,
                    action : []
                })
                info = await testRunner.prevTaskAddAction(new BDTAction.ConnectAction({
                    type : ActionType.connect,
                    LN : `${labAgent[i].tags[0]}$1`,
                    RN : `${labAgent[j].tags[0]}$1`,
                    config:{
                        conn_tag: "connect_1",
                        timeout : 60*1000,
                    },
                    expect : {err:0}    
                }))
                info = await testRunner.prevTaskAddAction(new BDTAction.SendChunkAction({
                    type : ActionType.send_file,
                    LN : `${labAgent[i].tags[0]}$1`,
                    RN : `${labAgent[j].tags[0]}$1`,
                    chunkSize : 1,
                    config:{
                        timeout : 60*1000,
                    },
                    expect : {err:0}     
                }))
                info = await testRunner.prevTaskAddAction(new BDTAction.SendChunkAction({
                    type : ActionType.send_file,
                    LN : `${labAgent[i].tags[0]}$1`,
                    RN : `${labAgent[j].tags[0]}$1`,
                    chunkSize : 1000,
                    config:{
                        timeout : 60*1000,
                    },
                    expect : {err:0}  
                        
                }))  
                info = await testRunner.prevTaskAddAction(new BDTAction.SendChunkAction({
                    type : ActionType.send_file,
                    LN : `${labAgent[i].tags[0]}$1`,
                    RN : `${labAgent[j].tags[0]}$1`,
                    chunkSize : 1500,
                    config:{
                        timeout : 60*1000,
                    },
                    expect : {err:0}  
                        
                })) 
                info = await testRunner.prevTaskAddAction(new BDTAction.SendChunkAction({
                    type : ActionType.send_file,
                    LN : `${labAgent[i].tags[0]}$1`,
                    RN : `${labAgent[j].tags[0]}$1`,
                    chunkSize : 10*1024*1024,
                    config:{
                        timeout : 60*1000,
                    },
                    expect : {err:0}  
                        
                })) 
                info = await testRunner.prevTaskAddAction(new BDTAction.SendChunkAction({
                    type : ActionType.send_file,
                    LN : `${labAgent[i].tags[0]}$1`,
                    RN : `${labAgent[j].tags[0]}$1`,
                    chunkSize : 64*1024*1024,
                    config:{
                        timeout : 60*1000,
                    },
                    expect : {err:0}  
                        
                })) 
                await testRunner.prevTaskRun();
            }
        }
    }

    await testRunner.waitFinished()
    
    
}
