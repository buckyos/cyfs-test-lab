//主要用于Login登录 register 注册
import express from "express";
export const router = express.Router();
import { BdtTestcase, TestcaseModel } from "../../model/bdt/bdt_testcase"
import { BdtTask } from "../../model/bdt/bdt_task"
import { BdtAction } from "../../model/bdt/bdt_action"
import { BdtAgent } from "../../model/bdt/bdt_agent"
import * as config from "../../config/config"
import {SystemInfo,SystemInfoModel} from "../../model/base/system_info"
import * as compressing from 'compressing';
import * as path from "path";
import * as fs from "fs-extra";
import { CyfsReport ,CyfsReportModel} from "../../model/cyfsStack/cyfs_report"
var date = require("silly-datetime");
router.get("/text", (req, res) => {
    res.json({ msg: "bdt testcase report" });
});

router.post('/reportHtml',
    async (req, res) => {
        console.info(`#receive reportHtml report request,report testcase info into html,body = ${JSON.stringify(req.body)} `)
        if( !req.body.version || !req.body.zip_url || !req.body.file_name){
            return res.json({err:true,log:"缺少输入参数 version || zip_url || file_name"})
        }
        //解压文件
        let zip_path = path.join(config.BDT_Report_Dir,req.body.version,req.body.file_name); 
        let zip_dir =  path.join(config.BDT_Report_Dir,req.body.version); 
        await compressing.zip.uncompress(zip_path,zip_dir);
        let zip_url = req.body.zip_url;
        let testcase_url = `http://cyfs-test-lab/testcaseReport/${req.body.version}/mochawesome.html`;
        let coverage_url = `http://cyfs-test-lab/testcaseReport/${req.body.version}/coverage/index.html`;
        let now =  date.format(new Date(),'YYYY/MM/DD HH:mm:ss');
        let mod =  new CyfsReport(); 
        let data:CyfsReportModel = {
            version : req.body.version!,
            zip_url,
            testcase_url,
            coverage_url,
            date : now
        }
        let save =await mod.add(data);
        let result = {
            result : save,
            zip_url,
            coverage_url,
            testcase_url
        }
        return res.json(result)
    }
);

router.get('/reportList',
    async (req, res) => {
        console.info(`#receive reportList req,body = ${JSON.stringify(req.body)} `)
        let mod =  new CyfsReport(); 
        let result = await mod.querList();
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE, PUT, HEAD");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Token, adminID");
        res.setHeader("Access-Control-Max-Age", "3600");
        return res.json(result)
    }
);






// async function main() {
//     let run = await reportDataToHtml("Stream_AllEP");
//     //let jquery = fs.copyFileSync(path.join(__dirname,"./report_suite/jquery-3.3.1.min.js"),path.join(config.BDT_Report_Dir, "Stream_AllEP","jquery-3.3.1.min.js"))
//     // let  testcase_id = "Connect_Max_UDPConnection_1666785842903";
//     // let  environment = "Stream_AllEP";
//     // let SystemInfo_mod = new SystemInfo();
//     // let agent_list = await SystemInfo_mod.getAgentList(testcase_id);
//     // console.info(JSON.stringify(agent_list.data))
//     // if(agent_list.data){
//     //     console.info(JSON.stringify(agent_list.data))
//     //     testcase_info.perf_info  = `./systemInfo/${testcase_id}.html`;
//     //     let create_img = await reportSystemInfo( testcase_id,agent_list!.data!,path.join(config.BDT_Report_Dir,environment,"img"));
//     //     let save = await reportDataToFile(agent_list.data, path.join(__dirname, "./report_suite/SystemInfo.html"), path.join(config.BDT_Report_Dir, environment,"systemInfo"), `${testcase_id}.html`) 

//     // }
//     // console.info(run)
//     //let run =await reportSystemInfo("Connect_Max_UDPConnection_1666785842903",["PC_0007","PC_0014"],path.join(config.BDT_Report_Dir,"Stream_AllEP","img"));
//     // let action_mod = new BdtAction();
//     // let action_list = await action_mod.report_testcase_perf("Stream_AllEP_TunnelSelect_1666758135364");
//     //  console.info(JSON.stringify(action_list))


// }
// main()