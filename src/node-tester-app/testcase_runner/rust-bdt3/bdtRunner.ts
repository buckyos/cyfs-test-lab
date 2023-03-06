import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader,RandomGenerator, Logger, TaskClientInterface, ClientExitCode, BufferWriter, sleep} from '../../base';
import {EventEmitter} from 'events';
import {BdtProxy,BdtPeer,BdtConnection} from './bdtTool'
import {BDTERROR,HubInfo,HubDeviceInfo,AgentInfo, Hub} from './testCode'
import {request,ContentType} from "./request"

const timeout = 300*1000;
export const enum  taskType {
   connect = "connect",
   connect_second = "connect-second",  
   connect_reverse = "connect-reverse",  
   connect_mult = "connect-mult", 
   connect_send_stream = "connect_send-stream",
   send_stream = "send-stream",
   send_stream_reverse = "send-stream-reverse",
   send_stream_mult = "send-stream-mult",
   send_stream_all = "send-stream-all",
   send_chunk = "send-chunk",
   send_file = "send-file" ,
   send_file_mult = "send-file-mult",
   send_dir= "send-dir",
   send_chunk_list = "send-chunk-list",
   send_file_range = "send-file-range" ,
   send_file_object = "send-file-object" ,
   send_dir_object = "send-dir-object" ,
   Always_Run_IM = "Always_Run_IM" ,
   Always_Run_Web = "Always_Run_Web" ,
   Always_Run_NFT = "Always_Run_NFT" ,
   Always_Run_Video = "Always_Run_Video" ,
};
export type Agent= {
    name : string, //名称
    NAT:number,
    eps : Array<string>, //EP配置
    SN : Array<string>, //SN
    agentMult:number,  //节点运行的协议栈数量 ${Agent.name}_0 、${Agent.name}_1 这样编号
    agentid?:string, //节点对应的自动化测试框架节点
    logType? : string, //BDT 日志级别控制
    perf?:{ //性能监控开关
        CpuCheckTime?:number, //监控的次数
        CpuCheckWait?:number //每次的间隔时间
    }
    report?:boolean, //报错cyfs库的性能数据
    report_time?:number, //间隔时间
    chunk_cache?:string, //节点的chunk缓存模式
    PN?:{ //节点的PN数据配置
        activePnFiles:Array<string>, //主动PN列表
        passivePnFiles:Array<string>, //被动PN列表
        knownPeerFiles:Array<string> //已知的PN节点列表
    };
    bdt_conn? : Array<{
        target?:string,
        conn : BdtConnection,
    }>

}
//
type PeerInfo = {
    name:string, //${Agent.name}_0 、${Agent.name}_1 这样编号
    peer?:BdtPeer, //实例化的BDT对象
    type?:number,
}
export type action ={
    type : taskType, //操作类型
    timeout : number, //超时时间
    fileSize? : number, //文件大小
    chunkSize?:number,
    fileNum?:number,
    mult? : number,
    fileName?:string,
    range?:Array<{begin:number,end:number}>
    datas?:Array<{
        type?:taskType,//操作类型
        connect_time?: number, //连接时间
        conn_name?:string,
        send_time? : number, //传输时间
        set_time?:number,
        hash_LN? : string, //文件hash值
        hash_RN? : string, //文件hash值
        result? : number, 
        record?:Array<{
            time: number;
            speed: string;
            progress: string;}>
        }>,
    expect?:{err:number,log?:string}; //预期结果
    result?:{err:number,log:string}; //实际结果   
}



export type Task ={
    LN : PeerInfo, //LN 设备
    RN : PeerInfo,  // RN 设备
    Users? : Array<PeerInfo>, 
    timeout? : number, //超时时间
    task_id?:string,
    conn?:Array<string>,
    action:Array<action>, // 操作集合
    result?:{err:number,log:string}; //实际结果 
    state?:string; 
    expect_status? : number,
    status?:number,
}

 export type Testcase ={
    testcase_name:string, //用例名称
    testcase_id : string, //用例ID
    remark:string, //用例操作
    agentList:Array<Agent>, //用例初始化节点列表
    taskList:Array<Task>, //用例执行任务列表
    environment : string; //环境
    taskMult:number, //任务的并发数量限制
    success?:number,
    failed?:number,
    result?:number,
    errorList?:Array<{task_id?:string,
        err? : number,
        log?: string}>
}




export class TestRunner{
    private Testcase? : Testcase;// 测试用例
    private m_interface:TaskClientInterface; //测试框架接口
    private m_bdtProxy : BdtProxy; //bdt 协议栈测试管理
    private log : Logger; //日志
    private state : string; //用例执行状态，用例做控制
    private begin_time?: number;
    private end_time?:number;
    //private m_testcaseId : string;
    constructor(_interface:TaskClientInterface){
        this.m_interface = _interface;
        this.log = this.m_interface.getLogger();
        this.m_bdtProxy = new BdtProxy(_interface,timeout); 
        this.state = "wait";
        //this.m_testcaseId = `BDT_${Date.now()}` ;
    }


