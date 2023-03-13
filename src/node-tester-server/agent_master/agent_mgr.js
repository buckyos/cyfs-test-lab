const fs = require('fs-extra');
const path = require('path');
const base = require('./common/base');
const Config = require('./common/config');
const {ErrorCode: NetworkErrorCode} = require('./tcp_server');
const Protocol = require('./protocol');
const ServiceStorage = require('./storage');

const AgentStatus = {
    offline: 0,
    online: 1,
};

const ServiceStatus = {
    stop: 0,
    running: 1,
};

const AgentScopeRule = {
    all: 1,
    accessible: 2,
    notAccessible: 3,
};

const TaskRunRule = {
    serial: 1,
    parallel: 2,
};

const TaskDistributeRule = {
    any: 1,
    serviceOnly: 2,
};

const TASK_TIMEOUT = 600000;

/**
 * 数据结构，意在直观地表述对象之间的相互关系，在后续维护中可能会修改，如果发现该文档没更新，请以storage.js文件里的加载结构为准，
 * 对象之间一般都是引用关系，如：service引用归属于它的所有tasks和jobs，tasks和jobs又都引用它所属的service
 * agentInfo = {
 *      agent: {    // agent信息
 *          agentId: string,
 *          version: string,
 *          platform: string,
 *          desc: string,
 *          accessible: bool,
 *          tags: [string],
 *      },
 *      netInfos: Map<netId, netInfo>, // 一个agent可能有多块网卡，分别属于不同的网络环境
 *      agentServiceInfos: Map<serviceId, {asInfo, serviceInfo}>, // 该agent上的service运行情况
 *      runningTaskIds: [], // 正在执行的任务ID
 *      runningTaskIdSet: null | new Set<taskid>
 *      synTime: int, // 最后一次同步状态(心跳)状态
 * }
 * 
 * netInfo = { // 网络环境
 *      netId: int,
 *      name: string,
 *      type: int,
 *      ipv4: [string],
 *      ipv6: [string],
 *      udpEnable: bool,
 *      tcpEnable: bool,
 * }
 * 
 * asInfo = { // as表示agent-service，相关agent上某个service的信息
 *      status: int, // 后台配置状态，标识测试人员希望它的运行状态，默认是运行
 *      iStatus: int, // 该agent上该service的即时运行状态，由agent上报，默认是未知状态
 *      // agentServiceInfos这个MAP中如果没有该service，标识我们希望该service在该agent上运行，但目前状态未知
 * }
 * 
 * serviceInfo = {
 *      service: {
 *          serviceId: int,
 *          serviceVersion: string,
 *          name: string,
 *          url: string,
 *          md5: string,
 *          status: int,
 *          rules: {
 *              agentScope: int, // 该service的部署范围
 *          }
 *      },
 *      serviceAgentInfos: Map<agentId, {asInfo, agentInfo}>, // 该service运行的agent情况
 *      taskInfos: Map<taskId, taskInfo>, // 属于该service的tasks
 *      jobInfos: Map<jobId, jobInfo>, // 属于该service的jobs
 * }
 * 
 * taskInfo = {
 *      task: {
 *          taskId: int,
 *          taskVersion: string,
 *          url: string,
 *          md5: string,
 *          params: [string],
 *          desc: string,
 *          rules: {
 *              run: int, // 运行规则
 *              distribute: int, // 部署规则
 *          },
 *      },
 *      serviceInfo, // 归属的service
 *      jobInfos: Map<jobId, jobInfo>, // 包含该task的所有jobs
 *      runLogs: Map<agentId, runLog>, // 该task当前的运行情况，一个task在一个agent上只能有一个执行实例，执行结束的数据将会从内存删除，记录到数据库
 * }
 * 
 * jobInfo = {
 *      job: {
 *          jobId: int,
 *          desc: string,
 *          rules: {
 *          },
 *      },
 *      serviceInfo,
 *      jobTaskInfos: Map<taskId, {runStatus, jobInfo, taskInfo}> // 该job包含的tasks信息和执行情况，taskInfo里只有相关的jobs信息，暂时没有从task查询它所有执行情况的需求
 * }
 * 
 * runStatus = {
 *      timesLimit: int,
 *      status: int,
 *      successTimes: int,
 *      failedTimes: int,
 *      runningTimes: 0,
 *      runLogs: Map<agentId, runLog>,
 * }
 * 
 * runLog = {
 *      logId: int,
 *      jobTaskInfo,
 *      taskVersion: string, // 本次执行时的task版本
 *      agentInfo,
 *      startTime: int,
 *      finishTime: int,
 *      errorCode: int,
 *      urls: [string],
 *      msg: string,
 *      deployFailed: bool, // 部署失败
 *      lastAliveTime: int,
 * }
 */

let g_lastTaskFinishTime = 0; // <TODO> test 最后一次任务完成时间

class AgentMgr {
    constructor() {
        this.m_serviceStorage = new ServiceStorage(Config.storagePath);

        this.m_clientConnectionMap = new Map(); // <`${agentId}`, connection>; connection.__agentInfo
        this.m_pkgHandleMap = new Map();
        this.m_pkgHandleMap.set('sys.heartbeat.req', (pkg, fromConnection) => this._handleHeartbeatReq(pkg, fromConnection));
        this.m_pkgHandleMap.set('sys.getagent.req', (pkg, fromConnection) => this._handleGetAgentReq(pkg, fromConnection));
        this.m_pkgHandleMap.set('sys.runtask.resp', (pkg, fromConnection) => this._handleRunTaskResp(pkg, fromConnection));
        this.m_pkgHandleMap.set('sys.taskfinish.req', (pkg, fromConnection) => this._handleTaskFinishReq(pkg, fromConnection));
       
        this.m_agents = new Map(); // <agentId, {agent: {agentId, ...}, netInfos: Map<netId, netInfo>, agentServiceInfos: Map<serviceId, {asInfo, serviceInfo}>, runningTaskIds: [], runningTaskIdSet, synTime}>
        this.m_services = new Map(); // <`${serviceId}`, {service, serviceAgentInfos: Map<agentId, {asInfo, agentInfo}>, taskInfos: Map<taskid, taskInfo>, jobInfos: Map<jobid, jobInfo>}>
        this.m_tasks = new Map(); // <`{taskid}`, {task, serviceInfo, jobInfos: Map<jobid, jobInfo>, runLogs: Map<agentId, {jobTaskInfo, ...}>}>
        this.m_jobs = new Map(); // <jobid, {job, serviceInfo, jobTaskInfos: Map<taskid, {runStatus: {runLogs, ...}, jobInfo, taskInfo}>>
        this.m_startingLogs = new Map(); // <seq, runLog>

        this.m_publish = undefined;

        this.m_timer = setInterval(() => {
            this._weakupFinishTasks();
        }, 10000);
    }

    async init() {
        {
            let err = await this.m_serviceStorage.init();
            if (err) {
                return err;
            }
        }

        let {err, services, agents, tasks, jobs, publish} = await this.m_serviceStorage.load();
        if (err) {
            return err;
        }

        this.m_services = services;
        this.m_agents = agents;
        this.m_tasks = tasks;
        this.m_jobs = jobs;
        this.m_publish = publish;
        return null;
    }

    getAgentKeyByConnection(connection) {
        return connection.__agentKey;
    }

    addNewConnection(connection, firstPkg) {
        if (connection.__agentKey) {
            base.blog.warn('re-add connection: ', connection.__agentKey);
            return null;
        }
        connection.__agentKey = this._makeAgentKeyByNameSpace(firstPkg.header.from);
        let oldConnection = this.m_clientConnectionMap.get(connection.__agentKey);
        if (oldConnection !== connection) {
            if (oldConnection) {
                base.blog.warn('dup connection: ', connection.__agentKey);
            } else {
                base.blog.info('new connection: ', connection.__agentKey);
            }

            connection.__agentInfo = this._checkAgent(firstPkg.header.from.agentId);
            connection.__agentInfo.lastTime = Date.now();
            this.m_clientConnectionMap.set(connection.__agentKey, connection);
            connection.__agentInfo.connection = connection;
        }

        // 搜索可执行任务
        for (let [jobId, jobInfo] of this.m_jobs) {
            if (this._dispatchJobToAgent(jobInfo, connection.__agentInfo)) {
                break;
            }
        }

        return oldConnection;
    }

    removeConnection(connection) {
        base.blog.info('remove connection: ', connection.__agentKey);
        if (connection.__agentKey) {
            const willRemoveConnection = connection.__agentInfo.connection;
            if (willRemoveConnection === connection) {
                connection.__agentInfo.connection = undefined;
                this.m_clientConnectionMap.delete(connection.__agentKey);
            }
        }
    }

    forEachConnections(proccess) {
        this.m_clientConnectionMap.forEach(proccess);
    }

    handle(pkg, fromConnection) {
        base.blog.debug('recv: cmd: ', JSON.stringify(pkg));

        fromConnection.__agentInfo.lastTime = Date.now();
        const redirectHandle = (pkg, fromConnection) => this._handleRedirectPkg(pkg, fromConnection);
        let pkgHandle = redirectHandle;
        // <TODO> if (pkg.body.to.agentId === AgentMgr.masterNameSpace)
        {
            pkgHandle = this.m_pkgHandleMap.get(pkg.header.name) || redirectHandle;
        }
        let result = pkgHandle(pkg, fromConnection);
        base.blog.info('handle result: ', result, ', cmd: ', JSON.stringify(pkg));
    }

    _makeAgentKeyByNameSpace(nameSpace) {
        return nameSpace.agentId;
    }

    _getAgentIdByAgentKey(agentKey) {
        return agentKey;
    }

