import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../../base';
import {TestRunner} from '../../../testcase_runner/cyfs_bdt_cli/test_runner';
import {Testcase,Task,ActionType,Resp_ep_type} from "../../../testcase_runner/cyfs_bdt_cli/type"
import {LabAgent,BdtCliConfig,LabSnList,randShuffle} from "../../../testcase_runner/cyfs_bdt_cli/lab_agent"
import  * as BDTAction from "../../../testcase_runner/cyfs_bdt_cli/bdtAction"
import {AgentManager} from '../../../testcase_runner/cyfs_bdt_cli/agent_manager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agent_manager = AgentManager.create_instance(_interface);
     // 选指定连个节点进行测试
     let testAgent = [];
     const LN = "PC_0013";
     const RN = "PC_0018";
     for (let agent of LabAgent) {
         if (agent.tags[0] == LN || agent.tags[0] == RN) {
             testAgent.push(agent)
         }
     }
     await agent_manager.init_agent_list(testAgent);
    //(2) 创建测试用例执行器 TestRunner
    let test_runner = new TestRunner(_interface);
    let testcase_name = "stream_016_ipv4_udp_data_size"
    let testcase:Testcase = {
        testcase_name: testcase_name,
        testcase_id: `${testcase_name}_${Date.now()}`,
        remark: `# 操作流程：\n
        + （1）LN/RN 初始化本地BDT协议栈 同时使用IPv4 UDP协议
        + （2）LN 向 RN 发起首次连接 LN->RN 发送1 ytes 1500bytes 100MB 1GB 大小数据
        + （3）LN RN 关闭连接`,
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
    for(let [i,j] of randShuffle(testAgent.length)){
        if(i != j && testAgent[i].NAT + testAgent[j].NAT < 5 ){
            let info = await test_runner.create_prev_task({
                LN : `${testAgent[i].tags[0]}$1`,
                RN : `${testAgent[j].tags[0]}$1`,
                timeout : 5*30*1000,
                action : []
            })
            // 1.1 LN 连接 RN
            let connect_1 =  `${Date.now()}_${RandomGenerator.string(10)}`;
            info = await test_runner.prev_task_add_action(new BDTAction.ConnectAction({
               
                LN : `${testAgent[i].tags[0]}$1`,
                RN : `${testAgent[j].tags[0]}$1`,
                config:{
                    conn_tag: connect_1,
                    timeout : 30*1000,
                },
                expect : {err:0},    
            }))
            // LN -> RN 发送数据 1 字节
            info = await test_runner.prev_task_add_action(new BDTAction.SendStreamAction({
                type : ActionType.send_stream,
                LN : `${testAgent[i].tags[0]}$1`,
                RN : `${testAgent[j].tags[0]}$1`,
                fileSize : 1,
                config:{
                    conn_tag: connect_1,
                    timeout : 30*1000,
                },
                expect : {err:0},      
            }))
            // LN -> RN 发送数据 1500 字节
            info = await test_runner.prev_task_add_action(new BDTAction.SendStreamAction({
                type : ActionType.send_stream,
                LN : `${testAgent[i].tags[0]}$1`,
                RN : `${testAgent[j].tags[0]}$1`,
                fileSize : 1500,
                config:{
                    conn_tag: connect_1,
                    timeout : 30*1000,
                },
                expect : {err:0},      
            }))
            // LN -> RN 发送数据 100MB
            info = await test_runner.prev_task_add_action(new BDTAction.SendStreamAction({
                type : ActionType.send_stream,
                LN : `${testAgent[i].tags[0]}$1`,
                RN : `${testAgent[j].tags[0]}$1`,
                fileSize : 100*1024*1024,
                config:{
                    conn_tag: connect_1,
                    timeout : 300*1000,
                },
                expect : {err:0},      
            }))
            // LN -> RN 发送数据 1GB
            info = await test_runner.prev_task_add_action(new BDTAction.SendStreamAction({
                type : ActionType.send_stream,
                LN : `${testAgent[i].tags[0]}$1`,
                RN : `${testAgent[j].tags[0]}$1`,
                fileSize : 1*1024*1024*1024,
                config:{
                    conn_tag: connect_1,
                    timeout : 300*1000,
                },
                expect : {err:0},      
            }))
            // 1.2 LN 关闭连接
            info = await test_runner.prev_task_add_action(new BDTAction.CloseConnectAction({
                
                LN : `${testAgent[i].tags[0]}$1`,
                config:{
                    conn_tag: connect_1,
                    timeout : 300*1000,
                },
                expect : {err:0},      
            }))
            // 1.3 RN 关闭连接
            info = await test_runner.prev_task_add_action(new BDTAction.CloseConnectAction({
                
                LN : `${testAgent[j].tags[0]}$1`,
                config:{
                    conn_tag: connect_1,
                    timeout : 300*1000,
                },
                expect : {err:0},      
            }))
            
            await test_runner.prev_task_run();
        }
    }


    await test_runner.wait_finished()
    
    
}
