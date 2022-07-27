
const request = require("request")
import {DataServer} from "../config/config"
import * as SysProcess from 'process';
import { sleep } from '../base';

async function online(agentName:string) {
    return new Promise(async(V)=>{
        setTimeout(async()=>{
            
        })
        request({
            url: DataServer + "/api/base/agent/online" ,
            method: "POST",
            json: true,
            headers: {
                "content-type": "application/json",
            },
            body: {
                name: agentName,
            }

        },(err:any,rep:any,body:any) => {
            if(err){
                console.log(` online 请求出现错误 err: ${err},rep:${rep} `)
                V(false);
            }
            // body表示返回的数据
            if(body){
              // 请求成功
              console.log(` online send success ,rep = ${JSON.stringify(rep)} `)
               V(true); 
            }
        })
    })
}

async function main() {
    let agentName = SysProcess.argv[2];
    console.info(`agentName:${agentName}`);
    while(true){
        await online(agentName);
        await sleep(30*1000);
    }
}
main().finally(async()=>{
    process.exit(0);
})