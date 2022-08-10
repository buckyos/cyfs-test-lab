import * as http from "http"
import * as fs from 'fs'
//let http = require("http"); // 引入http模块
// let co = require('co');
// 106.12.128.114
//192.168.100.74
const server_host = "106.12.128.114";
const server_port = 5000;

export const ContentType = {
    urlencoded : 'application/x-www-form-urlencoded',
    json : 'application/json',
    raw : 'text/plain'
}


export async function request(method:string,route:string,postData?:any,psotType?:string){
    let header = {}
    if(method == 'POST'){
        header = {'Content-Type': psotType,'Content-Length': Buffer.byteLength(postData)}
    }
    let options = {
        hostname: server_host,
        port: server_port,
        path: '/' + route,
        method: method,
        headers: header
    };
    let data = '';
    return new Promise<any>(function (resolve:any, reject:any) {
        let req = http.request(options, function(res) {
            res.setEncoding('utf8');
            res.on('data', function(chunk:any) {
                data += chunk;
            });
            
            res.on('end', function() {
                console.info(`send data : ${data}`)
                resolve({err: 0, data:  eval("(" + data + ")")});
            });
            
        });
 
        req.on('error', (e:any) => {
            resolve({err: 110, errmsg: e.message});
        });
        if(method == 'POST'){
            req.write(postData)
        }
        req.end();
    });
}


export async function upload(filePath:string,filename:string){

    
    var boundaryKey = '----WebKitFormBoundary' + new Date().getTime();
    var options = {
        host:server_host,//远端服务器域名
        port:server_port,//远端服务器端口号
        method:'POST',
        path:'/upload',//上传服务路径
        headers:{
        'Content-Type':'multipart/form-data; boundary=' + boundaryKey,
        }
    };

    var req = http.request(options,function(res){
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
    console.log(boundaryKey);
    console.log('body: ' + chunk);
    });
    res.on('end',function(){
    //hebing(id);
    
    
    console.log('res end.');
    });
    });
    
    req.write(
    '--' + boundaryKey + '\r\n' +
    'Content-Disposition: form-data; name="logo"; filename='+filename+'\r\n' +
    'Content-Type:video/webm\r\n\r\n'
    );
    
    var fileStream = fs.createReadStream(filePath);
    fileStream.pipe(req,{end:false});
    fileStream.on('end',function(){
    req.end('\r\n--' + boundaryKey + '--');
    });
}

