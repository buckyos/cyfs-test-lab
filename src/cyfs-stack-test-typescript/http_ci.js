const exec = require('child_process').exec;
const fs = require('fs');
const { time } = require('console');
const path = require('path')
const process = require('process'); 

function ax_post(){
    axios
    .post('http://192.168.100.244', {
    })
    .then(res => {
        console.log(`状态码: ${res.statusCode}`)
        console.log(res)
    })
    .catch(error => {
        console.error(error)
    })
}

function ax_get()
    {axios.get('http://192.168.100.244:85')
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
app.get('/',(req,res)=>{
    run_cmd("node","../opt/cyfs_stack/build_stack.js","cmd")
})
app.post('/',(req,res)=>{
  res.send('xxxx')
  run_cmd("node","../opt/cyfs_stack/build_stack.js","cmd")
})
//启动服务器
app.listen(85,()=>{
  console.log('express server running ')
})
}


const type = process.argv[2];
if (type == "get"){
    ax_get()
}else if(type == "pack"){
    pack()
}