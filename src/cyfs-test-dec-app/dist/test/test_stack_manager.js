"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cyfs_driver_client_1 = require("../cyfs-driver-client");
const stack_manager_1 = require("../cyfs-driver-client/stack_manager");
async function main() {
    let stack_manager = new stack_manager_1.StackManager(cyfs_driver_client_1.CyfsDriverType.simulator);
    await stack_manager.init();
    //await stack_manager.load_config_stack();
    await stack_manager.driver.stop();
}
main().finally(() => {
    process.exit();
});
