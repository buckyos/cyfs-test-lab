"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceMain = void 0;
const client_manager_1 = require("./client_manager");
async function ServiceMain(_interface) {
    _interface.getLogger().info(`=========start service namespace=${JSON.stringify(_interface.getNamespace())}`);
    let manager = client_manager_1.BdtClientManager.createInstance(_interface);
    await manager.init();
    _interface.registerApi('startPeerClient', async (from, bytes, param) => {
        _interface.getLogger().debug(`remote call startPeer`);
        let startInfo = await manager.start_peer(param.RUST_LOG, param.client_name, param.port, param.kill_server);
        if (startInfo.err) {
            return { err: startInfo.err, bytes: Buffer.from(''), value: {} };
        }
        return { err: startInfo.err, bytes: Buffer.from(""), value: { client_name: startInfo.client_name } };
    });
    // send command to bdt-tools
    _interface.registerApi('sendBdtLpcCommand', async (from, bytes, param) => {
        var _a, _b, _c, _d;
        _interface.getLogger().debug(`remote ${from.agentid} call sendBdtLpcCommand ${param.client_name}`);
        let result = await manager.send_bdt_lpc_command(param.client_name, { json: param.action, bytes });
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
    // send command to bdt-tools ,local create handler,Listener event from bdt-tools
    _interface.registerApi('createBdtLpcListener', async (from, bytes, param) => {
        var _a, _b, _c, _d;
        _interface.getLogger().debug(`remote call createBdtLpcListener ${param.client_name} ${param.event_name} `);
        let result = await manager.create_bdt_lpc_listener(param.client_name, param.event_name, param.event_type, { json: param.action, bytes });
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
    // local util,it can start bdt-tools and create test data
    _interface.registerApi('utilRequest', async (from, bytes, param) => {
        var _a, _b, _c, _d;
        _interface.getLogger().debug(`remote ${from.agentid} call utilRequest ${param.name}`);
        _interface.getLogger().debug(`remote call createBdtLpcListener ${param.name} `);
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
