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

const LIMIT_DETECT_INTERVAL = 3600000;
const RESULT_CACHE_TIME = 300000;
const SYM_DETECT_SERVER = {port: 11002, address: '192.168.100.254'};
const HOST_DETECT_SERVER = {port: 11003, address: '10.13.187.14'};
//const SYM_DETECT_SERVER = {port: 11002, address: '127.0.0.1'};
//const HOST_DETECT_SERVER = {port: 11003, address: '127.0.0.1'};

class NatTypeServer1 {
    constructor() {
        this.m_detectTaskCache = new Map();
        this.m_detectingTaskSet = new Set();
        this.m_defaultLastDetectTime = 0;
        this.m_socketListener = null;
        this.m_socketDetector = null;
    }

    run() {
        this.m_socketListener = this._bindSocket(11001, (pkg, remote) => {
            //console.log(`[S1]: peerid:${pkg.peerid}, type:${pkg.type}`);
            switch (pkg.type) {
                case 'start':
                    this._onDetectTaskStart(pkg, remote);
                    break;
                default:
                    break;
            }
        });

        this.m_socketDetector = this._bindSocket(0, (pkg, remote) => {
            //console.log(`[S1]: peerid:${pkg.peerid}, type:${pkg.type}`);
            switch (pkg.type) {
                case 'port-detect-resp':
                    this._onPortDetectResp(pkg, remote);
                    break;
                case 'host-host-resp':
                    this._onHost2HostResp(pkg, remote);
                    break;
                default:
                    break;
            }
        });

        setInterval(() => {
            this.m_detectingTaskSet.forEach(peerid => {
                let task = this.m_detectTaskCache.get(peerid);
                if (task.status === 'detecting') {
                    this._tryTask(task);
                }
            });
        }, 500);
    }

    _onDetectTaskStart(pkg, remote) {
        let now = Date.now();
        let detectTask = this.m_detectTaskCache.get(pkg.peerid);
        let defaultTask = {
            status: 'init',
            ep: [`4@${remote.address}@${remote.port}@u`],
            tryPkg: [],
            peerid: pkg.peerid,
            portRestrict: false,
            hostRestrict: false,
            lastTime: this.m_defaultLastDetectTime,
            lastTryTime: 0,
            startTime: 0,
        };
        detectTask = detectTask || defaultTask;

        let ep = `4@${remote.address}@${remote.port}@u`;
        let epSet = new Set(detectTask.ep);
        epSet.delete(ep);
        detectTask.ep = [ep, ...epSet];

        if (detectTask.status === 'detecting') {
            return;
        }

        if (now - detectTask.lastTime < LIMIT_DETECT_INTERVAL) {
            if (now - detectTask.lastTime > RESULT_CACHE_TIME) {
                detectTask.status = 'init';
            }
            this._taskFinish(detectTask);
        } else {
            detectTask.lastTime = now;
            detectTask.status = 'detecting';
            detectTask.tryPkg = [];
            detectTask.lastTryTime = 0;
            detectTask.startTime = now;
            detectTask.ep = [ep];
            this.m_detectTaskCache.set(pkg.peerid, detectTask);

            let portRestrictDetectPkg = {
                type: 'port-detect',
                peerid: pkg.peerid,
            };
            detectTask.tryPkg.push({pkg: portRestrictDetectPkg, remote});

            let hostRestrictDetectPkg = {
                type: 'host-host',
                peerid: pkg.peerid,
                remote,
            };
            detectTask.tryPkg.push({pkg: hostRestrictDetectPkg, remote: HOST_DETECT_SERVER});
            this.m_detectingTaskSet.add(pkg.peerid);
            this._tryTask(detectTask);
        }
    }

    _onPortDetectResp(pkg, remote) {
        let task = this.m_detectTaskCache.get(pkg.peerid);
        if (!task) {
            return;
        }
        let ep = `4@${remote.address}@${remote.port}@u`;
        let epSet = new Set(task.ep);
        epSet.delete(ep);
        task.ep = [ep, ...epSet];

        for (let i = 0; i < task.tryPkg.length; i++) {
            if (task.tryPkg[i].pkg.type === 'port-detect') {
                task.tryPkg.splice(i, 1);
                return;
            }
        }

        if (task.tryPkg.length === 0) {
            task.status = 'finish';
            this._taskFinish(task);
        }
    }

    _onHost2HostResp(pkg, remote){
        let task = this.m_detectTaskCache.get(pkg.peerid);
        if (!task) {
            return;
        }

        for (let i = 0; i < task.tryPkg.length; i++) {
            if (task.tryPkg[i].pkg.type === 'host-host') {
                task.tryPkg.splice(i, 1);
                return;
            }
        }

        if (task.tryPkg.length === 0) {
            task.status = 'finish';
            this._taskFinish(task);
        }
    }
    
    _tryTask(task) {
        let now = Date.now();
        if (now - task.startTime > 10000) {
            // timeout
            task.status = 'finish';
            this._taskFinish(task);
            return;
        }

        // resend
        if (now - task.lastTryTime >= 2000) {
            task.lastTryTime = now;
            task.tryPkg.forEach(pkgInfo => 
                this.m_socketDetector.send(JSON.stringify(pkgInfo.pkg), pkgInfo.remote.port, pkgInfo.remote.address));
        }
    }

    _taskFinish(task) {
        let now = Date.now();
        task.portRestrict = false;
        task.hostRestrict = false;
        task.tryPkg.forEach(pkgInfo => {
            if (pkgInfo.pkg.type === 'port-detect') {
                task.portRestrict = true;
            } else if (pkgInfo.pkg.type === 'host-host') {
                task.hostRestrict = true;
            }
        });

        let startRespPkg = {
            type: 'start-resp',
            peerid: task.peerid,
            status: task.status,
            nextInterval: LIMIT_DETECT_INTERVAL - (now - task.lastTime),
            ep: task.ep,
            portRestrict: task.portRestrict,
            hostRestrict: task.hostRestrict,
            symDetectServer: SYM_DETECT_SERVER,
        };
        if (task.status === 'init') {
            startRespPkg.status = 'ignore';
        }
        let [family, address, port] = task.ep[0].split('@');
        this.m_socketListener.send(JSON.stringify(startRespPkg), port, address);
        this.m_detectingTaskSet.delete(task.peerid);
    }

    _bindSocket(port, onPkg) {
        let socket = dgram.createSocket('udp4');
        socket.once('listening', () => {
            socket.on('message', (msg, remote) => {
                let pkg = null;
                try {
                    pkg = JSON.parse(msg);
                } catch (error) {
                    return;
                }
                onPkg(pkg, remote);
                return;
            });
            
            //console.log(`[detect]: socket bind udp ${socket.address()} success`);
        });
        
        socket.once('close', () => process.exit(-1));
        
        socket.on('error', error => {
            //console.log(`[detect]: socket failed, error:${error}.`);
            socket.close();
            process.exit(-1);
        });
        socket.bind(port, '0.0.0.0');
        return socket;
    }
}

let server = new NatTypeServer1();
server.run();