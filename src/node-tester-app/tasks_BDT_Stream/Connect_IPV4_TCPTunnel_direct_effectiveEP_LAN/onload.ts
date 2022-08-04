import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../base';
import {labAgent,LabSnList,InitAgentData,PNType} from '../../taskTools/rust-bdt/labAgent';
import {TestRunner,Testcase,Task} from '../../taskTools/rust-bdt/bdtRunner';
import { BDTERROR,Agent,taskType,Resp_ep_type,AgentData} from '../../taskTools/rust-bdt/type';




export async function TaskMain(_interface: TaskClientInterface) {
    let testcaseName = "Connect_IPV4_TCPTunnel_direct_effectiveEP_LAN"
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
    agentList = agentList.concat(await InitAgentData(testAgent,{ipv4:{tcp:true}},"info",1,[],{},firstQA_answer,Resp_ep_type.effectiveEP_LAN))
    for(let i in agentList){
        for(let j in agentList){
            if(i != j){
                // 同内网直连
                if(agentList[i].router == agentList[j].router  ){
                    taskList.push(
                        {
                            LN:{name:`${testAgent[i].tags[0]}_0`,type : testAgent[i].type},
                            RN:{name:`${testAgent[j].tags[0]}_0`,type : testAgent[j].type},
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
                                        timeout : 30*1000, 
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
                                        timeout : 30*1000, 
                                    },
                                    fileSize : 1*1024*1024,
                                    expect:{err:BDTERROR.success} 
                                },
                                // (3)反向发送1M数据
                                {
                                    LN:{name:`${testAgent[j].tags[0]}_0`,type : testAgent[j].type},
                                    RN:{name:`${testAgent[i].tags[0]}_0`,type : testAgent[i].type},
                                    type : taskType.send_stream_reverse,
                                    config : {
                                        conn_tag : "connect_frist" ,
                                        timeout : 30*1000, 
                                    }, 
                                    fileSize : 1*1024*1024,
                                    expect:{err:BDTERROR.success} 
                                },
                                //二、二次建立连接
                                //(1) 建立连接
                                {
                                    LN:{name:`${testAgent[i].tags[0]}_0`,type : testAgent[i].type},
                                    RN:{name:`${testAgent[j].tags[0]}_0`,type : testAgent[j].type},
                                    type : taskType.connect_second,
                                    config : {
                                        conn_tag : "connect_second" ,
                                        timeout : 30*1000, 
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
                                        conn_tag : "connect_second" ,
                                        timeout : 30*1000, 
                                    },
                                    fileSize : 1*1024*1024,
                                    expect:{err:BDTERROR.success} 
                                },
                                //(3) 反向发送1M 数据
                                {
                                    LN:{name:`${testAgent[j].tags[0]}_0`,type : testAgent[j].type},
                                    RN:{name:`${testAgent[i].tags[0]}_0`,type : testAgent[i].type},
                                    type : taskType.send_stream_reverse,
                                    config : {
                                        conn_tag : "connect_second" ,
                                        timeout : 30*1000, 
                                    },
                                    fileSize : 1*1024*1024,
                                    expect:{err:BDTERROR.success} 
                                },
                                //二、二次建立连接-反连
                                //(1) 建立连接
                                {
                                    LN:{name:`${testAgent[i].tags[0]}_0`,type : testAgent[i].type},
                                    RN:{name:`${testAgent[j].tags[0]}_0`,type : testAgent[j].type},
                                    type : taskType.connect_reverse,
                                    config : {
                                        conn_tag : "connect_reverse" ,
                                        timeout : 30*1000, 
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
                                        conn_tag : "connect_reverse" ,
                                        timeout : 30*1000, 
                                    },
                                    fileSize : 1*1024*1024,
                                    expect:{err:BDTERROR.success} 
                                },
                                //(3) 反向发送1M 数据
                                {
                                    LN:{name:`${testAgent[j].tags[0]}_0`,type : testAgent[j].type},
                                    RN:{name:`${testAgent[i].tags[0]}_0`,type : testAgent[i].type},
                                    type : taskType.send_stream_reverse,
                                    config : {
                                        conn_tag : "connect_reverse" ,
                                        timeout : 30*1000, 
                                    },
                                    fileSize : 1*1024*1024,
                                    expect:{err:BDTERROR.success} 
                                },
                            ]
                        }
                    )
                }else{

                }
            }
        }
    }
    

    let testRunner = new TestRunner(_interface);
    let testcase:Testcase = {
        TestcaseName:testcaseName,
        testcaseId : `${testcaseName}_${Date.now()}`,
        remark : `# 操作流程：\n
        + （1）LN/RN 初始化本地BDT协议栈\n
        + （2）LN 向 RN 发起首次连接，LN->RN 发送1M大小stream 数据，RN->LN发送1M大小stream 数据\n
        + （3）LN 向 RN 发起二次连接，LN->RN 发送1M大小stream 数据，RN->LN发送1M大小stream 数据\n
        + （4）RN 向 LN 发起反向连接，LN->RN 发送1M大小stream 数据，RN->LN发送1M大小stream 数据\n
        +  (5) 关闭所有连接\n`,
        environment : "lab",
        agentList,
        taskList,
        taskMult:10
    }
    
    await testRunner.testCaseRunner(testcase);
}
