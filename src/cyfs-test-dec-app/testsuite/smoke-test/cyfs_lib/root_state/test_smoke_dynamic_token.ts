import * as cyfs from '../../../../cyfs';
import {CyfsTestRunner,DEC_APP_1,DEC_APP_2} from "@/cyfs-test-util";
import assert from "assert";


describe("Smoke Testing: Dynamic token ",()=>{
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
    const USER_ACCESS_TOKEN = "QATest-token"
    class SmokeDynamicTokenHandler implements cyfs.RouterHandlerAclRoutine{
        
        async call(param: cyfs.RouterHandlerAclRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerAclResult>> {
            
            console.info(`will handle dynamic acl${param.request.req_path}: query${param.request.req_query_string}`)
            let action = cyfs.AclAction.Reject;
            let querys = param.request.req_query_string.split("&");
            for(let query of querys){
                let [key,value] = query.split("=");
                console.info(`Dynamic Token will check key=${key} value = ${value}`)
                if(key === "token" && value===USER_ACCESS_TOKEN){
                    action = cyfs.AclAction.Accept;
                    break;
                }
            }
            let resp :cyfs.AclHandlerResponse = {
                action
            }
            let result : cyfs.RouterHandlerAclResult =  {
                action: cyfs.RouterHandlerAction.Response,
                response : cyfs.Ok(resp),
            }
            return cyfs.Ok(result)
        }

        
    }

    it("Smoke Testing for Dynamic token",async()=>{
        
        let device1 = test_runner.stack_manager.get_cyfs_satck({
            peer_name: "zone1_ood",
            dec_id: DEC_APP_1.to_base_58(),
            type: cyfs.CyfsStackRequestorType.Http
        }).stack!;
        let device2 = test_runner.stack_manager.get_cyfs_satck({
            peer_name: "zone2_ood",
            dec_id: DEC_APP_1.to_base_58(),
            type: cyfs.CyfsStackRequestorType.Http
        }).stack!;
        let full_req_path = `${TEST_REQ_PATH}?token=${USER_ACCESS_TOKEN}`;
        let _ = (await device1.root_state_meta_stub().clear_access()).unwrap();
        
        let item1 : cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(TEST_REQ_PATH,cyfs.AccessString.full());
        item1.access = cyfs.GlobalStatePathGroupAccess.Handler();

        let add_access = (await device1.root_state_meta_stub().add_access(item1)).unwrap();
        let op_env = (await device1.root_state_stub(device1.local_device_id().object_id,DEC_APP_1).create_path_op_env()).unwrap();
        let get_check = (await op_env.get_by_path(TEST_REQ_PATH));
        if(get_check.err){
            let insert__check = (await op_env.set_with_path(TEST_REQ_PATH,device1.local_device_id().object_id)).unwrap();
        }
        let commit = await op_env.commit();
        commit.unwrap();

        // let item2 : cyfs.GlobalStatePathAccessItem = new cyfs.GlobalStatePathAccessItem();
        // item2.access = cyfs.GlobalStatePathGroupAccess.Handler();
        // item2.path = TEST_REQ_PATH;
        let add_handler = await device1.router_handlers().add_acl_handler(
            cyfs.RouterHandlerChain.Acl,
            "smoke-test-dynamic-token",
            0,
            "*",
            TEST_REQ_PATH,
            cyfs.RouterHandlerAction.Reject,
            new SmokeDynamicTokenHandler()
        );
        add_handler.unwrap();
        await cyfs.sleep(2000);
        let stub = device2.root_state_accessor_stub(device1.local_device_id().object_id,DEC_APP_1);
        let get_object_sucesss = await stub.get_object_by_path(full_req_path);
        assert.equal(get_object_sucesss.err,false,get_object_sucesss.val.toString());

        let full_req_path_error = `${TEST_REQ_PATH}?token=12345`;
        let get_object_failed = await stub.get_object_by_path(full_req_path_error);
        assert.equal(get_object_failed.err,true,get_object_failed.val.toString());

        device1.non_service().put_object({
            common : {
                level : cyfs.NONAPILevel.NOC,
                flags : 1,
            },
            object: cyfs.NONObjectInfo.new_from_object_raw(device1.local_device().to_vec().unwrap()).unwrap(),

            access: cyfs.AccessString.,
        })

    })

})