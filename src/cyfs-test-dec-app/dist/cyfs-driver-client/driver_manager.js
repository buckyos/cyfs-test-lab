"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CyfsStackDriverManager = void 0;
const cyfs_driver_1 = require("./cyfs_driver");
const proxy_driver_1 = require("./proxy/proxy_driver");
const simulator_driver_1 = require("./simulator/simulator_driver");
const bdt_driver_1 = require("./bdt_client/bdt_driver");
const common_1 = require("../common");
const path_1 = __importDefault(require("path"));
const cyfs_driver_config_1 = require("../config/cyfs_driver_config");
var date = require("silly-datetime");
class CyfsStackDriverManager {
    constructor(log_path) {
        this.stack_port_map = [];
        if (!log_path) {
            let date_info = date.format(new Date(), 'YYYY_MM_DD_HH_mm_ss');
            this.log_path = path_1.default.join(__dirname, "../", "blog", date_info);
        }
        else {
            this.log_path = log_path;
        }
    }
    static createInstance() {
        if (!CyfsStackDriverManager.manager) {
            CyfsStackDriverManager.manager = new CyfsStackDriverManager();
        }
        return CyfsStackDriverManager.manager;
    }
    async create_driver(type, agent_list) {
        console.info(`create cyfs stack test driver,type = ${type}`);
        let driver;
        if (type == cyfs_driver_1.CyfsDriverType.real_machine) {
            this.stack_port_map = cyfs_driver_config_1.REAL_MACHINE_LIST;
            driver = new proxy_driver_1.CyfsStackProxyDriver(this.log_path);
        }
        else if (type == cyfs_driver_1.CyfsDriverType.other) {
            this.stack_port_map = agent_list;
            driver = new proxy_driver_1.CyfsStackProxyDriver(this.log_path);
        }
        else if (type == cyfs_driver_1.CyfsDriverType.simulator) {
            this.stack_port_map = cyfs_driver_config_1.SIMULATOR_LIST;
            driver = new simulator_driver_1.CyfsStackSimulatorDriver(this.log_path);
        }
        else if (type == cyfs_driver_1.CyfsDriverType.bdt_client) {
            driver = new bdt_driver_1.BDTDriver(this.log_path);
        }
        else {
            return { err: common_1.ErrorCode.notFound, log: "Error yfsDriverType" };
        }
        console.info(`begin  driver.init `);
        await driver.init();
        console.info(`begin  driver.start `);
        await driver.start();
        console.info(`begin  driver.load_config `);
        await driver.load_config(agent_list);
        return { err: common_1.ErrorCode.succ, log: "success", driver };
    }
}
exports.CyfsStackDriverManager = CyfsStackDriverManager;
