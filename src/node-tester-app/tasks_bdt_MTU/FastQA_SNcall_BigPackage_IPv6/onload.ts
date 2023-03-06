import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../base';
import {TestRunner} from '../../testcase_runner/cyfs_bdt/test_runner';
import {Testcase,Task,ActionType,Resp_ep_type} from "../../testcase_runner/cyfs_bdt/type"
import {LabAgent,BdtPeerClientConfig,LabSnList,IPv6Agent,randShuffle} from "../../testcase_runner/cyfs_bdt/labAgent"
import  * as BDTAction from "../../testcase_runner/cyfs_bdt/bdtAction"
import {AgentManager} from '../../testcase_runner/cyfs_bdt/agent_manager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agent_manager = AgentManager.create_instance(_interface);
    let agent_ipv6 = await IPv6Agent() ;
    await agent_manager.init_agent_list(agent_ipv6);
    //(2) 创建测试用例执行器 TestRunner
    let test_runner = new TestRunner(_interface);
    let testcase_name = "FastQA_SNcall_BigPackage_IPv6"
    let testcase:Testcase = {
        testcase_name: testcase_name,
        testcase_id: `${testcase_name}_${Date.now()}`,
        remark: `操作步骤：
        (1)Device直接建立连接，在Syn和Ack过程中完成首次数据发送，FastQA机制
        //(2) (3)过程随机执行一个
        (2)使用UDP协议，设置Quetion 25KB 发送成功
        (3)使用UDP协议，设置Quetion 25KB + 1Byte,超出最大限制出现报错
        `,
        environment: "lab",
    };
    await test_runner.init_testcase(testcase);
    //(3) 创建BDT测试客户端
    let config : BdtPeerClientConfig = {
            eps:{
                ipv6:{
                    udp:true,
                    tcp:true,
                }
            },
            logType:"info",
            udp_sn_only : 0,
            SN :LabSnList,
            resp_ep_type:Resp_ep_type.All, 
    }
    // 每台机器运行一个bdt 客户端
    await agent_manager.all_agent_start_bdt_peer(config)
    await agent_manager.uploadSystemInfo(testcase.testcase_id,2000);
    //(4) 测试用例执行器添加测试任务
    
    for(let [i,j] of randShuffle(agent_ipv6.length)){
        if(i != j ){
            let info = await test_runner.create_prev_task({
                LN : `${agent_ipv6[i].tags[0]}$1`,
                RN : `${agent_ipv6[j].tags[0]}$1`,
                timeout : 5*30*1000,
                action : []
            })
            if(( Number(1) + Number(j))%2==0){
                let connect_1 =  `${Date.now()}_${RandomGenerator.string(10)}`;
                info = await test_runner.prev_task_add_action(new BDTAction.ConnectAction({
                    type : ActionType.connect,
                    LN : `${agent_ipv6[i].tags[0]}$1`,
                    RN : `${agent_ipv6[j].tags[0]}$1`,
                    config:{
                        conn_tag: connect_1,
                        firstQA_answer : 25*1024,
                        firstQA_question : 25*1024,
                        accept_answer : 1,
                        timeout : 60*1000,
                    },
                    expect : {err:0},    
                }))
            }else{
                let connect_1 =  `${Date.now()}_${RandomGenerator.string(10)}`;
                info = await test_runner.prev_task_add_action(new BDTAction.ConnectAction({
                    type : ActionType.connect,
                    LN : `${agent_ipv6[i].tags[0]}$1`,
                    RN : `${agent_ipv6[j].tags[0]}$1`,
                    config:{
                        conn_tag: connect_1,
                        firstQA_answer : 25*1024,
                        firstQA_question : 25*1024+1,
                        accept_answer : 1,
                        timeout : 60*1000,
                    },
                    expect : {err:1},    
                }))
            }
            
            await test_runner.prev_task_run();
        }
    }

    await test_runner.wait_finished()
    
    
}
