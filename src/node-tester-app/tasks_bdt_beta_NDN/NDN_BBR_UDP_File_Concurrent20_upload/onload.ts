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
    let testcaseName = "NDN_BBR_UDP_File_Concurrent20_upload"
    let testcase:Testcase = {
        TestcaseName: testcaseName,
        testcaseId: `${testcaseName}_${Date.now()}`,
        remark: `# 前置条件：
        (1)LN/RN 同时使用IPv4 UDP 协议EP
    操作步骤：
        (1) RN track_file_in_path 1个40Mb大小文件，chunk 大小 10Mb， 20个User并行从RN下载文件;
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
    let num = 2
    await agentManager.allAgentStartBdtPeer(config,num)
    await agentManager.uploadSystemInfo(testcase.testcaseId,5000);
    //(4) 测试用例执行器添加测试任务
    let Users = []
    for(let i =1;i<=num;i++){
        for(let index = 0;index<10;index++){
            Users.push(`${agent_list.LAN[index].tags[0]}$${i}`)
        }
    }
    
    for(let index = 0;index<1;index++){
        let RN =  agent_list.WAN[0].tags[0];
        let LN = agent_list.WAN[0].tags[0];
        let connect_1 =  `${Date.now()}_${RandomGenerator.string(10)}`;
        let info = await testRunner.createPrevTask({
            LN : `${LN}$1`,
            RN : `${RN}$1`,
            Users,
            timeout : 10*60*1000,
            action : []
        })
        info = await testRunner.prevTaskAddAction(new BDTAction.SendFileGroupAction({
            type : ActionType.send_file,
            LN : `${LN}$1`,
            RN : `${RN}$1`,
            Users,
            fileSize : 40 *1024*1024,
            chunkSize : 10*1024*1024,
            config:{
                conn_tag: connect_1,
                timeout : 500*1000,
            },
            expect : {err:0},    
        }))
        await testRunner.prevTaskRun();
    }
    
    await testRunner.waitFinished()
  
}
