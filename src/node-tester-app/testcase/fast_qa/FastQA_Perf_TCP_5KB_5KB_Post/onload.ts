import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../../base';
import {TestRunner} from '../../../testcase_runner/cyfs_bdt_cli/test_runner';
import {Testcase,Task,ActionType,Resp_ep_type} from "../../../testcase_runner/cyfs_bdt_cli/type"
import {LabAgent,BdtCliConfig,LabSnList,IPv6Agent,randShuffle} from "../../../testcase_runner/cyfs_bdt_cli/lab_agent"
import  * as BDTAction from "../../../testcase_runner/cyfs_bdt_cli/bdtAction"
import {AgentManager} from '../../../testcase_runner/cyfs_bdt_cli/agent_manager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agent_manager = AgentManager.create_instance(_interface);
    await agent_manager.init_agent_list(LabAgent);
    //(2) 创建测试用例执行器 TestRunner
    let test_runner = new TestRunner(_interface);
    let testcase_name = "FastQA_Perf_TCP_5KB_5KB_Post"
    let testcase:Testcase = {
        testcase_name: testcase_name,
        testcase_id: `${testcase_name}_${Date.now()}`,
        remark: `测试性能:
        (1)LN -> RN 发起连接请求 Question 带有5KB请求数据 
        (2)RN 监听连接请求，收到连接请求后，解析Question,confrim 时回复5KB响应数据`,
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
        udp_sn_only : true,
            SN :LabSnList,
            resp_ep_type:Resp_ep_type.All, 
    }
    // 每台机器运行一个bdt 客户端
    await agent_manager.all_agent_start_bdt_peer(config)
    await agent_manager.upload_system_info(testcase.testcase_id,2000);
    //(4) 测试用例执行器添加测试任务
    
    for(let [i,j] of randShuffle(LabAgent.length)){
        
        if(i != j &&  LabAgent[j].NAT * LabAgent[i].NAT == 0  ){
            let info = await test_runner.create_prev_task({
                LN : `${LabAgent[i].tags[0]}$1`,
                RN : `${LabAgent[j].tags[0]}$1`,
                timeout : 5*30*1000,
                action : []
            })
            // 1.1 LN -> RN 连接10次
            for(let x=0;x<1;x++){
                let connect_1 =  `${Date.now()}_${RandomGenerator.string(10)}`;
                info = await test_runner.prev_task_add_action(new BDTAction.FastQAPerfAction({
                    type : ActionType.FasTQA,
                    LN : `${LabAgent[i].tags[0]}$1`,
                    RN : `${LabAgent[j].tags[0]}$1`,
                    config:{
                        conn_tag: connect_1,
                        firstQA_answer : 5*1024,
                        firstQA_question : 5*1024,
                        accept_answer : 1,
                        timeout : 60*1000,
                    },
                    expect : {err:0},    
                }))
            }           
            await test_runner.prev_task_run();
        }
        
    }

    await test_runner.wait_finished()
    
    
}
