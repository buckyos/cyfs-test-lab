import {ErrorCode, RandomGenerator, Logger, TaskClientInterface, ClientExitCode, sleep} from '../../base';
import {BdtProxy,BdtPeer} from './bdtTool'
import {BDTERROR,taskType,Agent} from './type'
import {request,ContentType} from "./request"
import * as config from "./config"
var date = require("silly-datetime");
const timeout = 300*1000;
 //
 export type PeerInfo = {
    name:string, //${Agent.name}_0 、${Agent.name}_1 这样编号
    peer?:BdtPeer, //实例化的BDT对象
    type?:number,
    endpoints? : Array<string>
}
export type Action ={
    // 输入数据
    action_id?:string, //action id
    parent_action?:string,//父任务
    LN : PeerInfo, //LN 设备
    RN? : PeerInfo,  // RN 设备
    Users? : Array<PeerInfo>, 
    type : taskType, //操作类型
    config : {
       timeout : number, //超时时间
       known_eps?:number,
       range?:Array<{begin:number,end:number}>
       firstQA_question? :string,
       firstQA_answer? :string,
       accept_answer?:number, //是否接收FristQA answer 
       conn_tag?: string, //连接标记   
       restart? : {
            ndn_event : string,
            ndn_event_target : string,
       },
       ndn_event_config? :{
            is_connect : Boolean,
            is_cache_data : Boolean,
        }
   },
    info? : {
       LN_NAT?:string,
       RN_NAT?:string,
       Users_NAT?:Array<{name:string,NAT:string}>, 
       fileName?:string, // 文件名称
       conn?:Array<string>,
       conn_name?:string, //连接名称
       hash_LN? : string, //文件hash值
       hash_RN? : string, //文件hash值
       record?:Array<{  //下载进度记录
           time: number;
           speed: string;
           progress: string;}>,
   },
    fileSize? : number, //数据大小
    chunkSize?:number,  //chunk 大小
    fileNum?:number, // 文件数量
    connect_time?: number, //连接时间
    send_time? : number, //传输时间
    set_time?:number, // 本地set 时间
    expect?:{err:number,log?:string}; //预期结果
    result?:{err:number,log:string}; //实际结果   
}

export type Task ={
   task_id?:string,
   timeout? : number, //超时时间
   LN : PeerInfo, //LN 设备
   RN : PeerInfo,  // RN 设备
   Users? : Array<PeerInfo>, 
   action:Array<Action>, // 操作集合
   child_action?:Array<Action>, //子操作集合
   result?:{err:number,log:string}; //实际结果 
   state?:string; 
   expect_status? : number,
}
 export type Testcase ={
    TestcaseName:string, //用例名称
    testcaseId : string, //用例ID
    remark:string, //用例操作
    agentList:Array<Agent>, //用例初始化节点列表
    taskList:Array<Task>, //用例执行任务列表
    environment : string; //环境
    taskMult:number, //任务的并发数量限制
    MaxTaskNum?:number, // 运行最大任务数
    success?:number,
    failed?:number,
    result?:number,
    date? :string,
    errorList?:Array<{task_id?:string,
        err? : number,
        log?: string}>
}

/**
 * 
 *  将测试用例集合乱序排序
 */
export async function shuffle(agentList:Array<Task>,max:number=0) : Promise<Array<Task>>  {
    let len = agentList.length;
    if(agentList.length<=max || agentList.length<5){
        return agentList;
    }

    while(len){
        let i = RandomGenerator.integer(agentList.length-1,0);
        len = len - 1;
        let t  = agentList[len]
        agentList[len] = agentList[i]
        agentList[i]  = t
    }
    if(max==0){
        return agentList;
    }else{
        let list = [];
        for(let i=0;i<max && i<agentList.length;i++){
            list.push(agentList[i]);
        }
        return list;
    }
    
    
    
}


export class TestRunner{
    private Testcase? : Testcase;// 测试用例
    private m_interface:TaskClientInterface; //测试框架接口
 
    private m_bdtProxy : BdtProxy; //bdt 协议栈测试管理
    private agentList?:Array<Agent>;
    private log : Logger; //日志
    private state : string; //用例执行状态，用例做控制
    private begin_time?: number;
    private end_time?:number;
    private is_perf:boolean;
    //private m_testcaseId : string;
    constructor(_interface:TaskClientInterface,is_shuffle:boolean=false){
        this.m_interface = _interface;
        this.log = this.m_interface.getLogger();
        this.m_bdtProxy = new BdtProxy(_interface,timeout); 
        this.is_perf = is_shuffle;
        this.state = "wait"; 
        


    }
    async connectAgent(){
        let promiseList:Array<any> = [];
        for(let i in this.agentList!){
            promiseList.push( new Promise(async(V)=>{
                
                let agent = await this.m_interface.getAgent({} as any, [this.agentList![i].name],[],[], timeout);
                if (agent.err || agent.agentid == undefined ) {
                    this.log.error(`连接测试节点 ${this.agentList![i].name}失败`)
                    V({err:BDTERROR.LNAgentError,log:"连接测试节点失败",info:agent})
                    return
                }
                this.agentList![i].agentid = agent.agentid!;
                //启动测试服务
                let init_err = true;
                setTimeout(async()=>{
                    if(init_err){
                        this.log.error(`${this.agentList![i].agentid}测试节点启动服务失败`)
                        return  V({err:BDTERROR.LNAgentError,log:`测试节点启动服务失败:${this.agentList![i].agentid }`})
                    }
                },10*1000)
                let err = await this.m_interface.startService([], this.agentList![i].agentid!, timeout);
                init_err = false;
                if (err) {
                    this.log.error(`${this.agentList![i].name}测试节点启动服务失败`)
                    return V({err:BDTERROR.LNAgentError,log:"测试节点启动服务失败"})
                }
                await sleep(2000);
                //检查IP是否变化
                let IPInfo = await this.m_interface.callApi('getIPInfo', Buffer.from(''), {}, this.agentList![i].agentid!, timeout);
                this.log.info(`${this.agentList![i].name} get ipinfo = ${JSON.stringify(IPInfo)}`)
                if(IPInfo.err || IPInfo.value.ipInfo.IPv4 == undefined  || IPInfo.value.ipInfo.IPv6 == undefined){
                    this.log.error(`${this.agentList![i].name}查询节点IP失败`)
                    
                    return V({err:BDTERROR.LNAgentError,info:IPInfo,log:"查询节点IP失败"})
                }
                let ipv4s : Array<string> = IPInfo.value.ipInfo.IPv4;
                let ipv6s : Array<string> = IPInfo.value.ipInfo.IPv6;
                let ipList = ipv4s.concat(ipv6s);
                let eps = this.agentList!![i].eps;
                for(let x=0;x<eps.length;x++){
                    let ip = eps[x].substring(5);
                    let contain = false;
                    for(let j=0;j<ipList.length;j++){
                        if(ip.indexOf(ipList[j])!=-1 || ip.indexOf('[::]')!=-1){
                            contain = true;
                        }
                    }
                    if(contain==false){
                        this.log.error(`节点${this.agentList![i].name} IP:${JSON.stringify(IPInfo)} EP:${JSON.stringify(eps)}`);
                        V({err:BDTERROR.LNAgentError,info:IPInfo,log:`节点IP信息校验失败`})
                    }       
                }
                V({err:BDTERROR.success,info:IPInfo,log:`节点IP信息校验成功`})
            }))
        }
        let runAgent: Array<Agent> = [];
        for(let i in promiseList){
            let check = await promiseList[i];
            if(!check.err){
                runAgent.push(this.agentList!![i])
            }
        }
        this.agentList! = runAgent;
        return  {err:BDTERROR.success,log:"连接测试节点成功"}
    }
 
