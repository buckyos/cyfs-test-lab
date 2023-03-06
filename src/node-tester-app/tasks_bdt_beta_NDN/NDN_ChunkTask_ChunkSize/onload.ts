import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../base';
import {TestRunner} from '../../testcase_runner/cyfs_bdt/test_runner';
import {Testcase,Task,ActionType,Resp_ep_type} from "../../testcase_runner/cyfs_bdt/type"
import {LabAgent,BdtPeerClientConfig,LabSnList} from "../../testcase_runner/cyfs_bdt/labAgent"
import  * as BDTAction from "../../testcase_runner/cyfs_bdt/bdtAction"
import {AgentManager} from '../../testcase_runner/cyfs_bdt/agent_manager'
import { BDTERROR } from '../../testcase_runner/rust-bdt/type';

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agent_manager = AgentManager.create_instance(_interface);
    await agent_manager.init_agent_list(LabAgent);
    //(2) 创建测试用例执行器 TestRunner
    let test_runner = new TestRunner(_interface);
    let testcase_name = "NDN_ChunkTask_ChunkSize"
    let testcase:Testcase = {
        testcase_name: testcase_name,
        testcase_id: `${testcase_name}_${Date.now()}`,
        remark: `前置条件：
        (1)LN/RN 同时使用IPv4/IPv6、TCP/UDP 协议EP
    操作步骤：
        // 为空 chunk 应该cyfs_base 限制
        (1) RN set_chunk 1 bytes 数据，LN interest_chunk;
        (2) RN set_chunk 1000 bytes 数据(一个MTU能传输)，LN interest_chunk;
        (3) RN set_chunk 1500 bytes 数据(两个MTU能传输)，LN interest_chunk;
        (4) RN set_chunk 10Mb 数据(最佳传输大小)，LN interest_chunk;
        (5) RN set_chunk 64Mb 数据(喷泉码限制)，LN interest_chunk;
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
                    expect : {err:0}    
                }))
                info = await test_runner.prev_task_add_action(new BDTAction.SendChunkAction({
                    type : ActionType.send_file,
                    LN : `${LabAgent[i].tags[0]}$1`,
                    RN : `${LabAgent[j].tags[0]}$1`,
                    chunkSize : 1,
                    config:{
                        timeout : 60*1000,
                    },
                    expect : {err:0}     
                }))
                info = await test_runner.prev_task_add_action(new BDTAction.SendChunkAction({
                    type : ActionType.send_file,
                    LN : `${LabAgent[i].tags[0]}$1`,
                    RN : `${LabAgent[j].tags[0]}$1`,
                    chunkSize : 1000,
                    config:{
                        timeout : 60*1000,
                    },
                    expect : {err:0}  
                        
                }))  
                info = await test_runner.prev_task_add_action(new BDTAction.SendChunkAction({
                    type : ActionType.send_file,
                    LN : `${LabAgent[i].tags[0]}$1`,
                    RN : `${LabAgent[j].tags[0]}$1`,
                    chunkSize : 1500,
                    config:{
                        timeout : 60*1000,
                    },
                    expect : {err:0}  
                        
                })) 
                info = await test_runner.prev_task_add_action(new BDTAction.SendChunkAction({
                    type : ActionType.send_file,
                    LN : `${LabAgent[i].tags[0]}$1`,
                    RN : `${LabAgent[j].tags[0]}$1`,
                    chunkSize : 10*1024*1024,
                    config:{
                        timeout : 60*1000,
                    },
                    expect : {err:0}  
                        
                })) 
                info = await test_runner.prev_task_add_action(new BDTAction.SendChunkAction({
                    type : ActionType.send_file,
                    LN : `${LabAgent[i].tags[0]}$1`,
                    RN : `${LabAgent[j].tags[0]}$1`,
                    chunkSize : 64*1024*1024,
                    config:{
                        timeout : 60*1000,
                    },
                    expect : {err:0}  
                        
                })) 
                await test_runner.prev_task_run();
            }
        }
    }

    await test_runner.wait_finished()
    
    
}
