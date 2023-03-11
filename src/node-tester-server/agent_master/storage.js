const assert = require('assert');
const sqlite = require('sqlite3');
const base = require('./common/base');

const {Constant} = require('./protocol');

const TaskStatus = {
    stop: 0,
    running: 1,
    finish: 2,
    noPlan: 3,
};

const AccessibleStatus = {
    not: 0,
    in: 1,
};

const JobStatus = {
    stop: 0,
    running: 1,
    finish: 2,
};

const _initSqls = [
    'CREATE TABLE IF NOT EXISTS agents (agentId TEXT, desc TEXT, accessible INT, tags TEXT, version TEXT, platform TEXT, PRIMARY KEY(agentId))',
    'CREATE TABLE IF NOT EXISTS services (serviceId INT, serviceVersion TEXT, name TEXT, url TEXT, md5 TEXT, status TINYINT, rules TEXT, PRIMARY KEY(serviceId))',
    'CREATE TABLE IF NOT EXISTS agent_services (serviceId INT, agentId TEXT, status TINYINT, PRIMARY KEY(serviceId,agentId))',
    'CREATE TABLE IF NOT EXISTS agent_netinfo (agentId TEXT, netId INT, netName TEXT, netType TINYINT, ipv4 TEXT, ipv6 TEXT, udpEnable TINYINT, tcpEnable TINYINT, PRIMARY KEY(agentId,netId))',
    'CREATE TABLE IF NOT EXISTS tasks (taskId INT, serviceId INT, taskVersion TEXT, url TEXT, md5 TEXT, params TEXT, desc TEXT, rules TEXT, PRIMARY KEY(taskId))',
    'CREATE TABLE IF NOT EXISTS jobs (jobId INT, desc TEXT, serviceId INT, rules TEXT, runningId INT, PRIMARY KEY(jobId))',
    'CREATE TABLE IF NOT EXISTS task_jobs (jobId INT, taskId INT, timesLimit INT, status TINYINT, successTimes INT, failedTimes INT, PRIMARY KEY(jobId,taskId))',
    'CREATE TABLE IF NOT EXISTS task_logs (logId INT, taskId INT, jobId INT, runningId INT, taskVersion TEXT, agentId TEXT, startTime BIGINT, finishTime BIGINT, errorCode INT, urls TEXT, msg TEXT, PRIMARY KEY(logId))',
    'CREATE TABLE IF NOT EXISTS publish (url TEXT, md5 TEXT, version TEXT, preTime BIGINT, formalTime BIGINT, formaled TINYINT, PRIMARY KEY(version))',
];