    async initBdtPeer(){
        //(1)启动协议栈
        let checkPromise:Array<any> = []
        for(let i in this.agentList!){
            this.agentList[i].SNResp_eps= [];
            this.agentList[i].device_eps= [];
            checkPromise.push(new Promise(async(V)=>{
                for(let j = 0 ;j<this.agentList![i].agentMult!;j++){
                    this.log.info(`${this.agentList![i].name!} begin initStartBDTpeer  ${i} ,EP = ${JSON.stringify(this.agentList![i].eps)}`)
                    let peer = await this.m_bdtProxy.newPeer(this.agentList![i].agentid!,`${this.agentList![i].name!}_${j}`,this.agentList![i].NAT);
                    await peer.init();
                    let info = await peer.start(this.agentList![i].eps,'',this.agentList![i].SN,[],this.agentList![i].logType,this.agentList![i].PN!.activePnFiles,this.agentList![i].PN!.passivePnFiles,this.agentList![i].PN!.knownPeerFiles,this.agentList![i].chunk_cache,this.agentList![i].firstQA_answer,this.agentList![i].resp_ep_type);
                    this.agentList![i].SNResp_eps!.push(info.ep_info!);
                    this.agentList![i].device_eps!.push(info.ep_resp!);
                    if(info.err){
                        this.log.error(`${this.agentList![i].name} 初始化BDT协议栈 ${j} 失败`);
                        V({err:BDTERROR.initPeerFailed,log:`${this.agentList![i].name} 初始化BDT协议栈 ${j} 失败`});
                    }
                    V({err:BDTERROR.success,log:`${this.agentList![i].name} 初始化BDT协议栈 ${j}成功`})
                }
            }))
            
        }
        for(let i in checkPromise){
            let check = await checkPromise[i];
            if(check.err){
                return check;
            }
        }
         
        return {err:BDTERROR.success,log:` 初始化BDT协议栈成功`}
        
    }

    async initEvent(){
        //所有节点启动连接监听
        let acceptPromise = new Promise(async(v)=>{
            for(let i in this.m_bdtProxy.m_peers){
                let info = this.m_bdtProxy.m_peers[i].autoAccept();
                this.m_bdtProxy.m_peers[i].on('accept',async (RNconn,peerName)=> {
                    this.m_interface.getLogger().info(`触发accept ${JSON.stringify(RNconn.connName)} ${peerName}`)
                    this.m_bdtProxy.m_peers[i].addConn(RNconn);
                });
            }
            v("run all")
        })
        await acceptPromise; //确保所有节点都先运行了autoaccept
        return;
    }


