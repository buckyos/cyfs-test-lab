/**
 * 1.client.listen(port)
 * 2.client.connect(server)
 * 3.client.send(server1, [peerid, port])       'hello-req-c-s1'
 * 4.[ip, peerid, port] = server1.recv()        'hello-req-c-s1'
 * 5.server1.tryConnect(ip, port);
 * 6.server1.send(client, hello);               'hello-req-s1-c'
 * 7.server1.send(server2, [peerid, ip, port])
 * 8.[peerid, ip, port] = server2.recv();
 * 9.server2.tryConnect(ip, port)
 * 10.record
 */

/**
 * {
 *      hello:
 *      serverNo:
 *      port:
 *      random:
 * }
 */
const assert = require('assert');
const net = require('net');
const {TcpServer, ErrorCode} = require('./tcp_server');
const {PackageCodecCreator} = require('./package_codec');

const REPORT_KEY = 'tcpdetect';
const DETECT_SERVER1 = {port: 11002, address: '10.13.94.172'};
const DETECT_SERVER2 = {port: 11003, address: '10.13.187.14'};

class TcpDetectorServer1 {
    constructor(reporter) {
        this.m_reporter = reporter;
    }

    async start() {
        let server = null;
        let connections = [];

        function clean() {
            if (server) {
                server.stop();
                server.removeAllListeners();
                server = null;
            }
        }

        let packageCodecCreator = new PackageCodecCreator();

        // start server
        server = new TcpServer(packageCodecCreator, DETECT_SERVER1.port, '0.0.0.0');
        server.on('close', () => {});
        server.on('error', errorCode => this.m_reporter.report(REPORT_KEY, {step: 'clientServerError', errorCode}));
        server.on('connection', connection => {
            function closeConnection() {
                if (connection) {
                    connection.close();
                    connection.removeAllListeners();
                    connection = null;
                }
            }
            connection.on('error', errorCode => {
                this.m_reporter.report(REPORT_KEY, {step: 'inConnectionError', errorCode});
                closeConnection();
            });
            connection.on('close', closeConnection);

            connection.on('packages', pkgs => {
                if (!connection) {
                    return;
                }

                const remote = connection.remote;

                for (let pkg of pkgs) {
                    switch (pkg.type) {
                        case 'hello-req-c-s1':
                            pkg.type = 'hello-resp-c-s1';
                            connection.send([pkg]);
                            this.m_reporter.report(REPORT_KEY, {step: 'accept', peerid: pkg.peerid, port: pkg.port, ip: remote? remote.ip : ''});
                            if (remote) {
                                this._detect(remote.ip, pkg.port, pkg.peerid);
                            }
                            setTimeout(closeConnection, 5000);
                            break;
                        default:
                            this.m_reporter.report(REPORT_KEY, {step: 'accept-unknown', ip: remote? remote.ip : ''});
                    }
                }
            });
            connection.start();
        });
        let err = await server.start();
        if (err !== ErrorCode.success) {
            this.m_reporter.report(REPORT_KEY, {step: 'clientServerFailed', errorCode: err});
            clean();
            return;
        }
    }

    async _detect(ip, port, peerid) {
        let timer = null;
        let timeoutPromise = new Promise(resolve => {
            timer = setTimeout(() => {
                this.m_reporter.report(REPORT_KEY, {step: 'timeout', peerid, ip, port});
            }, 30000);
        });

        function createPromiseEvent() {
            let resolveCallback = null;
            let prom = new Promise(resolve => {resolveCallback = resolve});
            return {promise: prom, resolve: resolveCallback};
        }

        let clientPromiseEvent = createPromiseEvent();
        let server2PromiseEvent = createPromiseEvent();

        let clientSocket = null;
        let server2Socket = null;

        function clean() {
            if (timer) {
                clearTimeout(timer);
                timer = null;                
            }
            if (clientSocket) {
                clientSocket.destroy();
                clientSocket.removeAllListeners();
                clientSocket = null;
            }
            if (server2Socket) {
                server2Socket.destroy();
                server2Socket.removeAllListeners();
                server2Socket = null;
            }
        }

        let packageCodecCreator = new PackageCodecCreator();
        
        // client
        const clientSeq = Math.ceil(Math.random() * 4000000000);
        let clientCodec = packageCodecCreator.create();
        clientSocket = new net.Socket({allowHalfOpen: true});
        clientSocket.on('error', errorCode => this.m_reporter.report(REPORT_KEY, {step: 'clientConnectionFailed', errorCode, peerid, ip, port}));
        clientSocket.on('connect', () => {
            this.m_reporter.report(REPORT_KEY, {step: 'connect-succ', peerid, ip, port});
            setTimeout(() => {
                clientSocket.write(clientCodec.encode([{type: 'hello-req-s1-c', peerid, seq: clientSeq}]));
                clientSocket.end();                
            }, 10000);
        });

        clientSocket.on('data', data => {
            clientCodec.push(data);
            let pkgs = clientCodec.pop();
            for (let pkg of pkgs) {
                switch (pkg.type) {
                    case 'hello-resp-s1-c':
                        if (pkg.seq === clientSeq) {
                            this.m_reporter.report(REPORT_KEY, {step: 'client-resp', peerid, ip, port});
                        } else {
                            this.m_reporter.report(REPORT_KEY, {step: 'client-resp', seqError: 1, peerid, ip, port});
                        }

                        clientPromiseEvent.resolve();
                        break;
                    default:
                        this.m_reporter.report(REPORT_KEY, {step: 'unknown-pkg-client', peerid, ip, port});
                }
            }
        });

        clientSocket.connect(port, ip);

        // server2
        let server2Codec = packageCodecCreator.create();
        server2Socket = new net.Socket({allowHalfOpen: true});
        server2Socket.on('error', errorCode => this.m_reporter.report(REPORT_KEY, {step: 'server2ConnectionFailed', errorCode, peerid, ip, port}));
        server2Socket.on('connect', () => {
            this.m_reporter.report(REPORT_KEY, {step: 'connect-server2-succ', peerid, ip, port});
            server2Socket.write(server2Codec.encode([{type: 'hello-req-s1-s2', peerid, ip, port}]));
            server2Socket.end();
        });

        server2Socket.on('data', data => {
            server2Codec.push(data);
            let pkgs = server2Codec.pop();
            for (let pkg of pkgs) {
                switch (pkg.type) {
                    case 'hello-resp-s1-s2':
                        this.m_reporter.report(REPORT_KEY, {step: 'server2-resp', peerid, ip, port});
                        server2PromiseEvent.resolve();
                        break;
                    default:
                        // nothing
                        assert(false);
                }
            }
        });
        server2Socket.connect(DETECT_SERVER2.port, DETECT_SERVER2.address);

        let returnPromise = Promise.race([Promise.all([clientPromiseEvent.promise, server2PromiseEvent.promise]), timeoutPromise]);
        await returnPromise;

        clean();
    }
}

if (require.main === module) {
    const Reporter = require('./common/reporter.js');

    let reporter = new Reporter('bdttest.tinyappcloud.com', 11000, 's1', 0.0);
    let detectorServer1 = new TcpDetectorServer1(reporter);
    detectorServer1.start();
}