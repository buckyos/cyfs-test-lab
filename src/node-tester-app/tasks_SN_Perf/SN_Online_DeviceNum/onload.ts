import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../base';
import {TestRunner} from '../../testcase_runner/cyfs_bdt/test_runner';
import {Testcase,Task,ActionType,Resp_ep_type} from "../../testcase_runner/cyfs_bdt/type"
import {LabAgent,BdtPeerClientConfig,LabSnList,randShuffle} from "../../testcase_runner/cyfs_bdt/labAgent"
import  * as BDTAction from "../../testcase_runner/cyfs_bdt/bdtAction"
import {AgentManager} from '../../testcase_runner/cyfs_bdt/agent_manager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agent_manager = AgentManager.create_instance(_interface);
    await agent_manager.init_agent_list(LabAgent);
    //(2) 创建测试用例执行器 TestRunner
    let test_runner = new TestRunner(_interface);
    let testcase_name = "SN_Online_DeviceNum"
    let testcase:Testcase = {
        testcase_name: testcase_name,
        testcase_id: `${testcase_name}_${Date.now()}`,
        remark: `# 测试SN 在线Device 数量`,
        environment: "lab",
    };
    await test_runner.init_testcase(testcase);
    //(3) 创建BDT测试客户端
    let config : BdtPeerClientConfig = {
            eps:{
                ipv4:{
                    udp:true,
                }
            },
            logType:"info",
            SN : LabSnList,
            //SN :['sn-miner_xiao.desc',],
            resp_ep_type:Resp_ep_type.SN_Resp, 
    }
    // 每台机器运行一个bdt 客户端
    let agent_num = 1 ;
    let stack_num = 20;
    await agent_manager.all_agent_start_bdt_peer(config,agent_num)

    let mult =5;
    while(mult--){
        for(let i = 0;i< LabAgent.length;i++){
            let info = await test_runner.create_prev_task({
                LN : `${LabAgent[i].tags[0]}$1`,
                RN : `${LabAgent[i].tags[0]}$1`,
                timeout : 20*30*1000,
                action : []
            })
            // 1.1 LN 连接 RN
            for(let x=0;x<stack_num;x++){
                info = await test_runner.prev_task_add_action(new BDTAction.CreateBDTStackAction({
                    type : ActionType.start,
                    LN : `${LabAgent[i].tags[0]}$1`,
                    config:{
                        timeout : 40*1000,
                    },
                    expect : {err:0},    
                }))
            }
            await test_runner.prev_task_run();
        }
    }
    
    await test_runner.wait_finished(20)
    
    
}
