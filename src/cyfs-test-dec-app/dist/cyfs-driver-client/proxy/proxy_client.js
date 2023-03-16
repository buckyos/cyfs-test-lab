"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CyfsStackProxyClient = exports.string_to_Uint8Array = exports.Uint8Array_to_string = void 0;
const common_1 = require("../../common");
const events_1 = require("events");
const net_1 = __importDefault(require("net"));
const proxy_util_tool_1 = require("./proxy_util_tool");
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
class CyfsStackProxyClient extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.peer_name = options.peer_name;
        this.m_interface = options._interface;
        this.stack_type = options.stack_type;
        this.timeout = options.timeout;
        this.logger = this.m_interface.getLogger();
        this.state = 0;
        this.ws_port = options.ws_port;
        this.http_port = options.http_port;
        this.ood_daemon_status_port = options.ood_daemon_status_port;
    }
    async init() {
        // 连接测试节点
        this.logger.info(`init driver client  ${this.peer_name} ${this.stack_type},ws =${this.ws_port} http =${this.http_port} ood_daemon_status_port = ${this.ood_daemon_status_port}`);
        this.state = 1;
        let agent = await this.m_interface.getAgent({}, [this.peer_name], [], [], this.timeout);
        if (agent.err || agent.agentid == undefined) {
            this.logger.error(`连接测试节点 ${this.peer_name}失败`);
            return { err: common_1.ErrorCode.connectProxyClientFailed, log: "连接测试节点失败" };
        }
        this.m_agentid = agent.agentid;
        // 测试节点启动测试服务     
        let err = await this.m_interface.startService([], this.m_agentid, this.timeout);
        if (err) {
            this.logger.error(`${this.peer_name} 测试节点启动服务失败`);
            return { err: common_1.ErrorCode.connectProxyClientFailed, log: "测试节点启动服务失败" };
        }
        let info = await this.m_interface.callApi('start_client', Buffer.from(''), { stack_type: this.stack_type }, this.m_agentid, 0);
        this.m_util_tool = new proxy_util_tool_1.ProxyUtilTool(this.m_interface, this.m_agentid, this.peer_name, info.value.cacheName);
        this.start_proxy("ws", this.ws_port);
        this.start_proxy("http", this.http_port);
        if (this.stack_type == "ood" && this.ood_daemon_status_port) {
            this.start_proxy("ood-daemon-status", this.ood_daemon_status_port);
        }
        this.state = 2;
        return { err: common_1.ErrorCode.succ, log: `${this.peer_name}启动成功` };
    }
    get_util_tool() {
        this.logger.info(`ProxyUtilTool ${this.peer_name} get_util_tool`);
        return this.m_util_tool;
    }
    async start_proxy(type, port) {
        this.logger.info(` ${this.peer_name} create proxy ${type} ${port}`);
        return new Promise(async (V) => {
            let timer = setTimeout(() => {
                this.logger.error(` ${this.peer_name} TCP Client start timeout`);
                V({ err: common_1.ErrorCode.timeout, log: `20s timeout` });
            }, 20 * 1000);
            let tcpServer = net_1.default.createServer(async (c) => {
                // 这个c 是上层业请求端
                this.logger.info(` ${this.peer_name} TCP Client ${port} connect ${c.remoteAddress}:${c.remotePort}`);
                // 创建tunnel
                let param = {
                    type,
                    remote_address: c.remoteAddress,
                    remote_port: c.remotePort
                };
                let info = await this.m_interface.callApi('build_tunnel', Buffer.from(""), param, this.m_agentid, 0);
                this.logger.info(`${this.peer_name} build_tunnel result = ${info}`);
                if (info.err || info.value.err) {
                    this.logger.error(`${this.peer_name} build_tunnel err = ${JSON.stringify(info)}`);
                    clearTimeout(timer);
                    V({ err: info.value.err, log: info.value.log });
                }
                // 添加保活探针
                c.setKeepAlive(true, 20 * 1000);
                // 监听测试框架事件，返回SDK 报文数据
                let recv_r_req = 0;
                let rnAccept = await this.m_interface.attachEvent(`${c.remoteAddress}_${c.remotePort}`, async (err, namespace, msg) => {
                    this.logger.info(` ${this.peer_name} TCP Client ${port} write msg ${c.remoteAddress}:${c.remotePort}`);
                    // 实现序列化发送, 返回给SDK
                    let msg_u8 = string_to_Uint8Array(msg);
                    c.write(msg_u8);
                }, this.m_agentid);
                //let seq = 0;
                c.on('data', async (buf) => {
                    //seq = seq + 1;
                    let param = {
                        //seq,
                        type,
                        remote_address: c.remoteAddress,
                        remote_port: c.remotePort
                    };
                    //if()
                    let msg_u8 = buf;
                    let data = Buffer.from(Uint8Array_to_string(msg_u8));
                    this.logger.info(` ${this.peer_name} TCP Client ${port} read data ${c.remoteAddress}:${c.remotePort} size = ${data.length}`);
                    if (data.length < 30000) {
                        let info = await this.m_interface.callApi('proxy_data', data, param, this.m_agentid, 0);
                    }
                    else {
                        let data1 = data.buffer.slice(0, 30000);
                        let data2 = data.buffer.slice(30000);
                        let info1 = await this.m_interface.callApi('proxy_data', Buffer.from(data1), param, this.m_agentid, 0);
                        let info2 = await this.m_interface.callApi('proxy_data', Buffer.from(data2), param, this.m_agentid, 0);
                    }
                    //console.info(` ${this.peer_name} TCP Client ${port} read data ${c.remoteAddress}:${c.remotePort} size = ${data.length}`);
                    //console.info(` ${this.peer_name} TCP Client data = ${data}`);
                });
                c.on("end", async () => {
                    let info = await this.m_interface.callApi('end_tunnel', Buffer.from(""), param, this.m_agentid, 0);
                });
                c.on('error', async (err) => {
                    this.logger.info(`${this.peer_name} client ${port} proxy error ${err}`);
                    await this.m_interface.detachEvent(`${c.remoteAddress}_${c.remotePort}`, rnAccept.cookie);
                    this.state = -1;
                });
            });
            tcpServer.listen({ host: "127.0.0.1", port, }, () => {
                this.logger.info(`${this.peer_name} TCP Server start`);
                clearTimeout(timer);
                V({ err: common_1.ErrorCode.succ, log: `start proxy success` });
            });
        });
    }
}
exports.CyfsStackProxyClient = CyfsStackProxyClient;
