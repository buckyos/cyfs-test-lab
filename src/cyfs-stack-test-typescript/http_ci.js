
const process = require('process'); 
const router = require('./route_ci');
const axios = require('axios')
const express = require('express')
const app = express()
let change_sdk = 'http://192.168.100.244:3000/change_sdk/'
let build = 'http://192.168.100.244:3000/build'
let run = 'http://192.168.100.244:3000/run'
let report = 'http://192.168.100.244:3000/report'


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



function client(type){
if (type == "change_sdk"){
    console.log("change_sdk_url",change_sdk + process.argv[4])
    ax_get(change_sdk + process.argv[4])
}
else if (type == "build"){
    ax_get(build)
}
else if(type == "run"){
    ax_get(run)
}   


function server(){
    app.use(router);
    //启动服务器
    app.listen(3000,()=>{
    console.log('express server running ')
    })}

function main(){
    if(process.argv[2] == "client"){
        client(process.argv[3])
    }
    else if(process.argv[2] == "server")
    {
        server()
    }
}
main()
