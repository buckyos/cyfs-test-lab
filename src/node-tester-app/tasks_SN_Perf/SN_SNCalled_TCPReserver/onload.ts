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
    let testcase_name = "SN_SNCalled_UDP"
    let testcase:Testcase = {
        testcase_name: testcase_name,
        testcase_id: `${testcase_name}_${Date.now()}`,
        remark: `SN 打洞流程性能测试`,
        environment: "lab",
    };
    await test_runner.init_testcase(testcase);
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
            resp_ep_type:Resp_ep_type.Empty, 
    }
    // 每台机器运行一个bdt 客户端
    let agent_num = 2;
    await agent_manager.all_agent_start_bdt_peer(config,agent_num)
    
    //(4) 测试用例执行器添加测试任务

    for(let [i,j] of randShuffle(LabAgent.length*agent_num)){
        let LN_index = i % LabAgent.length;  
        let RN_index = j % LabAgent.length; 
        let LN_client = (i - LN_index ) /LabAgent.length + 1;  
        let RN_client = (j - RN_index) /LabAgent.length + 1; 
        if(i != j && i>j &&LabAgent[LN_index].NAT * LabAgent[RN_index].NAT == 0 ){
            
            let info = await test_runner.create_prev_task({
                LN : `${LabAgent[LN_index].tags[0]}$${LN_client}`,
                RN : `${LabAgent[RN_index].tags[0]}$${RN_client}`,
                timeout : 5*30*1000,
                action : []
            })
            // 1.1 LN 连接 RN
            let connect_1 =  `${Date.now()}_${RandomGenerator.string(10)}`;
            info = await test_runner.prev_task_add_action(new BDTAction.ConnectAction({
                type : ActionType.connect,
                LN : `${LabAgent[LN_index].tags[0]}$${LN_client}`,
                RN : `${LabAgent[RN_index].tags[0]}$${RN_client}`,
                config:{
                    conn_tag: connect_1,
                    timeout : 30*1000,
                },
                expect : {err:0},    
            })) 
            await test_runner.prev_task_run();
        }
    }
    await test_runner.wait_finished(20)
    
    
}
