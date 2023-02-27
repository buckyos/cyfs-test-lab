import * as cyfs from '../../../../cyfs_node';
import { exec, execSync } from 'child_process'
import * as fs from "fs-extra"
import * as path from "path"
import * as getdata from "./get_data"
import { assert } from 'console';
//初始化日志
cyfs.clog.enable_file_log({
    name: "test_main",
    dir: cyfs.get_app_log_dir("test_main"),
    file_max_size: 1024 * 1024 * 10,
    file_max_count: 10,
});

let sourcepath = path.join(__dirname, '../../../../')
let logpath = path.join(sourcepath, "/output/log")
let currenttime = new Date().toLocaleString()
currenttime = currenttime.replace(/\D/g, "_");
let logfile = `${logpath}/${currenttime}.log`;
fs.ensureFileSync(logfile);

export function excuteCommand(cmd: string) {
    fs.appendFileSync(logfile, `\n>>>>>>用例：${cmd}`);
    let result: number = 0
    try {
        let info = execSync("ts-node test_kernel.ts " + cmd).toString()
        fs.appendFileSync(logfile, `\n>>>>>>执行成功<<<<<<\n${info}`);

    } catch (error: any) {
        fs.appendFileSync(logfile, `\n>>>>>>用例失败<<<<<<\n{errcode：${error.status}\n${error.stderr.toString()}\n${error.stack}\n}\n`);
        result = error.status
    }
    return result

}


describe("协议栈Nameobject测试", async function () {
    this.timeout(0);
    let testpath = path.join(__dirname, "/zone")
    let alljson = getdata.get_path(testpath)

    for (let j of alljson) {
        let testjson = JSON.parse(fs.readFileSync(j, { encoding: 'utf-8' }));

        describe(`测试模块-${testjson.type}`, async () => {
            it.only(`测试用例-${testjson.casename}`, async () => {
                console.info(`###### 运行: ts-node test_kernel.ts --out ${j} `)
                excuteCommand(`--out ${j}`)
                excuteCommand(`--out ${j}`)
                excuteCommand(`--out ${j}`)
                excuteCommand(`--in ${j}`)
                excuteCommand(`--in ${j}`)
                excuteCommand(`--in ${j}`)
                excuteCommand(`--out ${j}`)
                excuteCommand(`--out ${j}`)
                excuteCommand(`--in ${j}`)
                excuteCommand(`--in ${j}`)
            })
        })
    }
})

