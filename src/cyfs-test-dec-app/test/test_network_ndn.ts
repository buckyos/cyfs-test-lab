import assert from "assert";
import * as cyfs from '../cyfs'
import {StackManager} from "../cyfs-test-util"
import * as action_api from "../dec-app-action"
import { ErrorCode } from '../common';
const dec_app_1 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device1decapp")
const dec_app_2 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device2decapp")
async function main() {
    const stack_manager = StackManager.createInstance();
    await stack_manager.init();
    await cyfs.sleep(5000);
    await stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.Http, dec_app_1);
    await stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.WebSocket, dec_app_2);
    let action =await new action_api.PutDataAction({
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

    }, ).start({
        object_type: "chunk",
        chunk_size: 1*1024*1024,
    });
    assert.equal(action.err,ErrorCode.succ,action.log)
}
main().finally(()=>{
   process.exit();
})