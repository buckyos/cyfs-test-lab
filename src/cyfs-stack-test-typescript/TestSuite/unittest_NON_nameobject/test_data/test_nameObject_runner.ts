import assert = require('assert');
import * as cyfs from '../../../cyfs_node/cyfs_node';
import { RandomGenerator, NDNTestManager, InputInfo, ResultInfo } from '../../../common'
import * as fs from "fs-extra"
import * as path from "path"
import * as testdatas from "./get_data"
//初始化日志
cyfs.clog.enable_file_log({
    name: "test_main",
    dir: cyfs.get_app_log_dir("test_main"),
    file_max_size: 1024 * 1024 * 10,
    file_max_count: 10,
});


//命令行接收参数，进程管理
let proc_in: boolean | undefined = undefined;
let ret = 0;

function print_usage() {
    console.log("usage: node desc_test.js [--in|--out] <json file path>")
}

function process_argv(): string | undefined {
    if (process.argv.length < 4) {
        print_usage()
    }

    if (process.argv[2] === "--in") {
        proc_in = true;
        return process.argv[3]
    } else if (process.argv[2] === "--out") {
        proc_in = false;
        return process.argv[3]
    } else {
        print_usage()
    }
}

describe("协议栈Nameobject测试", async function () {
    this.timeout(0);

    let alljson = testdatas.get_path()
    for (let j in alljson) {

        let testdatas = fs.readJSONSync(j, "utf8");

        describe(`${testdatas.testObject}`, async () => {
            before(async function () {
                //每条case的前置处理


                let json_path = process_argv();
                if (!json_path) {
                    console.error("未指定json filepath")
                    return
                }




            })
            after(async function () {
                //数据清理


            })
            it(`${datas.testcaseList[j].name}`, async () => {
                // 异常用例阻塞暂时跳过
                console.info(`开始执行测试用例：${datas.testcaseList[j].name}`)
                if (inputData.skip) {
                    assert(false, "测试用例异常，暂时标记不执行")
                }
                //运行超时处理机制
                let run = true;
                let timeout = 120 * 1000
                if (inputData.timeout) {
                    timeout = inputData.timeout
                }
                setTimeout(() => {
                    if (run) {
                        console.error(false, "测试用例运行超时")
                    }
                }, timeout)
                //运行测试用例

                switch (obj.type) {
                    case "people":
                        //process_people(obj)
                        break;
                    default:
                        console.error(`unsupport type`, obj.type)
                        break;
                }
                run = false;
            })

        })

    }



})

