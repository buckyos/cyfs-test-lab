import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator} from '../../base';
import {TestRunner} from '../../taskTools/cyfs_bdt/testRunner';
import {Testcase,Task,ActionType,Resp_ep_type} from "../../taskTools/cyfs_bdt/type"
import {labAgent,BdtPeerClientConfig,LabSnList} from "../../taskTools/cyfs_bdt/labAgent"
import  * as BDTAction from "../../taskTools/cyfs_bdt/bdtAction"
import {AgentManager} from '../../taskTools/cyfs_bdt/agentManager'

export async function TaskMain(_interface: TaskClientInterface) {
    //(1) 连接测试节点
    let agentManager = AgentManager.createInstance(_interface);
    await agentManager.initAgentList(labAgent);
    //(2) 创建测试用例执行器 TestRunner
    let testRunner = new TestRunner(_interface);
    let testcaseName = "NDN_AllEP_ChannelSelect"
    let testcase:Testcase = {
        TestcaseName: testcaseName,
        testcaseId: `${testcaseName}_${Date.now()}`,
        remark: `# 操作流程：\n
        + (1) LN、RN 初始化协议栈
        + (2) LN track上传一个10Mb文件，RN 进行Interest
        + (3) RN track上传一个10Mb文件，LN 进行Interest\n`,
        environment: "lab",
    };
    await testRunner.initTestcase(testcase);
    //(3) 创建BDT测试客户端
    let config : BdtPeerClientConfig = {
            eps:{
                ipv4:{
                    udp:true,
                    tcp:true,
                },
                ipv6:{
                    udp:true,
                    tcp:true,
                }
            },
            logType:"info",
            SN :LabSnList,
            resp_ep_type:Resp_ep_type.SN_Resp, 
    }
    // 每台机器运行一个bdt 客户端
    await agentManager.allAgentStartBdtPeer(config)
    //(4) 测试用例执行器添加测试任务
    
    for(let i in labAgent){
        for(let j in labAgent){
            if(i != j ){
                testRunner.createPrevTask({
                    LN :  `${labAgent[i].tags[0]}$1`,
                    RN : `${labAgent[i].tags[0]}$1`,
                    Users : [],
                    timeout : 60*1000,
                    action : []
            
                })
            }
        }
    }
    
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
            }
            
        }))
        task.action.push(new BDTAction.SendStreamAction({
            type : ActionType.send_stream,
            LN : "PC_0009$1",
            RN : "PC_0005$1",
            fileSize : 10*1024*1024,
            config:{
                conn_tag: "connect_1",
                timeout : 60*1000,
            }
            
        }))
        task.action.push(new BDTAction.SendFileAction({
            type : ActionType.send_file,
            LN : "PC_0009$1",
            RN : "PC_0005$1",
            fileSize : 10*1024*1024,
            config:{
                timeout : 60*1000,
            }
            
        }))
        testRunner.addTask(task)
    }
    await testRunner.waitFinished()
    
    
}
