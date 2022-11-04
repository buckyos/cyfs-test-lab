import * as http from "http";
import * as fs from 'fs';
import * as path from 'path';
import {upload,request,ContentType} from './request';
import * as data_request from "./request_data"

import * as SysProcess from 'process';
import { Command } from "commander";
var date = require("silly-datetime");
async function addTask(serviceid:number,servicename:string,desc:string,version:string,url:string,mds:string,runrule:number,distribute:number){
    let postData = JSON.stringify(
        {
            "serviceid":serviceid,
            "servicename":servicename,
            "version":version,
            "desc":desc,
            "url":url,
            "md5":mds,
            "runrule":runrule,
            "distribute":distribute
        }
    )
    let resp =  await request('POST','task/add',postData,ContentType.json)
    return resp;   
}

async function updateTask(taskid:number,desc:string,version:string,url:string,mds:string,runrule:number,distribute:number){
    let postData = JSON.stringify(
        {
            "taskid":taskid,
            "version":version,
            "desc":desc,
            "url":url,
            "md5":mds,
            "runrule":runrule,
            "distribute":distribute
        }
    )
    let resp =  await request('POST','task/update',postData,ContentType.json)
    return resp;   
}
async function  uplaodTaskZip(name:string){
    let fileName = `${name}.zip`;
    let filePath = path.join(__dirname,`../tasks/${name}`,fileName) ;
    let resp = await upload(filePath,fileName);
    return resp.data;  
}

async function uploadTasks(config:CaseConfig){
    let  version = String( parseFloat(config.rust_bdt.version) + 0.01);
    config.rust_bdt.version = version;
    console.info(`version: ${version}`)
    let local_list = fs.readdirSync(path.join(__dirname,"../tasks"))
    for(let caseIndex in config.rust_bdt.list){
        let taskInfo = config.rust_bdt.list[caseIndex];
        if( taskInfo.taskid ===0 ||taskInfo.taskid === undefined){
            let infoFile = await uplaodTaskZip(taskInfo.desc)
            let infoTask = await addTask(config.rust_bdt.serviceid,config.rust_bdt.servicename,taskInfo.desc,version!,infoFile.url,infoFile.md5,config.rust_bdt.runrule,config.rust_bdt.distribute)
            config.rust_bdt.list[caseIndex].taskid = infoTask.data.taskid
            console.info(`add task ${taskInfo.desc} : ${JSON.stringify(infoTask)}`)
        }else{
            let infoFile = await uplaodTaskZip(taskInfo.desc)
            let infoTask = await updateTask(taskInfo.taskid,taskInfo.desc,version!,infoFile.url,infoFile.md5,config.rust_bdt.runrule,config.rust_bdt.distribute)
            console.info(`update task ${taskInfo.desc} : ${JSON.stringify(infoTask)}`)
        }
    }
}
async function sleep(time: number) {
    return new Promise(async (V) => {
        setTimeout(() => {
            V("")
        }, time)
    })
}




export type CaseConfig = {
    rust_bdt:{
        name: string,
        version: string,
        distribute: number,
        runrule:number,
        serviceid: number,
        servicename: string,
        list:Array<{desc:string,taskid?:number}>
    }
}


export type JobConfig = {
    desc: string,
    serviceid: number,
    servicename: string,
    jobid? : number,
    tasks:Array<{desc:string,taskid?:number,timeslimit?:number}>

}


async function update(name:string){
    var config = require(`./${name}`);
    config.rust_bdt2 = await uploadTasks(config)
    await fs.writeFileSync(path.join(__dirname,`./${name}.json`),JSON.stringify(config))
}

async function create(name:string,serviceid:number,servicename:string){
    let config:CaseConfig = {
        rust_bdt:{
            "name": name,
            "version": "1.00",
            "distribute": 1,
            "runrule": 2,
            "serviceid": serviceid,
            "servicename": servicename,
            list:[]
        }
    };
    let caseDir = path.join(__dirname,"../tasks")
    let case_list = fs.readdirSync(caseDir);
    for(let i in case_list){
        if(fs.existsSync(path.join(caseDir,case_list[i],`${case_list[i]}.zip`))){
            config.rust_bdt.list.push({
                desc : case_list[i]
            })
        }
    }
    await uploadTasks(config)
    await fs.writeFileSync(path.join(__dirname,`./${name}.json`),JSON.stringify(config))
}

