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
    let testcase_name = "BDT_SN_restart_issuse"
    let testcase:Testcase = {
        testcase_name: testcase_name,
        testcase_id: `${testcase_name}_${Date.now()}`,
        remark: `# 验证 SN 服务重启后，设备无法连接SN的问题`,
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
            //udp_sn_only : 1,
            SN :LabSnList,
            resp_ep_type:Resp_ep_type.All, 
    }
    // 每台机器运行一个bdt 客户端
    await agent_manager.all_agent_start_bdt_peer(config)
    //(4) 测试用例执行器添加测试任务
    for(let i=0;i<10;i++){
        let info = await test_runner.create_prev_task({
            LN : `PC_0013$1`,
            RN : `PC_0016$1`,
            timeout : 5*30*1000,
            action : []
        })
        // 1.1 LN 连接 RN
        let connect_1 =  `${Date.now()}_${RandomGenerator.string(10)}`;
        info = await test_runner.prev_task_add_action(new BDTAction.SleepAction({
            type : ActionType.send_stream,
            LN : `PC_0013$1`,
            RN : `PC_0016$1`,
            fileSize : 10*1024*1024,
            config:{
                conn_tag: connect_1,
                timeout : 60*1000,
            },
            expect : {err:0},      
        })) 
        let connect_2 =  `${Date.now()}_${RandomGenerator.string(10)}`;
        info = await test_runner.prev_task_add_action(new BDTAction.ConnectAction({
            type : ActionType.connect,
            LN : `PC_0013$1`,
            RN : `PC_0016$1`,
            config:{
                conn_tag: connect_2,
                timeout : 30*1000,
            },
            expect : {err:0},    
        }))
        info = await test_runner.prev_task_add_action(new BDTAction.SendStreamAction({
            type : ActionType.send_stream,
            LN : `PC_0013$1`,
            RN : `PC_0016$1`,
            fileSize : 10*1024*1024,
            config:{
                conn_tag: connect_2,
                timeout : 30*1000,
            },
            expect : {err:0},      
        }))
        await test_runner.prev_task_run();
    }

    await test_runner.wait_finished()
    
    
}
