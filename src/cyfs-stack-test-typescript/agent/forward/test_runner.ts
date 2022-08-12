import {Logger, TaskClientInterface, ClientExitCode, sleep } from '../base';
import { EventEmitter } from 'events';
import { StackPeerProxy, StackPeer, StackError } from './peer'
import * as WSParams from "./proto"
import { request, ContentType } from "./fetch_task_status"

const timeout = 300 * 1000;

// 测试节点机器 
export type Agent = {
    // 初始化输入数据
    name: string, //名称标签
    cyfs_clients: Array<PeerInfo>
    agentMult?: number,  //节点运行模拟协议栈数量
    logType?: string, // 日志级别控制
    report?: boolean, //报错cyfs库的性能数据
    report_time?: number, //间隔时间
    // 测试执行生成数据
    agentid?: string, //节点对应的自动化测试框架节点
}

//测试节点机器 client 类型
type PeerInfo = {
    //初始化输入数据
    name: string, //   模拟协议栈 ${Agent.name}_0 、${Agent.name}_1 这样编号
    peer?: StackPeer, //协议栈client控制
    type?: string, //协议栈client 连接类型 runtime 、ood 、port
    SDK_type?: string,
    config?: any,  //协议栈配置文件 acl handler
    ws_port?: number, //独立协议栈的端口号
    http_port?: number //独立协议栈的端口号
}
function PeerInfo_toJson(peer: PeerInfo) {
    return {
        name: peer.name,
        type: peer.type,
        SDK_type: peer.SDK_type,
        device_id: peer.peer?.deviceId,
    }
}
function PeerInfoList_toJson(peers: Array<PeerInfo>) {
    let clients = []
    for (let i in peers) {
        clients.push({
            name: peers[i].name,
            type: peers[i].type,
            SDK_type: peers[i].SDK_type,
            device_id: peers[i].peer?.deviceId,
        })
    }
    return { clients: clients }
}
// 测试用例
export type Testcase = {
    //初始化输入数据
    TestcaseName: string, //用例名称
    testcaseId: string, //用例ID
    remark: string, //用例操作描述
    agentList: Array<Agent>, //用例初始化节点列表
    taskList: Array<Task>, //用例执行任务列表
    environment: string; //环境
    taskMult: number, //任务的并发数量限制
    test_date?: string,//执行日期
    // 测试执行生成数据
    success?: number, //task 失败数量
    failed?: number,  //task 成功数量
    result?: number,  //执行结果
    errorList?: Array<{
        task_id?: string,
        err?: number,
        log?: string
    }>
}



/**
 * case1 例如 put_object 操作Testcase 拆分
 * 
 * Task 只有一个  put_object
 * LN :  例如 ts_client_runtime
 * RN :  例如 rust_client_ood
 * 
 * action1:  LN put_object -> RN 
 * action2:  RN get_obejct 本地noc获取对象
 * 
 * 多个Task 运行可以为多个put_object操作并行执行
 */


/**
 * case2 例如一个群聊中 文件群发 Testcase 拆分
 * 
 * Task 代表一个用户发送一个文件，一个Task 可以拆分多个action操作
 * LN : 文件发送的客户端 例如 ts_client_runtime
 * RN : 文件发送的服务端 例如 rust_client_ood
 * clients : 要测试的协议栈节点
 * action1:  LN publish_file  用户上传文件到自己本地NDN 
 * action1:  LN put_object -> RN 群聊消息到群主OOD
 * action2:  RN start_task 下载文件 群主下载文件
 * action3:  RN put_object -> clients1 群主将消息发送到到 clients1
 * action4:  RN put_object -> clients1 群主将消息发送到到 clients1
 * action5:  clients1  start_task 下载文件 
 * action6:  clients2  start_task 下载文件 
 * 
 * 
 * 多个Task 运行可以为多个操作并行执行
 */

