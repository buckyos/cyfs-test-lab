import * as ChildProcess from 'child_process';
import * as path from 'path';
import * as SysProcess from 'process';
import {dingding} from "./common/dingding"
var date = require("silly-datetime");
import * as cyfs from "./cyfs";
async function main() {
    cyfs.clog.enable_file_log({
        name: "nft_always_run_daemon",
        dir: cyfs.get_app_log_dir("nft_always_run_daemon"),
    });
    let agentName = SysProcess.argv[2];
    console.info(`运行时间：${date.format(new Date(),'YYYY/MM/DD')}`)
    let param = [agentName]
    let launch = () => {
        let process = ChildProcess.fork(path.join(__dirname,"testcase",'testcase_run.js'), param, { silent: true });
        process.on('exit', async (code: number, signal: string) => {
            await cyfs.sleep(60*1000)
            await dingding(`${agentName} nft_always_run stop,begin restart....`)
            launch();
        });
    }
    launch();

    await new Promise((v) => {});
}
main();