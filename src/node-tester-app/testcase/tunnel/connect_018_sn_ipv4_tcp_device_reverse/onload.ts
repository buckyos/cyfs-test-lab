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
    let testcase_name = "connect_018_sn_ipv4_tcp_device_reverse"
    let testcase:Testcase = {
        testcase_name: testcase_name,
        testcase_id: `${testcase_name}_${Date.now()}`,
        remark: `前置条件：
        （1）LN/RN 使用同一个SN
        （2）LN/RN 设备TCP网络可以正常使用
         (3) RN 设备使用UDP协议在SN上线
    操作步骤：
        连接Stream基础测试用例操作流程
    测试节点数据限制：
        (1) LN/RN 初始化BDT协议栈时只使用IPv4和TCP协议 EP
        (2) LN 节点知道 RN Device 中的EP 为空
    预期结果：
        (1)符合P2P NAT穿透理论规则`,
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
            SN :LabSnList,
            udp_sn_only : true,
            resp_ep_type:Resp_ep_type.default, 
    }
    // 每台机器运行一个bdt 客户端
    await agent_manager.all_agent_start_bdt_peer(config)
    //(4) 测试用例执行器添加测试任务
    for(let [i,j] of randShuffle(LabAgent.length)){
        if(i != j && LabAgent[i].NAT == 0 && LabAgent[j].NAT>0){
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
                    conn_tag: connect_1,
                    timeout : 30*1000,
                },
                expect : {err:0},      
            }))  
            await test_runner.prev_task_run();
        }
    }


    await test_runner.wait_finished()
    
    
}
