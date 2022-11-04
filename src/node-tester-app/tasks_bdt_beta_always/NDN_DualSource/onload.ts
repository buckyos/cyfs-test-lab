import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../base';
import {TestRunner} from '../../taskTools/cyfs_bdt/testRunner';
import {Testcase,Task,ActionType,Resp_ep_type} from "../../taskTools/cyfs_bdt/type"
import {labAgent,BdtPeerClientConfig,LabSnList,AgentList_LAN_WAN,randShuffle} from "../../taskTools/cyfs_bdt/labAgent"
import  * as BDTAction from "../../taskTools/cyfs_bdt/bdtAction"
import {AgentManager} from '../../taskTools/cyfs_bdt/agentManager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agentManager = AgentManager.createInstance(_interface);
    await agentManager.initAgentList(labAgent);
    //(2) 创建测试用例执行器 TestRunner
    let testRunner = new TestRunner(_interface);
    let testcaseName = "NDN_DualSource"
    let testcase:Testcase = {
        TestcaseName: testcaseName,
        testcaseId: `${testcaseName}_${Date.now()}`,
        remark: `# 操作流程：\n
        + （1）LN/RN/User0 初始化本地BDT协议栈
        + （2）RN 上传 10Mb 大小文件。
        + （3）User0 从RN进行下载
        + （4）LN 从 RN和User0 两个源进行下载 `,
        environment: "lab",
    };
    await testRunner.initTestcase(testcase);
    //(3) 创建BDT测试客户端
    let config : BdtPeerClientConfig = {
            eps:{
                ipv4:{
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
    await agentManager.uploadSystemInfo(testcase.testcaseId,2000);
    //(4) 测试用例执行器添加测试任务
    let AgentList = await AgentList_LAN_WAN(labAgent);
    for(let [i,j] of randShuffle(labAgent.length)){
        if(i != j && labAgent[i].NAT * labAgent[j].NAT != 0 && labAgent[i].NAT + labAgent[j].NAT < 5 ){
            let info = await testRunner.createPrevTask({
                LN : `${labAgent[i].tags[0]}$1`,
                RN : `${labAgent[j].tags[0]}$1`,
                timeout : 5*60*1000,
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
                    timeout : 160*1000,
                },
                expect : {err:0},    
            }))
            // 1.2 LN -> RN 发送数据
            info = await testRunner.prevTaskAddAction(new BDTAction.SendFileDualAction({
                type : ActionType.send_file,
                LN : `${labAgent[i].tags[0]}$1`,
                RN : `${labAgent[j].tags[0]}$1`,
                Users : [ `${AgentList.WAN[0].tags[0]}$1`],
                fileSize : 10*1024*1024,
                chunkSize : 4*1024*1024,
                config:{
                    timeout : 160*1000,
                },
                expect : {err:0},      
            }))
           
            
            await testRunner.prevTaskRun();
        }
    }


    await testRunner.waitFinished()
    
    
}
