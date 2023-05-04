import assert  from 'assert';
import * as cyfs from '@/cyfs';
import {ActionManager,StackManager,CyfsTestRunner} from "@/cyfs-test-util"
import { ErrorCode, RandomGenerator, sleep,Logger, DirHelper } from '@/common';
import path = require('path');
import * as action_api from "@/dec-app-action";


const dec_app_1 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device1decapp")
const dec_app_2 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device2decapp")

//Interface
//Test scenario
//System testing
//Performance testing
//Stress testing
//Smoke testing
//Regression testing
//Integration Testing


// npm run test ./testsuite/system-test/cyfs_lib/ndn/test_put_data.ts
// Development not implemented
// Waiting issuse# to fix
// cyfs.clog.enable_file_log({
//     name: "cyfs_stack",
//     dir: path.join(DirHelper.getLogDir(),"test_ndn_scenario"),
//     file_max_size: 1024 * 1024 * 10,
//     file_max_count: 10,
// });

describe("System Testing: stack.ndn_service().put_data() ", function () {
    
    beforeAll(async function () {
        await new Promise(async resolve => {
            let test_runner =  CyfsTestRunner.createInstance();
            await test_runner.init()
            console.info("beforeAll start")
            await test_runner.before_all_common();
            console.info("beforeAll finished")
            resolve("finished");
        })
       
    },60*1000)
    afterAll(async function () {
        await new Promise(async resolve => {
            let test_runner =  CyfsTestRunner.createInstance();
            await test_runner.after_all_common();
            resolve("finished");
        })
        
    },60*1000)
    beforeEach(async function () {
        await new Promise(async resolve => {
            let test_runner =  CyfsTestRunner.createInstance();
            let testcase_id = `${Date.now()}`//this.currentTest.title
            await test_runner.before_each_common(testcase_id);
            resolve("finished");
        })
    },60*1000)
    afterEach(async function () {
        await new Promise(async resolve => {
            let test_runner =  CyfsTestRunner.createInstance();
            let report_result = await test_runner.after_each_common();
            // addContext.default(this, report_result);
            resolve("finished");
        })
    },60*1000)
    test.only(" NDC put_data chunk data by WebSocket Requestor,Auto use Http Requestor",async()=>{
        // Create test Action
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

        }).start({
            object_type: "chunk",
            chunk_size: 10*1024*1024,
        });
        assert.equal(action.err,ErrorCode.succ,action.log)
    })
    describe(`put_data CyfsStackRequestorType: HTTP/WebSocket`,()=>{    
        
        // it("NDC put_data chunk data by Http Requestor",async ()=>{
        //     // Create test Action
        //     let action = await new action_api.PutDataAction({
        //         local: {
        //             peer_name: "zone1_device1",
        //             dec_id: dec_app_1.to_base_58(),
        //             type: cyfs.CyfsStackRequestorType.Http
        //         },
        //         remote: {
        //             peer_name: "zone1_ood",
        //             dec_id: dec_app_1.to_base_58(),
        //             type: cyfs.CyfsStackRequestorType.Http
        //         },
        //         input: {
        //             timeout: 200 * 1000,
        //         },
        //         expect: { err: 0 },

        //     }).start({
        //         object_type: "chunk",
        //         chunk_size: 10*1024*1024,
        //     });
        //     assert.equal(action.err,ErrorCode.succ,action.log)
        // })
    })
    // describe(`put_data data type : Chunk/File/Dir+inner_path`,()=>{
    //     it("put_data send Chunk",async()=>{
    //         // 创建测试任务
    //         let action =await new action_api.PutDataAction({
    //             local: {
    //                 peer_name: "zone1_device1",
    //                 dec_id: dec_app_1.to_base_58(),
    //                 type: cyfs.CyfsStackRequestorType.Http
    //             },
    //             remote: {
    //                 peer_name: "zone1_ood",
    //                 dec_id: dec_app_1.to_base_58(),
    //                 type: cyfs.CyfsStackRequestorType.Http
    //             },
    //             input: {
    //                 timeout: 200 * 1000,
    //             },
    //             expect: { err: 0 },

    //         }).start({
    //             object_type: "chunk",
    //             chunk_size: 10*1024*1024,
    //         });
    //         assert.equal(action.err,ErrorCode.succ,action.log)
    //     })
    //     it("put_data send File",async()=>{
    //         // 创建测试任务
    //         let action =await new action_api.PutDataAction({
    //             local: {
    //                 peer_name: "zone1_device1",
    //                 dec_id: dec_app_1.to_base_58(),
    //                 type: cyfs.CyfsStackRequestorType.Http
    //             },
    //             remote: {
    //                 peer_name: "zone1_ood",
    //                 dec_id: dec_app_1.to_base_58(),
    //                 type: cyfs.CyfsStackRequestorType.Http
    //             },
    //             input: {
    //                 timeout: 200 * 1000,
    //             },
    //             expect: { err: 0 },

    //         }).start({
    //             object_type: "file",
    //             chunk_size: 4*1024*1024,
    //             file_size : 10*1024*1024,
    //         });
    //         assert.equal(action.err,1,action.log)
    //     })
    // })
    // describe(`NDN put_data 发送数据大小测试 【不支持Stream形式，内存有限制】`,()=>{
    //     describe(`Chunk 数据大小测试`,()=>{
    //         it("本地NDC put_data 发送Chunk 50MB",async()=>{
    //             // 创建测试任务
    //             let action =await new action_api.PutDataAction({
    //                 local: {
    //                     peer_name: "zone1_device1",
    //                     dec_id: dec_app_1.to_base_58(),
    //                     type: cyfs.CyfsStackRequestorType.Http
    //                 },
    //                 remote: {
    //                     peer_name: "zone1_ood",
    //                     dec_id: dec_app_1.to_base_58(),
    //                     type: cyfs.CyfsStackRequestorType.Http
    //                 },
    //                 input: {
    //                     timeout: 200 * 1000,
    //                 },
    //                 expect: { err: 0 },
    
    //             }).start({
    //                 object_type: "chunk",
    //                 chunk_size: 50*1024*1024,
    //             });
    //             assert.equal(action.err,ErrorCode.succ,action.log)
    //         })
    //         it("本地NDC put_data 发送Chunk 100MB",async()=>{
    //             // 创建测试任务
    //             let action =await new action_api.PutDataAction({
    //                 local: {
    //                     peer_name: "zone1_device1",
    //                     dec_id: dec_app_1.to_base_58(),
    //                     type: cyfs.CyfsStackRequestorType.Http
    //                 },
    //                 remote: {
    //                     peer_name: "zone1_ood",
    //                     dec_id: dec_app_1.to_base_58(),
    //                     type: cyfs.CyfsStackRequestorType.Http
    //                 },
    //                 input: {
    //                     timeout: 200 * 1000,
    //                 },
    //                 expect: { err: 0 },
    
    //             }).start({
    //                 object_type: "chunk",
    //                 chunk_size: 100*1024*1024,
    //             });
    //             assert.equal(action.err,ErrorCode.succ,action.log)
    //         })
    //         it("本地NDC put_data 发送Chunk 500MB",async()=>{
    //             // 创建测试任务
    //             let action =await new action_api.PutDataAction({
    //                 local: {
    //                     peer_name: "zone1_device1",
    //                     dec_id: dec_app_1.to_base_58(),
    //                     type: cyfs.CyfsStackRequestorType.Http
    //                 },
    //                 remote: {
    //                     peer_name: "zone1_ood",
    //                     dec_id: dec_app_1.to_base_58(),
    //                     type: cyfs.CyfsStackRequestorType.Http
    //                 },
    //                 input: {
    //                     timeout: 200 * 1000,
    //                 },
    //                 expect: { err: 0 },
    
    //             }).start({
    //                 object_type: "chunk",
    //                 chunk_size: 500*1024*1024,
    //             });
    //             assert.equal(action.err,ErrorCode.succ,action.log)
    //         })
    //         it.skip("【TS-SDK存在BUG会抛出异常 BUG未解决】本地NDC put_data 发送Chunk 1GB",async()=>{
    //             // 创建测试任务
    //             let action =await new action_api.PutDataAction({
    //                 local: {
    //                     peer_name: "zone1_device1",
    //                     dec_id: dec_app_1.to_base_58(),
    //                     type: cyfs.CyfsStackRequestorType.Http
    //                 },
    //                 remote: {
    //                     peer_name: "zone1_ood",
    //                     dec_id: dec_app_1.to_base_58(),
    //                     type: cyfs.CyfsStackRequestorType.Http
    //                 },
    //                 input: {
    //                     timeout: 200 * 1000,
    //                 },
    //                 expect: { err: 0 },
    
    //             }).start({
    //                 object_type: "chunk",
    //                 chunk_size: 1*1024*1024*1024,
    //             });
    //             assert.equal(action.err,ErrorCode.succ,action.log)
    //         })
    //     })
        
    // })
    
})