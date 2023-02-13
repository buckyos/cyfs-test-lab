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
exports.ProxyManager = exports.string_to_Uint8Array = exports.Uint8Array_to_string = void 0;
const base_1 = require("../../base");
const net = __importStar(require("net"));
const events_1 = require("events");
const util_1 = require("./util");
const path = __importStar(require("path"));
function Uint8Array_to_string(fileData) {
    var dataString = "";
    for (var i = 0; i < fileData.length; i++) {
        dataString += String.fromCharCode(fileData[i]);
    }
    return dataString;
}
exports.Uint8Array_to_string = Uint8Array_to_string;
function string_to_Uint8Array(str) {
    var arr = [];
    for (var i = 0, j = str.length; i < j; ++i) {
        arr.push(str.charCodeAt(i));
    }
    var tmpUint8Array = new Uint8Array(arr);
    return tmpUint8Array;
}
exports.string_to_Uint8Array = string_to_Uint8Array;
class ProxyManager extends events_1.EventEmitter {
    constructor(_interface) {
        super();
        this.m_interface = _interface;
        this.log = _interface.getLogger();
        this.cache_name = base_1.RandomGenerator.string(10);
        this.state = 0;
        this.socket_list = [];
        this.root = path.join(this.log.dir(), `../${this.cache_name}_cache`);
        this.util_tool = new util_1.UtilTool(_interface, this.log, this.root);
    }
    on(event, listener) {
        super.on(event, listener);
        return this;
    }
    once(event, listener) {
        super.once(event, listener);
        return this;
    }
    init(stack_type) {
        this.log.info(`init cyfs stack ProxyManager type =${stack_type}`);
        this.stack_type = stack_type;
        if (stack_type == "runtime") {
            this.stack_http_port = 1322;
            this.stack_ws_port = 1323;
        }
        else if (stack_type == "ood") {
            this.stack_http_port = 1318;
            this.stack_ws_port = 1319;
        }
        this.util_tool.init_cache();
        return { err: base_1.ErrorCode.succ, log: "start success", cache_name: this.cache_name };
    }
    async build_tunnel(type, remote_address, remote_port) {
        this.log.info(`#### build_tunnel ${type} ${remote_address} ${remote_port}`);
        let port = this.stack_ws_port;
        if (type == "http") {
            port = this.stack_http_port;
        }
        else if (type == "ws") {
            port = this.stack_ws_port;
        }
        return new Promise(async (resolve) => {
            try {
                let client = net.connect(port, "127.0.0.1", () => {
                    this.log.info(`${client.remoteAddress}_${client.remotePort} begin connect tcp 127.0.0.1:${port}`);
                    this.socket_list.push({
                        type,
                        remote_address,
                        remote_port,
                        socket: client,
                        seq: 0,
                        r_seq: 0,
                    });
                    let r_seq = 0;
                    client.setKeepAlive(true, 2000);
                    client.on('data', async (buf) => {
                        r_seq = r_seq + 1;
                        this.log.info(` ${this.cache_name} TCP Client ${port} resp stack data ${client.remoteAddress}:${client.remotePort},r_seq = ${r_seq}`);
                        let msg_u8 = buf;
                        let info = await this.m_interface.fireEvent(`${remote_address}_${remote_port}`, base_1.ErrorCode.succ, r_seq, Uint8Array_to_string(msg_u8));
                    });
                    client.on("error", async (err) => {
                        this.log.error(`net connect error ${err}`);
                        resolve({ err: base_1.ErrorCode.fail, log: `${err.message}` });
                    });
                    client.on("ready", async () => {
                        this.log.info(`net connect success ${client.remoteAddress}_${client.remotePort}`);
                        resolve({ err: base_1.ErrorCode.succ, log: `proxy client ${client.remoteAddress}_${client.remotePort}` });
                    });
                    client.on("connect", async () => {
                        this.log.info(`net connect success ${client.remoteAddress}_${client.remotePort}`);
                        resolve({ err: base_1.ErrorCode.succ, log: `proxy client ${client.remoteAddress}_${client.remotePort}` });
                    });
                });
            }
            catch (error) {
                resolve({ err: base_1.ErrorCode.exception, log: `${error}` });
            }
        });
    }
    async end_tunnel(type, remote_address, remote_port) {
        for (let i in this.socket_list) {
            if (this.socket_list[i].type == type && this.socket_list[i].remote_address == remote_address && this.socket_list[i].remote_port == remote_port) {
                this.socket_list[i].socket.end();
            }
        }
        return base_1.ErrorCode.notFound;
    }
    async proxy_data(type, remote_address, remote_port, seq, bytes) {
        this.log.info(`${type} ${remote_address} ${remote_port} recv proxy_data`);
        for (let i in this.socket_list) {
            if (this.socket_list[i].type == type && this.socket_list[i].remote_address == remote_address && this.socket_list[i].remote_port == remote_port) {
                this.socket_list[i].socket.write(string_to_Uint8Array(bytes.toString()));
            }
        }
        return base_1.ErrorCode.notFound;
    }
    async util_request(command) {
        return await this.util_tool.util_request(command);
    }
}
exports.ProxyManager = ProxyManager;
