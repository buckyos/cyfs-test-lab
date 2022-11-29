import {CyfsStackDriverManager,CyfsDriverType} from "../cyfs-driver-client"


async function main() {
    let driverManager = CyfsStackDriverManager.createInstance();
    await driverManager.init();
    let driver = await driverManager.create_driver(CyfsDriverType.real_machine);
}
main()