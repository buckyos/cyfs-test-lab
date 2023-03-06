import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator,sleep} from '../../base';
import {LabAgent,LabSnList,InitAgentData,PNType,SameRouter,AgentList_LAN_WAN} from '../../testcase_runner/rust-bdt/labAgent';
import {TestRunner,Testcase,Task} from '../../testcase_runner/rust-bdt/bdtRunner';
import { BDTERROR,Agent,taskType,Resp_ep_type,AgentData} from '../../testcase_runner/rust-bdt/type';




export async function TaskMain(_interface: TaskClientInterface) {
    let testcase_name = "Stream_UDPTunnel_10con_single_10MBData"
    let agentList:Array<Agent> = [];
    let taskList : Array<Task> = [];
    let testAgent:Array<AgentData> =[
        LabAgent.PC_0005,
        LabAgent.PC_0006,
        LabAgent.PC_0007,
        LabAgent.PC_0008,
        LabAgent.PC_0009,
        LabAgent.PC_0010,
        LabAgent.PC_0011,
        LabAgent.PC_0012,
        LabAgent.PC_0013,
        LabAgent.PC_0014,
        LabAgent.PC_0015,
        LabAgent.PC_0016,
        LabAgent.PC_0017,
        LabAgent.PC_0018,
    ]
    let firstQA_answer= "";
    agentList = agentList.concat(await InitAgentData(testAgent,{ipv4:{udp:true}},"info",1,[],{},firstQA_answer,Resp_ep_type.effectiveEP_WAN))
    // 随机选择两个设备
    let agenSplit = await AgentList_LAN_WAN(agentList);
    let LN = agenSplit.LAN[RandomGenerator.integer(agenSplit.LAN.length-1)]
    let RN = agenSplit.WAN[RandomGenerator.integer(agenSplit.WAN.length-1)]
    for(let i =0;i<10;i++){
        let task : Task = {
            LN:{name:`${LN.name}_0`,type : LN.NAT},
            RN:{name:`${RN.name}_0`,type : RN.NAT},
            timeout : 15*60*1000,
            expect_status : BDTERROR.success,
            action:[
                {
                    LN:{name:`${LN.name}_0`,type : LN.NAT},
                    RN:{name:`${RN.name}_0`,type : RN.NAT},
                    type : taskType.connect,
                    config : {
                        conn_tag : `connect_frist_${i}` ,
                        timeout : 300*1000, 
                    },
                    fileSize : 0,
                    expect:{err:BDTERROR.success} 
                },
            ]
        }
        for(let j =0;j<10;j++){
            task.action.push({
                LN:{name:`${LN.name}_0`,type : LN.NAT},
                RN:{name:`${RN.name}_0`,type : RN.NAT},
                type : taskType.send_stream,
                config : {
                    conn_tag : `connect_frist_${i}` ,
                    timeout : 300*1000, 
                },
                fileSize : 10*1024*1024,
                expect:{err:BDTERROR.success} 
            })
        }
        taskList.push(task);
    }
    await sleep(2000);
    let test_runner = new TestRunner(_interface,true);
    let testcase:Testcase = {
        testcase_name:testcase_name,
        testcase_id : `${testcase_name}_${Date.now()}`,
                remark : `前置条件：
                （1）LN/RN 网络可以基于TCP建立连接
            操作步骤：
                （1）LN 和 RN 建立10个BDT连接，每个连接LN持续发送10*10MB 大小的字节流数据
            预期结果：
                (1) 数据发送成功，Stream数据发送未产生拥塞\n`,
        environment : "lab",
        agentList,
        taskList,
        taskMult:10
    }
    
    await test_runner.testCaseRunner(testcase);
}
