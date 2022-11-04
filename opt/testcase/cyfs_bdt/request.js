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
exports.upload = exports.request = exports.ContentType = void 0;
const http = __importStar(require("http"));
const fs = __importStar(require("fs"));
exports.ContentType = {
    urlencoded: 'application/x-www-form-urlencoded',
    json: 'application/json',
    raw: 'text/plain'
};
async function request(method, route, postData, psotType) {
    let header = {};
    if (method == 'POST') {
        header = { 'Content-Type': psotType, 'Content-Length': Buffer.byteLength(postData) };
    }
    let options = {
        host: "192.168.100.205",
        port: 11081,
        path: '/' + route,
        method: method,
        headers: header
    };
    let data = '';
    return new Promise(function (resolve, reject) {
        let req = http.request(options, function (res) {
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                data += chunk;
            });
            res.on('end', function () {
                //console.info(data)
                resolve({ err: 0, data: eval("(" + data + ")") });
            });
        });
        req.on('error', (e) => {
            resolve({ err: 110, errmsg: e.message });
        });
        if (method == 'POST') {
            req.write(postData);
        }
        req.end();
    });
}
exports.request = request;
async function upload(filePath, filename) {
    var boundaryKey = '----WebKitFormBoundary' + new Date().getTime();
    var options = {
        host: "192.168.100.205",
        port: 11000,
        method: 'POST',
        path: '/uploadFile/taskspackage',
        headers: {
            'Content-Type': 'multipart/form-data; boundary=' + boundaryKey,
        }
    };
    let data = '';
    return new Promise(function (resolve, reject) {
        var req = http.request(options, function (res) {
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                //console.log(boundaryKey);
                //console.log('body: ' + chunk);
                data += chunk;
            });
            res.on('end', function () {
                //console.info(data)
                resolve({ err: 0, data: eval("(" + data + ")") });
                //console.log('res end.');
            });
        });
        req.write('--' + boundaryKey + '\r\n' +
            'Content-Disposition: form-data; name="file"; filename=' + filename + '\r\n' +
            'Content-Type:video/webm\r\n\r\n');
        var fileStream = fs.createReadStream(filePath);
        fileStream.pipe(req, { end: false });
        fileStream.on('end', function () {
            req.end('\r\n--' + boundaryKey + '--');
        });
    });
}
exports.upload = upload;

