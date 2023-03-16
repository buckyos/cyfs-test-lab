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
const common_1 = require("../common");
const cyfs = __importStar(require("../cyfs"));
const check_cmd = __importStar(require("./check_cmd"));
const common_handler_1 = require("./common_handler");
var date = require("silly-datetime");
const APP_NAME = "cyfs-test-dec-app";
//const DEC_ID_BASE58 = cyfs.ObjectId.from_base_58("9tGpLNnTB2xMC9K67y26fd4XzCoVDEEtBsdCweEAPbe7").unwrap()
const DEC_ID_BASE58 = "9tGpLNndR5tyui8DkYBpEz8mFHzjfqkCVmsFusa5roHd";
// 这里是Service的入口
async function main() {
    cyfs.clog.enable_file_log({
        name: APP_NAME,
        dir: cyfs.get_app_log_dir(APP_NAME),
    });
    console.info('test app entry, DEC_ID = ', DEC_ID_BASE58);
    // 利用check_cmd_and_exec来确保进程提供正确的运行互斥和App Manager需要的功能
    // 这个name最好用DECId的字符串，避免和其他App进程冲突
    const install = check_cmd.check_cmd_and_exec(DEC_ID_BASE58);
    if (install) {
        process.exit(0);
    }
    // 如果执行node service.js --start
    // let stack = cyfs.SharedCyfsStack.open_runtime(cyfs.ObjectId.from_base_58(DEC_ID_BASE58).unwrap());
    let stack = cyfs.SharedCyfsStack.open_default(cyfs.ObjectId.from_base_58(DEC_ID_BASE58).unwrap());
    let check_online = await stack.wait_online();
    // 运行一个性能上报程序，目前只能公司内网接收
    console.log(`local device system ${process.platform}`);
    // let exe_path = path.join(__dirname,"perf-report-tool")
    // if(process.platform=="win32"){
    //     exe_path = path.join(__dirname,"perf-report-tool.exe")
    // }
    // let report_process =  ChildProcess.spawn(exe_path, [], {  detached: true, windowsHide: true })
    // report_process.on("error",(err)=>{
    //     console.error(`report_process error :`,err)
    //     process.exit(0);
    // })
    // report_process.on("exit",(err)=>{
    //     console.error(`report_process exit :`,err)
    //     process.exit(0);
    // })
    let logger = new common_1.Logger(cyfs.clog.info, cyfs.clog.debug, cyfs.clog.error, cyfs.get_app_log_dir(APP_NAME));
    logger.info(`init cyfs stack manager log success`);
    let result = await stack.router_handlers().add_post_object_handler(cyfs.RouterHandlerChain.Handler, `CommonPostObjectHandler_${Date.now()}`, 0, undefined, "QATest", cyfs.RouterHandlerAction.Default, new common_handler_1.CommonPostObjectHandler(stack, { peer_name: stack.local_device_id().to_base_58(), type: cyfs.CyfsStackRequestorType.Http }, logger));
}
main();
