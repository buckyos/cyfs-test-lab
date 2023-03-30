"use strict";
import {Logger} from "../common"
import * as cyfs from '../cyfs';
import {DEC_APP} from '../cyfs';
import * as check_cmd from './check_cmd';
import { CommonPostObjectHandler } from "./common_handler"
import {CustumObjectType} from "../dec-app-base"
var date = require("silly-datetime");
import { assert } from 'console';
import * as path from "path"
import * as fs from "fs-extra"
import * as ChildProcess from 'child_process';
const APP_NAME = "cyfs-test-dec-app";
//const DEC_ID_BASE58 = cyfs.ObjectId.from_base_58("9tGpLNnTB2xMC9K67y26fd4XzCoVDEEtBsdCweEAPbe7").unwrap()
//const DEC_ID_BASE58 = "9tGpLNndR5tyui8DkYBpEz8mFHzjfqkCVmsFusa5roHd"
// 这里是Service的入口
async function main() {
    cyfs.clog.enable_file_log({
        name: APP_NAME,
        dir: cyfs.get_app_log_dir(DEC_APP),
    });
    console.info('test app entry, DEC_ID = ', DEC_APP);

    // 利用check_cmd_and_exec来确保进程提供正确的运行互斥和App Manager需要的功能
    // 这个name最好用DECId的字符串，避免和其他App进程冲突
    const install = check_cmd.check_cmd_and_exec(DEC_APP);
    if (install) {
        process.exit(0);
    }
    // 如果执行node service.js --start
    // let stack = cyfs.SharedCyfsStack.open_runtime(cyfs.ObjectId.from_base_58(DEC_ID_BASE58).unwrap());
    let stack = cyfs.SharedCyfsStack.open_default_with_ws_event(cyfs.ObjectId.from_base_58(DEC_APP).unwrap());
    let check_online = await stack.wait_online();
    // 运行一个性能上报程序，目前只能公司内网接收
    console.log(`local device system ${process.platform}`)
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
    let logger = new Logger(cyfs.clog.info, cyfs.clog.debug, cyfs.clog.error, cyfs.get_app_log_dir(APP_NAME))
    logger.info(`init cyfs stack manager log success`);
    let req_path = new cyfs.RequestGlobalStatePath(stack.dec_id, "QATest").toString()
    let result = await stack.router_handlers().add_post_object_handler(
        cyfs.RouterHandlerChain.Handler,
        `CommonPostObjectHandler_00001`,
        0,
        `obj_type == ${CustumObjectType.HandlerRequest}`,
        req_path,
        cyfs.RouterHandlerAction.Default,
        new CommonPostObjectHandler(stack, { peer_name: stack.local_device_id().to_base_58(), type: cyfs.CyfsStackRequestorType.Http }, logger)
    );
    if(result.err){
        logger.error(`add_post_object_handler error = ${result.val.msg} `);
    }
    logger.info(`init cyfs stack manager log success`);
    while(true){
        await cyfs.sleep(60*1000);
        logger.info(`dec app service is running`);
    }
    
}

main();