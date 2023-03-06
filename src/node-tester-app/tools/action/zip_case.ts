import * as os from 'os';
import * as path from 'path';
import { DirHelper } from "../../base"
import * as fs from 'fs-extra';
import * as ChildProcess from 'child_process';
let JSZIP = require("jszip");
let zip = new JSZIP();
import { Command } from 'commander';
// 读取目录及文件
function read_dir(zip: any, nowPath: string) {
    let files = fs.readdirSync(nowPath);      //读取目录中的所有文件及文件夹（同步操作）
    files.forEach(function (fileName, index) {   //遍历检测目录中的文件
        console.log(fileName, index);      //打印当前读取的文件名
        let fillPath = nowPath + "/" + fileName;
        let file = fs.statSync(fillPath);     //获取一个文件的属性
        if (file.isDirectory()) {        //如果是目录的话，继续查询
            let dirlist = zip.folder(fileName);  //压缩对象中生成该目录
            read_dir(dirlist, fillPath);    //重新检索目录文件
        } else {
            zip.file(fileName, fs.readFileSync(fillPath));//压缩目录添加文件
        }
    });
}

async function copy_tools(source: string) {

    var tasks_dir = DirHelper.getTaskRoot();
    var tool_list = DirHelper.getTestcaseRunner(source);
    var testcase_runner_files = await fs.readdirSync(tool_list)
    var case_list = await fs.readdirSync(tasks_dir)
    for (let i = 0; i < case_list.length; i++) {
        if (case_list[i] == "onload.js") {
            continue
        }
        let target_path = path.join(tasks_dir, case_list[i])

        console.info(`testcase: ${target_path}`)
        for (let j = 0; j < testcase_runner_files.length; j++) {
            if (testcase_runner_files[j] == "config.js" && fs.pathExistsSync(path.join(target_path, testcase_runner_files[j]))) {
                console.info(`${path.join(tool_list, testcase_runner_files[j])} already exist`)
                continue
            }
            console.info(path.join(testcase_runner_files[j]))
            await fs.copySync(path.join(tool_list, testcase_runner_files[j]), path.join(target_path, testcase_runner_files[j]))
        }

    }
}


//开始压缩文件
async function start_zip() {
    var tasks_dir = DirHelper.getTaskRoot(); //path.join(currPath, "../../node_tester_app/tasks");
    var case_list = await fs.readdirSync(tasks_dir)
    let running_lsit = [];
    for (let i = 0; i < case_list.length; i++) {
        let target_path = path.join(tasks_dir, case_list[i])
        //console.info(targetPath)
        read_dir(zip, target_path);
        running_lsit.push(new Promise(async (resolve) => {
            zip.generateAsync({//设置压缩格式，开始打包
                type: "nodebuffer",//nodejs用
                compression: "DEFLATE",//压缩算法
                compressionOptions: {//压缩级别
                    level: 9
                }
            }).then(function (content: any) {
                fs.writeFileSync(target_path + `/${case_list[i]}.zip`, content, "utf-8");//将打包的内容写入 当前目录下的 result.zip中
                resolve("finished")
            });
        }))

    }
    for(let run of running_lsit){
        await run
    }

}


async function gulp_build() {
    let cmd = path.join(__dirname, '../../node_modules/.bin/gulp build')
    return new Promise(async () => {
        let process1 = await ChildProcess.exec(cmd)
        process1.once('error', (err: any) => {
            console.error(`create process failed, err=${err}, platform=${os.platform}`);
        });
        process1!.stdout!.on('data', (data) => {
            let str = data.toString();
            //str = str.replace(/\r\n/g, '');
            str = str.replace(/\n/g, '');
            console.info(str)
        });
        process1!.stderr!.on('data', (data) => {
            let str = data.toString();
            //str = str.replace(/\r\n/g, '');
            str = str.replace(/\n/g, '');
            console.info(str)
        });
    })

}


async function modify_import(part: string, task_name: string, tool_url: string, deploy_url: string) {
    let task_path = DirHelper.getTaskRoot();
    task_name = DirHelper.getTestcaseDir(task_name)
    let case_list = fs.readdirSync(task_name);
    console.info(` begin modify_import ${task_name}`)
    for (let index in case_list) {
        console.info(`复制用例 ${path.join(task_name, case_list[index])} -> ${task_path}`)
        fs.copySync(path.join(task_name, case_list[index]), path.join(task_path, case_list[index]))
    }
    let testcase_path = fs.readdirSync(task_path)
    for (let index in testcase_path) {
        if (testcase_path[index].indexOf(part) > -1) {
            let onload = path.join(task_path, testcase_path[index], 'onload.js')
            let replace = new Promise(async (v) => {
                await fs.readFile(onload, 'utf8', (err, data) => {
                    if (err) {
                        console.info(err)
                        v(err);
                    }
                    // 修改tools导包
                    let result = data.replace(new RegExp(tool_url, "gm"), deploy_url)
                    // 修改base导包 ../../../base
                    result = result.replace("../../../", "../../");
                    //console.info(`${onload} 替换 import`) 
                    fs.writeFile(onload, result, 'utf8', (err) => {
                        if (err) {
                            console.info(err)
                        }
                        v(err);
                    })
                })
            })
            await replace;
        }
    }
}
async function empyt_task() {
    let dir_path = DirHelper.getTaskRoot();
    fs.removeSync(dir_path);
    fs.mkdirpSync(dir_path)
    console.info(`empty dir ${dir_path} finished`)
}


async function zip_case_all(type:string,part:string) {
    let tescase_root = DirHelper.getTestcaseRoot();
    let case_list = fs.readdirSync(tescase_root);
    let running_list = []
    for (let index of case_list) {
        running_list.push(new Promise(async (resolve)=>{
            if (!fs.existsSync(DirHelper.getTestcaseDir(index))) {
                console.error(`testcase list path ${DirHelper.getTestcaseDir(index)} not exists!`);
                resolve("finished");
            }
            await modify_import(part, index, `../../../testcase_runner/${type}`, '.');
            await copy_tools(type); //复制 testcase_runner
            await start_zip(); //生成zip压缩文件
            resolve("finished");
        }) )
        
    }
    for(let run of running_list){
        await run;
    }    
}

export function makeCommand(): Command {
    return new Command('zip_case')
        .description("")
        .requiredOption("-d, --dir <dir>", "testcase name folder,you can use all zip all testcase")
        .requiredOption("-p, --part <part>", "fuzzy match to select testcase", "_")
        .requiredOption("-t, --type <type>", "testcase runner type", "cyfs_bdt_cli")
        .action(async (options) => {
            console.info(`${options.type} will zip testcase ${options.dir}`)
            
            await empyt_task();
            if(options.dir == "all"){
                return await zip_case_all(options.type,options.part)
            }else{
                if (!fs.existsSync(DirHelper.getTestcaseDir(options.dir))) {
                    console.error(`testcase list path ${DirHelper.getTestcaseDir(options.dir)} not exists!`);
                    return;
                }
                await modify_import(options.part, options.dir, `../../../testcase_runner/${options.type}`, '.');
                await copy_tools(options.type); //复制 testcase_runner
                await start_zip(); //生成zip压缩文件
                return
            }
            
        });


}