const _stmtSqls = [
    {
        name: 'addAgent',
        sql: 'INSERT INTO agents (agentId,desc,accessible,tags,version,platform) VALUES (?1,?2,?3,?4,?5,?6)',
    },
    {
        name: 'deleteAgent',
        sql: 'DELETE FROM agents WHERE (agentId=?1)',
    },
    {
        name: 'updateAgent',
        sql: 'UPDATE agents SET desc=?2,accessible=?3,tags=?4,version=?5,platform=?6 WHERE agentId=?1',
    },
    {
        name: 'addService',
        sql: 'INSERT INTO services (serviceId,serviceVersion,name,url,md5,status,rules) VALUES (?1,?2,?3,?4,?5,?6,?7)',
    },
    {
        name: 'deleteService',
        sql: 'DELETE FROM services WHERE (serviceId=?1)',
    },
    {
        name: 'updateService',
        sql: 'UPDATE services SET serviceVersion=?2,name=?3,url=?4,md5=?5,status=?6,rules=?7 WHERE serviceId=?1',
    },
    {
        name: 'addAgentService',
        sql: 'INSERT INTO agent_services (serviceId,agentId,status) VALUES (?1,?2,?3)',
    },
    {
        name: 'updateAgentService',
        sql: 'UPDATE agent_services SET status=?3 WHERE serviceId=?1 AND agentId=?2',
    },
    {
        name: 'deleteAgentService',
        sql: 'DELETE FROM agent_services WHERE (serviceId=?1) AND (agentId=?2)',
    },
    {
        name: 'deleteAgentServiceByServiceId',
        sql: 'DELETE FROM agent_services WHERE (serviceId=?1)',
    },
    {
        name: 'addAgentNetInfo',
        sql: 'INSERT INTO agent_netinfo (agentId,netId,netName,netType,ipv4,ipv6,udpEnable,tcpEnable) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)',
    },
    {
        name: 'updateAgentNetInfo',
        sql: 'UPDATE agent_netinfo SET netName=?3,netType=?4,ipv4=?5,ipv6=?6,udpEnable=?7, tcpEnable=?8 WHERE agentId=?1 AND netId=?2',
    },
    {
        name: 'deleteNetInfoByAgent',
        sql: 'DELETE FROM agent_netinfo WHERE agentId=?1',
    },
    {
        name: 'addTask',
        sql: `INSERT INTO tasks (taskId,serviceId,taskVersion,url,md5,params,desc,rules) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)`,
    },
    {
        name: 'updateTaskInfo',
        sql: 'UPDATE tasks SET serviceId=?2,taskVersion=?3,url=?4,md5=?5,params=?6,desc=?7,rules=?8 WHERE taskId=?1',
    },
    {
        name: 'deleteTask',
        sql: 'DELETE FROM tasks WHERE taskId=?1',
    },
    {
        name: 'deleteTaskByServiceId',
        sql: 'DELETE FROM tasks WHERE serviceId=?1',
    },
    // job
    {
        name: 'addJob',
        sql: 'INSERT INTO jobs (jobId,desc,rules,serviceId,runningId) VALUES (?1,?2,?3,?4,?5)',
    },
    {
        name: 'resetJob',
        sql: 'UPDATE jobs SET runningId=?2 WHERE jobId=?1',
    },
    {
        name: 'resetJobTaskByJobId',
        sql: 'UPDATE task_jobs SET status=?2,successTimes=0,failedTimes=0 WHERE jobId=?1',
    },
    {
        name: 'updateJob',
        sql: 'UPDATE jobs SET desc=?2,rules=?3 WHERE jobId=?1',
    },
    {
        name: 'deleteJob',
        sql: 'DELETE FROM jobs WHERE jobId=?1',
    },
    {
        name: 'deleteJobByServiceId',
        sql: 'DELETE FROM jobs WHERE serviceId=?1',
    },
    {
        name: 'addJobTask',
        sql: 'INSERT INTO task_jobs (jobId,taskId,timesLimit,status,successTimes,failedTimes) VALUES (?1,?2,?3,?4,?5,?6)',
    },
    {
        name: 'resetJobTask',
        sql: 'UPDATE task_jobs SET timesLimit=?3,status=?4,successTimes=?5,failedTimes=?6 WHERE jobId=?1 AND taskId=?2',
    },
    {
        name: 'updateJobTask',
        sql: 'UPDATE task_jobs SET timesLimit=?3 WHERE jobId=?1 AND taskId=?2',
    },
    {
        name: 'deleteJobTask',
        sql: 'DELETE FROM task_jobs WHERE jobId=?1 AND taskId=?2',
    },
    {
        name: 'deleteJobTaskByServiceId',
        sql: 'DELETE FROM task_jobs WHERE jobId IN (SELECT jobId FROM jobs WHERE serviceId=?1)',
    },
    {
        name: 'deleteJobTaskByJobId',
        sql: 'DELETE FROM task_jobs WHERE jobId=?1',
    },    {
        name: 'updateJobTaskStatus',
        sql: 'UPDATE task_jobs SET status=?3 WHERE jobId=?1 AND taskId=?2',
    },
    {
        name: 'updateJobTaskSuccessTimes',
        sql: 'UPDATE task_jobs SET successTimes=?3 WHERE jobId=?1 AND taskId=?2',
    },
    {
        name: 'updateJobTaskFailedTimes',
        sql: 'UPDATE task_jobs SET failedTimes=?3 WHERE jobId=?1 AND taskId=?2',
    },
    {
        name: 'deleteJobTaskByTaskId',
        sql: 'DELETE FROM task_jobs WHERE taskId=?1',
    },
    {
        name: 'addTaskLog',
        sql: 'INSERT INTO task_logs (logId,taskId,jobId,taskVersion,agentId,startTime,finishTime,errorCode,urls,msg,runningId) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)',
    },
    {
        name: 'updateTaskLogFinish',
        sql: 'UPDATE task_logs SET finishTime=?2,errorCode=?3,urls=?4,msg=?5 WHERE logId=?1',
    },
    {
        name: 'loadJobTaskLogsByJobId',
        sql: 'SELECT logId,taskId,taskVersion,agentId,startTime,finishTime,errorCode,urls,msg,runningId FROM task_logs WHERE jobId=?1 ORDER BY finishTime DESC',
    },
    {
        name: 'loadJobTaskLogsByJobIdWithRunningId',
        sql: 'SELECT logId,taskId,taskVersion,agentId,startTime,finishTime,errorCode,urls,msg,runningId FROM task_logs WHERE jobId=?1 AND runningId=?2',
    },
    {
        name: 'loadJobTaskLogsByJobIdAndTaskId',
        sql: 'SELECT logId,taskId,taskVersion,agentId,startTime,finishTime,errorCode,urls,msg,runningId FROM task_logs WHERE jobId=?1 AND taskId=?2 ORDER BY finishTime DESC',
    },
    {
        name: 'loadJobTaskLogsByJobIdAndTaskIdWithRunningId',
        sql: 'SELECT logId,taskId,taskVersion,agentId,startTime,finishTime,errorCode,urls,msg,runningId FROM task_logs WHERE jobId=?1 AND taskId=?2 AND runningId=?3',
    },
    {
        name: 'prePublish',
        sql: 'INSERT INTO publish (url,md5,version,preTime,formalTime,formaled) VALUES (?1,?2,?3,?4,0,0)',
    },
    {
        name: 'publish',
        sql: 'UPDATE publish SET formalTime=?2,formaled=1 WHERE version=?1',
    }
];

