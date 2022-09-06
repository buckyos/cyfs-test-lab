import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../base';
import {TestRunner} from '../../taskTools/cyfs_bdt/testRunner';
import {Testcase,Task,ActionType,Resp_ep_type} from "../../taskTools/cyfs_bdt/type"
import {labAgent,BdtPeerClientConfig,LabSnList} from "../../taskTools/cyfs_bdt/labAgent"
import  * as BDTAction from "../../taskTools/cyfs_bdt/bdtAction"
import {AgentManager} from '../../taskTools/cyfs_bdt/agentManager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agentManager = AgentManager.createInstance(_interface);
    await agentManager.initAgentList([labAgent[0],labAgent[4]]);
    //(2) 创建测试用例执行器
    let testRunner = new TestRunner(_interface);
    
    let testcaseName = "CYFS_BDT_debuger"
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
    }
    await testRunner.initTestcase(testcase);
    //(3) 创建BDT测试客户端
    let config : BdtPeerClientConfig = {
            eps:{
                ipv4:{
                    udp:true,
                }
            },
            logType:"info",
            SN :LabSnList,
            firstQA_answer:"",
            resp_ep_type:Resp_ep_type.SN_Resp, 
    }
    await agentManager.allAgentStartBdtPeer(config,1)
    //(4) 测试用例执行器添加测试任务
    // Task 
    
    for(let i = 0;i<1;i++){
        let task : Task= {
            LN : "PC_0009$1",
            RN : "PC_0005$1",
            Users : [],
            timeout : 60*1000,
            action : []
    
        }
        task.action.push(new BDTAction.ConnectAction({
            type : ActionType.connect,
            LN : "PC_0009$1",
            RN : "PC_0005$1",
            Users : [],
            config:{
                conn_tag: "connect_1",
                timeout : 60*1000,
            },
            expect : {err:0}
            
        }))
        task.action.push(new BDTAction.SendStreamAction({
            type : ActionType.send_stream,
            LN : "PC_0009$1",
            RN : "PC_0005$1",
            fileSize : 10*1024*1024,
            config:{
                conn_tag: "connect_1",
                timeout : 60*1000,
            },
            expect : {err:0}
            
        }))
        task.action.push(new BDTAction.SendFileAction({
            type : ActionType.send_file,
            LN : "PC_0009$1",
            RN : "PC_0005$1",
            fileSize : 100*1024*1024,
            chunkSize : 4*1024*1024,
            config:{
                timeout : 60*1000,
                not_wait_upload_finished : true
            },
            expect : {err:0}
            
        }))
        task.action.push(new BDTAction.SendChunkAction({
            type : ActionType.send_chunk,
            LN : "PC_0009$1",
            RN : "PC_0005$1",
            fileSize : 100*1024*1024,
            chunkSize : 40*1024*1024,
            config:{
                timeout : 60*1000,
                not_wait_upload_finished : true
            },
            expect : {err:0}
            
        }))
        testRunner.addTask(task)
    }
    await testRunner.waitFinished()
    
    
}
