import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../base';
import {TestRunner} from '../../taskTools/cyfs_bdt/testRunner';
import {Testcase,Task,ActionType,Resp_ep_type} from "../../taskTools/cyfs_bdt/type"
import {labAgent,BdtPeerClientConfig,LabSnList,AgentList_LAN_WAN} from "../../taskTools/cyfs_bdt/labAgent"
import  * as BDTAction from "../../taskTools/cyfs_bdt/bdtAction"
import {AgentManager} from '../../taskTools/cyfs_bdt/agentManager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agentManager = AgentManager.createInstance(_interface);
    await agentManager.initAgentList(labAgent);
    //(2) 创建测试用例执行器 TestRunner
    let testRunner = new TestRunner(_interface);
    let testcaseName = "Stream_TCPTunnel_10con_both_10MBData"
    let testcase:Testcase = {
        TestcaseName: testcaseName,
        testcaseId: `${testcaseName}_${Date.now()}`,
        remark: `前置条件：
        （1）LN/RN 网络可以基于TCP建立连接
    操作步骤：
        （1）LN 和 RN 建立10个BDT连接，每个连接LN/RN双向持续发送10*10MB 大小的字节流数据
    预期结果：
        (1) 数据发送成功，Stream数据发送未产生拥塞`,
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
            udp_sn_only : 1,
            SN :LabSnList,
            resp_ep_type:Resp_ep_type.effectiveEP_WAN, 
    }
    // 每台机器运行一个bdt 客户端
    let agent_list = await AgentList_LAN_WAN(labAgent);
    let LN = agent_list.LAN[0].tags[0];
    let WAN = agent_list.WAN[0].tags[0];
    await agentManager.allAgentStartBdtPeer(config)
    //(4) 测试用例执行器添加测试任务
    for(let i =0;i<10;i++){
        let connect_1 =  `${Date.now()}_${RandomGenerator.string(10)}`;
        let info = await testRunner.createPrevTask({
            LN : `${LN}$1`,
            RN : `${WAN}$1`,
            timeout : 5*30*1000,
            action : []
        })
        info = await testRunner.prevTaskAddAction(new BDTAction.ConnectAction({
            type : ActionType.connect,
            LN : `${LN}$1`,
            RN : `${WAN}$1`,
            config:{
                conn_tag: connect_1,
                timeout : 20*1000,
            },
            expect : {err:0},    
        }))
        for(let x=0;x<10;x++){
            info = await testRunner.prevTaskAddAction(new BDTAction.SendStreamAction({
                type : ActionType.send_stream,
                LN : `${LN}$1`,
                RN : `${WAN}$1`,
                fileSize : 10*1024*1024,
                config:{
                    conn_tag: connect_1,
                    timeout : 30*1000,
                },
                expect : {err:0},    
            }))
        }
        for(let x=0;x<10;x++){
            info = await testRunner.prevTaskAddAction(new BDTAction.SendStreamAction({
                type : ActionType.send_stream,
                LN : `${WAN}$1`,
                RN : `${LN}$1`,
                fileSize : 10*1024*1024,
                config:{
                    conn_tag: connect_1,
                    timeout : 30*1000,
                },
                expect : {err:0},    
            }))
        }
        await testRunner.prevTaskRun();
    }
    await testRunner.waitFinished()
  
}
