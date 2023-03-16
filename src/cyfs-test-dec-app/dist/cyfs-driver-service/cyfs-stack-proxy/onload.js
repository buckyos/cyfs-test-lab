"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceMain = void 0;
const common_1 = require("../../common");
const proxyManager_1 = require("./proxyManager");
async function ServiceMain(_interface) {
    _interface.getLogger().info(`=========start service namespace=${JSON.stringify(_interface.getNamespace())}`);
    let manager = new proxyManager_1.ProxyManager(_interface);
    _interface.registerApi('start_client', async (from, bytes, param) => {
        _interface.getLogger().debug(`remote call start_client,cyfs stack proxy will be inited`);
        let start_info = await manager.init(param.stack_type);
        return { err: start_info.err, bytes: Buffer.from(''), value: start_info };
    });
    _interface.registerApi('proxy_data', async (from, bytes, param) => {
        _interface.getLogger().debug(`remote call proxy_data,${JSON.stringify(param)}`);
        let result = await manager.proxy_data(param.type, param.remote_address, param.remote_port, param.seq, bytes);
        return { err: common_1.ErrorCode.succ, bytes: Buffer.from(''), value: result };
    });
    _interface.registerApi('build_tunnel', async (from, bytes, param) => {
        _interface.getLogger().debug(`remote call proxy_data,${JSON.stringify(param)}`);
        let result = await manager.build_tunnel(param.type, param.remote_address, param.remote_port);
        return { err: common_1.ErrorCode.succ, bytes: Buffer.from(''), value: result };
    });
    _interface.registerApi('end_tunnel', async (from, bytes, param) => {
        _interface.getLogger().debug(`remote call proxy_data,${JSON.stringify(param)}`);
        let result = await manager.end_tunnel(param.type, param.remote_address, param.remote_port);
        return { err: common_1.ErrorCode.succ, bytes: Buffer.from(''), value: result };
    });
    _interface.registerApi('util_request', async (from, bytes, param) => {
        var _a, _b, _c, _d;
        _interface.getLogger().debug(`remote ${from.agentid} call utilRequest ${param.name}`);
        let result = await manager.util_request({ json: param, bytes });
        // set resp package
        let respBytes = Buffer.from('');
        let respJson = {};
        if ((_a = result.resp) === null || _a === void 0 ? void 0 : _a.bytes) {
            respBytes = (_b = result.resp) === null || _b === void 0 ? void 0 : _b.bytes;
        }
        if ((_c = result.resp) === null || _c === void 0 ? void 0 : _c.json) {
            respJson = (_d = result.resp) === null || _d === void 0 ? void 0 : _d.json;
        }
        return { err: result.err, bytes: respBytes, value: respJson };
    });
}
exports.ServiceMain = ServiceMain;