/**
 * 1.增加列：
 * ALTER TABLE table-name ADD COLUMN column-name type-name ...
 */

class ServiceStorage {
    constructor(dbPath) {
        this.m_filePath = dbPath;
        this.m_db = null;
        this.m_stmts = new Map(); // <name, stmt>

        this.m_lastId = 1;
    }

    async init() {
        const open = async () => {
            return new Promise(resolve => {
                this.m_db = new sqlite.Database(this.m_filePath, (err) => {
                    if (err) {
                        resolve(err);
                        return;
                    }
            
                    let initSqlDoneCount = 0;
                    const onInitSqlDone = (err) => {
                        if (err) {
                            resolve(err);
                            return;
                        }
    
                        initSqlDoneCount++;
                        if (initSqlDoneCount === _initSqls.length) {
                            resolve(null);
                            return;
                        }
                    }
    
                    for (let initSql of _initSqls) {
                        this.m_db.run(initSql, onInitSqlDone);
                    }
                });
            });
        }
            
        const prepareStmt = async () => {
            return new Promise(resolve => {
                let prepareCount = 0;
                _stmtSqls.forEach(stmtSql => {
                    let stmt = this.m_db.prepare(stmtSql.sql, (err) => {
                        if (err) {
                            resolve(err);
                            return;
                        }
                        this.m_stmts.set(stmtSql.name, stmt);
                        prepareCount++;
                        if (prepareCount === _stmtSqls.length) {
                            resolve(null);
                        }
                    })
                });
            })
        }

        const err = await open() ||
            await prepareStmt();

        if (err) {
            base.blog.error(err.message);
        };
        return err;
    }

