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


// npm run test ./testsuite/system-test/cyfs_lib/ndn/scenario_group_context/test_ndn_scenario.ts
// Development not implemented
// Waiting issuse# to fix
// cyfs.clog.enable_file_log({
//     name: "cyfs_stack",
//     dir: path.join(DirHelper.getLogDir(),"test_ndn_scenario"),
//     file_max_size: 1024 * 1024 * 10,
//     file_max_count: 10,
// });



describe("CYFS Stack NDN Integration Testing", function () {
    
    let test_runner =  CyfsTestRunner.createInstance();
    const stack_manager = test_runner.stack_manager;
    let logger : Logger;
    beforeAll(async function () {
        await new Promise(async resolve => {
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
    
    describe.only("System Testing: stack.ndn_service().put_data() ",()=>{
        describe.only(`put_data CyfsStackRequestorType: HTTP/WebSocket`,()=>{    
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
            it("NDC put_data chunk data by Http Requestor",async ()=>{
                // Create test Action
                let action = await new action_api.PutDataAction({
                    local: {
                        peer_name: "zone1_device1",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    remote: {
                        peer_name: "zone1_ood",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
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
        })
        describe(`put_data data type : Chunk/File/Dir+inner_path`,()=>{
            it("put_data send Chunk",async()=>{
                // 创建测试任务
                let action =await new action_api.PutDataAction({
                    local: {
                        peer_name: "zone1_device1",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    remote: {
                        peer_name: "zone1_ood",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
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
            it("put_data send File",async()=>{
                // 创建测试任务
                let action =await new action_api.PutDataAction({
                    local: {
                        peer_name: "zone1_device1",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    remote: {
                        peer_name: "zone1_ood",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    input: {
                        timeout: 200 * 1000,
                    },
                    expect: { err: 0 },
    
                }).start({
                    object_type: "file",
                    chunk_size: 4*1024*1024,
                    file_size : 10*1024*1024,
                });
                assert.equal(action.err,1,action.log)
            })
        })
        describe(`NDN put_data 发送数据大小测试 【不支持Stream形式，内存有限制】`,()=>{
            describe(`Chunk 数据大小测试`,()=>{
                it("本地NDC put_data 发送Chunk 50MB",async()=>{
                    // 创建测试任务
                    let action =await new action_api.PutDataAction({
                        local: {
                            peer_name: "zone1_device1",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        },
                        remote: {
                            peer_name: "zone1_ood",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        },
                        input: {
                            timeout: 200 * 1000,
                        },
                        expect: { err: 0 },
        
                    }).start({
                        object_type: "chunk",
                        chunk_size: 50*1024*1024,
                    });
                    assert.equal(action.err,ErrorCode.succ,action.log)
                })
                it("本地NDC put_data 发送Chunk 100MB",async()=>{
                    // 创建测试任务
                    let action =await new action_api.PutDataAction({
                        local: {
                            peer_name: "zone1_device1",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        },
                        remote: {
                            peer_name: "zone1_ood",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        },
                        input: {
                            timeout: 200 * 1000,
                        },
                        expect: { err: 0 },
        
                    }).start({
                        object_type: "chunk",
                        chunk_size: 100*1024*1024,
                    });
                    assert.equal(action.err,ErrorCode.succ,action.log)
                })
                it("本地NDC put_data 发送Chunk 500MB",async()=>{
                    // 创建测试任务
                    let action =await new action_api.PutDataAction({
                        local: {
                            peer_name: "zone1_device1",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        },
                        remote: {
                            peer_name: "zone1_ood",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        },
                        input: {
                            timeout: 200 * 1000,
                        },
                        expect: { err: 0 },
        
                    }).start({
                        object_type: "chunk",
                        chunk_size: 500*1024*1024,
                    });
                    assert.equal(action.err,ErrorCode.succ,action.log)
                })
                it.skip("【TS-SDK存在BUG会抛出异常 BUG未解决】本地NDC put_data 发送Chunk 1GB",async()=>{
                    // 创建测试任务
                    let action =await new action_api.PutDataAction({
                        local: {
                            peer_name: "zone1_device1",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        },
                        remote: {
                            peer_name: "zone1_ood",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        },
                        input: {
                            timeout: 200 * 1000,
                        },
                        expect: { err: 0 },
        
                    }).start({
                        object_type: "chunk",
                        chunk_size: 1*1024*1024*1024,
                    });
                    assert.equal(action.err,ErrorCode.succ,action.log)
                })
            })
            
        })
        

    })
    describe("System Testing: stack.ndn_service().get_data()",()=>{
        describe(`NDN get_data 基本流程HTTP+WebSocket`,()=>{
            it("本地NDC get_data chunk数据 - HTTP",async()=>{
                // 创建测试任务
                let path_id = RandomGenerator.string(20);
                let action =await new action_api.GetDataAction({
                    local: {
                        peer_name: "zone1_device1",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    remote: {
                        peer_name: "zone1_ood",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    input: {
                        timeout: 200 * 1000,
                        ndn_level:cyfs.NDNAPILevel.Router,
                        non_level : cyfs.NONAPILevel.Router,
                    },
                    expect: { err: 0 },
    
                }).start({
                    req_path:`/req_path/${path_id}`,
                    context:`/context_path/${path_id}`,
                    group:`/group_path/${path_id}`,
                    object_type: "chunk",
                    chunk_size: 10*1024*1024, 
                });
                assert.equal(action.err,ErrorCode.succ,action.log)
            })
            it("【大数据会出现异常 BUG未解决】本地NDC get_data chunk数据 - WebSocket",async()=>{
                // 创建测试任务
                let path_id = RandomGenerator.string(20);
                let action =await new action_api.GetDataAction({
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
                        ndn_level:cyfs.NDNAPILevel.Router,
                        non_level : cyfs.NONAPILevel.Router,
                    },
                    expect: { err: 0 },
    
                }).start({
                    req_path:`/req_path/${path_id}`,
                    context:`/context_path/${path_id}`,
                    group:`/group_path/${path_id}`,
                    object_type: "chunk",
                    chunk_size: 10*1024*1024, 
                });
                assert.equal(action.err,ErrorCode.succ,action.log)
            })
        })
        describe("get_data + group集成测试 ",()=>{
            it("get_data 设置group",async()=>{
                // 创建测试任务
                let path_id = RandomGenerator.string(20);
                let action =await new action_api.GetDataAction({
                    local: {
                        peer_name: "zone1_device1",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    remote: {
                        peer_name: "zone1_ood",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    input: {
                        timeout: 200 * 1000,
                        ndn_level:cyfs.NDNAPILevel.Router,
                        non_level : cyfs.NONAPILevel.Router,
                    },
                    expect: { err: 0 },
    
                }).start({
                    req_path:`/req_path/${path_id}`,
                    context:`/context_path/${path_id}`,
                    group:`/group_path/${path_id}`,
                    object_type: "chunk",
                    chunk_size: 10*1024*1024, 
                });
                assert.equal(action.err,ErrorCode.succ,action.log)
            })
            it("get_data 不设置group",async()=>{
                // 创建测试任务
                let path_id = RandomGenerator.string(20);
                let action =await new action_api.GetDataAction({
                    local: {
                        peer_name: "zone1_device1",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    remote: {
                        peer_name: "zone1_ood",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    input: {
                        timeout: 200 * 1000,
                        ndn_level:cyfs.NDNAPILevel.Router,
                        non_level : cyfs.NONAPILevel.Router,
                    },
                    expect: { err: 0 },
    
                }).start({
                    req_path:`/req_path/${path_id}`,
                    context:`/context_path/${path_id}`,
                    object_type: "chunk",
                    chunk_size: 10*1024*1024, 
                });
                assert.equal(action.err,ErrorCode.succ,action.log)
            })
        })
        describe("get_data + context集成测试 ",()=>{
            it("get_data 设置context",async()=>{
                // 创建测试任务
                let path_id = RandomGenerator.string(20);
                let action =await new action_api.GetDataAction({
                    local: {
                        peer_name: "zone1_device1",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    remote: {
                        peer_name: "zone1_ood",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    input: {
                        timeout: 200 * 1000,
                        ndn_level:cyfs.NDNAPILevel.Router,
                        non_level : cyfs.NONAPILevel.Router,
                    },
                    expect: { err: 0 },
    
                }).start({
                    req_path:`/req_path/${path_id}`,
                    context:`/context_path/${path_id}`,
                    group:`/group_path/${path_id}`,
                    object_type: "chunk",
                    chunk_size: 10*1024*1024, 
                });
                assert.equal(action.err,ErrorCode.succ,action.log)
            })
            it("get_data 不设置context",async()=>{
                // 创建测试任务
                let path_id = RandomGenerator.string(20);
                let action =await new action_api.GetDataAction({
                    local: {
                        peer_name: "zone1_device1",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    remote: {
                        peer_name: "zone1_ood",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    input: {
                        timeout: 200 * 1000,
                        ndn_level:cyfs.NDNAPILevel.Router,
                        non_level : cyfs.NONAPILevel.Router,
                    },
                    expect: { err: 0 },
    
                }).start({
                    req_path:`/req_path/${path_id}`,
                    group:`/group_path/${path_id}`,
                    object_type: "chunk",
                    chunk_size: 10*1024*1024, 
                });
                assert.equal(action.err,ErrorCode.succ,action.log)
            })
            describe("context 路径间的父子关系", () => {
                //  通过 context_path 路径树 每十秒向上匹配context对象   /a/b/c -> /a/b/ -> /a -> /
                //  一个周期内 通过 context 对象 中的下载源 下载文件
                describe("context_path  子路径继承父路径context对象 规则校验",() => {
                    
                    it("路径/context_path/${path_id}/ 关联有效context，创建下载任务下载文件成功 ", async () => {
                        let path_id = RandomGenerator.string(20);
                        // 先设置context
                        let context_action = await new action_api.PutContextAction({
                            local: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                                ndn_level:cyfs.NDNAPILevel.Router,
                                non_level : cyfs.NONAPILevel.Router,
                            },
                            expect: { err: 0 },
                        }).start({
                            context_path : `/context_path/${path_id}`, 
                            chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                            deviceid_list: [
                                stack_manager.get_device_id({
                                    peer_name: "zone1_ood",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                }).device_id!
                            ]
                        })
                        // 然后get_data
                        let action =await new action_api.GetDataAction({
                            local: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            remote: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                                ndn_level:cyfs.NDNAPILevel.Router,
                                non_level : cyfs.NONAPILevel.Router,
                            },
                            expect: { err: 0 },
                        }).start({
                            req_path:`/req_path/${path_id}`,
                            group:`/group_path/${path_id}`,
                            context : `/context_path/${path_id}`, 
                            object_type: "chunk",
                            chunk_size: 10*1024*1024, 
                            not_set_context:true,
                        });
                        assert.equal(action.err,ErrorCode.succ,action.log)
                    })
                    it("路径/context_path/${path_id}/ 未关联有效context，创建下载任务下载文件失败 ", async () => {
                        let path_id = RandomGenerator.string(20);
                        // 先设置context
                        let context_action = await new action_api.PutContextAction({
                            local: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                                ndn_level:cyfs.NDNAPILevel.Router,
                                non_level : cyfs.NONAPILevel.Router,
                            },
                            expect: { err: 0 },
                        }).start({
                            context_path : `/context_path/${path_id}`, 
                            chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                            deviceid_list: [
                                stack_manager.get_device_id({
                                    peer_name: "zone1_device2",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                }).device_id!
                            ]
                        })
                        // 然后get_data
                        let action =await new action_api.GetDataAction({
                            local: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            remote: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                                ndn_level:cyfs.NDNAPILevel.Router,
                                non_level : cyfs.NONAPILevel.Router,
                            },
                            expect: { err: 0 },
                        }).start({
                            req_path:`/req_path/${path_id}`,
                            group:`/group_path/${path_id}`,
                            context : `/context_path/${path_id}`, 
                            object_type: "chunk",
                            chunk_size: 10*1024*1024, 
                            not_set_context:true,
                        });
                        assert.equal(action.err,4,action.log)
                    })
                    it("子路径/context_path/${path_id}/task1 未设置context 继承父context_path(下载源有效) 创建下载任务下载文件成功", async () => {
                        let path_id = RandomGenerator.string(20);
                        // 先设置context
                        let context_action = await new action_api.PutContextAction({
                            local: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                                ndn_level:cyfs.NDNAPILevel.Router,
                                non_level : cyfs.NONAPILevel.Router,
                            },
                            expect: { err: 0 },
                        }).start({
                            context_path : `/context_path/${path_id}`, 
                            chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                            deviceid_list: [
                                stack_manager.get_device_id({
                                    peer_name: "zone1_ood",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                }).device_id!
                            ]
                        })
                        // 然后get_data
                        let action =await new action_api.GetDataAction({
                            local: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            remote: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                                ndn_level:cyfs.NDNAPILevel.Router,
                                non_level : cyfs.NONAPILevel.Router,
                            },
                            expect: { err: 0 },
                        }).start({
                            req_path:`/req_path/${path_id}`,
                            group:`/group_path/${path_id}`,
                            context : `/context_path/${path_id}/task1`, 
                            object_type: "chunk",
                            chunk_size: 10*1024*1024, 
                            not_set_context:true,
                        });
                        assert.equal(action.err,ErrorCode.succ,action.log)
                    })
                    it("子路径/context_path/${path_id}/task2 未设置context 继承父context_path(下载源无效) 创建下载任务下载文件失败", async () => {
                        let path_id = RandomGenerator.string(20);
                        // 先设置context
                        let context_action = await new action_api.PutContextAction({
                            local: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                                ndn_level:cyfs.NDNAPILevel.Router,
                                non_level : cyfs.NONAPILevel.Router,
                            },
                            expect: { err: 0 },
                        }).start({
                            context_path : `/context_path/${path_id}`, 
                            chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                            deviceid_list: [
                                stack_manager.get_device_id({
                                    peer_name: "zone1_device2",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                }).device_id!
                            ]
                        })
                        // 然后get_data
                        let action =await new action_api.GetDataAction({
                            local: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            remote: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 60 * 1000,
                                ndn_level:cyfs.NDNAPILevel.Router,
                                non_level : cyfs.NONAPILevel.Router,
                            },
                            expect: { err: 0 },
                        }).start({
                            req_path:`/req_path/${path_id}`,
                            group:`/group_path/${path_id}`,
                            context : `/context_path/${path_id}/task2`, 
                            object_type: "chunk",
                            chunk_size: 10*1024*1024, 
                            not_set_context:true,
                        });
                        assert.equal(action.err,4,action.log) 
                    })
                    it("子路径/context_path/${path_id}/task3 设置新context包含有效下载源 ,使用子context创建下载任务下载文件成功", async () => {
                        let path_id = RandomGenerator.string(20);
                        // 先设置context
                        let context_action = await new action_api.PutContextAction({
                            local: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                                ndn_level:cyfs.NDNAPILevel.Router,
                                non_level : cyfs.NONAPILevel.Router,
                            },
                            expect: { err: 0 },
                        }).start({
                            context_path : `/context_path/${path_id}`, 
                            chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                            deviceid_list: [
                                stack_manager.get_device_id({
                                    peer_name: "zone1_device2",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                }).device_id!
                            ]
                        })
                        let context_action_child = await new action_api.PutContextAction({
                            local: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 60 * 1000,
                                ndn_level:cyfs.NDNAPILevel.Router,
                                non_level : cyfs.NONAPILevel.Router,
                            },
                            expect: { err: 0 },
                        }).start({
                            context_path : `/context_path/${path_id}/task3`, 
                            chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                            deviceid_list: [
                                stack_manager.get_device_id({
                                    peer_name: "zone1_ood",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                }).device_id!
                            ]
                        })
                        // 然后get_data
                        let action_get_run = new action_api.GetDataAction({
                            local: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            remote: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 60 * 1000,
                                ndn_level:cyfs.NDNAPILevel.Router,
                                non_level : cyfs.NONAPILevel.Router,
                            },
                            expect: { err: 0 },
                        }).start({
                            req_path:`/req_path/${path_id}`,
                            group:`/group_path/${path_id}`,
                            context : `/context_path/${path_id}/task3`, 
                            object_type: "chunk",
                            chunk_size: 10*1024*1024, 
                            not_set_context:true,
                        });
            
                        
                        let action_get = await action_get_run
                        assert.equal(action_get.err,ErrorCode.succ,action_get.log)      
                    })
                    it("子路径/context_path/${path_id}/task3 设置新context包含无效下载源 ,使用子context创建下载任务下载文件失败", async () => {
                        let path_id = RandomGenerator.string(20);
                        // 先设置context
                        let context_action = await new action_api.PutContextAction({
                            local: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                                ndn_level:cyfs.NDNAPILevel.Router,
                                non_level : cyfs.NONAPILevel.Router,
                            },
                            expect: { err: 0 },
                        }).start({
                            context_path : `/context_path/${path_id}`, 
                            chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                            deviceid_list: [
                                stack_manager.get_device_id({
                                    peer_name: "zone1_ood",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                }).device_id!
                            ]
                        })
                        let context_action_child = await new action_api.PutContextAction({
                            local: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 60 * 1000,
                                ndn_level:cyfs.NDNAPILevel.Router,
                                non_level : cyfs.NONAPILevel.Router,
                            },
                            expect: { err: 0 },
                        }).start({
                            context_path : `/context_path/${path_id}/task3`, 
                            chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                            deviceid_list: [
                                stack_manager.get_device_id({
                                    peer_name: "zone1_device2",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                }).device_id!
                            ]
                        })
                        // 然后get_data
                        let action_get_run = new action_api.GetDataAction({
                            local: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            remote: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 60 * 1000,
                                ndn_level:cyfs.NDNAPILevel.Router,
                                non_level : cyfs.NONAPILevel.Router,
                            },
                            expect: { err: 0 },
                        }).start({
                            req_path:`/req_path/${path_id}`,
                            group:`/group_path/${path_id}`,
                            context : `/context_path/${path_id}/task3`, 
                            object_type: "chunk",
                            chunk_size: 10*1024*1024, 
                            not_set_context:true,
                        });
            
                       
                        let action_get = await action_get_run
                        assert.equal(action_get.err,4,action_get.log)      
                    })
                })
                describe("通过 context_path 子路径更新 ，覆盖原有 父路径context 下载源", () => {
                    
                    it("【不支持更新】子路径/context_path/${path_id}/task1 未设置context 继承父context_path 创建下载任务下载文件失败 -> 子路径添加有效context -> task通过子路径context下载成功", async () => {
                        let path_id = RandomGenerator.string(20);
                        // 先设置context
                        let context_action = await new action_api.PutContextAction({
                            local: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                                ndn_level:cyfs.NDNAPILevel.Router,
                                non_level : cyfs.NONAPILevel.Router,
                            },
                            expect: { err: 0 },
                        }).start({
                            context_path : `/context_path/${path_id}`, 
                            chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                            deviceid_list: [
                                stack_manager.get_device_id({
                                    peer_name: "zone1_device2",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                }).device_id!
                            ]
                        })
                        // 然后get_data
                        let action_get_run = new action_api.GetDataAction({
                            local: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            remote: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 60 * 1000,
                                ndn_level:cyfs.NDNAPILevel.Router,
                                non_level : cyfs.NONAPILevel.Router,
                            },
                            expect: { err: 0 },
                        }).start({
                            req_path:`/req_path/${path_id}`,
                            group:`/group_path/${path_id}`,
                            context : `/context_path/${path_id}/task3`, 
                            object_type: "chunk",
                            chunk_size: 10*1024*1024, 
                            not_set_context:true,
                        });
                        await sleep(5*1000);
                        let context_action_child = await new action_api.PutContextAction({
                            local: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 60 * 1000,
                                ndn_level:cyfs.NDNAPILevel.Router,
                                non_level : cyfs.NONAPILevel.Router,
                            },
                            expect: { err: 0 },
                        }).start({
                            context_path : `/context_path/${path_id}/task3`, 
                            chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                            deviceid_list: [
                                stack_manager.get_device_id({
                                    peer_name: "zone1_ood",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                }).device_id!
                            ]
                        })
                        let action_get = await action_get_run
                        assert.equal(action_get.err,4,action_get.log) 
                    })
                    it("错误用法：子路径/context_path/${path_id}/task3 未设置context 继承父context_path 创建下载任务下载文件下载中 -> 子路径添加无效context -> task通过子路径context下载失败", async () => {
                        let path_id = RandomGenerator.string(20);
                        // 先设置context
                        let context_action = await new action_api.PutContextAction({
                            local: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                                ndn_level:cyfs.NDNAPILevel.Router,
                                non_level : cyfs.NONAPILevel.Router,
                            },
                            expect: { err: 0 },
                        }).start({
                            context_path : `/context_path/${path_id}`, 
                            chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                            deviceid_list: [
                                stack_manager.get_device_id({
                                    peer_name: "zone1_ood",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                }).device_id!
                            ]
                        })
                        // 然后get_data
                        let action_get_run = new action_api.GetDataAction({
                            local: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            remote: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 60 * 1000,
                                ndn_level:cyfs.NDNAPILevel.Router,
                                non_level : cyfs.NONAPILevel.Router,
                            },
                            expect: { err: 0 },
                        }).start({
                            req_path:`/req_path/${path_id}`,
                            group:`/group_path/${path_id}`,
                            context : `/context_path/${path_id}/task3`, 
                            object_type: "chunk",
                            chunk_size: 10*1024*1024, 
                            not_set_context:true,
                        });
                        await sleep(5*1000);
                        let context_action_child = await new action_api.PutContextAction({
                            local: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 60 * 1000,
                                ndn_level:cyfs.NDNAPILevel.Router,
                                non_level : cyfs.NONAPILevel.Router,
                            },
                            expect: { err: 0 },
                        }).start({
                            context_path : `/context_path/${path_id}/task3`, 
                            chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                            deviceid_list: [
                                stack_manager.get_device_id({
                                    peer_name: "zone1_device2",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                }).device_id!
                            ]
                        })
                        let action_get = await action_get_run
                    })
                })
            })
            describe("context_path下关联的context 对象", () => {
                it("异常场景：context_path 未关联context 对象，创建传输任务", async () => {
                    let path_id = RandomGenerator.string(20);
                    // 先设置context
                    // 然后get_data
                    let action =await new action_api.GetDataAction({
                        local: {
                            peer_name: "zone1_device1",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        },
                        remote: {
                            peer_name: "zone1_ood",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        },
                        input: {
                            timeout: 200 * 1000,
                            ndn_level:cyfs.NDNAPILevel.Router,
                            non_level : cyfs.NONAPILevel.Router,
                        },
                        expect: { err: 0 },
                    }).start({
                        req_path:`/req_path/${path_id}`,
                        group:`/group_path/${path_id}`,
                        context : `/context_path/${path_id}`, 
                        object_type: "chunk",
                        chunk_size: 10*1024*1024, 
                        not_set_context:true,
                    });
                    assert.equal(action.err,4,action.log)   
                })
                it("【不支持更新】更新context对象下载源，完成下载", async () => {
                    let path_id = RandomGenerator.string(20);
                        // 先设置context
                        let context_action = await new action_api.PutContextAction({
                            local: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                                ndn_level:cyfs.NDNAPILevel.Router,
                                non_level : cyfs.NONAPILevel.Router,
                            },
                            expect: { err: 0 },
                        }).start({
                            context_path : `/context_path/${path_id}`, 
                            chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                            deviceid_list: [
                                stack_manager.get_device_id({
                                    peer_name: "zone1_device2",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                }).device_id!
                            ]
                        })
                        // 然后get_data
                        let action_get_run = new action_api.GetDataAction({
                            local: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            remote: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 60 * 1000,
                                ndn_level:cyfs.NDNAPILevel.Router,
                                non_level : cyfs.NONAPILevel.Router,
                            },
                            expect: { err: 0 },
                        }).start({
                            req_path:`/req_path/${path_id}`,
                            group:`/group_path/${path_id}`,
                            context : `/context_path/${path_id}`, 
                            object_type: "chunk",
                            chunk_size: 10*1024*1024, 
                            not_set_context:true,
                        });
                        await sleep(5*1000);
                        let context_action_child = await new action_api.PutContextAction({
                            local: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 60 * 1000,
                                ndn_level:cyfs.NDNAPILevel.Router,
                                non_level : cyfs.NONAPILevel.Router,
                            },
                            expect: { err: 0 },
                        }).start({
                            context_path : `/context_path/${path_id}`, 
                            chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                            deviceid_list: [
                                stack_manager.get_device_id({
                                    peer_name: "zone1_ood",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                }).device_id!
                            ]
                        })
                        let action_get = await action_get_run
                        assert.equal(action_get.err,4,action_get.log) 
                })

                describe("context_path下关联多个context对象复合场景", () => {
                    // 前置条件准备： zone1_device1 zone1_ood 可提供下载
                    let path_id = RandomGenerator.string(20)
                    let chunk_info : {object_id:cyfs.ObjectId,md5:string}
                    beforeEach(async () => {
                        // 设置当前用例id 方便日志定位问题
                        // 创建监听器
                        path_id = RandomGenerator.string(20)
                        // 先设置context
                        let context_action = await new action_api.PutContextAction({
                            local: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                                ndn_level:cyfs.NDNAPILevel.Router,
                                non_level : cyfs.NONAPILevel.Router,
                            },
                            expect: { err: 0 },
                        }).start({
                            context_path : `/context_path/${path_id}`, 
                            chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                            deviceid_list: [
                                stack_manager.get_device_id({
                                    peer_name: "zone1_ood",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                }).device_id!
                            ]
                        })
                        // 然后get_data
                        let action =await new action_api.GetDataAction({
                            local: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            remote: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                                ndn_level:cyfs.NDNAPILevel.Router,
                                non_level : cyfs.NONAPILevel.Router,
                            },
                            expect: { err: 0 },
                        }).start({
                            req_path:`/req_path/${path_id}`,
                            group:`/group_path/${path_id}`,
                            context : `/context_path/${path_id}`, 
                            object_type: "chunk",
                            chunk_size: 10*1024*1024, 
                            not_set_context:true,
                        });
                        assert.equal(action.err,0,action.log)
                        chunk_info = {object_id :action.resp?.object_id!,md5:action.resp?.md5!}
                    })
                    describe("【NDN 目前只支持一个Device】单个context对象内device_list 配置", () => {

                        it("device_list 包含一个下载源 无效", async () => {
                            let child_id = RandomGenerator.string(20);
                            let context_action = await new action_api.PutContextAction({
                                local: {
                                    peer_name: "zone1_device2",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                input: {
                                    timeout: 200 * 1000,
                                    ndn_level:cyfs.NDNAPILevel.Router,
                                    non_level : cyfs.NONAPILevel.Router,
                                },
                                expect: { err: 0 },
                            }).start({
                                context_path : `/context_path/${path_id}/${child_id}`, 
                                chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                                deviceid_list: [
                                    stack_manager.get_device_id({
                                        peer_name: "zone2_ood",
                                        dec_id: dec_app_1.to_base_58(),
                                        type: cyfs.CyfsStackRequestorType.Http
                                    }).device_id!
                                ]
                            })
                            // 然后get_data
                            let action =await new action_api.GetDataAction({
                                local: {
                                    peer_name: "zone1_device2",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                remote: {
                                    peer_name: "zone1_ood",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                input: {
                                    timeout: 200 * 1000,
                                    ndn_level:cyfs.NDNAPILevel.Router,
                                    non_level : cyfs.NONAPILevel.Router,
                                },
                                expect: { err: 0 },
                            }).start({
                                req_path:`/req_path/${path_id}`,
                                group:`/group_path/${path_id}`,
                                context : `/context_path/${path_id}/${child_id}`, 
                                object_type: "object_id",
                                object_id: chunk_info.object_id!,
                                md5: chunk_info.md5!,
                                chunk_size: 10*1024*1024, 
                                not_set_context:true,
                            });
                            assert.equal(action.err,12,action.log)

                        })
                        it("device_list 包含一个下载源 有效", async () => {
                            let child_id = RandomGenerator.string(20);
                            let context_action = await new action_api.PutContextAction({
                                local: {
                                    peer_name: "zone1_device2",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                input: {
                                    timeout: 200 * 1000,
                                    ndn_level:cyfs.NDNAPILevel.Router,
                                    non_level : cyfs.NONAPILevel.Router,
                                },
                                expect: { err: 0 },
                            }).start({
                                context_path : `/context_path/${path_id}/${child_id}`, 
                                chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                                deviceid_list: [
                                    stack_manager.get_device_id({
                                        peer_name: "zone1_ood",
                                        dec_id: dec_app_1.to_base_58(),
                                        type: cyfs.CyfsStackRequestorType.Http
                                    }).device_id!
                                ]
                            })
                            // 然后get_data
                            let action =await new action_api.GetDataAction({
                                local: {
                                    peer_name: "zone1_device2",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                remote: {
                                    peer_name: "zone1_ood",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                input: {
                                    timeout: 200 * 1000,
                                    ndn_level:cyfs.NDNAPILevel.Router,
                                    non_level : cyfs.NONAPILevel.Router,
                                },
                                expect: { err: 0 },
                            }).start({
                                req_path:`/req_path/${path_id}`,
                                group:`/group_path/${path_id}`,
                                context : `/context_path/${path_id}/${child_id}`, 
                                object_type: "object_id",
                                object_id: chunk_info.object_id!,
                                md5: chunk_info.md5!,
                                chunk_size: 10*1024*1024, 
                                not_set_context:true,
                            });
                            assert.equal(action.err,0,action.log)
                        })
                        it("device_list 包含两个下载源 全部有效", async () => {
                            let child_id = RandomGenerator.string(20);
                            let context_action = await new action_api.PutContextAction({
                                local: {
                                    peer_name: "zone1_device2",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                input: {
                                    timeout: 200 * 1000,
                                    ndn_level:cyfs.NDNAPILevel.Router,
                                    non_level : cyfs.NONAPILevel.Router,
                                },
                                expect: { err: 0 },
                            }).start({
                                context_path : `/context_path/${path_id}/${child_id}`, 
                                chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                                deviceid_list: [
                                    stack_manager.get_device_id({
                                        peer_name: "zone1_ood",
                                        dec_id: dec_app_1.to_base_58(),
                                        type: cyfs.CyfsStackRequestorType.Http
                                    }).device_id!,
                                    stack_manager.get_device_id({
                                        peer_name: "zone1_device1",
                                        dec_id: dec_app_1.to_base_58(),
                                        type: cyfs.CyfsStackRequestorType.Http
                                    }).device_id!
                                ]
                            })
                            // 然后get_data
                            let action =await new action_api.GetDataAction({
                                local: {
                                    peer_name: "zone1_device2",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                remote: {
                                    peer_name: "zone1_ood",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                input: {
                                    timeout: 200 * 1000,
                                    ndn_level:cyfs.NDNAPILevel.Router,
                                    non_level : cyfs.NONAPILevel.Router,
                                },
                                expect: { err: 0 },
                            }).start({
                                req_path:`/req_path/${path_id}`,
                                group:`/group_path/${path_id}`,
                                context : `/context_path/${path_id}/${child_id}`, 
                                object_type: "object_id",
                                object_id: chunk_info.object_id!,
                                md5: chunk_info.md5!,
                                chunk_size: 10*1024*1024, 
                                not_set_context:true,
                            });
                            assert.equal(action.err,0,action.log)
                        })
                        it("device_list 包含两个下载源 全部无效", async () => {
                            let child_id = RandomGenerator.string(20);
                            let context_action = await new action_api.PutContextAction({
                                local: {
                                    peer_name: "zone1_device2",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                input: {
                                    timeout: 200 * 1000,
                                    ndn_level:cyfs.NDNAPILevel.Router,
                                    non_level : cyfs.NONAPILevel.Router,
                                },
                                expect: { err: 0 },
                            }).start({
                                context_path : `/context_path/${path_id}/${child_id}`, 
                                chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                                deviceid_list: [
                                    stack_manager.get_device_id({
                                        peer_name: "zone2_ood",
                                        dec_id: dec_app_1.to_base_58(),
                                        type: cyfs.CyfsStackRequestorType.Http
                                    }).device_id!,
                                    stack_manager.get_device_id({
                                        peer_name: "zone2_device1",
                                        dec_id: dec_app_1.to_base_58(),
                                        type: cyfs.CyfsStackRequestorType.Http
                                    }).device_id!
                                ]
                            })
                            // 然后get_data
                            let action =await new action_api.GetDataAction({
                                local: {
                                    peer_name: "zone1_device2",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                remote: {
                                    peer_name: "zone1_ood",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                input: {
                                    timeout: 200 * 1000,
                                    ndn_level:cyfs.NDNAPILevel.Router,
                                    non_level : cyfs.NONAPILevel.Router,
                                },
                                expect: { err: 0 },
                            }).start({
                                req_path:`/req_path/${path_id}`,
                                group:`/group_path/${path_id}`,
                                context : `/context_path/${path_id}/${child_id}`, 
                                object_type: "object_id",
                                object_id: chunk_info.object_id!,
                                md5: chunk_info.md5!,
                                chunk_size: 10*1024*1024, 
                                not_set_context:true,
                            });
                            assert.equal(action.err,12,action.log)
                        })
                        it("device_list 包含两个下载源 无效+有效", async () => {
                            let child_id = RandomGenerator.string(20);
                            let context_action = await new action_api.PutContextAction({
                                local: {
                                    peer_name: "zone1_device2",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                input: {
                                    timeout: 200 * 1000,
                                    ndn_level:cyfs.NDNAPILevel.Router,
                                    non_level : cyfs.NONAPILevel.Router,
                                },
                                expect: { err: 0 },
                            }).start({
                                context_path : `/context_path/${path_id}/${child_id}`, 
                                chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                                deviceid_list: [
                                    stack_manager.get_device_id({
                                        peer_name: "zone2_ood",
                                        dec_id: dec_app_1.to_base_58(),
                                        type: cyfs.CyfsStackRequestorType.Http
                                    }).device_id!,
                                    stack_manager.get_device_id({
                                        peer_name: "zone1_device1",
                                        dec_id: dec_app_1.to_base_58(),
                                        type: cyfs.CyfsStackRequestorType.Http
                                    }).device_id!
                                ]
                            })
                            // 然后get_data
                            let action =await new action_api.GetDataAction({
                                local: {
                                    peer_name: "zone1_device2",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                remote: {
                                    peer_name: "zone1_ood",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                input: {
                                    timeout: 200 * 1000,
                                    ndn_level:cyfs.NDNAPILevel.Router,
                                    non_level : cyfs.NONAPILevel.Router,
                                },
                                expect: { err: 0 },
                            }).start({
                                req_path:`/req_path/${path_id}`,
                                group:`/group_path/${path_id}`,
                                context : `/context_path/${path_id}/${child_id}`, 
                                object_type: "object_id",
                                object_id: chunk_info.object_id!,
                                md5: chunk_info.md5!,
                                chunk_size: 10*1024*1024, 
                                not_set_context:true,
                            });
                            assert.equal(action.err,4,action.log)
                        })
                        it("device_list 包含两个下载源 有效+无效", async () => {
                            let child_id = RandomGenerator.string(20);
                            let context_action = await new action_api.PutContextAction({
                                local: {
                                    peer_name: "zone1_device2",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                input: {
                                    timeout: 200 * 1000,
                                    ndn_level:cyfs.NDNAPILevel.Router,
                                    non_level : cyfs.NONAPILevel.Router,
                                },
                                expect: { err: 0 },
                            }).start({
                                context_path : `/context_path/${path_id}/${child_id}`, 
                                chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                                deviceid_list: [
                                    stack_manager.get_device_id({
                                        peer_name: "zone1_ood",
                                        dec_id: dec_app_1.to_base_58(),
                                        type: cyfs.CyfsStackRequestorType.Http
                                    }).device_id!,
                                    stack_manager.get_device_id({
                                        peer_name: "zone2_device1",
                                        dec_id: dec_app_1.to_base_58(),
                                        type: cyfs.CyfsStackRequestorType.Http
                                    }).device_id!
                                ]
                            })
                            // 然后get_data
                            let action =await new action_api.GetDataAction({
                                local: {
                                    peer_name: "zone1_device2",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                remote: {
                                    peer_name: "zone1_ood",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                input: {
                                    timeout: 200 * 1000,
                                    ndn_level:cyfs.NDNAPILevel.Router,
                                    non_level : cyfs.NONAPILevel.Router,
                                },
                                expect: { err: 0 },
                            }).start({
                                req_path:`/req_path/${path_id}`,
                                group:`/group_path/${path_id}`,
                                context : `/context_path/${path_id}/${child_id}`, 
                                object_type: "object_id",
                                object_id: chunk_info.object_id!,
                                md5: chunk_info.md5!,
                                chunk_size: 10*1024*1024, 
                                not_set_context:true,
                            });
                            assert.equal(action.err,0,action.log)
                        })

                    })
                    
                    

                })
                describe("context_path 下关联context chunk_codec_desc 类型",  () => {
                    it("chunk_codec_desc 类型为stream", async () => {
                        // 创建监听器
                        let path_id = RandomGenerator.string(20)
                        let action_handler = new action_api.RegisterCommonHandler({
                            local: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                            },
                            expect: { err: 0 },

                        });

                        let result_handler = await action_handler.start({
                            req_path: `/req_path/${path_id}`,
                        });
                        assert.equal(result_handler.err, 0, result_handler.log)
                        // 创建测试任务 local -> remote
                        let action = new action_api.PrepareFileTask({
                            local: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            remote: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                                file_size: 10 * 1024 * 1024,
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        });

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                            auto_start: true,
                            deviceid_list: [
                                stack_manager.get_device_id({
                                    peer_name: "zone1_device1",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                }).device_id!.object_id,
                            ],
                            chunk_codec_desc : {stream:[0,0,0]}
                            
                        });
                        assert.equal(result.err, 0, result.log);
                        let check_finished = await new action_api.WaitTaskFinished({
                            local: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 60 * 1000,
                            },
                            expect: { err: 0 },

                        }).start({
                            task_id: result.resp!.task_id!
                        })
                        assert.equal(check_finished.err, 0, check_finished.log)
                    })
                    it.skip("【未实现，暂不运行】chunk_codec_desc 类型为unknown", async () => {
                        // 创建监听器
                        let path_id = RandomGenerator.string(20)
                        let action_handler = new action_api.RegisterCommonHandler({
                            local: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                            },
                            expect: { err: 0 },

                        });

                        let result_handler = await action_handler.start({
                            req_path: `/req_path/${path_id}`,
                        });
                        assert.equal(result_handler.err, 0, result_handler.log)
                        // 创建测试任务 local -> remote
                        let action = new action_api.PrepareFileTask({
                            local: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            remote: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                                file_size: 10 * 1024 * 1024,
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        });

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}/`,
                            group: `/group/${path_id}`,
                            auto_start: true,
                            deviceid_list: [
                                stack_manager.get_device_id({
                                    peer_name: "zone1_device1",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                }).device_id!.object_id,
                            ],
                            chunk_codec_desc : {unknown:true}
                            
                        });
                        assert.equal(result.err, 0, result.log);
                        let check_finished = await new action_api.WaitTaskFinished({
                            local: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 60 * 1000,
                            },
                            expect: { err: 0 },

                        }).start({
                            task_id: result.resp!.task_id!
                        })
                        assert.equal(check_finished.err, 0, check_finished.log)
                    })
                    it.skip("【未实现，暂不运行】chunk_codec_desc 类型为raptor", async () => {
                        // 创建监听器
                        let path_id = RandomGenerator.string(20)
                        let action_handler = new action_api.RegisterCommonHandler({
                            local: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                            },
                            expect: { err: 0 },

                        });

                        let result_handler = await action_handler.start({
                            req_path: `/req_path/${path_id}`,
                        });
                        assert.equal(result_handler.err, 0, result_handler.log)
                        // 创建测试任务 local -> remote
                        let action = new action_api.PrepareFileTask({
                            local: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            remote: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                                file_size: 10 * 1024 * 1024,
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        });

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}/`,
                            group: `/group/${path_id}`,
                            auto_start: true,
                            deviceid_list: [
                                stack_manager.get_device_id({
                                    peer_name: "zone1_device1",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                }).device_id!.object_id,
                            ],
                            chunk_codec_desc : {raptor:[0,0,0]}
                            
                        });
                        assert.equal(result.err, 0, result.log);
                        let check_finished = await new action_api.WaitTaskFinished({
                            local: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 60 * 1000,
                            },
                            expect: { err: 0 },

                        }).start({
                            task_id: result.resp!.task_id!
                        })
                        assert.equal(check_finished.err, 0, check_finished.log)
                    })
                })

            })
        })
        describe("get_data 构建context_path 和 group_path树 ",()=>{
            it("构建树结构，同步执行 HTTP",async()=>{
                // 
                let path_id = RandomGenerator.string(20)
                let trans_file_tree_action =await new action_api.BuildGetDataGroupTreeAsync({
                    local: {
                        peer_name: "zone1_device1",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    remote: {
                        peer_name: "zone1_ood",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    input: {
                        timeout: 200 * 1000,
                        file_size: 10 * 1024 * 1024,
                        chunk_size: 4 * 1024 * 1024,
                        non_level: cyfs.NONAPILevel.NON,
                        ndn_level: cyfs.NDNAPILevel.NDN,
                    },
                    expect: { err: 0 },

                }).start({
                    root_req_path: `/req_path/${path_id}`,
                    task_list: [
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id}/groupA/task0`,
                            context_path: `/context_path/${path_id}/groupA`,
                            group: `/group_path/${path_id}/groupA/`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id}/groupA/task1`,
                            context_path: `/context_path/${path_id}/groupA/task1`,
                            group: `/group_path/${path_id}/groupA/task1`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id}/groupA/task2`,
                            context_path: `/context_path/${path_id}/groupA/task2`,
                            group: `/group_path/${path_id}/groupA/task2`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id}/groupB/task0`,
                            context_path: `/context_path/${path_id}/groupB`,
                            group: `/group_path/${path_id}/groupB/`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id}/groupB/task1`,
                            context_path: `/context_path/${path_id}/groupB/task1`,
                            group: `/group_path/${path_id}/groupB/task1`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id}/groupB/task2`,
                            context_path: `/context_path/${path_id}/groupB/task1`,
                            group: `/group_path/${path_id}/groupB/task2`
                        },
                    ]
                });
                assert.equal(trans_file_tree_action.err,0,trans_file_tree_action.log);
                let path_id_ws = RandomGenerator.string(20)
                let trans_file_tree_action_ws =await new action_api.BuildGetDataGroupTreeAsync({
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
                        file_size: 10 * 1024 * 1024,
                        chunk_size: 4 * 1024 * 1024,
                        non_level: cyfs.NONAPILevel.NON,
                        ndn_level: cyfs.NDNAPILevel.NDN,
                    },
                    expect: { err: 0 },

                }).start({
                    root_req_path: `/req_path/${path_id_ws}`,
                    task_list: [
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id_ws}/groupA/task0`,
                            context_path: `/context_path/${path_id_ws}/groupA`,
                            group: `/group_path/${path_id_ws}/groupA/`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id_ws}/groupA/task1`,
                            context_path: `/context_path/${path_id_ws}/groupA/task1`,
                            group: `/group_path/${path_id_ws}/groupA/task1`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id_ws}/groupA/task2`,
                            context_path: `/context_path/${path_id_ws}/groupA/task2`,
                            group: `/group_path/${path_id_ws}/groupA/task2`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id_ws}/groupB/task0`,
                            context_path: `/context_path/${path_id_ws}/groupB`,
                            group: `/group_path/${path_id_ws}/groupB/`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id_ws}/groupB/task1`,
                            context_path: `/context_path/${path_id_ws}/groupB/task1`,
                            group: `/group_path/${path_id_ws}/groupB/task1`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id_ws}/groupB/task2`,
                            context_path: `/context_path/${path_id_ws}/groupB/task1`,
                            group: `/group_path/${path_id_ws}/groupB/task2`
                        },
                    ]
                });
                assert.equal(trans_file_tree_action_ws.err,0,trans_file_tree_action_ws.log);
            })
            it("构建树结构，同步执行 WS",async()=>{
                let path_id_ws = RandomGenerator.string(20)
                let trans_file_tree_action_ws =await new action_api.BuildGetDataGroupTreeAsync({
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
                        file_size: 10 * 1024 * 1024,
                        chunk_size: 4 * 1024 * 1024,
                        non_level: cyfs.NONAPILevel.NON,
                        ndn_level: cyfs.NDNAPILevel.NDN,
                    },
                    expect: { err: 0 },

                }).start({
                    root_req_path: `/req_path/${path_id_ws}`,
                    task_list: [
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id_ws}/groupA/task0`,
                            context_path: `/context_path/${path_id_ws}/groupA`,
                            group: `/group_path/${path_id_ws}/groupA/`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id_ws}/groupA/task1`,
                            context_path: `/context_path/${path_id_ws}/groupA/task1`,
                            group: `/group_path/${path_id_ws}/groupA/task1`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id_ws}/groupA/task2`,
                            context_path: `/context_path/${path_id_ws}/groupA/task2`,
                            group: `/group_path/${path_id_ws}/groupA/task2`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id_ws}/groupB/task0`,
                            context_path: `/context_path/${path_id_ws}/groupB`,
                            group: `/group_path/${path_id_ws}/groupB/`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id_ws}/groupB/task1`,
                            context_path: `/context_path/${path_id_ws}/groupB/task1`,
                            group: `/group_path/${path_id_ws}/groupB/task1`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id_ws}/groupB/task2`,
                            context_path: `/context_path/${path_id_ws}/groupB/task1`,
                            group: `/group_path/${path_id_ws}/groupB/task2`
                        },
                    ]
                });
                assert.equal(trans_file_tree_action_ws.err,0,trans_file_tree_action_ws.log);
            })
            it("构建树结构，异步执行 HTTP",async()=>{
                let path_id = RandomGenerator.string(20)
                let trans_file_tree_action =await new action_api.BuildGetDataGroupTree({
                    local: {
                        peer_name: "zone1_device1",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    remote: {
                        peer_name: "zone1_ood",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    input: {
                        timeout: 200 * 1000,
                        file_size: 10 * 1024 * 1024,
                        chunk_size: 4 * 1024 * 1024,
                        non_level: cyfs.NONAPILevel.NON,
                        ndn_level: cyfs.NDNAPILevel.NDN,
                    },
                    expect: { err: 0 },

                }).start({
                    root_req_path: `/req_path/${path_id}`,
                    task_list: [
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id}/groupA/task0`,
                            context_path: `/context_path/${path_id}/groupA`,
                            group: `/group_path/${path_id}/groupA/`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id}/groupA/task1`,
                            context_path: `/context_path/${path_id}/groupA/task1`,
                            group: `/group_path/${path_id}/groupA/task1`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id}/groupA/task2`,
                            context_path: `/context_path/${path_id}/groupA/task2`,
                            group: `/group_path/${path_id}/groupA/task2`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id}/groupB/task0`,
                            context_path: `/context_path/${path_id}/groupB`,
                            group: `/group_path/${path_id}/groupB/`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id}/groupB/task1`,
                            context_path: `/context_path/${path_id}/groupB/task1`,
                            group: `/group_path/${path_id}/groupB/task1`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id}/groupB/task2`,
                            context_path: `/context_path/${path_id}/groupB/task1`,
                            group: `/group_path/${path_id}/groupB/task2`
                        },
                    ]
                });
                assert.equal(trans_file_tree_action.err,0,trans_file_tree_action.log);
            })
            it("构建树结构，异步执行 WS",async()=>{
                let path_id_ws = RandomGenerator.string(20)
                let trans_file_tree_action_ws =await new action_api.BuildGetDataGroupTree({
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
                        file_size: 10 * 1024 * 1024,
                        chunk_size: 4 * 1024 * 1024,
                        non_level: cyfs.NONAPILevel.NON,
                        ndn_level: cyfs.NDNAPILevel.NDN,
                    },
                    expect: { err: 0 },

                }).start({
                    root_req_path: `/req_path/${path_id_ws}`,
                    task_list: [
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id_ws}/groupA/task0`,
                            context_path: `/context_path/${path_id_ws}/groupA`,
                            group: `/group_path/${path_id_ws}/groupA/`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id_ws}/groupA/task1`,
                            context_path: `/context_path/${path_id_ws}/groupA/task1`,
                            group: `/group_path/${path_id_ws}/groupA/task1`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id_ws}/groupA/task2`,
                            context_path: `/context_path/${path_id_ws}/groupA/task2`,
                            group: `/group_path/${path_id_ws}/groupA/task2`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id_ws}/groupB/task0`,
                            context_path: `/context_path/${path_id_ws}/groupB`,
                            group: `/group_path/${path_id_ws}/groupB/`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id_ws}/groupB/task1`,
                            context_path: `/context_path/${path_id_ws}/groupB/task1`,
                            group: `/group_path/${path_id_ws}/groupB/task1`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id_ws}/groupB/task2`,
                            context_path: `/context_path/${path_id_ws}/groupB/task1`,
                            group: `/group_path/${path_id_ws}/groupB/task2`
                        },
                    ]
                });
                assert.equal(trans_file_tree_action_ws.err,0,trans_file_tree_action_ws.log);
            })
        })
        describe("NDN get_data Zone权限控制",()=>{
            it("本地NOC: zone1_device1 从本地下载",async()=>{
                // 创建测试任务
                let path_id = RandomGenerator.string(20);
                let action =await new action_api.GetDataAction({
                    local: {
                        peer_name: "zone1_device1",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    remote: {
                        peer_name: "zone1_device1",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    input: {
                        timeout: 200 * 1000,
                        ndn_level:cyfs.NDNAPILevel.NDC,
                        non_level : cyfs.NONAPILevel.NOC,
                    },
                    expect: { err: 0 },
    
                }).start({
                    req_path:`/req_path/${path_id}`,
                    context:`/context_path/${path_id}`,
                    group:`/group_path/${path_id}`,
                    object_type: "chunk",
                    chunk_size: 10*1024*1024, 
                    is_link_root_state:true,
                });
                assert.equal(action.err,ErrorCode.succ,action.log)
            })
            it("NDN: zone1_device1 从zone1_ood 下载",async()=>{
                 // 创建测试任务
                 let path_id = RandomGenerator.string(20);
                 let action =await new action_api.GetDataAction({
                     local: {
                         peer_name: "zone1_device1",
                         dec_id: dec_app_1.to_base_58(),
                         type: cyfs.CyfsStackRequestorType.Http
                     },
                     remote: {
                         peer_name: "zone1_ood",
                         dec_id: dec_app_1.to_base_58(),
                         type: cyfs.CyfsStackRequestorType.Http
                     },
                     input: {
                         timeout: 200 * 1000,
                         ndn_level:cyfs.NDNAPILevel.Router,
                         non_level : cyfs.NONAPILevel.Router,
                     },
                     expect: { err: 0 },
     
                 }).start({
                     req_path:`/req_path/${path_id}`,
                     context:`/context_path/${path_id}`,
                     group:`/group_path/${path_id}`,
                     object_type: "chunk",
                     chunk_size: 10*1024*1024, 
                     is_link_root_state:true,
                 });
                 assert.equal(action.err,ErrorCode.succ,action.log)    
            })
            it("Router: zone2_ood 从zone1_ood 下载",async()=>{
               // 创建测试任务
               let path_id = RandomGenerator.string(20);
               let action =await new action_api.GetDataAction({
                   local: {
                       peer_name: "zone2_ood",
                       dec_id: dec_app_1.to_base_58(),
                       type: cyfs.CyfsStackRequestorType.Http
                   },
                   remote: {
                       peer_name: "zone1_ood",
                       dec_id: dec_app_1.to_base_58(),
                       type: cyfs.CyfsStackRequestorType.Http
                   },
                   input: {
                       timeout: 200 * 1000,
                       ndn_level:cyfs.NDNAPILevel.Router,
                       non_level : cyfs.NONAPILevel.Router,
                   },
                   expect: { err: 0 },
   
               }).start({
                   req_path:`/req_path/${path_id}`,
                   context:`/context_path/${path_id}`,
                   group:`/group_path/${path_id}`,
                   object_type: "chunk",
                   chunk_size: 10*1024*1024, 
                   is_link_root_state:true,
               });
               assert.equal(action.err,ErrorCode.succ,action.log) 
            })
        })
        describe("get_data 获取数据类型",()=>{
            it(`get_data 获取 chunk`,async()=>{
                // 创建测试任务
                let path_id = RandomGenerator.string(20);
                let action =await new action_api.GetDataAction({
                    local: {
                        peer_name: "zone1_device1",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    remote: {
                        peer_name: "zone1_ood",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    input: {
                        timeout: 200 * 1000,
                        ndn_level:cyfs.NDNAPILevel.Router,
                        non_level : cyfs.NONAPILevel.Router,
                    },
                    expect: { err: 0 },
    
                }).start({
                    req_path:`/req_path/${path_id}`,
                    context:`/context_path/${path_id}`,
                    group:`/group_path/${path_id}`,
                    object_type: "chunk",
                    chunk_size: 10*1024*1024, 
                });
                assert.equal(action.err,ErrorCode.succ,action.log)
            })
            it(`get_data 获取 File`,async()=>{
                // 创建测试任务
                let path_id = RandomGenerator.string(20);
                let action =await new action_api.GetDataAction({
                    local: {
                        peer_name: "zone1_device1",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    remote: {
                        peer_name: "zone1_ood",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    input: {
                        timeout: 200 * 1000,
                        ndn_level:cyfs.NDNAPILevel.Router,
                        non_level : cyfs.NONAPILevel.Router,
                    },
                    expect: { err: 0 },
    
                }).start({
                    req_path:`/req_path/${path_id}`,
                    context:`/context_path/${path_id}`,
                    group:`/group_path/${path_id}`,
                    object_type: "file",
                    chunk_size: 4*1024*1024,
                    file_size : 10*1024*1024, 
                });
                assert.equal(action.err,ErrorCode.succ,action.log)    
            })
            it(`get_data 通过Dir + inner_path 获取 File`,async()=>{
                // 创建测试任务
                let path_id = RandomGenerator.string(20);
                let action =await new action_api.GetDataAction({
                    local: {
                        peer_name: "zone1_device1",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    remote: {
                        peer_name: "zone1_ood",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    input: {
                        timeout: 200 * 1000,
                        ndn_level:cyfs.NDNAPILevel.Router,
                        non_level : cyfs.NONAPILevel.Router,
                    },
                    expect: { err: 0 },
    
                }).start({
                    req_path:`/req_path/${path_id}`,
                    context:`/context_path/${path_id}`,
                    group:`/group_path/${path_id}`,
                    object_type: "dir",
                    chunk_size: 4*1024*1024,
                    file_size : 10*1024*1024, 
                });
                assert.equal(action.err,ErrorCode.succ,action.log) 
            })
        }) 
    })
    describe.skip("[Development not implemented] System Testing: stack.ndn_service().delete_data() ",()=>{
        describe(`NDN delete_data 基本流程HTTP+WebSocket`,()=>{
            it.skip("协议栈未实现】本地NDC delete_data chunk数据 - HTTP",async()=>{
                // 创建测试任务
                let path_id = RandomGenerator.string(20);
                let action =await new action_api.DeleteDataAction({
                    local: {
                        peer_name: "zone1_device1",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    remote: {
                        peer_name: "zone1_ood",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    input: {
                        timeout: 200 * 1000,
                        ndn_level : cyfs.NDNAPILevel.NDN,
                        non_level : cyfs.NONAPILevel.NON
                    },
                    expect: { err: 0 },
    
                }).start({
                    req_path:`/req_path/${path_id}`,
                    context:`/context_path/${path_id}`,
                    group:`/group_path/${path_id}`,
                    object_type: "chunk",
                    chunk_size: 10*1024*1024, 
                });
                assert.equal(action.err,ErrorCode.succ,action.log)
            })
        }) 
    })
    describe.skip("[Development not implemented] System Testing: stack.ndn_service().put_shared_data()",()=>{
        describe(`NDN put_shared_data 基本流程HTTP+WebSocket`,()=>{
            
            it("【大数据会出现异常 BUG未解决】 本地NDC put_shared_data chunk数据 - WebSocket",async()=>{
                // 创建测试任务
                let action =await new action_api.PutSharedDataAction({
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
            it("本地NDC put_data chunk数据 - HTTP",async()=>{
                // 创建测试任务
                let action =await new action_api.PutSharedDataAction({
                    local: {
                        peer_name: "zone1_device1",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    remote: {
                        peer_name: "zone1_ood",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
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
        })
        describe(`NDN put_shared_data 发送数据类型`,()=>{
            it("本地NDC put_shared_data 发送Chunk",async()=>{
                // 创建测试任务
                let action =await new action_api.PutSharedDataAction({
                    local: {
                        peer_name: "zone1_device1",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    remote: {
                        peer_name: "zone1_ood",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
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
            it("【协议栈未支持】本地NDC put_shared_data 发送File",async()=>{
                // 创建测试任务
                let action =await new action_api.PutSharedDataAction({
                    local: {
                        peer_name: "zone1_device1",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    remote: {
                        peer_name: "zone1_ood",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    input: {
                        timeout: 200 * 1000,
                    },
                    expect: { err: 0 },
    
                }).start({
                    object_type: "file",
                    chunk_size: 10*1024*1024,
                    file_size : 50*1024*1024,
                });
                assert.equal(action.err,27,action.log)
            })
        })
        describe(`NDN put_shared_data 发送数据大小测试 【不支持Stream形式，内存有限制】`,()=>{
            describe(`Chunk 数据大小测试`,()=>{
                it("本地NDC put_shared_data 发送Chunk 50MB",async()=>{
                    // 创建测试任务
                    let action =await new action_api.PutSharedDataAction({
                        local: {
                            peer_name: "zone1_device1",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        },
                        remote: {
                            peer_name: "zone1_ood",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        },
                        input: {
                            timeout: 200 * 1000,
                        },
                        expect: { err: 0 },
        
                    }).start({
                        object_type: "chunk",
                        chunk_size: 50*1024*1024,
                    });
                    assert.equal(action.err,ErrorCode.succ,action.log)
                })
                it("本地NDC put_shared_data 发送Chunk 100MB",async()=>{
                    // 创建测试任务
                    let action =await new action_api.PutSharedDataAction({
                        local: {
                            peer_name: "zone1_device1",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        },
                        remote: {
                            peer_name: "zone1_ood",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        },
                        input: {
                            timeout: 200 * 1000,
                        },
                        expect: { err: 0 },
        
                    }).start({
                        object_type: "chunk",
                        chunk_size: 100*1024*1024,
                    });
                    assert.equal(action.err,ErrorCode.succ,action.log)
                })
                it("本地NDC put_shared_data 发送Chunk 500MB",async()=>{
                    // 创建测试任务
                    let action =await new action_api.PutSharedDataAction({
                        local: {
                            peer_name: "zone1_device1",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        },
                        remote: {
                            peer_name: "zone1_ood",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        },
                        input: {
                            timeout: 200 * 1000,
                        },
                        expect: { err: 0 },
        
                    }).start({
                        object_type: "chunk",
                        chunk_size: 500*1024*1024,
                    });
                    assert.equal(action.err,ErrorCode.succ,action.log)
                })
                it.skip("【TS-SDK存在BUG会抛出异常 BUG未解决】本地NDC put_shared_data 发送Chunk 1GB",async()=>{
                    // 创建测试任务
                    let action =await new action_api.PutSharedDataAction({
                        local: {
                            peer_name: "zone1_device1",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        },
                        remote: {
                            peer_name: "zone1_ood",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        },
                        input: {
                            timeout: 200 * 1000,
                        },
                        expect: { err: 0 },
        
                    }).start({
                        object_type: "chunk",
                        chunk_size: 1*1024*1024*1024,
                    });
                    assert.equal(action.err,ErrorCode.succ,action.log)
                })
            })
            
        })
    })
    describe.skip("[Waiting issuse# to fix] System Testing: stack.ndn_service().get_shared_data()",()=>{
        describe(`NDN get_shared_data 基本流程HTTP+WebSocket`,()=>{
            it("本地NDC get_shared_data chunk数据 - HTTP",async()=>{
                // 创建测试任务
                let path_id = RandomGenerator.string(20);
                let action =await new action_api.GetSharedDataAction({
                    local: {
                        peer_name: "zone1_device1",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    remote: {
                        peer_name: "zone1_device1",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    input: {
                        timeout: 200 * 1000,
                        ndn_level:cyfs.NDNAPILevel.NDC,
                        non_level : cyfs.NONAPILevel.NOC,
                    },
                    expect: { err: 0 },
    
                }).start({
                    req_path:`/req_path/${path_id}`,
                    context:`/context_path/${path_id}`,
                    group:`/group_path/${path_id}`,
                    object_type: "chunk",
                    chunk_size: 10*1024*1024, 
                });
                assert.equal(action.err,ErrorCode.succ,action.log)
            })
            it("【大数据会出现异常 BUG未解决】本地NDC get_shared_data chunk数据 - WebSocket",async()=>{
                // 创建测试任务
                let path_id = RandomGenerator.string(20);
                let action =await new action_api.GetSharedDataAction({
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
                        ndn_level:cyfs.NDNAPILevel.Router,
                        non_level : cyfs.NONAPILevel.Router,
                    },
                    expect: { err: 0 },
    
                }).start({
                    req_path:`/req_path/${path_id}`,
                    context:`/context_path/${path_id}`,
                    group:`/group_path/${path_id}`,
                    object_type: "chunk",
                    chunk_size: 10*1024*1024, 
                });
                assert.equal(action.err,ErrorCode.succ,action.log)
            })
        })
        describe("get_shared_data + group集成测试 ",()=>{
            it("get_shared_data 设置group",async()=>{
                // 创建测试任务
                let path_id = RandomGenerator.string(20);
                let action =await new action_api.GetSharedDataAction({
                    local: {
                        peer_name: "zone1_device1",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    remote: {
                        peer_name: "zone1_ood",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    input: {
                        timeout: 200 * 1000,
                        ndn_level:cyfs.NDNAPILevel.Router,
                        non_level : cyfs.NONAPILevel.Router,
                    },
                    expect: { err: 0 },
    
                }).start({
                    req_path:`/req_path/${path_id}`,
                    context:`/context_path/${path_id}`,
                    group:`/group_path/${path_id}`,
                    object_type: "chunk",
                    chunk_size: 10*1024*1024, 
                });
                assert.equal(action.err,ErrorCode.succ,action.log)
            })
            it("get_shared_data 不设置group",async()=>{
                // 创建测试任务
                let path_id = RandomGenerator.string(20);
                let action =await new action_api.GetSharedDataAction({
                    local: {
                        peer_name: "zone1_device1",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    remote: {
                        peer_name: "zone1_ood",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    input: {
                        timeout: 200 * 1000,
                        ndn_level:cyfs.NDNAPILevel.Router,
                        non_level : cyfs.NONAPILevel.Router,
                    },
                    expect: { err: 0 },
    
                }).start({
                    req_path:`/req_path/${path_id}`,
                    context:`/context_path/${path_id}`,
                    object_type: "chunk",
                    chunk_size: 10*1024*1024, 
                });
                assert.equal(action.err,ErrorCode.succ,action.log)
            })
        })
        describe("get_shared_data + context集成测试 ",()=>{
            it("get_shared_data 设置context",async()=>{
                // 创建测试任务
                let path_id = RandomGenerator.string(20);
                let action =await new action_api.GetSharedDataAction({
                    local: {
                        peer_name: "zone1_device1",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    remote: {
                        peer_name: "zone1_ood",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    input: {
                        timeout: 200 * 1000,
                        ndn_level:cyfs.NDNAPILevel.Router,
                        non_level : cyfs.NONAPILevel.Router,
                    },
                    expect: { err: 0 },
    
                }).start({
                    req_path:`/req_path/${path_id}`,
                    context:`/context_path/${path_id}`,
                    group:`/group_path/${path_id}`,
                    object_type: "chunk",
                    chunk_size: 10*1024*1024, 
                });
                assert.equal(action.err,ErrorCode.succ,action.log)
            })
            it("get_shared_data 不设置context",async()=>{
                // 创建测试任务
                let path_id = RandomGenerator.string(20);
                let action =await new action_api.GetSharedDataAction({
                    local: {
                        peer_name: "zone1_device1",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    remote: {
                        peer_name: "zone1_ood",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    input: {
                        timeout: 200 * 1000,
                        ndn_level:cyfs.NDNAPILevel.Router,
                        non_level : cyfs.NONAPILevel.Router,
                    },
                    expect: { err: 0 },
    
                }).start({
                    req_path:`/req_path/${path_id}`,
                    group:`/group_path/${path_id}`,
                    object_type: "chunk",
                    chunk_size: 10*1024*1024, 
                });
                assert.equal(action.err,ErrorCode.succ,action.log)
            })
        })
        describe("get_shared_data 构建context_path 和 group_path树 ",()=>{
            it("构建树结构，同步执行 HTTP",async()=>{
                // 
                let path_id = RandomGenerator.string(20)
                let trans_file_tree_action =await new action_api.BuildGetDataGroupTreeAsync({
                    local: {
                        peer_name: "zone1_device1",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    remote: {
                        peer_name: "zone1_ood",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    input: {
                        timeout: 200 * 1000,
                        file_size: 10 * 1024 * 1024,
                        chunk_size: 4 * 1024 * 1024,
                        non_level: cyfs.NONAPILevel.NON,
                        ndn_level: cyfs.NDNAPILevel.NDN,
                    },
                    expect: { err: 0 },

                }).start({
                    root_req_path: `/req_path/${path_id}`,
                    task_list: [
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id}/groupA/task0`,
                            context_path: `/context_path/${path_id}/groupA`,
                            group: `/group_path/${path_id}/groupA/`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id}/groupA/task1`,
                            context_path: `/context_path/${path_id}/groupA/task1`,
                            group: `/group_path/${path_id}/groupA/task1`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id}/groupA/task2`,
                            context_path: `/context_path/${path_id}/groupA/task2`,
                            group: `/group_path/${path_id}/groupA/task2`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id}/groupB/task0`,
                            context_path: `/context_path/${path_id}/groupB`,
                            group: `/group_path/${path_id}/groupB/`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id}/groupB/task1`,
                            context_path: `/context_path/${path_id}/groupB/task1`,
                            group: `/group_path/${path_id}/groupB/task1`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id}/groupB/task2`,
                            context_path: `/context_path/${path_id}/groupB/task1`,
                            group: `/group_path/${path_id}/groupB/task2`
                        },
                    ]
                });
                assert.equal(trans_file_tree_action.err,0,trans_file_tree_action.log);
               
            })
            it("构建树结构，同步执行 WS",async()=>{
                
                let path_id_ws = RandomGenerator.string(20)
                let trans_file_tree_action_ws =await new action_api.BuildGetDataGroupTreeAsync({
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
                        file_size: 10 * 1024 * 1024,
                        chunk_size: 4 * 1024 * 1024,
                        non_level: cyfs.NONAPILevel.NON,
                        ndn_level: cyfs.NDNAPILevel.NDN,
                    },
                    expect: { err: 0 },

                }).start({
                    root_req_path: `/req_path/${path_id_ws}`,
                    task_list: [
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id_ws}/groupA/task0`,
                            context_path: `/context_path/${path_id_ws}/groupA`,
                            group: `/group_path/${path_id_ws}/groupA/`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id_ws}/groupA/task1`,
                            context_path: `/context_path/${path_id_ws}/groupA/task1`,
                            group: `/group_path/${path_id_ws}/groupA/task1`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id_ws}/groupA/task2`,
                            context_path: `/context_path/${path_id_ws}/groupA/task2`,
                            group: `/group_path/${path_id_ws}/groupA/task2`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id_ws}/groupB/task0`,
                            context_path: `/context_path/${path_id_ws}/groupB`,
                            group: `/group_path/${path_id_ws}/groupB/`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id_ws}/groupB/task1`,
                            context_path: `/context_path/${path_id_ws}/groupB/task1`,
                            group: `/group_path/${path_id_ws}/groupB/task1`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id_ws}/groupB/task2`,
                            context_path: `/context_path/${path_id_ws}/groupB/task1`,
                            group: `/group_path/${path_id_ws}/groupB/task2`
                        },
                    ]
                });
                assert.equal(trans_file_tree_action_ws.err,0,trans_file_tree_action_ws.log);
            })
            it("构建树结构，异步执行 HTTP",async()=>{
                let path_id = RandomGenerator.string(20)
                let trans_file_tree_action =await new action_api.BuildGetDataGroupTree({
                    local: {
                        peer_name: "zone1_device1",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    remote: {
                        peer_name: "zone1_ood",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    input: {
                        timeout: 200 * 1000,
                        file_size: 10 * 1024 * 1024,
                        chunk_size: 4 * 1024 * 1024,
                        non_level: cyfs.NONAPILevel.NON,
                        ndn_level: cyfs.NDNAPILevel.NDN,
                    },
                    expect: { err: 0 },

                }).start({
                    root_req_path: `/req_path/${path_id}`,
                    task_list: [
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id}/groupA/task0`,
                            context_path: `/context_path/${path_id}/groupA`,
                            group: `/group_path/${path_id}/groupA/`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id}/groupA/task1`,
                            context_path: `/context_path/${path_id}/groupA/task1`,
                            group: `/group_path/${path_id}/groupA/task1`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id}/groupA/task2`,
                            context_path: `/context_path/${path_id}/groupA/task2`,
                            group: `/group_path/${path_id}/groupA/task2`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id}/groupB/task0`,
                            context_path: `/context_path/${path_id}/groupB`,
                            group: `/group_path/${path_id}/groupB/`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id}/groupB/task1`,
                            context_path: `/context_path/${path_id}/groupB/task1`,
                            group: `/group_path/${path_id}/groupB/task1`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id}/groupB/task2`,
                            context_path: `/context_path/${path_id}/groupB/task1`,
                            group: `/group_path/${path_id}/groupB/task2`
                        },
                    ]
                });
                assert.equal(trans_file_tree_action.err,0,trans_file_tree_action.log);
                
            })
            it("构建树结构，异步执行 WS",async()=>{
                let path_id_ws = RandomGenerator.string(20)
                let trans_file_tree_action_ws =await new action_api.BuildGetDataGroupTree({
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
                        file_size: 10 * 1024 * 1024,
                        chunk_size: 4 * 1024 * 1024,
                        non_level: cyfs.NONAPILevel.NON,
                        ndn_level: cyfs.NDNAPILevel.NDN,
                    },
                    expect: { err: 0 },

                }).start({
                    root_req_path: `/req_path/${path_id_ws}`,
                    task_list: [
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id_ws}/groupA/task0`,
                            context_path: `/context_path/${path_id_ws}/groupA`,
                            group: `/group_path/${path_id_ws}/groupA/`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id_ws}/groupA/task1`,
                            context_path: `/context_path/${path_id_ws}/groupA/task1`,
                            group: `/group_path/${path_id_ws}/groupA/task1`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id_ws}/groupA/task2`,
                            context_path: `/context_path/${path_id_ws}/groupA/task2`,
                            group: `/group_path/${path_id_ws}/groupA/task2`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id_ws}/groupB/task0`,
                            context_path: `/context_path/${path_id_ws}/groupB`,
                            group: `/group_path/${path_id_ws}/groupB/`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id_ws}/groupB/task1`,
                            context_path: `/context_path/${path_id_ws}/groupB/task1`,
                            group: `/group_path/${path_id_ws}/groupB/task1`
                        },
                        {
                            object_type : "chunk",
                            chunk_size : 10*1024*1024,
                            req_path: `/req_path/${path_id_ws}/groupB/task2`,
                            context_path: `/context_path/${path_id_ws}/groupB/task1`,
                            group: `/group_path/${path_id_ws}/groupB/task2`
                        },
                    ]
                });
                assert.equal(trans_file_tree_action_ws.err,0,trans_file_tree_action_ws.log);
            })
        })
        describe("NDN get_shared_data Zone权限控制",()=>{
            it("本地NOC: zone1_device1 从本地下载",async()=>{
                // 创建测试任务
                let path_id = RandomGenerator.string(20);
                let action =await new action_api.GetSharedDataAction({
                    local: {
                        peer_name: "zone1_device1",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    remote: {
                        peer_name: "zone1_device1",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    input: {
                        timeout: 200 * 1000,
                        ndn_level:cyfs.NDNAPILevel.NDC,
                        non_level : cyfs.NONAPILevel.NOC,
                    },
                    expect: { err: 0 },
    
                }).start({
                    req_path:`/req_path/${path_id}`,
                    context:`/context_path/${path_id}`,
                    group:`/group_path/${path_id}`,
                    object_type: "chunk",
                    chunk_size: 10*1024*1024, 
                });
                assert.equal(action.err,ErrorCode.succ,action.log)
            })
            it("NDN: zone1_device1 从zone1_ood 下载",async()=>{
                 // 创建测试任务
                 let path_id = RandomGenerator.string(20);
                 let action =await new action_api.GetSharedDataAction({
                     local: {
                         peer_name: "zone1_device1",
                         dec_id: dec_app_1.to_base_58(),
                         type: cyfs.CyfsStackRequestorType.Http
                     },
                     remote: {
                         peer_name: "zone1_ood",
                         dec_id: dec_app_1.to_base_58(),
                         type: cyfs.CyfsStackRequestorType.Http
                     },
                     input: {
                         timeout: 200 * 1000,
                         ndn_level:cyfs.NDNAPILevel.Router,
                         non_level : cyfs.NONAPILevel.Router,
                     },
                     expect: { err: 0 },
     
                 }).start({
                     req_path:`/req_path/${path_id}`,
                     context:`/context_path/${path_id}`,
                     group:`/group_path/${path_id}`,
                     object_type: "chunk",
                     chunk_size: 10*1024*1024, 
                 });
                 assert.equal(action.err,ErrorCode.succ,action.log)    
            })
            it("Router: zone2_ood 从zone1_ood 下载",async()=>{
               // 创建测试任务
               let path_id = RandomGenerator.string(20);
               let action =await new action_api.GetSharedDataAction({
                   local: {
                       peer_name: "zone2_ood",
                       dec_id: dec_app_1.to_base_58(),
                       type: cyfs.CyfsStackRequestorType.Http
                   },
                   remote: {
                       peer_name: "zone1_ood",
                       dec_id: dec_app_1.to_base_58(),
                       type: cyfs.CyfsStackRequestorType.Http
                   },
                   input: {
                       timeout: 200 * 1000,
                       ndn_level:cyfs.NDNAPILevel.Router,
                       non_level : cyfs.NONAPILevel.Router,
                   },
                   expect: { err: 0 },
   
               }).start({
                   req_path:`/req_path/${path_id}`,
                   context:`/context_path/${path_id}`,
                   group:`/group_path/${path_id}`,
                   object_type: "chunk",
                   chunk_size: 10*1024*1024, 
               });
               assert.equal(action.err,ErrorCode.succ,action.log) 
            })
        })
        describe("get_shared_data 获取数据类型",()=>{
            it(`get_shared_data 获取 chunk`,async()=>{
                // 创建测试任务
                let path_id = RandomGenerator.string(20);
                let action =await new action_api.GetSharedDataAction({
                    local: {
                        peer_name: "zone1_device1",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    remote: {
                        peer_name: "zone1_ood",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    input: {
                        timeout: 200 * 1000,
                        ndn_level:cyfs.NDNAPILevel.Router,
                        non_level : cyfs.NONAPILevel.Router,
                    },
                    expect: { err: 0 },
    
                }).start({
                    req_path:`/req_path/${path_id}`,
                    context:`/context_path/${path_id}`,
                    group:`/group_path/${path_id}`,
                    object_type: "chunk",
                    chunk_size: 10*1024*1024, 
                });
                assert.equal(action.err,ErrorCode.succ,action.log)
            })
            it(`get_shared_data 获取 File`,async()=>{
                // 创建测试任务
                let path_id = RandomGenerator.string(20);
                let action =await new action_api.GetSharedDataAction({
                    local: {
                        peer_name: "zone1_device1",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    remote: {
                        peer_name: "zone1_ood",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    input: {
                        timeout: 200 * 1000,
                        ndn_level:cyfs.NDNAPILevel.Router,
                        non_level : cyfs.NONAPILevel.Router,
                    },
                    expect: { err: 0 },
    
                }).start({
                    req_path:`/req_path/${path_id}`,
                    context:`/context_path/${path_id}`,
                    group:`/group_path/${path_id}`,
                    object_type: "file",
                    chunk_size: 4*1024*1024,
                    file_size : 10*1024*1024, 
                });
                assert.equal(action.err,ErrorCode.succ,action.log)    
            })
            it(`get_shared_data 通过Dir + inner_path 获取 File`,async()=>{
                // 创建测试任务
                let path_id = RandomGenerator.string(20);
                let action =await new action_api.GetSharedDataAction({
                    local: {
                        peer_name: "zone1_device1",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    remote: {
                        peer_name: "zone1_ood",
                        dec_id: dec_app_1.to_base_58(),
                        type: cyfs.CyfsStackRequestorType.Http
                    },
                    input: {
                        timeout: 200 * 1000,
                        ndn_level:cyfs.NDNAPILevel.Router,
                        non_level : cyfs.NONAPILevel.Router,
                    },
                    expect: { err: 0 },
    
                }).start({
                    req_path:`/req_path/${path_id}`,
                    context:`/context_path/${path_id}`,
                    group:`/group_path/${path_id}`,
                    object_type: "dir",
                    chunk_size: 4*1024*1024,
                    file_size : 10*1024*1024, 
                });
                assert.equal(action.err,ErrorCode.succ,action.log) 
            })
        }) 
    })
    describe("System Testing: stack.ndn_service().query_file()",()=>{

        it(`get_data 获取 File`,async()=>{
            // 创建测试任务
            let path_id = RandomGenerator.string(20);
            let action =await new action_api.GetDataAction({
                local: {
                    peer_name: "zone1_device1",
                    dec_id: dec_app_1.to_base_58(),
                    type: cyfs.CyfsStackRequestorType.Http
                },
                remote: {
                    peer_name: "zone1_ood",
                    dec_id: dec_app_1.to_base_58(),
                    type: cyfs.CyfsStackRequestorType.Http
                },
                input: {
                    timeout: 200 * 1000,
                    ndn_level:cyfs.NDNAPILevel.Router,
                    non_level : cyfs.NONAPILevel.Router,
                },
                expect: { err: 0 },

            }).start({
                req_path:`/req_path/${path_id}`,
                context:`/context_path/${path_id}`,
                group:`/group_path/${path_id}`,
                object_type: "file",
                chunk_size: 4*1024*1024,
                file_size : 10*1024*1024, 
            });
            assert.equal(action.err,ErrorCode.succ,action.log)    
        })
        it(`get_data 通过Dir + inner_path 获取 File`,async()=>{
            // 创建测试任务
            let path_id = RandomGenerator.string(20);
            let action =await new action_api.GetDataAction({
                local: {
                    peer_name: "zone1_device1",
                    dec_id: dec_app_1.to_base_58(),
                    type: cyfs.CyfsStackRequestorType.Http
                },
                remote: {
                    peer_name: "zone1_ood",
                    dec_id: dec_app_1.to_base_58(),
                    type: cyfs.CyfsStackRequestorType.Http
                },
                input: {
                    timeout: 200 * 1000,
                    ndn_level:cyfs.NDNAPILevel.Router,
                    non_level : cyfs.NONAPILevel.Router,
                },
                expect: { err: 0 },

            }).start({
                req_path:`/req_path/${path_id}`,
                context:`/context_path/${path_id}`,
                group:`/group_path/${path_id}`,
                object_type: "dir",
                chunk_size: 4*1024*1024,
                file_size : 10*1024*1024, 
            });
            assert.equal(action.err,ErrorCode.succ,action.log) 
        })

        it("通过File(ObjectId) 查询",async()=>{
            // 创建测试任务
            let path_id = RandomGenerator.string(20);
            let action =await new action_api.GetDataAction({
                local: {
                    peer_name: "zone1_device1",
                    dec_id: dec_app_1.to_base_58(),
                    type: cyfs.CyfsStackRequestorType.Http
                },
                remote: {
                    peer_name: "zone1_ood",
                    dec_id: dec_app_1.to_base_58(),
                    type: cyfs.CyfsStackRequestorType.Http
                },
                input: {
                    timeout: 200 * 1000,
                    ndn_level:cyfs.NDNAPILevel.Router,
                    non_level : cyfs.NONAPILevel.Router,
                },
                expect: { err: 0 },

            }).start({
                req_path:`/req_path/${path_id}`,
                context:`/context_path/${path_id}`,
                group:`/group_path/${path_id}`,
                object_type: "file",
                chunk_size: 4*1024*1024,
                file_size : 5*1024*1024, 
            });
            assert.equal(action.err,ErrorCode.succ,action.log)  
            let object_id =  action.resp!.object_id!;
            let query_action = await new action_api.QueryFileAction({
                local: {
                    peer_name: "zone1_ood",
                    dec_id: dec_app_1.to_base_58(),
                    type: cyfs.CyfsStackRequestorType.Http
                },
                input: {
                    timeout: 200 * 1000,
                    ndn_level:cyfs.NDNAPILevel.Router,
                    non_level : cyfs.NONAPILevel.Router,
                },
                expect: { err: 0 },
            } ).start({
                type : cyfs.NDNQueryFileParamType.File,
                file_id : object_id!
            })
            assert.equal(query_action.err,ErrorCode.succ,query_action.log)
        })
        it("通过Hash(HashValue) 查询",async()=>{
            // 创建测试任务
            let path_id = RandomGenerator.string(20);
            let action =await new action_api.GetDataAction({
                local: {
                    peer_name: "zone1_device1",
                    dec_id: dec_app_1.to_base_58(),
                    type: cyfs.CyfsStackRequestorType.Http
                },
                remote: {
                    peer_name: "zone1_ood",
                    dec_id: dec_app_1.to_base_58(),
                    type: cyfs.CyfsStackRequestorType.Http
                },
                input: {
                    timeout: 200 * 1000,
                    ndn_level:cyfs.NDNAPILevel.Router,
                    non_level : cyfs.NONAPILevel.Router,
                },
                expect: { err: 0 },

            }).start({
                req_path:`/req_path/${path_id}`,
                context:`/context_path/${path_id}`,
                group:`/group_path/${path_id}`,
                object_type: "chunk",
                chunk_size: 10*1024*1024, 
            });
            assert.equal(action.err,ErrorCode.succ,action.log)
            let hash =  action.resp!.hash
            let query_action = await new action_api.QueryFileAction({
                local: {
                    peer_name: "zone1_ood",
                    dec_id: dec_app_1.to_base_58(),
                    type: cyfs.CyfsStackRequestorType.Http
                },
                input: {
                    timeout: 200 * 1000,
                    ndn_level:cyfs.NDNAPILevel.Router,
                    non_level : cyfs.NONAPILevel.Router,
                },
                expect: { err: 0 },
            } ).start({
                type : cyfs.NDNQueryFileParamType.Hash,
                hash : hash
                
            })
            assert.equal(query_action.err,ErrorCode.succ,query_action.log)
        })
        it.skip("【协议栈暂时不支持】通过QuickHash(String) 查询",async()=>{

        })
        it("通过Chunk(ChunkId) 查询",async()=>{
            // 创建测试任务
            let path_id = RandomGenerator.string(20);
            let action =await new action_api.GetDataAction({
                local: {
                    peer_name: "zone1_device1",
                    dec_id: dec_app_1.to_base_58(),
                    type: cyfs.CyfsStackRequestorType.Http
                },
                remote: {
                    peer_name: "zone1_ood",
                    dec_id: dec_app_1.to_base_58(),
                    type: cyfs.CyfsStackRequestorType.Http
                },
                input: {
                    timeout: 200 * 1000,
                    ndn_level:cyfs.NDNAPILevel.Router,
                    non_level : cyfs.NONAPILevel.Router,
                },
                expect: { err: 0 },

            }).start({
                req_path:`/req_path/${path_id}`,
                context:`/context_path/${path_id}`,
                group:`/group_path/${path_id}`,
                object_type: "chunk",
                chunk_size: 10*1024*1024, 
            });
            assert.equal(action.err,ErrorCode.succ,action.log)
            let object_id =  action.resp!.object_id!.to_base_58();
            let query_action = await new action_api.QueryFileAction({
                local: {
                    peer_name: "zone1_ood",
                    dec_id: dec_app_1.to_base_58(),
                    type: cyfs.CyfsStackRequestorType.Http
                },
                input: {
                    timeout: 200 * 1000,
                    ndn_level:cyfs.NDNAPILevel.Router,
                    non_level : cyfs.NONAPILevel.Router,
                },
                expect: { err: 0 },
            } ).start({
                type : cyfs.NDNQueryFileParamType.Chunk,
                chunk_id : cyfs.ChunkId.from_base_58(object_id).unwrap()
            })
            assert.equal(query_action.err,ErrorCode.succ,query_action.log)
        })
    })
})