// 测试任务
export type Task = {
    //初始化输入数据
    LN: PeerInfo, // local 必须在线才能执行Task
    RN: PeerInfo,  // remote 必须在线才能执行Task
    clients?: Array<PeerInfo>, //批量操作节点,clients如果离线action不执行
    timeout?: number, //超时时间
    action: Array<Action>, // 任务中的操作集合
    child_action?: Array<Action>,
    expect?: { err: number, log: string }; //预期结果 
    // 测试执行生成数据
    result?: { err: number, log: string }; //实际结果 
    state?: string;  //任务执行状态
    task_id?: string,

}
// 测试操作
export type Action = {
    source: string,
    target?: string,
    type: string, //操作类型
    input_data: any,//操作输入数据，预留
    timeout?: number, //超时时间
    action_id?: string,
    parent_action?: string,
    data_size?: number, //操作数据大小
    opt_time?: number, //操作时间
    cache_size?: number,//数据预存量，比如本地有100万obejct,不一定用
    expect?: { err: number, log?: string }; //预期结果
    result?: { err: number, log: string,  output_data?: any}; //实际结果   
}


export class TestRunner extends EventEmitter {
    private Testcase?: Testcase;// 测试用例
    private m_interface: TaskClientInterface; //测试框架接口
    private m_cyfsProxy: StackPeerProxy; //测试节点管理
    private log: Logger; //日志
    private state: string; //用例执行状态，用例做控制
    private begin_time?: number;
    private end_time?: number;

    // 监听事件，handler 触发，节点panic 后的用例错误兼容
    on(event: 'unlive', listener: () => void): this;
    on(event: string, listener: (...args: any[]) => void): this {
        super.on(event, listener);
        return this;
    }

    once(event: 'unlive', listener: () => void): this;
    once(event: string, listener: (...args: any[]) => void): this {
        super.on(event, listener);
        return this;
    }
    constructor(_interface: TaskClientInterface) {
        super();
        this.m_interface = _interface;
        this.log = this.m_interface.getLogger();
        this.m_cyfsProxy = new StackPeerProxy(_interface, timeout);
        this.state = "wait";

    }

    /**
     * 连接测试框架机器
     */
    async connectAgent() {
        let promiseList: Array<any> = [];
        for (let i in this.Testcase!.agentList) {
            promiseList.push(new Promise(async (V) => {
                // 连接测试节点
                let agent = await this.m_interface.getAgent({} as any, [this.Testcase!.agentList[i].name], [], [], timeout);
                if (agent.err || agent.agentid == undefined) {
                    this.log.error(`连接测试节点 ${this.Testcase!.agentList[i].name}失败`)
                    V({ err: StackError.LNAgentError, log: "连接测试节点失败", info: agent })
                    return
                }
                this.Testcase!.agentList[i].agentid = agent.agentid!;
                //启动测试服务
                let init_err = true;
                setTimeout(async () => {
                    if (init_err) {
                        this.log.error(`${this.Testcase!.agentList[i].agentid}测试节点启动服务失败`)
                        return V({ err: StackError.LNAgentError, log: `测试节点启动服务失败:${this.Testcase!.agentList[i].agentid}` })
                    }
                }, 10 * 1000)
                let err = await this.m_interface.startService([], this.Testcase!.agentList[i].agentid!, timeout);
                init_err = false;
                if (err) {
                    this.log.error(`${this.Testcase!.agentList[i].name}测试节点启动服务失败`)
                    return V({ err: StackError.LNAgentError, log: "测试节点启动服务失败" })
                }
                await sleep(2000);

                V({ err: StackError.success })
            }))
        }
        let runAgent: Array<Agent> = [];
        for (let i in promiseList) {
            let check = await promiseList[i];
            if (!check.err) {
                runAgent.push(this.Testcase!.agentList[i])
            }
        }
        this.Testcase!.agentList = runAgent;
        return { err: StackError.success, log: "连接测试节点成功" }
    }

