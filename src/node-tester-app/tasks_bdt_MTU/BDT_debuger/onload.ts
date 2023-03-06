import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../base';
import {TestRunner} from '../../testcase_runner/cyfs_bdt/test_runner';
import {Testcase,Task,ActionType,Resp_ep_type} from "../../testcase_runner/cyfs_bdt/type"
import {LabAgent,BdtPeerClientConfig,LabSnList,randShuffle, PNType} from "../../testcase_runner/cyfs_bdt/labAgent"
import  * as BDTAction from "../../testcase_runner/cyfs_bdt/bdtAction"
import {AgentManager} from '../../testcase_runner/cyfs_bdt/agent_manager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agent_manager = AgentManager.create_instance(_interface);
    await agent_manager.init_agent_list(LabAgent);
    //(2) 创建测试用例执行器 TestRunner
    let test_runner = new TestRunner(_interface);
    let testcase_name = "BDT_debuger"
    let testcase:Testcase = {
        testcase_name: testcase_name,
        testcase_id: `${testcase_name}_${Date.now()}`,
        remark: `# 调试测试特殊场景使用`,
        environment: "lab",
    };
    await test_runner.init_testcase(testcase);
    //(3) 创建BDT测试客户端
    let config : BdtPeerClientConfig = {
            eps:{
                ipv4:{
                    udp:true,
                    //tcp:true,
                },
                ipv6:{
                    udp:true,
                    //tcp:true,
                }
            },
            logType:"info",
            udp_sn_only : 0,
            SN :LabSnList,
            PN : PNType.none,
            resp_ep_type:Resp_ep_type.effectiveEP_WAN, 
    }
    
    // 每台机器运行一个bdt 客户端
    await agent_manager.all_agent_start_bdt_peer(config)
    //(4) 测试用例执行器添加测试任务
    
    for(let i in LabAgent){
        for(let j in LabAgent){
            if(i != j &&  LabAgent[i].tags[0] == "PC_0009" && LabAgent[j].tags[0] == "PC_0007" ){
                let info = await test_runner.create_prev_task({
                    LN : `${LabAgent[i].tags[0]}$1`,
                    RN : `${LabAgent[j].tags[0]}$1`,
                    timeout : 5*30*1000,
                    action : []
                })
                // 1.1 LN -> RN 连接10次
                for(let x=0;x<1;x++){
                    let connect_1 =  `${Date.now()}_${RandomGenerator.string(10)}`;
                    info = await test_runner.prev_task_add_action(new BDTAction.ConnectAction({
                        type : ActionType.connect,
                        LN : `${LabAgent[i].tags[0]}$1`,
                        RN : `${LabAgent[j].tags[0]}$1`,
                        config:{
                            conn_tag: connect_1,
                            firstQA_answer : 100 + x*100,
                            firstQA_question : 100,
                            accept_answer : 1,
                            timeout : 60*1000,
                        },
                        expect : {err:0},    
                    }))
                }
                
                await test_runner.prev_task_run();
            }
        }
    }

    await test_runner.wait_finished()
    
    
}