    async load() {
        let agents = new Map(); // <agentId, {agent: {agentId}, netInfos: Map<netId, netInfo>, agentServiceInfos: Map<serviceId, {asInfo, serviceInfo}>, runningTaskIds: [], runningTaskIdSet, synTime}>
        let services = new Map(); // <`${serviceId}`, {service, serviceAgentInfos: Map<agentId, {asInfo, agentInfo}>, taskInfos: Map<taskid, taskInfo>, jobInfos: Map<jobid, jobInfo>}>
        let tasks = new Map(); // <`{taskid}`, {task, serviceInfo, jobInfos: Map<jobid, jobInfo>}>
        let jobs = new Map(); // <jobid, {job, serviceInfo, jobTaskInfos: Map<taskid, {runStatus, jobInfo, taskInfo}>>
        let publish = {
            pre: undefined,
            formal: undefined,
        };

        const loadServices = async () => {
            return new Promise(resolve => {
                this.m_db.all('SELECT serviceId, serviceVersion, name, url, md5, status, rules FROM services', (err, rows) => {
                    if (err) {
                        resolve(err);
                        return;
                    }

                    rows.forEach(service => {
                        if (service.serviceId > this.m_lastId) {
                            this.m_lastId = service.serviceId;
                        }
                        service.rules = JSON.parse(service.rules);
                        let serviceInfo = {
                            service,
                            agentInfos: new Map(),
                            taskInfos: new Map(),
                            jobInfos: new Map(),
                            serviceAgentInfos: new Map(),
                        };
                        services.set(service.serviceId, serviceInfo);
                    });
                    resolve(null);
                });
            });
        };

        const loadAgents = async () => {
            return new Promise(resolve => {
                this.m_db.all('SELECT agentId,desc,accessible,tags,version,platform FROM agents', (err, rows) => {
                    if (err) {
                        resolve(err);
                        return;
                    }

                    rows.forEach(agent => {
                        agent.tags = JSON.parse(agent.tags);
                        agents.set(agent.agentId, {
                            agent,
                            netInfos: new Map(),
                            serviceInfos: new Map(),
                            agentServiceInfos: new Map(),
                            runningTaskIds: [],
                            runningTaskIdSet: new Set(),
                            synTime: 0
                        });
                    });
                    resolve(null);
                });
            })
        };

        const loadAgentNetInfos = async () => {
            return new Promise(resolve => {
                this.m_db.all('SELECT agentId, netId, netName, netType, ipv4, ipv6, udpEnable, tcpEnable FROM agent_netinfo', (err, rows) => {
                    if (err) {
                        resolve(err);
                        return;
                    }

                    rows.forEach(agentNetInfo => {
                        let agentInfo = agents.get(agentNetInfo.agentId);
                        if (!agentInfo) {
                            // agentInfo = {
                            //     agent: {
                            //         agentId: agentNetInfo.agentId,
                            //         desc: '',
                            //         accessible: AccessibleStatus.not,
                            //     },
                            //     netInfos: new Map(),
                            //     serviceInfos: new Map,
                            // }
                            // agents.set(agentNetInfo.agentId, agentInfo);
                            return;
                        }

                        let netInfo = {
                            netId: agentNetInfo.netId,
                            name: agentNetInfo.netName,
                            type: agentNetInfo.netType,
                            ipv4: JSON.parse(agentNetInfo.ipv4),
                            ipv6: JSON.parse(agentNetInfo.ipv6),
                            udpEnable: agentNetInfo.udpEnable,
                            tcpEnable: agentNetInfo.tcpEnable,
                        };
                        agentInfo.netInfos.set(agentNetInfo.netId, netInfo);
                    });
                    resolve(null);
                });
            });
        };

        const loadAgentService = async () => {
            return new Promise(resolve => {
                this.m_db.all('SELECT serviceId, agentId, status FROM agent_services', (err, rows) => {
                    if (err) {
                        resolve(err);
                        return;
                    }

                    rows.forEach(record => {
                        let service = {
                            serviceId: record.serviceId,
                        };

                        let serviceInfo = services.get(service.serviceId);
                        let agentInfo = agents.get(record.agentId);
                        if (!serviceInfo || !agentInfo) {
                            return;
                        }

                        let asInfo = {
                            status: record.status,
                        };
                        serviceInfo.serviceAgentInfos.set(record.agentId, {asInfo, agentInfo});
                        agentInfo.agentServiceInfos.set(service.serviceId, {asInfo, serviceInfo});
                    });
                    resolve(null);
                });
            });
        };

        const loadTasks = async () => {
            return new Promise(resolve => {
                this.m_db.all('SELECT taskId,serviceId,taskVersion,url,md5,params,desc,rules FROM tasks', (err, rows) => {
                    if (err) {
                        resolve(err);
                        return;
                    }

                    rows.forEach(record => {
                        if (record.taskId > this.m_lastId) {
                            this.m_lastId = record.taskId;
                        }
                        if (record.serviceId > this.m_lastId) {
                            this.m_lastId = record.serviceId;
                        }

                        let serviceInfo = services.get(record.serviceId);
                        if (!serviceInfo) {
                            return;
                        }

                        let taskInfo = {
                            task: {
                                taskId: record.taskId,
                                taskVersion: record.taskVersion,
                                url: record.url,
                                md5: record.md5,
                                params: record.params,
                                desc: record.desc,
                                rules: JSON.parse(record.rules),
                            },
                            serviceInfo,
                            jobInfos: new Map(),
                            runLogs: new Map(),
                        };
                        tasks.set(record.taskId, taskInfo);
                    });

                    resolve(null);
                });
            });
        };

        const loadJobs = async () => {
            return new Promise(resolve => {
                this.m_db.all('SELECT jobId,desc,serviceId,rules,runningId FROM jobs', (err, rows) => {
                    if (err) {
                        resolve(err);
                        return;
                    }

                    rows.forEach(record => {
                        if (record.jobId > this.m_lastId) {
                            this.m_lastId = record.jobId;
                        }
                        if (record.serviceId > this.m_lastId) {
                            this.m_lastId = record.serviceId;
                        }

                        let serviceInfo = services.get(record.serviceId);
                        if (!serviceInfo) {
                            return;
                        }

                        let jobInfo = {
                            job: {
                                jobId: record.jobId,
                                desc: record.desc,
                                runningId: record.runningId,
                                rules: JSON.parse(record.rules),
                            },
                            serviceInfo,
                            jobTaskInfos: new Map(),
                        }
                        jobs.set(record.jobId, jobInfo);
                    });

                    resolve(null);
                });
            });
        };

        const loadTaskJobs = async () => {
            return new Promise(resolve => {
                this.m_db.all('SELECT jobId,taskId,timesLimit,status,successTimes,failedTimes FROM task_jobs', (err, rows) => {
                    if (err) {
                        resolve(err);
                        return;
                    }

                    rows.forEach(record => {
                        if (record.jobId > this.m_lastId) {
                            this.m_lastId = record.jobId;
                        }
                        if (record.taskId > this.m_lastId) {
                            this.m_lastId = record.taskId;
                        }

                        let jobInfo = jobs.get(record.jobId);
                        let taskInfo = tasks.get(record.taskId);
                        if (!jobInfo || !taskInfo) {
                            return;
                        }

                        if (record.status !== TaskStatus.finish) {
                            if (record.successTimes + record.failedTimes >= record.timesLimit) {
                                record.status = TaskStatus.finish;
                            }
                        } else {
                            if (record.successTimes + record.failedTimes < record.timesLimit) {
                                record.status = TaskStatus.stop;
                            }
                        }

                        let jobTaskInfo = {
                            runStatus: {
                                timesLimit: record.timesLimit,
                                status: record.status,
                                successTimes: record.successTimes,
                                failedTimes: record.failedTimes,
                                runningTimes: 0,
                                runLogs: new Map(),
                            },
                            taskInfo,
                            jobInfo,
                        };
                        jobInfo.jobTaskInfos.set(record.taskId, jobTaskInfo);
                    });

                    resolve(null);
                });
            });
        };

        const loadMaxLogId = async () => {
            return new Promise(resolve => {
                this.m_db.all('SELECT MAX(logId) AS maxLogId FROM task_logs', (err, rows) => {
                    if (err) {
                        resolve(err);
                        return;
                    }

                    let lastLogId = 1;
                    if (rows.length > 0 && rows[0].maxLogId) {
                        lastLogId = rows[0].maxLogId;
                    }
                    if (lastLogId > this.m_lastId) {
                        this.m_lastId = lastLogId;
                    }

                    resolve(null);
                });
            });
        };

        const loadLastPublish = async () => {
            return new Promise(resolve => {
                this.m_db.all('SELECT url,md5,version,preTime,formalTime,formaled FROM publish ORDER BY preTime DESC', (err, rows) => {
                    if (err) {
                        resolve(err);
                        return;
                    }

                    for (let record of rows) {
                        if (record.formaled) {
                            if (!publish.formal) {
                                publish.formal = record;
                                break;
                            }
                        } else {
                            if (!publish.pre) {
                                publish.pre = record;
                                if (publish.formal) {
                                    break;
                                }
                            }
                        }
                    }
                    resolve(null);
                })
            });
        };

        const err = await loadServices() ||
                await loadAgents() ||
                await loadAgentNetInfos() ||
                await loadAgentService() ||
                await loadTasks() ||
                await loadJobs() ||
                await loadTaskJobs() ||
                await loadMaxLogId() ||
                await loadLastPublish();
        
        if (err) {
            base.blog.error(err.message);
        };
        return {err, services, agents, tasks, jobs, publish};
    }

