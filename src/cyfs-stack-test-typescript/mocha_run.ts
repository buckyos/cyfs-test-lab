import * as ChildProcess from 'child_process';
import * as path from 'path';
import * as SysProcess from 'process';
var date = require("silly-datetime");
import * as mocha from "mocha"
import * as fs from "fs-extra"
import { sleep } from '../../cyfs_node';
import { cwd } from 'process';

async function main() {

    let report_path = path.join(__dirname,"./mochawesome-report")
    console.log(report_path)

    //清空日志
    //fs.removeSync(path.join(__dirname,"../log"));
    let sourcepath = path.resolve(__dirname,'../../')
    console.log("---------------------------"+sourcepath)
    let outpath = path.join(sourcepath,"/output")
    let logpath = path.join(outpath,"/log")
    fs.ensureDirSync(logpath);
    
    let reportpath = path.join(outpath,"/mochawesome-report") 
    console.log(reportpath)
    fs.ensureDirSync(reportpath);

    let currenttime =  new Date().toLocaleString();
    currenttime = currenttime.replace(/\D/g,"_");
    console.log(currenttime)
   
    if(fs.pathExistsSync(report_path)){
        console.log(`执行前已存在报告 ${report_path} 执行初始化删除`)
        await fs.removeSync(report_path)
    }

    console.info(`###### 运行: npx mocha all_mocha_entrance.ts --reporter mochawesome --require ts-node/register `)
    let run = ChildProcess.exec(`npx nyc mocha  $all_mocha_entrance.ts --reporter mochawesome --require ts-node/register --exit`)
    
    run.stdout!.on("data",(data)=>{
        console.info(data)
    })
    let save = new Promise(async(V)=>{
        while(true){
            if(fs.pathExistsSync(report_path)){
                await sleep(5*1000)
                fs.copySync(report_path,`${reportpath}/report_${currenttime}`)
                await fs.removeSync(report_path)
                break;
            }
            await sleep(5*1000)
            
        }
        V("run finashed")
    },)
    await save;

}
main().then(()=>{
    console.info(`######运行结束`)
    process.exit(0);
});

