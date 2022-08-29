import * as http from "http";
import * as fs from 'fs';
import * as path from 'path';
import { upload, request, ContentType } from './request';
import * as SysProcess from 'process';


async function addTask(serviceid: number, servicename: string, desc: string, version: string, url: string, mds: string, runrule: number, distribute: number) {
    let postData = JSON.stringify(
        {
            "serviceid": serviceid,
            "servicename": servicename,
            "version": version,
            "desc": desc,
            "url": url,
            "md5": mds,
            "runrule": runrule,
            "distribute": distribute
        }
    )
    let resp = await request('POST', 'task/add', postData, ContentType.json)
    return resp;
}

async function updateTask(taskid: number, desc: string, version: string, url: string, mds: string, runrule: number, distribute: number) {
    let postData = JSON.stringify(
        {
            "taskid": taskid,
            "version": version,
            "desc": desc,
            "url": url,
            "md5": mds,
            "runrule": runrule,
            "distribute": distribute
        }
    )
    let resp = await request('POST', 'task/update', postData, ContentType.json)
    return resp;
}
async function uplaodTaskZip(name: string) {
    let fileName = `${name}.zip`;
    let filePath = path.join(__dirname, `../tasks/${name}`, fileName);
    let resp = await upload(filePath, fileName);
    return resp.data;
}


async function uploadTasks(config: CaseConfig) {
    let version = String(Number(config.rust_bdt.version) + 1) + ".01"
    let local_list = fs.readdirSync(path.join(__dirname, "../tasks"))
    for (let caseIndex in config.rust_bdt.list) {
        let taskInfo = config.rust_bdt.list[caseIndex];
        if (taskInfo.taskid === 0 || taskInfo.taskid === undefined) {
            let infoFile = await uplaodTaskZip(taskInfo.desc)
            let infoTask = await addTask(config.rust_bdt.serviceid, config.rust_bdt.servicename, taskInfo.desc, version!, infoFile.url, infoFile.md5, config.rust_bdt.runrule, config.rust_bdt.distribute)
            config.rust_bdt.list[caseIndex].taskid = infoTask.data.taskid
            console.info(`add task ${taskInfo.desc} : ${JSON.stringify(infoTask)}`)
        } else {
            let infoFile = await uplaodTaskZip(taskInfo.desc)
            let infoTask = await updateTask(taskInfo.taskid, taskInfo.desc, version!, infoFile.url, infoFile.md5, config.rust_bdt.runrule, config.rust_bdt.distribute)
            console.info(`update task ${taskInfo.desc} : ${JSON.stringify(infoTask)}`)
        }
    }
}


export type CaseConfig = {
    rust_bdt: {
        name: string,
        version: string,
        distribute: number,
        runrule: number,
        serviceid: number,
        servicename: string,
        list: Array<{ desc: string, taskid?: number }>
    }
}

async function main() {
    let name = SysProcess.argv[2];
    let serviceid = Number(SysProcess.argv[3]);
    let servicename = SysProcess.argv[4];
    let config: CaseConfig = {
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
    let caseDir = path.join(__dirname, "../tasks")
    let case_list = fs.readdirSync(caseDir);
    for (let i in case_list) {
        if (fs.existsSync(path.join(caseDir, case_list[i], `${case_list[i]}.zip`))) {
            config.rust_bdt.list.push({
                desc: case_list[i]
            })
        }
    }
    await uploadTasks(config)
    await fs.writeFileSync(path.join(__dirname, `./${name}.json`), JSON.stringify(config))
}
main();


