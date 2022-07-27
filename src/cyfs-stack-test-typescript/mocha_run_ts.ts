import * as ChildProcess from 'child_process';
import * as path from 'path';
import * as SysProcess from 'process';
var date = require("silly-datetime");
import * as mocha from "mocha"
import * as fs from "fs-extra"
import { sleep } from './cyfs_node/cyfs_node';

async function main() {

    let TestSuite = ".\\TestSuite\\unittest_NON_nameobject\\test*.ts"
    let report_path = path.join(__dirname,"./mochawesome-report")
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
    console.log(currenttime)

    console.info(`###### 运行: npx mocha ${TestSuite} --reporter mochawesome --require ts-node/register > ${logpath}/mocha_run_${currenttime}.log `)
    let run = ChildProcess.exec(`npx mocha ${TestSuite} --reporter mochawesome --require ts-node/register > ${logpath}/mocha_run_${currenttime}.log `)

    run.on('exit', async (code: number, signal: string) => {
        console.info(`######运行结束`)
    });
    run.stdout!.on("data",(data)=>{
        console.info(data)
    })
    let save = new Promise(async(V)=>{
        while(true){
            if(fs.pathExistsSync(report_path)){
                await sleep(5*1000)
                fs.copySync(report_path,`${reportpath}/report_${currenttime}`)
                run.emit("exit")
                await fs.removeSync(report_path)
                break;
            }
            await sleep(5*1000)
            
        }
        V("run finashed")
    })
    await save;
    process.exit(0);

}
main().then(()=>{
    process.exit(0);
});