    async initCyfsPeer() {
        //(1)启动协议栈
        let promiseList: Array<any> = [];
        for (let i in this.Testcase!.agentList) {
            // 添加配置的client
            for (let j in this.Testcase!.agentList[i].cyfs_clients) {
                // 添加独立的Zone客户端
                promiseList.push(new Promise(async (V) => {
                    // 连接测试节点
                    let peer = this.m_cyfsProxy.newPeer(this.Testcase!.agentList[i].agentid!, this.Testcase!.agentList[i].cyfs_clients[j].name)
                    let start_client = await peer.start_client(this.Testcase!.agentList[i].cyfs_clients[j].type!, this.Testcase!.agentList[i].cyfs_clients[j].SDK_type!, this.Testcase!.agentList[i].logType!)
                    let open_client = await peer.open_stack(this.Testcase!.agentList[i].cyfs_clients[j].type!)
                    //cyfs 协议栈客户端连接失败只提醒
                    V({ err: StackError.success })
                }))
                await sleep(100);
            }
            if (this.Testcase!.agentList[i].agentMult) {
                for (let j = 0; j < this.Testcase!.agentList[i].agentMult!; j++) {
                    promiseList.push(new Promise(async (V) => {
                        let peer = this.m_cyfsProxy.newPeer(this.Testcase!.agentList[i].agentid!, `${this.Testcase!.agentList[i].name}_${j}`)
                        let run = await peer.start_client(this.Testcase!.agentList[i].cyfs_clients[j].type!, this.Testcase!.agentList[i].cyfs_clients[j].SDK_type!, this.Testcase!.agentList[i].logType!)
                        let open_client = await peer.open_stack(this.Testcase!.agentList[i].cyfs_clients[j].type!)
                        V({ err: StackError.success })
                    }))
                    await sleep(100);

                }
            }

        }
        for (let i in promiseList) {
            await promiseList[i];
        }
        return { err: StackError.success, log: ` 初始化cyfs client成功` }

    }

