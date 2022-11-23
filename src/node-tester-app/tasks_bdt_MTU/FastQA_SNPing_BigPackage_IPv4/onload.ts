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
    let testcaseName = "FastQA_SNPing_BigPackage_IPv4"
    let testcase:Testcase = {
        TestcaseName: testcaseName,
        testcaseId: `${testcaseName}_${Date.now()}`,
        remark: `(1) 构造100个PN 增加Device Desc 部分的大小,等待SN上线
        (2) 具体30KB限制在单元测试代码中进行，实际不存在30KB SNPing`,
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
    for(let i in labAgent){
        let info = await testRunner.createPrevTask({
            LN : `${labAgent[i].tags[0]}$1`,
            RN : `${labAgent[i].tags[0]}$1`,
            timeout : 5*30*1000,
            action : []
        })
        info = await testRunner.prevTaskAddAction(new BDTAction.UploadSnOnlineAction({
            type : ActionType.connect,
            LN : `${labAgent[i].tags[0]}$1`,
            RN : `${labAgent[i].tags[0]}$1`,
            config:{
                timeout : 60*1000,
            },
            expect : {err:0},    
        }))
        await testRunner.prevTaskRun();
    }
    await testRunner.waitFinished()
    
    
}