    async saveTestcase(){
        this.log.info(`api/bdt/testcase/add req: ${JSON.stringify(this.Testcase!.testcaseId)}`)
        let agentNameList = []
        for(let i in this.Testcase!.agentList){
            agentNameList.push({name:this.Testcase!.agentList[i].name,NAT:this.Testcase!.agentList[i].NAT})
        }
        this.log.info(`###开始保存测试数据`)
        let run = await request("POST","api/bdt/testcase/add",{
            TestcaseName:this.Testcase!.TestcaseName,
            testcaseId:this.Testcase!.testcaseId,
            remark:this.Testcase!.remark,
            agentList: JSON.stringify(agentNameList),
            taskList: this.Testcase!.taskList.length,
            environment:this.Testcase!.environment,
            taskMult:this.Testcase!.taskMult,
            result: this.Testcase!.result,
            errorList : JSON.stringify(this.Testcase!.errorList),
            success : this.Testcase!.success!,
            failed : this.Testcase!.failed!,
            date:this.Testcase!.date,
        },ContentType.json)
        this.log.info(`api/bdt/testcase/add resp: ${JSON.stringify(run)}`)
    }
    async saveTask(){
        let runList = [];
        let multRun = 0;
        for(let i in this.Testcase!.taskList){
            multRun = multRun + 1;
            runList.push(new Promise(async(V)=>{
                this.log.info(`测试任务${i}: LN :${this.Testcase!.taskList[i].LN.name} RN :${this.Testcase!.taskList[i].RN.name}`)
                if(!this.Testcase!.taskList[i].result){
                    this.log.error(`测试任务${i} result = ${JSON.stringify(this.Testcase!.taskList[i].result)}`)
                }
                let UserName = []
                for(let name in this.Testcase!.taskList[i].Users){
                    UserName.push({agent:this.Testcase!.taskList[i].Users![Number(name)].name})
                }
                this.log.info(`api/bdt/task/add req: ${this.Testcase!.testcaseId}_task${i}`)
                let run_task =await request("POST","api/bdt/task/add",{
                    task_id:this.Testcase!.taskList[i].task_id ,
                    testcaseId:this.Testcase!.testcaseId,
                    LN:this.Testcase!.taskList[i].LN.name,
                    RN:this.Testcase!.taskList[i].RN.name,
                    Users: JSON.stringify(UserName),
                    expect_status : this.Testcase!.taskList[i].expect_status!.toString(),
                    result:JSON.stringify(this.Testcase!.taskList[i].result),
                    state : this.Testcase!.taskList[i]!.state,
                    
                },ContentType.json)

                this.log.info(`api/bdt/task/add resp:  ${JSON.stringify(run_task)}`)
                let actionList = []
                for(let j in this.Testcase!.taskList[i].action){
                    let UserName = []
                    for(let name in this.Testcase!.taskList[i].action![j]!.Users){
                        UserName.push({agent:this.Testcase!.taskList[i].action![j]!.Users![Number(name)].name})
                    }
                    actionList.push({
                        task_id:this.Testcase!.taskList[i].task_id ,
                        testcaseId:this.Testcase!.testcaseId,
                        type: this.Testcase!.taskList[i].action[j].type,
                        action_id:this.Testcase!.taskList[i].action[j].action_id,
                        parent_action :this.Testcase!.taskList[i].action[j].parent_action,
                        LN:this.Testcase!.taskList[i].action[j].LN.name,
                        RN:this.Testcase!.taskList[i].action[j].RN?.name,
                        Users: JSON.stringify(UserName),
                        config:JSON.stringify( this.Testcase!.taskList[i].action[j].config),
                        info:JSON.stringify( this.Testcase!.taskList[i].action[j].info),
                        fileSize : this.Testcase!.taskList[i].action[j].fileSize,
                        chunkSize : this.Testcase!.taskList[i].action[j].chunkSize,
                        connect_time : this.Testcase!.taskList[i].action[j].connect_time,
                        set_time : this.Testcase!.taskList[i].action[j].set_time,
                        send_time : this.Testcase!.taskList[i].action[j].send_time,
                        result: String(this.Testcase!.taskList[i].action[j].result?.err),
                        expect: String(this.Testcase!.taskList[i].action[j].expect!.err),
                    })               
                }
                if(this.Testcase!.taskList[i].child_action){
                    for(let j = 0 ; j< this.Testcase!.taskList[i].child_action!.length;j++){
                        let UserName = []
                        for(let name in this.Testcase!.taskList[i].child_action![j]!.Users){
                            UserName.push({agent:this.Testcase!.taskList[i].child_action![j]!.Users![Number(name)].name})
                        }
                        if(!this.Testcase!.taskList[i].action[j].result){
                            this.Testcase!.taskList[i].action[j].result = {err:BDTERROR.testDataError,log:"not found"}
                        }
    
                        actionList.push({
                            task_id:this.Testcase!.taskList[i].task_id ,
                            testcaseId:this.Testcase!.testcaseId,
                            type: this.Testcase!.taskList[i].child_action![j]!.type,
                            action_id:this.Testcase!.taskList[i].child_action![j].action_id,
                            parent_action :this.Testcase!.taskList[i].child_action![j].parent_action,
                            LN:this.Testcase!.taskList[i].child_action![j].LN.name,
                            RN:this.Testcase!.taskList[i].child_action![j].RN?.name,
                            Users: JSON.stringify(UserName),
                            config:JSON.stringify( this.Testcase!.taskList[i].child_action![j].config),
                            info:JSON.stringify( this.Testcase!.taskList[i].child_action![j].info),
                            fileSize : this.Testcase!.taskList[i].child_action![j].fileSize,
                            chunkSize : this.Testcase!.taskList[i].child_action![j].chunkSize,
                            connect_time : this.Testcase!.taskList[i].child_action![j].connect_time,
                            set_time : this.Testcase!.taskList[i].child_action![j].set_time,
                            send_time : this.Testcase!.taskList[i].child_action![j].send_time,
                            result: String(this.Testcase!.taskList[i].action[j].result!.err),
                            expect:String(this.Testcase!.taskList[i].action[j].expect!.err),
                        })                    
                    }
                }
                
                this.log.info(`api/bdt/action/addList req: ${this.Testcase!.testcaseId}_task${i}`)
                let run_action =await request("POST","api/bdt/action/addList",{
                    list : actionList
                    
                },ContentType.json)
                this.log.info(`api/bdt/action/addList resp:  ${JSON.stringify(run_action)}`)
                multRun = multRun -1;
                V("")
            }))
            while(multRun>5){
                await sleep(2000);
            }
        }
        for(let i in runList){
            await runList[i]
        }
    }
    async saveAction(action:Action,task_id:string){
        this.log.info(`api/bdt/action/add req: 测试任务 ${action.action_id}: LN :${action.LN.name} RN :${action.RN?.name}`)
        let UserName = []
        for(let name in action.Users){
            UserName.push({agent:action.Users![Number(name)].name})
        }

        let run_action =await request("POST","api/bdt/action/add",{
            task_id:task_id,
            testcaseId:this.Testcase!.testcaseId,
            type: action.type,
            action_id:action.action_id,
            parent_action :action.parent_action,
            LN:action.LN.name,
            RN:action.RN?.name,
            Users: JSON.stringify(UserName),
            config:JSON.stringify( action.config),
            info:JSON.stringify( action.info),
            fileSize : action.fileSize,
            chunkSize : action.chunkSize,
            connect_time : action.connect_time,
            set_time : action.set_time,
            send_time : action.send_time,
            result:JSON.stringify(action.result),
            expect:JSON.stringify(action.expect),
            
        },ContentType.json)
        this.log.info(`api/bdt/action/add resp:  ${JSON.stringify(run_action)}`)
    }
    async saveAgent(){
        for(let i in this.Testcase!.agentList){
            let run_action =await request("POST","api/bdt/agent/add",{
                testcaseId:this.Testcase!.testcaseId,
                name:this.Testcase!.agentList[i].name,
                NAT :this.Testcase!.agentList[i].NAT,
                eps:JSON.stringify({input:this.Testcase!.agentList[i].eps,device_eps : this.Testcase!.agentList[i].device_eps,
                SNResp_eps : this.Testcase!.agentList[i].SNResp_eps ,}) ,
                agentMult:this.Testcase!.agentList[i].agentMult,
                resp_ep_type:this.Testcase!.agentList[i].resp_ep_type,
                agentid:this.Testcase!.agentList[i].agentid,
                logType:this.Testcase!.agentList[i].logType,
                logUrl : this.Testcase!.agentList[i].logUrl,
                report_time : this.Testcase!.agentList[i].report_time,
                chunk_cache : this.Testcase!.agentList[i].chunk_cache,
                firstQA_answer : this.Testcase!.agentList[i].firstQA_answer,
                PN : JSON.stringify(this.Testcase!.agentList[i].PN) 
            },ContentType.json)
            this.log.info(`api/bdt/agent/add resp:  ${JSON.stringify(run_action)}`)
        }
    }

