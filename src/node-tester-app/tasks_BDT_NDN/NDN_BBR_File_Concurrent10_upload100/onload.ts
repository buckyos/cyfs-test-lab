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
    let testcase_name = "NDN_BBR_File_Concurrent10_upload100"
    let testcase:Testcase = {
        testcase_name: testcase_name,
        testcase_id: `${testcase_name}_${Date.now()}`,
        remark: `# 操作流程：\n
        + (1) LN、RN 初始化协议栈
        + (2) LN track上传一个10Mb文件，RN 进行Interest
        + (3) RN track上传一个10Mb文件，LN 进行Interest\n`,
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
    let agentInfo = await AgentList_LAN_WAN(LabAgent)

    for(let i in agentInfo.LAN){
        let info = await test_runner.create_prev_task({
            RN : `${agentInfo.WAN[0].tags[0]}$1`,
            LN : `${agentInfo.LAN[i].tags[0]}$1`,
            timeout : 60*1000,
            action : []
        })
        for(let j=0;j<10;j++){
            await test_runner.prev_task_add_action(new BDTAction.SendFileAction({
                type : ActionType.send_file,
                RN : `${agentInfo.WAN[0].tags[0]}$1`,
                LN : `${agentInfo.LAN[i].tags[0]}$1`,
                fileSize : 10*1024*1024,
                chunkSize : 4*1024*1024,
               config:{
                    timeout : 60*1000,
                },
                expect : {err:0},      
            }))
        }
        await test_runner.prev_task_run()
    }
    

    await test_runner.wait_finished()
    
    
}
