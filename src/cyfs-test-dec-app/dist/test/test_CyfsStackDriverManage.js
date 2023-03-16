"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cyfs_driver_client_1 = require("../cyfs-driver-client");
async function main() {
    let driverManager = cyfs_driver_client_1.CyfsStackDriverManager.createInstance();
    //await driverManager.init();
    let driver = await driverManager.create_driver(cyfs_driver_client_1.CyfsDriverType.real_machine, []);
}
main();