    nextId() {
        this.m_lastId++;
        return this.m_lastId;
    }

    addAgent(agent) {
        let stmt = this.m_stmts.get('addAgent');
        assert(stmt);
        stmt.run(agent.agentId, agent.desc, agent.accessible, JSON.stringify(agent.tags), agent.version, agent.platform);
    }
    deleteAgent(agentid) {
        let stmt = this.m_stmts.get('deleteAgent');
        assert(stmt);
        stmt.run(agentid);
    }
    updateAgent(agent) {
        let stmt = this.m_stmts.get('updateAgent');
        assert(stmt);
        stmt.run(agent.agentId, agent.desc, agent.accessible, JSON.stringify(agent.tags), agent.version, agent.platform);
    }

    addService(service) {
        this.m_lastId++;
        service.serviceId = this.m_lastId;

        let stmt = this.m_stmts.get('addService');
        assert(stmt);
        stmt.run(service.serviceId, service.serviceVersion, service.name, service.url, service.md5, service.status, JSON.stringify(service.rules));
    }

    updateService(service) {
        let stmt = this.m_stmts.get('updateService');
        assert(stmt);
        stmt.run(service.serviceId, service.serviceVersion, service.name, service.url, service.md5, service.status, JSON.stringify(service.rules));
    }

    deleteService(service) {
        let stmt = this.m_stmts.get('deleteService');
        assert(stmt);
        stmt.run(service.serviceId);

        this._deleteAgentServiceByServiceId(service.serviceId);
        this._deleteJobTaskByServiceId(service.serviceId);
        this._deleteJobByServiceId(service.serviceId);
        this._deleteTaskByServiceId(service.serviceId);
    }

