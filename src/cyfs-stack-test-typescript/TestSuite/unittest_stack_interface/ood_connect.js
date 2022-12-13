"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var cyfs = require("cyfs-sdk");
var RequestorType;
// non-stack本地提供的默认object http服务端口
var CYFS_RUNTIME_NON_STACK_HTTP_PORT = 1322;
// non-stack的本地web-socket服务端口
// TODO 目前tide+async_h1还不支持websocket协议，所以只能使用独立端口
var CYFS_RUNTIME_NON_STACK_WS_PORTT = 1323;
// non-stack本地提供的默认object http服务端口
var NON_STACK_HTTP_PORTT = 1318;
// non-stack的本地web-socket服务端口
// TODO 目前tide+async_h1还不支持websocket协议，所以只能使用独立端口
var NON_STACK_WS_PORTT = 1319;
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
function main() {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function () {
        var gateway_conn, runtime_conn, http_param, gateway_conn_ood_stack, runtime_conn_ood_stack, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1;
        return __generator(this, function (_2) {
            switch (_2.label) {
                case 0:
                    gateway_conn = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(NON_STACK_HTTP_PORTT, NON_STACK_WS_PORTT).unwrap();
                    runtime_conn = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(CYFS_RUNTIME_NON_STACK_HTTP_PORT, CYFS_RUNTIME_NON_STACK_WS_PORTT).unwrap();
                    http_param = cyfs.SharedCyfsStackParam.default_requestor_config();
                    gateway_conn.requestor_config = http_param;
                    gateway_conn_ood_stack = cyfs.SharedCyfsStack.open(gateway_conn);
                    return [4 /*yield*/, gateway_conn_ood_stack.online()];
                case 1:
                    _2.sent();
                    runtime_conn.requestor_config = http_param;
                    runtime_conn_ood_stack = cyfs.SharedCyfsStack.open(runtime_conn);
                    return [4 /*yield*/, runtime_conn_ood_stack.online()];
                case 2:
                    _2.sent();
                    //let res = conn_gateway("http")
                    //let stack:cyfs.SharedCyfsStack = awaitres[0] as  cyfs.SharedCyfsStack
                    console.log("gate_way_country", (_a = gateway_conn_ood_stack.local_device().desc().area()) === null || _a === void 0 ? void 0 : _a.unwrap().country);
                    console.log("runtime_country", (_b = runtime_conn_ood_stack.local_device().desc().area()) === null || _b === void 0 ? void 0 : _b.unwrap().country);
                    _d = (_c = console).log;
                    _e = ["runtime root_state_access_mode"];
                    return [4 /*yield*/, runtime_conn_ood_stack.util().get_device_static_info({ common: { "flags": 0 } })];
                case 3:
                    _d.apply(_c, _e.concat([(_2.sent()).unwrap().info.root_state_access_mode]));
                    _g = (_f = console).log;
                    _h = ["runtime local_cache_access_mode"];
                    return [4 /*yield*/, runtime_conn_ood_stack.util().get_device_static_info({ common: { "flags": 0 } })];
                case 4:
                    _g.apply(_f, _h.concat([(_2.sent()).unwrap().info.root_state_access_mode]));
                    _k = (_j = console).log;
                    _l = ["gateway root_state_access_mode"];
                    return [4 /*yield*/, gateway_conn_ood_stack.util().get_device_static_info({ common: { "flags": 0 } })];
                case 5:
                    _k.apply(_j, _l.concat([(_2.sent()).unwrap().info.root_state_access_mode]));
                    _o = (_m = console).log;
                    _p = ["gateway local_cache_access_mode"];
                    return [4 /*yield*/, gateway_conn_ood_stack.util().get_device_static_info({ common: { "flags": 0 } })];
                case 6:
                    _o.apply(_m, _p.concat([(_2.sent()).unwrap().info.root_state_access_mode]));
                    _r = (_q = console).log;
                    _s = ["runtime sn_list"];
                    return [4 /*yield*/, runtime_conn_ood_stack.util().get_device_static_info({ common: { "flags": 0 } })];
                case 7:
                    _r.apply(_q, _s.concat([((_2.sent()).unwrap().info.device.body().unwrap().content().sn_list().toString())]));
                    _u = (_t = console).log;
                    _v = ["runtime sn_list"];
                    return [4 /*yield*/, runtime_conn_ood_stack.util().get_device_static_info({ common: { "flags": 0 } })];
                case 8:
                    _u.apply(_t, _v.concat([((_2.sent()).unwrap().info.device.body().unwrap().content().sn_list().toString())]));
                    _x = (_w = console).log;
                    _y = ["gateway sn_list"];
                    return [4 /*yield*/, gateway_conn_ood_stack.util().get_device_static_info({ common: { "flags": 0 } })];
                case 9:
                    _x.apply(_w, _y.concat([((_2.sent()).unwrap().info.device.body().unwrap().content().sn_list().toString())]));
                    _0 = (_z = console).log;
                    _1 = ["gateway sn_list"];
                    return [4 /*yield*/, gateway_conn_ood_stack.util().get_device_static_info({ common: { "flags": 0 } })];
                case 10:
                    _0.apply(_z, _1.concat([((_2.sent()).unwrap().info.device.body().unwrap().content().sn_list().toString())]));
                    return [2 /*return*/];
            }
        });
    });
}
main();
