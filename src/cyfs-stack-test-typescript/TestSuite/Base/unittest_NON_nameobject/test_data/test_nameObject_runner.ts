import * as cyfs from '../../../../cyfs_node';
import * as ChildProcess from 'child_process';
import * as fs from "fs-extra"
import * as path from "path"
import * as getdata from "./get_data"
//初始化日志
cyfs.clog.enable_file_log({
    name: "test_main",
    dir: cyfs.get_app_log_dir("test_main"),
    file_max_size: 1024 * 1024 * 10,
    file_max_count: 10,
});

describe("协议栈Nameobject测试", async function () {
    this.timeout(0);
    let testpath = path.join(__dirname, "/dir")
    let alljson = getdata.get_path(testpath)
    console.log("-=-=-=-=-=-=" + alljson);

    let sourcepath = path.resolve(__dirname, '../../')
    let outpath = path.join(sourcepath, "/output")
    let logpath = path.join(outpath, "/log")
    fs.ensureDirSync(logpath);
    let currenttime =  new Date().toLocaleString();
    currenttime = currenttime.replace(/\D/g,"_");

    for (let j of alljson) {
        let testjson = JSON.parse(fs.readFileSync(j, { encoding: 'utf-8' }));
        console.log(testjson);

        describe(`测试模块-${testjson.type}`, async () => {
            it.only(`测试用例-${testjson.casename}`, async () => {
                console.info(`###### 运行: ts-node test_kernel.ts --out ${testjson} `)
                let run = ChildProcess.exec(`ts-node test_kernel.ts --out ${testjson} `)
                run.stdout!.on("data", (data) => {
                    console.info(data)
                })
                // let save = new Promise(async(V)=>{
                //     // while(true){
                //     //     if(fs.pathExistsSync(report_path)){
                //     //         await sleep(5*1000)
                //     //         fs.copySync(report_path,`${reportpath}/report_${currenttime}`)
                //     //         await fs.removeSync(report_path)
                //     //         break;
                //     //     }
                //     //     await sleep(5*1000)

                //     // }
                //     V("run finished")
                // },)
                // await save;

            })

        })

    }



})

