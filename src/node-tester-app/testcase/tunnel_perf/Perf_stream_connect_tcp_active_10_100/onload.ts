import { ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator } from '../../../base';
import { TestRunner } from '../../../testcase_runner/cyfs_bdt_cli/test_runner';
import { Testcase, Task, ActionType, Resp_ep_type } from "../../../testcase_runner/cyfs_bdt_cli/type"
import { LabAgent, BdtCliConfig, LabSnList, AgentList_LAN_WAN } from "../../../testcase_runner/cyfs_bdt_cli/lab_agent"
import * as BDTAction from "../../../testcase_runner/cyfs_bdt_cli/bdtAction"
import { AgentManager } from '../../../testcase_runner/cyfs_bdt_cli/agent_manager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agent_manager = AgentManager.create_instance(_interface);
    // 选指定连个节点进行测试
    await agent_manager.init_agent_list(LabAgent);
    //(2) 创建测试用例执行器 TestRunner
    let test_runner = new TestRunner(_interface);
    let testcase_name = "Perf_stream_connect_tcp_active_10_100"
    let testcase: Testcase = {
        testcase_name: testcase_name,
        testcase_id: `${testcase_name}_${Date.now()}`,
        remark: `
        ## 测试环境
        + LN RN 只使用TCP连接 
        ## 操作步骤
        + (1) 10个LN和RN 之间并行行建立10*100个连接
        + (2) 维持连接5 min
        ## 性能监控
        + LN/RN 内存、CPU、网络带宽 
        + RT : connect_time 、 confirm_time
        + 并发数：10
        + QPS : 每秒confirm 连接请求次数
        `,
        environment: "lab",
    };
    await test_runner.init_testcase(testcase);

    //(3) 创建BDT测试客户端
    let config: BdtCliConfig = {
        eps: {
            ipv4: {
                udp: true,
                tcp: true,
            },
            ipv6: {
                udp: true,
                tcp: true,
            }
        },
        logType: "info",
        udp_sn_only: true,
        SN: LabSnList,
        resp_ep_type: Resp_ep_type.effectiveEP_WAN,
    }
    // 每台机器运行一个bdt 客户端
    let agent_list = await AgentList_LAN_WAN(LabAgent);
    await agent_manager.all_agent_start_bdt_peer(config)
    await agent_manager.upload_system_info(testcase.testcase_id, 2000);
    //(4) 测试用例执行器添加测试任务
    
    await test_runner.wait_finished()

}
