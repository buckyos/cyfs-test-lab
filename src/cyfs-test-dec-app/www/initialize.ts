// Initialization
import {StackInstance} from "./utils/stack"
export async function init() {
    let stack_instance = StackInstance.createInstance();
    let init = await stack_instance.wait_online();
    return
}
