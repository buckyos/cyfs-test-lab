
import * as path from 'path';
import * as fs from 'fs-extra';
let JSZIP = require("jszip");
let zip = new JSZIP();
// //读取目录及文件
export function readDir(zip: any, nowPath: string) {
    let files = fs.readdirSync(nowPath);//读取目录中的所有文件及文件夹（同步操作）
    files.forEach(function (fileName, index) {//遍历检测目录中的文件
        console.log(fileName, index);//打印当前读取的文件名
        let fillPath = nowPath + "/" + fileName;
        let file = fs.statSync(fillPath);//获取一个文件的属性
        if (file.isDirectory()) {//如果是目录的话，继续查询
            let dirlist = zip.folder(fileName);//压缩对象中生成该目录
            readDir(dirlist, fillPath);//重新检索目录文件
        } else {
            zip.file(fileName, fs.readFileSync(fillPath));//压缩目录添加文件
        }
    });
}
export async function startZIP(targetPath:string,name:string) {

    //console.info(targetPath)
    let stat = fs.lstatSync(targetPath)
    if(stat.isDirectory()){
    readDir(zip, targetPath);
    }
    zip.generateAsync({//设置压缩格式，开始打包
        type: "nodebuffer",//nodejs用
        compression: "DEFLATE",//压缩算法
        compressionOptions: {//压缩级别
            level: 9
        }
    }).then(function (content: any) {
        fs.writeFileSync(targetPath + `/${name}.zip`, content, "utf-8");//将打包的内容写入 当前目录下的 result.zip中
    });

  

}