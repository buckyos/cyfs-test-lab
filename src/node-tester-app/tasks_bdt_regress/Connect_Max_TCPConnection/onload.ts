import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../base';
import {TestRunner} from '../../taskTools/cyfs_bdt_cli/test_runner';
import {Testcase,Task,ActionType,Resp_ep_type} from "../../taskTools/cyfs_bdt_cli/type"
import {labAgent,BdtCliConfig,LabSnList,AgentList_LAN_WAN} from "../../taskTools/cyfs_bdt_cli/lab_agent"
import  * as BDTAction from "../../taskTools/cyfs_bdt_cli/bdtAction"
import {AgentManager} from '../../taskTools/cyfs_bdt_cli/agent_manager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agentManager = AgentManager.createInstance(_interface);
    await agentManager.initAgentList(labAgent);
    //(2) 创建测试用例执行器 TestRunner
    let testRunner = new TestRunner(_interface);
    let testcaseName = "Connect_Max_TCPConnection"
    let testcase:Testcase = {
        TestcaseName: testcaseName,
        testcaseId: `${testcaseName}_${Date.now()}`,
        remark: `前置条件：
        （1）LN/RN 同时使用TCP 协议EP
    操作步骤：
        (1) LN向RN发起65535次连接
    测试节点数据限制：
        (1) 节点使用TCP直连
    预期结果：
        (1) 理论最大连接数 65535`,
        environment: "lab",
    };
    await testRunner.initTestcase(testcase);
   
    //(3) 创建BDT测试客户端
    let config : BdtCliConfig = {
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
            udp_sn_only : true,
            SN :LabSnList,
            resp_ep_type:Resp_ep_type.effectiveEP_WAN, 
    }
    // 每台机器运行一个bdt 客户端
    let agent_list = await AgentList_LAN_WAN(labAgent);
    let LN = agent_list.LAN[0].tags[0];
    let WAN = agent_list.WAN[0].tags[0];
    await agentManager.allAgentStartBdtPeer(config)
    await agentManager.uploadSystemInfo(testcase.testcaseId,2000);
    //(4) 测试用例执行器添加测试任务
    for(let i =0;i<50;i++){
        let info = await testRunner.createPrevTask({
            LN : `${LN}$1`,
            RN : `${WAN}$1`,
            timeout : 10*60*1000,
            action : []
        })
        for(let x=0;x<200;x++){
            let connect_1 =  `${Date.now()}_${RandomGenerator.string(10)}`;
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
        }
        await testRunner.prevTaskRun();
    }
    await testRunner.waitFinished()
  
}
