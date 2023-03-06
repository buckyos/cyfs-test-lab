import * as http from "http";
import { sleep } from "../../base";
import * as fs from 'fs-extra';
import * as path from 'path';
import {upload,request,ContentType} from './request';
import * as data_request from "./request_data"
import {CaseConfig,JobConfig} from "./index"
import * as SysProcess from 'process';
import { Command } from "commander";
var date = require("silly-datetime");



async function create_job(name:string,serviceid:number,servicename:string,runNum:number,save_path:string,version:string):Promise<number>{
    let config:JobConfig = {
        desc: version,
        serviceid: Number(serviceid),
        servicename: servicename,
        tasks : []
    };
    var config_case : CaseConfig = require(`../tasks/${name}`);
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
    console.info(`create job success job= ${config.jobid} save data to ${save_path}`)
    fs.mkdirpSync(save_path);
    save_path = path.join(save_path,`./${name}_task_${config.jobid}.json`)
    console.info(`save data to ${save_path} success`)
    await fs.writeFileSync(save_path,JSON.stringify(config))
    return  resp.data.jobid
}

async function run_job(name:string,serviceid:number,servicename:string,runNum:number,version:string,save_path:string,begin:string){
    let set_version = await setVersion(version);
    let jobid = await create_job(name,serviceid,servicename,runNum,save_path,version);
    console.info(`create job ${jobid}`)
    if(begin == "yes"){
        console.info(`start run job ${jobid}`)
        let run = await startJob(jobid);
        let check = await checkJobRunState(jobid,1*60*60*1000);
        let get_testcase_report = await getTestReport(version);
        return check
    }
    
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
export  function makeCommand(): Command {
    let default_path = path.join(__dirname,"../jobs");
    return new Command('create_job')
        .description("cyfs-test-lab create test job")
        .requiredOption("-i, --id <id>", "service id")
        .requiredOption("-n, --name <name>", "service name", "cyfs_bdt_cli")
        .requiredOption("-t, --task <task>", "task name")
        .requiredOption("-m, --mut <mut>", "task run number","1")
        .requiredOption("-v, --version <version>", "testcase version",`${date.format(new Date(),'YYYY_MM_DD_HH_mm_ss')}`)
        .requiredOption("-s, --save <save>", "job json info save dir path",default_path)
        .requiredOption("-b, --begin <begin>", "run job yes/no","yes")
        .action(async (options) => {
            console.info(`will create_job  ${options.task}`);
            if(!fs.existsSync(path.join(default_path,`${options.task}.json`))){
                console.error(`file ${path.join(default_path,`${options.task}.json`)} is not exist`)
            }
            await run_job(options.task,options.id,options.name,Number(options.mut),options.version,options.save,options.begin)
        });
}