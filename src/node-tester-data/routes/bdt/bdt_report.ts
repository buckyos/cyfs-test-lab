//主要用于Login登录 register 注册
import express from "express";
export const router = express.Router();
import { BdtTestcase, TestcaseModel } from "../../model/bdt/bdt_testcase"
import { BdtTask } from "../../model/bdt/bdt_task"
import { BdtAction } from "../../model/bdt/bdt_action"
import { BdtAgent } from "../../model/bdt/bdt_agent"
import * as config from "../../config/config"
import {SystemInfo,SystemInfoModel} from "../../model/base/system_info"
import {BDTPerfReport} from "./perfChartsTool"
import {startZIP} from "./zip"
import * as path from "path";
import * as fs from "fs-extra";
import { BdtReport ,ReportModel} from "../../model/bdt/bdt_report"
var date = require("silly-datetime");
router.get("/text", (req, res) => {
    res.json({ msg: "bdt testcase report" });
});

router.post('/reportHtml',
    async (req, res) => {
        console.info(`#receive reportHtml report request,report testcase info into html,body = ${JSON.stringify(req.body)} `)
        if( !req.body.version){
            return res.json({err:true,log:"缺少输入参数"})
        }
        let check = path.join(config.BDT_Report_Dir,req.body.version,"TestcaseReport.html");
        let zip_url = `http://cyfs-test-lab/testcaseReport/${req.body.version}/${req.body.version}.zip`;
        let testcase_url = `http://cyfs-test-lab/testcaseReport/${req.body.version}/TestcaseReport.html`;
        let action_total_url = `http://cyfs-test-lab/testcaseReport/${req.body.version}/TotalActionPerf.html`;
        if(fs.pathExistsSync(check)){
            let result = {err:0,log:"测试报告已经生成，请勿重复触发",zip_url,testcase_url,action_total_url}
            return res.json(result)
        }else{
            let result_info =  await reportDataToHtml(req.body.version);
            let mod =  new BdtReport();
            let now =  date.format(new Date(),'YYYY/MM/DD HH:mm:ss');
            let data:ReportModel = {
                version : req.body.version!,
                zip_url,
                testcase_url,
                action_total_url,
                date : now
            }
            let save =await mod.add(data);
            let result = {err:result_info.err,log:result_info.log,zip_url,testcase_url,action_total_url}
            return res.json(result)
        }  
    }
);

router.post('/reportList',
    async (req, res) => {
        console.info(`#receive reportList req,body = ${JSON.stringify(req.body)} `)
        let mod =  new BdtReport(); 
        let result = await mod.querList();
        return res.json(result)
    }
);

router.post('/reportTestcase',
    async (req, res) => {
        console.info(`#receive reportHtml report request,report testcase info into html,body = ${JSON.stringify(req.body)} `)
        if(!req.body.testcaseId){
            return res.json({err:true,log:"缺少输入参数"})
        }
        let testcase_mod = new BdtTestcase();
        let testcase = await testcase_mod.query(req.body.testcaseId!);
        let testcaseId = testcase.result![0].testcaseId!;
        let environment = testcase.result![0].environment!;
        let check = path.join(config.BDT_Report_Dir,environment,"task",`${testcaseId}.html`);
        if(fs.pathExistsSync(check)){
            let result = {err:0,log:"测试报告已经生成，请勿重复触发",testcase_url:check}
            return res.json(result)
        }else{
            console.info(`testcase: ${testcaseId}`)
            let  testcase_info : any = testcase;
            let result_info = await reportTestcase(testcaseId,environment);  
            let result = {err:0,log:"create bdt testcase report sucesss",testcase_url:check}
            return res.json(result)
        }
           
    }
);
router.post('/setVersion',
    async (req, res) => {
        console.info(`#receive reportHtml report request,report testcase info into html,body = ${JSON.stringify(req.body)} `)
        if( !req.body.version && !req.body.config_path){
            return res.json({err:true,log:"缺少输入参数"})
        }
        if(fs.existsSync(req.body.config_path)){
            fs.removeSync(req.body.config_path);
        }
        try {
            fs.writeFileSync(req.body.config_path,`export const testcase_version = "${req.body.version}"`)
            return res.json({err:0,log:"config sucesss",path:req.body.config_path,version:req.body.version})
        } catch (error) {
            return res.json({err:1,log:`${JSON.stringify(error)}`})
        }
    }
);


