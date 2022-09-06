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
const fs = __importStar(require("fs-extra"));
const ChildProcess = __importStar(require("child_process"));
const SysProcess = __importStar(require("process"));
let JSZIP = require("jszip");
let zip = new JSZIP();
// //读取目录及文件
function readDir(nowPath) {
    let files = fs.readdirSync(nowPath); //读取目录中的所有文件及文件夹（同步操作）
    files.forEach(function (fileName, index) {
        console.log(fileName, index); //打印当前读取的文件名
        let fillPath = nowPath + "/" + fileName;
        let file = fs.statSync(fillPath); //获取一个文件的属性
        if (file.isDirectory()) { //如果是目录的话，继续查询
            let dirlist = zip.folder(fileName); //压缩对象中生成该目录
            readDir(fillPath); //重新检索目录文件
        }
        else {
            zip.file(fileName, fs.readFileSync(fillPath)); //压缩目录添加文件
        }
    });
}
async function copyTools(source, target) {
    var currPath = __dirname; //文件的绝对路径 当前当前js所在的绝对路径
    var tasksDir = path.join(currPath, target);
    var tool_list = path.join(currPath, source);
    var rustbdt2ToolFiles = await fs.readdirSync(tool_list);
    var caseList = await fs.readdirSync(tasksDir);
    for (let i = 0; i < caseList.length; i++) {
        if (caseList[i] == "onload.js") {
            continue;
        }
        let targetPath = path.join(tasksDir, caseList[i]);
        console.info(`testcase: ${targetPath}`);
        for (let j = 0; j < rustbdt2ToolFiles.length; j++) {
            if (rustbdt2ToolFiles[j] == "config.js" && fs.pathExistsSync(path.join(targetPath, rustbdt2ToolFiles[j]))) {
                console.info(`${path.join(tool_list, rustbdt2ToolFiles[j])} already exist`);
                continue;
            }
            console.info(path.join(tool_list, rustbdt2ToolFiles[j]));
            await fs.copyFileSync(path.join(tool_list, rustbdt2ToolFiles[j]), path.join(targetPath, rustbdt2ToolFiles[j]));
        }
    }
}
//开始压缩文件
async function startZIP() {
    var currPath = __dirname; //文件的绝对路径 当前当前js所在的绝对路径
    var tasksDir = path.join(currPath, "../../node_tester_app/tasks");
    var rustbdt2 = path.join(currPath, '../../node_tester_app/taskTools/cyfs_bdt');
    var rustbdt2ToolFiles = await fs.readdirSync(rustbdt2);
    var caseList = await fs.readdirSync(tasksDir);
    for (let i = 0; i < caseList.length; i++) {
        let targetPath = path.join(tasksDir, caseList[i]);
        //console.info(targetPath)
        readDir(targetPath);
        zip.generateAsync({
            type: "nodebuffer",
            compression: "DEFLATE",
            compressionOptions: {
                level: 9
            }
        }).then(function (content) {
            fs.writeFileSync(targetPath + `/${caseList[i]}.zip`, content, "utf-8"); //将打包的内容写入 当前目录下的 result.zip中
        });
    }
}
async function gulpBuild() {
    let cmd = path.join(__dirname, '../../node_modules/.bin/gulp build');
    return new Promise(async () => {
        let process1 = await ChildProcess.exec(cmd);
        process1.once('error', (err) => {
            console.error(`create process failed, err=${err}, platform=${os.platform}`);
        });
        process1.stdout.on('data', (data) => {
            let str = data.toString();
            //str = str.replace(/\r\n/g, '');
            str = str.replace(/\n/g, '');
            console.info(str);
        });
        process1.stderr.on('data', (data) => {
            let str = data.toString();
            //str = str.replace(/\r\n/g, '');
            str = str.replace(/\n/g, '');
            console.info(str);
        });
    });
}
async function modifyImport(params, task_name, tool_url, deploy_url) {
    let taskPath = path.join(__dirname, '../tasks');
    task_name = path.join(__dirname, `../${task_name}`);
    //console.info(`复制用例列表 ${task_name} -> ${taskPath}`)
    let caseList = fs.readdirSync(task_name);
    for (let index in caseList) {
        //console.info(`复制用例 ${path.join(task_name,caseList[index])} -> ${taskPath}`)
        fs.copySync(path.join(task_name, caseList[index]), path.join(taskPath, caseList[index]));
    }
    let testcasePath = fs.readdirSync(taskPath);
    for (let index in testcasePath) {
        // console.info(testcasePath[index])
        if (testcasePath[index].indexOf(params) > -1) {
            let onload = path.join(taskPath, testcasePath[index], 'onload.js');
            // if(!fs.pathExistsSync(onload)){
            //     continue
            // }
            //console.info(onload)
            let replace = new Promise(async (v) => {
                await fs.readFile(onload, 'utf8', (err, data) => {
                    if (err) {
                        console.info(err);
                        v(err);
                    }
                    let result = data.replace(new RegExp(tool_url, "gm"), deploy_url);
                    //console.info(`${onload} 替换 import`) 
                    fs.writeFile(onload, result, 'utf8', (err) => {
                        if (err) {
                            console.info(err);
                        }
                        v(err);
                    });
                });
            });
            await replace;
        }
    }
}
async function empytTask() {
    let dir_path = path.join(__dirname, "../tasks");
    fs.removeSync(dir_path);
}
async function main() {
    let name = SysProcess.argv[2];
    let part = SysProcess.argv[3];
    await empytTask();
    await modifyImport(part, name, '../../taskTools/cyfs_bdt', '.');
    //await copyTools('../taskTools/cyfs_bdt', "../tasks"); //复制 taskTools
    //await startZIP(); //生成zip压缩文件
}
main();

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ub2RlLXRlc3Rlci1hcHAvdG9vbHMvemlwVGFzay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBeUI7QUFDekIsMkNBQTZCO0FBQzdCLDZDQUErQjtBQUMvQiw0REFBOEM7QUFDOUMsb0RBQXNDO0FBQ3RDLElBQUksS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM3QixJQUFJLEdBQUcsR0FBRyxJQUFJLEtBQUssRUFBRSxDQUFDO0FBQ3RCLFlBQVk7QUFDWixTQUFTLE9BQU8sQ0FBQyxPQUFjO0lBQzNCLElBQUksS0FBSyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQSxzQkFBc0I7SUFDMUQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLFFBQVEsRUFBRSxLQUFLO1FBQ25DLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUEsWUFBWTtRQUN6QyxJQUFJLFFBQVEsR0FBRyxPQUFPLEdBQUcsR0FBRyxHQUFHLFFBQVEsQ0FBQztRQUN4QyxJQUFJLElBQUksR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUEsV0FBVztRQUM1QyxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsRUFBRSxFQUFDLGNBQWM7WUFDbkMsSUFBSSxPQUFPLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBLFlBQVk7WUFDL0MsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUEsVUFBVTtTQUMvQjthQUFNO1lBQ0gsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUEsVUFBVTtTQUMzRDtJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQztBQUVELEtBQUssVUFBVSxTQUFTLENB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QUksVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvQixJQUFJLElBQUksR0FBSSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9CLE1BQU0sU0FBUyxFQUFFLENBQUM7SUFDbEIsTUFBTSxZQUFZLENBQUMsSUFBSSxFQUFDLElBQUksRUFBQywwQkFBMEIsRUFBQyxHQUFHLENBQUMsQ0FBQztJQUM3RCxNQUFNLFNBQVMsQ0FBQyx1QkFBdUIsRUFBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLGNBQWM7SUFDbkUsTUFBTSxRQUFRLEVBQUUsQ0FBQyxDQUFDLFdBQVc7QUFDakMsQ0FBQztBQUVELElBQUksRUFBRSxDQUFDIiwiZmlsZSI6InRvb2xzL3ppcFRhc2suanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBvcyBmcm9tICdvcyc7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XHJcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcclxuaW1wb3J0ICogYXMgQ2hpbGRQcm9jZXNzIGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xyXG5pbXBvcnQgKiBhcyBTeXNQcm9jZXNzIGZyb20gJ3Byb2Nlc3MnO1xyXG5sZXQgSlNaSVAgPSByZXF1aXJlKFwianN6aXBcIik7XHJcbmxldCB6aXAgPSBuZXcgSlNaSVAoKTtcclxuLy8gLy/or7vlj5bnm67lvZXlj4rmlofku7ZcclxuZnVuY3Rpb24gcmVhZERpcihub3dQYXRoOnN0cmluZykge1xyXG4gICAgbGV0IGZpbGVzID0gZnMucmVhZGRpclN5bmMobm93UGF0aCk7Ly/or7vlj5bnm67lvZXkuK3nmoTmiYDmnInmlofku7blj4rmlofku7blpLnvvIjlkIzmraXmk43kvZzvvIlcclxuICAgIGZpbGVzLmZvckVhY2goZnVuY3Rpb24gKGZpbGVOYW1lLCBpbmRleCkgey8v6YGN5Y6G5qOA5rWL55uu5b2V5Lit55qE5paH5Lu2XHJcbiAgICAgICAgY29uc29sZS5sb2coZmlsZU5hbWUsIGluZGV4KTsvL+aJk+WNsOW9k+WJjeivu+WPlueahOaWh+S7tuWQjVxyXG4gICAgICAgIGxldCBmaWxsUGF0aCA9IG5vd1BhdGggKyBcIi9cIiArIGZpbGVOYW1lO1xyXG4gICAgICAgIGxldCBmaWxlID0gZnMuc3RhdFN5bmMoZmlsbFBhdGgpOy8v6I635Y+W5LiA5Liq5paH5Lu255qE5bGe5oCnXHJcbiAgICAgICAgaWYgKGZpbGUuaXNEaXJlY3RvcnkoKSkgey8v5aaC5p6c5piv55uu5b2V55qE6K+d77yM57un57ut5p+l6K+iXHJcbiAgICAgICAgICAgIGxldCBkaXJsaXN0ID0gemlwLmZvbGRlcihmaWxlTmFtZSk7Ly/ljovnvKnlr7nosaHkuK3nlJ/miJDor6Xnm67lvZVcclxuICAgICAgICAgICAgcmVhZERpcihmaWxsUGF0aCk7Ly/ph43mlrDmo4DntKLnm67lvZXmlofku7ZcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB6aXAuZmlsZShmaWxlTmFtZSwgZnMucmVhZEZpbGVTeW5jKGZpbGxQYXRoKSk7Ly/ljovnvKnnm67lvZXmt7vliqDmlofku7ZcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gY29weVRvb2xzKHNvdXJjZTpzdHJpbmcsdGFyZ2V0OnN0cmluZyl7XHJcbiAgICB2YXIgY3VyclBhdGggPSBfX2Rpcm5hbWU7Ly/mlofku7bnmoTnu53lr7not6/lvoQg5b2T5YmN5b2T5YmNanPmiYDlnKjnmoTnu53lr7not6/lvoRcclxuICAgIHZhciB0YXNrc0RpciA9IHBhdGguam9pbihjdXJyUGF0aCwgdGFyZ2V0KTtcclxuICAgIHZhciB0b29sX2xpc3QgPSBwYXRoLmpvaW4oY3VyclBhdGgsc291cmNlKVxyXG4gICAgdmFyIHJ1c3RiZHQyVG9vbEZpbGVzID1hd2FpdCAgZnMucmVhZGRpclN5bmModG9vbF9saXN0KVxyXG4gICAgdmFyIGNhc2VMaXN0ID1hd2FpdCAgZnMucmVhZGRpclN5bmModGFza3NEaXIpXHJcbiAgICBmb3IobGV0IGkgPSAwO2k8Y2FzZUxpc3QubGVuZ3RoO2krKyl7XHJcbiAgICAgICAgaWYoY2FzZUxpc3RbaV09PVwib25sb2FkLmpzXCIpe1xyXG4gICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgdGFyZ2V0UGF0aCA9IHBhdGguam9pbih0YXNrc0RpcixjYXNlTGlzdFtpXSlcclxuICAgICAgXHJcbiAgICAgICAgY29uc29sZS5pbmZvKGB0ZXN0Y2FzZTogJHt0YXJnZXRQYXRofWApXHJcbiAgICAgICAgZm9yIChsZXQgaiA9IDA7ajxydXN0YmR0MlRvb2xGaWxlcy5sZW5ndGg7aisrKXtcclxuICAgICAgICAgICAgaWYocnVzdGJkdDJUb29sRmlsZXNbal0gPT0gXCJjb25maWcuanNcIiAmJiBmcy5wYXRoRXhpc3RzU3luYyhwYXRoLmpvaW4odGFyZ2V0UGF0aCxydXN0YmR0MlRvb2xGaWxlc1tqXSkpKXtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhgJHtwYXRoLmpvaW4odG9vbF9saXN0LHJ1c3RiZHQyVG9vbEZpbGVzW2pdKX0gYWxyZWFkeSBleGlzdGApXHJcbiAgICAgICAgICAgICAgICBjb250aW51ZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhwYXRoLmpvaW4odG9vbF9saXN0LHJ1c3RiZHQyVG9vbEZpbGVzW2pdKSlcclxuICAgICAgICAgICAgYXdhaXQgZnMuY29weUZpbGVTeW5jKHBhdGguam9pbih0b29sX2xpc3QscnVzdGJkdDJUb29sRmlsZXNbal0pLHBhdGguam9pbih0YXJnZXRQYXRoLHJ1c3RiZHQyVG9vbEZpbGVzW2pdKSlcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG59XHJcblxyXG5cclxuLy/lvIDlp4vljovnvKnmlofku7ZcclxuYXN5bmMgZnVuY3Rpb24gc3RhcnRaSVAoKSB7XHJcbiAgICB2YXIgY3VyclBhdGggPSBfX2Rpcm5hbWU7Ly/mlofku7bnmoTnu53lr7not6/lvoQg5b2T5YmN5b2T5YmNanPmiYDlnKjnmoTnu53lr7not6/lvoRcclxuICAgIHZhciB0YXNrc0RpciA9IHBhdGguam9pbihjdXJyUGF0aCwgXCIuLi8uLi9ub2RlX3Rlc3Rlcl9hcHAvdGFza3NcIik7XHJcbiAgICB2YXIgcnVzdGJkdDIgPSBwYXRoLmpvaW4oY3VyclBhdGgsJy4uLy4uL25vZGVfdGVzdGVyX2FwcC90YXNrVG9vbHMvY3lmc19iZHQnKVxyXG4gICAgdmFyIHJ1c3RiZHQyVG9vbEZpbGVzID1hd2FpdCAgZnMucmVhZGRpclN5bmMocnVzdGJkdDIpXHJcbiAgICB2YXIgY2FzZUxpc3QgPSBhd2FpdCAgZnMucmVhZGRpclN5bmModGFza3NEaXIpXHJcbiAgICBmb3IobGV0IGkgPSAwO2k8Y2FzZUxpc3QubGVuZ3RoO2krKyl7XHJcbiAgICAgICAgbGV0IHRhcmdldFBhdGggPSBwYXRoLmpvaW4odGFza3NEaXIsY2FzZUxpc3RbaV0pXHJcbiAgICAgICAgLy9jb25zb2xlLmluZm8odGFyZ2V0UGF0aClcclxuICAgICAgICByZWFkRGlyKHRhcmdldFBhdGgpO1xyXG4gICAgICAgIHppcC5nZW5lcmF0ZUFzeW5jKHsvL+iuvue9ruWOi+e8qeagvOW8j++8jOW8gOWni+aJk+WMhVxyXG4gICAgICAgICAgICB0eXBlOiBcIm5vZGVidWZmZXJcIiwvL25vZGVqc+eUqFxyXG4gICAgICAgICAgICBjb21wcmVzc2lvbjogXCJERUZMQVRFXCIsLy/ljovnvKnnrpfms5VcclxuICAgICAgICAgICAgY29tcHJlc3Npb25PcHRpb25zOiB7Ly/ljovnvKnnuqfliKtcclxuICAgICAgICAgICAgICAgIGxldmVsOiA5XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChjb250ZW50OmFueSkge1xyXG4gICAgICAgICAgICBmcy53cml0ZUZpbGVTeW5jKHRhcmdldFBhdGgrIGAvJHtjYXNlTGlzdFtpXX0uemlwYCwgY29udGVudCwgXCJ1dGYtOFwiKTsvL+WwhuaJk+WMheeahOWGheWuueWGmeWFpSDlvZPliY3nm67lvZXkuIvnmoQgcmVzdWx0LnppcOS4rVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgfVxyXG4gICAgXHJcbn1cclxuXHJcblxyXG5hc3luYyBmdW5jdGlvbiAgZ3VscEJ1aWxkKCkge1xyXG4gICAgbGV0IGNtZCA9IHBhdGguam9pbihfX2Rpcm5hbWUsJy4uLy4uL25vZGVfbW9kdWxlcy8uYmluL2d1bHAgYnVpbGQnKVxyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGFzeW5jICgpPT57XHJcbiAgICAgICAgbGV0IHByb2Nlc3MxID0gYXdhaXQgQ2hpbGRQcm9jZXNzLmV4ZWMoY21kKVxyXG4gICAgICAgIHByb2Nlc3MxLm9uY2UoJ2Vycm9yJywgKGVycjogYW55KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYGNyZWF0ZSBwcm9jZXNzIGZhaWxlZCwgZXJyPSR7ZXJyfSwgcGxhdGZvcm09JHtvcy5wbGF0Zm9ybX1gKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBwcm9jZXNzMSEuc3Rkb3V0IS5vbignZGF0YScsIChkYXRhKSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBzdHIgPSBkYXRhLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICAgIC8vc3RyID0gc3RyLnJlcGxhY2UoL1xcclxcbi9nLCAnJyk7XHJcbiAgICAgICAgICAgIHN0ciA9IHN0ci5yZXBsYWNlKC9cXG4vZywgJycpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmluZm8oc3RyKVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHByb2Nlc3MxIS5zdGRlcnIhLm9uKCdkYXRhJywgKGRhdGEpID0+IHtcclxuICAgICAgICAgICAgbGV0IHN0ciA9IGRhdGEudG9TdHJpbmcoKTtcclxuICAgICAgICAgICAgLy9zdHIgPSBzdHIucmVwbGFjZSgvXFxyXFxuL2csICcnKTtcclxuICAgICAgICAgICAgc3RyID0gc3RyLnJlcGxhY2UoL1xcbi9nLCAnJyk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhzdHIpXHJcbiAgICAgICAgfSk7XHJcbiAgICB9KVxyXG4gICAgXHJcbn1cclxuXHJcblxyXG5hc3luYyBmdW5jdGlvbiBtb2RpZnlJbXBvcnQocGFyYW1zOnN0cmluZyx0YXNrX25hbWU6c3RyaW5nLHRvb2xfdXJsOnN0cmluZyxkZXBsb3lfdXJsOnN0cmluZyl7XHJcbiAgICBsZXQgdGFza1BhdGggPSBwYXRoLmpvaW4oX19kaXJuYW1lLCcuLi90YXNrcycpXHJcbiAgICB0YXNrX25hbWUgPSAgcGF0aC5qb2luKF9fZGlybmFtZSxgLi4vJHt0YXNrX25hbWV9YClcclxuICAgIC8vY29uc29sZS5pbmZvKGDlpI3liLbnlKjkvovliJfooaggJHt0YXNrX25hbWV9IC0+ICR7dGFza1BhdGh9YClcclxuICAgIGxldCBjYXNlTGlzdCA9IGZzLnJlYWRkaXJTeW5jKHRhc2tfbmFtZSk7XHJcbiAgICBmb3IobGV0IGluZGV4IGluIGNhc2VMaXN0KXtcclxuICAgICAgICAvL2NvbnNvbGUuaW5mbyhg5aSN5Yi255So5L6LICR7cGF0aC5qb2luKHRhc2tfbmFtZSxjYXNlTGlzdFtpbmRleF0pfSAtPiAke3Rhc2tQYXRofWApXHJcbiAgICAgICAgZnMuY29weVN5bmMocGF0aC5qb2luKHRhc2tfbmFtZSxjYXNlTGlzdFtpbmRleF0pLHBhdGguam9pbih0YXNrUGF0aCxjYXNlTGlzdFtpbmRleF0pIClcclxuICAgIH1cclxuICAgIGxldCB0ZXN0Y2FzZVBhdGggPSBmcy5yZWFkZGlyU3luYyh0YXNrUGF0aClcclxuICAgIGZvcihsZXQgaW5kZXggaW4gdGVzdGNhc2VQYXRoKXtcclxuICAgICAgIC8vIGNvbnNvbGUuaW5mbyh0ZXN0Y2FzZVBhdGhbaW5kZXhdKVxyXG4gICAgICAgIGlmKHRlc3RjYXNlUGF0aFtpbmRleF0uaW5kZXhPZihwYXJhbXMpPi0xKXtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGxldCBvbmxvYWQgPSBwYXRoLmpvaW4odGFza1BhdGgsdGVzdGNhc2VQYXRoW2luZGV4XSwnb25sb2FkLmpzJylcclxuICAgICAgICAgICAgLy8gaWYoIWZzLnBhdGhFeGlzdHNTeW5jKG9ubG9hZCkpe1xyXG4gICAgICAgICAgICAvLyAgICAgY29udGludWVcclxuICAgICAgICAgICAgLy8gfVxyXG4gICAgICAgICAgICAvL2NvbnNvbGUuaW5mbyhvbmxvYWQpXHJcbiAgICAgICAgICAgIGxldCByZXBsYWNlID0gIG5ldyBQcm9taXNlKGFzeW5jKHYpPT57XHJcbiAgICAgICAgICAgICAgIGF3YWl0IGZzLnJlYWRGaWxlKG9ubG9hZCwndXRmOCcsKGVycixkYXRhKT0+e1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGVycil7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhlcnIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHYoZXJyKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHJlc3VsdCA9IGRhdGEucmVwbGFjZShuZXcgUmVnRXhwKHRvb2xfdXJsLFwiZ21cIiksZGVwbG95X3VybClcclxuICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUuaW5mbyhgJHtvbmxvYWR9IOabv+aNoiBpbXBvcnRgKSBcclxuICAgICAgICAgICAgICAgICAgICBmcy53cml0ZUZpbGUob25sb2FkLHJlc3VsdCwndXRmOCcsKGVycik9PntcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoZXJyKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhlcnIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgdihlcnIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICBhd2FpdCByZXBsYWNlO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gZW1weXRUYXNrKCkge1xyXG4gICAgbGV0IGRpcl9wYXRoID0gcGF0aC5qb2luKF9fZGlybmFtZSxcIi4uL3Rhc2tzXCIpXHJcbiAgICBmcy5yZW1vdmVTeW5jKGRpcl9wYXRoKVxyXG59XHJcblxyXG5cclxuYXN5bmMgZnVuY3Rpb24gbWFpbigpIHtcclxuICAgIGxldCBuYW1lID0gIFN5c1Byb2Nlc3MuYXJndlsyXTtcclxuICAgIGxldCBwYXJ0ID0gIFN5c1Byb2Nlc3MuYXJndlszXTtcclxuICAgIGF3YWl0IGVtcHl0VGFzaygpO1xyXG4gICAgYXdhaXQgbW9kaWZ5SW1wb3J0KHBhcnQsbmFtZSwnLi4vLi4vdGFza1Rvb2xzL2N5ZnNfYmR0JywnLicpO1xyXG4gICAgYXdhaXQgY29weVRvb2xzKCcuLi90YXNrVG9vbHMvY3lmc19iZHQnLFwiLi4vdGFza3NcIik7IC8v5aSN5Yi2IHRhc2tUb29sc1xyXG4gICAgYXdhaXQgc3RhcnRaSVAoKTsgLy/nlJ/miJB6aXDljovnvKnmlofku7ZcclxufVxyXG5cclxubWFpbigpO1xyXG5cclxuIl19
