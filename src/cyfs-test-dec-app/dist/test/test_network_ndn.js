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
const assert = require("assert");
const cyfs = __importStar(require("../cyfs"));
const stack_manager_1 = require("../cyfs-driver-client/stack_manager");
const action_api = __importStar(require("../dec-app-action"));
const common_1 = require("../common");
const dec_app_1 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device1decapp");
const dec_app_2 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device2decapp");
async function main() {
    const stack_manager = stack_manager_1.StackManager.createInstance();
    await stack_manager.init();
    await cyfs.sleep(5000);
    await stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.Http, dec_app_1);
    await stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.WebSocket, dec_app_2);
    let action = await new action_api.PutDataAction({
        local: {
            peer_name: "zone1_device1",
            dec_id: dec_app_2.to_base_58(),
            type: cyfs.CyfsStackRequestorType.WebSocket
        },
        remote: {
            peer_name: "zone1_ood",
            dec_id: dec_app_2.to_base_58(),
            type: cyfs.CyfsStackRequestorType.WebSocket
        },
        input: {
            timeout: 200 * 1000,
        },
        expect: { err: 0 },
    }, stack_manager.logger).start({
        object_type: "chunk",
        chunk_size: 1 * 1024 * 1024,
    });
    assert.equal(action.err, common_1.ErrorCode.succ, action.log);
}
main().finally(() => {
    process.exit();
});
