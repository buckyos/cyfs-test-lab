import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as ChildProcess from 'child_process';
import * as SysProcess from 'process';
let JSZIP = require("jszip");
let zip = new JSZIP();
// //读取目录及文件
function readDir(nowPath:string) {
    let files = fs.readdirSync(nowPath);//读取目录中的所有文件及文件夹（同步操作）
    files.forEach(function (fileName, index) {//遍历检测目录中的文件
        console.log(fileName, index);//打印当前读取的文件名
        let fillPath = nowPath + "/" + fileName;
        let file = fs.statSync(fillPath);//获取一个文件的属性
        if (file.isDirectory()) {//如果是目录的话，继续查询
            let dirlist = zip.folder(fileName);//压缩对象中生成该目录
            readDir(fillPath);//重新检索目录文件
        } else {
            zip.file(fileName, fs.readFileSync(fillPath));//压缩目录添加文件
        }
    });
}

async function copyTools(source:string,target:string){
    var currPath = __dirname;//文件的绝对路径 当前当前js所在的绝对路径
    var tasksDir = path.join(currPath, target);
    var tool_list = path.join(currPath,source)
    var rustbdt2ToolFiles =await  fs.readdirSync(tool_list)
    var caseList =await  fs.readdirSync(tasksDir)
    for(let i = 0;i<caseList.length;i++){
        if(caseList[i]=="onload.js"){
            continue
        }
        let targetPath = path.join(tasksDir,caseList[i])
      
        console.info(`testcase: ${targetPath}`)
        for (let j = 0;j<rustbdt2ToolFiles.length;j++){
            console.info(path.join(tool_list,rustbdt2ToolFiles[j]))
            await fs.copyFileSync(path.join(tool_list,rustbdt2ToolFiles[j]),path.join(targetPath,rustbdt2ToolFiles[j]))
        }

    }
}


//开始压缩文件
async function startZIP() {
    var currPath = __dirname;//文件的绝对路径 当前当前js所在的绝对路径
    var tasksDir = path.join(currPath, "../../node_tester_app/tasks");
    var rustbdt2 = path.join(currPath,'../../node_tester_app/taskTools/cyfs_bdt')
    var rustbdt2ToolFiles =await  fs.readdirSync(rustbdt2)
    var caseList = await  fs.readdirSync(tasksDir)
    for(let i = 0;i<caseList.length;i++){
        let targetPath = path.join(tasksDir,caseList[i])
        console.info(targetPath)
        readDir(targetPath);
        zip.generateAsync({//设置压缩格式，开始打包
            type: "nodebuffer",//nodejs用
            compression: "DEFLATE",//压缩算法
            compressionOptions: {//压缩级别
                level: 9
            }
        }).then(function (content:any) {
            fs.writeFileSync(targetPath+ `/${caseList[i]}.zip`, content, "utf-8");//将打包的内容写入 当前目录下的 result.zip中
        });
        
    }
    
}


async function  gulpBuild() {
    let cmd = path.join(__dirname,'../../node_modules/.bin/gulp build')
    return new Promise(async ()=>{
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


async function modifyImport(params:string,task_name:string,tool_url:string,deploy_url:string){
    let taskPath = path.join(__dirname,'../tasks')
    task_name =  path.join(__dirname,`../${task_name}`)
    console.info(`复制用例列表 ${task_name} -> ${taskPath}`)
    let caseList = fs.readdirSync(task_name);
    for(let index in caseList){
        console.info(`复制用例 ${path.join(task_name,caseList[index])} -> ${taskPath}`)
        fs.copySync(path.join(task_name,caseList[index]),path.join(taskPath,caseList[index]) )
    }
    let testcasePath = fs.readdirSync(taskPath)
    for(let index in testcasePath){
        console.info(testcasePath[index])
        if(testcasePath[index].indexOf(params)>-1){
            
            let onload = path.join(taskPath,testcasePath[index],'onload.js')
            // if(!fs.pathExistsSync(onload)){
            //     continue
            // }
            //console.info(onload)
            let replace =  new Promise(async(v)=>{
               await fs.readFile(onload,'utf8',(err,data)=>{
                    if(err){
                        console.info(err)
                        v(err);
                    }
                    let result = data.replace(new RegExp(tool_url,"gm"),deploy_url)
                    console.info(`${onload} 替换 import`) 
                    fs.writeFile(onload,result,'utf8',(err)=>{
                        if(err){
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

async function empytTask() {
    let dir_path = path.join(__dirname,"../tasks")
    fs.removeSync(dir_path)
}


async function main() {

    await empytTask();
    await modifyImport('Connect','tasks_BDT_Stream','../../taskTools/cyfs_bdt','.');
    await copyTools('../taskTools/rust-bdt',"../tasks"); //复制 taskTools
    await startZIP(); //生成zip压缩文件
}

main();

