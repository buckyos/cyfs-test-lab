
import * as Http from 'http';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as SysUtil from 'util';

export class FileUploader {
    public static s_FileUploader: FileUploader = new FileUploader();
    m_host: string = '';
    m_port: number = 0;
    m_rootPath: string;
    m_uploadEventList: any;
    static getInstance(): FileUploader {
        return FileUploader.s_FileUploader;
    }
    constructor() {
        this.m_rootPath = `/uploadFile/`;
        this.m_uploadEventList = [];
    }

    init(host: string, port: number) {
        this.m_host = host;
        this.m_port = port || 80;
    }

    async upload(filePath: string, remoteDir?: string) {
        let combined = false;
        let waiter = new Promise(resolve => {
            let onDone = (result: any) => resolve(result);
            let callbackList:any = null;
            for (let item of this.m_uploadEventList) {
                if (item.filePath === filePath) {
                    callbackList = item.callbackList;
                    callbackList.push(onDone);
                    combined = true;
                    break;
                }
            }

            if (!callbackList) {
                this.m_uploadEventList.push({filePath, remoteDir, callbackList: [onDone]});
            }
        });

        if (!combined && this.m_uploadEventList.length === 1) {
            while (this.m_uploadEventList.length > 0) {
                let result = await this._uploadOneFile(this.m_uploadEventList[0].filePath, this.m_uploadEventList[0].remoteDir);
                
                let reportedEvent = this.m_uploadEventList.shift();
                reportedEvent.callbackList.forEach((cb: any) => cb(result));
            }
        }
        return waiter;
    }

    _uploadOneFile(filePath: string, remoteDir?: string) {
        let readFile = SysUtil.promisify(fs.readFile);
        return new Promise(async (resolve) => {
            let data : any = null;
            try {
                data = await readFile(filePath);
            } catch (error) {
                console.log(JSON.stringify(error));
            }

            if (!data) {
                resolve({result: -1, filePath});
                return;
            }

            let respBuffer = Buffer.allocUnsafe(Buffer.poolSize);
            let recvSize = 0;
            const fileName = path.basename(filePath);
            let targetPath: string = this.m_rootPath;
            if (remoteDir) {
                targetPath = `${targetPath}${remoteDir}/`;
            }
            targetPath = `${targetPath}${fileName}`;
            const request = Http.request({host: this.m_host, port: this.m_port, path: targetPath, method: 'POST'}, (resp: any) => {
                if (resp.statusCode === 200) {
                    resp.setTimeout(1000);
                    resp.on('data', (chunk: any) => {
                        if (recvSize + chunk.length > respBuffer.length) {
                            let newBuffer = Buffer.allocUnsafe((recvSize + chunk.length + Buffer.poolSize - 1) / Buffer.poolSize * Buffer.poolSize);
                            respBuffer.copy(newBuffer);
                            respBuffer = newBuffer;
                        }
                        chunk.copy(respBuffer, recvSize);
                        recvSize += chunk.length;
                    });
                    resp.once('end', () => {
                        resolve({result: 0, filePath, content: JSON.parse(respBuffer.slice(0, recvSize).toString())});
                    });
                    resp.once('error', () => {
                        resolve({result: -2, filePath});
                    });
                } else {
                    resolve({result: -3, filePath});
                }
            });
    
            request.once('error', (err) => {
                resolve({result: -4, filePath});
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
};