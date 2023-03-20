import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../../base';
import {TestRunner} from '../../../testcase_runner/cyfs_bdt_cli/test_runner';
import {Testcase,Task,ActionType,Resp_ep_type,Listern_type} from "../../../testcase_runner/cyfs_bdt_cli/type"
import {LabAgent,BdtCliConfig,LabSnList,IPv6Agent,randShuffle} from "../../../testcase_runner/cyfs_bdt_cli/lab_agent"
import  * as BDTAction from "../../../testcase_runner/cyfs_bdt_cli/bdtAction"
import {AgentManager} from '../../../testcase_runner/cyfs_bdt_cli/agent_manager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agent_manager = AgentManager.create_instance(_interface);
    await agent_manager.init_agent_list(LabAgent);
    //(2) 创建测试用例执行器 TestRunner
    let test_runner = new TestRunner(_interface);
    let testcase_name = "FastQA_Perf_Stream_TCP_500_500_Post"
    let testcase:Testcase = {
        testcase_name: testcase_name,
        testcase_id: `${testcase_name}_${Date.now()}`,
        remark: `测试性能:
        (1) LN RN 建立连接
        (2) LN->RN 使用Stream发送 500 Bytes 请求数据
        (3) RN->LN 使用Stream回复 500 Bytes请求数据`,
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
            listern_type :  Listern_type.auto_response_stream
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
                info = await test_runner.prev_task_add_action(new BDTAction.ConnectAndSendPerfAction({
                    type : ActionType.FasTStream,
                    LN : `${LabAgent[i].tags[0]}$1`,
                    RN : `${LabAgent[j].tags[0]}$1`,
                    config:{
                        conn_tag: connect_1,
                        firstQA_answer : 500,
                        firstQA_question : 500,
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