    async saveTestcaseToMysql(){
        await this.saveTestcase();
        await this.saveTask();
        await this.saveAgent();
        return 
    }

    async restart(action:Action){
        action.LN!.peer = this.m_bdtProxy.getPeer(action.LN.name).peer
        if(!action.LN!.peer){
            return {err:BDTERROR.success,log:`restart peer ${action.LN.name} not exist`}
        }
        let stop = await action.LN!.peer!.destory(); 
        let target = this.m_bdtProxy.getPeer(action.config.restart!.ndn_event_target).peer!.peerid

        let info = await action.LN!.peer.restart(action.config.restart?.ndn_event,target);
        if(info.err){
            return {err:BDTERROR.LNAgentError,log:`restart peer ${action.LN.name} failed`}
        }
        return {err:BDTERROR.success,log:"连接成功"}
    }
    async connect(action:Action){
        action.LN!.peer = this.m_bdtProxy.getPeer(action.LN.name).peer
        action.RN!.peer = this.m_bdtProxy.getPeer(action.RN!.name).peer
        // 判断是否要进行FristQA 数据发送
        action.RN!.peer!.conn_tag = action.config!.conn_tag;
        let FirstQ = ""
        if(action.config!.firstQA_question){
            FirstQ = action.config!.firstQA_question!;
            action.fileSize = Buffer.byteLength(action.config!.firstQA_question!)
        }
        if(action.config!.firstQA_answer){
            let err = await action.RN!.peer!.set_answer(action.config!.firstQA_answer);
            if(err){
                return {err:BDTERROR.connnetFailed,log:`${action.RN!.peer?.tags} set_answer info failed `}
            }
        }
        
        // 判断是否要发起直连，默认不直连
        if(!action.config!.known_eps){
            action.config!.known_eps = 0
        }
        //建立连接
        let info =  await action.LN!.peer!.connect(action.RN!.peer!,FirstQ,action.config!.known_eps!,action.config!.accept_answer!,action.config!.conn_tag) 
        if(info.err){
            return {err:BDTERROR.connnetFailed,log:`${action.LN!.peer?.tags} conenct ${action.RN!.peer?.tags} err =${info.err}`}
        }
        if(!action.info){
            action.info = {conn : []};
        }else{
            action.info.conn = [];
        }
        action.info!.conn!.push(info.conn!.connName!); 
        action.connect_time = info.time
        action.info!.conn_name = info.conn!.connName
        // 检查fristQA answer 
        if(info.answer){
            if(info.answer != action.RN!.peer?.FristQA_answer){
                return {err:BDTERROR.connnetFailed,log:`${action.LN!.peer?.tags} conenct ${action.RN!.peer?.tags} , FristQA answer is error`}
            }
        }
        //校验RN 连接成功
        let check = await action.RN!.peer!.remark_accpet_conn_name(info.conn!.connName,action.LN!.peer!.peerid,action.config!.conn_tag);
        if(check.err){
            return {err:BDTERROR.connnetFailed,log:` ${action.RN!.peer!.tags!} confirm ${action.LN!.peer!.tags} failed`}
        }
        
        if(check.conn?.question!){
            if(check.conn?.question! != FirstQ){
                return {err:BDTERROR.connnetFailed,log:`${action.LN!.peer?.tags} conenct ${action.RN!.peer?.tags} , FristQA question is error`}
            }
        }

        this.log.info(`${action.LN!.peer!.tags} conenct ${action.RN!.peer!.tags!} success,time = ${info.time!}`)
        return {err:BDTERROR.success,log:"连接成功"}
    }

    async shutdown(action:Action){
        action.LN!.peer = this.m_bdtProxy.getPeer(action.LN.name).peer
        action.RN!.peer = this.m_bdtProxy.getPeer(action.RN!.name).peer
        let connInfo =  action.LN!.peer!.getConnect(action.RN!.peer!.peerid,action.config!.conn_tag);
        if( connInfo.err ){
            return {err:BDTERROR.testDataError,log:`${action.LN.name} 连接不存在`}
        }
        let close = await connInfo.conn!.close();
        if(close == ErrorCode.succ){
            await sleep(2000);
            return {err:BDTERROR.success,log:`${action.LN.name} 关闭连接${connInfo.conn!.connName}成功`}
        }else{
            return {err:BDTERROR.CloseConnectionFailed,log:`${action.LN.name} 关闭连接${connInfo.conn!.connName}失败，err =${close}`}
        }
    }
    async destory(action:Action){
        action.LN!.peer = this.m_bdtProxy.getPeer(action.LN.name).peer
        let destory = await action.LN!.peer!.destory(-2);
        if(destory == ErrorCode.succ){
            await sleep(2000);
            return {err:BDTERROR.success,log:`${action.LN.name} 关闭BDT协议栈成功`}
        }else{
            return {err:BDTERROR.DestoryStackFailed,log:`${action.LN.name} 关闭BDT协议栈失败 err = ${destory}`}
        }
    }