    _getToConnectionForPkg(pkg) {
        const agentKey = this._makeAgentKeyByNameSpace(pkg.header.to);
        if (agentKey) {
            return this.m_clientConnectionMap.get(agentKey);
        }
        return null;
    }

    _checkAgent(agentId) {
        let agentInfo = this.m_agents.get(agentId);
        if (!agentInfo) {
            agentInfo = {
                agent: {
                    agentId: agentId,
                    version: '',
                    platform: '',
                    desc: '',
                    accessible: ServiceStorage.AccessibleStatus.not,
                    tags: [],
                },

                netInfos: new Map(),
                agentServiceInfos: new Map(),
                runningTaskIds: [],
                runningTaskIdSet: null,
                synTime: 0,
            };
            this.m_agents.set(agentInfo.agent.agentId, agentInfo);
            this.m_serviceStorage.addAgent(agentInfo.agent);
        }

        return agentInfo;
    }

    _handleHeartbeatReq(pkg, fromConnection) {
        let resp = {
            header: {
                name: 'sys.heartbeat.resp',
                seq: pkg.header.seq,
                to: pkg.header.from,
                from: pkg.header.to,
            },
            body: {
                services: [],
                invalidServices: [],
            },
        };

        const now = Date.now();
        let agentInfo = this._checkAgent(pkg.header.from.agentId);

        if (agentInfo.agent.version !== pkg.body.version || agentInfo.agent.platform !== pkg.body.platform) {
            agentInfo.agent.version = pkg.body.version;
            agentInfo.agent.platform = pkg.body.platform;
            this.m_serviceStorage.updateAgent(agentInfo.agent);
        }

        agentInfo.runningTaskIds = pkg.body.tasks;
        agentInfo.runningTaskIdSet = null;
        agentInfo.synTime = now;

        let runningServices = new Map();
        for (let runningService of pkg.body.services) {
            runningServices.set(runningService.serviceId, runningService);
            let serviceInfo = this.m_services.get(runningService.serviceId);
            if (!serviceInfo || // 下线
                !this._serviceDeployCheck(serviceInfo.service, agentInfo.agent)) {
                resp.body.invalidServices.push(runningService.serviceId.toString());
            } else {
                let agentServiceInfo = agentInfo.agentServiceInfos.get(runningService.serviceId);
                if (!agentServiceInfo) {
                    agentServiceInfo = {
                        asInfo: {
                            status: ServiceStatus.running,
                            iStatus: runningService.status, // 即时状态
                        },
                        serviceInfo,
                    };
                    agentInfo.agentServiceInfos.set(serviceInfo.service.serviceId, agentServiceInfo);
                    // <TODO>暂时好像没有必要记录某个service运行的agent列表
                } else {
                    agentServiceInfo.asInfo.iStatus = runningService.status;
                }

                if (agentServiceInfo.asInfo.status === ServiceStatus.stop) {
                    // 停止对应agent
                    resp.body.invalidServices.push(runningService.serviceId.toString());
                } else {
                    if (serviceInfo.service.serviceVersion !== runningService.version) {
                        // 更新
                        const service = serviceInfo.service;
                        resp.body.services.push({
                            serviceId: service.serviceId,
                            name: service.name,
                            url: select_url(service.url, agentInfo),
                            md5: service.md5,
                            version: service.serviceVersion,
                        });
                    }
                }
            }
        }

        this.m_services.forEach(serviceInfo => {
            if (!runningServices.get(serviceInfo.service.serviceId)) {
                if (this._serviceDeployCheck(serviceInfo.service, agentInfo.agent)) { // 符合部署规则
                    const agentServiceInfo = agentInfo.agentServiceInfos.get(serviceInfo.service.serviceId);
                    if (!agentServiceInfo || agentServiceInfo.asInfo.status === ServiceStatus.running) { // 没有禁止该agent
                        let service = serviceInfo.service;
                        resp.body.services.push({
                            serviceId: service.serviceId,
                            name: service.name,
                            url: select_url(service.url, agentInfo),
                            md5: service.md5,
                            version: service.serviceVersion,
                        });
                    }
                }
            }
        });

        this._sendPkg(resp, fromConnection);
    }

    _handleGetAgentReq(pkg, fromConnection) {
        let serviceInfo = this.m_services.get(pkg.body.serviceId);

        let resp = {
            header: {
                name: 'sys.getagent.resp',
                seq: pkg.header.seq,
                to: pkg.header.from,
                from: pkg.header.to,
            },
            body: {
                agentId: '',
                netInfo: null
            },
        };

        const selectMatchedNetInfo = (agentInfo, targetNetInfo) => {
            let okNetInfos = [];
            for (let [netId, netInfo] of agentInfo.netInfos) {
                let isNetOk = true;
                isNetOk = isNetOk && (targetNetInfo.name === '' || targetNetInfo.name === netInfo.name);
                isNetOk = isNetOk && (targetNetInfo.type === Protocol.Constant.netInfo.type.any || targetNetInfo.type === netInfo.type);
                isNetOk = isNetOk && (targetNetInfo.udpEnable === Protocol.Constant.netInfo.udpEnable.any || targetNetInfo.udpEnable === netInfo.udpEnable);
                isNetOk = isNetOk && (targetNetInfo.tcpEnable === Protocol.Constant.netInfo.tcpEnable.any || targetNetInfo.tcpEnable === netInfo.tcpEnable);
                if (isNetOk) {
                    okNetInfos.push(netInfo);
                }
            }
            return okNetInfos;
        }

        if (serviceInfo) {
            let okAgentIds = [];
            const targetNetInfo = pkg.body.netInfo;
            const excludeAgentIds = new Set(pkg.body.excludeAgentIds);
            const includeTags = new Set(pkg.body.includeTags);
            const excludeTags = new Set(pkg.body.excludeTags);
            let okNetInfos = new Map(); // <agentId, netInfo>
            for (const [agentId, agentInfo] of this.m_agents) {
                // <TODO>临时改成只向win32和linux下发任务
                // if (agentInfo.agent.platform != "win32" && agentInfo.agent.platform != "linux") {
                //     continue;
                // }
                if (!this._serviceDeployCheck(serviceInfo.service, agentInfo.agent)) {
                    continue;
                }
                const agentServiceInfo = agentInfo.agentServiceInfos.get(serviceInfo.service.serviceId);
                if (agentServiceInfo && agentServiceInfo.asInfo.status === ServiceStatus.stop) {
                    continue;
                }

                let isOk = !excludeAgentIds.has(agentInfo.agent.agentId) && this.m_clientConnectionMap.get(agentInfo.agent.agentId);

                let isIncludeTag = (includeTags.size === 0);
                for (const tag of agentInfo.agent.tags) {
                    if (excludeTags.has(tag)) {
                        isOk = false;
                        break;
                    }
                    isIncludeTag = isIncludeTag || includeTags.has(tag);
                }

                isOk = isOk && isIncludeTag;
                if (isOk && targetNetInfo) {
                    if (targetNetInfo) {
                        let selectedNetInfos = selectMatchedNetInfo(agentInfo, targetNetInfo);
                        if (selectedNetInfos.length > 0) {
                            okNetInfos.set(agentInfo.agent.agentId, selectedNetInfos);
                        } else {
                            isOk = false;
                        }
                    } else {
                        okNetInfos.set(agentInfo.agent.agentId, [... agentInfo.netInfos.values()]);
                    }
                }
    
                if (isOk) {
                    okAgentIds.push(agentInfo.agent.agentId);
                }
            }
    
            if (okAgentIds.length > 0) {
                let randomIndex = Math.round(Math.random() * (okAgentIds.length - 1));
                const selectAgentId = okAgentIds[randomIndex];
                const selectNetInfos = okNetInfos.get(selectAgentId);
                resp.body.agentId = selectAgentId;
                if (selectNetInfos) {
                    randomIndex = Math.round(Math.random() * (selectNetInfos.length - 1));
                    resp.body.netInfo = selectNetInfos[randomIndex];
                }
            }
        }

        // const testBody = {
        //     agentId: 'DESKTOP-BGJ1GRK:{91E9CF2E-54AB-4AC1-9334-DF9B4C0A53F0}',
        //     netInfo: {
        //         name: 'officenet',
        //         type: Protocol.Constant.netInfo.type.wire,
        //         ipv4: ['192.168.100.124'],
        //         ipv6: [],
        //         udpEnable: Protocol.Constant.netInfo.udpEnable.open,
        //         tcpEnable: Protocol.Constant.netInfo.tcpEnable.open,
        //     }
        // };
        // resp.body = testBody;

        this._sendPkg(resp, fromConnection);
    }
    
    _handleRunTaskResp(pkg, fromConnection) {
        base.blog.info('run task resp(seq=', pkg.header.seq, '), from agent:', pkg.header.from.agentId);

        let startingLog = this.m_startingLogs.get(pkg.header.seq);
        if (!startingLog) {
            return;
        }

        const now = Date.now();
        this.m_startingLogs.delete(pkg.header.seq);
        
        let {taskInfo, jobInfo, runStatus} = startingLog.jobTaskInfo;

        if (pkg.body.err !== 0) {
            startingLog.deployFailed = true;
            startingLog.errorCode = AgentMgr.ErrorCode.deployFailed * 256 + pkg.body.err;
            startingLog.finishTime = now;
            this.m_serviceStorage.updateTaskLogFinish(startingLog);
            runStatus.runningTimes--;

            if (runStatus.runningTimes === 0) {
                g_lastTaskFinishTime = now;
            }
        }
    }

