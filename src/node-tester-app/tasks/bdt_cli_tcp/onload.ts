import { ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator } from '../../base';
import { TestRunner } from '../../taskTools/cyfs_bdt_cli/test_runner';
import { Testcase, Task, ActionType, Resp_ep_type } from "../../taskTools/cyfs_bdt_cli/type"
import { labAgent, BdtCliConfig, LabSnList, AgentList_LAN_WAN } from "../../taskTools/cyfs_bdt_cli/lab_agent"
import * as BDTAction from "../../taskTools/cyfs_bdt_cli/bdtAction"
import { AgentManager } from '../../taskTools/cyfs_bdt_cli/agent_manager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agentManager = AgentManager.createInstance(_interface);
    // 选指定连个节点进行测试
    let testAgent = [];
    const LN = "PC_0006";
    // /let address = "0.0.0.0";
    const RN = "PC_0018";
    for (let agent of labAgent) {
        if (agent.tags[0] == LN || agent.tags[0] == RN) {
            testAgent.push(agent)
        }
    }
    await agentManager.initAgentList(testAgent);
    //(2) 创建测试用例执行器 TestRunner
    let testRunner = new TestRunner(_interface);
    let testcaseName = "perf_stream_connect_tcp_keep_100"
    let testcase: Testcase = {
        TestcaseName: testcaseName,
        testcaseId: `${testcaseName}_${Date.now()}`,
        remark: `## 测试环境
        + LN RN 只使用TCP连接 
        ## 操作步骤
        + (1) LN RN 之间串行建立100个连接
        + (2) 维持连接2 min
        ## 性能监控
        + LN/RN 内存、CPU、网络带宽  `,
        environment: "lab",
    };
    await testRunner.initTestcase(testcase);

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
    let agent_list = await AgentList_LAN_WAN(labAgent);
    await agentManager.allAgentStartBdtPeer(config)
    await agentManager.uploadSystemInfo(testcase.testcaseId, 20000);
    //(4) 测试用例执行器添加测试任务
    for (let i = 0; i < 1; i++) {
        let info = await testRunner.createPrevTask({
            LN: `${LN}$1$0`,
            RN: `${RN}$1$0`,
            timeout: 20 * 60 * 1000,
            action: []
        })
        let connect_1 = `${Date.now()}_${RandomGenerator.string(10)}`;
        info = await testRunner.prevTaskAddAction(new BDTAction.TcpCreateServerAction({
            LN: `${LN}$1$0`,
            config: {
                timeout: 20 * 1000,
                port : 22223,
                address : "10.1.1.236"
            },
            expect: { err: 0 },
        }))
        info = await testRunner.prevTaskAddAction(new BDTAction.TcpCreateServerAction({
            LN: `${RN}$1$0`,
            config: {
                timeout: 20 * 1000,
                port : 22223,
                address : "192.168.200.151"
            },
            expect: { err: 0 },
        }))
        info = await testRunner.prevTaskAddAction(new BDTAction.TcpConnectAction({
            LN: `${LN}$1$0`,
            RN: `${RN}$1$0`,
            config: {
                timeout: 20 * 1000,
                conn_tag :connect_1
            },
            expect: { err: 0 },
        }))
        info = await testRunner.prevTaskAddAction(new BDTAction.TcpSendStreamAction({
            LN: `${LN}$1$0`,
            RN: `${RN}$1$0`,
            config: {
                timeout: 20 * 1000,
                conn_tag :connect_1
            },
            fileSize : 10*1024*1024,
            expect: { err: 0 },
        }))
        await testRunner.prevTaskRun();
    }
    await testRunner.waitFinished()

}
