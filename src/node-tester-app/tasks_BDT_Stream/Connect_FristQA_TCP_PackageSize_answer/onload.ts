import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../base';
import {labAgent,LabSnList,PNType,NAT_Type,AgentData,InitAgentData,} from '../../taskTools/rust-bdt/labAgent';
import {TestRunner,Testcase,Agent,Task,taskType,Resp_ep_type} from '../../taskTools/rust-bdt/bdtRunner';
import { BDTERROR } from '../../taskTools/rust-bdt/testCode';



export async function TaskMain(_interface: TaskClientInterface) {
    let testcaseName = "Connect_FristQA_TCP_PackageSize_answer"
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
    let firstQA_answer= RandomGenerator.string(25);
    agentList = agentList.concat(await InitAgentData(testAgent,{ipv4:{tcp:true}},"info",1,LabSnList,{},firstQA_answer,Resp_ep_type.all))
    for(let i in agentList){
        for(let j in agentList){
            if(i != j && Number(i)+Number(j) == testAgent.length ){
                // NAT穿透
                if(agentList[j].NAT==0  || agentList[i].router == agentList[j].router ){
                    let task : Task = {
                        LN:{name:`${testAgent[i].tags[0]}_0`,type : testAgent[i].type},
                        RN:{name:`${testAgent[j].tags[0]}_0`,type : testAgent[j].type},
                        expect_status : BDTERROR.success,
                        action:[
                        ]
                    }
                    for(let x=0;x<15;x++){
                        task.action.push({
                            LN:{name:`${testAgent[i].tags[0]}_0`,type : testAgent[i].type},
                            RN:{name:`${testAgent[j].tags[0]}_0`,type : testAgent[j].type},
                            type : taskType.connect_second,
                            config:{
                                conn_tag : `connnect_${x}` ,
                                firstQA_answer :RandomGenerator.string(100 + x*100),
                                firstQA_question :RandomGenerator.string(100),
                                accept_answer : 1,
                                timeout : 30*1000, 
                            },
                            fileSize : 0,
                            expect:{err:BDTERROR.success} 
                        })
                    }
                    taskList.push(task)
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
        + （2）LN 向 RN 循环发起连接，每次FristQA answer增加100字节\n 
        +  (3) 关闭所有连接\n`,
        environment : "lab",
        agentList,
        taskList,
        taskMult:1
    }
    
    await testRunner.testCaseRunner(testcase);
}
