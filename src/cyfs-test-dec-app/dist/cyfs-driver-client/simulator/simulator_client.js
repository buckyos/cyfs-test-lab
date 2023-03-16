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
exports.CyfsStackSimulatorClient = void 0;
const common_1 = require("../../common");
const local_util_tool_1 = require("./local_util_tool");
const path_1 = __importDefault(require("path"));
const fs = __importStar(require("fs-extra"));
class CyfsStackSimulatorClient {
    constructor(options, logger, cache_path) {
        this.peer_name = options.peer_name;
        this.stack_type = options.stack_type;
        this.zone_tag = options.zone_tag;
        this.ws_port = options.ws_port;
        this.http_port = options.http_port;
        this.bdt_port = options.bdt_port;
        this.cache_path = path_1.default.join(cache_path, this.peer_name);
        this.logger = logger;
        this.m_util_tool = new local_util_tool_1.LocalUtilTool(this.logger, this.cache_path);
    }
    get_util_tool() {
        this.logger.info(`CyfsStackSimulatorClient ${this.peer_name} get_util_tool`);
        return this.m_util_tool;
    }
    async init() {
        if (fs.pathExistsSync(this.cache_path)) {
            this.logger.info(`CyfsStackSimulatorClient ${this.peer_name} remove cache data`);
            //fs.removeSync(this.cache_path)
        }
        fs.mkdirpSync(this.cache_path);
        this.m_util_tool.init();
        return { err: common_1.ErrorCode.succ, log: "init client remove cache file" };
    }
}
exports.CyfsStackSimulatorClient = CyfsStackSimulatorClient;
