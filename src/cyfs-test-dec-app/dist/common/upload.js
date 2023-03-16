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
exports.FileUploader = void 0;
const Http = __importStar(require("http"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const SysUtil = __importStar(require("util"));
class FileUploader {
    constructor() {
        this.m_host = '';
        this.m_port = 0;
        this.m_rootPath = `/uploadFile/`;
        this.m_uploadEventList = [];
    }
    static getInstance() {
        return FileUploader.s_FileUploader;
    }
    init(host, port) {
        this.m_host = host;
        this.m_port = port || 80;
    }
    async upload(filePath, remoteDir) {
        let combined = false;
        let waiter = new Promise(resolve => {
            let onDone = (result) => resolve(result);
            let callbackList = null;
            for (let item of this.m_uploadEventList) {
                if (item.filePath === filePath) {
                    callbackList = item.callbackList;
                    callbackList.push(onDone);
                    combined = true;
                    break;
                }
            }
            if (!callbackList) {
                this.m_uploadEventList.push({ filePath, remoteDir, callbackList: [onDone] });
            }
        });
        if (!combined && this.m_uploadEventList.length === 1) {
            while (this.m_uploadEventList.length > 0) {
                let result = await this._uploadOneFile(this.m_uploadEventList[0].filePath, this.m_uploadEventList[0].remoteDir);
                let reportedEvent = this.m_uploadEventList.shift();
                reportedEvent.callbackList.forEach((cb) => cb(result));
            }
        }
        return waiter;
    }
    _uploadOneFile(filePath, remoteDir) {
        let readFile = SysUtil.promisify(fs.readFile);
        return new Promise(async (resolve) => {
            let data = null;
            try {
                data = await readFile(filePath);
            }
            catch (error) {
                console.log(JSON.stringify(error));
            }
            if (!data) {
                resolve({ result: -1, filePath });
                return;
            }
            let respBuffer = Buffer.allocUnsafe(Buffer.poolSize);
            let recvSize = 0;
            const fileName = path.basename(filePath);
            let targetPath = this.m_rootPath;
            if (remoteDir) {
                targetPath = `${targetPath}${remoteDir}/`;
            }
            targetPath = `${targetPath}${fileName}`;
            const request = Http.request({ host: this.m_host, port: this.m_port, path: targetPath, method: 'POST' }, (resp) => {
                if (resp.statusCode === 200) {
                    resp.setTimeout(1000);
                    resp.on('data', (chunk) => {
                        if (recvSize + chunk.length > respBuffer.length) {
                            let newBuffer = Buffer.allocUnsafe((recvSize + chunk.length + Buffer.poolSize - 1) / Buffer.poolSize * Buffer.poolSize);
                            respBuffer.copy(newBuffer);
                            respBuffer = newBuffer;
                        }
                        chunk.copy(respBuffer, recvSize);
                        recvSize += chunk.length;
                    });
                    resp.once('end', () => {
                        resolve({ result: 0, filePath, content: JSON.parse(respBuffer.slice(0, recvSize).toString()) });
                    });
                    resp.once('error', () => {
                        resolve({ result: -2, filePath });
                    });
                }
                else {
                    resolve({ result: -3, filePath });
                }
            });
            request.once('error', (err) => {
                resolve({ result: -4, filePath });
            });
            request.setHeader('Content-Type', 'application/octet-stream');
            // let ziper = new AdmZip();
            // // attr如果不指定，对应文件不可见
            // // attr = 1 表示只读
            // // attr = 2 表示隐藏
            // // attr = 3 表示只读+隐藏
            // // attr = 4 表示系统文件
            // // attr = others 未测试
            // ziper.addFile(fileName, data, "", 1);
            // const compressedData = ziper.toBuffer();
            request.write(data);
            request.end();
        });
    }
}
exports.FileUploader = FileUploader;
FileUploader.s_FileUploader = new FileUploader();
;