    _handleTaskFinishReq(pkg, fromConnection) {
        base.blog.info('task finish (jobid=', pkg.body.jobId, ',taskid=', pkg.body.taskId, '), code=', pkg.body.code, ',msg=', pkg.body.msg, ', from:', pkg.header.from.agentId);

        let taskInfo = this.m_tasks.get(pkg.body.taskId);
        if (!taskInfo) {
            return;
        }

        let runLog = taskInfo.runLogs.get(pkg.header.from.agentId);
        if (!runLog || runLog.jobTaskInfo.jobInfo.job.jobId !== pkg.body.jobId) {
            return;
        }

        let {jobInfo, runStatus} = runLog.jobTaskInfo;
        
        if (runLog.finishTime !== 0) {
            if (runLog.errorCode === AgentMgr.ErrorCode.timeout) {
                runStatus.runningTimes++;
                runStatus.failedTimes--;
                if (pkg.body.code === 0) {
                    this.m_serviceStorage.updateJobTaskFailedTimes(runLog.jobTaskInfo, jobInfo.job.jobId);
                }
            }
        }

        runLog.finishTime = Date.now();
        runLog.errorCode = pkg.body.code;
        runLog.msg = pkg.body.msg;

        if (runLog.errorCode === 0) {
            runStatus.successTimes++;
            this.m_serviceStorage.updateJobTaskSuccessTimes(runLog.jobTaskInfo, jobInfo.job.jobId);
        } else {
            runStatus.failedTimes++;
            runLog.urls = pkg.body.urls;
            this.m_serviceStorage.updateJobTaskFailedTimes(runLog.jobTaskInfo, jobInfo.job.jobId);
        }
        this.m_serviceStorage.updateTaskLogFinish(runLog);

        runStatus.runningTimes--;

        if (runStatus.runningTimes === 0) {
            g_lastTaskFinishTime = Date.now();
        }

        if (runStatus.successTimes + runStatus.failedTimes >= runStatus.timesLimit) {
            runStatus.status = ServiceStorage.TaskStatus.finish;
            this.m_serviceStorage.updateJobTaskStatus(runLog.jobTaskInfo, jobInfo.job.jobId);
        }
        taskInfo.runLogs.delete(pkg.header.from.agentId);
        runStatus.runLogs.delete(pkg.header.from.agentId);
    }

    _handleRedirectPkg(pkg, fromConnection) {
        let toConnection = this._getToConnectionForPkg(pkg);
        let errorCode = AgentMgr.ErrorCode.notFound;
        if (toConnection) {
            switch (this._sendPkg(pkg, toConnection)) {
                case NetworkErrorCode.success:
                case NetworkErrorCode.pending:
                    return;
                case NetworkErrorCode.outLimit:
                    errorCode = AgentMgr.ErrorCode.remoteCongestion;
                    break;
                case NetworkErrorCode.unknownPakage:
                    errorCode = AgentMgr.ErrorCode.unknownPackage;
                    break;
                default:
                    errorCode = AgentMgr.failed;
            }
        }

        // // 转发失败的响应
        // const respName = Protocol.GetRespName(pkg.header.name);
        // if (!respName) {
        //     return;
        // }
        
        // let resp = {
        //     header: {
        //         name: respName,
        //         seq: pkg.header.seq,
        //         to: pkg.header.from,
        //         from: AgentMgr.masterNameSpace,
        //     },
        //     body: {
        //         err: errorCode,
        //     },
        // };

        // this._sendPkg(resp, fromConnection);
    }

    _runTask(jobTaskInfo, connection, agentId, seq) {
        const {taskInfo, jobInfo} = jobTaskInfo;
        const serviceInfo = taskInfo.serviceInfo;

        base.blog.info('run task(jobid=', jobInfo.job.jobId, ',taskid=', taskInfo.task.taskId, ',serviceid=', serviceInfo.service.serviceId, '), seq=', seq, ', to ', agentId);

        const agentInfo = this.m_agents.get(agentId);

        let req = {
            header: {
                name: 'sys.runtask.req',
                seq,
                to: {
                    agentId: agentId,
                    serviceId: AgentMgr.masterNameSpace.serviceId,
                    taskId: '',
                },
                from: AgentMgr.masterNameSpace,
            },
            body: {
                jobId: jobInfo.job.jobId,
                serviceId: serviceInfo.service.serviceId,
                taskId: taskInfo.task.taskId,
                version: taskInfo.task.taskVersion,
                url: select_url(taskInfo.task.url, agentInfo),
                md5: taskInfo.task.md5,
                params: taskInfo.task.params,
            }
        }
        this._sendPkg(req, connection);
        return {seq: req.seq};
    }

    _stopTask(taskInfo, agentInfo) {
        if (!agentInfo.connection) {
            return;
        }

        let req = {
            header: {
                name: 'sys.stoptask.req',
                seq: this.m_serviceStorage.nextId(),
                to: {
                    agentId: agentInfo.agent.agentId,
                    serviceId: AgentMgr.masterNameSpace.serviceId,
                    taskId: '',
                },
                from: AgentMgr.masterNameSpace,
            },
            body: {
                serviceId: taskInfo.serviceInfo.service.serviceId,
                taskId: taskInfo.task.taskId,
            }
        }
        this._sendPkg(req, agentInfo.connection);
    }

    _weakupFinishTasks() {
        for (let [_, jobInfo] of this.m_jobs) {
            this._dispatchJob(jobInfo);
        }
    }

    _sendPkg(pkg, connection) {
        base.blog.debug('send: cmd: ', JSON.stringify(pkg), "target agent: ", connection.__agentInfo.agent.agentId);
        return connection.send(pkg);        
    }

    // http接口管理各agent/service/task/job等
    /**
     * handle(ctx) {
     *      const request = ctx.request.body;
     *      let resp = {
     *          ...
     *      };
     *      ctx.body = resp;
     *      return;
     * }
     * 
     */
    handleAgentUpdate(ctx) {
        const request = ctx.request.body;

        let resp = {
            err: {
                code: AgentMgr.ErrorCode.success,
                msg: 'success'
            }
        };

        ctx.body = resp;

        let agentInfo = this.m_agents.get(request.agentid);
        if (!agentInfo) {
            resp.err.code = AgentMgr.ErrorCode.notFound;
            resp.err.msg = `not found agent(${request.agentid})`;
            return;
        }

        let netEnvs = null;
        let tags = [];
        try {
            netEnvs = JSON.parse(request.env);
            if (request.tags) {
                tags = null;
                tags = JSON.parse(request.tags);
            }
        } catch (error) {
        }

        if (!netEnvs) {
            resp.err.code = AgentMgr.ErrorCode.invalidParam;
            resp.err.msg = `env(${request.env}) is not a json`;
            return;
        }
        if (!tags) {
            resp.err.code = AgentMgr.ErrorCode.invalidParam;
            resp.err.msg = `tags(${request.tags}) is not a json`;
            return;
        }

        agentInfo.agent.accessible = request.accessible;
        agentInfo.agent.desc = request.desc;
        agentInfo.agent.tags = tags;
        agentInfo.netInfos.clear();

        if (!Array.isArray(netEnvs)) {
            netEnvs = [netEnvs];
        }

        for (let i = 0; i < netEnvs.length; i++) {
            let env = netEnvs[i];
            agentInfo.netInfos.set(i, {
                netId: i,
                name: env.name,
                type: env.accessType,
                ipv4: env.ipv4,
                ipv6: env.ipv6,
                tcpEnable: env.tcp,
                udpEnable: env.udp,
            });
        }

        this.m_serviceStorage.updateAgent(agentInfo.agent);
        this.m_serviceStorage.updateAllNetInfoOfAgent(agentInfo);
    }

    async handleAgentRemove(ctx) {
        const request = ctx.request.body;
        
        let resp = {
            err: {
                code: AgentMgr.ErrorCode.success,
                msg: 'success',
            },
        };
        ctx.body = resp;

        let agentInfo = this.m_agents.get(request.agentid);
        if (!agentInfo) {
            resp.err.code = AgentMgr.ErrorCode.notFound;
            resp.err.msg = `not found agent(${request.agentid})`;
            return;
        }
        return await this.m_serviceStorage.deleteAgent(request.agentid)

    }
    handleAgentList(ctx) {
        let resp = {
            err: {
                code: AgentMgr.ErrorCode.success,
                msg: 'success'
            },
            agents: []
        };
        ctx.body = resp;

        for (let [agentId, agentInfo] of this.m_agents) {
            const status = this.m_clientConnectionMap.get(agentId)? AgentStatus.online : AgentStatus.offline;
            let netInfoArray = [];
            agentInfo.netInfos.forEach(netInfo => {
                netInfoArray.push({
                    name: netInfo.name,
                    accessType: netInfo.type,
                    ipv4: netInfo.ipv4,
                    ipv6: netInfo.ipv6,
                    tcp: netInfo.tcpEnable,
                    udp: netInfo.udpEnable,
                })
            });
            const env = JSON.stringify(netInfoArray);

            resp.agents.push({
                agentid: agentId,
                version: agentInfo.agent.version,
                platform: agentInfo.agent.platform,
                env,
                accessible: agentInfo.agent.accessible,
                status,
                desc: agentInfo.agent.desc,
                tags: JSON.stringify(agentInfo.agent.tags),
            });
        }
    }

