import * as http from "http"
import * as fs from 'fs'

 
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
        host:"192.168.100.254",//远端服务器域名
        port:11081,//远端服务器端口号
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
                //console.info(data)
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
        host:"192.168.100.254",//远端服务器域名
        port:11000,//远端服务器端口号
        method:'POST',
        path:'/uploadFile/taskspackage',//上传服务路径
        headers:{
        'Content-Type':'multipart/form-data; boundary=' + boundaryKey,
        }
    };
    let data = '';
    return new Promise<any>(function (resolve:any, reject:any) {
        var req = http.request(options,function(res){
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                //console.log(boundaryKey);
                //console.log('body: ' + chunk);
                data += chunk;
            });
            res.on('end',function(){
                //console.info(data)
                resolve({err: 0, data:  eval("(" + data + ")")});
                //console.log('res end.');
            });

        });
        
        req.write(
        '--' + boundaryKey + '\r\n' +
        'Content-Disposition: form-data; name="file"; filename='+filename+'\r\n' +
        'Content-Type:video/webm\r\n\r\n'
        );
        
        var fileStream = fs.createReadStream(filePath);
        fileStream.pipe(req,{end:false});
        fileStream.on('end',function(){
        req.end('\r\n--' + boundaryKey + '--');
        });
    })

    
}

