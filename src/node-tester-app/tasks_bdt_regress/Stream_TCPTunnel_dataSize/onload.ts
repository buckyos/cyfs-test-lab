import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../base';
import {TestRunner} from '../../testcase_runner/cyfs_bdt_cli/test_runner';
import {Testcase,Task,ActionType,Resp_ep_type} from "../../testcase_runner/cyfs_bdt_cli/type"
import {LabAgent,BdtCliConfig,LabSnList,AgentList_LAN_WAN} from "../../testcase_runner/cyfs_bdt_cli/lab_agent"
import  * as BDTAction from "../../testcase_runner/cyfs_bdt_cli/bdtAction"
import {AgentManager} from '../../testcase_runner/cyfs_bdt_cli/agent_manager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agent_manager = AgentManager.create_instance(_interface);
    await agent_manager.init_agent_list(LabAgent);
    //(2) 创建测试用例执行器 TestRunner
    let test_runner = new TestRunner(_interface);
    let testcase_name = "Stream_TCPTunnel_dataSize"
    let testcase:Testcase = {
        testcase_name: testcase_name,
        testcase_id: `${testcase_name}_${Date.now()}`,
        remark: `# 前置条件：
        （1）LN/RN 网络可以基于TCP建立连接
    操作步骤：
         (1) LN 和 RN 建立T连接
         (2) 发送2GB有效数据
    预期结果：
        (1) 数据发送成功`,
        environment: "lab",
    };
    await test_runner.init_testcase(testcase);
    //(3) 创建BDT测试客户端
    let config : BdtCliConfig = {
            eps:{
                ipv4:{
                    udp:true,
                    tcp:true,
                },
                ipv6:{
                    udp:true,
                    tcp:true,
                }
            },
            logType:"info",
            udp_sn_only : true,
            SN :LabSnList,
            resp_ep_type:Resp_ep_type.effectiveEP_WAN, 
    }
    // 每台机器运行一个bdt 客户端
    let agent_list = await AgentList_LAN_WAN(LabAgent);
    let LN = agent_list.LAN[0].tags[0];
    let WAN = agent_list.WAN[0].tags[0];
    await agent_manager.all_agent_start_bdt_peer(config)
    //(4) 测试用例执行器添加测试任务
    for(let i =0;i<1;i++){
        let connect_1 =  `${Date.now()}_${RandomGenerator.string(10)}`;
        let info = await test_runner.create_prev_task({
            LN : `${LN}$1`,
            RN : `${WAN}$1`,
            timeout : 50*30*1000,
            action : []
        })
        info = await test_runner.prev_task_add_action(new BDTAction.ConnectAction({
            type : ActionType.connect,
            LN : `${LN}$1`,
            RN : `${WAN}$1`,
            config:{
                conn_tag: connect_1,
                timeout : 20*1000,
            },
            expect : {err:0},    
        }))
        info = await test_runner.prev_task_add_action(new BDTAction.SendStreamAction({
            type : ActionType.send_stream,
            LN : `${LN}$1`,
            RN : `${WAN}$1`,
            fileSize : 1,
            config:{
                conn_tag: connect_1,
                timeout : 30*1000,
            },
            expect : {err:0},    
        }))
        info = await test_runner.prev_task_add_action(new BDTAction.SendStreamAction({
            type : ActionType.send_stream,
            LN : `${LN}$1`,
            RN : `${WAN}$1`,
            fileSize : 500,
            config:{
                conn_tag: connect_1,
                timeout : 30*1000,
            },
            expect : {err:0},    
        }))
        info = await test_runner.prev_task_add_action(new BDTAction.SendStreamAction({
            type : ActionType.send_stream,
            LN : `${LN}$1`,
            RN : `${WAN}$1`,
            fileSize : 1500,
            config:{
                conn_tag: connect_1,
                timeout : 30*1000,
            },
            expect : {err:0},    
        }))
        info = await test_runner.prev_task_add_action(new BDTAction.SendStreamAction({
            type : ActionType.send_stream,
            LN : `${LN}$1`,
            RN : `${WAN}$1`,
            fileSize : 10*1024*1024,
            config:{
                conn_tag: connect_1,
                timeout : 30*1000,
            },
            expect : {err:0},    
        }))
        await test_runner.prev_task_run();
    }
    await test_runner.wait_finished()
  
}
