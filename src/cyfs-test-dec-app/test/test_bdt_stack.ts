import {CyfsStackDriverManager,CyfsDriverType,BdtPeerClient} from "../cyfs-driver-client"
import {StackManager} from "../cyfs-driver-client/stack_manager"

async function main() {
    let driverManager = CyfsStackDriverManager.createInstance();
    let driver = await driverManager.create_driver(CyfsDriverType.bdt_client);
}
main().finally(()=>{
    process.exit();
})