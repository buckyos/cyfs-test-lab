import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../base';
import {TestRunner} from '../../testcase_runner/cyfs_bdt_cli/test_runner';
import {Testcase,Task,ActionType,Resp_ep_type} from "../../testcase_runner/cyfs_bdt_cli/type"
import {LabAgent,BdtCliConfig,LabSnList} from "../../testcase_runner/cyfs_bdt_cli/lab_agent"
import  * as BDTAction from "../../testcase_runner/cyfs_bdt_cli/bdtAction"
import {AgentManager} from '../../testcase_runner/cyfs_bdt_cli/agent_manager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agent_manager = AgentManager.create_instance(_interface);
    await agent_manager.init_agent_list(LabAgent);
    //(2) 创建测试用例执行器 TestRunner
    let test_runner = new TestRunner(_interface);
    let testcase_name = "Connect_Endpoint_Port_UDP_direct"
    let testcase:Testcase = {
        testcase_name: testcase_name,
        testcase_id: `${testcase_name}_${Date.now()}`,
        remark: `前置条件：
        （1）LN/RN 同时使用UDP 协议EP
    操作步骤：
        (1) LN向RN发起10次连接
        (2) RN向LN发起10次连接
        (3) 检查连接的EP端口分配
    测试节点数据限制：
        (1) 节点使用UDP直连
    预期结果：
        (1) 全部连接成功
        (2) 每个连接LN和RN的EP符合预期 `,
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
            SN :[],
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
                            timeout : 30*1000,
                        },
                        expect : {err:0},    
                    }))
                }
                
                // 1.2 RN -> LN 连接10次
                for(let x=0;x<10;x++){
                    let connect_2 =  `${Date.now()}_${RandomGenerator.string(10)}`;
                    info = await test_runner.prev_task_add_action(new BDTAction.ConnectAction({
                        type : ActionType.connect,
                        LN : `${LabAgent[j].tags[0]}$1`,
                        RN : `${LabAgent[i].tags[0]}$1`,
                        fileSize : 10*1024*1024,
                        config:{
                            conn_tag: connect_2,
                            timeout : 30*1000,
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
