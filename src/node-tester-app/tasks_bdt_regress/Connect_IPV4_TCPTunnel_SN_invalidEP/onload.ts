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
    let testcaseName = "Connect_IPV4_TCPTunnel_SN_invalidEP"
    let testcase:Testcase = {
        TestcaseName: testcaseName,
        testcaseId: `${testcaseName}_${Date.now()}`,
        remark: `前置条件：
        （1）LN/RN 使用同一个SN
        （2）LN/RN 设备TCP网络可以正常使用
    操作步骤：
        连接Stream基础测试用例操作流程
    测试节点数据限制：
        (1) LN/RN 初始化BDT协议栈时只使用IPv4和TCP协议 EP
        (2) LN 节点知道 RN Device 中的EP 已失效
    预期结果：
        (1)符合P2P NAT穿透理论规则`,
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
            udp_sn_only : 1,
            resp_ep_type:Resp_ep_type.default, 
    }
    // 每台机器运行一个bdt 客户端
    await agentManager.allAgentStartBdtPeer(config)
    //(4) 测试用例执行器添加测试任务
    for(let [i,j] of randShuffle(labAgent.length)){
        if(i != j && labAgent[i].NAT * labAgent[j].NAT==0 ){
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
                    timeout : 30*1000,
                },
                expect : {err:0},    
            }))
            // 1.2 LN -> RN 发送数据
            info = await testRunner.prevTaskAddAction(new BDTAction.SendStreamAction({
                type : ActionType.send_stream,
                LN : `${labAgent[i].tags[0]}$1`,
                RN : `${labAgent[j].tags[0]}$1`,
                fileSize : 10*1024*1024,
                config:{
                    conn_tag: connect_1,
                    timeout : 30*1000,
                },
                expect : {err:0},      
            }))
            // 1.3 RN -> LN 发送数据
            info = await testRunner.prevTaskAddAction(new BDTAction.SendStreamAction({
                type : ActionType.send_stream_reverse,
                LN : `${labAgent[j].tags[0]}$1`,
                RN : `${labAgent[i].tags[0]}$1`,
                fileSize : 10*1024*1024,
                config:{
                    conn_tag: connect_1,
                    timeout : 30*1000,
                },
                expect : {err:0},      
            }))
            // 1.4 LN 关闭连接
            info = await testRunner.prevTaskAddAction(new BDTAction.CloseConnectAction({
                type : ActionType.close_connect,
                LN : `${labAgent[i].tags[0]}$1`,
                config:{
                    conn_tag: connect_1,
                    timeout : 30*1000,
                },
                expect : {err:0},      
            }))
            // 1.5 RN 关闭连接
            info = await testRunner.prevTaskAddAction(new BDTAction.CloseConnectAction({
                type : ActionType.close_connect,
                LN : `${labAgent[j].tags[0]}$1`,
                config:{
                    conn_tag: connect_1,
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
                    timeout : 30*1000,
                },
                expect : {err:0},    
            }))
            // 2.2 LN -> RN 发送数据
            info = await testRunner.prevTaskAddAction(new BDTAction.SendStreamAction({
                type : ActionType.send_stream,
                LN : `${labAgent[i].tags[0]}$1`,
                RN : `${labAgent[j].tags[0]}$1`,
                fileSize : 10*1024*1024,
                config:{
                    conn_tag: connect_2,
                    timeout : 30*1000,
                },
                expect : {err:0},      
            }))
            // 2.3 RN -> LN 发送数据
            info = await testRunner.prevTaskAddAction(new BDTAction.SendStreamAction({
                type : ActionType.send_stream_reverse,
                LN : `${labAgent[j].tags[0]}$1`,
                RN : `${labAgent[i].tags[0]}$1`,
                fileSize : 10*1024*1024,
                config:{
                    conn_tag: connect_2,
                    timeout : 30*1000,
                },
                expect : {err:0},      
            }))
            // 2.4 LN 关闭连接
            info = await testRunner.prevTaskAddAction(new BDTAction.CloseConnectAction({
                type : ActionType.close_connect,
                LN : `${labAgent[i].tags[0]}$1`,
                config:{
                    conn_tag: connect_2,
                    timeout : 30*1000,
                },
                expect : {err:0},      
            })) 
            // 2.5 RN 关闭连接
            info = await testRunner.prevTaskAddAction(new BDTAction.CloseConnectAction({
                type : ActionType.close_connect,
                LN : `${labAgent[j].tags[0]}$1`,
                config:{
                    conn_tag: connect_2,
                    timeout : 30*1000,
                },
                expect : {err:0},      
            })) 
            // 3.1 RN 连接 LN
            let connect_3 =  `${Date.now()}_${RandomGenerator.string(10)}`;
            info = await testRunner.prevTaskAddAction(new BDTAction.ConnectAction({
                type : ActionType.connect_reverse,
                LN : `${labAgent[j].tags[0]}$1`,
                RN : `${labAgent[i].tags[0]}$1`,
                config:{
                    conn_tag: connect_3,
                    timeout : 30*1000,
                },
                expect : {err:0},    
            }))
            // 3.2 RN -> LN 发送数据
            info = await testRunner.prevTaskAddAction(new BDTAction.SendStreamAction({
                type : ActionType.send_stream,
                LN : `${labAgent[j].tags[0]}$1`,
                RN : `${labAgent[i].tags[0]}$1`,
                fileSize : 10*1024*1024,
                config:{
                    conn_tag: connect_3,
                    timeout : 30*1000,
                },
                expect : {err:0},      
            }))
            // 3.3 LN -> RN 发送数据
            info = await testRunner.prevTaskAddAction(new BDTAction.SendStreamAction({
                type : ActionType.send_stream_reverse,
                LN : `${labAgent[i].tags[0]}$1`,
                RN : `${labAgent[j].tags[0]}$1`,
                fileSize : 10*1024*1024,
                config:{
                    conn_tag: connect_3,
                    timeout : 30*1000,
                },
                expect : {err:0},      
            }))
            // 3.4 RN 关闭连接
            info = await testRunner.prevTaskAddAction(new BDTAction.CloseConnectAction({
                type : ActionType.close_connect,
                LN : `${labAgent[j].tags[0]}$1`,
                config:{
                    conn_tag: connect_3,
                    timeout : 30*1000,
                },
                expect : {err:0},      
            }))  
            // 3.5 LN 关闭连接
            info = await testRunner.prevTaskAddAction(new BDTAction.CloseConnectAction({
                type : ActionType.close_connect,
                LN : `${labAgent[i].tags[0]}$1`,
                config:{
                    conn_tag: connect_3,
                    timeout : 30*1000,
                },
                expect : {err:0},      
            }))  
            
            await testRunner.prevTaskRun();
        }
    }


    await testRunner.waitFinished()
    
    
}