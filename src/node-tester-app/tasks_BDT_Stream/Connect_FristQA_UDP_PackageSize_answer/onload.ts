import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator,sleep} from '../../base';
import {labAgent,LabSnList,InitAgentData,PNType,SameRouter} from '../../taskTools/rust-bdt/labAgent';
import {TestRunner,Testcase,Task} from '../../taskTools/rust-bdt/bdtRunner';
import { BDTERROR,Agent,taskType,Resp_ep_type,AgentData} from '../../taskTools/rust-bdt/type';




export async function TaskMain(_interface: TaskClientInterface) {
    let testcaseName = "Connect_FristQA_UDP_PackageSize_answer"
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
    let firstQA_answer= RandomGenerator.string(25);
    agentList = agentList.concat(await InitAgentData(testAgent,{ipv4:{udp:true}},"info",1,LabSnList,{},firstQA_answer,Resp_ep_type.all))
    for(let i in agentList){
        for(let j in agentList){
            if(i != j){
                // NAT穿透
                if( agentList[j].NAT == 0  || SameRouter(agentList[i].router!,agentList[j].router!) ){
                    let task : Task = {
                        LN:{name:`${testAgent[i].tags[0]}_0`,type : testAgent[i].type},
                        RN:{name:`${testAgent[j].tags[0]}_0`,type : testAgent[j].type},
                        expect_status : BDTERROR.success,
                        action:[
                        ]
                    }
                    for(let x=0;x<14;x++){
                        task.action.push({
                            LN:{name:`${testAgent[i].tags[0]}_0`,type : testAgent[i].type},
                            RN:{name:`${testAgent[j].tags[0]}_0`,type : testAgent[j].type},
                            type : taskType.connect_second,
                            config:{
                                conn_tag : `connnect_${x}` ,
                                firstQA_answer :RandomGenerator.string(100 + x*100),
                                firstQA_question : RandomGenerator.string(100),
                                accept_answer : 1,
                                timeout : 30*1000, 
                            },
                            fileSize : 0,
                            expect:{err:BDTERROR.success} 
                        })
                    }
                    // 发送数据超过1100字符出现报错
                    task.action.push({
                        LN:{name:`${testAgent[i].tags[0]}_0`,type : testAgent[i].type},
                        RN:{name:`${testAgent[j].tags[0]}_0`,type : testAgent[j].type},
                        type : taskType.connect_second,
                        config:{
                            conn_tag : `connnect_14` ,
                            firstQA_answer :RandomGenerator.string(100 + 14*100),
                            firstQA_question : RandomGenerator.string(100),
                            accept_answer : 1,
                            timeout : 30*1000, 
                        },
                        fileSize : 0,
                        expect:{err:BDTERROR.connnetFailed} 
                    })
                    taskList.push(task) 
                }
            }
        }
    }
    

    await sleep(2000);
    let testRunner = new TestRunner(_interface);
    let testcase:Testcase = {
        TestcaseName:testcaseName,
        testcaseId : `${testcaseName}_${Date.now()}`,
        remark : `# 操作流程：\n
        + （1）LN/RN 初始化本地BDT协议栈\n
        + （2）LN 向 RN 循环发起连接，每次FristQA answer 增加100字节 \n
        +  (3) 关闭所有连接\n`,
        environment : "lab",
        agentList,
        taskList,
        taskMult:10
    }
    
    await testRunner.testCaseRunner(testcase);
}
