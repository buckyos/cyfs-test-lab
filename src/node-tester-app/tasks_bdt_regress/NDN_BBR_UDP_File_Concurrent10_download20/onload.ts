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
    let testcaseName = "NDN_BBR_UDP_File_Concurrent10_download20"
    let testcase:Testcase = {
        TestcaseName: testcaseName,
        testcaseId: `${testcaseName}_${Date.now()}`,
        remark: `# 前置条件：
        (1)LN/RN 同时使用IPv4 UDP 协议EP
    操作步骤：
        (1) 10个User track_file_in_path  2个40Mb大小文件，chunk 大小 10Mb，LN 并行从十个节点下载文件;
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
    await agentManager.uploadSystemInfo(testcase.testcaseId,2000);
    //(4) 测试用例执行器添加测试任务
    for(let index = 0;index<10;index++){
        let LN =  agent_list.WAN[0].tags[0];
        let RN = agent_list.LAN[index].tags[0];
        let connect_1 =  `${Date.now()}_${RandomGenerator.string(10)}`;
        let info = await testRunner.createPrevTask({
            LN : `${LN}$1`,
            RN : `${RN}$1`,
            timeout : 10*60*1000,
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
        info = await testRunner.prevTaskAddAction(new BDTAction.SendFileListAction({
            type : ActionType.send_file,
            LN : `${LN}$1`,
            RN : `${RN}$1`,
            fileSize : 40 *1024*1024,
            fileNum : 2,
            chunkSize : 10*1024*1024,
            config:{
                conn_tag: connect_1,
                timeout : 200*1000,
            },
            expect : {err:0},    
        }))
        await testRunner.prevTaskRun();
    }
    
    await testRunner.waitFinished()
  
}