    handleAgentWorkList(ctx) {
        let {agentid: targetAgentId} = ctx.request.body;

        let resp = {
            err: {
                code: AgentMgr.ErrorCode.success,
                msg: 'success'
            },
            services: [],
            tasks: [],
        };
        ctx.body = resp;

        const agentInfo = this.m_agents.get(targetAgentId);
        if (!agentInfo) {
            resp.err = AgentMgr.ErrorCode.notFound;
            resp.err.msg = `not found the agent ${targetAgentId}`;
            return;
        }

        for (let [serviceId, agentServiceInfo] of agentInfo.agentServiceInfos) {
            resp.services.push({
                serviceid: serviceId,
                servicename: agentServiceInfo.serviceInfo.service.name,
                status: agentServiceInfo.asInfo.iStatus,
            });
        }

        const now = Date.now();
        if (now - agentInfo.synTime < TASK_TIMEOUT) {
            for (let taskId of agentInfo.runningTaskIds) {
                let taskInfo = this.m_tasks.get(taskId);
                resp.tasks.push({
                    taskid: taskId,
                    desc: taskInfo.task.desc,
                    status: this._getTaskStatus(taskInfo),
                });
            }            
        }
    }

    handleAgentDetail(ctx) {
        // <TODO>
        let resp = {
            err: {
                code: AgentMgr.ErrorCode.notImpl,
                msg: 'not impl'
            }
        };
        ctx.body = resp;
    }

    _requestCheckFields(request, necessaryFields) {
        for (let fieldName of necessaryFields) {
            if (!request.hasOwnProperty(fieldName)) {
                return fieldName;
            }
            const value = request[fieldName];
            if (typeof(value) === 'string' && value.length === 0) {
                return fieldName;
            }
        }
    }

    handleServiceAdd(ctx) {
        const request = ctx.request.body;

        let resp = {
            err: {
                code: AgentMgr.ErrorCode.success,
                msg: 'success',
            },
            serviceid: null,
        };
        ctx.body = resp;

        const necessaryFields = ['servicename', 'url', 'md5', 'version', 'agentscope'];
        const missFieldName = this._requestCheckFields(request, necessaryFields);
        if (missFieldName) {
            resp.err.code = AgentMgr.ErrorCode.invalidParam;
            resp.err.msg = `field(${missFieldName} not filled)`;
            return;
        }

        let service = {
            serviceId: undefined,
            name: request.servicename,
            url: request.url,
            md5: request.md5,
            serviceVersion: request.version,
            status: ServiceStatus.running,
            rules: {
                agentScope: request.agentscope,
                excludeNoAccessibleWindows: request.nowin,
            }
        };

        this.m_serviceStorage.addService(service);
        resp.serviceid = service.serviceId;
        this.m_services.set(service.serviceId, {
            service,
            serviceAgentInfos: new Map(),
            taskInfos: new Map(),
            jobInfos: new Map(),
        });
        return;
    }

    handleServiceRemove(ctx) {
        const request = ctx.request.body;
        
        let resp = {
            err: {
                code: AgentMgr.ErrorCode.success,
                msg: 'success',
            },
        };
        ctx.body = resp;

        const necessaryFields = ['serviceid'];
        const missFieldName = this._requestCheckFields(request, necessaryFields);
        if (missFieldName) {
            resp.err.code = AgentMgr.ErrorCode.invalidParam;
            resp.err.msg = `field(${missFieldName} not filled)`;
            return;
        }

        let serviceInfo = this.m_services.get(request.serviceid);
        if (!serviceInfo) {
            resp.err.code = AgentMgr.ErrorCode.notFound;
            resp.err.msg = `not found service(${request.serviceid})`;
            return;
        }

        this.m_services.delete(request.serviceid);
        this.m_serviceStorage.deleteService(serviceInfo.service);

        serviceInfo.serviceAgentInfos.forEach(agentInfo => {
            agentInfo.agentServiceInfos.delete(serviceInfo.service.serviceId);
        });

        return;
    }

    handleServiceUpdate(ctx) {
        const request = ctx.request.body;

        let resp = {
            err: {
                code: AgentMgr.ErrorCode.success,
                msg: 'success',
            },
        };
        ctx.body = resp;

        const necessaryFields = ['serviceid'];
        const missFieldName = this._requestCheckFields(request, necessaryFields);
        if (missFieldName) {
            resp.err.code = AgentMgr.ErrorCode.invalidParam;
            resp.err.msg = `field(${missFieldName} not filled)`;
            return;
        }
        
        let serviceInfo = this.m_services.get(request.serviceid);
        if (!serviceInfo) {
            resp.err.code = AgentMgr.ErrorCode.notFound;
            resp.err.msg = `not found service(${request.serviceid})`;
            return;
        }

        if (request.servicename && request.servicename.length > 0) {
            serviceInfo.service.name = request.servicename;
        }
        if (request.version && request.version.length > 0) {
            serviceInfo.service.serviceVersion = request.version;
        }
        if (request.url && request.url.length > 0) {
            serviceInfo.service.url = request.url;
        }
        if (request.md5 && request.md5.length > 0) {
            serviceInfo.service.md5 = request.md5;
        }
        if (request.agentscope) {
            serviceInfo.service.rules.agentScope = request.agentscope;
        }
        if (request.nowin === 1 || request.nowin === 0) {
            serviceInfo.service.rules.excludeNoAccessibleWindows = request.nowin;
        }

        this.m_serviceStorage.updateService(serviceInfo.service);

        return;
    }

    handleServiceList(ctx) {
        const request = ctx.request.body;
        let resp = {
            err: {
                code: AgentMgr.ErrorCode.success,
                msg: 'success',
            },
            services: [],
        };
        ctx.body = resp;

        this.m_services.forEach(serviceInfo => {
            resp.services.push({
                serviceid: serviceInfo.service.serviceId,
                servicename: serviceInfo.service.name,
                version: serviceInfo.service.serviceVersion,
                url: serviceInfo.service.url,
                agentscope: serviceInfo.service.rules.agentScope,
                status: serviceInfo.service.status,
            });
        });

        return;
    }

    handleServiceListMini(ctx) {
        const request = ctx.request.body;
        let resp = {
            err: {
                code: AgentMgr.ErrorCode.success,
                msg: 'success',
            },
            services: [],
        };
        ctx.body = resp;

        this.m_services.forEach(serviceInfo => {
            resp.services.push({
                serviceid: serviceInfo.service.serviceId,
                servicename: serviceInfo.service.name,
            });
        });

        return;
    }

    handleServiceDetail(ctx) {
        const request = ctx.request.body;

        let resp = {
            err: {
                code: AgentMgr.ErrorCode.success,
                msg: 'success',
            },
        };
        ctx.body = resp;
        
        const necessaryFields = ['serviceid'];
        const missFieldName = this._requestCheckFields(request, necessaryFields);
        if (missFieldName) {
            resp.err.code = AgentMgr.ErrorCode.invalidParam;
            resp.err.msg = `field(${missFieldName} not filled)`;
            return;
        }

        let serviceInfo = this.m_services.get(request.serviceid);
        if (!serviceInfo) {
            resp.err.code = AgentMgr.ErrorCode.notFound;
            resp.err.msg = `not found service(${request.serviceid})`;
            return;
        }

        resp.service = {
            serviceid: serviceInfo.service.serviceId,
            servicename: serviceInfo.service.name,
            version: serviceInfo.service.serviceVersion,
            url: serviceInfo.service.url,
            md5: serviceInfo.service.md5,
            agentscope: serviceInfo.service.rules.agentScope,
            status: serviceInfo.service.status,
        };

        return;
    }

    handleServiceStop(ctx) {
        const request = ctx.request.body;

        let resp = {
            err: {
                code: AgentMgr.ErrorCode.success,
                msg: 'success',
            },
        };
        ctx.body = resp;
        
        const necessaryFields = ['serviceid', 'agentid'];
        const missFieldName = this._requestCheckFields(request, necessaryFields);
        if (missFieldName) {
            resp.err.code = AgentMgr.ErrorCode.invalidParam;
            resp.err.msg = `field(${missFieldName} not filled)`;
            return;
        }

        let serviceInfo = this.m_services.get(request.serviceid);
        if (!serviceInfo) {
            resp.err.code = AgentMgr.ErrorCode.notFound;
            resp.err.msg = `not found service(${request.serviceid})`;
            return;
        }

        let serviceAgentInfo = serviceInfo.serviceAgentInfos.get(request.agentid);
        if (!serviceAgentInfo) {
            let agentInfo = this.m_agents.get(request.agentid);
            if (!agentInfo) {
                resp.err.code = AgentMgr.ErrorCode.notFound;
                resp.err.msg = `not found agent(${request.agentid})`;
                return;
            }

            let agentServiceInfo = agentInfo.agentServiceInfos.get(request.serviceid);
            if (!agentServiceInfo) {
                agentServiceInfo = {
                    asInfo: {
                        status: ServiceStatus.stop,
                    },
                    serviceInfo,
                };
                agentInfo.agentServiceInfos.set(request.serviceid, agentServiceInfo);
            }

            serviceAgentInfo = {
                asInfo: agentServiceInfo.asInfo,
                agentInfo,
            };
            serviceInfo.serviceAgentInfos.set(request.agentid, serviceAgentInfo);

            this.m_serviceStorage.addAgentService(request.serviceid, request.agentid, ServiceStatus.stop);
        } else {
            if (serviceAgentInfo.asInfo.status !== ServiceStatus.stop) {
                serviceAgentInfo.asInfo.status = ServiceStatus.stop;
                this.m_serviceStorage.updateServiceAgent(request.serviceid, request.agentid, ServiceStatus.stop);
            }
        }

        return;
    }