    async send_stream(action:Action){
        action.LN!.peer = this.m_bdtProxy.getPeer(action.LN.name).peer
        action.RN!.peer = this.m_bdtProxy.getPeer(action.RN!.name).peer
        //利用现有的一个连接发送数据，默认使用第一个连接

        let connInfo =  action.LN!.peer!.getConnect(action.RN!.peer!.peerid,action.config!.conn_tag); 
        let connInfo_RN =  action.RN!.peer!.getConnect(action.LN!.peer!.peerid,action.config!.conn_tag);
        
        if( connInfo.err || connInfo_RN.err){
            return {err:BDTERROR.testDataError,log:`${action.LN.name} 连接不存在`}
        }
        this.log.info(`${connInfo.conn!.connName} ${connInfo_RN.conn!.connName} 开始传输stream`) 
        let conn = connInfo.conn!;
        // RN 调用recv 后续要改成回调形式
        let recvPromise =  connInfo_RN.conn!.recvFile();
        await sleep(5*1000)
        let sendInfo = await conn!.sendFile(action.fileSize!);
        
        let recv = await recvPromise;
        action.send_time = sendInfo.time;
        action.info!.hash_LN = sendInfo.hash;
        action.info!.hash_RN = recv.hash!;
        if(sendInfo.err){
            return {err:BDTERROR.sendDataFailed,log:`${action.LN!.peer!.tags} send stream to ${action.RN!.peer!.tags!} failed,err=${sendInfo.err}`};
        }
        if(recv.err){
            return {err:BDTERROR.sendDataFailed,log:`${action.LN!.peer!.tags} recv stream to ${action.RN!.peer!.tags!} failed,err=${recv.err}`};
        }
        return {err:BDTERROR.success,log:"连接发送数据成功"}
    }
    async send_stream_just_send(action:Action){
        action.LN!.peer = this.m_bdtProxy.getPeer(action.LN.name).peer
        action.RN!.peer = this.m_bdtProxy.getPeer(action.RN!.name).peer
        //利用现有的一个连接发送数据，默认使用第一个连接
        let connInfo =  action.LN!.peer!.getConnect(action.RN!.peer!.peerid,action.config!.conn_tag); 
       
        if( connInfo.err) {
            return {err:BDTERROR.testDataError,log:`${action.LN.name} 连接不存在`}
        }
        this.log.info(`${connInfo.conn!.connName}  开始传输stream`) 
        let conn = connInfo.conn!;
        let sendInfo = await conn!.sendFile(action.fileSize!);
        action.send_time = sendInfo.time;
        action.info!.hash_LN = sendInfo.hash;
        if(sendInfo.err){
            return {err:BDTERROR.sendDataFailed,log:`${action.LN!.peer!.tags} send stream to ${action.RN!.peer!.tags!} failed,err=${sendInfo.err}`};
        }
        return {err:BDTERROR.success,log:"连接发送数据成功"}
    }
    async send_chunk(action:Action){
        action.LN!.peer = this.m_bdtProxy.getPeer(action.LN.name).peer
        action.RN!.peer = this.m_bdtProxy.getPeer(action.RN!.name).peer
        let setChunk = await action.LN!.peer!.chunkSendFile(action.chunkSize!)
        if(setChunk.err){
            return{err:BDTERROR.setChunckFailed,log:`${action.LN!.peer!.tags} set chunk failed,err=${setChunk.err}`}
        }
        let revChunk = await action.RN!.peer!.chunkRecvFile(action.LN!.peer!,setChunk.chunkid!,timeout*2)
        if(revChunk.err){
            return{err:BDTERROR.interestChunkFailed,log:`${action.RN!.peer!.tags} recv chunk failed,err=${revChunk.err}`}
        }
        action.set_time = setChunk.time;
        action.send_time = revChunk.time;
        action.info!.hash_LN = setChunk.chunkid!;
        action.info!.hash_RN = revChunk.chunkId!;
        return {err:BDTERROR.success,log:"连接发送数据成功"}
    }
    async send_chunk_list(action:Action){
        action.LN!.peer = this.m_bdtProxy.getPeer(action.LN.name).peer
        action.RN!.peer = this.m_bdtProxy.getPeer(action.RN!.name).peer
        let chunk_list = [];
        for(let x =0 ;x< action.fileNum!;x++){
            let setChunk = await action.RN!.peer!.chunkSendFile(action.chunkSize!)
            if(setChunk.err){
                return{err:BDTERROR.setChunckFailed,log:`${action.RN!.peer!.tags} set chunk failed,err=${setChunk.err}`}
            }
            chunk_list.push( {chunk_id:setChunk.chunkid!})
        }
        this.log.info(`${action.RN!.name} send chunkList to ${action.LN.name} ,chunkList = ${JSON.stringify(chunk_list)} `)
        let revChunk = await action.LN!.peer!.interestChunkList(action.RN!.peer!,chunk_list,action.config.timeout)
        if(revChunk.err){
            return{err:BDTERROR.interestChunkFailed,log:`${action.LN!.peer!.tags} recv chunk failed,err=${revChunk.err}`}
        }
        action.send_time = revChunk.time;
        action.info!.hash_LN = revChunk.session!;
        action.info!.record = revChunk.record;
        return {err:BDTERROR.success,log:"连接发送数据成功"}
    }

    async send_file(action:Action){
        action.LN!.peer = this.m_bdtProxy.getPeer(action.LN.name).peer
        action.RN!.peer = this.m_bdtProxy.getPeer(action.RN!.name).peer
        let setFile =  await action.RN!.peer!.startSendFile(action.fileSize!,"",action.chunkSize)
        if(setFile.err){
            return{err:BDTERROR.sendFileByChunkFailed,log:`${action.RN!.peer!.tags} set chunk failed,err=${setFile.err}`}
        }
        let recvFile = await action.LN!.peer!.startDownloadFile(setFile.fileName!,setFile.fileObject!,action.RN!.peer!.peerid,action.config.timeout);
        if(recvFile.err){
            return{err:BDTERROR.sendFileByChunkFailed,log:`${action.LN!.peer!.tags} recv file failed,err=${recvFile.err}`}
        }
        action.set_time = setFile.time;
        action.send_time=recvFile.time;
        action.info!.hash_LN=recvFile.md5!;
        action.info!.hash_RN= setFile.md5!;
        return {err:BDTERROR.success,log:"连接发送数据成功"}
    }
    async send_file_send_file_redirect(action:Action,taskIndex:number){
        action.LN!.peer = this.m_bdtProxy.getPeer(action.LN.name).peer
        action.RN!.peer = this.m_bdtProxy.getPeer(action.RN!.name).peer
        let setFile =  await action.RN!.peer!.startSendFile(action.fileSize!,"",action.chunkSize)
        if(setFile.err){
            return{err:BDTERROR.sendFileByChunkFailed,log:`${action.RN!.peer!.tags} set chunk failed,err=${setFile.err}`}
        }
        let recvFile = await action.LN!.peer!.startDownloadFile(setFile.fileName!,setFile.fileObject!,action.RN!.peer!.peerid,action.config.timeout);
        if(recvFile.err){
            return{err:BDTERROR.sendFileByChunkFailed,log:`${action.LN!.peer!.tags} recv file failed,err=${recvFile.err}`}
        }
        action.set_time = setFile.time;
        action.send_time=recvFile.time;
        action.info!.hash_LN=recvFile.md5!;
        action.info!.hash_RN= setFile.md5!;
        return {err:BDTERROR.success,log:"连接发送数据成功"}
    }
    async send_file_range(action:Action){
        action.LN!.peer = this.m_bdtProxy.getPeer(action.LN.name).peer
        action.RN!.peer = this.m_bdtProxy.getPeer(action.RN!.name).peer
        let setFile =  await action.RN!.peer!.startSendFile(action.fileSize!,"",action.chunkSize)
        if(setFile.err){
            return{err:BDTERROR.sendFileByChunkFailed,log:`${action.RN!.peer!.tags} set chunk failed,err=${setFile.err}`}
        }
        
        let recvFile = await action.LN!.peer!.startDownloadFileRange(setFile.fileName!,setFile.fileObject!,action.RN!.peer!.peerid,action.config.timeout,action.config!.range!);
        if(recvFile.err){
            return{err:BDTERROR.sendFileByChunkFailed,log:`${action.LN!.peer!.tags} recv file failed,err=${recvFile.err}`}
        }
        action.set_time = setFile.time;
        action.send_time = recvFile.time;
        action.info!.hash_LN = recvFile.md5!;
        action.info!.hash_RN =  setFile.md5!;
        return {err:BDTERROR.success,log:"连接发送数据成功"}
    }


    
    async start_report(testcaseId:string){
        for(let i in this.agentList!){
            if(this.agentList![i].report_time){
                let param = {
                    agent:this.agentList![i].name, 
                    testcaseId : testcaseId,
                    time:this.agentList![i].report_time
                }
                let info =await this.m_interface.callApi('start_report', Buffer.from(''), param,this.agentList![i].agentid!,timeout )
                if(info.err){
                    this.log.error(`${this.agentList![i].name} 启动性能监听失败`)
                    return info;
                }
            }
            
        }
        return {err:0,log:"启动性能监听完成"}
    }

