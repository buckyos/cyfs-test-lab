var util = require('util'),
    colors = require('colors'),
    http = require('http'),
    httpProxy = require('http-proxy');
    fs = require("fs");

var welcome = [
    '#    # ##### ##### #####        #####  #####   ####  #    # #   #',
    '#    #   #     #   #    #       #    # #    # #    #  #  #   # # ',
    '######   #     #   #    # ##### #    # #    # #    #   ##     #  ',
    '#    #   #     #   #####        #####  #####  #    #   ##     #  ',
    '#    #   #     #   #            #      #   #  #    #  #  #    #  ',
    '#    #   #     #   #            #      #    #  ####  #    #   #   '
].join('\n');

Date.prototype.Format = function(fmt) {
    var o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "h+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "S": this.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}


// 非法字符
var re = /php|exe|cmd|shell|select|union|delete|update|insert/;
/** 这里配置转发
 */
var proxyPassConfig = {
    "*": "http://127.0.0.1:1322/",
    "*": "http://127.0.0.1:1323/"
}

var logRootPath ="c:/htt_pproxy_client/";

console.log(welcome.rainbow.bold);

function getCurrentDayFile(){
    // console.log(logRootPath+"access_"+(new Date()).Format("yyyy-MM-dd")+".log");
    return logRootPath+"access_"+(new Date()).Format("yyyy-MM-dd")+".log";
}

//
// Basic Http Proxy Server
//
var proxy = httpProxy.createProxyServer({});
var server = http.createServer(function (req, res) {
    appendLog(req)

    var postData = "";
    req.addListener('end', function(){
        //数据接收完毕
        console.log(postData);
        if(!isValid(postData)){//post请求非法参数
            invalidHandler(res)
        }
    });
    req.addListener('data', function(postDataStream){
        postData += postDataStream
    });

    var result = isValid(req.url)
    //验证http头部是否非法
    for(key in req.headers){
        result = result&& isValid(req.headers[key])
    }

    if (result) {
        //var patternUrl = urlHandler(req.url);
        var patternUrl = req.headers.host;
        console.log("patternUrl:" + patternUrl);
        if (patternUrl) {
            proxy.web(req, res, {target: 'http://127.0.0.1:9008'});
        } else {
            noPattern(res);
        }

    } else {
        invalidHandler(res)
    }
});

proxy.on('error', function (err, req, res) {
    res.writeHead(500, {
        'Content-Type': 'text/plain'
    });

    res.end('Something went wrong.');
});

/**
 * 验证非法参数
 * @param value
 * @returns {boolean} 非法返回False
 */
function isValid(value) {
    return re.test(value) ? false : true;
}

/**
 * 请求转发
 * @param url
 * @returns {*}
 */
function urlHandler(url) {
    var tempUrl = url.substring(url.lastIndexOf("/"));
    console.log(url);
    return proxyPassConfig[tempUrl];
}

function invalidHandler(res) {
    res.writeHead(400, {'Content-Type': 'text/plain'});
    res.write('Bad Request ');
    res.end();
}


function noPattern(res) {
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.write('not found');
    res.end();
}


function getClientIp(req){
    return req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress;
}


function appendLog(req) {
    console.log("request url:" + req.url);
    var logData = (new Date()).Format("yyyy-MM-dd hh:mm:ss")+" "+getClientIp(req)+" "+req.method+ " "+req.url+"\n";
    fs.exists(logRootPath,function(exists){
        if(!exists){
            fs.mkdirSync(logRootPath)
        }
        fs.appendFile(getCurrentDayFile(),logData,'utf8',function(err){
            if(err)
            {
                console.log(err);
            }
        });
    })
}

console.log("listening on port 19999".green.bold)
server.listen(19999);