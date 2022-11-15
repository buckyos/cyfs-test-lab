const express = require('express')
const router = express.Router();
const path = require('path')
const exec = require('child_process').exec;
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

async function getTestReport(version) {
  console.info("send cpmmand to server,build testcase report");
  let run = await data_request.request("POST", "api/cyfs/report/reportHtml", { version }, request_1.ContentType.json);
  console.info("create testcase report resp:");
  console.info(JSON.stringify(run));
}


router.get('/change_sdk/:sdk_version', (req, res) => {
    run_cmd("node",`../../opt/testcase/cyfs_stack/build_stack.js change_sdk ${req.params.sdk_version}`,"cmd")
  });

router.get('/build', (req, res) => {
    run_cmd("node","../../opt/testcase/cyfs_stack/build_stack.js pack_test-typescript","cmd")
  });
 
  
router.get('/run', (req, res) => {
    run_cmd("node","../../deploy/cyfs-stack-test-typescript/mocha_run_ci.js","cmd")
  });

router.get('/report', (req, res) => {
    res.send('/')
  });


module.exports = router