    async send_dir(action:Action){
        action.LN!.peer = this.m_bdtProxy.getPeer(action.LN.name).peer
        action.RN!.peer = this.m_bdtProxy.getPeer(action.RN!.name).peer
        // 利用现有的一个连接发送数据，默认使用第一个连接
        if( action.info!.conn!.length == 0){
            return {err:BDTERROR.testDataError,log:`未建立连接就发送数据`}
        }
        // LN 先 set 本地文件,获取到object
        let dirName  = RandomGenerator.string(10);
        let setFile =  await action.RN!.peer!.startSendDir(dirName,action.fileNum!,action.fileSize!,action.chunkSize!)
        if(setFile.err){
            return{err:BDTERROR.sendFileByChunkFailed,log:`${action.RN!.peer!.tags} set chunk failed,err=${setFile.err}`}
        }
        //发送Object 数据
        let connName = action.info!.conn![0];
        let connInfo_LN =  action.LN!.peer!.getConnect(connName,action.RN!.peer!.peerid); 
        let connInfo_RN =  action.RN!.peer!.getConnect(connName,action.LN!.peer!.peerid); 
        if( connInfo_LN.err || connInfo_RN.err){
            return {err:BDTERROR.testDataError,log:`${action.LN.name} 连接${connName}不存在`}
        }
        let conn = connInfo_RN.conn!;
        // RN 调用recv
        await sleep(5*1000)
        //下载 dir 对象
        this.log.info(` ${action.RN!.peer!.tags} send dir obj to ${action.LN!.peer!.tags!} ,dir_id = ${setFile.dir_id}`)
        let recvPromise =  connInfo_LN.conn!.recvObject(`${dirName}_obj`,setFile.dir_id);
        let sendInfo = await conn!.sendObject(setFile.dir_id!,3);
        let recvInfo=  await recvPromise;
        if(sendInfo.err){
            return {err:BDTERROR.sendDataFailed,log:`${action.RN!.peer!.tags} send stream to ${action.LN!.peer!.tags!} failed,err=${sendInfo.err}`};
        }
        this.log.info(`${action.RN!.peer!.tags} send dir obj to ${action.LN!.peer!.tags!} ,dir_id = ${setFile.dir_id} ,run success`)
        action.send_time =sendInfo.time;
        action.info!.hash_RN=sendInfo.hash;
        action.info!.hash_LN =recvInfo.hash;
        action.info!.conn_name = connInfo_RN.conn?.connName;
        action.type = taskType.send_dir_object;

        // 下载dir 内置file  对象
        let send_file_time = 0;
        for(let x =0;x<setFile.dir_map!.length;x++){
            this.log.info(` dir_id = ${setFile.dir_id} send file object ${x} ${setFile.dir_map![x].file_id} `)
            let recvPromise =  connInfo_LN.conn!.recvObject(`${dirName}_obj`,setFile.dir_map![x].file_id);
            let sendInfo = await conn!.sendObject(setFile.dir_map![x].file_id,2);
            send_file_time= send_file_time + sendInfo.time!;
            let recvInfo=  await recvPromise;
            if(sendInfo.err){
                return {err:BDTERROR.sendDataFailed,log:`${action.RN!.peer!.tags} send stream to ${action.LN!.peer!.tags!} failed,err=${sendInfo.err}`};
            }
            
        }
        // action.datas!.push({
        //     send_time:send_file_time,
        //     conn_name : connInfo_RN.conn?.connName,
        //     type : taskType.send_file_object
        // }) 
        // RN 下载文件夹
        this.log.info(` dir_id = ${setFile.dir_id} startDownloadDir `);
        let recvFile = await action.LN!.peer!.startDownloadDir(dirName,`${dirName}_obj`,setFile.dir_map_buffer!,setFile.dir_id!,action.RN!.peer!.peerid,action.config.timeout);
        if(recvFile.err){
            return{err:BDTERROR.sendFileByChunkFailed,log:`${action.RN!.peer!.tags} recv file failed,err=${recvFile.err}`}
        }
        // action.datas!.push({
        //     set_time : setFile.time,
        //     hash_RN : setFile.session,
        //     send_time:recvFile.time, 
        //     hash_LN :   recvFile.session,
        // }) 
        return {err:BDTERROR.success,log:"连接发送数据成功"}
    }
    