    addAgentService(serviceId, agentId, status) {
        let stmt = this.m_stmts.get('addAgentService');
        assert(stmt);
        stmt.run(serviceId, agentId, status);
    }

    updateAgentService(serviceId, agentId, status) {
        let stmt = this.m_stmts.get('updateAgentService');
        assert(stmt);
        stmt.run(serviceId, agentId, status);
    }

    deleteAgentService(serviceId, agentId) {
        assert(false, 'should not reach here.');
        let stmt = this.m_stmts.get('deleteAgentService');
        assert(stmt);
        stmt.run(serviceId, agentId);
    }

    _deleteAgentServiceByServiceId(serviceId) {
        let stmt = this.m_stmts.get('deleteAgentServiceByServiceId');
        assert(stmt);

        stmt.run(serviceId);
    }

    addAgentNetInfo(agentId, netInfo) {
        let stmt = this.m_stmts.get('addAgentNetInfo');
        assert(stmt);

        stmt.run(agentId, netInfo.netId, netInfo.name, netInfo.type, JSON.stringify(netInfo.ipv4), JSON.stringify(netInfo.ipv6), netInfo.udpEnable, netInfo.tcpEnable);
    }

    async updateAllNetInfoOfAgent(agentInfo) {
        await this.deleteNetInfoByAgent(agentInfo.agent.agentId);
        
        let stmt = this.m_stmts.get('addAgentNetInfo');
        assert(stmt);

        const agent = agentInfo.agent;
        for (let [netId, netInfo] of agentInfo.netInfos) {
            stmt.run(agent.agentId, netId, netInfo.name, netInfo.type, JSON.stringify(netInfo.ipv4), JSON.stringify(netInfo.ipv6), netInfo.udpEnable, netInfo.tcpEnable);
        }
    }

    async deleteNetInfoByAgent(agentId) {
        let stmt = this.m_stmts.get('deleteNetInfoByAgent');
        assert(stmt);
        return new Promise(resolve => {
            stmt.run(agentId, (err) => resolve(err));
        });
    }

    addTask(task, serviceId) {
        this.m_lastId++;
        task.taskId = this.m_lastId;

        let stmt = this.m_stmts.get('addTask');
        assert(stmt);

        stmt.run(task.taskId, serviceId, task.taskVersion, task.url, task.md5, JSON.stringify(task.params || '[]'), task.desc, JSON.stringify(task.rules));
    }

