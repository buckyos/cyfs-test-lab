import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../base';
import {TestRunner} from '../../testcase_runner/cyfs_bdt/test_runner';
import {Testcase,Task,ActionType,Resp_ep_type} from "../../testcase_runner/cyfs_bdt/type"
import {LabAgent,BdtPeerClientConfig,LabSnList,randShuffle,PNType} from "../../testcase_runner/cyfs_bdt/labAgent"
import  * as BDTAction from "../../testcase_runner/cyfs_bdt/bdtAction"
import {AgentManager} from '../../testcase_runner/cyfs_bdt/agent_manager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agent_manager = AgentManager.create_instance(_interface);
    await agent_manager.init_agent_list(LabAgent);
    //(2) 创建测试用例执行器 TestRunner
    let test_runner = new TestRunner(_interface);
    let testcase_name = "PN_Stream_UDP_Active_Notuse"
    let testcase:Testcase = {
        testcase_name: testcase_name,
        testcase_id: `${testcase_name}_${Date.now()}`,
        remark: `前置条件
        LN 和 RN 使用UDP协议，能通过SN打洞连接成功,不会使用PN
        ## 操作流程：\n
        + （1）LN/RN 初始化本地BDT协议栈,设置主动PN
        + （2）LN 向 RN 发起首次连接，LN发送10M大小stream数据,RN发送10Mb大小数据，关闭连接
        + （3）LN 向 RN 发起二次连接，LN发送10M大小stream数据,RN发送10Mb大小数据，关闭连接
        + （4）RN 向 LN 发起反向连接，LN发送10M大小stream数据,RN发送10Mb大小数据，关闭连接`,
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
            PN : PNType.active, 
            logType:"info",
            SN :LabSnList,
            resp_ep_type:Resp_ep_type.SN_Resp, 
    }
    // 每台机器运行一个bdt 客户端
    await agent_manager.all_agent_start_bdt_peer(config)
    //(4) 测试用例执行器添加测试任务
    for(let [i,j] of randShuffle(LabAgent.length)){
        if(i != j && LabAgent[i].NAT + LabAgent[j].NAT < 5 ){
            let info = await test_runner.create_prev_task({
                LN : `${LabAgent[i].tags[0]}$1`,
                RN : `${LabAgent[j].tags[0]}$1`,
                timeout : 5*130*1000,
                action : []
            })
            // 1.1 LN 连接 RN
            let connect_1 =  `${Date.now()}_${RandomGenerator.string(10)}`;
            info = await test_runner.prev_task_add_action(new BDTAction.ConnectAction({
                type : ActionType.connect,
                LN : `${LabAgent[i].tags[0]}$1`,
                RN : `${LabAgent[j].tags[0]}$1`,
                config:{
                    conn_tag: connect_1,
                    timeout : 130*1000,
                },
                expect : {err:0},    
            }))
            // 1.2 LN -> RN 发送数据
            info = await test_runner.prev_task_add_action(new BDTAction.SendStreamAction({
                type : ActionType.send_stream,
                LN : `${LabAgent[i].tags[0]}$1`,
                RN : `${LabAgent[j].tags[0]}$1`,
                fileSize : 10*1024*1024,
                config:{
                    conn_tag: connect_1,
                    timeout : 130*1000,
                },
                expect : {err:0},      
            }))
            // 1.3 RN -> LN 发送数据
            info = await test_runner.prev_task_add_action(new BDTAction.SendStreamAction({
                type : ActionType.send_stream_reverse,
                LN : `${LabAgent[j].tags[0]}$1`,
                RN : `${LabAgent[i].tags[0]}$1`,
                fileSize : 10*1024*1024,
                config:{
                    conn_tag: connect_1,
                    timeout : 130*1000,
                },
                expect : {err:0},      
            }))
            // 1.4 LN 关闭连接
            info = await test_runner.prev_task_add_action(new BDTAction.CloseConnectAction({
                type : ActionType.close_connect,
                LN : `${LabAgent[i].tags[0]}$1`,
                config:{
                    conn_tag: connect_1,
                    timeout : 130*1000,
                },
                expect : {err:0},      
            }))
            // 1.5 RN 关闭连接
            info = await test_runner.prev_task_add_action(new BDTAction.CloseConnectAction({
                type : ActionType.close_connect,
                LN : `${LabAgent[j].tags[0]}$1`,
                config:{
                    conn_tag: connect_1,
                    timeout : 130*1000,
                },
                expect : {err:0},      
            }))
            // 2.1 LN 连接 RN
            let connect_2 =  `${Date.now()}_${RandomGenerator.string(10)}`;
            info = await test_runner.prev_task_add_action(new BDTAction.ConnectAction({
                type : ActionType.connect_second,
                LN : `${LabAgent[i].tags[0]}$1`,
                RN : `${LabAgent[j].tags[0]}$1`,
                config:{
                    conn_tag: connect_2,
                    timeout : 130*1000,
                },
                expect : {err:0},    
            }))
            // 2.2 LN -> RN 发送数据
            info = await test_runner.prev_task_add_action(new BDTAction.SendStreamAction({
                type : ActionType.send_stream,
                LN : `${LabAgent[i].tags[0]}$1`,
                RN : `${LabAgent[j].tags[0]}$1`,
                fileSize : 10*1024*1024,
                config:{
                    conn_tag: connect_2,
                    timeout : 130*1000,
                },
                expect : {err:0},      
            }))
            // 2.3 RN -> LN 发送数据
            info = await test_runner.prev_task_add_action(new BDTAction.SendStreamAction({
                type : ActionType.send_stream_reverse,
                LN : `${LabAgent[j].tags[0]}$1`,
                RN : `${LabAgent[i].tags[0]}$1`,
                fileSize : 10*1024*1024,
                config:{
                    conn_tag: connect_2,
                    timeout : 130*1000,
                },
                expect : {err:0},      
            }))
            // 2.4 LN 关闭连接
            info = await test_runner.prev_task_add_action(new BDTAction.CloseConnectAction({
                type : ActionType.close_connect,
                LN : `${LabAgent[i].tags[0]}$1`,
                config:{
                    conn_tag: connect_2,
                    timeout : 130*1000,
                },
                expect : {err:0},      
            })) 
            // 2.5 RN 关闭连接
            info = await test_runner.prev_task_add_action(new BDTAction.CloseConnectAction({
                type : ActionType.close_connect,
                LN : `${LabAgent[j].tags[0]}$1`,
                config:{
                    conn_tag: connect_2,
                    timeout : 130*1000,
                },
                expect : {err:0},      
            })) 
            // 3.1 RN 连接 LN
            let connect_3 =  `${Date.now()}_${RandomGenerator.string(10)}`;
            info = await test_runner.prev_task_add_action(new BDTAction.ConnectAction({
                type : ActionType.connect_reverse,
                LN : `${LabAgent[j].tags[0]}$1`,
                RN : `${LabAgent[i].tags[0]}$1`,
                config:{
                    conn_tag: connect_3,
                    timeout : 130*1000,
                },
                expect : {err:0},    
            }))
            // 3.2 RN -> LN 发送数据
            info = await test_runner.prev_task_add_action(new BDTAction.SendStreamAction({
                type : ActionType.send_stream,
                LN : `${LabAgent[j].tags[0]}$1`,
                RN : `${LabAgent[i].tags[0]}$1`,
                fileSize : 10*1024*1024,
                config:{
                    conn_tag: connect_3,
                    timeout : 130*1000,
                },
                expect : {err:0},      
            }))
            // 3.3 LN -> RN 发送数据
            info = await test_runner.prev_task_add_action(new BDTAction.SendStreamAction({
                type : ActionType.send_stream_reverse,
                LN : `${LabAgent[i].tags[0]}$1`,
                RN : `${LabAgent[j].tags[0]}$1`,
                fileSize : 10*1024*1024,
                config:{
                    conn_tag: connect_3,
                    timeout : 130*1000,
                },
                expect : {err:0},      
            }))
            // 3.4 RN 关闭连接
            info = await test_runner.prev_task_add_action(new BDTAction.CloseConnectAction({
                type : ActionType.close_connect,
                LN : `${LabAgent[j].tags[0]}$1`,
                config:{
                    conn_tag: connect_3,
                    timeout : 130*1000,
                },
                expect : {err:0},      
            }))  
            // 3.5 LN 关闭连接
            info = await test_runner.prev_task_add_action(new BDTAction.CloseConnectAction({
                type : ActionType.close_connect,
                LN : `${LabAgent[i].tags[0]}$1`,
                config:{
                    conn_tag: connect_3,
                    timeout : 130*1000,
                },
                expect : {err:0},      
            }))  
            
            await test_runner.prev_task_run();
        }
    }


    await test_runner.wait_finished()
    
    
}