    handleTaskAdd(ctx) {
        const request = ctx.request.body;

        let resp = {
            err: {
                code: AgentMgr.ErrorCode.success,
                msg: 'success',
            },
            taskid: null,
        };
        ctx.body = resp;
        
        const necessaryFields = ['version', 'url', 'md5', 'desc', 'runrule', 'distribute', 'serviceid'];
        const missFieldName = this._requestCheckFields(request, necessaryFields);
        if (missFieldName) {
            resp.err.code = AgentMgr.ErrorCode.invalidParam;
            resp.err.msg = `field(${missFieldName} not filled)`;
            return;
        }

        let serviceInfo = this.m_services.get(request.serviceid);
        if (!serviceInfo) {
            resp.err.code = AgentMgr.ErrorCode.notFound;
            resp.err.msg = `not found service(${request.serviceid})`;
            return;
        }

        let task = {
            taskId: undefined,
            taskVersion: request.version,
            url: request.url,
            md5: request.md5,
            desc: request.desc,
            params: [],
            rules: {
                run: request.runrule,
                distribute: request.distribute,
            },
        };

        this.m_serviceStorage.addTask(task, request.serviceid);
        resp.taskid = task.taskId;

        let taskInfo = {
            task,
            serviceInfo: serviceInfo,
            jobInfos: new Map(),
            runLogs: new Map(),
        };
        this.m_tasks.set(task.taskId, taskInfo);

        serviceInfo.taskInfos.set(task.taskId, taskInfo);
        return;
    }

    handleTaskRemove(ctx) {
        const request = ctx.request.body;

        let resp = {
            err: {
                code: AgentMgr.ErrorCode.success,
                msg: 'success',
            },
        };
        ctx.body = resp;
        
        const necessaryFields = ['taskid'];
        const missFieldName = this._requestCheckFields(request, necessaryFields);
        if (missFieldName) {
            resp.err.code = AgentMgr.ErrorCode.invalidParam;
            resp.err.msg = `field(${missFieldName} not filled)`;
            return;
        }

        let taskInfo = this.m_tasks.get(request.taskid);
        if (!taskInfo) {
            resp.err.code = AgentMgr.ErrorCode.notFound;
            resp.err.msg = `not found task(${request.taskid})`;
            return;
        }

        this.m_tasks.delete(request.taskid);
        this.m_serviceStorage.deleteTask(taskInfo.task);

        taskInfo.serviceInfo.taskInfos.delete(request.taskid);
        taskInfo.jobInfos.forEach(jobInfo => jobInfo.jobTaskInfos.delete(request.taskid));

        return;
    }

    handleTaskUpdate(ctx) {
        const request = ctx.request.body;

        let resp = {
            err: {
                code: AgentMgr.ErrorCode.success,
                msg: 'success',
            },
        };
        ctx.body = resp;
        
        const necessaryFields = ['taskid'];
        const missFieldName = this._requestCheckFields(request, necessaryFields);
        if (missFieldName) {
            resp.err.code = AgentMgr.ErrorCode.invalidParam;
            resp.err.msg = `field(${missFieldName} not filled)`;
            return;
        }

        let taskInfo = this.m_tasks.get(request.taskid);
        if (!taskInfo) {
            resp.err.code = AgentMgr.ErrorCode.notFound;
            resp.err.msg = `not found task(${request.taskid})`;
            return;
        }

        if (request.version && request.version.length > 0) {
            taskInfo.task.taskVersion = request.version;            
        }
        if (request.url && request.url.length > 0) {
            taskInfo.task.url = request.url;
        }
        if (request.md5 && request.md5.length > 0) {
            taskInfo.task.md5 = request.md5;
        }
        if (request.desc && request.desc.length > 0) {
            taskInfo.task.desc = request.desc;
        }
        taskInfo.task.params = [];
        if (request.runrule) {
            taskInfo.task.rules.run = request.runrule;
        }
        if (request.distribute) {
            taskInfo.task.rules.distribute = request.distribute;
        }
        
        this.m_serviceStorage.updateTask(taskInfo.task, taskInfo.serviceInfo.service.serviceId);

        return;
    }
    
    handleTaskList(ctx) {
        const request = ctx.request.body;
        let resp = {
            err: {
                code: AgentMgr.ErrorCode.success,
                msg: 'success',
            },
            tasks: [],
        };
        ctx.body = resp;

        this.m_tasks.forEach(taskInfo => {
            resp.tasks.push({
                taskid: taskInfo.task.taskId,
                version: taskInfo.task.taskVersion,
                url: taskInfo.task.url,
                desc: taskInfo.task.desc,
                status: this._getTaskStatus(taskInfo),
                serviceid: taskInfo.serviceInfo.service.serviceId,
                servicename: taskInfo.serviceInfo.service.name,
                runrule: taskInfo.task.rules.run,
                distribute: taskInfo.task.rules.distribute,
            });
        });

        return;
    }
    
    handleTaskListMini(ctx) {
        const request = ctx.request.body;

        let resp = {
            err: {
                code: AgentMgr.ErrorCode.success,
                msg: 'success',
            },
            tasks: [],
        };
        ctx.body = resp;

        const necessaryFields = ['serviceid'];
        const missFieldName = this._requestCheckFields(request, necessaryFields);
        if (missFieldName) {
            resp.err.code = AgentMgr.ErrorCode.invalidParam;
            resp.err.msg = `field(${missFieldName} not filled)`;
            return;
        }

        this.m_tasks.forEach(taskInfo => {
            if (taskInfo.serviceInfo.service.serviceId === request.serviceid) {
                resp.tasks.push({
                    taskid: taskInfo.task.taskId,
                    desc: taskInfo.task.desc,
                });
            }
        });

        return;
    }

    handleTaskDetail(ctx) {
        const request = ctx.request.body;

        let resp = {
            err: {
                code: AgentMgr.ErrorCode.success,
                msg: 'success',
            },
            tasks: [],
        };
        ctx.body = resp;
        
        const necessaryFields = ['taskid'];
        const missFieldName = this._requestCheckFields(request, necessaryFields);
        if (missFieldName) {
            resp.err.code = AgentMgr.ErrorCode.invalidParam;
            resp.err.msg = `field(${missFieldName} not filled)`;
            return;
        }

        let taskInfo = this.m_tasks.get(request.taskid);
        if (!taskInfo) {
            resp.err.code = AgentMgr.ErrorCode.notFound;
            resp.err.msg = `not found task(${request.taskid})`;
            return;
        }

        resp.tasks.push({
            taskid: taskInfo.task.taskId,
            version: taskInfo.task.taskVersion,
            url: taskInfo.task.url,
            md5: taskInfo.task.md5,
            desc: taskInfo.task.desc,
            status: this._getTaskStatus(taskInfo),
            serviceid: taskInfo.serviceInfo.service.serviceId,
            servicename: taskInfo.serviceInfo.service.name,
            runrule: taskInfo.task.rules.run,
            distribute: taskInfo.task.rules.distribute,
        });

        return;
    }

    handleJobAdd(ctx) {
        const request = ctx.request.body;

        let resp = {
            err: {
                code: AgentMgr.ErrorCode.success,
                msg: 'success',
            },
            jobid: null,
        };
        ctx.body = resp;

        const necessaryFields = ['serviceid', 'desc'];
        const missFieldName = this._requestCheckFields(request, necessaryFields);
        if (missFieldName) {
            resp.err.code = AgentMgr.ErrorCode.invalidParam;
            resp.err.msg = `field(${missFieldName} not filled)`;
            return;
        }

        if (!request.tasks || request.tasks.length === 0) {
            resp.err.code = AgentMgr.ErrorCode.invalidParam;
            resp.err.msg = 'should include tasks.';
            return;
        }

        let serviceInfo = this.m_services.get(request.serviceid);
        if (!serviceInfo) {
            resp.err.code = AgentMgr.ErrorCode.notFound;
            resp.err.msg = `not found service(${request.serviceid})`;
            return;
        }

        let job = {
            jobId: undefined,
            runningId: 1,
            desc: request.desc,
            rules: {},
        };

        this.m_serviceStorage.addJob(job, request.serviceid);
        resp.jobid = job.jobId;

        let jobInfo = {
            job,
            serviceInfo,
            jobTaskInfos: new Map(),
        };
        this.m_jobs.set(job.jobId, jobInfo);

        serviceInfo.jobInfos.set(job.jobId, jobInfo);

        for (let jt of request.tasks) {
            let taskInfo = this.m_tasks.get(jt.taskid);
            if (taskInfo) {
                let jobTaskInfo = {
                    taskInfo,
                    jobInfo,
                    runStatus: {
                        successTimes: 0,
                        failedTimes: 0,
                        status: ServiceStorage.TaskStatus.stop,
                        timesLimit: jt.timeslimit,
                        runningTimes: 0,
                        runLogs: new Map(),
                    },
                };
                taskInfo.jobInfos.set(job.jobId, jobInfo);
                jobInfo.jobTaskInfos.set(jt.taskid, jobTaskInfo);
                this.m_serviceStorage.addJobTask(jobTaskInfo, job.jobId);
            }
        }

        return;
    }

    handleJobRemove(ctx) {
        const request = ctx.request.body;

        let resp = {
            err: {
                code: AgentMgr.ErrorCode.success,
                msg: 'success',
            },
        };
        ctx.body = resp;

        const necessaryFields = ['jobid'];
        const missFieldName = this._requestCheckFields(request, necessaryFields);
        if (missFieldName) {
            resp.err.code = AgentMgr.ErrorCode.invalidParam;
            resp.err.msg = `field(${missFieldName} not filled)`;
            return;
        }

        let jobInfo = this.m_jobs.get(request.jobid);
        if (!jobInfo) {
            resp.err.code = AgentMgr.ErrorCode.notFound;
            resp.err.msg = `not found job(${request.jobid})`;
            return;
        }

        this.m_jobs.delete(request.jobid);
        this.m_serviceStorage.deleteJob(jobInfo.job);

        jobInfo.serviceInfo.jobInfos.delete(request.jobid);
        jobInfo.jobTaskInfos.forEach(jt => jt.taskInfo.jobInfos.delete(request.jobid));

        return;
    }

