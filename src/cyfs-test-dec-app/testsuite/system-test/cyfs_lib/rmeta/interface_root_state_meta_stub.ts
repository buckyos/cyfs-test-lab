import * as cyfs from '../../../../cyfs';
import {CyfsTestRunner,DEC_APP_1,DEC_APP_2} from "@/cyfs-test-util";
import assert from "assert";


describe("Interface Testing: Dynamic token ",()=>{
    let test_runner =  CyfsTestRunner.createInstance();
    beforeAll(async function () {
        await new Promise(async resolve => {
            await test_runner.init()
            console.info("beforeAll start")
            await test_runner.before_all_common();
            console.info("beforeAll finished")
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
            // addContext.default(this, report_result);
            resolve("finished");
        })
    },60*1000)
    const TEST_REQ_PATH = "/QATest";
    const zone1_ood_app1_http = {
        peer_name: "zone1_ood",
        dec_id: DEC_APP_1.to_base_58(),
        type: cyfs.CyfsStackRequestorType.Http
    }
    describe("Interface:stack.root_state_meta_stub().add_access() ",()=>{
        test("Case : input all/must parameters ",async()=>{
            let satck = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
            let item1 : cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(TEST_REQ_PATH,cyfs.AccessString.full());
            item1.access = cyfs.GlobalStatePathGroupAccess.Handler();
            let add_access = (await satck.root_state_meta_stub().add_access(item1)).unwrap();
        })
    })
    describe("Interface:stack.root_state_meta_stub().add_link() ",()=>{
        test("Case : input all/must parameters ",async()=>{
            let satck = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
            let item1 : cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(TEST_REQ_PATH,cyfs.AccessString.full());
            item1.access = cyfs.GlobalStatePathGroupAccess.Handler();
            let add_access = (await satck.root_state_meta_stub().add_link("abc","bcd")).unwrap();
        })
    })
    describe("Interface:stack.root_state_meta_stub().add_object_meta() ",()=>{
        test("Case : input all parameters ",async()=>{
            let satck = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
            let item1 : cyfs.GlobalStateObjectMetaItem = {
                selector : "",
                access: cyfs.GlobalStatePathGroupAccess.Handler(),
                depth : 1,
            }
            let add_access = (await satck.root_state_meta_stub().add_object_meta(item1)).unwrap();
        })
        test("Case : input must parameters ",async()=>{
            let satck = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
            let item1 : cyfs.GlobalStateObjectMetaItem = {
                selector : "",
                access: cyfs.GlobalStatePathGroupAccess.Handler(),
            }
            let add_access = (await satck.root_state_meta_stub().add_object_meta(item1)).unwrap();
        })    
    })

    describe("Interface:stack.root_state_meta_stub().add_path_config() ",()=>{
        test("Case : input all parameters ",async()=>{
            let satck = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
            let item1 : cyfs.GlobalStatePathConfigItem = {
                path : TEST_REQ_PATH,
                storage_state: cyfs.GlobalStatePathStorageState.Concrete,
                depth : 1,
            }
            let add_access = (await satck.root_state_meta_stub().add_path_config(item1)).unwrap();
        })
        test("Case : input must parameters ",async()=>{
            let satck = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
            let item1 : cyfs.GlobalStatePathConfigItem = {
                path : TEST_REQ_PATH,
                storage_state: cyfs.GlobalStatePathStorageState.Concrete,
            }
            let add_access = (await satck.root_state_meta_stub().add_path_config(item1)).unwrap();
        })    
    })

    describe("Interface:stack.root_state_meta_stub().clear_access() ",()=>{
        test("Case : input None parameters ",async()=>{
            let satck = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
            let add_access = (await satck.root_state_meta_stub().clear_access()).unwrap();
        })
    })
    describe("Interface:stack.root_state_meta_stub().clear_link() ",()=>{
        test("Case : input None parameters ",async()=>{
            let satck = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
            let add_access = (await satck.root_state_meta_stub().clear_link()).unwrap();
        })
    })

    describe("Interface:stack.root_state_meta_stub().clear_object_meta() ",()=>{
        test("Case : input None parameters ",async()=>{
            let satck = test_runner.stack_manager.get_cyfs_satck(zone1_ood_app1_http).stack!;
            let add_access = (await satck.root_state_meta_stub().clear_object_meta()).unwrap();
        })

    })
    describe("Interface:stack.root_state_meta_stub().add_path_config() ",()=>{
        test("Case : input all parameters ",async()=>{

        })
        test("Case : input must parameters ",async()=>{

        })    
    })

})