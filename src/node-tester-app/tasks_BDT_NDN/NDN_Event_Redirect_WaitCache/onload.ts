import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../base';
import {labAgent,LabSnList,InitAgentData,PNType,SameRouter} from '../../taskTools/rust-bdt/labAgent';
import {TestRunner,Testcase,Task} from '../../taskTools/rust-bdt/bdtRunner';
import { BDTERROR,Agent,taskType,Resp_ep_type,AgentData} from '../../taskTools/rust-bdt/type';




export async function TaskMain(_interface: TaskClientInterface) {
    let testcaseName = "NDN_Event_Redirect_WaitCache"
    let agentList:Array<Agent> = [];
    let taskList : Array<Task> = [];
    let testAgent:Array<AgentData> =[
        labAgent.PC_0005,
        labAgent.PC_0007,
        labAgent.PC_0018,

    ]
    let firstQA_answer= "";
    agentList = agentList.concat(await InitAgentData(testAgent,{ipv4:{udp:true,tcp:true},ipv6:{udp:true,tcp:true}},"info",1,LabSnList,{},firstQA_answer,Resp_ep_type.all))
    taskList.push(
        {
            LN:{name:`${testAgent[1].tags[0]}_0`,type : testAgent[1].type},
            RN:{name:`${testAgent[2].tags[0]}_0`,type : testAgent[2].type},
            expect_status : BDTERROR.success,
            action:[
                //一、首次建立连接
                //(1) PC_0007 PC_0011 建立连接
                // PC_0007 重启设置 interest ndn event 重定向为PC_0005  Redirect Forward
                {
                    LN:{name:`${testAgent[2].tags[0]}_0`,type : testAgent[2].type},
                    type : taskType.restart,
                    config : {
                        timeout : 60*1000, 
                        restart : {
                            ndn_event : "Redirect",
                            ndn_event_target : `${testAgent[0].tags[0]}_0`,
                        }
                    },
                    fileSize : 0,
                    expect:{err:BDTERROR.success} 
                },
                {
                    LN:{name:`${testAgent[1].tags[0]}_0`,type : testAgent[1].type},
                    RN:{name:`${testAgent[0].tags[0]}_0`,type : testAgent[2].type},
                    type : taskType.connect,
                    config : {
                        conn_tag : "connect_frist_1" ,
                        timeout : 30*1000, 
                    },
                    fileSize : 0,
                    expect:{err:BDTERROR.success} 
                },
                {
                    LN:{name:`${testAgent[2].tags[0]}_0`,type : testAgent[1].type},
                    RN:{name:`${testAgent[1].tags[0]}_0`,type : testAgent[2].type},
                    type : taskType.connect,
                    config : {
                        conn_tag : "connect_frist_2" ,
                        timeout : 30*1000, 
                    },
                    fileSize : 0,
                    expect:{err:BDTERROR.success} 
                },
                {
                    LN:{name:`${testAgent[1].tags[0]}_0`,type : testAgent[1].type},
                    RN:{name:`${testAgent[2].tags[0]}_0`,type : testAgent[2].type},
                    Users:[{name:`${testAgent[0].tags[0]}_0`,type : testAgent[0].type}],
                    type : taskType.send_file_redirect,
                    config : {
                        timeout : 30*1000, 
                        ndn_event_config :{
                            is_connect : false,
                            is_cache_data : false,
                        }
                    },
                    fileSize : 10*1024*1024,
                    chunkSize : 4,
                    expect:{err:BDTERROR.success} 
                },
                
                
            ]
        }
    )
    

    let testRunner = new TestRunner(_interface);
    let testcase:Testcase = {
        TestcaseName:testcaseName,
        testcaseId : `${testcaseName}_${Date.now()}`,
        remark : ``,
        environment : "lab",
        agentList,
        taskList,
        taskMult:10
    }
    
    await testRunner.testCaseRunner(testcase);
}