    async connectAgent(){
        let promiseList:Array<any> = [];
        for(let i in this.Testcase!.agentList){
            promiseList.push( new Promise(async(V)=>{
                
                let agent = await this.m_interface.getAgent({} as any, [this.Testcase!.agentList[i].name],[],[], timeout);
                if (agent.err || agent.agentid == undefined ) {
                    this.log.error(`连接测试节点 ${this.Testcase!.agentList[i].name}失败`)
                    V({err:BDTERROR.LNAgentError,log:"连接测试节点失败",info:agent})
                    return
                }
                this.Testcase!.agentList[i].agentid = agent.agentid!;
                //启动测试服务
                let init_err = true;
                setTimeout(async()=>{
                    if(init_err){
                        this.log.error(`${this.Testcase!.agentList[i].agentid}测试节点启动服务失败`)
                        return  V({err:BDTERROR.LNAgentError,log:`测试节点启动服务失败:${this.Testcase!.agentList[i].agentid }`})
                    }
                },10*1000)
                let err = await this.m_interface.startService([], this.Testcase!.agentList[i].agentid!, timeout);
                init_err = false;
                if (err) {
                    this.log.error(`${this.Testcase!.agentList[i].name}测试节点启动服务失败`)
                    return V({err:BDTERROR.LNAgentError,log:"测试节点启动服务失败"})
                }
                await sleep(2000);
                //检查IP是否变化
                let IPInfo = await this.m_interface.callApi('getIPInfo', Buffer.from(''), {}, this.Testcase!.agentList[i].agentid!, timeout);
                this.log.info(`${this.Testcase!.agentList[i].name} get ipinfo = ${JSON.stringify(IPInfo)}`)
                if(IPInfo.err || IPInfo.value.ipInfo.IPv4 == undefined  || IPInfo.value.ipInfo.IPv6 == undefined){
                    this.log.error(`${this.Testcase!.agentList[i].name}查询节点IP失败`)
                    
                    return V({err:BDTERROR.LNAgentError,info:IPInfo,log:"查询节点IP失败"})
                }
                let ipv4s : Array<string> = IPInfo.value.ipInfo.IPv4;
                let ipv6s : Array<string> = IPInfo.value.ipInfo.IPv6;
                let ipList = ipv4s.concat(ipv6s);
                let eps = this.Testcase!.agentList[i].eps;
                for(let x=0;x<eps.length;x++){
                    let ip = eps[x].substring(5);
                    let contain = false;
                    for(let j=0;j<ipList.length;j++){
                        if(ip.indexOf(ipList[j])!=-1 || ip.indexOf('[::]')!=-1){
                            contain = true;
                        }
                    }
                    if(contain==false){
                        this.log.error(`节点${this.Testcase!.agentList[i].name} IP:${JSON.stringify(IPInfo)} EP:${JSON.stringify(eps)}`);
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
                runAgent.push(this.Testcase!.agentList[i])
            }
        }
        this.Testcase!.agentList = runAgent;
        return  {err:BDTERROR.success,log:"连接测试节点成功"}
    }
    async saveTestcaseToMysql(){
        //(1)保存testcase
        this.log.info(`api/bdt/testcase/add req: ${JSON.stringify(this.Testcase!.testcase_id)}`)
        this.log.info(`###开始保存测试数据`)
        let run = await request("POST","api/bdt/testcase/add",{
            testcase_name:this.Testcase!.testcase_name,
            testcase_id:this.Testcase!.testcase_id,
            remark:this.Testcase!.remark,
            agentList: JSON.stringify(this.Testcase!.agentList),
            taskList: this.Testcase!.taskList.length,
            environment:this.Testcase!.environment,
            taskMult:this.Testcase!.taskMult,
            result: this.Testcase!.result,
            errorList : JSON.stringify(this.Testcase!.errorList),
            success : this.Testcase!.success!,
            failed : this.Testcase!.failed!,
        },ContentType.json)
        this.log.info(`api/bdt/testcase/add resp: ${JSON.stringify(run)}`)
        let runList = [];
        let multRun = 0;
        for(let i in this.Testcase!.taskList){
            multRun = multRun + 1;
            runList.push(new Promise(async(V)=>{
                this.log.info(`测试任务${i}: LN :${this.Testcase!.taskList[i].LN.name} RN :${this.Testcase!.taskList[i].RN.name}`)
                if(!this.Testcase!.taskList[i].result){
                    this.log.error(`测试任务${i} result = ${JSON.stringify(this.Testcase!.taskList[i].result)}`)
                    //this.Testcase!.taskList[i].result = {err:0,log:"执行成功"}
                }
                this.log.info(`api/bdt/task/add req: ${this.Testcase!.testcase_id}_task${i}`)
                let run_task =await request("POST","api/bdt/task/add",{
                    task_id:`${this.Testcase!.testcase_id}_task${i}`,
                    testcase_id:this.Testcase!.testcase_id,
                    LN:this.Testcase!.taskList[i].LN.name,
                    RN:this.Testcase!.taskList[i].RN.name,
                    LN_NAT:this.Testcase!.taskList[i].LN.type,
                    RN_NAT:this.Testcase!.taskList[i].RN.type,
                    conn:JSON.stringify(this.Testcase!.taskList[i].conn),
                    action:JSON.stringify(this.Testcase!.taskList[i].action),
                    result:JSON.stringify(this.Testcase!.taskList[i].result),
                    status : this.Testcase!.taskList[i].result!.err.toString(),
                    expect_status : this.Testcase!.taskList[i].expect_status!.toString()
                },ContentType.json)
                this.log.info(`api/bdt/task/add resp:  ${JSON.stringify(run_task)}`)
                for(let j in this.Testcase!.taskList[i].action){
                    
                    this.log.info(`测试任务${i}: 操作 ${j}: ${this.Testcase!.taskList[i].action[j].type}`)
                    this.log.info(`${JSON.stringify(this.Testcase!.taskList[i].action[j])}`)
                    for(let x in this.Testcase!.taskList[i].action[j].datas!){
                        let type = this.Testcase!.taskList[i].action[j].type;
                        if(this.Testcase!.taskList[i].action[j].datas![Number(x)].type){
                            type = this.Testcase!.taskList[i].action[j].datas![Number(x)].type!;
                        }
                        this.log.info(`api/bdt/action/add req: ${this.Testcase!.testcase_id}_task${i} ${type}`)
                        
                        let run_action =await request("POST","api/bdt/action/add",{
                            task_id:`${this.Testcase!.testcase_id}_task${i}`,
                            testcase_id:this.Testcase!.testcase_id,
                            type:type,
                            timeout:this.Testcase!.taskList[i].action[j].timeout,
                            fileSize:this.Testcase!.taskList[i].action[j].fileSize,
                            chunkSize:this.Testcase!.taskList[i].action[j].chunkSize,
                            connect_time:this.Testcase!.taskList[i].action[j].datas![Number(x)].connect_time,
                            conn_name:this.Testcase!.taskList[i].action[j].datas![Number(x)].conn_name,
                            send_time:this.Testcase!.taskList[i].action[j].datas![Number(x)].send_time,
                            set_time:this.Testcase!.taskList[i].action[j].datas![Number(x)].set_time,
                            hash_LN:this.Testcase!.taskList[i].action[j].datas![Number(x)].hash_LN,
                            hash_RN:this.Testcase!.taskList[i].action[j].datas![Number(x)].hash_RN,
                            dir_file_number : this.Testcase!.taskList[i].action[j].fileNum,
                            range: this.Testcase!.taskList[i].action[j].range,
                            progress : this.Testcase!.taskList[i].action[j].datas![Number(x)].record,
                            result:JSON.stringify(this.Testcase!.taskList[i].action[j].result),
                            expect:JSON.stringify(this.Testcase!.taskList[i].action[j].expect),
                        },ContentType.json)
                        this.log.info(`api/bdt/action/add resp:${JSON.stringify(run_action)}`);
                        await sleep(100);
                        
                    }                
                }
                multRun = multRun -1;
                V("")
            }))
            while(multRun>10){
                await sleep(2000);
            }
        }
        for(let i in runList){
            await runList[i]
        }
        return 
    }
    async runPerfStream(){
        for(let i in this.Testcase!.taskList){
            this.log.info(`性能统计测试任务${i}: LN :${this.Testcase!.taskList[i].LN.name} RN :${this.Testcase!.taskList[i].RN.name}`)
            let max_time = 0;
            let min_time = 0;
            let total_number = 0;
            let total_time = 0;
            let avg_time = 0;
            for(let j in this.Testcase!.taskList[i].action){
                this.log.info(`测试任务${i}: 操作 ${j}: ${this.Testcase!.taskList[i].action[j].type}`)
                this.log.info(`${JSON.stringify(this.Testcase!.taskList[i].action[j])}`)
                if(this.Testcase!.taskList[i].action[j].type==taskType.send_stream || this.Testcase!.taskList[i].action[j].type==taskType.send_stream_all){
                    for(let x in this.Testcase!.taskList[i].action[j].datas!){
                        total_number = total_number + 1;
                        total_time =total_time + this.Testcase!.taskList![i].action![j].datas![x]!.send_time!
                        if(this.Testcase!.taskList![i].action![j].datas![x]!.send_time!>max_time){
                            max_time = this.Testcase!.taskList![i].action![j].datas![x]!.send_time!
                        }
                        if(this.Testcase!.taskList![i].action![j].datas![x]!.send_time!<min_time){
                            min_time = this.Testcase!.taskList![i].action![j].datas![x]!.send_time!
                        }
                    }
                }
                                
            }
            avg_time = total_time/total_number;
            this.log.info(`####运行总数：${total_number}`)
            this.log.info(`####最大时间：${max_time}`)
            this.log.info(`####最小时间：${min_time}`)
            this.log.info(`####平均时间：${avg_time}`)
        }
    }
    async exitTestcase(result:number,log:string){
        //判断实际结果与预期结果差别
        
        this.log.error(`result = ${result},log =${log}`)
        if(this.state != "end"){
            this.end_time = Date.now();
            this.state = "end";
            //释放bdt节点 
            let run = await this.saveTestcaseToMysql();
            let exit =this.m_bdtProxy.exit();
            //保存用例数据,打印测试记录
            //let recordPath = path.join(__dirname,"result.json");
            //fs.writeFileSync(recordPath,JSON.stringify(this.Testcase));
            await exit;
            //计算测试数据性能
            //await this.runPerfStream();
            this.log.error(`####运行耗时：${this.end_time! - this.begin_time!}`)
            //退出测试框架
            if(result){
                this.log.error(`##测试用例执行完成，${this.Testcase!.testcase_id}`)
                this.log.error(JSON.stringify(this.Testcase!.errorList))
                await this.m_interface.exit(ClientExitCode.failed,log,timeout);
            
            }else{
                this.log.error(`##测试用例执行完成，${this.Testcase!.testcase_id}`)
                await this.m_interface.exit(ClientExitCode.succ,log,timeout);
            }
            
            return;
        }   
    }

    async stopPerf(agent:number) {
        //性能检测
        for(let i=0;i<3;i++){
            await sleep(10*1000)
            this.m_interface.getLogger().info(`等待内存释放10s`)
        }
        for(let i in this.Testcase!.agentList){
            if(this.Testcase!.agentList[i].perf){
                let param = {
                }
                let info =await this.m_interface.callApi('stop_bdt_cpu_mem', Buffer.from(''), param, this.Testcase!.agentList[i].agentid!,timeout )
                if(info.err){
                    this.log.error(`${this.Testcase!.agentList[i].name} 停止性能监听失败`)
                    return info;
                }
            }
        }
        
    } 
    async startPerf(){
        for(let i in this.Testcase!.agentList){
            if(this.Testcase!.agentList[i].perf){
                let param = {
                    sum : this.Testcase!.agentList[i].perf!.CpuCheckTime,
                    wait : this.Testcase!.agentList[i].perf!.CpuCheckWait,
                    agent:this.Testcase!.agentList[i].name,
                    testcase_id:this.Testcase!.testcase_id,
                    timeout : timeout
                }
                let info =await this.m_interface.callApi('report_cpu_mem', Buffer.from(''), param,this.Testcase!.agentList[i].agentid!,timeout )
                if(info.err){
                    this.log.error(`${this.Testcase!.agentList[i].name} 启动性能监听失败`)
                    return info;
                }
            }
        }
        return {err:0,log:"启动性能监听完成"}
        
    }
    async initBdtPeer(){
        //(1)启动协议栈
        let checkPromise:Array<any> = []
        for(let i in this.Testcase!.agentList){
            checkPromise.push(new Promise(async(V)=>{
                for(let j = 0 ;j<this.Testcase!.agentList[i].agentMult!;j++){
                    this.log.info(`${this.Testcase!.agentList[i].name!} begin initStartBDTpeer  ${i} ,EP = ${JSON.stringify(this.Testcase!.agentList[i].eps)}`)
                    let peer = await this.m_bdtProxy.newPeer(this.Testcase!.agentList[i].agentid!,`${this.Testcase!.agentList[i].name!}_${j}`,this.Testcase!.agentList[i].NAT);
                    await peer.init();
                    if(this.Testcase!.agentList[i].PN){
                        let err = await peer.start(this.Testcase!.agentList[i].eps,'',this.Testcase!.agentList[i].SN,[],this.Testcase!.agentList[i].logType,this.Testcase!.agentList[i].PN!.activePnFiles,this.Testcase!.agentList[i].PN!.passivePnFiles,this.Testcase!.agentList[i].PN!.knownPeerFiles,this.Testcase!.agentList[i].chunk_cache);
                        if(err){
                            this.log.error(`${this.Testcase!.agentList[i].name} 初始化BDT协议栈 ${j} 失败`);
                            V({err:BDTERROR.initPeerFailed,log:`${this.Testcase!.agentList[i].name} 初始化BDT协议栈 ${j} 失败`});
                        }
                    }else{
                        let err = await peer.start(this.Testcase!.agentList[i].eps,'',this.Testcase!.agentList[i].SN,[],this.Testcase!.agentList[i].logType,[],[],[],this.Testcase!.agentList[i].chunk_cache);
                        if(err){
                            //初始化协议栈失败退出
                            this.log.error(`${this.Testcase!.agentList[i].name} 初始化BDT协议栈 ${j} 失败`);
                            V({err:BDTERROR.initPeerFailed,log:`${this.Testcase!.agentList[i].name} 初始化BDT协议栈 ${j} 失败`});
                        }
                    }
                    V({err:BDTERROR.success,log:`${this.Testcase!.agentList[i].name} 初始化BDT协议栈 ${j}成功`})
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
                    // if(this.m_bdtProxy.m_peers[i].peername === peerName){
                    // }
                    
                });
            }
            v("run all")
        })
        await acceptPromise; //确保所有节点都先运行了autoaccept
        while(this.state == "run"){
            await sleep(5000)
        }
    }


    /**
     * 建立一次连接操作
     * @param i 任务ID
     * @param j 操作ID
     */
    async connect(i:number,j:number){
        //建立连接
        let info =  await this.Testcase!.taskList[i].LN!.peer!.connect(this.Testcase!.taskList[i].RN!.peer!,"", 1) 
        if(info.err){
            this.Testcase!.taskList[i].action[j].datas!.push({
                result:info.err,
            })
            return {err:BDTERROR.connnetFailed,log:`${this.Testcase!.taskList[i].LN!.peer!.tags} conenct ${this.Testcase!.taskList[i].RN!.peer!.tags!} failed,err=${info.err}`}
        }
        this.Testcase!.taskList[i].conn!.push(info.conn!.connName!); 
        this.Testcase!.taskList[i].action[j].datas!.push({
            connect_time:info.time!,
            conn_name:info.conn!.connName,
            result:info.err,
        })
        //校验RN 连接成功
        let check = await this.Testcase!.taskList[i].RN!.peer!.containConn(info.conn!.connName,this.Testcase!.taskList[i].LN!.peer!.peerid);
        if(check.err){
            return {err:BDTERROR.connnetFailed,log:`${this.Testcase!.taskList[i].LN!.peer!.tags} conenct ${this.Testcase!.taskList[i].RN!.peer!.tags!} success, ,check RN connName failed`}
        }else{
            this.log.info(`${this.Testcase!.taskList[i].LN!.peer!.tags} conenct ${this.Testcase!.taskList[i].RN!.peer!.tags!} success,time = ${info.time!}`)
        }
        return {err:BDTERROR.success,log:"连接成功"}
    }

    async connect_reverse(i:number,j:number){
        //建立连接
        let info =  await this.Testcase!.taskList[i].RN!.peer!.connect(this.Testcase!.taskList[i].LN!.peer!,"", 1) 
        if(info.err){
            this.Testcase!.taskList[i].action[j].datas!.push({
                result:info.err,
            })
            return {err:BDTERROR.connnetFailed,log:`${this.Testcase!.taskList[i].LN!.peer!.tags} connect_reverse ${this.Testcase!.taskList[i].RN!.peer!.tags!} failed,err=${info.err}`}
        }
        this.Testcase!.taskList[i].conn!.push(info.conn!.connName!); 
        this.Testcase!.taskList[i].action[j].datas!.push({
            connect_time:info.time!,
            conn_name:info.conn!.connName,
            result:info.err,
        })
        //校验RN 连接成功
        let check = await this.Testcase!.taskList[i].RN!.peer!.containConn(info.conn!.connName,this.Testcase!.taskList[i].LN!.peer!.peerid);
        if(check.err){
            return {err:BDTERROR.connnetFailed,log:`${this.Testcase!.taskList[i].LN!.peer!.tags} connect_reverse ${this.Testcase!.taskList[i].RN!.peer!.tags!} success, ,check LN connName failed`}
        }else{
            this.log.info(`${this.Testcase!.taskList[i].LN!.peer!.tags} conenct ${this.Testcase!.taskList[i].RN!.peer!.tags!} success,time = ${info.time!}`)
        }
        return {err:BDTERROR.success,log:"连接成功"}
    }

    /**
     * 并行发起建立连接操作
     * @param i 任务ID
     * @param j 操作ID
     */
    async connect_mult(i:number,j:number){
        //建立连接
        let connPromise:Array<any> = [];
        for(let x =0;x<this.Testcase!.taskList[i].action[j].mult!;x++){
            connPromise.push(new Promise(async(R)=>{
                let info =  await this.Testcase!.taskList[i].LN!.peer!.connect(this.Testcase!.taskList[i].RN!.peer!,"", 1) 
                R(info);
            }))
        }
        for(let x in connPromise){
            let info =  await connPromise[x]
            if(info.err){
                return {err:BDTERROR.connnetFailed,log:`${this.Testcase!.taskList[i].LN!.peer!.tags} conenct ${this.Testcase!.taskList[i].RN!.peer!.tags!} failed,err=${info.err}`}
            }
            let check = await this.Testcase!.taskList[i].RN!.peer!.containConn(info.conn!.connName,this.Testcase!.taskList[i].LN!.peer!.peerid);
            if(check.err){
                return {err:BDTERROR.connnetFailed,log:`${this.Testcase!.taskList[i].LN!.peer!.tags} conenct ${this.Testcase!.taskList[i].RN!.peer!.tags!} success, ,check RN connName failed`}
            }
            this.Testcase!.taskList[i].conn!.push(info.conn!.connName!); 
            this.Testcase!.taskList[i].action[j].datas!.push({
                connect_time:info.time!,
                conn_name:info.conn!.connName,
                result:info.err
            })
        }
        return {err:BDTERROR.success,log:"连接成功"}
    }
    /**
     * 建立一次连接 + 发送一次stream操作
     * @param i 任务ID
     * @param j 操作ID
     */
    async connect_send_stream(i:number,j:number){
        //建立连接+发送stream
        // LN发起connect
        let info =  await this.Testcase!.taskList[i].LN!.peer!.connect(this.Testcase!.taskList[i].RN!.peer!,"", 1) 
        if(info.err){
            return {err:BDTERROR.connnetFailed,log:`${this.Testcase!.taskList[i].LN!.peer!.tags} conenct ${this.Testcase!.taskList[i].RN!.peer!.tags!} failed,err=${info.err}`}
        }
        // 校验RNaccept
        let check = await this.Testcase!.taskList[i].RN!.peer!.containConn(info.conn!.connName,this.Testcase!.taskList[i].LN!.peer!.peerid);
        if(check.err){
            return {err:BDTERROR.connnetFailed,log:`${this.Testcase!.taskList[i].LN!.peer!.tags} conenct ${this.Testcase!.taskList[i].RN!.peer!.tags!} success, ,check RN connName failed`};
        }
        this.Testcase!.taskList[i].conn!.push(info.conn!.connName);
        // RN 调用recv
        let recvPromise =  check.conn!.recvFile();
        await sleep(5*1000)
        // LN 调用send
        let sendInfo = await info.conn!.sendFile(this.Testcase!.taskList[i].action[j].fileSize!);
        if(sendInfo.err){
            return {err:BDTERROR.sendDataFailed,log:`${this.Testcase!.taskList[i].LN!.peer!.tags} send stream to ${this.Testcase!.taskList[i].RN!.peer!.tags!} failed,err=${sendInfo.err}`};
        }
        let recv = await recvPromise;
        if(recv.err){
            return {err:BDTERROR.sendDataFailed,log:`${this.Testcase!.taskList[i].LN!.peer!.tags} recv stream to ${this.Testcase!.taskList[i].RN!.peer!.tags!} failed,err=${recv.err}`};
        }
        this.Testcase!.taskList[i].action[j].datas!.push({
            connect_time:info.time!,
            conn_name:info.conn!.connName,
            send_time:sendInfo.time,
            hash_LN:sendInfo.hash,
            hash_RN: recv.hash!,
            result:sendInfo.err,
        }) 
        return {err:BDTERROR.success,log:"连接发送数据成功"}
    }
    /**
     * 使用当前task 第一个连接发起一次stream操作
     * @param i 任务ID
     * @param j 操作ID
     */
    async send_stream(i:number,j:number){
        //利用现有的一个连接发送数据，默认使用第一个连接
        if( this.Testcase!.taskList[i].conn!.length == 0){
            return {err:BDTERROR.testDataError,log:`未建立连接就发送数据`}
        }
        let connName = this.Testcase!.taskList[i].conn![0];
        let connInfo =  this.Testcase!.taskList[i].LN!.peer!.getConnect(connName,this.Testcase!.taskList[i].RN!.peer!.peerid); 
        let connInfo_RN =  this.Testcase!.taskList[i].RN!.peer!.getConnect(connName,this.Testcase!.taskList[i].LN!.peer!.peerid);
        this.log.info(`${connInfo.conn!.connName} ${connInfo_RN.conn!.connName} 开始传输stream`) 
        if( connInfo.err || connInfo_RN.err){
            return {err:BDTERROR.testDataError,log:`${this.Testcase!.taskList[i].LN.name} 连接${connName}不存在`}
        }
        let conn = connInfo.conn!;
        // RN 调用recv
        let recvPromise =  connInfo_RN.conn!.recvFile();
        //await sleep(5*1000)
        let sendInfo = await conn!.sendFile(this.Testcase!.taskList[i].action[j].fileSize!);
        
        let recv = await recvPromise;
        this.Testcase!.taskList[i].action[j].datas!.push({
            conn_name:connName,
            send_time:sendInfo.time,
            hash_LN:sendInfo.hash,
            hash_RN: recv.hash!,
        }) 
        if(sendInfo.err){
            return {err:BDTERROR.sendDataFailed,log:`${this.Testcase!.taskList[i].LN!.peer!.tags} send stream to ${this.Testcase!.taskList[i].RN!.peer!.tags!} failed,err=${sendInfo.err}`};
        }
        if(recv.err){
            return {err:BDTERROR.sendDataFailed,log:`${this.Testcase!.taskList[i].LN!.peer!.tags} recv stream to ${this.Testcase!.taskList[i].RN!.peer!.tags!} failed,err=${recv.err}`};
        }
        return {err:BDTERROR.success,log:"连接发送数据成功"}
    }


    async send_stream_reverse(i:number,j:number){
        //利用现有的一个连接发送数据，默认使用第一个连接
        if( this.Testcase!.taskList[i].conn!.length == 0){
            return {err:BDTERROR.testDataError,log:`未建立连接就发送数据`}
        }
        let connName = this.Testcase!.taskList[i].conn![0];
        let connInfo =  this.Testcase!.taskList[i].LN!.peer!.getConnect(connName,this.Testcase!.taskList[i].RN!.peer!.peerid); 
        let connInfo_RN =  this.Testcase!.taskList[i].RN!.peer!.getConnect(connName,this.Testcase!.taskList[i].LN!.peer!.peerid);
        this.log.info(`${connInfo.conn!.connName} ${connInfo_RN.conn!.connName} 开始反向传输stream`) 
        if( connInfo.err || connInfo_RN.err){
            return {err:BDTERROR.testDataError,log:`${this.Testcase!.taskList[i].LN.name} 连接${connName}不存在`}
        }
        let conn = connInfo.conn!;
        // LN 调用recv
        let recvPromise =  connInfo.conn!.recvFile();
        await sleep(5*1000)
        let sendInfo = await connInfo_RN!.conn!.sendFile(this.Testcase!.taskList[i].action[j].fileSize!);
        
        let recv = await recvPromise;
        this.Testcase!.taskList[i].action[j].datas!.push({
            conn_name:connName,
            send_time:sendInfo.time,
            hash_LN:sendInfo.hash,
            hash_RN: recv.hash!,
        }) 
        if(sendInfo.err){
            return {err:BDTERROR.sendDataFailed,log:`${this.Testcase!.taskList[i].LN!.peer!.tags}  reverse send stream to ${this.Testcase!.taskList[i].RN!.peer!.tags!} failed,err=${sendInfo.err}`};
        }
        if(recv.err){
            return {err:BDTERROR.sendDataFailed,log:`${this.Testcase!.taskList[i].LN!.peer!.tags} reverse recv stream to ${this.Testcase!.taskList[i].RN!.peer!.tags!} failed,err=${recv.err}`};
        }
        return {err:BDTERROR.success,log:"连接发送数据成功"}
    }




    /**
     * 使用当前task 第一个连接 同时并发多个stream操作
     * @param i 任务ID
     * @param j 操作ID
     */
    async send_stream_mult(i:number,j:number){
        //利用现有的一个连接发送数据，默认使用第一个连接
        if( this.Testcase!.taskList[i].conn!.length == 0){
            return {err:BDTERROR.testDataError,log:`未建立连接就发送数据`}
        }
        let connName = this.Testcase!.taskList[i].conn![0];
        let connInfo =  this.Testcase!.taskList[i].LN!.peer!.getConnect(connName,this.Testcase!.taskList[i].RN!.peer!.peerid); 
        let connInfo_RN =  this.Testcase!.taskList[i].RN!.peer!.getConnect(connName,this.Testcase!.taskList[i].LN!.peer!.peerid); 
        if( connInfo.err || connInfo_RN.err){
            return {err:BDTERROR.testDataError,log:`${this.Testcase!.taskList[i].LN.name} 连接${connName}不存在`}
        }
        let conn = connInfo.conn!;
        // RN 调用recv
       
        await sleep(5*1000)
        let sendPromise:Array<any> = [];
        for(let x =0;x<this.Testcase!.taskList[i].action[j].mult!;x++){
            sendPromise.push(new Promise(async(R)=>{
                let recvPromise =  connInfo_RN.conn!.recvFile();
                let sendInfo = await conn!.sendFile(this.Testcase!.taskList[i].action[j].fileSize!);
                await recvPromise;
                R(sendInfo)
            }))
        }
        for(let x in sendPromise){
            let sendInfo = await sendPromise[x];
            if(sendInfo.err){
                return {err:BDTERROR.sendDataFailed,log:`${this.Testcase!.taskList[i].LN!.peer!.tags} send stream to ${this.Testcase!.taskList[i].RN!.peer!.tags!} failed,err=${sendInfo.err}`};
            }
            this.Testcase!.taskList[i].action[j].datas!.push({
                send_time:sendInfo.time,
                hash_LN:sendInfo.hash
            }) 
        }
        return {err:BDTERROR.success,log:"连接发送数据成功"}
    }
    /**
     * 使用当前task所有的连接并发发起操作
     * @param i 任务ID
     * @param j 操作ID
     */
    async send_stream_all(i:number,j:number){
        //利用现有的一个连接发送数据，默认使用第一个连接
        if( this.Testcase!.taskList[i].conn!.length == 0){
            return {err:BDTERROR.testDataError,log:`未建立连接就发送数据`}
        }
        
        let sendPromise:Array<any> = [];
        for(let y in this.Testcase!.taskList[i].conn!){
            sendPromise.push(new Promise(async(R)=>{
                let connName = this.Testcase!.taskList[i].conn![y];
                let connInfo =  this.Testcase!.taskList[i].LN!.peer!.getConnect(connName,this.Testcase!.taskList[i].RN!.peer!.peerid); 
                let connInfo_RN =  this.Testcase!.taskList[i].RN!.peer!.getConnect(connName,this.Testcase!.taskList[i].LN!.peer!.peerid); 
                if( connInfo.err || connInfo_RN.err){
                    return {err:BDTERROR.testDataError,log:`${this.Testcase!.taskList[i].LN.name} 连接${connName}不存在`}
                }
                let conn = connInfo.conn!;
                // RN 调用recv
                for(let x =0;x<this.Testcase!.taskList[i].action[j].mult!;x++){
                    let recvPromise =  connInfo_RN.conn!.recvFile();
                    let sendInfo = await conn!.sendFile(this.Testcase!.taskList[i].action[j].fileSize!);
                    let recvInfo = await recvPromise;
                    this.Testcase!.taskList[i].action[j].datas!.push({
                        send_time:sendInfo.time,
                        hash_LN:sendInfo.hash,
                        hash_RN:recvInfo.hash,
                    })
                }
                R({err:BDTERROR.success,log:"连接发送数据成功"})
            }))
            
        }
        for(let x in sendPromise){
            let sendInfo = await sendPromise[x];
            if(sendInfo.err){
                return {err:BDTERROR.sendDataFailed,log:`${this.Testcase!.taskList[i].LN!.peer!.tags} send stream to ${this.Testcase!.taskList[i].RN!.peer!.tags!} failed,err=${sendInfo.err}`};
            } 
        }
        return {err:BDTERROR.success,log:"连接发送数据成功"}
    }
    /**
     * 使用channel发送一个chunk
     * @param i 任务ID
     * @param j 操作ID
     */
    async send_chunk(i:number,j:number){
        let setChunk = await this.Testcase!.taskList[i].LN!.peer!.chunkSendFile(this.Testcase!.taskList[i].action[j].chunkSize!)
        if(setChunk.err){
            return{err:BDTERROR.setChunckFailed,log:`${this.Testcase!.taskList[i].LN!.peer!.tags} set chunk failed,err=${setChunk.err}`}
        }
        let revChunk = await this.Testcase!.taskList[i].RN!.peer!.chunkRecvFile(this.Testcase!.taskList[i].LN!.peer!,setChunk.chunkid!,timeout*2)
        if(revChunk.err){
            return{err:BDTERROR.interestChunkFailed,log:`${this.Testcase!.taskList[i].RN!.peer!.tags} recv chunk failed,err=${revChunk.err}`}
        }
        this.Testcase!.taskList[i].action[j].datas!.push({
            set_time : setChunk.time,
            send_time:revChunk.time,
            hash_LN: setChunk.chunkid!,
            hash_RN: revChunk.chunkId!,
    
        }) 
        return {err:BDTERROR.success,log:"连接发送数据成功"}
    }
    async send_chunk_list(i:number,j:number){
        let chunk_list = [];
        for(let x =0 ;x< this.Testcase!.taskList[i].action[j].fileNum!;x++){
            let setChunk = await this.Testcase!.taskList[i].RN!.peer!.chunkSendFile(this.Testcase!.taskList[i].action[j].chunkSize!)
            if(setChunk.err){
                return{err:BDTERROR.setChunckFailed,log:`${this.Testcase!.taskList[i].RN!.peer!.tags} set chunk failed,err=${setChunk.err}`}
            }
            chunk_list.push( {chunk_id:setChunk.chunkid!})
        }
        this.log.info(`${this.Testcase!.taskList[i].RN.name} send chunkList to ${this.Testcase!.taskList[i].LN.name} ,chunkList = ${JSON.stringify(chunk_list)} `)
        let revChunk = await this.Testcase!.taskList[i].LN!.peer!.interestChunkList(this.Testcase!.taskList[i].RN!.peer!,chunk_list,this.Testcase!.taskList[i].action[j].timeout)
        if(revChunk.err){
            return{err:BDTERROR.interestChunkFailed,log:`${this.Testcase!.taskList[i].LN!.peer!.tags} recv chunk failed,err=${revChunk.err}`}
        }
        this.Testcase!.taskList[i].action[j].datas!.push({
            send_time:revChunk.time,
            //hash_RN : JSON.stringify(chunk_list),
            hash_LN: revChunk.session!,
            record : revChunk.record
    
        }) 
        return {err:BDTERROR.success,log:"连接发送数据成功"}
    }
    /**
     * 使用channel发送一个file
     * @param i 
     * @param j 
     */
    async send_file(i:number,j:number){
        let setFile =  await this.Testcase!.taskList[i].RN!.peer!.startSendFile(this.Testcase!.taskList[i].action[j].fileSize!,"",this.Testcase!.taskList[i].action[j].chunkSize)
        if(setFile.err){
            return{err:BDTERROR.sendFileByChunkFailed,log:`${this.Testcase!.taskList[i].RN!.peer!.tags} set chunk failed,err=${setFile.err}`}
        }
        
        let recvFile = await this.Testcase!.taskList[i].LN!.peer!.startDownloadFile(setFile.fileName!,setFile.fileObject!,this.Testcase!.taskList[i].RN!.peer!.peerid,this.Testcase!.taskList[i].action[j].timeout);
        if(recvFile.err){
            return{err:BDTERROR.sendFileByChunkFailed,log:`${this.Testcase!.taskList[i].LN!.peer!.tags} recv file failed,err=${recvFile.err}`}
        }
        this.Testcase!.taskList[i].action[j].datas!.push({
            set_time : setFile.time,
            send_time:recvFile.time,
            hash_LN: recvFile.md5!,
            hash_RN: setFile.md5!,
    
        }) 
        return {err:BDTERROR.success,log:"连接发送数据成功"}
    }
    async send_file_range(i:number,j:number){
        let setFile =  await this.Testcase!.taskList[i].RN!.peer!.startSendFile(this.Testcase!.taskList[i].action[j].fileSize!,"",this.Testcase!.taskList[i].action[j].chunkSize)
        if(setFile.err){
            return{err:BDTERROR.sendFileByChunkFailed,log:`${this.Testcase!.taskList[i].RN!.peer!.tags} set chunk failed,err=${setFile.err}`}
        }
        
        let recvFile = await this.Testcase!.taskList[i].LN!.peer!.startDownloadFileRange(setFile.fileName!,setFile.fileObject!,this.Testcase!.taskList[i].RN!.peer!.peerid,this.Testcase!.taskList[i].action[j].timeout,this.Testcase!.taskList[i].action[j].range!);
        if(recvFile.err){
            return{err:BDTERROR.sendFileByChunkFailed,log:`${this.Testcase!.taskList[i].LN!.peer!.tags} recv file failed,err=${recvFile.err}`}
        }
        this.Testcase!.taskList[i].action[j].datas!.push({
            set_time : setFile.time,
            send_time:recvFile.time,
            hash_LN: recvFile.md5!,
            hash_RN: setFile.md5!,
    
        }) 
        return {err:BDTERROR.success,log:"连接发送数据成功"}
    }

    async send_file_mult(i:number,j:number){
        let setFile =  await this.Testcase!.taskList[i].LN!.peer!.startSendFile(this.Testcase!.taskList[i].action[j].fileSize!,"",this.Testcase!.taskList[i].action[j].chunkSize)
        if(setFile.err){
            return{err:BDTERROR.sendFileByChunkFailed,log:`${this.Testcase!.taskList[i].LN!.peer!.tags} set chunk failed,err=${setFile.err}`}
        }
        
        let recvFile = await this.Testcase!.taskList[i].RN!.peer!.startDownloadFile(setFile.fileName!,setFile.fileObject!,this.Testcase!.taskList[i].LN!.peer!.peerid,this.Testcase!.taskList[i].action[j].timeout);
        if(recvFile.err){
            return{err:BDTERROR.sendFileByChunkFailed,log:`${this.Testcase!.taskList[i].RN!.peer!.tags} recv file failed,err=${recvFile.err}`}
        }
        this.Testcase!.taskList[i].action[j].datas!.push({
            set_time : setFile.time,
            send_time:recvFile.time,
            hash_LN: setFile.md5!,
            hash_RN: recvFile.md5!,
    
        }) 
        return {err:BDTERROR.success,log:"连接发送数据成功"}
    }

    
    async start_report(){
        for(let i in this.Testcase!.agentList){
            if(this.Testcase!.agentList[i].report){
                let param = {
                    agent:this.Testcase!.agentList[i].name, 
                    testcase_id :this.Testcase!.testcase_id,
                    time:this.Testcase!.agentList[i].report_time
                }
                let info =await this.m_interface.callApi('start_report', Buffer.from(''), param,this.Testcase!.agentList[i].agentid!,timeout )
                if(info.err){
                    this.log.error(`${this.Testcase!.agentList[i].name} 启动性能监听失败`)
                    return info;
                }
            }
            
        }
        return {err:0,log:"启动性能监听完成"}
    }
    /**
     * 使用当前task 第一个连接 同时并发多个stream操作
     * @param i 任务ID
     * @param j 操作ID
     */
    async send_dir(i:number,j:number){
        // 利用现有的一个连接发送数据，默认使用第一个连接
        if( this.Testcase!.taskList[i].conn!.length == 0){
            return {err:BDTERROR.testDataError,log:`未建立连接就发送数据`}
        }
        // LN 先 set 本地文件,获取到object
        let dirName  = RandomGenerator.string(10);
        let setFile =  await this.Testcase!.taskList[i].RN!.peer!.startSendDir(dirName,this.Testcase!.taskList[i].action[j].fileNum!,this.Testcase!.taskList[i].action[j].fileSize!,this.Testcase!.taskList[i].action[j].chunkSize!)
        if(setFile.err){
            return{err:BDTERROR.sendFileByChunkFailed,log:`${this.Testcase!.taskList[i].RN!.peer!.tags} set chunk failed,err=${setFile.err}`}
        }
        //发送Object 数据
        let connName = this.Testcase!.taskList[i].conn![0];
        let connInfo_LN =  this.Testcase!.taskList[i].LN!.peer!.getConnect(connName,this.Testcase!.taskList[i].RN!.peer!.peerid); 
        let connInfo_RN =  this.Testcase!.taskList[i].RN!.peer!.getConnect(connName,this.Testcase!.taskList[i].LN!.peer!.peerid); 
        if( connInfo_LN.err || connInfo_RN.err){
            return {err:BDTERROR.testDataError,log:`${this.Testcase!.taskList[i].LN.name} 连接${connName}不存在`}
        }
        let conn = connInfo_RN.conn!;
        // RN 调用recv
        await sleep(5*1000)
        //下载 dir 对象
        this.log.info(`task ${i} ${this.Testcase!.taskList[i].RN!.peer!.tags} send dir obj to ${this.Testcase!.taskList[i].LN!.peer!.tags!} ,dir_id = ${setFile.dir_id}`)
        let recvPromise =  connInfo_LN.conn!.recvObject(`${dirName}_obj`,setFile.dir_id);
        let sendInfo = await conn!.sendObject(setFile.dir_id!,3);
        let recvInfo=  await recvPromise;
        if(sendInfo.err){
            return {err:BDTERROR.sendDataFailed,log:`${this.Testcase!.taskList[i].RN!.peer!.tags} send stream to ${this.Testcase!.taskList[i].LN!.peer!.tags!} failed,err=${sendInfo.err}`};
        }
        this.log.info(`${this.Testcase!.taskList[i].RN!.peer!.tags} send dir obj to ${this.Testcase!.taskList[i].LN!.peer!.tags!} ,dir_id = ${setFile.dir_id} ,run success`)
        this.Testcase!.taskList[i].action[j].datas!.push({
            send_time:sendInfo.time,
            hash_RN:sendInfo.hash,
            hash_LN :recvInfo.hash,
            conn_name : connInfo_RN.conn?.connName,
            type : taskType.send_dir_object
        }) 
        // 下载dir 内置file  对象
        let send_file_time = 0;
        for(let x =0;x<setFile.dir_map!.length;x++){
            this.log.info(`task ${i} dir_id = ${setFile.dir_id} send file object ${x} ${setFile.dir_map![x].file_id} `)
            let recvPromise =  connInfo_LN.conn!.recvObject(`${dirName}_obj`,setFile.dir_map![x].file_id);
            let sendInfo = await conn!.sendObject(setFile.dir_map![x].file_id,2);
            send_file_time= send_file_time + sendInfo.time!;
            let recvInfo=  await recvPromise;
            if(sendInfo.err){
                return {err:BDTERROR.sendDataFailed,log:`${this.Testcase!.taskList[i].RN!.peer!.tags} send stream to ${this.Testcase!.taskList[i].LN!.peer!.tags!} failed,err=${sendInfo.err}`};
            }
            
        }
        this.Testcase!.taskList[i].action[j].datas!.push({
            send_time:send_file_time,
            conn_name : connInfo_RN.conn?.connName,
            type : taskType.send_file_object
        }) 
        // RN 下载文件夹
        this.log.info(`task ${i} dir_id = ${setFile.dir_id} startDownloadDir `);
        let recvFile = await this.Testcase!.taskList[i].LN!.peer!.startDownloadDir(dirName,`${dirName}_obj`,setFile.dir_map_buffer!,setFile.dir_id!,this.Testcase!.taskList[i].RN!.peer!.peerid,this.Testcase!.taskList[i].action[j].timeout);
        if(recvFile.err){
            return{err:BDTERROR.sendFileByChunkFailed,log:`${this.Testcase!.taskList[i].RN!.peer!.tags} recv file failed,err=${recvFile.err}`}
        }
        this.Testcase!.taskList[i].action[j].datas!.push({
            set_time : setFile.time,
            hash_RN : setFile.session,
            send_time:recvFile.time, 
            hash_LN :   recvFile.session,
        }) 
        return {err:BDTERROR.success,log:"连接发送数据成功"}
    }
    async testCaseRunner(testcase:Testcase){
        this.state = "run";
        this.Testcase = testcase;
        // 一、测试环境初始化
        let startInfo = await this.connectAgent();
        // if(startInfo.err!){
        //     let info = await this.exitTestcase(BDTERROR.LNAgentError,`测试节点异常`);
        //     return info;
        // }
        // 二、执行测试操作
        //（1）启动性能监听
        // let perfInfo =  await this.startPerf();
        // if(perfInfo.err){
        //     let info = await this.exitTestcase(BDTERROR.LNAgentError,`启动性能监听失败`);
        //     return info;
        // }
        //（2）初始化BDT协议栈
        let initInfo =  await this.initBdtPeer();
        if(initInfo.err){
            let info = await this.exitTestcase(BDTERROR.initPeerFailed,`初始化BDT协议栈失败`);
            return info;
        }
        //(3) 节点运行 bdt cyfs库的性能监听
        await this.start_report();
        this.initEvent(); // 启动accept event
        await sleep(5000);
        let runNum = 0;
        let endNum = 0;
        this.begin_time = Date.now();
        // (3) 进行操作
        let taskRun :Array<any> = []
        for(let i in this.Testcase.taskList){
            runNum = runNum + 1;
            taskRun.push(new Promise<{err:number,log:string}>(async(V)=>{
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
                this.Testcase!.taskList[i].task_id = `${this.Testcase!.testcase_id}_task${i}`;
                this.Testcase!.taskList[i].conn!  = [];
                this.Testcase!.taskList[i].state = "run"
                //设置测试任务超时校验
                if(!this.Testcase!.taskList[i].timeout){
                    this.Testcase!.taskList[i].timeout = 2*60*1000;
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
                    this.log.info(`###开始执行task ${i} ${j} action ${this.Testcase!.taskList[i].action[j].type}`)
                    this.Testcase!.taskList[i].action[j].datas = [];
                    switch(this.Testcase!.taskList[i].action[j].type){
                        case taskType.connect : {
                            this.Testcase!.taskList[i].action[j].result =  await this.connect(Number(i),Number(j));
                            break;
                        }
                        case taskType.connect_second : {
                            this.Testcase!.taskList[i].action[j].result =  await this.connect(Number(i),Number(j));
                            break;
                        }
                        case taskType.connect_reverse : {
                            this.Testcase!.taskList[i].action[j].result =  await this.connect_reverse(Number(i),Number(j));
                            break;
                        }
                        case taskType.connect_mult : {
                            this.Testcase!.taskList[i].action[j].result =  await this.connect_mult(Number(i),Number(j));
                            break;
                        }
                        case taskType.connect_send_stream : {
                            this.Testcase!.taskList[i].action[j].result =  await this.connect_send_stream(Number(i),Number(j));
                            break;
                        }
                        case taskType.send_stream : {
                            this.Testcase!.taskList[i].action[j].result = await this.send_stream(Number(i),Number(j));
                            break;
                        }
                        case taskType.send_stream_reverse : {
                            this.Testcase!.taskList[i].action[j].result = await this.send_stream(Number(i),Number(j));
                            break;
                        }
                        case taskType.send_stream_mult : {
                            this.Testcase!.taskList[i].action[j].result = await this.send_stream_mult(Number(i),Number(j));
                            break;
                        }
                        case taskType.send_stream_all : {
                            this.Testcase!.taskList[i].action[j].result = await this.send_stream_all(Number(i),Number(j));
                            break;
                        }
                        case taskType.send_chunk : {
                            this.Testcase!.taskList[i].action[j].result = await this.send_chunk(Number(i),Number(j));
                            break;
                        }
                        case taskType.send_chunk_list : {
                            this.Testcase!.taskList[i].action[j].result = await this.send_chunk_list(Number(i),Number(j));
                            break;
                        }
                        case taskType.send_file : {
                            this.Testcase!.taskList[i].action[j].result = await this.send_file(Number(i),Number(j));
                            break;
                        }
                        case taskType.send_file_range : {
                            this.Testcase!.taskList[i].action[j].result = await this.send_file_range(Number(i),Number(j));
                            break;
                        }
                        case taskType.send_file_mult : {
                            this.Testcase!.taskList[i].action[j].result = await this.send_file_mult(Number(i),Number(j));
                            break;
                        }
                        case taskType.send_dir : {
                            this.Testcase!.taskList[i].action[j].result = await this.send_dir(Number(i),Number(j));
                            break;
                        }
                        case taskType.Always_Run_IM : {
                            this.Testcase!.taskList[i].action[j].result = await this.send_dir(Number(i),Number(j));
                            break;
                        }
                        case taskType.Always_Run_Web : {
                            this.Testcase!.taskList[i].action[j].result = await this.send_dir(Number(i),Number(j));
                            break;
                        }
                        case taskType.Always_Run_NFT : {
                            this.Testcase!.taskList[i].action[j].result = await this.send_dir(Number(i),Number(j));
                            break;
                        }
                        case taskType.Always_Run_Video : {
                            this.Testcase!.taskList[i].action[j].result = await this.send_dir(Number(i),Number(j));
                            break;
                        }
                        default:{
                            this.log.error(`task ${i} 操作的action ${this.Testcase!.taskList[i].action[j].type} 不存在`)
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
            await sleep(100);
            
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





