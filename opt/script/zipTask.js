"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const fs = require("fs-extra");
const ChildProcess = __importStar(require("child_process"));
const SysProcess = __importStar(require("process"));
let JSZIP = require("jszip");
let zip = new JSZIP();
// //读取目录及文件
function readDir(zip, nowPath) {
    let files = fs.readdirSync(nowPath); //读取目录中的所有文件及文件夹（同步操作）
    files.forEach(function (fileName, index) {
        console.log(fileName, index); //打印当前读取的文件名
        let fillPath = nowPath + "/" + fileName;
        let file = fs.statSync(fillPath); //获取一个文件的属性
        if (file.isDirectory()) { //如果是目录的话，继续查询
            let dirlist = zip.folder(fileName); //压缩对象中生成该目录
            readDir(dirlist, fillPath); //重新检索目录文件
        }
        else {
            zip.file(fileName, fs.readFileSync(fillPath)); //压缩目录添加文件
        }
    });
}

//开始压缩文件
async function startZIP(service) {
    return new Promise(async(V)=>{
        var currPath = __dirname; //文件的绝对路径 当前当前js所在的绝对路径
        var service_path = path.join(currPath, "../service",service);
        let save_path = path.join(service_path ,`${service}.zip`);
        if(fs.pathExistsSync(save_path)){
            fs.removeSync(save_path)
        }
        let run =await readDir(zip, service_path);
            zip.generateAsync({
                type: "nodebuffer",
                compression: "DEFLATE",
                compressionOptions: {
                    level: 9
                }
            }).then(function (content) {
                
                if(!fs.pathExistsSync(save_path)){
                    console.info("create file")
                    let run = fs.createFileSync(save_path);
                }
                let zip = fs.writeFileSync(save_path, content, "utf-8"); 
                console.info(`打包文件成功：${save_path}`)
                V(path.join(service_path ,`${service}.zip`))
            });
    })
    
}
exports.startZIP = startZIP;