    handleJobUpdate(ctx) {
        const request = ctx.request.body;

        let resp = {
            err: {
                code: AgentMgr.ErrorCode.success,
                msg: 'success',
            },
        };
        ctx.body = resp;

        const necessaryFields = ['jobid'];
        const missFieldName = this._requestCheckFields(request, necessaryFields);
        if (missFieldName) {
            resp.err.code = AgentMgr.ErrorCode.invalidParam;
            resp.err.msg = `field(${missFieldName} not filled)`;
            return;
        }

        let jobInfo = this.m_jobs.get(request.jobid);
        if (!jobInfo) {
            resp.err.code = AgentMgr.ErrorCode.notFound;
            resp.err.msg = `not found job(${request.jobid})`;
            return;
        }

        if (request.desc && request.desc.length > 0) {
            jobInfo.job.desc = request.desc;
        }
        jobInfo.job.rules = {};

        if (request.tasks && request.tasks.length > 0) {
            const existJobTaskInfos = jobInfo.jobTaskInfos;
            jobInfo.jobTaskInfos = new Map();
    
            this.m_serviceStorage.updateJob(job.job);
    
            for (let jt of request.tasks) {
                let existJobTask = existJobTaskInfos.get(jt.taskid);
                if (existJobTask) {
                    existJobTask.runStatus.timesLimit = jt.timeslimit;
                    jobInfo.jobTaskInfos.set(jt.taskid, existJobTask);
                    this.m_serviceStorage.updateJobTask(existJobTask, request.jobid);
                    existJobTaskInfos.delete(jt.taskid);
    
                    if (existJobTask.runStatus.timesLimit > 
                        existJobTask.runStatus.successTimes + existJobTask.runStatus.failedTimes + existJobTask.runStatus.runningTimes) {
                        if (existJobTask.runStatus.status === ServiceStorage.TaskStatus.finish) {
                            existJobTask.runStatus.status = ServiceStorage.TaskStatus.stop;
                            this.m_serviceStorage.updateJobTaskStatus(existJobTask, request.jobid);
                        }
                    } else {
                        if (existJobTask.runStatus.status !== ServiceStorage.TaskStatus.finish) {
                            if (existJobTask.runStatus.runningTimes === 0) {
                                existJobTask.runStatus.status = ServiceStorage.TaskStatus.finish;
                                this.m_serviceStorage.updateJobTaskStatus(existJobTask, request.jobid);
                            }
                        }
                    }
                } else {
                    let taskInfo = this.m_tasks.get(jt.taskid);
                    if (taskInfo) {
                        let jobTaskInfo = {
                            jobInfo,
                            taskInfo,
                            runStatus: {
                                successTimes: 0,
                                failedTimes: 0,
                                status: ServiceStorage.TaskStatus.stop,
                                timesLimit: jt.timeslimit,
                                runningTimes: 0,
                                runLogs: new Map(),
                            },
                        };
                        jobInfo.jobTaskInfos.set(jt.taskid, jobTaskInfo);
                        this.m_serviceStorage.addJobTask(jobTaskInfo, request.jobid);
                    }
                }
            }
    
            existJobTaskInfos.forEach(jtInfo => {
                this.m_serviceStorage.deleteJobTask(jtInfo, request.jobid);
            });    
        }

        return;
    }

    handleJobList(ctx) {
        const request = ctx.request.body;
        let resp = {
            err: {
                code: AgentMgr.ErrorCode.success,
                msg: 'success',
            },
            jobs: [],
        };
        ctx.body = resp;

        let targetJobInfos = this.m_jobs;
        if (request.serviceid) {
            let serviceInfo = this.m_services.get(request.serviceid);
            if (!serviceInfo) {
                resp.err.code = AgentMgr.ErrorCode.notFound;
                resp.err.msg = `not found service(${request.serviceid})`;
                return;
            }

            targetJobInfos = serviceInfo.jobInfos;
        }

        this.m_jobs.forEach(jobInfo => {
            resp.jobs.push({
                jobid: jobInfo.job.jobId,
                desc: jobInfo.job.desc,
                serviceid: jobInfo.serviceInfo.service.serviceId,
                servicename: jobInfo.serviceInfo.service.name,
                status: this._getJobStatus(jobInfo),
            });
        });

        return;
    }

    handleJobListTask(ctx) {
        const request = ctx.request.body;

        let resp = {
            err: {
                code: AgentMgr.ErrorCode.success,
                msg: 'success',
            },
            tasks: [],
        };
        ctx.body = resp;
        
        const necessaryFields = ['jobid'];
        const missFieldName = this._requestCheckFields(request, necessaryFields);
        if (missFieldName) {
            resp.err.code = AgentMgr.ErrorCode.invalidParam;
            resp.err.msg = `field(${missFieldName} not filled)`;
            return;
        }

        let jobInfo = this.m_jobs.get(request.jobid);
        if (!jobInfo) {
            resp.err.code = AgentMgr.ErrorCode.notFound;
            resp.err.msg = `not found job(${request.jobid})`;
            return;
        }

        jobInfo.jobTaskInfos.forEach(jtInfo => {
            resp.tasks.push({
                taskid: jtInfo.taskInfo.task.taskId,
                desc: jtInfo.taskInfo.task.desc,
                status: jtInfo.runStatus.status,
                timeslimit: jtInfo.runStatus.timesLimit,
                successtimes: jtInfo.runStatus.successTimes,
                failedtimes: jtInfo.runStatus.failedTimes,
            });
        });

        return;
    }

    async handleTaskResult(ctx) {
        const request = ctx.request.body;

        let resp = {
            err: {
                code: AgentMgr.ErrorCode.success,
                msg: 'success',
            },
            tasks: [],
        };
        ctx.body = resp;
        
        const necessaryFields = ['jobid'];
        const missFieldName = this._requestCheckFields(request, necessaryFields);
        if (missFieldName) {
            resp.err.code = AgentMgr.ErrorCode.invalidParam;
            resp.err.msg = `field(${missFieldName} not filled)`;
            return;
        }

        let jobInfo = this.m_jobs.get(request.jobid);
        if (!jobInfo) {
            resp.err.code = AgentMgr.ErrorCode.notFound;
            resp.err.msg = `not found job(${request.jobid})`;
            return;
        }

        let err = null;
        let records = [];

        if (request.taskid) {
            let jobTaskInfo = jobInfo.jobTaskInfos.get(request.taskid);
            if (!jobTaskInfo) {
                resp.err.code = AgentMgr.ErrorCode.notFound;
                resp.err.msg = `not found task(${request.taskid})`;
                return;
            }

            if (request.includeResart) {
                [err, records] = await this.m_serviceStorage.loadJobTaskLogsByJobIdAndTaskId(request.jobid, request.taskid);
            } else {
                [err, records] = await this.m_serviceStorage.loadJobTaskLogsByJobIdAndTaskIdWithRunningId(request.jobid, request.taskid, jobInfo.job.runningId);
            }
        } else {
            if (request.includeResart) {
                [err, records] = await this.m_serviceStorage.loadJobTaskLogsByJobId(request.jobid);
            } else {
                [err, records] = await this.m_serviceStorage.loadJobTaskLogsByJobIdWithRunningId(request.jobid, jobInfo.job.runningId);
            }
        }

        if (err) {
            resp.err.code = AgentMgr.ErrorCode.failed;
            resp.err.msg = err.msg;
            return;
        }

        records = records || [];

        resp.jobid = request.jobid;
        resp.desc = jobInfo.job.desc;

        let taskLogMap = new Map();

        /** <TODO>测试数据
        const fillTestData = () => {
            const randomInt = (limit) => {
                return Math.round(Math.random() * limit);
            };

            const randomTaskInfo = () => {
                if (request.taskid) {
                    return jobInfo.jobTaskInfos.get(request.taskid).taskInfo;
                }

                let randomIndex = randomInt(jobInfo.jobTaskInfos.size - 1);
                for (let [tid, jobTaskInfo] of jobInfo.jobTaskInfos) {
                    if (randomIndex === 0) {
                        return jobTaskInfo.taskInfo;
                    }
                    randomIndex--;
                }
            };

            const randomAgentInfo = () => {
                let randomIndex = randomInt(this.m_agents.size - 1);
                for (let [aid, agentInfo] of this.m_agents) {
                    if (randomIndex === 0) {
                        return agentInfo;
                    }
                    randomIndex--;
                }
            };

            const randomErrorCode = () => {
                let e = randomInt(10);
                if (e < 5) {
                    return 0;
                }
                return e - 5;
            };

            const recordCount = 5;
            const now = Date.now();
            for (let i = 0; i < recordCount; i++) {
                const startTime = now - randomInt(24 * 3600000000);
                let taskInfo = randomTaskInfo();
                let record = {
                    logId: 1,
                    taskId: taskInfo.task.taskId,
                    taskVersion: taskInfo.task.taskVersion,
                    agentId: randomAgentInfo().agent.agentId,
                    startTime,
                    finishTime: startTime + randomInt(60000000),
                    errorCode: randomErrorCode(),
                    urls: JSON.stringify(['url1', 'url2', 'ur3']),
                };
                records.push(record);
            }
        }

        fillTestData();
        // */

        records.forEach(log => {
            let taskLog = taskLogMap.get(log.taskId);
            if (!taskLog) {
                let jobTaskInfo = jobInfo.jobTaskInfos.get(log.taskId);
                if (!jobTaskInfo) {
                    return;
                }

                taskLog = {
                    taskid: log.taskId,
                    desc: jobTaskInfo.taskInfo.task.desc,
                    successtimes: 0,
                    failedtimes: 0,
                    records: [],
                };
                taskLogMap.set(log.taskId, taskLog);
            }

            if (log.finishTime !== 0) {
                if (log.errorCode === 0) {
                    taskLog.successtimes++;
                } else {
                    taskLog.failedtimes++;
                }
            }

            if (!request.resultfilter || (request.resultfilter === 1 && log.errorCode !== 0) || (request.resultfilter === 2 && log.errorCode === 0)) {
                if (taskLog.records.length < 30) {
                    taskLog.records.push({
                        logid: log.logId,
                        runningid: log.runningId,
                        agentid: log.agentId,
                        result: log.errorCode,
                        version: log.taskVersion,
                        starttime: log.startTime,
                        finishtime: log.finishTime,
                        urls: JSON.parse(log.urls),
                        msg: log.msg || ''
                    });                    
                }
            }
        });

        resp.tasks = [...taskLogMap.values()];
        return;
    }

