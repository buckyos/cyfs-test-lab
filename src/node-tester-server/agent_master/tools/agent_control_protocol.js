/**
 * 格式：
 * objectMethod = {
 *      req: body,
 *      resp: body
 * }
 * 
 * body部分都采用JSON格式
 * http://n.n.n.n:port/object/method
 */

/**
 * 一般对象有五个接口：
 * 增加：add，增加新的对象
 * 删除：remove，删除已存在对象
 * 修改：update，更新已存在对象的某些属性
 * 列表：list，按规则列举需要的对象概要信息
 * 详情：detail，查询指定对象的详细信息，对象内容不多的节点不需要该接口
 */

// 常用字段<字段名 = 类型名>：
const id = string; // 相应对象的ID，当涉及到多个对象时明确名称: xxxId，不明确名称的视为接口操作的目标对象
const name = string; // 相应对象的名称，当涉及多个对象时明确名称: xxxName，不明确名称的视为接口操作的目标对象
const version = string; // 相应对象的版本号，当涉及到多个对象时明确名称: xxxVersion，不明确名称的视为接口操作的目标对象
const env = string; // 'json'
const accessible = 0 || 1; // <false | true | unknown>
const status = enumerator;
const desc = string;
const url = string;
const md5 = string;
const tags = string;
const others = {} || none; // 暂时不确定的内容（字段/字段值），后面待定，暂时用others占位，非真实的字段名
const filter = others; // 过滤规则，一般在list接口上出现，用于选取符合指定特征的项目
const rules = others; // 某种操作(部署/执行)的规则
const err = {
    code: int,
    msg: string,
};

const AgentStatus = {
    offline: 0,
    online: 1,
};

const ServiceStatus = {
    stop: 0,
    running: 1,
};

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

// agent

const agentUpdate = {
    req: {
        agentid,
        env,
        accessible,
        desc,
        tags,
    },
    resp: {
        err,
    }
};

const agentList = {
    req: {
        filter,
    },
    resp: {
        err,
        agents: [
            {
                agentid,
                version,
                env,
                accessible,
                status,
                desc, 
                tags,
            }
        ]
    }
};

const agentDetail = {
    req: {
        agentid,
    },
    resp: {
        err,
        detail: {
            agentid,
            version,
            env,
            accessible,
            status,
            desc, 
            tags,
            others,
        }
    }
};

// 列举指定agent正在执行的工作
const agentWorkList = {
    req: {
        agentid,
    },
    resp: {
        services: [
            {
				serviceid,
				servicename,
				status,
            }
        ],
        tasks: [
            {
                taskid,
                desc,
				status,
            }
        ]
    }
};

// service

const serviceAdd = {
    req: {
        servicename,
        version,
        url,
        md5,
        agentscope: 1 | 2 | 3, // all | 'accessible' | '!accessible'
    },
    resp: {
        err,
        serviceid,
    }
};

const serviceRemove = {
    req: {
        serviceid,
    },
    resp: {
        err,
    }
};

const serviceUpdate = {
    req: {
        serviceid,
        servicename,
        version,
        url,
        md5,
        agentscope: 1 | 2 | 3, // all | 'accessible' | '!accessible'
    },
    resp: {
        err,
    }
};

const serviceList = {
    req: {
        filter,
    },
    resp: {
        err,
        services: [
            {
                serviceid,
                servicename,
                version,
                url,
                agentscope: 1 | 2 | 3, // all | 'accessible' | '!accessible'
				status,
            }
        ],
    }
};

const serviceListmini = {
    req: {
        filter,
    },
    resp: {
        err,
        services: [
            {
                serviceid,
                servicename,
            }
        ]
    },
};

const serviceDetail = {
    req: {
        serviceid,
    },
    resp: {
        err,
        service: {
            serviceid,
            servicename,
            version,
            url,
            md5,
            agentscope: 1 | 2 | 3, // all | 'accessible' | '!accessible'
			status,
        },
    }
}

const serviceStop = {
    req: {
        agentid,
        serviceid,
    },
    resp: {
        err,
    }
}

// task
const taskAdd = {
    req: {
        serviceid,
        version,
        url,
        md5,
        desc,
        runrule: 1 | 2, // 'serial' || 'parallel'
        distribute: 1 | 2, // any | 在有对应service机器上运行
    },
    resp: {
        err,
        taskid,
    }
};

const taskRemove = {
    req: {
        taskid,
    },
    resp: {
        err,
    }
};

const taskUpdate = {
    req: {
        taskid,
        version,
        url,
        md5,
        desc,
        runrule: 1 | 2, // 'serial' || 'parallel'
        distribute: 1 | 2, // any | 在有对应service机器上运行
    },
    resp: {
        err,
    }
};

const taskList = {
    req: {
        filter,
    },
    resp: {
        err,
        tasks: [
            {
                taskid,
                version,
                url,
                desc,
                status,
                serviceid,
                servicename,
                runrule: 1 | 2, // 'serial' || 'parallel'
                distribute: 1 | 2, // any | 在有对应service机器上运行
            }
        ]
    }
};

const taskListMini = {
    req: {
        filter: {
            serviceid,
            others
        },
    },
    resp: {
        err,
        tasks: [
            {
                taskid,
                desc
            }
        ]
    }
};

