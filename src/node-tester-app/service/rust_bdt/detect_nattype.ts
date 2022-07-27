/**
 * 1.client.bind
 * 2.client.post(server1.port1, pkg)
 * 3.server1.port1.onRecv(pkg) {server1.port2.post(client, pkg); server2.post(client, pkg);}
 * 4.client.onRecv(pkg) {response()}
 * 5.server1.port2.response(server1.port1, pkg)
 * 6.server2.response(server1.port1, pkg)
 * 7.server1.port1.onRecv(pkg, server1.port2 | server2) {}
 * 8.timer.on() {server1.port1.response(client, result)}
 * 9.client.onRecv(result) {client.post(server2, pkg)}
 * 10.server2.onRecv(pkg, client) {response(client)}
 * 11.client.onRecv(pkg, server2) {natType}
 * 10.client.report(natType)
 */

const dgram = require('dgram');

//const DETECT_SERVER1 = {port: 11001, address: 'bdttest.tinyappcloud.com'};
const DETECT_SERVER1 = {port: 11001, address: '192.168.100.227'};

export class NatTypeDetector {
    private m_peerid : string;
    private m_detectResult : any;
    private m_socket : any;
    constructor(peerid:string) {
        this.m_peerid = peerid;
        this.m_detectResult = {
            status: 'init', // 'init', 'detecting','failed','success'
            noResp: true,
            portRestrict: false,
            hostRestrict: false,
            server1EP: [],
            server2EP: [],
        };
        this.m_socket = null;
    }

    async init() {
        return new Promise(resolve => {
            this.m_socket = dgram.createSocket('udp4');
            
            this.m_socket.once('listening', () => {
                //console.log(`[detect]: socket bind udp ${this.m_socket.address()} success`);
                resolve('success');
            });
            
            this.m_socket.once('close', () => {
                this.m_socket = null;
                resolve('failed');
            });
            
            this.m_socket.on('error', (error: any) => {
                //console.log(`[detect]: socket failed, error:${error}.`);
                if (this.m_socket) {
                    this.m_socket.close();
                    this.m_socket = null;
                }
                resolve('failed');
            });
            this.m_socket.bind(0, '0.0.0.0');
        });
    }

    async detect() {
        if (!this.m_socket) {
            await this.init();
            if (!this.m_socket) {
                this.m_detectResult.status = 'failed';
                return this.m_detectResult;
            }
        }
        this.m_detectResult.status = 'detecting';
        this.m_detectResult.noResp = true;
        this.m_detectResult.server1EP = [];
        this.m_detectResult.server2EP = [];

        let retryTimer = null;
        this.m_detectResult.status = await new Promise(resolve => {
            // 当前正在尝试发送的包
            let tryPkg:any = null;
            let tryRemoteAddr:any = null;
            let startTime = Date.now();
            let ignoreTimes = 0;
            retryTimer = setInterval(() => {
                if (!this.m_socket) {
                    resolve('failed');
                    return;
                }
                if (Date.now() - startTime > 50000) {
                    // 20秒没响应可成功判定为UDP封禁，有响应但没结束就是判定超时了
                    if (this.m_detectResult.noResp) {
                        resolve('success');
                    } else {
                        resolve('failed');
                    }
                    return;
                }
                if (this.m_socket && tryPkg && tryRemoteAddr) {
                    this.m_socket.send(JSON.stringify(tryPkg), tryRemoteAddr.port, tryRemoteAddr.address);
                }
            }, 2000);
            
            this.m_socket.removeAllListeners('message');
            this.m_socket.on('message', async (msg:any, remote:any) => {
                if (!this.m_socket) {
                    resolve('failed');
                    return;
                }
                let pkg = null;
                try {
                    pkg = JSON.parse(msg);
                } catch (error) {
                    return;
                }

                switch (pkg.type) {
                    case 'start-resp':
                        this.m_detectResult.noResp = false;
                        if (pkg.status === 'ignore') {
                            tryPkg = null;
                            ignoreTimes++;
                            if (ignoreTimes > 5) {
                                resolve('failed');
                            }
                        } else {
                            ignoreTimes = -1000;
                            this.m_detectResult.portRestrict = pkg.portRestrict;
                            this.m_detectResult.hostRestrict = pkg.hostRestrict;
                            this.m_detectResult.server1EP = [...new Set([...this.m_detectResult.server1EP, ...pkg.ep])];
                            // next
                            let detectSymPkg = {
                                type: 'sym-detect',
                                peerid: this.m_peerid,
                            }
                            tryPkg = detectSymPkg;
                            tryRemoteAddr = pkg.symDetectServer;
                            await new Promise(resolve => setTimeout(() => resolve(0), 25000));
                            if (this.m_socket) {
                                this.m_socket.send(JSON.stringify(detectSymPkg), pkg.symDetectServer.port, pkg.symDetectServer.address);
                            }
                        }
                        break;
                    case 'sym-detect-resp':
                        this.m_detectResult.noResp = false;
                        this.m_detectResult.server2EP = [...new Set([...pkg.ep, ...this.m_detectResult.server2EP])];
                        resolve('success');
                        break;
                    case 'port-detect':
                        let portDetectResp = {
                            type: 'port-detect-resp',
                            peerid: this.m_peerid,
                        };
                        this.m_socket.send(JSON.stringify(portDetectResp), remote.port, remote.address);
                        break;
                    case 'host-detect':
                        let hostDetectResp = {
                            type: 'host-detect-resp',
                            peerid: this.m_peerid,
                        };
                        this.m_socket.send(JSON.stringify(hostDetectResp), remote.port, remote.address);
                        break;
                    default:
                        break;
                }
            });

            let detectStartPkg = {
                type: 'start',
                peerid: this.m_peerid,
            };
            tryPkg = detectStartPkg;
            tryRemoteAddr = DETECT_SERVER1;
            this.m_socket.send(JSON.stringify(detectStartPkg), tryRemoteAddr.port, tryRemoteAddr.address);
        });

        if (retryTimer) {
            clearInterval(retryTimer);
            retryTimer = null;
        }
        return this.m_detectResult;
    }

    get result() {
        return this.m_detectResult;
    }
}

// module.exports = NatTypeDetector;

// if (require.main === module) {
//     async function main() {
//         let detector = new NatTypeDetector('NatTypeDetector');
//         let result = await detector.detect();
    
//         console.log(JSON.stringify(result));
//     }

//     main();
// }