    async exitTestcase(result:number,log:string){
        //判断实际结果与预期结果差别
        let exitState = false; 
        setTimeout(async () => {
            if(!exitState){
                await this.m_interface.exit(ClientExitCode.failed,"运行超时",timeout);
            }
        }, 60*1000);
        this.log.error(`result = ${result},log =${log}`)
        for(let i in this.Testcase!.agentList!){
            let info = await this.m_interface.callApi('reportLog', Buffer.from(''), {logName:`${this.Testcase!.TestcaseName}_${this.Testcase!.agentList![i].name}.zip`},this.Testcase!.agentList![i].agentid!,timeout )
            this.Testcase!.agentList![i].logUrl = info.value.url;
            this.log.info(`**** ${this.Testcase!.TestcaseName} ${this.Testcase!.agentList![i].logUrl}`)
        }

        await this.saveTestcaseToMysql();
        let exit =await this.m_bdtProxy.exit();
        //退出测试框架
        exitState = true;
        if(result){
            await this.m_interface.exit(ClientExitCode.failed,log,timeout);
        }else{
            await this.m_interface.exit(ClientExitCode.succ,log,timeout);
        }
        return; 
    }
    async testCaseRunner(testcase:Testcase){
        this.state = "run";
        this.Testcase = testcase;
        this.Testcase!.date = date.format(new Date(),'YYYY/MM/DD');
        this.Testcase.MaxTaskNum = config.MaxTaskNum;
        // 是否将测试用例打乱顺序，性能测试的时候不需要
        if(!this.is_perf){
            this.Testcase!.taskList = await shuffle(this.Testcase!.taskList,this.Testcase.MaxTaskNum);
        }
        
        //this.log.info(`${JSON.stringify(this.Testcase!.taskList)}`);
        this.log.info(`###### 测试用例运行任务数量：${this.Testcase!.taskList.length}`);
        this.agentList! = testcase.agentList;
        // (1) 测试环境初始化
        let startInfo = await this.connectAgent();
        let initInfo =  await this.initBdtPeer();
        if(initInfo.err){
            let info = await this.exitTestcase(BDTERROR.initPeerFailed,`初始化BDT协议栈失败`);
            return info;
        }
        //(2) 节点运行 bdt cyfs库的性能监听
        await this.start_report(testcase.testcaseId);
        await this.initEvent(); // 启动accept event
        await sleep(5000);
        let runNum = 0;
        let endNum = 0;
        this.begin_time = Date.now();
        // (3) 进行操作
        
        let taskRun :Array<any> = []
        for(let i in this.Testcase!.taskList!){
            runNum = runNum + 1;
            taskRun.push(new Promise<{err:number,log:string}>(async(V)=>{
                if(!this.Testcase!.taskList[i]){
                    let info = await this.exitTestcase(BDTERROR.initPeerFailed,`测试用例数据异常`);
                    return info;
                }
                //this.log.info(`${JSON.stringify(this.Testcase!.taskList)}`);
                this.Testcase!.taskList[i]!.task_id = `${this.Testcase!.testcaseId!}_task${i}`;
                // 判断机器状态是否正常，机器不正常
                if(this.m_bdtProxy.getPeer(this.Testcase!.taskList[i].LN.name).err ){
                    runNum = runNum -1;
                    return V({err:BDTERROR.LNAgentError,log:`测试节点离线： ${this.Testcase!.taskList[i].LN.name}`})
                }
                if(this.m_bdtProxy.getPeer(this.Testcase!.taskList[i].RN.name).err ){
                    runNum = runNum -1;
                    return V({err:BDTERROR.LNAgentError,log:`测试节点离线： ${this.Testcase!.taskList[i].RN.name}`})
                }
                await sleep(100);
                this.Testcase!.taskList[i].LN!.peer = this.m_bdtProxy.getPeer(this.Testcase!.taskList[i].LN.name).peer!;
                this.Testcase!.taskList[i].RN!.peer = this.m_bdtProxy.getPeer(this.Testcase!.taskList[i].RN.name).peer!;
                
                //获取要测试的两个协议栈
                this.log.info(`##当前运行任务数量${runNum}`)
                this.log.info(`##开始执行task ${i} LN： ${this.Testcase!.taskList[i].LN.name}  RN: ${this.Testcase!.taskList[i].RN.name}`)
                
                this.Testcase!.taskList[i].LN!.type = this.Testcase!.taskList[i].LN!.peer!.NAT;
                this.Testcase!.taskList[i].RN!.type = this.Testcase!.taskList[i].RN!.peer!.NAT;
                

                this.Testcase!.taskList[i].state = "run"
                //设置测试任务超时校验
                if(!this.Testcase!.taskList[i].timeout){
                    this.Testcase!.taskList[i].timeout = 60*1000;
                }
                new Promise(async(X)=>{
                    let date = Date.now()
                    while(Date.now()-date< this.Testcase!.taskList[i].timeout! && this.Testcase!.taskList[i].state =="run"){
                        this.log.info(`task ${i} await running ,run time = ${Date.now()-date} ms，state = ${this.Testcase!.taskList[i].state} `)    
                        await sleep(5000)
                    }
                    this.log.info(`触发超时校验 task ${i} state : ${this.Testcase!.taskList[i].state} ，timeout= ${this.Testcase!.taskList[i].timeout }`)
                    if(this.Testcase!.taskList[i].state == "run"){
                        runNum = runNum -1;
                        this.Testcase!.taskList[i].state = "timeout"
                        V({err:BDTERROR.timeout,log:`测试任务${i}运行超时`})
                    }else{
                        X("执行完成")
                    }
                })
                //执行测试任务中操作
                let result  = true;
                for(let j in this.Testcase!.taskList[i].action){
                    if(result != true){
                        break;
                    }
                    this.Testcase!.taskList[i].action[j].action_id = `${this.Testcase!.taskList[i].task_id}_action${j}`
                    this.Testcase!.taskList[i].action[j].info = {LN_NAT:this.Testcase!.taskList[i].action[j].LN.type?.toString(),RN_NAT:this.Testcase!.taskList[i].action[j].RN?.type?.toString(),};
                    this.log.info(`###开始执行task ${i} ${j} action ${JSON.stringify(this.Testcase!.taskList[i].action[j])}`)
                    setTimeout(async()=>{
                        if(!this.Testcase!.taskList[i].action[j].result){
                            this.Testcase!.taskList[i].action[j].result =  {err:BDTERROR.timeout,log:`${this.Testcase!.taskList[i].action[j].action_id} ${this.Testcase!.taskList[i].action[j].type} timeout`}
                            return V(this.Testcase!.taskList[i].action[j].result!)
                        }
                    },this.Testcase!.taskList[i].action[j].config.timeout)
                    switch(this.Testcase!.taskList[i].action[j].type){
                        case taskType.restart : {
                            this.Testcase!.taskList[i].action[j].result =  await this.restart(this.Testcase!.taskList[i].action[j]);
                            break;
                        }
                        case taskType.exit : {
                            this.Testcase!.taskList[i].action[j].result =  await this.destory(this.Testcase!.taskList[i].action[j]);
                            break;
                        }
                        case taskType.connect : {
                            this.Testcase!.taskList[i].action[j].result =  await this.connect(this.Testcase!.taskList[i].action[j]);
                            break;
                        }
                        case taskType.shutdown : {
                            this.Testcase!.taskList[i].action[j].result =  await this.shutdown(this.Testcase!.taskList[i].action[j]);
                            break;
                        }
                        case taskType.connect_second : {
                            this.Testcase!.taskList[i].action[j].result =  await this.connect(this.Testcase!.taskList[i].action[j]);
                            break;
                        }
                        case taskType.connect_reverse : {
                            this.Testcase!.taskList[i].action[j].result =  await this.connect(this.Testcase!.taskList[i].action[j]);
                            break;
                        }
                        case taskType.connect_mult : {
                            this.Testcase!.taskList[i].action[j].result =  await this.connect(this.Testcase!.taskList[i].action[j]);
                            break;
                        }
                        case taskType.send_stream : {
                            this.Testcase!.taskList[i].action[j].result = await this.send_stream(this.Testcase!.taskList[i].action[j]);
                            break;
                        }
                        case taskType.send_stream_reverse : {
                            this.Testcase!.taskList[i].action[j].result = await this.send_stream(this.Testcase!.taskList[i].action[j]);
                            break;
                        }
                        case taskType.send_stream_just_send : {
                            this.Testcase!.taskList[i].action[j].result = await this.send_stream_just_send(this.Testcase!.taskList[i].action[j]);
                            break;
                        }
                        case taskType.send_chunk : {
                            this.Testcase!.taskList[i].action[j].result = await this.send_chunk(this.Testcase!.taskList[i].action[j]);
                            break;
                        }
                        case taskType.send_chunk_list : {
                            this.Testcase!.taskList[i].action[j].result = await this.send_chunk_list(this.Testcase!.taskList[i].action[j]);
                            break;
                        }
                        case taskType.send_file : {
                            this.Testcase!.taskList[i].action[j].result = await this.send_file(this.Testcase!.taskList[i].action[j]);
                            break;
                        }
                        case taskType.send_file_redirect : {
                            this.Testcase!.taskList[i].action[j].result = await this.send_file_send_file_redirect(this.Testcase!.taskList[i].action[j],Number(i));
                            break;
                        }
                        case taskType.send_file_range : {
                            this.Testcase!.taskList[i].action[j].result = await this.send_file_range(this.Testcase!.taskList[i].action[j]);
                            break;
                        }
 
                        case taskType.send_dir : {
                            this.Testcase!.taskList[i].action[j].result = await this.send_dir(this.Testcase!.taskList[i].action[j]);
                            break;
                        }
                        case taskType.Always_Run_IM : {
                            this.Testcase!.taskList[i].action[j].result = await this.send_dir(this.Testcase!.taskList[i].action[j]);
                            break;
                        }
                        case taskType.Always_Run_Web : {
                            this.Testcase!.taskList[i].action[j].result = await this.send_dir(this.Testcase!.taskList[i].action[j]);
                            break;
                        }
                        case taskType.Always_Run_NFT : {
                            this.Testcase!.taskList[i].action[j].result = await this.send_dir(this.Testcase!.taskList[i].action[j]);
                            break;
                        }
                        case taskType.Always_Run_Video : {
                            this.Testcase!.taskList[i].action[j].result = await this.send_dir(this.Testcase!.taskList[i].action[j]);
                            break;
                        }
                        default:{
                            this.log.error(`task ${i} 操作的action ${this.Testcase!.taskList[i].action[j].type} 不存在`)
                            this.Testcase!.taskList[i].action[j].result = {err:BDTERROR.testDataError,log : `task ${i} 操作的action ${this.Testcase!.taskList[i].action[j].type} 不存在`};
                        }
                    }
                    
                    if(this.Testcase!.taskList[i].action[j].result!.err !=  this.Testcase!.taskList[i].action[j].expect!.err && this.Testcase!.taskList[i].action[j].expect!.err ==BDTERROR.success){
                        
                        result = false;
                        this.Testcase!.taskList[i].state = "failed";
                        this.log.info(`执行task -1,当前task:${runNum}`)
                        this.log.error(`### task ${i} ${j} 执行失败：预期结果 ${this.Testcase!.taskList[i].action[j].expect!.err} 实际结果 ${this.Testcase!.taskList[i].action[j].result!.err}`)
                        runNum = runNum -1;
                        V(this.Testcase!.taskList[i].action[j].result!)
                    }
                    this.log.info(`### task ${i} ${j} 执行成功：预期结果 ${this.Testcase!.taskList[i].action[j].expect!.err} 实际结果 ${this.Testcase!.taskList[i].action[j].result!.err}`)
                }
                this.Testcase!.taskList[i].state = "success"
                this.log.info(`执行task -1,当前task:${runNum}`)
                runNum = runNum -1;
                V({err:BDTERROR.success,log:"执行成功"})   
            }))
            //控制测试任务的执行并发数量
            while(runNum>=this.Testcase!.taskMult){    
                await sleep(2000)
                this.log.info(`当前task数量：${runNum}, 达运行上限，等待2s，运行总数：${i}`)
            }
            await sleep(500);
            
        }
        let error = BDTERROR.success;
        this.Testcase!.errorList = [];
        let success = 0;
        let failed= 0;
        for(let i in taskRun){
            let result =  await taskRun[i];
            this.log.info(`##### task ${i} 执行完成，result= ${JSON.stringify(result)}`)
            this.Testcase.taskList[i].result = result;
            
            if(result.err){
                error = result.err;
                this.Testcase!.errorList!.push({
                    task_id:this.Testcase!.taskList[i].task_id,
                    err : result.err,
                    log:`task ${i} ,${result.log}`
                })
                failed = failed + 1;
                if(this.is_perf){
                    this.exitTestcase(BDTERROR.optExpectError,"出现异常，性能测试退出")
                }
            }else{
                success = success + 1;
            }
        }
        this.Testcase!.result = error;
        this.Testcase!.success = success;
        this.Testcase!.failed = failed;
        // 三、保存测试数据
        if(error){
            await this.exitTestcase(BDTERROR.optExpectError,"用例执行失败")
        }else{
            await this.exitTestcase(BDTERROR.success,"用例执行完成")
        }
        
    }


}





