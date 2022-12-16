import { ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator } from '../../base';
import { TestRunner } from '../../taskTools/cyfs_bdt/testRunner';
import { Testcase, Task, ActionType, Resp_ep_type } from "../../taskTools/cyfs_bdt/type"
import { labAgent, BdtPeerClientConfig, LabSnList, AgentList_LAN_WAN } from "../../taskTools/cyfs_bdt/labAgent"
import * as BDTAction from "../../taskTools/cyfs_bdt/bdtAction"
import { AgentManager } from '../../taskTools/cyfs_bdt/agentManager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agentManager = AgentManager.createInstance(_interface);
    // 选指定连个节点进行测试
    let testAgent = [];
    const LN = "PC_0006";
    const RN = "PC_0018";
    for (let agent of labAgent) {
        if (agent.tags[0] == LN || agent.tags[0] == RN) {
            testAgent.push(agent)
        }
    }
    await agentManager.initAgentList(testAgent);
    //(2) 创建测试用例执行器 TestRunner
    let testRunner = new TestRunner(_interface);
    let testcaseName = "Perf_stream_connect_udp_keep_2000"
    let testcase: Testcase = {
        TestcaseName: testcaseName,
        testcaseId: `${testcaseName}_${Date.now()}`,
        remark: `## 测试环境
        + LN RN 只使用UDP连接 
        ## 操作步骤
        + (1) LN RN 之间串行建立2000个连接
        + (2) 维持连接2 min
        ## 性能监控
        + LN/RN 内存、CPU、网络带宽  `,
        environment: "lab",
    };
    await testRunner.initTestcase(testcase);

    //(3) 创建BDT测试客户端
    let config: BdtPeerClientConfig = {
        eps: {
            ipv4: {
                udp: true,
            },
            ipv6: {
                udp: true,
            }
        },
        logType: "info",
        SN: LabSnList,
        resp_ep_type: Resp_ep_type.effectiveEP_WAN,
    }
    // 每台机器运行一个bdt 客户端
    let agent_list = await AgentList_LAN_WAN(labAgent);
    await agentManager.allAgentStartBdtPeer(config)
    await agentManager.uploadSystemInfo(testcase.testcaseId, 2000);
    //(4) 测试用例执行器添加测试任务
    for (let i = 0; i < 10; i++) {
        let info = await testRunner.createPrevTask({
            LN: `${LN}$1`,
            RN: `${RN}$1`,
            timeout: 20 * 60 * 1000,
            action: []
        })
        for (let x = 0; x < 200; x++) {
            let connect_1 = `${Date.now()}_${RandomGenerator.string(10)}`;
            info = await testRunner.prevTaskAddAction(new BDTAction.ConnectAction({
                type: ActionType.connect,
                LN: `${LN}$1`,
                RN: `${RN}$1`,
                config: {
                    conn_tag: connect_1,
                    timeout: 20 * 1000,
                },
                expect: { err: 0 },
            }))
        }
        await testRunner.prevTaskAddAction(new BDTAction.SleepAction({
            type: ActionType.sleep,
            LN: `${LN}$1`,
            RN: `${RN}$1`,
            config: {
                timeout: 6 * 60 * 1000,
            },
            set_time: 2 * 60 * 1000,
            expect: { err: 0 },
        }))
        await testRunner.prevTaskRun();
    }
    await testRunner.waitFinished()

}