async function sleep(time: number) {
    return new Promise(async (V) => {
        setTimeout(() => {
            V("")
        }, time)
    })
}

async function reportDataToHtml(environment: string) {
    //统计测试用例
    console.info(`begin running report ${environment}`)
    let testcase_mod = new BdtTestcase();
    let testcase_list = await testcase_mod.report(environment);
    if (testcase_list.err) {
        console.info(`查询测试用例失败:${testcase_list}`)
        return { err: 1, log: `查询测试用例失败:${testcase_list}` }
    }

    //统计所有的Task
    let runMax = 10;
    let running = [];
    let action_mod = new BdtAction();
    let SystemInfo_mod = new SystemInfo();
    for (let testcase of testcase_list.result!) {
        let testcaseId = testcase.testcaseId!;
        console.info(`testcase: ${testcaseId}`)
        let  testcase_info : any = testcase;
        testcase_info.details = `./task/${testcaseId}.html`;
        while (runMax <= 0) {
            await sleep(1000)
            console.info(`runMax:${runMax}`)
        }
        running.push(new Promise(async (V) => {
            runMax = runMax - 1;
            let result = await reportTestcase(testcaseId,environment);
            runMax = runMax + 1;
            V("")
        }))
        // 统计操作数据
        let action_perf = await action_mod.report_testcase_perf(testcaseId);
        if(action_perf.data){
            testcase_info.action_info = `./perf/${testcaseId}.html`;
            let save = await reportDataToFile(action_perf.data, path.join(__dirname, "./report_suite/TotalActionPerf.html"), path.join(config.BDT_Report_Dir, environment,"perf"), `${testcaseId}.html`) 
        }
        // 生成性能监控图表
        let agent_list = await SystemInfo_mod.getAgentList(testcaseId);
        if(agent_list.data){
            console.info(JSON.stringify(agent_list.data))
            testcase_info.perf_info  = `./systemInfo/${testcaseId}.html`;
            let create_img = await reportSystemInfo( testcaseId,agent_list!.data!,path.join(config.BDT_Report_Dir,environment,"img"));
            let save = await reportDataToFile(agent_list.data, path.join(__dirname, "./report_suite/SystemInfo.html"), path.join(config.BDT_Report_Dir, environment,"systemInfo"), `${testcaseId}.html`) 
    
        }
        await sleep(1000)

    }
    for (let run of running) {
        await run;
    }
    // 统计操作数据
    let action_perf = await action_mod.report_version_perf(environment);
    console.info(`###### 统计总执行性能 ${JSON.stringify(action_perf)}`)
    if(action_perf.data){
        let save = await reportDataToFile(action_perf.data, path.join(__dirname, "./report_suite/TotalActionPerf.html"), path.join(config.BDT_Report_Dir, environment,"perf"), `TotalActionPerf.html`) 
    } 
    let jquery = fs.copyFileSync(path.join(__dirname,"./report_suite/jquery-3.3.1.min.js"),path.join(config.BDT_Report_Dir, environment,"jquery-3.3.1.min.js"))
    let save = await reportDataToFile(testcase_list.result, path.join(__dirname, "./report_suite/TestcaseReport.html"), path.join(config.BDT_Report_Dir, environment), "TestcaseReport.html")
    let zip = await startZIP(path.join(config.BDT_Report_Dir, environment),environment);
    return {err:0,log:`生成测试报告成功`}
}

async function reportSystemInfo(testcaseId:string,agent_list:Array<any>,save_path:string){
    // /console.info
    for(let agent of agent_list){
        let name = String(agent.name).split("$")[0]
        let save_img = await BDTPerfReport(testcaseId,name,save_path)
    }
}

