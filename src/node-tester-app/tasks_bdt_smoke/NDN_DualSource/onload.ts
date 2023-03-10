import {TaskClientInterface, RandomGenerator} from '../../base';
import {TestRunner} from '../../testcase_runner/cyfs_bdt_cli/test_runner';
import {Testcase,Resp_ep_type} from "../../testcase_runner/cyfs_bdt_cli/type"
import {LabAgent,BdtCliConfig,LabSnList,randShuffle,AgentList_LAN_WAN} from "../../testcase_runner/cyfs_bdt_cli/lab_agent"
import  * as BDTAction from "../../testcase_runner/cyfs_bdt_cli/bdtAction"
import {AgentManager} from '../../testcase_runner/cyfs_bdt_cli/agent_manager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agent_manager = AgentManager.create_instance(_interface);
    await agent_manager.init_agent_list(LabAgent);
    //(2) 创建测试用例执行器 TestRunner
    let test_runner = new TestRunner(_interface);
    let testcase_name = "NDN_DualSource"
    let testcase:Testcase = {
        testcase_name: testcase_name,
        testcase_id: `${testcase_name}_${Date.now()}`,
        remark: `# 操作流程：\n
        + （1）LN/RN/User0 初始化本地BDT协议栈
        + （2）RN 上传 10Mb 大小文件。
        + （3）User0 从RN进行下载
        + （4）LN 从 RN和User0 两个源进行下载 `,
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
            resp_ep_type:Resp_ep_type.SN_Resp, 
    }
    // 每台机器运行一个bdt 客户端
    await agent_manager.all_agent_start_bdt_peer(config)
    await agent_manager.upload_system_info(testcase.testcase_id,2000);
    //(4) 测试用例执行器添加测试任务
    let AgentList = await AgentList_LAN_WAN(LabAgent);
    for(let [i,j] of randShuffle(LabAgent.length)){
        if(i != j && LabAgent[i].NAT * LabAgent[j].NAT != 0 && LabAgent[i].NAT + LabAgent[j].NAT < 5 ){
            let info = await test_runner.create_prev_task({
                LN : `${LabAgent[i].tags[0]}$1`,
                RN : `${LabAgent[j].tags[0]}$1`,
                timeout : 5*60*1000,
                action : []
            })
            // 1.1 LN 连接 RN
            let connect_1 =  `${Date.now()}_${RandomGenerator.string(10)}`;
            info = await test_runner.prev_task_add_action(new BDTAction.ConnectAction({
                LN : `${LabAgent[i].tags[0]}$1`,
                RN : `${LabAgent[j].tags[0]}$1`,
                config:{
                    conn_tag: connect_1,
                    timeout : 160*1000,
                },
                expect : {err:0},    
            }))
            // 1.2 LN -> RN 发送数据
            // info = await test_runner.prev_task_add_action(new BDTAction.SendFileDualAction({
            //     type : ActionType.send_file,
            //     LN : `${LabAgent[i].tags[0]}$1`,
            //     RN : `${LabAgent[j].tags[0]}$1`,
            //     Users : [ `${AgentList.WAN[0].tags[0]}$1`],
            //     fileSize : 10*1024*1024,
            //     chunkSize : 4*1024*1024,
            //     config:{
            //         timeout : 160*1000,
            //     },
            //     expect : {err:0},      
            // }))
           
            
            await test_runner.prev_task_run();
        }
    }


    await test_runner.wait_finished()
    
    
}
