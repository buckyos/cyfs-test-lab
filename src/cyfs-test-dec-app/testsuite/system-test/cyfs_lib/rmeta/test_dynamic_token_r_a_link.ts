import { RandomGenerator } from '../../../../common';
import * as cyfs from '../../../../cyfs';
import {CyfsTestRunner,DEC_APP_1,DEC_APP_2} from "../../../../cyfs-test-util";
import assert from "assert";
import {DynamicTokenHandler,ShareObjectWithTokenAction} from "../../../../dec-app-action"
import {CyfsDriverType} from "../../../../cyfs-test-base"
import {CyfsStackClientConfig} from "../../../../cyfs-driver-client"

// npm run test testsuite/system-test/cyfs_lib/rmeta/test_dynamic_token_scenario.ts

const zone1_ood_app1_http = {
    peer_name: "zone1_ood",
    dec_id: DEC_APP_1.to_base_58(),
    type: cyfs.CyfsStackRequestorType.Http
}
const zone2_ood_app1_http = {
    peer_name: "zone2_ood",
    dec_id: DEC_APP_1.to_base_58(),
    type: cyfs.CyfsStackRequestorType.Http
}


async function main(){
    // (1) init cyfs test driver,connect
    let test_runner =  CyfsTestRunner.createInstance(CyfsDriverType.other,[
        {
            peer_name: "zone1_ood",
            zone_tag: "zone1",
            stack_type: "ood",
            bdt_port: 30000,
            http_port: 30001,
            ws_port: 30002,
        },{
            peer_name: "zone2_ood",
            zone_tag: "zone2",
            stack_type: "ood",
            bdt_port: 30010,
            http_port: 30011,
            ws_port: 30012,
        }
    ]);
    await test_runner.init()
    await test_runner.before_all_common();
    let testcase_id = `${Date.now()}`//this.currentTest.title
    await test_runner.before_each_common(testcase_id);
    // (2) connect remote cyfs stack by driver
    let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
    let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
    // (3) create test object and acl handler
    const TOKEN = `sk-${RandomGenerator.string(20)}`
    let prepare_obj =await new ShareObjectWithTokenAction({
        local: zone1_ood_app1_http,
        input: {
            timeout: 200 * 1000,
        },
        expect: { err: 0 },
    }).start({
        handler_id : RandomGenerator.string(20),
        chain : cyfs.RouterHandlerChain.Acl,
        root_req_path:"/qa_test_token",
        index : 0,
        filter: "*",
        default_action : cyfs.RouterHandlerAction.Reject,
        routine : new DynamicTokenHandler(TOKEN),
        token : TOKEN
    });
    let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
    assert.equal( get_object_result.err,false, get_object_result.val.toString());
    // Generator cyfs o-link
    console.info(`CYFS O-Link: cyfs://o/${zone1_ood.local_device_id().to_base_58()}/${prepare_obj.resp.object_id.to_base_58()}?req_path=/${DEC_APP_1.to_base_58()}${prepare_obj.resp.share_req_path}?token=${TOKEN}`)
    // Generator cyfs r-link
    console.info(`CYFS R-Link: cyfs://r/${zone1_ood.local_device_id().to_base_58()}/${DEC_APP_1.to_base_58()}${prepare_obj.resp.share_req_path}?token=${TOKEN}`)
    while(true){
        await cyfs.sleep(5000)
        console.info(`cyfs stack in running`)
    }

}
main();