async function create_job(name:string,serviceid:number,servicename:string,runNum:number):Promise<number>{
    let run_time =  date.format(new Date(),'YYYY/MM/DD HH:mm:ss');
    let config:JobConfig = {
        desc: name+run_time,
        serviceid: serviceid,
        servicename: servicename,
        tasks : []
    };
    var config_case : CaseConfig = require(`./${name}`);
    for(let i in config_case.rust_bdt.list){
        config.tasks.push({
            desc:config_case.rust_bdt.list[i].desc,
            taskid:config_case.rust_bdt.list[i].taskid,
            timeslimit : runNum
        })
    }
    let resp =  await request('POST','job/add', JSON.stringify(config),ContentType.json)
    console.info(`job/add resp : ${JSON.stringify(resp)}`)
    config.jobid = resp.data.jobid;
    await fs.writeFileSync(path.join(__dirname,`./${name}_task_${runNum}.json`),JSON.stringify(config))
    return  resp.data.jobid
}

async function run_job(name:string,serviceid:number,servicename:string,runNum:number,version:string){
    let set_version = await setVersion(version);
    let jobid = await create_job(name,serviceid,servicename,runNum);
    let run = await startJob(jobid);
    let check = await checkJobRunState(jobid,1*60*60*1000);
    let get_testcase_report = await getTestReport(version);
    return check
}

async function removeJob(jobId:number) {
    let postData = JSON.stringify(
        {
            jobid:jobId
        }
    )
    let resp =  await request('POST','job/remove',postData,ContentType.json)
    console.info(`job/remove resp : ${JSON.stringify(resp)}`)
    return resp;    
}

async function startJob(jobId:number) {
    console.info(`send job/start req :jobId = ${jobId}`)
    let postData = JSON.stringify(
        {
            jobid:jobId
        }
    )
    let resp =  await request('POST','job/start',postData,ContentType.json)
    console.info(`job/start resp : ${JSON.stringify(resp)}`)
    return resp;    
}
async function stopJob(jobId:number) {
    let postData = JSON.stringify(
        {
            jobid:jobId
        }
    )
    let resp =  await request('POST','job/stop',postData,ContentType.json)
    return resp;    
}
async function jobList(){
    let postData = JSON.stringify(
        {
        }
    )
    let resp =  await request('POST','job/list',postData,ContentType.json)
    return resp;   
}
async function checkJobRunState(jobId:number,timeout:number) {
    let start = Date.now();
    while( Date.now()-start<timeout){
        console.info(`send check job req :jobId = ${jobId}`)
        await sleep(10000)
        let check = await jobList();
        //console.info(check)
        for(let index in check.data.jobs){
            let job = check.data.jobs[index];
            //console.info(`识别到测试任务${jobId},状态为：${job.status}`)
            if(job.jobid == jobId){
                console.info(`识别到测试任务${jobId},状态为：${job.status},当前已经运行${Date.now()-start} `)
                if(job.status!=1){
                    return {err:0,log:`运行任务 ${jobId} 完成`}
                }
            }
        }
    }
    console.info(`运行任务 ${jobId} 超时退出`)
    return {err:0,log:`运行任务 ${jobId} 超时退出`}
    
}
async function setVersion(version:string) {
    console.info("send cpmmand to server update testcase version")
    let config_path = "/node_tester_app/tasks/dev_config.js"
    let run =await data_request.request("POST","api/bdt/report/setVersion",{version,config_path},ContentType.json)
}
async function getTestReport(version:string) {
    console.info("send cpmmand to server,build testcase report")
    let run =await data_request.request("POST","api/bdt/report/reportHtml",{version},ContentType.json)
    console.info("create testcase report resp:")
    console.info(JSON.stringify(run))
}


async function main() {
    let opt =  SysProcess.argv[2];
    let name =  SysProcess.argv[3];
    let serviceid =  Number(SysProcess.argv[4]);
    let servicename =  SysProcess.argv[5];
    let runNum = Number(SysProcess.argv[6]);
    let version = String(SysProcess.argv[7]);
    if(!version){
        version =  date.format(new Date(),'YYYY/MM/DD HH:mm:ss');
    }
    switch(opt){
        case "create_task" : {
            await create(name,serviceid,servicename)
            break;
        }
        case "update_task" : {
            await update(name)
            break;
        }
        case "create_job" : {
            await create_job(name,serviceid,servicename,runNum)
            break;
        }
        case "run_job" : {
            await run_job(name,serviceid,servicename,runNum,version)
            break;
        }
        default : {
            console.info(`invalid params`)
        }
    }
}
main();





