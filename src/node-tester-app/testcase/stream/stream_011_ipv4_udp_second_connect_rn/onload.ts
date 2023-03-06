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
    let testcase_name = "stream_0011_ipv4_udp_second_connect_rn"
    let testcase:Testcase = {
        testcase_name: testcase_name,
        testcase_id: `${testcase_name}_${Date.now()}`,
        remark: `# 操作流程：\n
        + （1）LN/RN 初始化本地BDT协议栈 同时使用IPv4 UDP协议
        + （2）LN 向 RN 发起首次连接 LN->RN 发送10MB,数据，RN->LN发送10MB数据
        + （3）RN 向 LN 发起二次连接 LN->RN 发送10MB,数据，RN->LN发送10MB数据
        + （4）LN RN 关闭连接`,
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
    await agent_manager.uploadSystemInfo(testcase.testcase_id,2000);
    //(4) 测试用例执行器添加测试任务
    for(let [i,j] of randShuffle(LabAgent.length)){
        if(i != j && LabAgent[i].NAT + LabAgent[j].NAT < 5 ){
            let info = await test_runner.create_prev_task({
                LN : `${LabAgent[i].tags[0]}$1`,
                RN : `${LabAgent[j].tags[0]}$1`,
                timeout : 5*30*1000,
                action : []
            })
            // 1.1 LN 连接 RN
            let connect_1 =  `${Date.now()}_${RandomGenerator.string(10)}`;
            info = await test_runner.prev_task_add_action(new BDTAction.ConnectAction({
                LN : `${LabAgent[i].tags[0]}$1`,
                RN : `${LabAgent[j].tags[0]}$1`,
                config:{
                    conn_tag: connect_1,
                    timeout : 30*1000,
                },
                expect : {err:0},    
            }))
            // LN -> RN 发送数据
            info = await test_runner.prev_task_add_action(new BDTAction.SendStreamAction({
                type : ActionType.send_stream,
                LN : `${LabAgent[i].tags[0]}$1`,
                RN : `${LabAgent[j].tags[0]}$1`,
                fileSize : 10*1024*1024,
                config:{
                    conn_tag: connect_1,
                    timeout : 30*1000,
                },
                expect : {err:0},      
            }))
            //RN -> LN 发送数据
            info = await test_runner.prev_task_add_action(new BDTAction.SendStreamAction({
                type : ActionType.send_stream_reverse,
                LN : `${LabAgent[j].tags[0]}$1`,
                RN : `${LabAgent[i].tags[0]}$1`,
                fileSize : 10*1024*1024,
                config:{
                    conn_tag: connect_1,
                    timeout : 30*1000,
                },
                expect : {err:0},      
            }))
            let connect_2 =  `${Date.now()}_${RandomGenerator.string(10)}`;
            info = await test_runner.prev_task_add_action(new BDTAction.ConnectAction({
               
                LN : `${LabAgent[j].tags[0]}$1`,
                RN : `${LabAgent[i].tags[0]}$1`,
                config:{
                    conn_tag: connect_2,
                    timeout : 30*1000,
                },
                expect : {err:0},    
            }))
            // LN -> RN 发送数据
            info = await test_runner.prev_task_add_action(new BDTAction.SendStreamAction({
                type : ActionType.send_stream,
                LN : `${LabAgent[i].tags[0]}$1`,
                RN : `${LabAgent[j].tags[0]}$1`,
                fileSize : 10*1024*1024,
                config:{
                    conn_tag: connect_2,
                    timeout : 30*1000,
                },
                expect : {err:0},      
            }))
            //RN -> LN 发送数据
            info = await test_runner.prev_task_add_action(new BDTAction.SendStreamAction({
                type : ActionType.send_stream_reverse,
                LN : `${LabAgent[j].tags[0]}$1`,
                RN : `${LabAgent[i].tags[0]}$1`,
                fileSize : 10*1024*1024,
                config:{
                    conn_tag: connect_2,
                    timeout : 30*1000,
                },
                expect : {err:0},      
            }))
            // 1.2 LN 关闭连接
            info = await test_runner.prev_task_add_action(new BDTAction.CloseConnectAction({
                
                LN : `${LabAgent[i].tags[0]}$1`,
                config:{
                    conn_tag: connect_1,
                    timeout : 30*1000,
                },
                expect : {err:0},      
            }))
            // 1.3 RN 关闭连接
            info = await test_runner.prev_task_add_action(new BDTAction.CloseConnectAction({
                
                LN : `${LabAgent[j].tags[0]}$1`,
                config:{
                    conn_tag: connect_2,
                    timeout : 30*1000,
                },
                expect : {err:0},      
            }))
            
            await test_runner.prev_task_run();
        }
    }


    await test_runner.wait_finished()
    
    
}
