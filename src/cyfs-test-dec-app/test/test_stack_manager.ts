import {CyfsStackDriverManager,CyfsDriverType} from "../cyfs-driver-client"
import {StackManager} from "../cyfs-driver-client/stack_manager"

async function main() {
    let stack_manager = new StackManager(CyfsDriverType.simulator);
    await stack_manager.init();
    //await stack_manager.load_config_stack();
    await stack_manager.driver!.stop();
}
main().finally(()=>{
    process.exit();
})