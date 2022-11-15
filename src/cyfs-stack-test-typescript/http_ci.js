const exec = require('child_process').exec;
const fs = require('fs');
const { time } = require('console');
const path = require('path')
const process = require('process'); 
const express = require('express')
const axios = require('axios')
function ax_post(req){
    axios
    .post(req, {
    })
    .then(res => {
        console.log(`状态码: ${res.statusCode}`)
        console.log(res)
    })
    .catch(error => {
        console.error(error)
    })
}

function ax_get(req)
    {axios
    .get(req)
    .then(res => {    
        console.log(res.data);
    })
    .catch(error => {        
        console.log(error);
    });
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

function sr(){
//创建web服务器
const app = express()
//挂载路由
app.get('/build',(req,res)=>{
    run_cmd("node","../opt/cyfs_stack/build_stack.js","cmd")
})
app.get('/run',(req,res)=>{
    run_cmd("node","../../deploy/cyfs-stack-test-typescript/mocha_run_ci.js","cmd")
})
//启动服务器
app.listen(85,()=>{
  console.log('express server running ')
})
}

let build = 'http://192.168.100.244/build'
let run = 'http://192.168.100.244/run'

const type = process.argv[2];
if (type == "build"){
    ax_get(build)
}
else if(type == "run"){
    ax_get(run)
}
