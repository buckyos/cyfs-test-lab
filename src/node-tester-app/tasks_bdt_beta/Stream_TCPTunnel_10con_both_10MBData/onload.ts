import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator,sleep} from '../../base';
import {labAgent,LabSnList,InitAgentData,PNType,SameRouter,AgentList_LAN_WAN} from '../../taskTools/rust-bdt/labAgent';
import {TestRunner,Testcase,Task} from '../../taskTools/rust-bdt/bdtRunner';
import { BDTERROR,Agent,taskType,Resp_ep_type,AgentData} from '../../taskTools/rust-bdt/type';




export async function TaskMain(_interface: TaskClientInterface) {
    let testcaseName = "Stream_TCPTunnel_10con_both_10MBData"
    let agentList:Array<Agent> = [];
    let taskList : Array<Task> = [];
    let testAgent:Array<AgentData> =[
        labAgent.PC_0005,
        labAgent.PC_0006,
        labAgent.PC_0007,
        labAgent.PC_0008,
        labAgent.PC_0009,
        labAgent.PC_0010,
        labAgent.PC_0011,
        labAgent.PC_0012,
        labAgent.PC_0013,
        labAgent.PC_0014,
        labAgent.PC_0015,
        labAgent.PC_0016,
        labAgent.PC_0017,
        labAgent.PC_0018,
    ]
    let firstQA_answer= "";
    agentList = agentList.concat(await InitAgentData(testAgent,{ipv4:{tcp:true}},"info",1,[],{},firstQA_answer,Resp_ep_type.effectiveEP_WAN))
    // 随机选择两个设备
    let agenSplit = await AgentList_LAN_WAN(agentList);
    let LN = agenSplit.LAN[RandomGenerator.integer(agenSplit.LAN.length-1)]
    let RN = agenSplit.WAN[RandomGenerator.integer(agenSplit.WAN.length-1)]
    for(let i =0;i<10;i++){
        let task : Task = {
            LN:{name:`${LN.name}_0`,type : LN.NAT},
            RN:{name:`${RN.name}_0`,type : RN.NAT},
            expect_status : BDTERROR.success,
            action:[
                {
                    LN:{name:`${LN.name}_0`,type : LN.NAT},
                    RN:{name:`${RN.name}_0`,type : RN.NAT},
                    type : taskType.connect,
                    config : {
                        conn_tag : `connect_frist_${i}` ,
                        timeout : 30*1000, 
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
                    timeout : 30*1000, 
                },
                fileSize : 10*1024*1024,
                expect:{err:BDTERROR.success} 
            })
        }
        taskList.push(task);
    }
    for(let i =0;i<10;i++){
        let task : Task = {
            LN:{name:`${LN.name}_0`,type : LN.NAT},
            RN:{name:`${RN.name}_0`,type : RN.NAT},
            timeout : 5*60*1000,
            expect_status : BDTERROR.success,
            action:[
            ]
        }
        for(let j =0;j<10;j++){
            task.action.push({
                RN:{name:`${LN.name}_0`,type : LN.NAT},
                LN:{name:`${RN.name}_0`,type : RN.NAT},
                type : taskType.send_stream_reverse,
                config : {
                    conn_tag : `connect_frist_${i}` ,
                    timeout : 30*1000, 
                },
                fileSize : 10*1024*1024,
                expect:{err:BDTERROR.success} 
            })
        }
        taskList.push(task);
    }
    await sleep(2000);
    let testRunner = new TestRunner(_interface,true);
    let testcase:Testcase = {
        TestcaseName:testcaseName,
        testcaseId : `${testcaseName}_${Date.now()}`,
                remark : `前置条件：
                （1）LN/RN 网络可以基于TCP建立连接
            操作步骤：
                （1）LN 和 RN 建立10个BDT连接，每个连接LN/RN双向持续发送10*10MB 大小的字节流数据
            预期结果：
                (1) 数据发送成功，Stream数据发送未产生拥塞\n`,
        environment : "lab",
        agentList,
        taskList,
        taskMult:20
    }
    
    await testRunner.testCaseRunner(testcase);
}
