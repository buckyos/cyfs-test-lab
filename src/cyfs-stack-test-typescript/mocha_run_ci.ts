import * as ChildProcess from 'child_process';
import * as path from 'path';
import * as fs from "fs-extra";
import * as cyfs from './cyfs_node';
import * as upload_report from './script/upload_task';
var date = require("silly-datetime");

async function main() {
    let TestSuite = path.join(__dirname,"./TestSuite/unittest_stack_interface/test_beta_non.js")
    //let TestSuite = ".\\TestSuite\\TestSuiteTool\\unittest-with_real_stack_xxx\\test_xxx.ts"
    let report_path = path.join(__dirname,"./mochawesome-report")
    console.log("report_path",report_path)
    //清空日志
    //fs.removeSync(path.join(__dirname,"../log"));
    let ppath = path.join(path.dirname(__filename),"/output")
    let logpath = path.join(ppath,"/log")
    fs.ensureDirSync(logpath);
    
    let reportpath = path.join(ppath,"/mochawesome-report") 
    console.log(reportpath)
    fs.ensureDirSync(reportpath);

    let currenttime =  new Date().toLocaleString();
    currenttime = currenttime.replace(/\D/g,"_");
    let version =  date.format(new Date(),'YYYY_MM_DD_HH_mm_ss');
    console.log(currenttime)

    console.info(`###### 运行: npx mocha ${TestSuite} --reporter mochawesome --require ts-node/register `)
    let run = ChildProcess.exec(`npx mocha ${TestSuite} --reporter mochawesome --require ts-node/register `)

    run.on('exit', async (code: number, signal: string) => {
        console.info(`######运行结束`)
    });
    run.stdout!.on("data",(data)=>{
        console.info(data)
    })
    let save = new Promise(async(V)=>{
        while(true){
            if(fs.pathExistsSync(report_path)){
                await cyfs.sleep(5*1000)
                fs.copySync(report_path,`${reportpath}/report_${currenttime}`)
                run.emit("exit")
                await upload_report.uplaodTestcase(`${reportpath}/report_${currenttime}`,version)
                await fs.removeSync(`${reportpath}/report_${currenttime}/mochawesome-report.zip`);
                await cyfs.sleep(5*1000)
                await fs.removeSync(report_path)
                break;
            }
            await cyfs.sleep(5*1000)
            
        }
        V("run finashed")
    })
    await save;
    process.exit(0);

}
main().then(()=>{
    process.exit(0);
});
