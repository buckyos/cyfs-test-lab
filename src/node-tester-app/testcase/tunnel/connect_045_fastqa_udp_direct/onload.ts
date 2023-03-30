import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../../base';
import {TestRunner} from '../../../testcase_runner/cyfs_bdt_cli/test_runner';
import {Testcase,Task,ActionType,Resp_ep_type} from "../../../testcase_runner/cyfs_bdt_cli/type"
import {LabAgent,BdtCliConfig,LabSnList} from "../../../testcase_runner/cyfs_bdt_cli/lab_agent"
import  * as BDTAction from "../../../testcase_runner/cyfs_bdt_cli/bdtAction"
import {AgentManager} from '../../../testcase_runner/cyfs_bdt_cli/agent_manager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agent_manager = AgentManager.create_instance(_interface);
    await agent_manager.init_agent_list(LabAgent);
    //(2) 创建测试用例执行器 TestRunner
    let test_runner = new TestRunner(_interface);
    let testcase_name = "connect_045_fastqa_udp_direct"
    let testcase:Testcase = {
        testcase_name: testcase_name,
        testcase_id: `${testcase_name}_${Date.now()}`,
        remark: `前置条件：
        （1）LN/RN 同时使用UDP协议EP
         (2) LN 可以直连RN
    操作步骤：
        (1) LN向RN发起首次连接，LN Sync 包question 带有100字节数据 ,RN ACK包 answer带有100字节数据
        (2) LN向RN发起二次连接，LN Sync 包question 带有100字节数据 ,RN ACK包 answer带有100字节数据
        (3) RN向LN发起反向连接，RN Sync 包question 带有100字节数据 ,LN ACK包 answer带有100字节数据
    测试节点数据限制：
        (1) 节点使用UDP直连
    预期结果：
        (1) LN 连接RN成功，连接过程中实现首次数据包发送`,
        environment: "lab",
    };
    await test_runner.init_testcase(testcase);
    //(3) 创建BDT测试客户端
    let config : BdtCliConfig = {
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
            resp_ep_type:Resp_ep_type.effectiveEP_WAN, 
    }
    // 每台机器运行一个bdt 客户端
    await agent_manager.all_agent_start_bdt_peer(config)
    //(4) 测试用例执行器添加测试任务
    
    for(let i in LabAgent){
        for(let j in LabAgent){
            if(i != j &&  LabAgent[j].NAT == 0 ){
                let info = await test_runner.create_prev_task({
                    LN : `${LabAgent[i].tags[0]}$1`,
                    RN : `${LabAgent[j].tags[0]}$1`,
                    timeout : 5*30*1000,
                    action : []
                })
                // 1.1 LN -> RN 连接10次
                for(let x=0;x<10;x++){
                    let connect_1 =  `${Date.now()}_${RandomGenerator.string(10)}`;
                    info = await test_runner.prev_task_add_action(new BDTAction.ConnectAction({
                        type : ActionType.connect,
                        LN : `${LabAgent[i].tags[0]}$1`,
                        RN : `${LabAgent[j].tags[0]}$1`,
                        config:{
                            conn_tag: connect_1,
                            firstQA_answer :100,
                            firstQA_question :100,
                            accept_answer : 1,
                            timeout : 30*1000,
                        },
                        expect : {err:0},    
                    }))
                }
                
                // 1.2 RN -> LN 连接10次
                // for(let x=0;x<10;x++){
                //     let connect_2 =  `${Date.now()}_${RandomGenerator.string(10)}`;
                //     info = await test_runner.prev_task_add_action(new BDTAction.ConnectAction({
                //         type : ActionType.connect,
                //         LN : `${LabAgent[j].tags[0]}$1`,
                //         RN : `${LabAgent[i].tags[0]}$1`,
                        
                //         config:{
                            
                //             conn_tag: connect_2,
                //             timeout : 30*1000,
                //             firstQA_answer :100,
                //             firstQA_question :100,
                //             accept_answer : 1,
                //         },
                //         expect : {err:0},      
                //     }))
                // }
                await test_runner.prev_task_run();
            }
        }
    }

    await test_runner.wait_finished()
    
    
}
