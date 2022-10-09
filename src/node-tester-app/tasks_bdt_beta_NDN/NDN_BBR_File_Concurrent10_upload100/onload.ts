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
    let testcaseName = "NDN_BBR_File_Concurrent10_upload100"
    let testcase:Testcase = {
        TestcaseName: testcaseName,
        testcaseId: `${testcaseName}_${Date.now()}`,
        remark: `# 前置条件：
        (1)LN/RN 同时使用IPv4/IPv6、TCP/UDP 协议EP
    操作步骤：
        (1) RN track_file_in_path  10个40Mb大小文件，chunk 大小 10Mb， 10个User并行从RN下载文件;
    测试节点数据限制：
        (1) 所有机器组合
    预期结果：
        (1) 符合P2P NAT穿透,传输成功，下载成功`,
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
            resp_ep_type:Resp_ep_type.effectiveEP_WAN, 
    }
    // 每台机器运行一个bdt 客户端
    let agent_list = await AgentList_LAN_WAN(labAgent);
    
    await agentManager.allAgentStartBdtPeer(config)
    //(4) 测试用例执行器添加测试任务
    for(let index = 0;index<5;index++){
        let LN = agent_list.LAN[index].tags[0];
        let RN = agent_list.WAN[0].tags[0];
        for(let i =0;i<10;i++){
            let connect_1 =  `${Date.now()}_${RandomGenerator.string(10)}`;
            let info = await testRunner.createPrevTask({
                LN : `${LN}$1`,
                RN : `${RN}$1`,
                timeout : 5*30*1000,
                action : []
            })
            info = await testRunner.prevTaskAddAction(new BDTAction.ConnectAction({
                type : ActionType.connect,
                LN : `${LN}$1`,
                RN : `${RN}$1`,
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
                    RN : `${RN}$1`,
                    fileSize : 1*1024*1024,
                    config:{
                        conn_tag: connect_1,
                        timeout : 30*1000,
                    },
                    expect : {err:0},    
                }))
            }
            await testRunner.prevTaskRun();
        }
    }
    
    await testRunner.waitFinished()
  
}
