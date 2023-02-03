import assert = require('assert');
import * as cyfs from '../../../cyfs'

import { StackManager, CyfsDriverType } from "../../../cyfs-driver-client"
import { ErrorCode, RandomGenerator, sleep,Logger } from '../../../base';
import path = require('path');
import * as addContext from "mochawesome/addContext"
import * as action_api from "../../../common_action"
import { HandlerRequestObject } from "../../../common_base"
import { PrepareTransFileRequest } from '../../../common_action';

const dec_app_1 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device1decapp")
const dec_app_2 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device2decapp")

//Interface
//Test scenario
//System testing
//Performance testing
//Stress testing
//Smoke testing
//Regression testing

//  npx mocha .\test*.ts --reporter mochawesome --require ts-node/register
//  npx mocha .\test_ndn_scenario.ts --reporter mochawesome --require ts-node/register
describe("CYFS Stack NDN 模块测试", function () {
    this.timeout(0);
    const stack_manager = StackManager.createInstance();
    let logger : Logger;
    const data_manager = action_api.ActionManager.createInstance();
    this.beforeAll(async function () {
        //测试前置条件，连接测试模拟器设备
        await stack_manager.init();
        logger = stack_manager.logger!;
        await sleep(5000);
        // 所有节点 实例化一个 Http Requestor dec_app_1 协议栈
        await stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.Http, dec_app_1);
        await stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.WebSocket, dec_app_2);
        logger.info(`############用例执开始执行`);
    })
    this.afterAll(async () => {
        // 停止测试模拟器
        stack_manager.destory();
        // 停止测试驱动
        await stack_manager.driver!.stop();
        // 保存测试记录
        data_manager.save_history_to_file(logger.dir());
    })
    let report_result: {
        title: string;
        value: any;
    };
    beforeEach(function () {
        // 设置当前用例id 方便日志定位问题
        let testcase_id = `Testcase-${RandomGenerator.string(10)}-${Date.now()}`;
        data_manager.update_current_testcase_id(testcase_id);
        logger.info(`\n\n########### ${testcase_id} 开始运行###########\n\n`)
    })
    afterEach(function () {
        // 将当前用例执行记录到history
        let current_actions = data_manager.report_current_actions();
        logger.info(`########### ${current_actions.testcase_id} 运行结束`)
        report_result = {
            title: `用例:${current_actions.testcase_id}`,
            value: current_actions.action_list
        };
        addContext.default(this, report_result);
    })

    describe.only("put_data 功能测试",async()=>{
        describe(`NDN put_data 基本流程HTTP+WebSocket`,async()=>{
            it("本地NDC put_data chunk数据 - HTTP",async()=>{
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
    
                }, logger).start({
                    object_type: "chunk",
                    chunk_size: 100*1024*1024,
                });
                assert.equal(action.err,ErrorCode.succ,action.log)
            })
            it("【大数据会出现异常】 本地NDC put_data chunk数据 - WebSocket",async()=>{
                // 创建测试任务
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
    
                }, logger).start({
                    object_type: "chunk",
                    chunk_size: 10*1024*1024,
                });
                assert.equal(action.err,ErrorCode.succ,action.log)
            })
        })
        describe(`NDN put_data 发送数据类型`,async()=>{
            it("本地NDC put_data 发送Chunk",async()=>{
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
    
                }, logger).start({
                    object_type: "chunk",
                    chunk_size: 10*1024*1024,
                });
                assert.equal(action.err,ErrorCode.succ,action.log)
            })
            it("本地NDC put_data 发送File",async()=>{
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
    
                }, logger).start({
                    object_type: "file",
                    chunk_size: 10*1024*1024,
                    file_size : 50*1024*1024,
                });
                assert.equal(action.err,ErrorCode.succ,action.log)
            })
        })
        describe(`NDN put_data 发送数据大小测试 【不支持Stream形式，内存有限制】`,async()=>{
            describe(`Chunk 数据大小测试`,async()=>{
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
        
                    }, logger).start({
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
        
                    }, logger).start({
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
        
                    }, logger).start({
                        object_type: "chunk",
                        chunk_size: 500*1024*1024,
                    });
                    assert.equal(action.err,ErrorCode.succ,action.log)
                })
                it.only("本地NDC put_data 发送Chunk 2GB",async()=>{
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
        
                    }, logger).start({
                        object_type: "chunk",
                        chunk_size: 2*1024*1024*1024,
                    });
                    assert.equal(action.err,ErrorCode.succ,action.log)
                })
            })
            describe(`File 数据大小测试`,async()=>{
                it("本地NDC put_data 发送File 50MB",async()=>{
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
        
                    }, logger).start({
                        object_type: "file",
                        chunk_size: 10*1024*1024,
                        file_size : 50*1024*1024,
                    });
                    assert.equal(action.err,ErrorCode.succ,action.log)
                })
                it("本地NDC put_data 发送File 100MB",async()=>{
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
        
                    }, logger).start({
                        object_type: "file",
                        chunk_size: 10*1024*1024,
                        file_size : 100*1024*1024,
                    });
                    assert.equal(action.err,ErrorCode.succ,action.log)
                })
                it("本地NDC put_data 发送File 500MB",async()=>{
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
        
                    }, logger).start({
                        object_type: "file",
                        chunk_size: 10*1024*1024,
                        file_size : 500*1024*1024,
                    });
                    assert.equal(action.err,ErrorCode.succ,action.log)
                })
                it("本地NDC put_data 发送File 2GB",async()=>{
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
        
                    }, logger).start({
                        object_type: "file",
                        chunk_size: 10*1024*1024,
                        file_size : 2*1024*1024*1024,
                    });
                    assert.equal(action.err,ErrorCode.succ,action.log)
                })    
            })
            
        })  
    })
    describe("get_data 功能测试",async()=>{
        describe(`NDN get_data 基本流程HTTP+WebSocket`,async()=>{
            it("本地NDC put_data chunk数据 - HTTP",async()=>{
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
                    },
                    expect: { err: 0 },
    
                }, logger).start({
                    req_path:`/req_path/${path_id}`,
                    context:`/context_path/${path_id}`,
                    group:`/group_path/${path_id}`,
                    object_type: "chunk",
                    chunk_size: 10*1024*1024, 
                });
                assert.equal(action.err,ErrorCode.succ,action.log)
            })
            it("本地NDC get_data chunk数据 - WebSocket",async()=>{
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
                    },
                    expect: { err: 0 },
    
                }, logger).start({
                    req_path:`/req_path/${path_id}`,
                    context:`/context_path/${path_id}`,
                    group:`/group_path/${path_id}`,
                    object_type: "chunk",
                    chunk_size: 10*1024*1024, 
                });
                assert.equal(action.err,ErrorCode.succ,action.log)
            })
        })
        describe("get_data + group集成测试 ",async()=>{
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
                    },
                    expect: { err: 0 },
    
                }, logger).start({
                    req_path:`/req_path/${path_id}`,
                    context:`/context_path/${path_id}`,
                    group:`/group_path/${path_id}`,
                    object_type: "chunk",
                    chunk_size: 10*1024*1024, 
                });
                assert.equal(action.err,ErrorCode.succ,action.log)
            })
        })
        describe("get_data + context集成测试 ",async()=>{

        })
    })
    describe("delete_data 功能测试",async()=>{
    })
    describe("put_shared_data 功能测试",async()=>{

    })
    describe("get_shared_data 功能测试",async()=>{
    })
    describe("query_file 功能测试",async()=>{
        it("通过File(ObjectId) 查询",async()=>{

        })
        it("通过Hash(HashValue) 查询",async()=>{

        })
        it("通过QuickHash(String) 查询",async()=>{

        })
        it("通过Chunk(ChunkId) 查询",async()=>{

        })
    })
})