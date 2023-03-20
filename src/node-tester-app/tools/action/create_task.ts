import * as http from "http";
import * as fs from 'fs-extra';
import * as path from 'path';
import {upload,request,ContentType} from './request';
import {CaseConfig} from "./index"
import * as SysProcess from 'process';
import { Command } from "commander";
import { DirHelper } from "../../base";
var date = require("silly-datetime");
async function addTask(serviceid:number,servicename:string,desc:string,version:string,url:string,mds:string,runrule:number,distribute:number){
    console.info(`addTask serviceid =${serviceid} servicename = ${servicename} desc = ${desc} mds = ${mds}`)
    let postData = JSON.stringify(
        {
            "serviceid": Number(serviceid),
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
    let filePath = path.join(DirHelper.getTaskRoot(),`${name}`,fileName) ;
    let resp = await upload(filePath,fileName);
    return resp.data;  
}

async function uploadTasks(config:CaseConfig){
    let  version = String( parseFloat(config.rust_bdt.version) + 0.01);
    config.rust_bdt.version = version;
    let name = config.rust_bdt.name;
    console.info(`version: ${version}`)
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
async function create(task_name:string,serviceid:number,servicename:string,save_path:string){
    
    let config:CaseConfig = {
        rust_bdt:{
            "name": task_name,
            "version": "1.00",
            "distribute": 1,
            "runrule": 2,
            "serviceid": serviceid,
            "servicename": servicename,
            list:[]
        }
    };
    let caseDir = DirHelper.getTaskRoot();
    let case_list = fs.readdirSync(caseDir);
    for(let i in case_list){
        if(fs.existsSync(path.join(caseDir,case_list[i],`${case_list[i]}.zip`))){
            config.rust_bdt.list.push({
                desc : case_list[i]
            })
        }
    }
    await uploadTasks(config)
    fs.mkdirpSync(save_path);
    await fs.writeFileSync(path.join(save_path,`./${task_name}.json`),JSON.stringify(config))
}

export function makeCommand(): Command {
    let default_path = path.join(__dirname,"../tasks");
    return new Command('create_task')
        .description("cyfs-test-lab create test task")
        .requiredOption("-i, --id <id>", "service id")
        .requiredOption("-n, --name <name>", "service name", "cyfs_bdt_cli")
        .requiredOption("-t, --task <task>", "task name")
        .requiredOption("-s, --save <save>", "task json info save dir path",default_path)
        .action(async (options) => {
            console.info(`will create task ${options.task} service id = ${options.id}`)
            return await create(options.task,options.id,options.name,options.save);
        });


}