const taskStart = {
    req: {
        taskid,
    },
    resp: {
        err,
    }
};

const taskStop = {
    req: {
        taskid,
    },
    resp: {
        err,
    }
};

const taskDetail = {
    req: {
        taskid,
    },
    resp: {
        err,
        tasks: {
            taskid,
            version,
            url,
            md5,
            desc,
            status,
            serviceid,
            servicename,
            runrule: 1 | 2, // 'serial' || 'parallel'
            distribute: 1 | 2, // any | 在有对应service机器上运行
        }
    }
}

// job

const jobAdd = {
    req: {
        serviceid,
        desc,
        tasks: [
            {
                taskid: int,
                timeslimit: int,
            }
        ],
        rules,
    },
    resp: {
        err,
        jobid,
    }
},

const jobRemove = {
    req: {
        jobid,
    },
    resp: {
        err,
    }
};

// delay
const jobUpdate = {
    req: {
        jobid,
        desc,
        taskids: [
            {
                taskid: int,
                timesLimit: int,
            }
        ],
        rules,
    },
    resp: {
        err,
    }
};

const jobList = {
    req: {
        serviceid, // 如果设定，将只返回该service下的jobs；置空表示查询全量jobs
        filter,
    },
    resp: {
        err,
        jobs: [
            {
                jobid,
                desc,
                serviceid,
                servicename,
                status,
            }
        ]
    }
};

const jobListTask = {
    req: {
        jobid,
        filter,
    },
    resp: {
        err,
		jobid,
        tasks: [
            {
                taskid,
                desc,
                status,
                timesLimit,
                successTimes,
				failedTimes,
            }
        ]
    }
};

const jobStart = {
    req: {
        jobid,
    },
    resp: {
        err
    }
};

const jobStop = {
    req: {
        jobid,
    },
    resp: {
        err
    }
}

const jobTaskResult = {
    req: {
        jobid,
        taskid, // 不填返回所有
        resultfilter: 0 || 1 || 2, // 所有 || 仅失败 || 仅成功
    },
    resp: {
        err,
        jobid,
        desc,
        tasks: [
            {
                taskid,
                desc,
                successtimes,
                failedtimes,
                records: [
                    {
                        logid,
                        agentid,
                        result, // errorCode
                        taskversion,
                        starttime,
                        finishtime,
                        urls: [],
                    }
                ]
            }
        ]
    }
};

// 版本询问
const systemQuery = {
    req: {
        agentid,
        curversion,
    },
    resp: {
        err,
        url,
        md5,
        newversion,
    },
};

// 预发布，只发布到自建节点
const systemPrepublish = {
    req: {
        url,
        md5,
        version,
    },
    resp: {
        err,
    },
};

// 发布，全网发布
const systemPublish = {
    req: {
        version,
    },
    resp: {
        err
    }
};

// 查询最新版本
const systemLastPublish = {
    req: {
    },
    resp: {
        err,
        pre: { // 预发布包，如果最后一个包已经正式发布，该字段置空
            url,
            md5,
            version,
			pretime,
        },
        formal: { // 正式包，如果第一个包还没有正式发布，该字段置空
            url,
            md5,
            version,
			publishtime,
        }
    }
};

// upload file
`http://192.168.100.254:11000/uploadFile/${path}`
request.setHeader('Content-Type', 'application/octet-stream');
const resp = {
    url: `http://192.168.100.254/${savepath}`, // savepath是path最后一级后缀名前插入日期字符串
    md5: 'md5'
}

// 数据
    'CREATE TABLE IF NOT EXISTS agents (agentId TEXT, desc TEXT, accessible INT, tags TEXT, PRIMARY KEY(agentId))',
    'CREATE TABLE IF NOT EXISTS services (serviceId INT, version TEXT, name TEXT, url TEXT, md5 TEXT, status TINYINT, rules TEXT, PRIMARY KEY(serviceId))',
    'CREATE TABLE IF NOT EXISTS agent_services (serviceId INT, agentId TEXT, PRIMARY KEY(serviceId,agentId))',
    'CREATE TABLE IF NOT EXISTS agent_netinfo (agentId TEXT, netId INT, netName TEXT, netType TINYINT, ipv4 TEXT, ipv6 TEXT, udpEnable TINYINT, tcpEnable TINYINT, PRIMARY KEY(agentId,netId))',
    'CREATE TABLE IF NOT EXISTS tasks (taskId INT, serviceId INT, taskVersion TEXT, url TEXT, md5 TEXT, params TEXT, status TINYINT, desc TEXT, rules TEXT, PRIMARY KEY(taskId))',
    'CREATE TABLE IF NOT EXISTS jobs (jobId INT, desc TEXT, serviceId INT, rules TEXT, PRIMARY KEY(jobId))',
    'CREATE TABLE IF NOT EXISTS task_job (jobId INT, taskId INT, timesLimit INT, status TINYINT, successTimes INT, failedTimes INT, PRIMARY KEY(jobId,taskId))',
    'CREATE TABLE IF NOT EXISTS task_logs (taskId INT, jobId INT, taskVersion TEXT, agentId TEXT, startTime INT, finishTime INT, errorCode INT)',
