const exec = require('child_process').exec;
const fs = require('fs');
const { time } = require('console');
const path = require('path')
const process = require('process'); 

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
            fs.writeFileSync(orgfilepath, desfilepath)
			console.error(Date().toString() + "FolderAndFileOperation_copyFile: des file already existed." + " new path: " + desfilepath.toString());
		}
	} else {
		console.error(Date().toString() + "FolderAndFileOperation_copyFile: org file not existed." + " org path: " + orgfilepath.toString());
	}
}

function sleep(ms) {
    return new Promise(resolve=>setTimeout(resolve, ms))
}
function run_cmd(cmd,file_path,type){

    const cmd_path = path.join(__dirname,file_path)
    const cmdStr = `${cmd} `
    console.log("cmdstr",cmdStr)
    if (type == "cmd"){
        console.log("cmd",cmdStr+cmd_path)
        const child = exec(cmdStr+cmd_path)
        child.stdout.on('data', data => {
            console.log('stdout 输出:', data);
        })
        child.stderr.on('data', err => {
            console.log('error 输出:', err);    
        })
    }
    else if(type=="local") {
        console.log("local_cmd",cmdStr)
        console.log("local_file_path",file_path)
        exec(cmdStr, {cwd: path.join(__dirname,file_path)},(error, stdout, stderr) => {
        if (error) {
            console.error('error:', error);
            return;
          }
          console.log('stdout: ' + stdout);
          console.log('stderr: ' + stderr);
        })
    }
}

async function change_sdk(){
    const sdk = process.argv[3];
    if (sdk == "cyfs-node") {
        run_cmd("npm run init cyfs-node ","../../../src/cyfs-stack-test-typescript/","local")

    }else if (sdk == "cyfs-sdk-nightly") {
        run_cmd("npm run init cyfs-sdk-nightly","../../../src/cyfs-stack-test-typescript/","local")
    }
    else if (sdk == "cyfs-sdk") {
        run_cmd("npm run init cyfs-sdk","../../../src/cyfs-stack-test-typescript/","local")
    }
}

async function pack(){
    //copy package.json to deploy
    copyFile(path.join(__dirname,"../../../src/cyfs-stack-test-typescript/package.json")
    ,path.join(__dirname,"../../../deploy/cyfs-stack-test-typescript")
    ,'package.json')
    await sleep(10000)
    run_cmd("npm i","../../../deploy/cyfs-stack-test-typescript","local")
}

const type = process.argv[2];
if (type == "change_sdk"){
    change_sdk()
}else if(type == "pack_test-typescript"){
    pack()
}
