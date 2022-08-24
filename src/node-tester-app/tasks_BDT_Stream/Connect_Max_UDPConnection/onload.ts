import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator,sleep} from '../../base';
import {labAgent,LabSnList,InitAgentData,PNType,SameRouter} from '../../taskTools/rust-bdt/labAgent';
import {TestRunner,Testcase,Task} from '../../taskTools/rust-bdt/bdtRunner';
import { BDTERROR,Agent,taskType,Resp_ep_type,AgentData} from '../../taskTools/rust-bdt/type';




export async function TaskMain(_interface: TaskClientInterface) {
    let testcaseName = "Connect_Max_UDPConnection"
    let agentList:Array<Agent> = [];
    let taskList : Array<Task> = [];
    let testAgent:Array<AgentData> =[
        labAgent.PC_0005,
        labAgent.PC_0006,
    ]
    let firstQA_answer= "";
    agentList = agentList.concat(await InitAgentData(testAgent,{ipv4:{udp:true}},"info",1,LabSnList,{},firstQA_answer,Resp_ep_type.Empty))
    
    for(let i =0;i<10;i++){
        let task : Task = {
            LN:{name:`${testAgent[1].tags[0]}_0`,type : testAgent[1].type},
            RN:{name:`${testAgent[0].tags[0]}_0`,type : testAgent[0].type},
            expect_status : BDTERROR.success,
            action:[
            ]
        }
        for(let j =0;j<50;j++){
            task.action.push({
                LN:{name:`${testAgent[1].tags[0]}_0`,type : testAgent[1].type},
                RN:{name:`${testAgent[0].tags[0]}_0`,type : testAgent[0].type},
                type : taskType.connect_second,
                config:{
                    conn_tag : `connnect_${i}_${j}` ,
                    accept_answer : 0,
                    timeout : 30*1000, 
                },
                fileSize : 0,
                expect:{err:BDTERROR.success} 
            })
        }
        taskList.push(task)
    }

    await sleep(2000);
    let testRunner = new TestRunner(_interface,true);
    let testcase:Testcase = {
        TestcaseName:testcaseName,
        testcaseId : `${testcaseName}_${Date.now()}`,
                remark : `# 操作流程：\n
        + （1）LN/RN 初始化本地BDT协议栈\n
        + （2）LN 向 RN 发起10000连接\n
        +  (3) 关闭所有连接\n`,
        environment : "lab",
        agentList,
        taskList,
        taskMult:100
    }
    
    await testRunner.testCaseRunner(testcase);
}
