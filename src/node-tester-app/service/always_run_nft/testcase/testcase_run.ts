import * as cyfs from "../cyfs"
import * as SysProcess from 'process';
var date = require("silly-datetime");
import * as ChildProcess from 'child_process';
import {dingding} from "../common/dingding"
import * as path from 'path';
import {request,ContentType} from "../common/request"

const testcase = [
    {
        name : "case1",
        agent : ["NFT1_runtime","NFT2_runtime"],
        time : 60*1000,
    },
    {
        name : "case2",
        agent : ["NFT1_runtime","NFT2_runtime"],
        time : 60*1000,
    }
]


async function always_run(client:string) {
   for(let my_case in testcase){
       for(let my_agent in testcase[my_case].agent){
            if(testcase[my_case].agent[my_agent] == client){
                let launch = () => {
                    let process = ChildProcess.fork(path.join(__dirname,testcase[my_case].name,client+".js"), [`${client}`,`${testcase[my_case].time}`,`${testcase[my_case].name}`], { silent: true });
                    process.on('exit', async (code: number, signal: string) => {
                        console.info(`nft_always_run run finished`)
                        await cyfs.sleep(60*1000)
                        launch();
                    });
            }
            launch();
           }
        
       }
   }
    
}
async function  agentOnline(name:string,time:number) {
    while(true){
        console.info(`########### ${name} send online command`)
        let online = await request("POST","api/base/agent/online",JSON.stringify({name:name}),ContentType.json)
        console.info(`resp: ${online}`)
        await cyfs.sleep(time);
    }
}
async function main() {
    cyfs.clog.enable_file_log({
        name: "nft_always_run",
        dir: cyfs.get_app_log_dir("nft_always_run"),
    });
    let agentName = SysProcess.argv[2];
    console.info(`运行时间：${date.format(new Date(),'YYYY/MM/DD')}`)
    always_run(agentName);
    agentOnline(agentName,30*1000);
}
main();