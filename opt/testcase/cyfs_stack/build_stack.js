var exec = require('child_process').exec;
var fs = require('fs');
var { time } = require('console');
var path = require('path')
var process = require('process');

var doing = false;
var commandQueue = []; 

function exec_ex(command) {
  doing = true;
  console.log(command);
 exec(command, {}, (err, stdout, stderr) => {
    console.log(`stdout: ${stdout}\n stderr: ${stderr}`);
    commandQueue.length > 0 ? exec(commandQueue.shift()) : doing = false;
  });
}

function createFolder(dirpath, dirname) {
	if (typeof dirname === "undefined") {
		if (fs.existsSync(dirpath)) {
		} else {
			createFolder(dirpath, path.dirname(dirpath));
		}
	} else {
		if (dirname !== path.dirname(dirpath)) {
			createFolder(dirpath);
			return;
		}
		if (fs.existsSync(dirname)) {
			fs.mkdirSync(dirpath)
		} else {
			createFolder(dirname, path.dirname(dirname));
			fs.mkdirSync(dirpath);
		}
	}
}

function copyFile(orgfilepath, desdirpath, desfilename) {
    if (fs.existsSync(orgfilepath)) {
		let desfilepath = path.join(desdirpath, desfilename);
		if (!fs.existsSync(desfilepath)) {
			createFolder(desdirpath);
			fs.copyFileSync(orgfilepath, desfilepath);
		} else {
            fs.copyFileSync(orgfilepath, desfilepath);
			console.error(Date().toString() + "FolderAndFileOperation_copyFile: des file already existed." + " new path: " + desfilepath.toString());
		}
	} else {
		console.error(Date().toString() + "FolderAndFileOperation_copyFile: org file not existed." + " org path: " + orgfilepath.toString());
	}
}

function sleep(ms) {
    return new Promise(resolve=>setTimeout(resolve, ms))
}

function run_cmd(cmd,path,type) { 
    let cmd_group = {"cmd":cmd,"path":path,"type":type}
    commandQueue.push(cmd_group);
    if (!doing) {
            let cmd_g = commandQueue.shift()
            console.log("cmd_g",cmd_g)
            exec_cmd(cmd_g);
    }
}

 function exec_cmd(cmd_g){
    doing = true;
    console.log("command: ", cmd_g.cmd + " " + cmd_g.path)   
    //目标目录执行
    if(cmd_g.type == "local"){
        exec(cmd_g.cmd + " " + cmd_g.path, {},(error, stdout, stderr) => {
        console.log(`stdout: ${stdout}\n stderr: ${stderr}`);
        commandQueue.length > 0 ? exec_cmd(commandQueue.shift()) : doing = false;
        })
    }
             
}    

async function change_sdk(){
    var sdk = process.argv[3];
    var file_path = "../../../src/cyfs-stack-test-typescript"
    var cmd_path = path.join(__dirname,file_path)
    run_cmd ("cd",cmd_path)
    console.log("cmd_path",cmd_path)
    if (sdk == "cyfs-sdk-nightly") {
        run_cmd("npm run init cyfs-sdk-nightly", cmd_path , "local")
    }
    else if (sdk == "cyfs-sdk") {
        run_cmd("npm run init cyfs-sdk", cmd_path , "local")
    }
    else if (sdk == "source") {
        run_cmd("npm run init source", cmd_path , "local")
    }
    else if (sdk == "cyfs-node") {
        run_cmd("npm run init cyfs-node", cmd_path , "local")
    }
    
}

async function pack(){
    var tsconf_path = "../../../src/cyfs-stack-test-typescript/tsconfig.json"
    var ts_pkconf_path = "../../../src/cyfs-stack-test-typescript/package.json"
    var js_pkconf_path = "../../../deploy/cyfs-stack-test-typescript"
    run_cmd("tsc -p", path.join(__dirname,tsconf_path), "local")
    //copy package.json to deploy
    copyFile(path.join(__dirname,ts_pkconf_path)
    ,path.join(__dirname, js_pkconf_path)
    ,'package.json')
    run_cmd("npm i", path.join(__dirname,js_pkconf_path), "local")
}

async function run_test(){
    var file_path = "../../../deploy/cyfs-stack-test-typescript/mocha_run_ci.js"
    run_cmd("node", path.join(__dirname,file_path), "local")
}

async function main(){
    var type = process.argv[2];
    if (type == "change_sdk"){
        await change_sdk()
    }
    else if(type == "pack_test"){
        await pack()
    }
    else if(type == "run_test")
        await run_test()
}

main()

module.exports = run_cmd
