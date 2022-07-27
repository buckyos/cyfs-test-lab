import * as ChildProcess from 'child_process';
import * as path from 'path';
import * as SysProcess from 'process';
var date = require("silly-datetime");
import * as mocha from "mocha"
async function main() {
    let TestSuite = "unittest_stack_interface"
    let process = ChildProcess.exec(`npx mocha .\\TestSuite\\${TestSuite}\\test*.ts --reporter mochawesome --require ts-node/register `)
    process.on('exit', async (code: number, signal: string) => {
        console.info(`运行结束 ${code} ${signal}`)
    });
    process.stdout!.on("data",(data)=>{
        console.info(data)
    })
}
main();
