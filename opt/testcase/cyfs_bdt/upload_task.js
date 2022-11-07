"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const request_1 = require("./request");
const data_request = __importStar(require("./request_data"));
const SysProcess = __importStar(require("process"));
var date = require("silly-datetime");
async function addTask(serviceid, servicename, desc, version, url, mds, runrule, distribute) {
    let postData = JSON.stringify({
        "serviceid": serviceid,
        "servicename": servicename,
        "version": version,
        "desc": desc,
        "url": url,
        "md5": mds,
        "runrule": runrule,
        "distribute": distribute
    });
    let resp = await request_1.request('POST', 'task/add', postData, request_1.ContentType.json);
    return resp;
}
async function updateTask(taskid, desc, version, url, mds, runrule, distribute) {
    let postData = JSON.stringify({
        "taskid": taskid,
        "version": version,
        "desc": desc,
        "url": url,
        "md5": mds,
        "runrule": runrule,
        "distribute": distribute
    });
    let resp = await request_1.request('POST', 'task/update', postData, request_1.ContentType.json);
    return resp;
}
async function uplaodTaskZip(name) {
    let fileName = `${name}.zip`;
    let filePath = path.join(__dirname, `../tasks/${name}`, fileName);
    let resp = await request_1.upload(filePath, fileName);
    return resp.data;
}
async function uploadTasks(config) {
    let version = String(parseFloat(config.rust_bdt.version) + 0.01);
    config.rust_bdt.version = version;
    console.info(`version: ${version}`);
    let local_list = fs.readdirSync(path.join(__dirname, "../tasks"));
    for (let caseIndex in config.rust_bdt.list) {
        let taskInfo = config.rust_bdt.list[caseIndex];
        if (taskInfo.taskid === 0 || taskInfo.taskid === undefined) {
            let infoFile = await uplaodTaskZip(taskInfo.desc);
            let infoTask = await addTask(config.rust_bdt.serviceid, config.rust_bdt.servicename, taskInfo.desc, version, infoFile.url, infoFile.md5, config.rust_bdt.runrule, config.rust_bdt.distribute);
            config.rust_bdt.list[caseIndex].taskid = infoTask.data.taskid;
            console.info(`add task ${taskInfo.desc} : ${JSON.stringify(infoTask)}`);
        }
        else {
            let infoFile = await uplaodTaskZip(taskInfo.desc);
            let infoTask = await updateTask(taskInfo.taskid, taskInfo.desc, version, infoFile.url, infoFile.md5, config.rust_bdt.runrule, config.rust_bdt.distribute);
            console.info(`update task ${taskInfo.desc} : ${JSON.stringify(infoTask)}`);
        }
    }
}
async function sleep(time) {
    return new Promise(async (V) => {
        setTimeout(() => {
            V("");
        }, time);
    });
}
async function update(name) {
    var config = require(`./${name}`);
    config.rust_bdt2 = await uploadTasks(config);
    await fs.writeFileSync(path.join(__dirname, `./${name}.json`), JSON.stringify(config));
}
async function create(name, serviceid, servicename) {
    let config = {
        rust_bdt: {
            "name": name,
            "version": "1.00",
            "distribute": 1,
            "runrule": 2,
            "serviceid": serviceid,
            "servicename": servicename,
            list: []
        }
    };
    let caseDir = path.join(__dirname, "../tasks");
    let case_list = fs.readdirSync(caseDir);
    for (let i in case_list) {
        if (fs.existsSync(path.join(caseDir, case_list[i], `${case_list[i]}.zip`))) {
            config.rust_bdt.list.push({
                desc: case_list[i]
            });
        }
    }
    await uploadTasks(config);
    await fs.writeFileSync(path.join(__dirname, `./${name}.json`), JSON.stringify(config));
}
async function create_job(name, serviceid, servicename, runNum) {
    let run_time = date.format(new Date(), 'YYYY/MM/DD HH:mm:ss');
    let config = {
        desc: name + run_time,
        serviceid: serviceid,
        servicename: servicename,
        tasks: []
    };
    var config_case = require(`./${name}`);
    for (let i in config_case.rust_bdt.list) {
        config.tasks.push({
            desc: config_case.rust_bdt.list[i].desc,
            taskid: config_case.rust_bdt.list[i].taskid,
            timeslimit: runNum
        });
    }
    let resp = await request_1.request('POST', 'job/add', JSON.stringify(config), request_1.ContentType.json);
    console.info(`job/add resp : ${JSON.stringify(resp)}`);
    config.jobid = resp.data.jobid;
    await fs.writeFileSync(path.join(__dirname, `./${name}_task_${runNum}.json`), JSON.stringify(config));
    return resp.data.jobid;
}
async function run_job(name, serviceid, servicename, runNum, version) {
    let set_version = await setVersion(version);
    let jobid = await create_job(name, serviceid, servicename, runNum);
    let run = await startJob(jobid);
    let check = await checkJobRunState(jobid, 1 * 60 * 60 * 1000);
    let get_testcase_report = await getTestReport(version);
    return check;
}
async function removeJob(jobId) {
    let postData = JSON.stringify({
        jobid: jobId
    });
    let resp = await request_1.request('POST', 'job/remove', postData, request_1.ContentType.json);
    console.info(`job/remove resp : ${JSON.stringify(resp)}`);
    return resp;
}
async function startJob(jobId) {
    console.info(`send job/start req :jobId = ${jobId}`);
    let postData = JSON.stringify({
        jobid: jobId
    });
    let resp = await request_1.request('POST', 'job/start', postData, request_1.ContentType.json);
    console.info(`job/start resp : ${JSON.stringify(resp)}`);
    return resp;
}
async function stopJob(jobId) {
    let postData = JSON.stringify({
        jobid: jobId
    });
    let resp = await request_1.request('POST', 'job/stop', postData, request_1.ContentType.json);
    return resp;
}
async function jobList() {
    let postData = JSON.stringify({});
    let resp = await request_1.request('POST', 'job/list', postData, request_1.ContentType.json);
    return resp;
}
async function checkJobRunState(jobId, timeout) {
    let start = Date.now();
    while (Date.now() - start < timeout) {
        console.info(`send check job req :jobId = ${jobId}`);
        await sleep(10000);
        let check = await jobList();
        //console.info(check)
        for (let index in check.data.jobs) {
            let job = check.data.jobs[index];
            //console.info(`识别到测试任务${jobId},状态为：${job.status}`)
            if (job.jobid == jobId) {
                console.info(`识别到测试任务${jobId},状态为：${job.status},当前已经运行${Date.now() - start} `);
                if (job.status != 1) {
                    return { err: 0, log: `运行任务 ${jobId} 完成` };
                }
            }
        }
    }
    console.info(`运行任务 ${jobId} 超时退出`);
    return { err: 0, log: `运行任务 ${jobId} 超时退出` };
}
async function setVersion(version) {
    console.info("send cpmmand to server update testcase version");
    let config_path = "/node_tester_app/tasks/dev_config.js";
    let run = await data_request.request("POST", "api/bdt/report/setVersion", { version, config_path }, request_1.ContentType.json);
}
async function getTestReport(version) {
    console.info("send cpmmand to server,build testcase report");
    let run = await data_request.request("POST", "api/bdt/report/reportHtml", { version }, request_1.ContentType.json);
    console.info("create testcase report resp:");
    console.info(JSON.stringify(run));
}
async function main() {
    let opt = SysProcess.argv[2];
    let name = SysProcess.argv[3];
    let serviceid = Number(SysProcess.argv[4]);
    let servicename = SysProcess.argv[5];
    let runNum = Number(SysProcess.argv[6]);
    let version = version = date.format(new Date(), 'YYYY/MM/DD HH:mm:ss');
    switch (opt) {
        case "create_task": {
            await create(name, serviceid, servicename);
            break;
        }
        case "update_task": {
            await update(name);
            break;
        }
        case "create_job": {
            await create_job(name, serviceid, servicename, runNum);
            break;
        }
        case "run_job": {
            await run_job(name, serviceid, servicename, runNum, version);
            break;
        }
        default: {
            console.info(`invalid params`);
        }
    }
}
main();

