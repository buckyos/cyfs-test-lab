import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../../base';
import {TestRunner} from '../../../testcase_runner/cyfs_bdt_cli/test_runner';
import {Testcase,Task,ActionType,Resp_ep_type} from "../../../testcase_runner/cyfs_bdt_cli/type"
import {LabAgent,BdtCliConfig,LabSnList,randShuffle} from "../../../testcase_runner/cyfs_bdt_cli/lab_agent"
import  * as BDTAction from "../../../testcase_runner/cyfs_bdt_cli/bdtAction"
import {AgentManager} from '../../../testcase_runner/cyfs_bdt_cli/agent_manager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agent_manager = AgentManager.create_instance(_interface);
    await agent_manager.init_agent_list(LabAgent);
    //(2) 创建测试用例执行器 TestRunner
    let test_runner = new TestRunner(_interface);
    let testcase_name = "connect_039_udp_connect_time"
    let testcase:Testcase = {
        testcase_name: testcase_name,
        testcase_id: `${testcase_name}_${Date.now()}`,
        remark: `# 操作流程：\n
        + （1）LN/RN 初始化本地BDT协议栈 同时使用IPv4 UDP协议
        + （2）LN 向 RN 发起首次连接
        + （3）LN 向 RN 发起二次连接
        + （4）RN 向 LN 发起二次连接
        + （5）LN RN 关闭连接`,
        environment: "lab",
    };
    await test_runner.init_testcase(testcase);
    //(3) 创建BDT测试客户端
    let config : BdtCliConfig = {
            eps:{
                ipv4:{
                    udp:true,
                }
            },
            logType:"info",
            SN :LabSnList,
            resp_ep_type:Resp_ep_type.SN_Resp, 
    }
    // 每台机器运行一个bdt 客户端
    await agent_manager.all_agent_start_bdt_peer(config)
    await agent_manager.upload_system_info(testcase.testcase_id,2000);
    //(4) 测试用例执行器添加测试任务
    for(let [i,j] of randShuffle(LabAgent.length)){
        if(i != j && LabAgent[i].NAT + LabAgent[j].NAT < 5 ){
            let info = await test_runner.create_prev_task({
                LN : `${LabAgent[i].tags[0]}$1`,
                RN : `${LabAgent[j].tags[0]}$1`,
                timeout : 5*30*1000,
                action : []
            })
            // 1.1 LN 连接 RN 首次连接
            let connect_1 =  `${Date.now()}_${RandomGenerator.string(10)}`;
            info = await test_runner.prev_task_add_action(new BDTAction.ConnectAction({
                type :ActionType.connect_frist,
                LN : `${LabAgent[i].tags[0]}$1`,
                RN : `${LabAgent[j].tags[0]}$1`,
                config:{
                    conn_tag: connect_1,
                    timeout : 30*1000,
                },
                expect : {err:0},    
            }))
            // 1.2 LN 连接 RN 二次连接
            let connect_2 =  `${Date.now()}_${RandomGenerator.string(10)}`;
            info = await test_runner.prev_task_add_action(new BDTAction.ConnectAction({
                type :ActionType.connect_second,
                LN : `${LabAgent[i].tags[0]}$1`,
                RN : `${LabAgent[j].tags[0]}$1`,
                config:{
                    conn_tag: connect_2,
                    timeout : 30*1000,
                },
                expect : {err:0},    
            }))
            // 1.3 LN 连接 RN 二次连接 反向
            let connect_3 =  `${Date.now()}_${RandomGenerator.string(10)}`;
            info = await test_runner.prev_task_add_action(new BDTAction.ConnectAction({
                type :ActionType.connect_second_reverse,
                LN : `${LabAgent[j].tags[0]}$1`,
                RN : `${LabAgent[i].tags[0]}$1`,
                config:{
                    conn_tag: connect_3,
                    timeout : 30*1000,
                },
                expect : {err:0},    
            }))
            //  LN 关闭连接 connect_1
            info = await test_runner.prev_task_add_action(new BDTAction.CloseConnectAction({
                
                LN : `${LabAgent[i].tags[0]}$1`,
                config:{
                    conn_tag: connect_1,
                    timeout : 30*1000,
                },
                expect : {err:0},      
            }))
            //  RN 关闭连接 connect_2
            info = await test_runner.prev_task_add_action(new BDTAction.CloseConnectAction({
                
                LN : `${LabAgent[j].tags[0]}$1`,
                config:{
                    conn_tag: connect_2,
                    timeout : 30*1000,
                },
                expect : {err:0},      
            }))
            //  LN 关闭连接 connect_3
            info = await test_runner.prev_task_add_action(new BDTAction.CloseConnectAction({
                
                LN : `${LabAgent[i].tags[0]}$1`,
                config:{
                    conn_tag: connect_3,
                    timeout : 30*1000,
                },
                expect : {err:0},      
            }))
            await test_runner.prev_task_run();
        }
    }


    await test_runner.wait_finished()
    
    
}
