import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../base';
import {TestRunner} from '../../taskTools/cyfs_bdt/testRunner';
import {Testcase,Task,ActionType,Resp_ep_type} from "../../taskTools/cyfs_bdt/type"
import {labAgent,BdtPeerClientConfig,LabSnList,IPv6Agent,randShuffle,PNType} from "../../taskTools/cyfs_bdt/labAgent"
import  * as BDTAction from "../../taskTools/cyfs_bdt/bdtAction"
import {AgentManager} from '../../taskTools/cyfs_bdt/agentManager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agentManager = AgentManager.createInstance(_interface);
    await agentManager.initAgentList(labAgent);
    //(2) 创建测试用例执行器 TestRunner
    let testRunner = new TestRunner(_interface);
    let testcaseName = "FastQA_SNcall_BigPackage_IPv4"
    let testcase:Testcase = {
        TestcaseName: testcaseName,
        testcaseId: `${testcaseName}_${Date.now()}`,
        remark: `操作步骤：
        (1)Device直接建立连接，在Syn和Ack过程中完成首次数据发送，FastQA机制
        //(2) (3)过程随机执行一个
        (2)使用UDP协议，设置Quetion 25KB 发送成功
        (3)使用UDP协议，设置Quetion 25KB + 1Byte,超出最大限制出现报错
        `,
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
            udp_sn_only : 0,
            SN :LabSnList,
            PN : PNType.all,
            resp_ep_type:Resp_ep_type.All, 
    }
    for(let i =0;i<100;i++){
        config.PN!.activePnFiles.push("pn-miner.desc");
    }
    // 每台机器运行一个bdt 客户端
    await agentManager.allAgentStartBdtPeer(config)
    await agentManager.uploadSystemInfo(testcase.testcaseId,2000);
    await testRunner.waitFinished()
    
    
}
