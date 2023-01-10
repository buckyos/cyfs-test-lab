import assert = require('assert');
import * as cyfs from '../../../cyfs'

import { StackManager, CyfsDriverType } from "../../../cyfs-driver-client"
import { RandomGenerator, sleep } from '../../../base';
import path = require('path');

import * as action_api from "../../../common_action"

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

describe("CYFS Stack Trans 模块测试", function () {
    this.timeout(0);
    const stack_manager = StackManager.createInstance();
    this.beforeAll(async function () {
        //测试前置条件，连接测试模拟器设备
        await stack_manager.init();
        await sleep(5000);
        // 所有节点 实例化一个 Http Requestor dec_app_1 协议栈
        await stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.Http, dec_app_1);
        stack_manager.logger!.info(`##########用例执开始执行`);
    })
    this.afterAll(async () => {
        // 停止测试模拟器
        stack_manager.destory();
        //await sleep(10*1000)
        await stack_manager.driver!.stop();
    })
    describe("Trans 模块业务流程场景测试", function () {
        it("Trans 传输文件-基础业务流程", async () => {
            // 创建测试任务
            let action = new action_api.TransFileAction({
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
                    timeout: 3 * 60 * 1000,
                    file_size: 10 * 1024 * 1024,
                    chunk_size: 4 * 1024 * 1024,
                    non_level: cyfs.NONAPILevel.NON,
                    ndn_level: cyfs.NDNAPILevel.NDN,
                },
                expect: { err: 0 },

            }, stack_manager.logger!);
            let result = await action.start({
                req_path: "/trans_normal",
                context_path: "/trans_normal",
                group: "/trans_normal",
            });
            assert.equal(result.err,0,result.log)
        })
        describe("Trans 传输File",async () => {
            describe("File传输 文件大小",async () => {
                it("File传输 文件大小-传输空文件", async () => {
                    // 创建测试任务
                    let action = new action_api.TransFileAction({
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
                            timeout: 20 * 1000,
                            file_size: 0,
                            chunk_size: 4 * 1024 * 1024,
                            non_level: cyfs.NONAPILevel.NON,
                            ndn_level: cyfs.NDNAPILevel.NDN,
                        },
                        expect: { err: 0 },
        
                    }, stack_manager.logger!);
                    let path_id = RandomGenerator.string(20)
                    let result = await action.start({
                        req_path: `/file_szie/${path_id}`,
                        context_path:  `/file_szie/${path_id}`,
                        group: `/file_szie/${path_id}`,
                    });
                    assert.equal(result.err,0,result.log)
                })
                it("File传输 文件大小-传输1字节", async () => {
                    // 创建测试任务
                    let action = new action_api.TransFileAction({
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
                            timeout: 20 * 1000,
                            file_size: 1,
                            chunk_size: 4 * 1024 * 1024,
                            non_level: cyfs.NONAPILevel.NON,
                            ndn_level: cyfs.NDNAPILevel.NDN,
                        },
                        expect: { err: 0 },
        
                    }, stack_manager.logger!);
                    let path_id = RandomGenerator.string(20)
                    let result = await action.start({
                        req_path: `/file_szie/${path_id}`,
                        context_path:  `/file_szie/${path_id}`,
                        group: `/file_szie/${path_id}`,
                    });
                    assert.equal(result.err,0,result.log)
                })
                it("File传输 文件大小-传输100MB", async () => {
                    // 创建测试任务
                    let action = new action_api.TransFileAction({
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
                            file_size: 100 * 1024 * 1024,
                            chunk_size: 10 * 1024 * 1024,
                            non_level: cyfs.NONAPILevel.NON,
                            ndn_level: cyfs.NDNAPILevel.NDN,
                        },
                        expect: { err: 0 },
        
                    }, stack_manager.logger!);
                    let path_id = RandomGenerator.string(20)
                    let result = await action.start({
                        req_path: `/file_szie/${path_id}`,
                        context_path:  `/file_szie/${path_id}`,
                        group: `/file_szie/${path_id}`,
                    });
                    assert.equal(result.err,0,result.log)
                })
                it("File传输 文件大小-传输1GB", async () => {
                    // 创建测试任务
                    let action = new action_api.TransFileAction({
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
                            file_size: 1* 1024 * 1024 * 1024,
                            chunk_size: 10 * 1024 * 1024,
                            non_level: cyfs.NONAPILevel.NON,
                            ndn_level: cyfs.NDNAPILevel.NDN,
                        },
                        expect: { err: 0 },
        
                    }, stack_manager.logger!);
                    let path_id = RandomGenerator.string(20)
                    let result = await action.start({
                        req_path: `/file_szie/${path_id}`,
                        context_path:  `/file_szie/${path_id}`,
                        group: `/file_szie/${path_id}`,
                    });
                    assert.equal(result.err,0,result.log)
                })
                it.skip("File传输 文件大小-传输5GB", async () => {
                    // 创建测试任务
                    let action = new action_api.TransFileAction({
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
                            timeout: 500 * 1000,
                            file_size: 5* 1024 * 1024 * 1024,
                            chunk_size: 10 * 1024 * 1024,
                            non_level: cyfs.NONAPILevel.NON,
                            ndn_level: cyfs.NDNAPILevel.NDN,
                        },
                        expect: { err: 0 },
        
                    }, stack_manager.logger!);
                    let path_id = RandomGenerator.string(20)
                    let result = await action.start({
                        req_path: `/file_szie/${path_id}`,
                        context_path:  `/file_szie/${path_id}`,
                        group: `/file_szie/${path_id}`,
                    });
                    assert.equal(result.err,0,result.log)
                })
            })
            describe("File传输 chunk大小",async () => {

            })
            describe.only("File传输 Zone权限控制",async () => {
                it.only("device1 publish_file 到 device1 , device1 从本地下载",async () =>{
                    // 创建测试任务
                    let action = new action_api.TransFileAction({
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
                            file_size: 100 * 1024 * 1024,
                            chunk_size: 10 * 1024 * 1024,
                            non_level: cyfs.NONAPILevel.NON,
                            ndn_level: cyfs.NDNAPILevel.NDN,
                        },
                        expect: { err: 0 },
        
                    }, stack_manager.logger!);
                    let path_id = RandomGenerator.string(20)
                    let result = await action.start({
                        req_path: `/zone/${path_id}`,
                        context_path:  `/zone/${path_id}`,
                        group: `/zone/${path_id}`,
                    });
                    assert.equal(result.err,0,result.log)
                })
                it("device1 publish_file 到 ood1 , device2 从 ood1 下载文件",async () =>{
                    // 创建测试任务
                    let action = new action_api.TransFileAction({
                        local: {
                            peer_name: "zone1_ood",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        },
                        remote: {
                            peer_name: "zone1_device2",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        },
                        input: {
                            timeout: 200 * 1000,
                            file_size: 100 * 1024 * 1024,
                            chunk_size: 10 * 1024 * 1024,
                            non_level: cyfs.NONAPILevel.NON,
                            ndn_level: cyfs.NDNAPILevel.NDN,
                        },
                        expect: { err: 0 },
        
                    }, stack_manager.logger!);
                    let path_id = RandomGenerator.string(20)
                    let result = await action.start({
                        file_source_device : {
                            peer_name: "zone1_device1",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        },
                        req_path: `/zone/${path_id}`,
                        context_path:  `/zone/${path_id}`,
                        group: `/zone/${path_id}`,
                    });
                    assert.equal(result.err,0,result.log)
                })
            })
            describe("File传输 Task 状态任务调度控制",async () => {

            })
        })
        describe("Trans 传输 Group-Context",async () => {
            describe("group-树状结构构造",async () => {

            })
            describe("group 任务调度控制-状态切换",async () => {

            })
            describe("group 任务调度控制-任务树控制",async () => {

            })
            describe("File传输 Task 状态任务调度控制",async () => {

            })
        })




        describe("Trans 传输Dir",async () => {
            
        })

    })


})