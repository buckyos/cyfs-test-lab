import { ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator } from '../../base';
import { LabAgent, LabSnList, InitAgentData, PNType, SameRouter } from '../../testcase_runner/rust-bdt/labAgent';
import { TestRunner, Testcase, Task } from '../../testcase_runner/rust-bdt/bdtRunner';
import { BDTERROR, Agent, taskType, Resp_ep_type, AgentData } from '../../testcase_runner/rust-bdt/type';




export async function TaskMain(_interface: TaskClientInterface) {
    let testcase_name = "NDN_Event_Forward_NotChache_Connect"
    let agentList: Array<Agent> = [];
    let taskList: Array<Task> = [];
    let testAgent: Array<AgentData> = [
        LabAgent.PC_0005,
        LabAgent.PC_0007,
        LabAgent.PC_0018,

    ]
    let firstQA_answer = "";
    agentList = agentList.concat(await InitAgentData(testAgent, { ipv4: { udp: true, tcp: true }, ipv6: { udp: true, tcp: true } }, "info", 1, LabSnList, {}, firstQA_answer, Resp_ep_type.all))
    taskList.push(
        {
            LN: { name: `${testAgent[1].tags[0]}_0`, type: testAgent[1].type },
            RN: { name: `${testAgent[2].tags[0]}_0`, type: testAgent[2].type },
            expect_status: BDTERROR.success,
            action: [
                //一、首次建立连接
                //(1) PC_0007 PC_0011 建立连接
                // PC_0007 重启设置 interest ndn event 重定向为PC_0005  Redirect Forward
                {
                    LN: { name: `${testAgent[2].tags[0]}_0`, type: testAgent[2].type },
                    type: taskType.restart,
                    config: {
                        timeout: 60 * 1000,
                        restart: {
                            ndn_event: "Forward",
                            ndn_event_target: `${testAgent[0].tags[0]}_0`,
                        }
                    },
                    fileSize: 0,
                    expect: { err: BDTERROR.success }
                },
                {
                    LN: { name: `${testAgent[1].tags[0]}_0`, type: testAgent[1].type },
                    RN: { name: `${testAgent[2].tags[0]}_0`, type: testAgent[2].type },
                    Users: [{ name: `${testAgent[0].tags[0]}_0`, type: testAgent[0].type }],
                    type: taskType.send_file_redirect,
                    config: {
                        timeout: 30 * 1000,
                        ndn_event_config: {
                            is_connect: true,
                            is_cache_data: false,
                        }
                    },
                    fileSize: 10 * 1024 * 1024,
                    chunkSize: 4,
                    expect: { err: BDTERROR.success }
                },


            ]
        }
    )


    let test_runner = new TestRunner(_interface);
    let testcase: Testcase = {
        testcase_name: testcase_name,
        testcase_id: `${testcase_name}_${Date.now()}`,
        remark: ``,
        environment: "lab",
        agentList,
        taskList,
        taskMult: 10
    }

    await test_runner.testCaseRunner(testcase);
}