    updateTask(task, serviceId) {
        let stmt = this.m_stmts.get('updateTaskInfo');
        assert(stmt);

        stmt.run(task.taskId, serviceId, task.taskVersion, task.url, task.md5, JSON.stringify(task.params) || '[]', task.desc, JSON.stringify(task.rules));
    }

    deleteTask(task) {
        let stmt = this.m_stmts.get('deleteTask');
        assert(stmt);

        stmt.run(task.taskId);

        this._deleteJobTaskByTaskId(task.taskId);
    }

    _deleteTaskByServiceId(serviceId) {
        let stmt = this.m_stmts.get('deleteTaskByServiceId');
        assert(stmt);

        stmt.run(serviceId);
    }

    addJob(job, serviceId) {
        this.m_lastId++;
        job.jobId = this.m_lastId;

        let stmt = this.m_stmts.get('addJob');
        assert(stmt);

        stmt.run(job.jobId, job.desc, JSON.stringify(job.rules), serviceId, job.runningId, (err) => {
            if (err) {
                base.blog.warn('add job failed:', err.message, ', jobid:', job.jobId);
            }
        });
    }

    resetJob(job, status) {
        let stmt = this.m_stmts.get('resetJob');
        assert(stmt);

        stmt.run(job.jobId, job.runningId, (err) => {
            if (err) {
                base.blog.warn('reset job failed:', err.message, ', jobid:', job.jobId);
            }
        });

        this._resetJobTaskByJobId(job.jobId, status);
    }

    _resetJobTaskByJobId(jobId, status) {
        let stmt = this.m_stmts.get('resetJobTaskByJobId');
        assert(stmt);

        stmt.run(jobId, status, (err) => {
            if (err) {
                base.blog.warn('reset job-task by jobid failed:', err.message, ', jobid:', jobId);
            }
        });
    }

    updateJob(job) {
        let stmt = this.m_stmts.get('updateJob');
        assert(stmt);

        stmt.run(job.jobId, job.desc, JSON.stringify(job.rules));
    }

    deleteJob(job) {
        let stmt = this.m_stmts.get('deleteJob');
        assert(stmt);

        stmt.run(job.jobId);

        this._deleteJobTaskByJobId(job.jobId);
    }

    _deleteJobByServiceId(serviceId) {
        let stmt = this.m_stmts.get('deleteJobByServiceId');
        assert(stmt);

        stmt.run(serviceId);
    }

    addJobTask(jobTask, jobId) {
        let stmt = this.m_stmts.get('addJobTask');
        assert(stmt);

        const runStatus = jobTask.runStatus;
        stmt.run(jobId, jobTask.taskInfo.task.taskId, runStatus.timesLimit, runStatus.status, runStatus.successTimes, runStatus.failedTimes);
    }

    async resetJobTask(jobTask, jobId) {
        let stmt = this.m_stmts.get('resetJobTask');
        assert(stmt);

        const runStatus = jobTask.runStatus;
        stmt.run(jobId, jobTask.taskInfo.task.taskId, runStatus.timesLimit, runStatus.status, runStatus.successTimes, runStatus.failedTimes);
    }

    updateJobTask(jobTask, jobId) {
        let stmt = this.m_stmts.get('updateJobTask');
        assert(stmt);

        const runStatus = jobTask.runStatus;
        stmt.run(jobId, jobTask.taskInfo.task.taskId, runStatus.timesLimit);
    }

    deleteJobTask(jobTask, jobId) {
        let stmt = this.m_stmts.get('deleteJobTask');
        assert(stmt);

        stmt.run(jobId, jobTask.taskInfo.task.taskId);
    }

    _deleteJobTaskByServiceId(serviceId) {
        let stmt = this.m_stmts.get('deleteJobTaskByServiceId');
        assert(stmt);

        stmt.run(serviceId);
    }

    _deleteJobTaskByJobId(jobId) {
        let stmt = this.m_stmts.get('deleteJobTaskByJobId');
        assert(stmt);

        stmt.run(jobId);
    }

    updateJobTaskStatus(jobTask, jobId) {
        let stmt = this.m_stmts.get('updateJobTaskStatus');
        assert(stmt);

        const runStatus = jobTask.runStatus;
        stmt.run(jobId, jobTask.taskInfo.task.taskId, runStatus.status);
    }