    handleJobStart(ctx) {
        const request = ctx.request.body;

        let resp = {
            err: {
                code: AgentMgr.ErrorCode.success,
                msg: 'success',
            },
            tasks: [],
        };
        ctx.body = resp;
        
        const necessaryFields = ['jobid'];
        const missFieldName = this._requestCheckFields(request, necessaryFields);
        if (missFieldName) {
            resp.err.code = AgentMgr.ErrorCode.invalidParam;
            resp.err.msg = `field(${missFieldName} not filled)`;
            return;
        }
        
        let jobInfo = this.m_jobs.get(request.jobid);
        let version = jobInfo.desc;
         
        
        if (!jobInfo) {
            resp.err.code = AgentMgr.ErrorCode.notFound;
            resp.err.msg = `not found job(${request.jobid})`;
            return;
        }
        

        if (this._getJobStatus(jobInfo) === ServiceStorage.JobStatus.finish) {
            // 重启
            jobInfo.job.runningId++;
            jobInfo.jobTaskInfos.forEach( async jobTaskInfo => {
                jobTaskInfo.runStatus.status = ServiceStorage.TaskStatus.running;
                jobTaskInfo.runStatus.failedTimes = 0;
                jobTaskInfo.runStatus.successTimes = 0;
                jobTaskInfo.runStatus.runningTimes = 0;
                await this.m_serviceStorage.resetJobTask(jobTaskInfo, request.jobid);
            });
            this.m_serviceStorage.resetJob(jobInfo.job, ServiceStorage.TaskStatus.running);
        } else {
            // 继续
            jobInfo.jobTaskInfos.forEach( jobTaskInfo => {
                if (jobTaskInfo.runStatus.status === ServiceStorage.TaskStatus.stop) {
                    jobTaskInfo.runStatus.status = ServiceStorage.TaskStatus.running;
                    this.m_serviceStorage.updateJobTaskStatus(jobTaskInfo, request.jobid);
                }
            });
        }

        this._dispatchJob(jobInfo);
    }

    handleJobStop(ctx) {
        const request = ctx.request.body;

        let resp = {
            err: {
                code: AgentMgr.ErrorCode.success,
                msg: 'success',
            },
            tasks: [],
        };
        ctx.body = resp;
        
        const necessaryFields = ['jobid'];
        const missFieldName = this._requestCheckFields(request, necessaryFields);
        if (missFieldName) {
            resp.err.code = AgentMgr.ErrorCode.invalidParam;
            resp.err.msg = `field(${missFieldName} not filled)`;
            return;
        }

        let jobInfo = this.m_jobs.get(request.jobid);
        if (!jobInfo) {
            resp.err.code = AgentMgr.ErrorCode.notFound;
            resp.err.msg = `not found job(${request.jobid})`;
            return;
        }

        jobInfo.jobTaskInfos.forEach(jobTaskInfo => {
            if (jobTaskInfo.runStatus.status === ServiceStorage.TaskStatus.running) {
                jobTaskInfo.runStatus.status = ServiceStorage.TaskStatus.stop;
                this.m_serviceStorage.updateJobTaskStatus(jobTaskInfo, request.jobid);

                jobTaskInfo.runStatus.runLogs.forEach(runLog => {
                    jobTaskInfo.runStatus.runningTimes--;

                    if (jobTaskInfo.runStatus.runningTimes === 0) {
                        g_lastTaskFinishTime = Date.now();
                    }
                    
                    this._stopTask(jobTaskInfo.taskInfo, runLog.agentInfo);
                });
            }
        });
    }

    _getTaskStatus(taskInfo) {
        if (taskInfo.jobInfos.size === 0) {
            return ServiceStorage.TaskStatus.noPlan;
        }

        let isStop = false;
        for (let [jobId, jobInfo] of taskInfo.jobInfos) {
            let jobTaskInfo = jobInfo.jobTaskInfos.get(taskInfo.task.taskId);
            if (jobTaskInfo.runStatus.status === ServiceStorage.TaskStatus.running) {
                return ServiceStorage.TaskStatus.running;
            } else {
                isStop = isStop || jobTaskInfo.runStatus.status === ServiceStorage.TaskStatus.stop;
            }
        }

        return isStop ? ServiceStorage.TaskStatus.stop : ServiceStorage.TaskStatus.finish;
    }

    _getJobStatus(jobInfo) {
        let stopCount = 0;
        for (let [taskId, jt] of jobInfo.jobTaskInfos) {
            switch (jt.runStatus.status) {
                case ServiceStorage.TaskStatus.running:
                    return ServiceStorage.JobStatus.running;
                case ServiceStorage.TaskStatus.stop:
                    stopCount++;
                    break;
            }
        }

        if (stopCount > 0) {
            return ServiceStorage.JobStatus.stop;
        }

        return ServiceStorage.JobStatus.finish;
    }

    _serviceDeployCheck(service, agent) {
        if (service.rules.agentScope === AgentScopeRule.all || // 全局部署
            ((service.rules.agentScope === AgentScopeRule.accessible && agent.accessible === ServiceStorage.AccessibleStatus.in) || // 仅部署到可控设备
            (service.rules.agentScope === AgentScopeRule.notAccessible && agent.accessible === ServiceStorage.AccessibleStatus.not)) // 仅部署到不可控设备
        ) {
            return !service.rules.excludeNoAccessibleWindows || agent.accessible === ServiceStorage.AccessibleStatus.in || (agent.platform && agent.platform.slice(0, 3).toLowerCase() !== 'win');
        }
    }

    _jobTaskDeployCheck(jobTaskInfo, agentInfo, isStopTimeout) {
        // <TODO>
        // if (agentInfo.agent.agentId !== 'DESKTOP-BGJ1GRK:{91E9CF2E-54AB-4AC1-9334-DF9B4C0A53F0}') {
        //     return false;
        // }

        // <TODO>临时改为只向win32和linux下发任务
        if (agentInfo.agent.platform != "win32" && agentInfo.agent.platform != "linux") {
            return false
        }

        // <TODO>先去掉串行执行
        // if (Date.now() - g_lastTaskFinishTime < 5000) {
        //     return false;
        // }

        const {taskInfo, runStatus} = jobTaskInfo;
        const serviceInfo = taskInfo.serviceInfo;
        
        if (runStatus.status === ServiceStorage.TaskStatus.stop) {
            return false;
        }
        if (runStatus.successTimes + runStatus.failedTimes >= runStatus.timesLimit) {
            return false;
        }

        if (!this._serviceDeployCheck(serviceInfo.service, agentInfo.agent)) {
            return false;
        }

        if (taskInfo.task.rules.distribute === TaskDistributeRule.serviceOnly) {
            const agentServiceInfo = agentInfo.agentServiceInfos.get(serviceInfo.service.serviceId);
            if (!agentServiceInfo) {
                return false;
            }
        }

        const now = Date.now();
        
        const runLog = taskInfo.runLogs.get(agentInfo.agent.agentId);
        if (runLog) {
            if (runLog.deployFailed || !runLog.finishTime) {
                agentInfo.runningTaskIdSet = agentInfo.runningTaskIdSet || new Set(agentInfo.runningTaskIds);
                if (now - agentInfo.synTime < TASK_TIMEOUT) {
                    if (agentInfo.runningTaskIdSet.has(taskInfo.task.taskId)) {
                        return false;
                    }    
                }

                if (now - runLog.startTime < TASK_TIMEOUT) {
                    return false;
                } else {
                    if (!runLog.deployFailed && isStopTimeout) {
                        runLog.errorCode = AgentMgr.ErrorCode.timeout;
                        runLog.msg = '超时';
                        this.m_serviceStorage.updateTaskLogFinish(runLog);
                        runStatus.failedTimes++;
                        runStatus.runningTimes--;

                        if (runStatus.runningTimes === 0) {
                            g_lastTaskFinishTime = Date.now();
                        }

                        this.m_serviceStorage.updateJobTaskFailedTimes(jobTaskInfo, jobTaskInfo.jobInfo.jobId);
                    }
                }
            }
        }

        if (taskInfo.task.rules.run === TaskRunRule.serial) {
            for (const [agentId, log] of taskInfo.runLogs) {
                if (log.deployFailed || !log.finishTime) {
                    agentInfo.runningTaskIdSet = agentInfo.runningTaskIdSet || new Set(agentInfo.runningTaskIds);
                    if (now - agentInfo.synTime < TASK_TIMEOUT) {
                        if (agentInfo.runningTaskIdSet.has(taskInfo.task.taskId)) {
                            return false;
                        }    
                    }

                    if (now - log.startTime < TASK_TIMEOUT) {
                        return false;
                    } else {
                        if (!log.deployFailed && isStopTimeout) {
                            let jobTaskInfo = log.jobTaskInfo;
                            log.errorCode = AgentMgr.ErrorCode.timeout;
                            log.msg = '超时';
                            this.m_serviceStorage.updateTaskLogFinish(log);
                            jobTaskInfo.runStatus.failedTimes++;
                            jobTaskInfo.runStatus.runningTimes--;

                            if (jobTaskInfo.runStatus.runningTimes === 0) {
                                g_lastTaskFinishTime = Date.now();
                            }
                            
                            this.m_serviceStorage.updateJobTaskFailedTimes(jobTaskInfo, jobTaskInfo.jobInfo.jobId);
                        }
                    }
                }
            }
        }

        if (runStatus.successTimes + runStatus.failedTimes + runStatus.runningTimes >= runStatus.timesLimit) {
            return false;
        }

        return true;
    }