    async saveTestcaseToMysql() {
        //(1)保存testcase
        this.log.info(`api/cyfs/cyfs_testcase/add req: ${JSON.stringify(this.Testcase!.testcaseId)}`)
        this.log.info(`###开始保存测试数据`)
        let run = await request("POST", "api/cyfs/cyfs_testcase/add", {
            TestcaseName: this.Testcase!.TestcaseName,
            testcaseId: this.Testcase!.testcaseId,
            remark: this.Testcase!.remark,
            agentList: JSON.stringify(this.Testcase!.agentList),
            taskList: this.Testcase!.taskList.length,
            environment: this.Testcase!.environment,
            taskMult: this.Testcase!.taskMult,
            result: this.Testcase!.result,
            errorList: JSON.stringify(this.Testcase!.errorList),
            success: this.Testcase!.success!,
            failed: this.Testcase!.failed!,
            test_date: this.Testcase!.test_date!,
        }, ContentType.json)
        this.log.info(`api/bdt/testcase/add resp: ${JSON.stringify(run)}`)
        let runList = [];
        let multRun = 0;
        // 保存task 中操作
        for (let i in this.Testcase!.taskList) {
            multRun = multRun + 1;
            runList.push(new Promise(async (V) => {
                this.log.info(`测试任务${i}: LN :${this.Testcase!.taskList[i].LN.name} RN :${this.Testcase!.taskList[i].RN.name}`)
                this.log.info(`api/cyfs/cyfs_task req: ${this.Testcase!.taskList[i].task_id}`)
                let run_task = await request("POST", "api/cyfs/cyfs_task/add", {
                    testcaseId: this.Testcase!.testcaseId,
                    task_id: this.Testcase!.taskList[i].task_id,
                    LN: this.Testcase!.taskList[i].LN.name,
                    RN: this.Testcase!.taskList[i].RN.name,
                    clients: JSON.stringify(PeerInfoList_toJson(this.Testcase!.taskList[i].clients!)),
                    action: JSON.stringify(this.Testcase!.taskList[i].action),
                    child_action: JSON.stringify(this.Testcase!.taskList[i].child_action),
                    expect: JSON.stringify(this.Testcase!.taskList[i].expect),
                    result: JSON.stringify(this.Testcase!.taskList[i].result),
                    state: this.Testcase!.taskList[i].state,
                    timeout: this.Testcase!.taskList[i].timeout,
                }, ContentType.json)
                this.log.info(`api/cyfs/cyfs_task/add resp:  ${JSON.stringify(run_task)}`)
                for (let j in this.Testcase!.taskList[i].action) {

                    this.log.info(`测试任务${i}: 操作 ${j}: ${this.Testcase!.taskList[i].action[j].action_id}  ${this.Testcase!.taskList[i].action[j].type}`)
                    let run_action = await request("POST", "api/cyfs/cyfs_action/add", {
                        testcaseId: this.Testcase!.testcaseId,
                        task_id: this.Testcase!.taskList[i].task_id,
                        action_id: this.Testcase!.taskList[i].action[j].action_id,
                        parent_action: this.Testcase!.taskList[i].action[j].parent_action,
                        type: this.Testcase!.taskList[i].action[j].type,
                        source: this.Testcase!.taskList[i].action[j].source,
                        target: this.Testcase!.taskList[i].action[j].target,
                        input_data: JSON.stringify(this.Testcase!.taskList[i].action[j].input_data),
                        timeout: this.Testcase!.taskList[i].action[j].timeout,
                        data_size: this.Testcase!.taskList[i].action[j].data_size,
                        opt_time: this.Testcase!.taskList[i].action[j].opt_time,
                        cache_size: this.Testcase!.taskList[i].action[j].cache_size,
                        result: JSON.stringify(this.Testcase!.taskList[i].action[j].result),
                        expect: JSON.stringify(this.Testcase!.taskList[i].action[j].expect),
                    }, ContentType.json)
                    this.log.info(`api/cyfs/cyfs_action/add resp:${JSON.stringify(run_action)}`);

                }
                for (let j = 0; j < this.Testcase!.taskList[i].child_action!.length; j++) {

                    this.log.info(`测试任务${i}: 操作 ${j}: ${this.Testcase!.taskList[i].action[j].action_id}  ${this.Testcase!.taskList[i].action[j].type}`)
                    let run_action = await request("POST", "api/cyfs/cyfs_action/add", {
                        testcaseId: this.Testcase!.testcaseId,
                        task_id: this.Testcase!.taskList[i].task_id,
                        action_id: this.Testcase!.taskList[i].child_action![j].action_id,
                        parent_action: this.Testcase!.taskList[i].child_action![j].parent_action,
                        type: this.Testcase!.taskList[i].child_action![j].type,
                        source: this.Testcase!.taskList[i].child_action![j].source,
                        target: this.Testcase!.taskList[i].child_action![j].target,
                        input_data: JSON.stringify(this.Testcase!.taskList[i].child_action![j].input_data),
                        timeout: this.Testcase!.taskList[i].child_action![j].timeout,
                        data_size: this.Testcase!.taskList[i].child_action![j].data_size,
                        opt_time: this.Testcase!.taskList[i].child_action![j].opt_time,
                        cache_size: this.Testcase!.taskList[i].child_action![j].cache_size,
                        result: this.Testcase!.taskList[i].child_action![j].result,
                        expect: this.Testcase!.taskList[i].child_action![j].expect,
                    }, ContentType.json)
                    this.log.info(`api/cyfs/cyfs_action/add resp:${JSON.stringify(run_action)}`);

                }
                multRun = multRun - 1;
                V("")
            }))
            while (multRun > 10) {
                await sleep(2000);
            }
        }
        for (let i in runList) {
            await runList[i]
        }
        return
    }
    /**
     * 测试框架退出
     */
    async exitTestcase(result: number, log: string) {
        //判断实际结果与预期结果差别

        this.log.error(`result = ${result},log =${log}`)
        if (this.state != "end") {
            this.end_time = Date.now();
            this.state = "end";
            //释放测试节点 
            let exit = await this.m_cyfsProxy.exit();
            //保存测试数据
            let run = await this.saveTestcaseToMysql();
            this.log.error(`####运行耗时：${this.end_time! - this.begin_time!}`)
            //退出测试框架
            if (result) {
                this.log.error(`##测试用例执行完成，${this.Testcase!.testcaseId}`)
                this.log.error(JSON.stringify(this.Testcase!.errorList))
                await this.m_interface.exit(ClientExitCode.failed, log, timeout);

            } else {
                this.log.info(`##测试用例执行完成，${this.Testcase!.testcaseId}`)
                await this.m_interface.exit(ClientExitCode.succ, log, timeout);
            }
            return;
        }
    }

