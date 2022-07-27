const net = require('net');
const EventEmitter = require('events');
const base = require('./agent_master/common/base');

class Connection extends EventEmitter {
    constructor(packageCodec, socket) {
        super();
        
        this.m_packageCodec = packageCodec;
        this.m_socket = socket;
        this.m_remoteId = `${socket.remoteAddress}:${socket.remotePort}`;
        this.m_pkgs = [];
        this.m_drainListener = null;
        this.m_pendingPkgsLimit = 0;
    }

    set pendingPkgsLimit(limit) {
        this.m_pendingPkgsLimit = limit;
    }

    get remote() {
        if (this.m_socket) {
            return {
                ip: this.m_socket.remoteAddress,
                port: this.m_socket.remotePort,
            };
        }
        return null;
    }

    start() {
        const address = this.m_socket.address;
        let socket = this.m_socket;
        const clean = (errorCode) => {
            if (socket) {
                socket.removeAllListeners();
                socket = null;
            }

            if (this.m_socket) {
                this.m_socket = null;
            }

            this.m_drainListener = null;
            this.m_pkgs = [];

            if (errorCode) {
                base.blog.warn("Client(", this.m_remoteId, ") exception occured: errorCode is ", errorCode);
                this.emit('error', errorCode);
            } else {
                base.blog.info("Client(", this.m_remoteId, ") closed");
                this.emit('close');
            }
        }

        this.m_socket.once('end', () => {
            if (this.m_socket) {
                this.m_socket.end();
                this.m_socket = null;
            }
        });
        this.m_socket.once('close', () => clean());
        this.m_socket.once('error', clean);
        this.m_socket.once('timeout', () => {
            if (this.m_socket) {
                this.m_socket.end();
                this.m_socket = null;
            }
        });

        this.m_socket.on('data', (buffer) => {
            const result = this.m_packageCodec.push(buffer);
            if (result != ErrorCode.success && result != ErrorCode.pending) {
                base.blog.warn("Client(", this.m_remoteId, ") got unknown package");
                this.emit('error', ErrorCode.unknownPakage);
                return;
            }

            let pkgs = this.m_packageCodec.pop();
            if (pkgs && pkgs.length) {
                this.emit('packages', pkgs);
            }
        })
    }

    close() {
        if (this.m_socket) {
            this.m_socket.destroy();
            this.m_socket = null;
        }
    }

    send(pkgs) {
        if (!Array.isArray(pkgs)) {
            pkgs = [pkgs];
        }

        if (this.m_drainListener) {
            if (this.m_pendingPkgsLimit > 0 && this.m_pkgs.length > this.m_pendingPkgsLimit) {
                return ErrorCode.outLimit;
            }
            this.m_pkgs = this.m_pkgs.concat(pkgs);
            return ErrorCode.pending;
        }

        const buffer = this.m_packageCodec.encode(pkgs);
        if (!buffer) {
            return ErrorCode.unknownPakage;
        }

        if (!this.m_socket.write(buffer)) {
            this.m_drainListener = () => {
                this.m_drainListener = null;
                if (this.m_pkgs && this.m_pkgs.length > 0) {
                    let pkgs = this.m_pkgs;
                    this.m_pkgs = [];
                    this.send(pkgs);
                }
            };
            this.m_socket.once('drain', this.m_drainListener);
        }

        return ErrorCode.success;
    }

    setTimeout(timeout) {
        if (this.m_socket) {
            this.m_socket.setTimeout(timeout);
        }
    }
}

class TcpServer extends EventEmitter {
    constructor(packageCodecCreator, port, ip = '0.0.0.0') {
        super();

        this.m_packageCodecCreator = packageCodecCreator;
        this.m_port = port;
        this.m_ip = ip;
        this.m_serverSocket = null;
    }

    async start() {
        this.m_serverSocket = net.createServer();

        if (!this.m_serverSocket) {
            base.blog.error('TcpServer start failed for "net.createServer failed".');
            return ErrorCode.failed;
        }

        const clean = (errorCode) => {
            this.m_serverSocket.removeAllListeners();
            this.m_serverSocket = null;

            if (errorCode) {
                base.blog.error("TcpServer exception occured: errorCode is ", errorCode);
                this.emit('error', errorCode);
            } else {
                base.blog.info("TcpServer closed.");
                this.emit('close');
            }
        };

        this.m_serverSocket.once('close', clean);
        this.m_serverSocket.once('error', clean);
        this.m_serverSocket.on('connection', clientSocket => {
            let codec = this.m_packageCodecCreator.create();
            let connection = new Connection(codec, clientSocket);
            this.emit('connection', connection);
        });

        return new Promise((resolve, reject) => {
            const options = {
                port: this.m_port,
                host: this.m_ip,
                backlog: 10240,
            };
            this.m_serverSocket.listen(options, () => {
                this.m_port = this.m_serverSocket.address().port;
                base.blog.info("TcpServer start: ip is ", this.m_ip, ", port is ", this.m_port);
                resolve(ErrorCode.success);
            });
        })
    }

    stop() {
        if (this.m_serverSocket) {
            this.m_serverSocket.close();
            this.m_serverSocket = null;
        }
    }

    get ip() {
        return this.m_ip;
    }

    get port() {
        return this.m_port;
    }
}

const ErrorCode = {
    success: 0,
    failed: 1,
    pending: 2,
    unknownPakage: 3,
    outLimit: 4,
    timeout: 5,
};

/**
 * 以下是协议包编解码器的空实现原型，主要起接口实例作用，不具有任何功能意义，只要是实现了这些接口的对象就好，不一定需要继承
 */
class PackageCodec {
    constructor() {
        if (new.target === PackageCodec) {
            throw new Error('PackageCodec is a base class, it must be extended.');
        }

    }

    push(buffer) {
        throw new Error('you should override the function "PackageCodec.push".');
        // const unknownPakage = false; // unknown package
        // const pending = false; // need more
        // const success = false; // at least one package parsed success
        return ErrorCode.unknownPakage || ErrorCode.pending || ErrorCode.success;
    }

    pop() {
        throw new Error('you should override the function "PackageCodec.pop".');
        const pkgs = [];
        return pkgs;
    }

    encode(pkgs) { // []
        throw new Error('you should override the function "PackageCodec.encode".');
        return buffer;
    }
}

class PackageCodecCreator {
    constructor() {
        if (new.target === PackageCodecCreator) {
            throw new Error('PackageCodecCreator is a base class, it must be extended.');
        }

    }

    create() {
        throw new Error('you should override the function "PackageCodecCreator.create".');
        return new PackageCodec();
    }
}

module.exports = {
    TcpServer,
    ErrorCode,
    PackageCodecCreator,
    PackageCodec,
};