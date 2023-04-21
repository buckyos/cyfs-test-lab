import {CyfsStackDriverManager} from "../cyfs-driver-client"
import {CyfsDriverType} from "cyfs-test-base"

async function main() {
    let driverManager = CyfsStackDriverManager.createInstance();
    //await driverManager.init();
    let driver = await driverManager.create_driver(CyfsDriverType.real_machine,[]);
   
}
main()