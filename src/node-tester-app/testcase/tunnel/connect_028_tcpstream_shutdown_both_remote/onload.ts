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
    let testAgent = [];
    const LN = "PC_0006";
    const RN = "PC_0018";
    for (let agent of LabAgent) {
        if (agent.tags[0] == LN || agent.tags[0] == RN) {
            testAgent.push(agent)
        }
    }
    await agent_manager.init_agent_list(testAgent);
    //(2) 创建测试用例执行器 TestRunner
    let test_runner = new TestRunner(_interface);
    let testcase_name = "connect_028_tcpstream_shutdown_both_remote"
    let testcase: Testcase = {
        testcase_name: testcase_name,
        testcase_id: `${testcase_name}_${Date.now()}`,
        remark: `测试连接关闭`,
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
    for (let i = 0; i < 1; i++) {
        let info = await test_runner.create_prev_task({
            LN: `${LN}$1$0`,
            RN: `${RN}$1$0`,
            timeout: 20 * 60 * 1000,
            action: []
        })
        for (let x = 0; x < 1; x++) {
            let connect_1 = `${Date.now()}_${RandomGenerator.string(10)}`;
            info = await test_runner.prev_task_add_action(new BDTAction.ConnectAction({
                type: ActionType.connect,
                LN: `${LN}$1$0`,
                RN: `${RN}$1$0`,
                config: {
                    conn_tag: connect_1,
                    timeout: 20 * 1000,
                },
                expect: { err: 0 },
            }))
            info = await test_runner.prev_task_add_action(new BDTAction.SendStreamCloseRemoteAction({
                LN: `${LN}$1$0`,
                RN: `${RN}$1$0`,
                config: {
                    conn_tag: connect_1,
                    timeout: 300 * 1000,
                    shutdown_type : "Both"
                },
                fileSize : 1000*1024*1024,
                expect: { err: 14 },
            }))
        }
        await test_runner.prev_task_add_action(new BDTAction.SleepAction({
            type: ActionType.sleep,
            LN: `${LN}$1`,
            RN: `${RN}$1`,
            config: {
                timeout: 6 * 60 * 1000,
            },
            set_time: 60 * 1000,
            expect: { err: 0 },
        }))
        await test_runner.prev_task_run();
    }
    await test_runner.wait_finished()

}
