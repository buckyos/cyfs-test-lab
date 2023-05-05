import { RandomGenerator } from '@/common';
import * as cyfs from '../../../../cyfs';
import {CyfsTestRunner,DEC_APP_1,DEC_APP_2} from "@/cyfs-test-util";
import assert from "assert";
import {DynamicTokenHandler,ShareObjectWithTokenAction} from "@/dec-app-action"


// npm run test testsuite/system-test/cyfs_lib/rmeta/test_dynamic_token_scenario.ts
describe("Scenario Testing: Dynamic token ",()=>{
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
    describe("Testing register different Acl Handler",()=>{
        test("Normal Case: Share object with dynamic token,Another user get_object_by_path with correct token",async()=>{
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
        test("Normal Case: Share object with dynamic token,Another user get_object_by_path with incorrect token",async()=>{
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
            console.info(`prepare share ob success: ${JSON.stringify(prepare_obj)}`)
            let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
            let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
            console.info(`will requet ${prepare_obj.resp.share_req_path}?token=Error${TOKEN}`);
            let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=Error${TOKEN}`);
            assert.equal( get_object_result.err,true,"Expect error:Input error token ");
        })
        describe("Testing parameter chain : Just use cyfs.RouterHandlerChain.Acl will take effect ",()=>{
            test("Normal Case:set chain cyfs.RouterHandlerChain.Acl",async()=>{
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
                console.info(`prepare share ob success: ${JSON.stringify(prepare_obj)}`)
                let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
                let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
                console.info(`will requet ${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
                let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
                assert.equal( get_object_result.err,false,JSON.stringify( get_object_result.val));
            })
            test("Abnormal Case: set chain cyfs.RouterHandlerChain.NDN will not take effect",async()=>{
                // zone1_ood_app1_http share object with token
                let prepare_obj =await new ShareObjectWithTokenAction({
                    local: zone1_ood_app1_http,
                    input: {
                        timeout: 200 * 1000,
                    },
                    expect: { err: 0 },
                }).start({
                    handler_id : RandomGenerator.string(20),
                    chain : cyfs.RouterHandlerChain.NDN,
                    root_req_path:"/qa_test_token",
                    index : 0,
                    filter: "*",
                    default_action : cyfs.RouterHandlerAction.Reject,
                    routine : new DynamicTokenHandler(TOKEN),
                    token : TOKEN  
                });
                assert.equal(prepare_obj.err,0,prepare_obj.log);
                console.info(`prepare share ob success: ${JSON.stringify(prepare_obj)}`)
                let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
                let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
                console.info(`will requet ${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
                let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
                assert.equal( get_object_result.err,true,JSON.stringify( get_object_result.val));
            })
            test("Abnormal Case: set chain cyfs.RouterHandlerChain.Handler will not take effect",async()=>{
                // zone1_ood_app1_http share object with token
                let prepare_obj =await new ShareObjectWithTokenAction({
                    local: zone1_ood_app1_http,
                    input: {
                        timeout: 200 * 1000,
                    },
                    expect: { err: 0 },
                }).start({
                    handler_id : RandomGenerator.string(20),
                    chain : cyfs.RouterHandlerChain.Handler,
                    root_req_path:"/qa_test_token",
                    index : 0,
                    filter: "*",
                    default_action : cyfs.RouterHandlerAction.Reject,
                    routine : new DynamicTokenHandler(TOKEN),
                    token : TOKEN  
                });
                assert.equal(prepare_obj.err,0,prepare_obj.log);
                console.info(`prepare share ob success: ${JSON.stringify(prepare_obj)}`)
                let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
                let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
                console.info(`will requet ${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
                let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
                assert.equal( get_object_result.err,true,JSON.stringify( get_object_result.val));
            })
            test("Abnormal Case: set chain cyfs.RouterHandlerChain.PostCrypto will not take effect",async()=>{
                // zone1_ood_app1_http share object with token
                let prepare_obj =await new ShareObjectWithTokenAction({
                    local: zone1_ood_app1_http,
                    input: {
                        timeout: 200 * 1000,
                    },
                    expect: { err: 0 },
                }).start({
                    handler_id : RandomGenerator.string(20),
                    chain : cyfs.RouterHandlerChain.PostCrypto,
                    root_req_path:"/qa_test_token",
                    index : 0,
                    filter: "*",
                    default_action : cyfs.RouterHandlerAction.Reject,
                    routine : new DynamicTokenHandler(TOKEN),
                    token : TOKEN  
                });
                assert.equal(prepare_obj.err,0,prepare_obj.log);
                console.info(`prepare share ob success: ${JSON.stringify(prepare_obj)}`)
                let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
                let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
                console.info(`will requet ${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
                let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
                assert.equal( get_object_result.err,true,JSON.stringify( get_object_result.val));
            })
            test("Abnormal Case: set chain cyfs.RouterHandlerChain.PostRouter will not take effect",async()=>{
                // zone1_ood_app1_http share object with token
                let prepare_obj =await new ShareObjectWithTokenAction({
                    local: zone1_ood_app1_http,
                    input: {
                        timeout: 200 * 1000,
                    },
                    expect: { err: 0 },
                }).start({
                    handler_id : RandomGenerator.string(20),
                    chain : cyfs.RouterHandlerChain.PostRouter,
                    root_req_path:"/qa_test_token",
                    index : 0,
                    filter: "*",
                    default_action : cyfs.RouterHandlerAction.Reject,
                    routine : new DynamicTokenHandler(TOKEN),
                    token : TOKEN  
                });
                assert.equal(prepare_obj.err,0,prepare_obj.log);
                console.info(`prepare share ob success: ${JSON.stringify(prepare_obj)}`)
                let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
                let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
                console.info(`will requet ${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
                let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
                assert.equal( get_object_result.err,true,JSON.stringify( get_object_result.val));
            })
            test("Abnormal Case: set chain cyfs.RouterHandlerChain.PreNOC will not take effect",async()=>{
                // zone1_ood_app1_http share object with token
                let prepare_obj =await new ShareObjectWithTokenAction({
                    local: zone1_ood_app1_http,
                    input: {
                        timeout: 200 * 1000,
                    },
                    expect: { err: 0 },
                }).start({
                    handler_id : RandomGenerator.string(20),
                    chain : cyfs.RouterHandlerChain.PreNOC,
                    root_req_path:"/qa_test_token",
                    index : 0,
                    filter: "*",
                    default_action : cyfs.RouterHandlerAction.Reject,
                    routine : new DynamicTokenHandler(TOKEN),
                    token : TOKEN  
                });
                assert.equal(prepare_obj.err,0,prepare_obj.log);
                console.info(`prepare share ob success: ${JSON.stringify(prepare_obj)}`)
                let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
                let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
                console.info(`will requet ${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
                let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
                assert.equal( get_object_result.err,true,JSON.stringify( get_object_result.val));
            })
        })
        describe("Testing parameter default_action :  just run effect when routine is error . developer just can use routine to verify token",()=>{
            test("Abnormal Case: Not use routine acl handler,default_action set Reject",async()=>{
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
                });
                assert.equal(prepare_obj.err,0,prepare_obj.log);
                console.info(`prepare share ob success: ${JSON.stringify(prepare_obj)}`)
                let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
                let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
                console.info(`will requet ${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
                let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
                assert.equal( get_object_result.err,true,"Expect error:Should reject by default_action:cyfs.RouterHandlerAction.Reject");
            })
            test("Abnormal Case: Not use routine acl handler,default_action set Default Reject",async()=>{
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
                    default_action : cyfs.RouterHandlerAction.Default,  
                });
                assert.equal(prepare_obj.err,0,prepare_obj.log);
                console.info(`prepare share ob success: ${JSON.stringify(prepare_obj)}`)
                let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
                let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
                console.info(`will requet ${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
                let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
                assert.equal( get_object_result.err,true,"Expect error:Should reject by default_action:cyfs.RouterHandlerAction.Default");
            })
            test("Abnormal Case: Not use routine acl handler,default_action set Drop",async()=>{
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
                    default_action : cyfs.RouterHandlerAction.Drop,  
                });
                assert.equal(prepare_obj.err,0,prepare_obj.log);
                console.info(`prepare share ob success: ${JSON.stringify(prepare_obj)}`)
                let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
                let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
                console.info(`will requet ${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
                let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
                assert.equal( get_object_result.err,true,"Expect error:Should reject by default_action:cyfs.RouterHandlerAction.Drop");
            })
            test("Abnormal Case: Not use routine acl handler,default_action set Response,but empty response.Acl handler must use routine handler",async()=>{
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
                    default_action : cyfs.RouterHandlerAction.Response,  
                });
                assert.equal(prepare_obj.err,0,prepare_obj.log);
                console.info(`prepare share ob success: ${JSON.stringify(prepare_obj)}`)
                let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
                let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
                console.info(`will requet ${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
                let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
                assert.equal( get_object_result.err,true, get_object_result.val.toString())
                if( get_object_result.err){
                    assert.equal( get_object_result.val.code!,11, get_object_result.val.toString());
                }
            })
            test("Normal Case: Not use routine acl handler,default_action set Pass will use next routine handler will accept",async()=>{
                // zone1_ood_app1_http share object with token
                const root_req_path = `/qa_test_token/${RandomGenerator.string(10)}`
                let prepare_obj =await new ShareObjectWithTokenAction({
                    local: zone1_ood_app1_http,
                    input: {
                        timeout: 200 * 1000,
                    },
                    expect: { err: 0 },
                }).start({
                    handler_id : RandomGenerator.string(20),
                    chain : cyfs.RouterHandlerChain.Acl,
                    root_req_path,
                    index : 0,
                    filter: "*",
                    default_action : cyfs.RouterHandlerAction.Pass,  
                });
                assert.equal(prepare_obj.err,0,prepare_obj.log);
                console.info(`prepare share ob success: ${JSON.stringify(prepare_obj)}`)
                let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
                let revert_handler = await zone1_ood.router_handlers().add_acl_handler(
                    cyfs.RouterHandlerChain.Acl,
                    "Dynamic-token-test-pass",
                    1,
                    "*",
                    root_req_path,
                    cyfs.RouterHandlerAction.Response,
                    new DynamicTokenHandler(TOKEN),
    
                )
                
                let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
                console.info(`will requet ${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
                let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
                assert.equal( get_object_result.err,false, get_object_result.val.toString());
                
                
            })
            test("Abnormal Case: Not use routine acl handler,default_action set Pass will use next routine handler will reject",async()=>{
                // zone1_ood_app1_http share object with token
                const root_req_path = `/qa_test_token/${RandomGenerator.string(10)}`
                let prepare_obj =await new ShareObjectWithTokenAction({
                    local: zone1_ood_app1_http,
                    input: {
                        timeout: 200 * 1000,
                    },
                    expect: { err: 0 },
                }).start({
                    handler_id : RandomGenerator.string(20),
                    chain : cyfs.RouterHandlerChain.Acl,
                    root_req_path,
                    index : 0,
                    filter: "*",
                    default_action : cyfs.RouterHandlerAction.Pass,  
                });
                assert.equal(prepare_obj.err,0,prepare_obj.log);
                console.info(`prepare share ob success: ${JSON.stringify(prepare_obj)}`)
                let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
                let revert_handler = await zone1_ood.router_handlers().add_acl_handler(
                    cyfs.RouterHandlerChain.Acl,
                    "Dynamic-token-test-pass",
                    1,
                    "*",
                    root_req_path,
                    cyfs.RouterHandlerAction.Response,
                    new DynamicTokenHandler(TOKEN),
    
                )
                
                let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
                let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=ERROR${TOKEN}`);
                assert.equal( get_object_result.err,true, get_object_result.val.toString());
                
                
            })
        })
        describe("Testing parameter req_path : handler will take effect on the req_path and child req_path",()=>{
            test("Normal Case: handler will take effect on the req_path  ",async()=>{
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
            test("Normal Case: handler will take effect on the child req_path  ",async()=>{
                // set rep_path root will accept
                let root_req_path = "/qa_test_token";
                let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
                let revert_handler = await zone1_ood.router_handlers().add_acl_handler(
                    cyfs.RouterHandlerChain.Acl,
                    "Dynamic-token-test-accept",
                    1,
                    "*",
                    root_req_path,
                    cyfs.RouterHandlerAction.Reject,
                    new DynamicTokenHandler(TOKEN),
                )
                // set rep_path will pass
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
                    default_action : cyfs.RouterHandlerAction.Pass,
                });
                assert.equal(prepare_obj.err,0,prepare_obj.log);
                // will get object success
                let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
                let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
                assert.equal( get_object_result.err,false, get_object_result.val.toString());
            })
            test("Abmormal Case: handler will not take effect on the brother req_path  ",async()=>{
                 // set rep_path brother will accept
                 let root_req_path = "/qa_test_token";
                 let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
                 let revert_handler = await zone1_ood.router_handlers().add_acl_handler(
                     cyfs.RouterHandlerChain.Acl,
                     "Dynamic-token-test-accept",
                     1,
                     "*",
                     `${root_req_path}/brother`,
                     cyfs.RouterHandlerAction.Reject,
                     new DynamicTokenHandler(TOKEN),
                 )
                 // set rep_path will pass
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
                     default_action : cyfs.RouterHandlerAction.Pass,
                 });
                 assert.equal(prepare_obj.err,0,prepare_obj.log);
                 // will get object access reject
                 let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
                 let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
                 assert.equal( get_object_result.err,true, get_object_result.val.toString());
            })
            test("Abmormal Case: handler will not take effect on the parent req_path  ",async()=>{
                 
                 // set child_path will pass
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
                     default_action : cyfs.RouterHandlerAction.Pass,
                 });
                 assert.equal(prepare_obj.err,0,prepare_obj.log);
                 // set root_path child will accept
                 let root_req_path = "/qa_test_token";
                 let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
                 let revert_handler = await zone1_ood.router_handlers().add_acl_handler(
                     cyfs.RouterHandlerChain.Acl,
                     "Dynamic-token-test-accept",
                     1,
                     "*",
                     `${prepare_obj.resp.share_req_path}/child`,
                     cyfs.RouterHandlerAction.Reject,
                     new DynamicTokenHandler(TOKEN),
                 )
                 // will get object access reject
                 let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
                 let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
                 assert.equal( get_object_result.err,true, get_object_result.val.toString());
            })
        })
        describe("Testing parameter index : The smaller the index value, the higher the priority",()=>{
            test("Normal Case: set index 0 handler accept,set index 1 handler reject. Result access accept",async()=>{
                // set index 0 accept
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
                    token : TOKEN,
                });
                assert.equal(prepare_obj.err,0,prepare_obj.log);
                // / set index 1 reject
                let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
                let revert_handler = await zone1_ood.router_handlers().add_acl_handler(
                    cyfs.RouterHandlerChain.Acl,
                    "Dynamic-token-test-accept",
                    1,
                    "*",
                    `${prepare_obj.resp.share_req_path}`,
                    cyfs.RouterHandlerAction.Reject,
                )
                 
                // will get object access accept
                let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
                let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
                assert.equal( get_object_result.err,false, get_object_result.val.toString());
            })
            test("Normal Case: set index 1 handler accept,set index 0 handler reject. Result access reject",async()=>{
                 // set index 1 accept
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
                    index : 1,
                    filter: "*",
                    default_action : cyfs.RouterHandlerAction.Reject,
                    routine : new DynamicTokenHandler(TOKEN),
                    token : TOKEN,
                });
                assert.equal(prepare_obj.err,0,prepare_obj.log);
                // / set index 0 reject
                let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
                let revert_handler = await zone1_ood.router_handlers().add_acl_handler(
                    cyfs.RouterHandlerChain.Acl,
                    "Dynamic-token-test-accept",
                    0,
                    "*",
                    `${prepare_obj.resp.share_req_path}`,
                    cyfs.RouterHandlerAction.Reject,
                )
                // will get object access reject
                let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
                let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
                assert.equal( get_object_result.err,true, get_object_result.val.toString());
            })

        })
        describe("Testing parameter filter: Only the handlers that meet the filter rules will take effect",()=>{
            test("Normal Case: set filter match success",async()=>{
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
            test("Normal Case: set filter match failed",async()=>{
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
                    filter: `dec_id = ${DEC_APP_2}`,
                    default_action : cyfs.RouterHandlerAction.Reject,
                    routine : new DynamicTokenHandler(TOKEN),
                    token : TOKEN
                });
                assert.equal(prepare_obj.err,0,prepare_obj.log);
                let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
                let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
                let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
                assert.equal( get_object_result.err,true, get_object_result.val.toString());
            })
            test("Normal Case: set filter = undefined",async()=>{
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
        describe("Testing parameter id :The id is the unique identifier of the handler",()=>{
            test("Normal Case: Registering a handler with the same id will overwrite it,Set access Accept -> Reject",async()=>{

                let prepare_obj =await new ShareObjectWithTokenAction({
                    local: zone1_ood_app1_http,
                    input: {
                        timeout: 200 * 1000,
                    },
                    expect: { err: 0 },
                }).start({
                    handler_id : "test-the-some-id-handler-789",
                    chain : cyfs.RouterHandlerChain.Acl,
                    root_req_path:"/qa_test_token",
                    index : 0,
                    filter: "*",
                    default_action : cyfs.RouterHandlerAction.Reject,
                    routine : new DynamicTokenHandler(TOKEN),
                    token : TOKEN,
                });
                assert.equal(prepare_obj.err,0,prepare_obj.log);
   
                let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
                let revert_handler = await zone1_ood.router_handlers().add_acl_handler(
                    cyfs.RouterHandlerChain.Acl,
                    "test-the-some-id-handler-789",
                    1,
                    "*",
                    `${prepare_obj.resp.share_req_path}`,
                    cyfs.RouterHandlerAction.Reject,
                )
                 
         
                let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
                let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
                assert.equal( get_object_result.err,true, get_object_result.val.toString());
            })
            test("Normal Case: Registering a handler with the same id will overwrite it,Set access  Reject -> Accept ",async()=>{
                let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
                let prepare_obj =await new ShareObjectWithTokenAction({
                    local: zone1_ood_app1_http,
                    input: {
                        timeout: 200 * 1000,
                    },
                    expect: { err: 0 },
                }).start({
                    handler_id : "test-the-some-id-handler-789",
                    chain : cyfs.RouterHandlerChain.Acl,
                    root_req_path:"/qa_test_token",
                    index : 0,
                    filter: "*",
                    default_action : cyfs.RouterHandlerAction.Reject,
                });
                assert.equal(prepare_obj.err,0,prepare_obj.log);
                let revert_handler = await zone1_ood.router_handlers().add_acl_handler(
                    cyfs.RouterHandlerChain.Acl,
                    "test-the-some-id-handler-789",
                    1,
                    "*",
                    `${prepare_obj.resp.share_req_path}`,
                    cyfs.RouterHandlerAction.Reject,
                    new DynamicTokenHandler(TOKEN),
                )
              
                 
      
                let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
                let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
                assert.equal( get_object_result.err,false, get_object_result.val.toString());
            })

        })
        describe.only("Testing parameter routine : the routine will register a handler event ,When call it,it can response accept、reject、BuckyError",()=>{
            test("Normal Case: Registering a handler the routine will response accept",async()=>{

                let prepare_obj =await new ShareObjectWithTokenAction({
                    local: zone1_ood_app1_http,
                    input: {
                        timeout: 200 * 1000,
                    },
                    expect: { err: 0 },
                }).start({
                    handler_id : "test-the-some-id-handler-789",
                    chain : cyfs.RouterHandlerChain.Acl,
                    root_req_path:"/qa_test_token",
                    index : 0,
                    filter: "*",
                    default_action : cyfs.RouterHandlerAction.Reject,
                    routine : new DynamicTokenHandler(TOKEN),
                    token : TOKEN,
                });
                assert.equal(prepare_obj.err,0,prepare_obj.log);
   
                let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
                let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
                let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}`);
                assert.equal( get_object_result.err,false, get_object_result.val.toString());
                if( get_object_result.err){
                    console.info(`get_object_by_path err = ${JSON.stringify(get_object_result.val)}`)
                }
            })
            test("Normal Case: Registering a handler the routine will response reject",async()=>{

                let prepare_obj =await new ShareObjectWithTokenAction({
                    local: zone1_ood_app1_http,
                    input: {
                        timeout: 200 * 1000,
                    },
                    expect: { err: 0 },
                }).start({
                    handler_id : "test-the-some-id-handler-789",
                    chain : cyfs.RouterHandlerChain.Acl,
                    root_req_path:"/qa_test_token",
                    index : 0,
                    filter: "*",
                    default_action : cyfs.RouterHandlerAction.Reject,
                    routine : new DynamicTokenHandler(TOKEN),
                    token : TOKEN,
                });
                assert.equal(prepare_obj.err,0,prepare_obj.log);
   
                let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
                let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
                let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=ERROR${TOKEN}`);
                if( get_object_result.err){
                    console.info(`get_object_by_path err = ${JSON.stringify(get_object_result.val)}`)
                }
            })
            test("Normal Case: Registering a handler the routine will response BuckyError",async()=>{

                let prepare_obj =await new ShareObjectWithTokenAction({
                    local: zone1_ood_app1_http,
                    input: {
                        timeout: 200 * 1000,
                    },
                    expect: { err: 0 },
                }).start({
                    handler_id : "test-the-some-id-handler-789",
                    chain : cyfs.RouterHandlerChain.Acl,
                    root_req_path:"/qa_test_token",
                    index : 0,
                    filter: "*",
                    default_action : cyfs.RouterHandlerAction.Reject,
                    routine : new DynamicTokenHandler(TOKEN),
                    token : TOKEN,
                });
                assert.equal(prepare_obj.err,0,prepare_obj.log);
                let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
                let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
                let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}&response_error=404`);
                assert.equal( get_object_result.err,true, get_object_result.val.toString());
                if( get_object_result.err){
                    console.info(`get_object_by_path err = ${JSON.stringify(get_object_result.val)}`)
                }
            })
            test("Normal Case: Registering a handler the routine will return BuckyError",async()=>{
                let prepare_obj =await new ShareObjectWithTokenAction({
                    local: zone1_ood_app1_http,
                    input: {
                        timeout: 200 * 1000,
                    },
                    expect: { err: 0 },
                }).start({
                    handler_id : "test-the-some-id-handler-789",
                    chain : cyfs.RouterHandlerChain.Acl,
                    root_req_path:"/qa_test_token",
                    index : 0,
                    filter: "*",
                    default_action : cyfs.RouterHandlerAction.Reject,
                    routine : new DynamicTokenHandler(TOKEN),
                    token : TOKEN,
                });
                assert.equal(prepare_obj.err,0,prepare_obj.log);
                let zone1_ood = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
                let zone2_ood = test_runner.stack_manager.get_cyfs_satck(zone2_ood_app1_http).stack!;
                let  get_object_result = await zone2_ood.root_state_accessor_stub(zone1_ood.local_device_id().object_id).get_object_by_path(`${prepare_obj.resp.share_req_path}?token=${TOKEN}&return_error=502`);
                assert.equal( get_object_result.err,true, get_object_result.val.toString());
                if( get_object_result.err){
                    console.info(`get_object_by_path err = ${JSON.stringify(get_object_result.val)}`)
                }
            })
        })
    })

})