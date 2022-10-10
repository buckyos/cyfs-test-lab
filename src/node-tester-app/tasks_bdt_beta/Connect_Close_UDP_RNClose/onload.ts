import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../base';
import {TestRunner} from '../../taskTools/cyfs_bdt/testRunner';
import {Testcase,Task,ActionType,Resp_ep_type, BDTERROR} from "../../taskTools/cyfs_bdt/type"
import {labAgent,BdtPeerClientConfig,LabSnList, PNType} from "../../taskTools/cyfs_bdt/labAgent"
import  * as BDTAction from "../../taskTools/cyfs_bdt/bdtAction"
import {AgentManager} from '../../taskTools/cyfs_bdt/agentManager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agentManager = AgentManager.createInstance(_interface);
    await agentManager.initAgentList(labAgent);
    //(2) 创建测试用例执行器 TestRunner
    let testRunner = new TestRunner(_interface);
    let testcaseName = "Connect_Close_UDP_RNClose"
    let testcase:Testcase = {
        TestcaseName: testcaseName,
        testcaseId: `${testcaseName}_${Date.now()}`,
        remark: `前置条件：
        (1) LN 和 RN使用UDP EP建立连接成功
    操作步骤：
        (1) LN向RN发起连接
        (2) LN向RN发送1M大小数据
        (3) RN发起关闭连接操作
        (4) LN向RN发送1M大小数据 
    预期结果：
        (1) 连接关闭后，LN发送数据失败，返回对应错误码 `,
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
        for(let j in labAgent ){
            if(i != j && labAgent[i].NAT + labAgent[j].NAT <5 ){
                let info = await testRunner.createPrevTask({
                    LN : `${labAgent[i].tags[0]}$1`,
                    RN : `${labAgent[j].tags[0]}$1`,
                    timeout : 3*60*1000,
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
                // 1.4 RN 关闭连接
                info = await testRunner.prevTaskAddAction(new BDTAction.CloseConnectAction({
                    type : ActionType.close_connect,
                    LN : `${labAgent[j].tags[0]}$1`,
                    config:{
                        conn_tag: connect_1,
                        timeout : 30*1000,
                    },
                    expect : {err:0},      
                }))
                // 1.5 LN -> RN 发送数据
                info = await testRunner.prevTaskAddAction(new BDTAction.SendStreamNotReadAction({
                    type : ActionType.send_stream,
                    LN : `${labAgent[i].tags[0]}$1`,
                    RN : `${labAgent[j].tags[0]}$1`,
                    fileSize : 10*1024*1024,
                    config:{
                        conn_tag: connect_1,
                        timeout : 30*1000,
                    },
                    expect : {err:BDTERROR.timeout},     
                }))
                await testRunner.prevTaskRun();
            }
        }
    }

    await testRunner.waitFinished()
    
    
}
