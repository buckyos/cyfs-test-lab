import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../base';
import {TestRunner} from '../../testcase_runner/cyfs_bdt/test_runner';
import {Testcase,Task,ActionType,Resp_ep_type} from "../../testcase_runner/cyfs_bdt/type"
import {LabAgent,BdtPeerClientConfig,LabSnList} from "../../testcase_runner/cyfs_bdt/labAgent"
import  * as BDTAction from "../../testcase_runner/cyfs_bdt/bdtAction"
import {AgentManager} from '../../testcase_runner/cyfs_bdt/agent_manager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agent_manager = AgentManager.create_instance(_interface);
    await agent_manager.init_agent_list(LabAgent);
    //(2) 创建测试用例执行器 TestRunner
    let test_runner = new TestRunner(_interface);
    let testcase_name = "NDN_FileTask_ChunkSize"
    let testcase:Testcase = {
        testcase_name: testcase_name,
        testcase_id: `${testcase_name}_${Date.now()}`,
        remark: `前置条件：
        (1)LN/RN 同时使用IPv4/IPv6、TCP/UDP 协议EP
    操作步骤：
        (1) RN track_file_in_path  64Mb大小文件，chunk 1Mb，LN download_file 下载文件;
        (2) RN track_file_in_path  64Mb大小文件，chunk 4Mb，LN download_file 下载文件;
        (3) RN track_file_in_path  64Mb大小文件，chunk 10Mb，LN download_file 下载文件;
        (4) RN track_file_in_path  64Mb大小文件，chunk 32Mb，LN download_file 下载文件;
    测试节点数据限制：
        (1) 所有机器组合
    预期结果：
        (1) 符合P2P NAT穿透,传输成功`,
        environment: "lab",
    };
    await test_runner.init_testcase(testcase);
    //(3) 创建BDT测试客户端
    let config : BdtPeerClientConfig = {
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
            SN :LabSnList,
            resp_ep_type:Resp_ep_type.SN_Resp, 
    }
    // 每台机器运行一个bdt 客户端
    await agent_manager.all_agent_start_bdt_peer(config)
    //(4) 测试用例执行器添加测试任务
    
    for(let i in LabAgent){
        for(let j in LabAgent){
            if(i != j && LabAgent[i].NAT * LabAgent[j].NAT < 6){
                let info = await test_runner.create_prev_task({
                    LN : `${LabAgent[i].tags[0]}$1`,
                    RN : `${LabAgent[j].tags[0]}$1`,
                    timeout : 5*60*1000,
                    action : []
                })
                info = await test_runner.prev_task_add_action(new BDTAction.ConnectAction({
                    type : ActionType.connect,
                    LN : `${LabAgent[i].tags[0]}$1`,
                    RN : `${LabAgent[j].tags[0]}$1`,
                    config:{
                        conn_tag: "connect_1",
                        timeout : 60*1000,
                    },
                    expect : {err:0},    
                }))
                info = await test_runner.prev_task_add_action(new BDTAction.SendFileAction({
                    type : ActionType.send_file,
                    LN : `${LabAgent[i].tags[0]}$1`,
                    RN : `${LabAgent[j].tags[0]}$1`,
                    fileSize : 64*1024*1024,
                    chunkSize : 1*1024*1024,
                   config:{
                        timeout : 100*1000,
                    },
                    expect : {err:0},      
                }))
                info = await test_runner.prev_task_add_action(new BDTAction.SendFileAction({
                    type : ActionType.send_file,
                    LN : `${LabAgent[i].tags[0]}$1`,
                    RN : `${LabAgent[j].tags[0]}$1`,
                    fileSize : 64*1024*1024,
                    chunkSize : 4*1024*1024,
                   config:{
                        timeout : 100*1000,
                    },
                    expect : {err:0},      
                }))
                info = await test_runner.prev_task_add_action(new BDTAction.SendFileAction({
                    type : ActionType.send_file,
                    LN : `${LabAgent[i].tags[0]}$1`,
                    RN : `${LabAgent[j].tags[0]}$1`,
                    fileSize : 64*1024*1024,
                    chunkSize : 10*1024*1024,
                   config:{
                        timeout : 100*1000,
                    },
                    expect : {err:0},      
                }))
                info = await test_runner.prev_task_add_action(new BDTAction.SendFileAction({
                    type : ActionType.send_file,
                    LN : `${LabAgent[i].tags[0]}$1`,
                    RN : `${LabAgent[j].tags[0]}$1`,
                    fileSize : 64*1024*1024,
                    chunkSize : 32*1024*1024,
                   config:{
                        timeout : 100*1000,
                    },
                    expect : {err:0},      
                }))
                await test_runner.prev_task_run();
            }
        }
    }

    await test_runner.wait_finished()
    
    
}
