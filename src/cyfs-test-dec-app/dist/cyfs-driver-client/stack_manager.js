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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StackManager = void 0;
const driver_manager_1 = require("./driver_manager");
const cyfs_driver_1 = require("./cyfs_driver");
const cyfs_driver_config_1 = require("../config/cyfs_driver_config");
const cyfs = __importStar(require("../cyfs"));
const common_1 = require("../common");
var date = require("silly-datetime");
const path_1 = __importDefault(require("path"));
const fs = __importStar(require("fs-extra"));
class StackManager {
    constructor(driver_type, agent_list) {
        this.peer_map = new Map();
        if (!driver_type) {
            // 不指定使用配置文件
            if (cyfs_driver_config_1.DRIVER_TYPE == cyfs_driver_1.CyfsDriverType.real_machine.toString()) {
                this.driver_type = cyfs_driver_1.CyfsDriverType.real_machine;
                this.agent_list = cyfs_driver_config_1.REAL_MACHINE_LIST;
            }
            else if (cyfs_driver_config_1.DRIVER_TYPE == cyfs_driver_1.CyfsDriverType.simulator.toString()) {
                this.driver_type = cyfs_driver_1.CyfsDriverType.simulator;
                this.agent_list = cyfs_driver_config_1.SIMULATOR_LIST;
            }
            else if (cyfs_driver_config_1.DRIVER_TYPE == cyfs_driver_1.CyfsDriverType.other.toString()) {
                this.driver_type = cyfs_driver_1.CyfsDriverType.other;
                this.agent_list = agent_list;
            }
            else {
                // 默认使用模拟器
                this.driver_type = cyfs_driver_1.CyfsDriverType.simulator;
                this.agent_list = cyfs_driver_config_1.SIMULATOR_LIST;
            }
        }
        else {
            this.driver_type = driver_type;
            this.agent_list = agent_list;
        }
    }
    //单例模式
    static createInstance(driver_type, agent_list) {
        if (!StackManager.manager) {
            StackManager.manager = new StackManager(driver_type, agent_list);
        }
        return StackManager.manager;
    }
    get_logger() {
        return this.logger;
    }
    async init() {
        // 初始化测试驱动
        let date_info = date.format(new Date(), 'YYYY_MM_DD_HH_mm_ss');
        let log_dir = path_1.default.join(__dirname, "../", "blog", date_info);
        if (!fs.pathExistsSync(log_dir)) {
            fs.mkdirpSync(log_dir);
        }
        cyfs.clog.enable_file_log({
            name: "cyfs_stack",
            dir: log_dir,
            file_max_size: 1024 * 1024 * 10,
            file_max_count: 10,
        });
        this.logger = new common_1.Logger(cyfs.clog.info, cyfs.clog.debug, cyfs.clog.error, log_dir);
        this.logger.info(`init cyfs stack manager log success`);
        this.driver_manager = driver_manager_1.CyfsStackDriverManager.createInstance();
        let result = await this.driver_manager.create_driver(this.driver_type, this.agent_list);
        if (result.err) {
            this.logger.info(`${this.driver_type} create error,result = ${result}`);
            return result;
        }
        this.driver = result.driver;
        return result;
    }
    async load_config_stack(requestor_type = cyfs.CyfsStackRequestorType.Http, dec_id) {
        if (this.driver_type == cyfs_driver_1.CyfsDriverType.real_machine) {
            await this.load_real_machine(requestor_type, dec_id);
        }
        else if (this.driver_type == cyfs_driver_1.CyfsDriverType.simulator) {
            await this.load_simulator(requestor_type, dec_id);
        }
        else if (this.driver_type == cyfs_driver_1.CyfsDriverType.other) {
            await this.load_driver_manager(requestor_type, dec_id);
        }
        return await this.check_stack_online();
    }
    async check_stack_online() {
        return new Promise(async (V) => {
            this.logger.info(`######## cyfs satck check online running`);
            let running = true;
            setTimeout(async () => {
                if (running) {
                    this.logger.error(`######## check_stack_online timeout`);
                    V({ err: common_1.ErrorCode.cyfsStackOnlineTimeout, log: "cyfs satck online timeout" });
                }
            }, 20000);
            let check_list = [];
            for (let peer of this.peer_map.values()) {
                for (let stack of peer.values()) {
                    check_list.push(stack.wait_online());
                }
            }
            for (let check of check_list) {
                let result = await check;
                if (result.err) {
                    running = false;
                    this.logger.error(`######## cyfs satck check online fail,result = ${JSON.stringify(result)}`);
                    V({ err: common_1.ErrorCode.cyfsStackOnlineFailed, log: "cyfs satck online failed" });
                }
            }
            running = false;
            this.logger.info(`######## cyfs satck check online sucesss`);
            V({ err: common_1.ErrorCode.succ, log: "success" });
        });
    }
    async load_real_machine(requestor_type, dec_id) {
        for (let agent of cyfs_driver_config_1.REAL_MACHINE_LIST) {
            this.logger.info(`${agent.peer_name} open bdt satck type = ${requestor_type} dec_id = ${dec_id}`);
            let stack_param = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(agent.http_port, agent.ws_port, dec_id).unwrap();
            if (requestor_type == cyfs.CyfsStackRequestorType.WebSocket) {
                let ws_param = cyfs.SharedCyfsStackParam.ws_requestor_config();
                stack_param.requestor_config = ws_param;
            }
            let stack_map = new Map();
            if (this.peer_map.has(agent.peer_name)) {
                stack_map = this.peer_map.get(agent.peer_name);
            }
            else {
                this.peer_map.set(agent.peer_name, stack_map);
            }
            let stack = cyfs.SharedCyfsStack.open(stack_param);
            if (dec_id) {
                stack_map.set(`${dec_id.to_base_58()}_${requestor_type}`, stack);
            }
            else {
                stack_map.set(`system_${cyfs.CyfsStackRequestorType}`, stack);
            }
        }
    }
    async load_driver_manager(requestor_type, dec_id) {
        for (let agent of this.driver_manager.stack_port_map) {
            this.logger.info(`${agent.peer_name} open bdt satck type = ${requestor_type} dec_id = ${dec_id}`);
            let stack_param = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(agent.http_port, agent.ws_port, dec_id).unwrap();
            if (requestor_type == cyfs.CyfsStackRequestorType.WebSocket) {
                let ws_param = cyfs.SharedCyfsStackParam.ws_requestor_config();
                stack_param.requestor_config = ws_param;
            }
            let stack_map = new Map();
            if (this.peer_map.has(agent.peer_name)) {
                stack_map = this.peer_map.get(agent.peer_name);
            }
            else {
                this.peer_map.set(agent.peer_name, stack_map);
            }
            let stack = cyfs.SharedCyfsStack.open(stack_param);
            if (dec_id) {
                stack_map.set(`${dec_id.to_base_58()}_${requestor_type}`, stack);
            }
            else {
                stack_map.set(`system_${cyfs.CyfsStackRequestorType}`, stack);
            }
        }
    }
    async load_simulator(requestor_type, dec_id) {
        for (let agent of cyfs_driver_config_1.SIMULATOR_LIST) {
            this.logger.info(`${agent.peer_name} open bdt satck type = ${requestor_type} dec_id = ${dec_id}`);
            let stack_param = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(agent.http_port, agent.ws_port, dec_id).unwrap();
            if (requestor_type == cyfs.CyfsStackRequestorType.WebSocket) {
                let ws_param = cyfs.SharedCyfsStackParam.ws_requestor_config();
                stack_param.requestor_config = ws_param;
            }
            let stack_map = new Map();
            if (this.peer_map.has(agent.peer_name)) {
                stack_map = this.peer_map.get(agent.peer_name);
            }
            else {
                this.peer_map.set(agent.peer_name, stack_map);
            }
            let stack = cyfs.SharedCyfsStack.open(stack_param);
            if (dec_id) {
                stack_map.set(`${dec_id.to_base_58()}_${requestor_type}`, stack);
            }
            else {
                stack_map.set(`system_${cyfs.CyfsStackRequestorType}`, stack);
            }
        }
    }
    get_cyfs_satck(local) {
        if (!this.peer_map.has(local.peer_name)) {
            return { err: common_1.ErrorCode.notFound, log: `error peer name ${local.peer_name}` };
        }
        if (!this.peer_map.get(local.peer_name).has(`${local.dec_id}_${local.type}`)) {
            return { err: common_1.ErrorCode.notFound, log: `error dec_id dec_id =  ${local.dec_id},type = ${local.type}` };
        }
        this.logger.info(`get satck ${local.peer_name} success,dec_id = ${local.dec_id} type = ${local.type}`);
        return { err: common_1.ErrorCode.succ, log: `get cyfs stack success`, stack: this.peer_map.get(local.peer_name).get(`${local.dec_id}_${local.type}`) };
    }
    get_device_id(local) {
        if (!this.peer_map.has(local.peer_name)) {
            return { err: common_1.ErrorCode.notFound, log: `error peer name ${local.peer_name}` };
        }
        if (!this.peer_map.get(local.peer_name).has(`${local.dec_id}_${local.type}`)) {
            return { err: common_1.ErrorCode.notFound, log: `error dec_id dec_id =  ${local.dec_id},type = ${local.type}` };
        }
        let device_id = this.peer_map.get(local.peer_name).get(`${local.dec_id}_${local.type}`).local_device_id();
        return { err: common_1.ErrorCode.succ, log: `get cyfs stack device_id success`, device_id };
    }
    destory() {
        this.logger.info(`cyfs satck manager destory all cyfs stack`);
        for (let peer of this.peer_map.values()) {
            for (let stack of peer.values()) {
                stack = undefined;
            }
        }
        this.peer_map.clear();
    }
}
exports.StackManager = StackManager;
