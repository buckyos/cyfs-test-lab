import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../base';
import {TestRunner} from '../../testcase_runner/cyfs_bdt/test_runner';
import {Testcase,Task,ActionType,Resp_ep_type, BDTERROR} from "../../testcase_runner/cyfs_bdt/type"
import {LabAgent,BdtPeerClientConfig,LabSnList, PNType} from "../../testcase_runner/cyfs_bdt/labAgent"
import  * as BDTAction from "../../testcase_runner/cyfs_bdt/bdtAction"
import {AgentManager} from '../../testcase_runner/cyfs_bdt/agent_manager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agent_manager = AgentManager.create_instance(_interface);
    await agent_manager.init_agent_list(LabAgent);
    //(2) 创建测试用例执行器 TestRunner
    let test_runner = new TestRunner(_interface);
    let testcase_name = "Connect_Close_UDP_LNClose"
    let testcase:Testcase = {
        testcase_name: testcase_name,
        testcase_id: `${testcase_name}_${Date.now()}`,
        remark: `前置条件：
        (1) LN 和 RN使用UDP EP建立连接成功
    操作步骤：
        (1) LN向RN发起连接
        (2) LN向RN发送1M大小数据
        (3) LN发起关闭连接操作
        (4) RN向LN发送1M大小数据 
    预期结果：
        (1) 连接关闭后，RN发送数据失败，返回对应错误码 `,
        environment: "lab",
    };
    await test_runner.init_testcase(testcase);
    //(3) 创建BDT测试客户端
    let config : BdtPeerClientConfig = {
            eps:{
                ipv4:{
                    udp:true,
       
                },
                ipv6:{
                    udp:true,
         
                }
            },
            logType:"info",
            SN :LabSnList,
            resp_ep_type:Resp_ep_type.SN_Resp,
    }
    // 每台机器运行一个bdt 客户端
    await agent_manager.all_agent_start_bdt_peer(config)
    //(4) 测试用例执行器添加测试任务
    
    for(let i in LabAgent){
        for(let j in LabAgent ){
            if(i != j && LabAgent[i].NAT + LabAgent[j].NAT < 5 ){
                let info = await test_runner.create_prev_task({
                    LN : `${LabAgent[i].tags[0]}$1`,
                    RN : `${LabAgent[j].tags[0]}$1`,
                    timeout : 3*60*1000,
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
                        timeout : 30*1000,
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
                        timeout : 30*1000,
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
                        timeout : 30*1000,
                    },
                    expect : {err:0},      
                }))
                // 1.4 LN 关闭连接
                info = await test_runner.prev_task_add_action(new BDTAction.CloseConnectAction({
                    type : ActionType.close_connect,
                    LN : `${LabAgent[i].tags[0]}$1`,
                    config:{
                        conn_tag: connect_1,
                        timeout : 30*1000,
                    },
                    expect : {err:0},      
                }))
                // 1.5 RN -> LN 发送数据
                info = await test_runner.prev_task_add_action(new BDTAction.SendStreamNotReadAction({
                    type : ActionType.send_stream,
                    LN : `${LabAgent[j].tags[0]}$1`,
                    RN : `${LabAgent[i].tags[0]}$1`,
                    fileSize : 10*1024*1024,
                    config:{
                        conn_tag: connect_1,
                        timeout : 30*1000,
                    },
                    expect : {err:BDTERROR.timeout},     
                }))
                await test_runner.prev_task_run();
            }
        }
    }

    await test_runner.wait_finished()
    
    
}
