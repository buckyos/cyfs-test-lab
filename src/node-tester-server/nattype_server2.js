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
const HOST_DETECT_SERVER = {port: 11002, address: '10.13.187.14'};

class NatTypeServer2 {
    constructor() {
        this.m_detectingTaskCache = new Map();
        this.m_socketListenC = null;
        this.m_socketListenS1 = null;
    }

    run() {
        this.m_socketListenC = this._bindSocket(11002, (pkg, remote) => {
            //console.log(`[S2]: peerid:${pkg.peerid}, type:${pkg.type}`);
            switch (pkg.type) {
                case 'sym-detect':
                    this._onSymDetect(pkg, remote);
                    break;
                default:
                    break;
            }
        });

        this.m_socketListenS1 = this._bindSocket(11003, (pkg, remote) => {
            //console.log(`[S2]: peerid:${pkg.peerid}, type:${pkg.type}`);
            switch (pkg.type) {
                case 'host-host':
                    this._onHost2Host(pkg, remote);
                    break;
                case 'host-detect-resp':
                    this._onHostDetectResp(pkg, remote);
                    break;
                default:
                    break;
            }
        });
    }

    _onSymDetect(pkg, remote) {
        let symDetectResp = {
            type: 'sym-detect-resp',
            peerid: pkg.peerid,
            ep: [`4@${remote.address}@${remote.port}@u`],
        };
        this.m_socketListenC.send(JSON.stringify(symDetectResp), remote.port, remote.address);
    }

    _onHost2Host(pkg, remote){
        let now = Date.now();
        let task = {
            peerid: pkg.peerid,
            startTime: now,
            remote,
        };

        this.m_detectingTaskCache.set(pkg.peerid, task);

        let detectPkg = {
            type: 'host-detect',
            peerid: pkg.peerid,
        };
        this.m_socketListenS1.send(JSON.stringify(detectPkg), pkg.remote.port, pkg.remote.address);
    }

    _onHostDetectResp(pkg, remote){
        let task = this.m_detectingTaskCache.get(pkg.peerid);
        if (!task) {
            return;
        }

        let host2HostResp = {
            type: 'host-host-resp',
            peerid: pkg.peerid,
        };
        this.m_socketListenS1.send(JSON.stringify(host2HostResp), task.remote.port, task.remote.address);
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

let server = new NatTypeServer2();
server.run();