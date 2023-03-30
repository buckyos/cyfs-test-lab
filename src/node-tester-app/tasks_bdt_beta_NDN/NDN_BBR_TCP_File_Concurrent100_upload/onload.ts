import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../base';
import {TestRunner} from '../../testcase_runner/cyfs_bdt/test_runner';
import {Testcase,Task,ActionType,Resp_ep_type} from "../../testcase_runner/cyfs_bdt/type"
import {LabAgent,BdtPeerClientConfig,LabSnList,AgentList_LAN_WAN} from "../../testcase_runner/cyfs_bdt/labAgent"
import  * as BDTAction from "../../testcase_runner/cyfs_bdt/bdtAction"
import {AgentManager} from '../../testcase_runner/cyfs_bdt/agent_manager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agent_manager = AgentManager.create_instance(_interface);
    await agent_manager.init_agent_list(LabAgent);
    //(2) 创建测试用例执行器 TestRunner
    let test_runner = new TestRunner(_interface);
    let testcase_name = "NDN_BBR_TCP_File_Concurrent100_upload"
    let testcase:Testcase = {
        testcase_name: testcase_name,
        testcase_id: `${testcase_name}_${Date.now()}`,
        remark: `# 前置条件：
        (1)LN/RN 同时使用IPv4 TCP 协议EP
    操作步骤：
        (1) RN track_file_in_path 1个40Mb大小文件，chunk 大小 10Mb， 100个User并行从RN下载文件;
    测试节点数据限制：
        (1) 所有机器组合
    预期结果：
        (1) 符合P2P NAT穿透,传输成功，下载成功`,
        environment: "lab",
    };
    await test_runner.init_testcase(testcase);
    //(3) 创建BDT测试客户端
    let config : BdtPeerClientConfig = {
            eps:{
                ipv4:{
                    udp:true,
                    tcp : true,
                },
                ipv6:{
                    udp:true,
                    tcp : true,
                }
            },
            logType:"info",
            SN :LabSnList,
            udp_sn_only : 1,
            resp_ep_type:Resp_ep_type.effectiveEP_WAN, 
    }
    // 每台机器运行一个bdt 客户端
    let agent_list = await AgentList_LAN_WAN(LabAgent);
    let num = 10
    await agent_manager.all_agent_start_bdt_peer(config,num)
    await agent_manager.upload_system_info(testcase.testcase_id,5000);
    //(4) 测试用例执行器添加测试任务
    let Users = []
    for(let i =1;i<=num;i++){
        for(let index = 0;index<10;index++){
            Users.push(`${agent_list.LAN[index].tags[0]}$${i}`)
        }
    }
    
    for(let index = 0;index<1;index++){
        let RN =  agent_list.WAN[0].tags[0];
        let LN = "None";
        let connect_1 =  `${Date.now()}_${RandomGenerator.string(10)}`;
        let info = await test_runner.create_prev_task({
            LN : `${LN}$1`,
            RN : `${RN}$1`,
            Users,
            timeout : 10*60*1000,
            action : []
        })
        info = await test_runner.prev_task_add_action(new BDTAction.SendFileGroupAction({
            type : ActionType.send_file,
            LN : `${LN}$1`,
            RN : `${RN}$1`,
            Users,
            fileSize : 40 *1024*1024,
            chunkSize : 10*1024*1024,
            config:{
                conn_tag: connect_1,
                timeout : 500*1000,
            },
            expect : {err:0},    
        }))
        await test_runner.prev_task_run();
    }
    await test_runner.wait_finished()
  
}
