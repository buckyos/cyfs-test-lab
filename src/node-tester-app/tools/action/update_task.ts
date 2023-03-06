import * as http from "http";
import * as fs from 'fs';
import * as path from 'path';
import {upload,request,ContentType} from './request';
import {CaseConfig} from "./index"
import * as SysProcess from 'process';
import { Command } from "commander";
import { DirHelper } from "../../base";
var date = require("silly-datetime");
async function addTask(name:string,serviceid:number,servicename:string,desc:string,version:string,url:string,mds:string,runrule:number,distribute:number){
    let postData = JSON.stringify(
        {
            "serviceid":serviceid,
            "servicename":servicename,
            "version":version,
            "desc":name+desc,
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
            let infoTask = await addTask(name,config.rust_bdt.serviceid,config.rust_bdt.servicename,taskInfo.desc,version!,infoFile.url,infoFile.md5,config.rust_bdt.runrule,config.rust_bdt.distribute)
            config.rust_bdt.list[caseIndex].taskid = infoTask.data.taskid
            console.info(`add task ${taskInfo.desc} : ${JSON.stringify(infoTask)}`)
        }else{
            let infoFile = await uplaodTaskZip(taskInfo.desc)
            let infoTask = await updateTask(taskInfo.taskid,taskInfo.desc,version!,infoFile.url,infoFile.md5,config.rust_bdt.runrule,config.rust_bdt.distribute)
            console.info(`update task ${taskInfo.desc} : ${JSON.stringify(infoTask)}`)
        }
    }
}

async function update(name:string){
    var config = require(`../tasks/${name}`);
    config.rust_bdt2 = await uploadTasks(config)
    await fs.writeFileSync(path.join(__dirname,`./${name}.json`),JSON.stringify(config))
}
export function makeCommand(): Command {
    let default_path = path.join(__dirname,"../tasks");
    return new Command('update_task')
        .description("cyfs-test-lab update test job")
        .requiredOption("-t, --task <task>", "task name")
        .action(async (options) => {
            console.info(`will update task ${options.task}`)
            if(!fs.existsSync(path.join(default_path,`${options.task}.json`))){
                console.error(`file ${path.join(default_path,`${options.task}.json`)} is not exist`)
            }
            return await update(options.task);
        });
}