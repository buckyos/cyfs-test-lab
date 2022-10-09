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
    let testcaseName = "NDN_DirTask_FileNum_10"
    let testcase:Testcase = {
        TestcaseName: testcaseName,
        testcaseId: `${testcaseName}_${Date.now()}`,
        remark: `前置条件：
        (1)LN/RN 同时使用IPv4/IPv6、TCP/UDP 协议EP
    操作步骤：
        (1) RN track_file_in_path  10个10Mb大小文件，生成Dir对象。File对象，保存到本地。
        (2) RN 连接 LN , RN使用Stream发送所有Dir、File 对象到LN，LN收到后保存到本地。
        (3) LN创建DirTaskPathControl, LN 根据Dir 对象中File 和 inner_path 的对应关系调度完成完成文件下载
    测试节点数据限制：
        (1) 所有机器组合
    预期结果：
        (1) 符合P2P NAT穿透,传输成功`,
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
            if(i != j && labAgent[i].NAT * labAgent[j].NAT < 6){
                let info = await testRunner.createPrevTask({
                    LN : `${labAgent[i].tags[0]}$1`,
                    RN : `${labAgent[j].tags[0]}$1`,
                    timeout : 5*60*1000,
                    action : []
                })
                let connect_1 =  `${Date.now()}_${RandomGenerator.string(10)}`;
                info = await testRunner.prevTaskAddAction(new BDTAction.ConnectAction({
                    type : ActionType.connect,
                    LN : `${labAgent[i].tags[0]}$1`,
                    RN : `${labAgent[j].tags[0]}$1`,
                    config:{
                        conn_tag: connect_1,
                        timeout : 60*1000,
                    },
                    expect : {err:0},    
                }))
                info = await testRunner.prevTaskAddAction(new BDTAction.SendDirAction({
                    type : ActionType.send_dir,
                    LN : `${labAgent[i].tags[0]}$1`,
                    RN : `${labAgent[j].tags[0]}$1`,
                    fileNum : 10,
                    fileSize : 10*1024*1024,
                    chunkSize : 4*1024*1024,
                    config:{
                        timeout : 3*60*1000,
                        conn_tag: connect_1,
                    },
                    expect : {err:0},      
                }))

                await testRunner.prevTaskRun();
            }
        }
    }

    await testRunner.waitFinished()
    
    
}