    async forward(task: number, action: number, type: string, message: any): Promise<{ err: number, log: string, output_data?: any }> {
        let source = this.m_cyfsProxy.getPeer(this.Testcase!.taskList[task].action[action].source)
        let target = this.m_cyfsProxy.getPeer(this.Testcase!.taskList[task].action[action].target!)
        if (source.err) {
            return { err: StackError.connect_cyfs_client_faild, log: `${this.Testcase!.taskList[task].action[action].source} getPeer error` };
        }
        if (target.err) {
            return { err: StackError.connect_cyfs_client_faild, log: `${this.Testcase!.taskList[task].action[action].target} getPeer error` };
        }
        let obj_type = this.Testcase!.taskList[task].action[action].input_data.obj_type;

        let forward_params: WSParams.ForwardRequest = {
            message_type: type,
            req: message,
            
        }
        let resp = await source.peer!.forward(obj_type, forward_params);
        if (resp.err) {
            return { err: resp.err, log: resp.log! };
        }
        this.Testcase!.taskList[task].action[action].opt_time = resp.opt_time;
        this.Testcase!.taskList[task].action[action].data_size = resp.data_size;
      
        return { err: StackError.success, log: `forward success`, output_data: resp.resp };
    }


    async testCaseRunner(testcase: Testcase): Promise<Testcase> {
        //(1) 连接测试框架节点
        this.state = "run";
        this.Testcase = testcase;
        let startInfo = await this.connectAgent();
        console.log(`connectAgent: ${JSON.stringify(startInfo)}`);
        //(2) 测试节点协议栈初始化
        let initInfo = await this.initCyfsPeer();
        console.log(`initCyfsPeer: ${JSON.stringify(initInfo)}`);
        if (initInfo.err) {
            let info = await this.exitTestcase(StackError.LNAgentError, `初始化BDT协议栈失败`);
            console.log(`初始化BDT协议栈失败`);
            return this.Testcase;
        }
        console.log(`start run case...`);
        //(3) 节点运行 bdt cyfs库的性能监听
        //await this.start_report();
        //(4) 节点监听事件注册 协议栈测试不一定需要
        // this.initEvent(); // 启动accept event

        //（5）开始执行测试任务
        let runNum = 0;
        let endNum = 0;
        this.begin_time = Date.now();
        let taskRun: Array<any> = []
        let error = StackError.success;
        this.Testcase!.errorList = [];
        let success = 0;
        let failed = 0;
        // 异步并行执行任务队列
        for (let i in this.Testcase.taskList) {
            // 执行队列自增
            runNum = runNum + 1;
            taskRun.push(new Promise<{ err: number, log: string }>(async (V) => {
                //this.Testcase!.taskList[i].task_id
                this.Testcase!.taskList[i].task_id = `${this.Testcase!.testcaseId}_task${i}`;
                // 判断机器状态是否正常，机器不正常
                if (this.m_cyfsProxy.getPeer(this.Testcase!.taskList[i].LN.name).err) {
                    runNum = runNum - 1;
                    return V({ err: StackError.LNAgentError, log: `测试节点离线： ${this.Testcase!.taskList[i].LN.name}` })
                }
                if (this.m_cyfsProxy.getPeer(this.Testcase!.taskList[i].RN.name).err) {
                    runNum = runNum - 1;
                    return V({ err: StackError.LNAgentError, log: `测试节点离线： ${this.Testcase!.taskList[i].RN.name}` })
                }
                await sleep(100);
                this.Testcase!.taskList[i].LN!.peer = this.m_cyfsProxy.getPeer(this.Testcase!.taskList[i].LN.name).peer!;
                this.Testcase!.taskList[i].RN!.peer = this.m_cyfsProxy.getPeer(this.Testcase!.taskList[i].RN.name).peer!;

                //获取要测试的两个协议栈
                this.log.info(`##当前运行任务数量${runNum}`)
                this.log.info(`##开始执行task ${i} LN: ${this.Testcase!.taskList[i].LN.name}  RN: ${this.Testcase!.taskList[i].RN.name}`)

                this.Testcase!.taskList[i].state = "run"
                //设置测试任务超时校验
                if (!this.Testcase!.taskList[i].timeout) {
                    this.Testcase!.taskList[i].timeout = 2 * 60 * 1000;
                }
                new Promise(async (X) => {
                    let date = Date.now()
                    while (Date.now() - date < this.Testcase!.taskList[i].timeout! && this.Testcase!.taskList[i].state == "run") {
                        this.log.info(`task ${i} await running ,run time = ${Date.now() - date} ms，state = ${this.Testcase!.taskList[i].state} `)
                        await sleep(5000)
                    }
                    this.log.info(`触发超时校验 task ${i} state : ${this.Testcase!.taskList[i].state} ，timeout= ${this.Testcase!.taskList[i].timeout}`)
                    if (this.Testcase!.taskList[i].state == "run") {
                        runNum = runNum - 1;
                        V({ err: StackError.timeout, log: `测试任务${i}运行超时` })
                    } else {
                        X("执行完成")
                    }
                })
                //执行测试任务中操作
                let error_break = false;
                this.Testcase!.taskList[i].child_action = [];
                for (let j in this.Testcase!.taskList[i].action) {
                    this.Testcase!.taskList[i].action[j].action_id = `${this.Testcase!.testcaseId}_task${i}_action${j}`;
                    if (error_break) {
                        break;
                    }
                    let result = { err: StackError.testDataError, log: "action is running" }
                    result = await this.forward(Number(i), Number(j), this.Testcase!.taskList[i].action[j].type, this.Testcase!.taskList[i].action[j].input_data);
                    console.log(`result: ${JSON.stringify(result)}`);
                    this.Testcase!.taskList[i].action[j].result = result;
                    // 实际结果和预期结果不匹配
                    if (this.Testcase!.taskList[i].action[j].result!.err != this.Testcase!.taskList[i].action[j].expect!.err) {
                        error_break = true;
                        this.Testcase!.taskList[i].state = "failed";
                        this.log.error(`### task ${i} ${j} 执行失败：预期结果 ${this.Testcase!.taskList[i].action[j].expect!.err} 实际结果 ${this.Testcase!.taskList[i].action[j].result!.err}`)
                        runNum = runNum - 1;
                        V(this.Testcase!.taskList[i].action[j].result!)
                    }
                    this.log.info(`### task ${i} ${j} 执行成功：预期结果 ${this.Testcase!.taskList[i].action[j].expect!.err} 实际结果 ${this.Testcase!.taskList[i].action[j].result!.err}`)
                }
                this.Testcase!.taskList[i].state = "success"
                this.log.info(`执行task -1,当前task:${runNum}`)
                runNum = runNum - 1;
                V({ err: StackError.success, log: "执行成功" })
            }))
            // 执行队列达到最大队列暂停
            while (runNum >= this.Testcase!.taskMult) {
                await sleep(2000)
                this.log.info(`当前task数量: ${runNum}, 达运行上限，等待2s，运行总数：${i}`)
            }
            await sleep(100);

        }
        // 等待任务队列执行完成
        for (let i in taskRun) {
            let result = await taskRun[i];
            this.log.info(`##### task ${i} 执行完成，result= ${JSON.stringify(result)}`)
            this.Testcase.taskList[i].result = result;
            if (result.err) {
                error = result.err;
                this.Testcase!.errorList!.push({
                    task_id: this.Testcase!.taskList[i].task_id,
                    err: result.err,
                    log: `task ${i} ,${result.log}`
                })
                failed = failed + 1;
            } else {
                success = success + 1;
            }
        }
        this.Testcase!.result = error;
        this.Testcase!.success = success;
        this.Testcase!.failed = failed;
        // 三、保存测试数据
        if (error) {
            await this.exitTestcase(StackError.reportDataFailed, "用例执行失败")
        } else {
            await this.exitTestcase(StackError.success, "用例执行完成")
        }

        return this.Testcase;

    }
}
