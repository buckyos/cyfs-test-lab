import { simulator, simulatorPath, DATA_PATH, CONFIG_PATH, LOG_PATH } from '../../config/zoneData';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as SysProcess from 'process';
import * as ChildProcess from 'child_process';
import * as os from 'os';
import assert  from 'assert';
import * as cyfs from 'cyfs-sdk';
import JSBI from 'jsbi';
import { TEST_DEC_ID } from "../../config/decApp"

let RequestorType:string
// non-stack本地提供的默认object http服务端口
const CYFS_RUNTIME_NON_STACK_HTTP_PORT: number = 1322;

// non-stack的本地web-socket服务端口
// TODO 目前tide+async_h1还不支持websocket协议，所以只能使用独立端口
const CYFS_RUNTIME_NON_STACK_WS_PORTT: number = 1323;

// non-stack本地提供的默认object http服务端口
const NON_STACK_HTTP_PORTT: number = 1318;

// non-stack的本地web-socket服务端口
// TODO 目前tide+async_h1还不支持websocket协议，所以只能使用独立端口
const NON_STACK_WS_PORTT: number = 1319;

/*async function conn_gateway(RequestorType:string){
let conn = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(NON_STACK_HTTP_PORTT, NON_STACK_WS_PORTT).unwrap();
if (RequestorType == "http" && RequestorType == undefined) {
    let http_param = cyfs.SharedCyfsStackParam.default_requestor_config();
    conn.requestor_config = http_param

}
else if (RequestorType == "ws") {
    let ws_param = cyfs.SharedCyfsStackParam.ws_requestor_config();
    conn.requestor_config = ws_param
}
let ood_stack = cyfs.SharedCyfsStack.open(conn);
let res = await ood_stack.wait_online(JSBI.BigInt(20000));

return [res,ood_stack]
}

async function conn_runtime(RequestorType:string){
    let conn = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(CYFS_RUNTIME_NON_STACK_HTTP_PORT, CYFS_RUNTIME_NON_STACK_WS_PORTT).unwrap();
    if (RequestorType == "http" && RequestorType == undefined) {
        let http_param = cyfs.SharedCyfsStackParam.default_requestor_config();
        conn.requestor_config = http_param
    
    }
    else if (RequestorType == "ws") {
        let ws_param = cyfs.SharedCyfsStackParam.ws_requestor_config();
        conn.requestor_config = ws_param
    }
    let ood_stack = cyfs.SharedCyfsStack.open(conn);
    let res = await ood_stack.wait_online(JSBI.BigInt(20000));
    return [res,ood_stack]
}*/


async function main(){

let gateway_conn = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(NON_STACK_HTTP_PORTT, NON_STACK_WS_PORTT).unwrap();
let runtime_conn = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(CYFS_RUNTIME_NON_STACK_HTTP_PORT, CYFS_RUNTIME_NON_STACK_WS_PORTT).unwrap();
let http_param = cyfs.SharedCyfsStackParam.default_requestor_config();

    gateway_conn.requestor_config = http_param
    let gateway_conn_ood_stack = cyfs.SharedCyfsStack.open(gateway_conn);
    await gateway_conn_ood_stack.online();

    runtime_conn.requestor_config = http_param
    let runtime_conn_ood_stack = cyfs.SharedCyfsStack.open(runtime_conn);
    await runtime_conn_ood_stack.online();
    //let res = conn_gateway("http")
    //let stack:cyfs.SharedCyfsStack = awaitres[0] as  cyfs.SharedCyfsStack
    console.log("gate_way_country",gateway_conn_ood_stack.local_device().desc().area()?.unwrap().country)
    console.log("runtime_country",runtime_conn_ood_stack.local_device().desc().area()?.unwrap().country)
    console.log("runtime root_state_access_mode",(await runtime_conn_ood_stack.util().get_device_static_info({ common: { "flags": 0 } })).unwrap().info.root_state_access_mode)
    console.log("runtime local_cache_access_mode",(await runtime_conn_ood_stack.util().get_device_static_info({ common: { "flags": 0 } })).unwrap().info.root_state_access_mode)
    console.log("gateway root_state_access_mode",(await gateway_conn_ood_stack.util().get_device_static_info({ common: { "flags": 0 } })).unwrap().info.root_state_access_mode)
    console.log("gateway local_cache_access_mode",(await gateway_conn_ood_stack.util().get_device_static_info({ common: { "flags": 0 } })).unwrap().info.root_state_access_mode)
    console.log("runtime sn_list",((await runtime_conn_ood_stack.util().get_device_static_info({ common: { "flags": 0 } })).unwrap().info.device.body().unwrap().content().sn_list().toString()))
    console.log("runtime sn_list",((await runtime_conn_ood_stack.util().get_device_static_info({ common: { "flags": 0 } })).unwrap().info.device.body().unwrap().content().sn_list().toString()))
    console.log("gateway sn_list",((await gateway_conn_ood_stack.util().get_device_static_info({ common: { "flags": 0 } })).unwrap().info.device.body().unwrap().content().sn_list().toString()))
    console.log("gateway sn_list",((await gateway_conn_ood_stack.util().get_device_static_info({ common: { "flags": 0 } })).unwrap().info.device.body().unwrap().content().sn_list().toString()))


}
main()