    _dispatchJobTaskToAgent(jobTaskInfo, agentInfo) {
        if (agentInfo.connection && this._jobTaskDeployCheck(jobTaskInfo, agentInfo, true)) {
            const now = Date.now();
            let {jobInfo, taskInfo, runStatus} = jobTaskInfo;

            let newLog = {
                logId: undefined,
                runningId: jobInfo.job.runningId,
                jobTaskInfo,
                taskVersion: taskInfo.task.taskVersion,
                agentInfo,
                startTime: now,
                finishTime: 0,
                errorCode: AgentMgr.ErrorCode.success,
                urls: [],
                msg: '',
                deployFailed: false,
            };
            runStatus.runningTimes++;
            
            if (runStatus.runningTimes === 1) {
                g_lastTaskFinishTime = now;
            }

            this.m_serviceStorage.addTaskLog(newLog);
            taskInfo.runLogs.set(agentInfo.agent.agentId, newLog);
            runStatus.runLogs.set(agentInfo.agent.agentId, newLog);
            const {seq} = this._runTask(jobTaskInfo,
                agentInfo.connection,
                agentInfo.agent.agentId,
                newLog.logId);

            this.m_startingLogs.set(seq, newLog);
            return true;
        }
        return false;
    }

    _dispatchJobToAgent(jobInfo, agentInfo) {
        for (let [taskId, jobTaskInfo] of jobInfo.jobTaskInfos) {
            this._dispatchJobTaskToAgent(jobTaskInfo, agentInfo);
            if (jobTaskInfo.runStatus.runningTimes > 0) {
                return true;
            }
        }
        return false;
    }

    _dispatchJob(jobInfo) {
        let connections = [...this.m_clientConnectionMap.values()];
        let connIndex = Math.round(Math.random() * connections.length);
        // 限制执行Task 机器
        for (let [taskId, jobTaskInfo] of jobInfo.jobTaskInfos) {
            const maxConnIndex = connections.length + connIndex;
            for (; connIndex < maxConnIndex; connIndex++) {
                let connection = connections[connIndex % connections.length];
                if(connection.__agentInfo.agent.agentId.includes("TaskRun")){
                    this._dispatchJobTaskToAgent(jobTaskInfo, connection.__agentInfo);
                    const runStatus = jobTaskInfo.runStatus;
                    if (runStatus.successTimes + runStatus.failedTimes + runStatus.runningTimes >= runStatus.timesLimit) {
                        break;
                    }
                }   
            }

            if (jobTaskInfo.runStatus.runningTimes > 0) {
                // 下线agent上运行的任务，无法判定其结果，保留了runningTimes计数，等再次上线才判定其结果更准确；
                // 但又要防御这个机器长期不上线阻碍整个系统的任务分配
                let runningTimes = 0;
                for (let con of connections) {
                    const runLog = jobTaskInfo.taskInfo.runLogs.get(con.__agentInfo.agent.agentId);
                    if (runLog && (!runLog.deployFailed && !runLog.finishTime)) {
                        runningTimes++;
                    }
                }

                if (runningTimes > 0) {
                    break;
                }
            }
        }
    }

    handleSystemQuery(ctx) {
        const request = ctx.request.body;
        
        let resp = {
            err: {
                code: AgentMgr.ErrorCode.success,
                msg: 'success',
            },
            url: undefined,
            md5: undefined,
            newversion: undefined,
        };
        ctx.body = resp;

        const agentInfo = this.m_agents.get(request.agentid);
        if (!agentInfo || agentInfo.agent.accessible === ServiceStorage.AccessibleStatus.not) {
            if (!this.m_publish.formal) {
                resp.err.code = AgentMgr.ErrorCode.notFound;
                resp.err.msg = 'not found pkg';
                return;
            } else {
                resp.url = select_url(this.m_publish.formal.url, agentInfo);
                resp.md5 = this.m_publish.formal.md5;
                resp.newversion = this.m_publish.formal.version;
                return;
            }
        } else {
            const sysPkg = this.m_publish.pre || this.m_publish.formal;
            if (!sysPkg) {
                resp.err.code = AgentMgr.ErrorCode.notFound;
                resp.err.msg = 'not found pkg';
                return;
            } else {
                resp.url = select_url(sysPkg.url, agentInfo);
                resp.md5 = sysPkg.md5;
                resp.newversion = sysPkg.version;
                return;
            }
        }
    }

    async handleSystemPrePublish(ctx) {
        const request = ctx.request.body;
        
        let resp = {
            err: {
                code: AgentMgr.ErrorCode.success,
                msg: 'success',
            },
        };
        ctx.body = resp;

        let newSysPkg = {
            url: request.url,
            md5: request.md5,
            version: request.version,
            preTime: Date.now(),
            formalTime: 0,
            formaled: 0,
        };

        const err = await this.m_serviceStorage.prePublish(newSysPkg);
        if (err) {
            resp.err.code = AgentMgr.ErrorCode.failed;
            resp.err.msg = `sql error:${err.message}`;
            return;
        }
        this.m_publish.pre = newSysPkg;
    }

    async handleSystemPublish(ctx) {
        const request = ctx.request.body;
        
        let resp = {
            err: {
                code: AgentMgr.ErrorCode.success,
                msg: 'success',
            },
        };
        ctx.body = resp;

        if (!this.m_publish.pre) {
            resp.err.code = AgentMgr.ErrorCode.failed;
            resp.err.msg = '没有预发布包';
            return;
        }

        if (request.version !== this.m_publish.pre.version) {
            resp.err.code = AgentMgr.ErrorCode.failed;
            resp.err.msg = '你只能发布最新的预发布包';
            return;
        }
        
        let lastPrePkg = this.m_publish.pre;
        lastPrePkg.formalTime = Date.now();
        lastPrePkg.formaled = 1;
        const err = await this.m_serviceStorage.publish(lastPrePkg);
        if (err) {
            lastPrePkg.formalTime = 0;
            lastPrePkg.formaled = 0;
            resp.err.code = AgentMgr.ErrorCode.failed;
            resp.err.msg = `sql error:${err.message}`;
            return;
        }

        this.m_publish.pre = undefined;
        this.m_publish.formal = lastPrePkg;
        return;
    }

    handleSystemLastPublish(ctx) {
        const request = ctx.request.body;
        
        let resp = {
            err: {
                code: AgentMgr.ErrorCode.success,
                msg: 'success',
            },
            pre: undefined,
            formal: undefined,
        };
        ctx.body = resp;

        if (!this.m_publish.pre && !this.m_publish.formal) {
            resp.err.code = AgentMgr.ErrorCode.notFound;
            resp.err.msg = '没有预发布包，也没有正式包';
            return;
        }

        if (this.m_publish.pre) {
            resp.pre = {
                url: this.m_publish.pre.url,
                md5: this.m_publish.pre.md5,
                version: this.m_publish.pre.version,
                pretime: this.m_publish.pre.preTime,
            };
        }
        if (this.m_publish.formal) {
            resp.formal = {
                url: this.m_publish.formal.url,
                md5: this.m_publish.formal.md5,
                version: this.m_publish.formal.version,
                publishtime: this.m_publish.formal.formalTime,
            };
        }
        return;
    }
}

function select_url(url, agentInfo) {
    if (agentInfo && agentInfo.agent && agentInfo.agent.tags) {
        for (const tag of agentInfo.agent.tags) {
            if (tag == "LAB") {
                let fields = url.split("192.168.200.175");
                fields.splice(1, 0, "192.168.100.2");
                let new_url = "";
                fields.forEach(f => new_url += f);
                return new_url;
            }
        }
    }
    return url;
}

AgentMgr.ErrorCode = {
    success: 0,
    failed: 256,
    notFound: 257,
    remoteCongestion: 258,
    unknownPackage: 259,
    notImpl: 260,
    invalidParam: 261,
    timeout: 262,
    deployFailed: 263,
};

AgentMgr.masterNameSpace = {
    agentId: 'AgentMaster',
    serviceId: 'LocalMasterServiceId',
    taskId: '',
};

module.exports = {
    AgentMgr,
};

if (path.basename(require.main.filename) === 'agent_mgr.js') {
    async function test() {
        let agentMgr = new AgentMgr(path.dirname(__dirname));
        let err = await agentMgr.init();
        if (err) {
            base.blog.warn(err.message);
            return;
        }

        const updateServiceReq = {
            header: {
                name: 'sys.updateservice.req',
                seq: 1,
                to: {
                    agentId: 'testPeer2',
                    serviceId: '',
                    taskId: '',
                },
                from: {
                    agentId: 'testPeer1',
                    serviceId: '',
                    taskId: '',
                },
            },
            body: {
                serviceId: 'testService',
                serviceName: 'testServiceName',
                newVersion: '1.1',
                url: 'testUrl',
                md5: '1234',
            },
        };

        agentMgr.handle(updateServiceReq, {__agentInfo: {}, send: () => {}});
    }

    test();
}