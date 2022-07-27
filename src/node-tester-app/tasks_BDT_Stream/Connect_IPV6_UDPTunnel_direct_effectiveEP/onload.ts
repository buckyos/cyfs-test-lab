import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../base';
import {labAgent,LabSnList,PNType,NAT_Type,AgentData,InitAgentData,} from '../../taskTools/rust-bdt/labAgent';
import {TestRunner,Testcase,Agent,Task,taskType,Resp_ep_type} from '../../taskTools/rust-bdt/bdtRunner';
import { BDTERROR } from '../../taskTools/rust-bdt/testCode';



export async function TaskMain(_interface: TaskClientInterface) {
    let testcaseName = "Connect_IPV6_UDPTunnel_direct_effectiveEP"
    let agentList:Array<Agent> = [];
    let taskList : Array<Task> = [];
    let testAgent:Array<AgentData> =[
        labAgent.WIN7_0001,
        labAgent.WIN7_0002,
        labAgent.WIN7_0005,
        labAgent.WIN10_0025,
        labAgent.WIN7_0026,
        labAgent.WIN7_0027,
        labAgent.CentOS8_0030,
        labAgent.Ubuntu20_0018,
        labAgent.Ubuntu20_0019,
        labAgent.Ubuntu20_0020,
        labAgent.Ubuntu20_0021,
        labAgent.Ubuntu20_0022,
    ]
    let firstQA_answer= "";
    agentList = agentList.concat(await InitAgentData(testAgent,{ipv6:{udp:true}},"info",1,[],{},firstQA_answer,Resp_ep_type.effectiveEP_WAN))
    for(let i in agentList){
        for(let j in agentList){
            if(i != j){
                // RN 为外网，可以直连
                if(agentList[i].eps.length>0 && agentList[j].eps.length>0  ){
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
