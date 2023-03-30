import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../../base';
import {TestRunner} from '../../../testcase_runner/cyfs_bdt_cli/test_runner';
import {Testcase,Task,ActionType,Resp_ep_type} from "../../../testcase_runner/cyfs_bdt_cli/type"
import {LabAgent,BdtCliConfig,LabSnList,IPv6Agent,randShuffle,PNType} from "../../../testcase_runner/cyfs_bdt_cli/lab_agent"
import  * as BDTAction from "../../../testcase_runner/cyfs_bdt_cli/bdtAction"
import {AgentManager} from '../../../testcase_runner/cyfs_bdt_cli/agent_manager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agent_manager = AgentManager.create_instance(_interface);
    await agent_manager.init_agent_list(LabAgent);
    //(2) 创建测试用例执行器 TestRunner
    let test_runner = new TestRunner(_interface);
    let testcase_name = "FastQA_SNPing_BigPackage_IPv4"
    let testcase:Testcase = {
        testcase_name: testcase_name,
        testcase_id: `${testcase_name}_${Date.now()}`,
        remark: `(1) 构造100个PN 增加Device Desc 部分的大小,等待SN上线
        (2) 具体30KB限制在单元测试代码中进行，实际不存在30KB SNPing`,
        environment: "lab",
    };
    await test_runner.init_testcase(testcase);
    //(3) 创建BDT测试客户端
    let config : BdtCliConfig = {
            eps:{
                ipv4:{
                    udp:true,
                    tcp:true,
                }
            },
            logType:"info",
            udp_sn_only : false,
            SN :LabSnList,
            PN : PNType.all,
            resp_ep_type:Resp_ep_type.All, 
    }
    for(let i =0;i<100;i++){
        config.PN!.activePnFiles.push("pn-miner.desc");
    }
    // 每台机器运行一个bdt 客户端
    
    await agent_manager.all_agent_start_bdt_peer(config)
    await agent_manager.upload_system_info(testcase.testcase_id,2000);
    for(let i in LabAgent){
        let info = await test_runner.create_prev_task({
            LN : `${LabAgent[i].tags[0]}$1`,
            RN : `${LabAgent[i].tags[0]}$1`,
            timeout : 5*30*1000,
            action : []
        })
        info = await test_runner.prev_task_add_action(new BDTAction.UploadSnOnlineAction({
            type : ActionType.connect,
            LN : `${LabAgent[i].tags[0]}$1`,
            RN : `${LabAgent[i].tags[0]}$1`,
            config:{
                timeout : 60*1000,
            },
            expect : {err:0},    
        }))
        await test_runner.prev_task_run();
    }
    await test_runner.wait_finished()
    
    
}
