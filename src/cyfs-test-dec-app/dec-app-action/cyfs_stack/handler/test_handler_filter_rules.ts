import { RandomGenerator } from '@/common';
import * as cyfs from '../../../cyfs';
import {CyfsTestRunner,DEC_APP_1,DEC_APP_2} from "@/cyfs-test-util";
import assert from "assert";
import {DynamicTokenHandler,ShareObjectWithTokenAction} from "@/dec-app-action"


// npm run test testsuite/system-test/cyfs_lib/rmeta/test_dynamic_token_scenario.ts
describe("Scenario Testing: filter rules ",()=>{
    let test_runner =  CyfsTestRunner.createInstance();
    beforeAll(async function () {
        await new Promise(async resolve => {
            await test_runner.init()
            await test_runner.before_all_common();
            resolve("finished");
        })
       
    },60*1000)
    afterAll(async function () {
        await new Promise(async resolve => {
            await test_runner.after_all_common();
            resolve("finished");
        })
        
    },60*1000)
    beforeEach(async function () {
        await new Promise(async resolve => {
            let testcase_id = `${Date.now()}`//this.currentTest.title
            await test_runner.before_each_common(testcase_id);
            resolve("finished");
        })
    },60*1000)
    afterEach(async function () {
        await new Promise(async resolve => {
            let report_result = await test_runner.after_each_common();
            resolve("finished");
        })
    },60*1000)
    const TOKEN = `sk-${RandomGenerator.string(30)}`
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
describe("Testing handler filter rules",()=>{ 
    describe("Testing  filter parameter type",()=>{
        test("Normal Case: set filter = \"*\" matches all request",async()=>{
            // zone1_ood_app1_http share object with token
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
            assert.equal(prepare_obj.err,0,prepare_obj.log);
            let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
            let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
            let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
            assert.equal( get_object_result.err,false, get_object_result.val.toString());
        })
        test("Normal Case: set filter = \"*\" matches all request",async()=>{
            // zone1_ood_app1_http share object with token
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
            assert.equal(prepare_obj.err,0,prepare_obj.log);
            let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
            let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
            let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
            assert.equal( get_object_result.err,false, get_object_result.val.toString());
        })
        test("Normal Case: set filter = \"source.protocol=\" matches all request",async()=>{
            // zone1_ood_app1_http share object with token
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
                filter: "protocol",
                default_action : cyfs.RouterHandlerAction.Reject,
                routine : new DynamicTokenHandler(TOKEN),
                token : TOKEN
            });
            assert.equal(prepare_obj.err,0,prepare_obj.log);
            let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
            let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
            let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
            assert.equal( get_object_result.err,false, get_object_result.val.toString());
        })
        test("Normal Case: set filter = \"source.dec_id=\" matches all request",async()=>{
            // zone1_ood_app1_http share object with token
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
                filter: "protocol",
                default_action : cyfs.RouterHandlerAction.Reject,
                routine : new DynamicTokenHandler(TOKEN),
                token : TOKEN
            });
            assert.equal(prepare_obj.err,0,prepare_obj.log);
            let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
            let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
            let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
            assert.equal( get_object_result.err,false, get_object_result.val.toString());
        })
        test("Normal Case: set filter = \"source.zone=\" matches all request",async()=>{
            // zone1_ood_app1_http share object with token
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
                filter: "protocol",
                default_action : cyfs.RouterHandlerAction.Reject,
                routine : new DynamicTokenHandler(TOKEN),
                token : TOKEN
            });
            assert.equal(prepare_obj.err,0,prepare_obj.log);
            let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
            let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
            let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
            assert.equal( get_object_result.err,false, get_object_result.val.toString());
        })
        test("Normal Case: set filter = \"source.device=\" matches all request",async()=>{
            // zone1_ood_app1_http share object with token
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
                filter: "protocol",
                default_action : cyfs.RouterHandlerAction.Reject,
                routine : new DynamicTokenHandler(TOKEN),
                token : TOKEN
            });
            assert.equal(prepare_obj.err,0,prepare_obj.log);
            let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
            let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
            let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
            assert.equal( get_object_result.err,false, get_object_result.val.toString());
        })
        test("Normal Case: set filter = \"source.zone_category=\" matches all request",async()=>{
            // zone1_ood_app1_http share object with token
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
                filter: "protocol",
                default_action : cyfs.RouterHandlerAction.Reject,
                routine : new DynamicTokenHandler(TOKEN),
                token : TOKEN
            });
            assert.equal(prepare_obj.err,0,prepare_obj.log);
            let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
            let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
            let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
            assert.equal( get_object_result.err,false, get_object_result.val.toString());
        })
        test("Normal Case: set filter = \"dec_id=\" matches all request",async()=>{
            // zone1_ood_app1_http share object with token
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
                filter: "protocol",
                default_action : cyfs.RouterHandlerAction.Reject,
                routine : new DynamicTokenHandler(TOKEN),
                token : TOKEN
            });
            assert.equal(prepare_obj.err,0,prepare_obj.log);
            let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
            let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
            let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
            assert.equal( get_object_result.err,false, get_object_result.val.toString());
        })
        test("Normal Case: set filter = \"req_path=\" matches all request",async()=>{
            // zone1_ood_app1_http share object with token
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
                filter: "protocol",
                default_action : cyfs.RouterHandlerAction.Reject,
                routine : new DynamicTokenHandler(TOKEN),
                token : TOKEN
            });
            assert.equal(prepare_obj.err,0,prepare_obj.log);
            let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
            let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
            let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
            assert.equal( get_object_result.err,false, get_object_result.val.toString());
        })
        test("Normal Case: set filter = \"req_query_string=\" matches all request",async()=>{
            // zone1_ood_app1_http share object with token
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
                filter: "protocol",
                default_action : cyfs.RouterHandlerAction.Reject,
                routine : new DynamicTokenHandler(TOKEN),
                token : TOKEN
            });
            assert.equal(prepare_obj.err,0,prepare_obj.log);
            let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
            let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
            let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
            assert.equal( get_object_result.err,false, get_object_result.val.toString());
        })
        test("Normal Case: set filter = \"permissions=\" matches all request",async()=>{
            // zone1_ood_app1_http share object with token
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
                filter: "protocol",
                default_action : cyfs.RouterHandlerAction.Reject,
                routine : new DynamicTokenHandler(TOKEN),
                token : TOKEN
            });
            assert.equal(prepare_obj.err,0,prepare_obj.log);
            let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
            let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
            let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
            assert.equal( get_object_result.err,false, get_object_result.val.toString());
        })

    })
    describe("Testing  filter operator rule",()=>{

    })
})
})