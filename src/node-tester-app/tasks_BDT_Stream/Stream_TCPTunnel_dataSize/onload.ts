import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator,sleep} from '../../base';
import {labAgent,LabSnList,InitAgentData,PNType,SameRouter} from '../../taskTools/rust-bdt/labAgent';
import {TestRunner,Testcase,Task} from '../../taskTools/rust-bdt/bdtRunner';
import { BDTERROR,Agent,taskType,Resp_ep_type,AgentData} from '../../taskTools/rust-bdt/type';




export async function TaskMain(_interface: TaskClientInterface) {
    let testcaseName = "Stream_TCPTunnel_dataMaxSize"
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
    for(let i in agentList){
        for(let j in agentList){
            if(i != j){
                // RN 为外网，可以直连
                if(agentList[j].NAT == 0 ){
                    taskList.push(
                        {
                            LN:{name:`${testAgent[i].tags[0]}_0`,type : testAgent[i].type},
                            RN:{name:`${testAgent[j].tags[0]}_0`,type : testAgent[j].type},
                            timeout : 5*60*1000,
                            expect_status : BDTERROR.success,
                            action:[
                                //一、首次建立连接
                                //(1) 建立连接
                                {
                                    LN:{name:`${testAgent[i].tags[0]}_0`,type : testAgent[i].type},
                                    RN:{name:`${testAgent[j].tags[0]}_0`,type : testAgent[j].type},
                                    type : taskType.connect,
                                    config : {
                                        conn_tag : "connect_frist" ,
                                        timeout : 5*60*1000,
                                    },
                                    fileSize : 0,
                                    expect:{err:BDTERROR.success} 
                                },
                                //(2) 正向发送1M 数据
                                {
                                    LN:{name:`${testAgent[i].tags[0]}_0`,type : testAgent[i].type},
                                    RN:{name:`${testAgent[j].tags[0]}_0`,type : testAgent[j].type},
                                    type : taskType.send_stream,
                                    config : {
                                        conn_tag : "connect_frist" ,
                                        timeout : 5*60*1000,
                                    },
                                    fileSize : 1,
                                    expect:{err:BDTERROR.success} 
                                },
                                {
                                    LN:{name:`${testAgent[i].tags[0]}_0`,type : testAgent[i].type},
                                    RN:{name:`${testAgent[j].tags[0]}_0`,type : testAgent[j].type},
                                    type : taskType.send_stream,
                                    config : {
                                        conn_tag : "connect_frist" ,
                                        timeout : 5*60*1000,
                                    },
                                    fileSize : 1500,
                                    expect:{err:BDTERROR.success} 
                                },
                                {
                                    LN:{name:`${testAgent[i].tags[0]}_0`,type : testAgent[i].type},
                                    RN:{name:`${testAgent[j].tags[0]}_0`,type : testAgent[j].type},
                                    type : taskType.send_stream,
                                    config : {
                                        conn_tag : "connect_frist" ,
                                        timeout : 5*60*1000,
                                    },
                                    fileSize : 1*1024*1024,
                                    expect:{err:BDTERROR.success} 
                                },
                                {
                                    LN:{name:`${testAgent[i].tags[0]}_0`,type : testAgent[i].type},
                                    RN:{name:`${testAgent[j].tags[0]}_0`,type : testAgent[j].type},
                                    type : taskType.send_stream,
                                    config : {
                                        conn_tag : "connect_frist" ,
                                        timeout : 300*1000, 
                                    },
                                    fileSize : 100*1024*1024,
                                    expect:{err:BDTERROR.success} 
                                },
                                {
                                    LN:{name:`${testAgent[i].tags[0]}_0`,type : testAgent[i].type},
                                    RN:{name:`${testAgent[j].tags[0]}_0`,type : testAgent[j].type},
                                    type : taskType.send_stream,
                                    config : {
                                        conn_tag : "connect_frist" ,
                                        timeout : 500*1000, 
                                    },
                                    fileSize : 1000*1024*1024,
                                    expect:{err:BDTERROR.success} 
                                },
                            ]
                        }
                    )
                }
            }
        }
    }
    

    await sleep(2000);
    let testRunner = new TestRunner(_interface);
    let testcase:Testcase = {
        TestcaseName:testcaseName,
        testcaseId : `${testcaseName}_${Date.now()}`,
                remark : `# 操作步骤：
                （1）LN 和 RN 建立BDT连接。
                （2）LN 和 RN 之间传输1 bytes 数据。
                （3）LN 和 RN 之间传输1500 bytes 数据。
                （4）LN 和 RN 之间传输1 MB 数据。
                （5）LN 和 RN 之间传输100 MB 数据。
                （6）LN 和 RN 之间传输1000 MB 数据。\n`,
        environment : "lab",
        agentList,
        taskList,
        taskMult:1
    }
    
    await testRunner.testCaseRunner(testcase);
}
