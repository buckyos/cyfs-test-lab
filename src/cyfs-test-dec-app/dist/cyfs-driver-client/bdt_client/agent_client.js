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
exports.AgentClient = void 0;
const common_1 = require("../../common");
const labAgent_1 = require("./labAgent");
const type_1 = require("./type");
const bdt_client_1 = require("./bdt_client");
const myconfig = __importStar(require("./config"));
var date = require("silly-datetime");
class AgentClient {
    constructor(_interface, agent) {
        this.m_interface = _interface;
        this.logger = _interface.getLogger();
        this.tags = agent.tags[0];
        this.agentInfo = agent;
        this.bdtPeerMap = new Map();
        this.agentMult = 0;
        this.is_run = false;
        this.state = 0;
        this.running_device = [];
        this.is_report_perf = false;
    }
    async init() {
        return new Promise(async (V) => {
            setTimeout(() => {
                if (this.state == 0) {
                    V({ err: type_1.BDTERROR.timeout, log: `${this.tags} init client timeout` });
                }
            }, 20 * 1000);
            let agent = await this.m_interface.getAgent({}, [this.tags], [], [], 10 * 1000);
            if (agent.err || agent.agentid == undefined) {
                V({ err: common_1.ErrorCode.netError, log: `${this.tags} connect bdt agent failed` });
            }
            this.m_agentid = agent.agentid;
            //启动测试服务
            let err = await this.m_interface.startService([], this.m_agentid, 10 * 1000);
            if (err) {
                V({ err: common_1.ErrorCode.netError, log: `${this.tags} start agen Servicet failed` });
            }
            await common_1.sleep(5000);
            let IPInfo = await this.m_interface.callApi('utilRequest', Buffer.from(''), {
                name: "getIPInfo"
            }, this.m_agentid, 10 * 1000);
            this.logger.info(`${this.tags} get ipinfo = ${JSON.stringify(IPInfo)}`);
            if (IPInfo.err || IPInfo.value.ipInfo.IPv4 == undefined || IPInfo.value.ipInfo.IPv6 == undefined) {
                V({ err: common_1.ErrorCode.exception, log: `${this.tags} get ipinfo failed` });
            }
            this.ipInfo = IPInfo.value.ipInfo;
            this.state = 1;
            V({ err: common_1.ErrorCode.succ, log: `${this.tags} get ipinfo success` });
        });
    }
    get_util_tool() {
        return this.util_client;
    }
    async start_bdt_Client(config, local, bdt_port = 50000) {
        if (myconfig.AgentConcurrencyIgnoreWAN && this.agentMult > 0 && this.agentInfo.NAT == 0) {
            this.logger.error(`${this.tags} Perf test WAN agent Ignore WAN Concurrency BDT client`);
            return { err: type_1.BDTERROR.success, log: "Perf test WAN agent Ignore WAN Concurrency BDT client" };
        }
        let peer = await labAgent_1.InitBdtPeerClientData(this.agentInfo, config);
        peer.bdt_port = bdt_port;
        this.bdt_port = bdt_port;
        let bdtClient = new bdt_client_1.BdtPeerClient(this.m_interface, this.m_agentid, this.tags, peer);
        if (local) {
            bdtClient.cache_peer_info.local = this.tags;
            bdtClient.cache_peer_info.device_tag = local.split(".")[0];
            this.running_device.push(local);
        }
        let result = await bdtClient.init(this.agentMult);
        if (result.err) {
            this.logger.error(`${this.tags} init bdt client faild port = ${bdt_port}`);
            return result;
        }
        this.agentMult = this.agentMult + 1;
        this.logger.info(`${this.tags} add a new bdt client, agentMult = ${this.agentMult}`);
        this.bdtPeerMap.set(`${this.agentMult}`, bdtClient);
        return { err: result.err, log: result.log, bdtClient, online_time: bdtClient.online_time };
    }
    async get_bdt_client(index) {
        this.is_run = true;
        if (!this.bdtPeerMap.has(index)) {
            return { err: type_1.BDTERROR.AgentError, log: `${this.tags} ${index} not exsit` };
        }
        let bdtClient = this.bdtPeerMap.get(index);
        if (bdtClient.state < -1) {
            return { err: type_1.BDTERROR.AgentError, log: `${this.tags} ${index} state error,state = ${bdtClient.state}` };
        }
        return { err: type_1.BDTERROR.success, log: `${this.tags} ${index} get success`, bdtClient };
    }
}
exports.AgentClient = AgentClient;