async function reportTestcase(testcaseId: string,environment:string) {
    let task_mod = new BdtTask();
    let task_list = await task_mod.report(testcaseId);
    if (task_list.err) {
        console.info(`查询测试用例失败:${task_list}`)
        return { err: 0, log: `查询测试用例失败:${task_list}` }
    }
    let runMax = 20;
    let running = [];
    for (let task of task_list.result!) {
        let taskId = task.task_id;
        let  task_info : any = task;
        task_info.details = `../action/${taskId}.html`;
        console.info(`task: ${taskId}`)
        while (runMax <= 0) {
            await sleep(1000)
            console.info(`runMax:${runMax}`)
        }
        // 获取日志链接
        let agent_mod = new BdtAgent(); 
        let agent_LN = await agent_mod.report(testcaseId,task.LN!.split("$")[0]);
        if(agent_LN.result && agent_LN.result!.logUrl){
            task_info.LN_LOG = agent_LN.result!.logUrl!.replace("192.168.200.175","cyfs-test-lab");
        }
        let agent_RN = await agent_mod.report(testcaseId,task.RN!.split("$")[0]);
        if(agent_RN.result && agent_RN.result.logUrl){
            task_info.RN_LOG = agent_RN.result!.logUrl!.replace("192.168.200.175","cyfs-test-lab");
        }
        running.push(new Promise(async (V) => {
            runMax = runMax - 1;
            let result = await reportTask(taskId,environment);
            runMax = runMax + 1;
            V("")
        }))
        await sleep(50)
    }
    for (let run of running) {
        await run;
    }
    let save = await reportDataToFile(task_list.result, path.join(__dirname, "./report_suite/TaskReport.html"), path.join(config.BDT_Report_Dir,environment,"task"), `${testcaseId}.html`)
    
    return { err: 0, log: `查询测试用例成功` }
}

async function reportTask(taskId: string,environment:string) {
    // 统计所有Action
    let action_mod = new BdtAction();
    let action_list = await action_mod.report(taskId);
    if (action_list.err) {
        return { err: true, log: `查询测试用例失败:${action_list}` }
    }
    let save = await reportDataToFile(action_list.result, path.join(__dirname, "./report_suite/ActionReport.html"), path.join(config.BDT_Report_Dir,environment,"action"), `${taskId}.html`)
    return;
    // 统计日志数据
}

async function reportDataToFile(data: any, suit_file: string, save_path: string, file_name: string) {
    console.info(`report data to html file ${save_path} ${file_name}`);
    let file = fs.readFileSync(suit_file).toString();
    file = file.replace(`[];`, `${JSON.stringify(data)};`);
    fs.mkdirpSync(save_path);
    save_path = path.join(save_path, file_name);
    let file1 = fs.createFileSync(save_path);
    fs.writeFileSync(save_path, file);
    return save_path

}



// async function main() {
//     let run = await reportDataToHtml("Stream_AllEP");
//     //let jquery = fs.copyFileSync(path.join(__dirname,"./report_suite/jquery-3.3.1.min.js"),path.join(config.BDT_Report_Dir, "Stream_AllEP","jquery-3.3.1.min.js"))
//     // let  testcaseId = "Connect_Max_UDPConnection_1666785842903";
//     // let  environment = "Stream_AllEP";
//     // let SystemInfo_mod = new SystemInfo();
//     // let agent_list = await SystemInfo_mod.getAgentList(testcaseId);
//     // console.info(JSON.stringify(agent_list.data))
//     // if(agent_list.data){
//     //     console.info(JSON.stringify(agent_list.data))
//     //     testcase_info.perf_info  = `./systemInfo/${testcaseId}.html`;
//     //     let create_img = await reportSystemInfo( testcaseId,agent_list!.data!,path.join(config.BDT_Report_Dir,environment,"img"));
//     //     let save = await reportDataToFile(agent_list.data, path.join(__dirname, "./report_suite/SystemInfo.html"), path.join(config.BDT_Report_Dir, environment,"systemInfo"), `${testcaseId}.html`) 

//     // }
//     // console.info(run)
//     //let run =await reportSystemInfo("Connect_Max_UDPConnection_1666785842903",["PC_0007","PC_0014"],path.join(config.BDT_Report_Dir,"Stream_AllEP","img"));
//     // let action_mod = new BdtAction();
//     // let action_list = await action_mod.report_testcase_perf("Stream_AllEP_TunnelSelect_1666758135364");
//     //  console.info(JSON.stringify(action_list))


// }
// main()