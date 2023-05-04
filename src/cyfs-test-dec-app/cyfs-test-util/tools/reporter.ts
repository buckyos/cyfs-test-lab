'use strict';

const Http = require('http');

export class Reporter {
    private m_host: any;
    private m_port: any;
    private m_peerid: any;
    private m_version: any;
    private m_reportEventList: any;
    private m_seq: any;
    private m_isReporting: any;
    private m_failedCount: any;
    private m_appName: any;
    constructor(host: any, port: any, peerid: any, version: any, appName = null) {
        this.m_host = host;
        this.m_port = port || 80;
        this.m_peerid = peerid;
        this.m_version = version;
        this.m_reportEventList = [];
        this.m_seq = 0;
        this.m_isReporting = false;
        this.m_failedCount = 0;
        this.m_appName = appName;
    }

    get peerid() {
        return this.m_peerid;
    }
    
    set peerid(pid) {
        this.m_peerid = pid;
    }

    set version(v: string) {
        this.m_version = v;
    }

    get seq() {
        if (!this.m_isReporting) {
            this.m_seq++;
        }
        return this.m_seq;
    }

    get continueFailCount() {
        return this.m_failedCount;
    }

    async report(type: any, content: any) {
        if (this.m_appName) {
            type = `${this.m_appName}/${type}`;
        }

        let record = {
            type,
            content,
            peerid: this.m_peerid,
            version: this.m_version,
            time: Date.now(),
        };

        let waiter = new Promise((resolve) => {
            let onDone = (result: any) => resolve(result);
            this.m_reportEventList.push({record, onDone});
        });

        if (this.m_reportEventList.length === 1) {
            while (this.m_reportEventList.length > 0) {
                this.m_isReporting = true;
                let result = await this._reportOneRecord(this.m_reportEventList[0].record);
                this.m_isReporting = false;
                
                let reportedEvent = this.m_reportEventList.shift();
                reportedEvent.onDone(result);
            }
        }
        return waiter;
    }

    _reportOneRecord(record: any) {
        return new Promise((resolve: any) => {
            let respBuffer = Buffer.allocUnsafe(Buffer.poolSize);
            let recvSize = 0;
            const request = Http.request({host: this.m_host, port: this.m_port, path: `/${record.type}`, method: 'POST'}, (resp: any) => {
                if (resp.statusCode === 200) {
                    resp.setTimeout(10000);
                    this.m_failedCount = 0;
                    resp.on('data', (chunk: any) => {
                        this.m_seq++;
                        if (recvSize + chunk.length > respBuffer.length) {
                            let newBuffer = Buffer.allocUnsafe((recvSize + chunk.length + Buffer.poolSize - 1) / Buffer.poolSize * Buffer.poolSize);
                            respBuffer.copy(newBuffer);
                            respBuffer = newBuffer;
                        }
                        chunk.copy(respBuffer, recvSize);
                        recvSize += chunk.length;
                    });
                    resp.once('end', () => {
                        this.m_seq++;
                        resolve({result: 0, content: JSON.parse(respBuffer.slice(0, recvSize).toString())});
                    });
                    resp.once('error', () => {
                        this.m_failedCount++;
                        this.m_seq++;
                        resolve(null);
                    });
                    resp.once('timeout', () => {
                        resolve(null);
                    });
                } else {
                    this.m_failedCount++;
                    this.m_seq++;
                    resolve(null);
                }
            });
    
            request.once('error', (err: any) => {
                this.m_seq++;
                this.m_failedCount++;
                resolve(null);
            });
            request.setTimeout(10000);
            request.once('timeout', () => {
                this.m_seq++;
                this.m_failedCount++;
                resolve(null);
            });

            request.setHeader('Content-Type', 'application/json');
            request.write(JSON.stringify(record));
            request.end();
        });
    }
}