    updateJobTaskSuccessTimes(jobTask, jobId) {
        let stmt = this.m_stmts.get('updateJobTaskSuccessTimes');
        assert(stmt);

        stmt.run(jobId, jobTask.taskInfo.task.taskId, jobTask.runStatus.successTimes);
    }

    updateJobTaskFailedTimes(jobTask, jobId) {
        let stmt = this.m_stmts.get('updateJobTaskFailedTimes');
        assert(stmt);

        stmt.run(jobId, jobTask.taskInfo.task.taskId, jobTask.runStatus.failedTimes);
    }

    _deleteJobTaskByTaskId(taskId) {
        let stmt = this.m_stmts.get('deleteJobTaskByTaskId');
        assert(stmt);

        stmt.run(taskId);
    }

    addTaskLog(taskLog) {
        this.m_lastId++;
        taskLog.logId = this.m_lastId;

        let stmt = this.m_stmts.get('addTaskLog');
        assert(stmt);
        
        const {taskInfo, jobInfo} = taskLog.jobTaskInfo;
        stmt.run(taskLog.logId,
            taskInfo.task.taskId,
            jobInfo.job.jobId,
            taskLog.taskVersion,
            taskLog.agentInfo.agent.agentId,
            taskLog.startTime,
            taskLog.finishTime,
            taskLog.errorCode,
            JSON.stringify(taskLog.urls),
            taskLog.msg,
            taskLog.runningId,
        );
    }

    updateTaskLogFinish(taskLog) {
        let stmt = this.m_stmts.get('updateTaskLogFinish');
        assert(stmt);
        
        stmt.run(taskLog.logId,
            taskLog.finishTime,
            taskLog.errorCode,
            JSON.stringify(taskLog.urls),
            taskLog.msg
        );
    }

    async loadJobTaskLogsByJobId(jobId) {
        let stmt = this.m_stmts.get('loadJobTaskLogsByJobId');
        assert(stmt);

        return new Promise(resolve => {
            stmt.all(jobId, (err, rows) => {
                resolve([err, rows]);
            });
        });
    }

    async loadJobTaskLogsByJobIdWithRunningId(jobId, runningId) {
        let stmt = this.m_stmts.get('loadJobTaskLogsByJobIdWithRunningId');
        assert(stmt);

        return new Promise(resolve => {
            stmt.all(jobId, runningId, (err, rows) => {
                resolve([err, rows]);
            });
        });
    }

    async loadJobTaskLogsByJobIdAndTaskId(jobId, taskId) {
        let stmt = this.m_stmts.get('loadJobTaskLogsByJobIdAndTaskId');
        assert(stmt);

        return new Promise(resolve => {
            stmt.all(jobId, taskId, (err, rows) => {
                resolve([err, rows]);
            });
        });
    }

    async loadJobTaskLogsByJobIdAndTaskIdWithRunningId(jobId, taskId, runningId) {
        let stmt = this.m_stmts.get('loadJobTaskLogsByJobIdAndTaskIdWithRunningId');
        assert(stmt);

        return new Promise(resolve => {
            stmt.all(jobId, taskId, runningId, (err, rows) => {
                resolve([err, rows]);
            });
        });
    }

    async prePublish(sysPkg) {
        let stmt = this.m_stmts.get('prePublish');
        assert(stmt);

        return new Promise(resolve => {
            stmt.run(sysPkg.url, sysPkg.md5, sysPkg.version, sysPkg.preTime, (err) => {
                resolve(err);
            });
        });
    }

    async publish(sysPkg) {
        let stmt = this.m_stmts.get('publish');
        assert(stmt);

        return new Promise(resolve => {
            stmt.run(sysPkg.version, sysPkg.formalTime, (err) => {
                resolve(err);
            });
        });
    }

    beginTranaction() {
        this.m_db.run('BEGIN IMMEDIATE TRANSACTION');
    }

    commitTransaction() {
        this.m_db.run('COMMIT TRANSACTION');
    }

    close() {
        this.m_stmts.forEach(stmt => stmt.finalize());
        this.m_stmts.clear();

        if (this.m_db) {
            this.m_db.close();
            this.m_db = null;
        }
    }
}

ServiceStorage.TaskStatus = TaskStatus;
ServiceStorage.AccessibleStatus = AccessibleStatus;
ServiceStorage.JobStatus = JobStatus;

module.exports = ServiceStorage;