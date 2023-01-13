import assert = require('assert');
import * as cyfs from '../../../cyfs'

import { StackManager, CyfsDriverType } from "../../../cyfs-driver-client"
import { RandomGenerator, sleep } from '../../../base';
import path = require('path');
import * as addContext from "mochawesome/addContext"
import * as action_api from "../../../common_action"
import { HandlerRequestObject } from "../../../common_base"

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
    const data_manager = action_api.ActionManager.createInstance();
    this.beforeAll(async function () {
        //测试前置条件，连接测试模拟器设备
        await stack_manager.init();
        await sleep(5000);
        // 所有节点 实例化一个 Http Requestor dec_app_1 协议栈
        await stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.Http, dec_app_1);
        stack_manager.logger!.info(`############用例执开始执行`);
    })
    this.afterAll(async () => {
        // 停止测试模拟器
        stack_manager.destory();
        // 停止测试驱动
        await stack_manager.driver!.stop();
        // 保存测试记录
        data_manager.save_history_to_file(stack_manager.logger!.dir());
    })
    let report_result: {
        title: string;
        value: any;
    };
    beforeEach(function () {
        // 设置当前用例id 方便日志定位问题
        let testcase_id = `Testcase-${RandomGenerator.string(10)}-${Date.now()}`;
        data_manager.update_current_testcase_id(testcase_id);
        report_result = {
            title: `用例:${testcase_id}`,
            value: {}
        };
        stack_manager.logger!.info(`\n\n########### ${testcase_id} 开始运行###########\n\n`)
    })
    afterEach(function () {
        // 将当前用例执行记录到history
        data_manager.report_current_actions();
        stack_manager.logger!.info(`########### ${report_result.title} 运行结束`)
        addContext.default(this, report_result);
    });

    describe("Trans 模块业务流程场景测试", function () {
        it("Trans 传输文件-基础业务流程", async () => {
            // 创建监听器
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

            }, stack_manager.logger!);
            let path_id = RandomGenerator.string(20)
            let result_handler = await action_handler.start({
                req_path: `/req_path/${path_id}`,
            });
            assert.equal(result_handler.err, 0, result_handler.log)
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
                req_path: `/req_path/${path_id}`,
                context_path: `/context_path/${path_id}`,
                group: `/group/${path_id}`,
            });
            assert.equal(result.err, 0, result.log)
        })
        describe("Trans 传输File", async () => {
            describe("File传输 文件大小", async () => {
                it("File传输 文件大小-传输空文件", async () => {
                    // 创建监听器
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

                    }, stack_manager.logger!);
                    let path_id = RandomGenerator.string(20)
                    let result_handler = await action_handler.start({
                        req_path: `/req_path/${path_id}`,
                    });
                    assert.equal(result_handler.err, 0, result_handler.log)
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

                    let result = await action.start({
                        req_path: `/req_path/${path_id}`,
                        context_path: `/context_path/${path_id}`,
                        group: `/group/${path_id}`,
                    });
                    assert.equal(result.err, 0, result.log)
                    report_result.value = action.action
                })
                it("File传输 文件大小-传输1字节", async () => {
                    // 创建监听器
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

                    }, stack_manager.logger!);
                    let path_id = RandomGenerator.string(20)
                    let result_handler = await action_handler.start({
                        req_path: `/req_path/${path_id}`,
                    });
                    assert.equal(result_handler.err, 0, result_handler.log)
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

                    let result = await action.start({
                        req_path: `/req_path/${path_id}`,
                        context_path: `/context_path/${path_id}`,
                        group: `/group/${path_id}`,
                    });
                    assert.equal(result.err, 0, result.log)
                    report_result.value = action.action
                })
                it("File传输 文件大小-传输100MB", async () => {
                    // 创建监听器
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

                    }, stack_manager.logger!);
                    let path_id = RandomGenerator.string(20)
                    let result_handler = await action_handler.start({
                        req_path: `/req_path/${path_id}`,
                    });
                    assert.equal(result_handler.err, 0, result_handler.log)
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

                    let result = await action.start({
                        req_path: `/req_path/${path_id}`,
                        context_path: `/context_path/${path_id}`,
                        group: `/group/${path_id}`,
                    });
                    assert.equal(result.err, 0, result.log)
                    report_result.value = action.action
                })
                it("File传输 文件大小-传输1GB", async () => {
                    // 创建监听器
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

                    }, stack_manager.logger!);
                    let path_id = RandomGenerator.string(20)
                    let result_handler = await action_handler.start({
                        req_path: `/req_path/${path_id}`,
                    });
                    assert.equal(result_handler.err, 0, result_handler.log)
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
                            file_size: 1 * 1024 * 1024 * 1024,
                            chunk_size: 10 * 1024 * 1024,
                            non_level: cyfs.NONAPILevel.NON,
                            ndn_level: cyfs.NDNAPILevel.NDN,
                        },
                        expect: { err: 0 },

                    }, stack_manager.logger!);

                    let result = await action.start({
                        req_path: `/req_path/${path_id}`,
                        context_path: `/context_path/${path_id}`,
                        group: `/group/${path_id}`,
                    });
                    assert.equal(result.err, 0, result.log)
                    report_result.value = action.action
                })
                it.skip("File传输 文件大小-传输5GB", async () => {
                    // 创建监听器
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

                    }, stack_manager.logger!);
                    let path_id = RandomGenerator.string(20)
                    let result_handler = await action_handler.start({
                        req_path: `/req_path/${path_id}`,
                    });
                    assert.equal(result_handler.err, 0, result_handler.log)
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
                            file_size: 5 * 1024 * 1024 * 1024,
                            chunk_size: 10 * 1024 * 1024,
                            non_level: cyfs.NONAPILevel.NON,
                            ndn_level: cyfs.NDNAPILevel.NDN,
                        },
                        expect: { err: 0 },

                    }, stack_manager.logger!);

                    let result = await action.start({
                        req_path: `/req_path/${path_id}`,
                        context_path: `/context_path/${path_id}`,
                        group: `/group/${path_id}`,
                    });
                    assert.equal(result.err, 0, result.log)
                    report_result.value = action.action
                })
            })
            describe("File传输 chunk大小", async () => {
                it("File传输 chunk 大小设置1000字节", async () => {
                    // 创建监听器
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

                    }, stack_manager.logger!);
                    let path_id = RandomGenerator.string(20)
                    let result_handler = await action_handler.start({
                        req_path: `/req_path/${path_id}`,
                    });
                    assert.equal(result_handler.err, 0, result_handler.log)
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
                            file_size: 10000,
                            chunk_size: 1000,
                            non_level: cyfs.NONAPILevel.NON,
                            ndn_level: cyfs.NDNAPILevel.NDN,
                        },
                        expect: { err: 0 },

                    }, stack_manager.logger!);

                    let result = await action.start({
                        req_path: `/req_path/${path_id}`,
                        context_path: `/context_path/${path_id}`,
                        group: `/group/${path_id}`,
                    });
                    assert.equal(result.err, 1, result.log)
                    report_result.value = action.action
                })
                it("File传输 chunk 大小设置1024字节", async () => {
                    // 创建监听器
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

                    }, stack_manager.logger!);
                    let path_id = RandomGenerator.string(20)
                    let result_handler = await action_handler.start({
                        req_path: `/req_path/${path_id}`,
                    });
                    assert.equal(result_handler.err, 0, result_handler.log)
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
                            file_size: 5 * 1024,
                            chunk_size: 1024,
                            non_level: cyfs.NONAPILevel.NON,
                            ndn_level: cyfs.NDNAPILevel.NDN,
                        },
                        expect: { err: 0 },

                    }, stack_manager.logger!);

                    let result = await action.start({
                        req_path: `/req_path/${path_id}`,
                        context_path: `/context_path/${path_id}`,
                        group: `/group/${path_id}`,
                    });
                    assert.equal(result.err, 0, result.log)
                    report_result.value = action.action
                })
                it("File传输 chunk 大小设置10MB", async () => {
                    // 创建监听器
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

                    }, stack_manager.logger!);
                    let path_id = RandomGenerator.string(20)
                    let result_handler = await action_handler.start({
                        req_path: `/req_path/${path_id}`,
                    });
                    assert.equal(result_handler.err, 0, result_handler.log)
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
                            file_size: 10 * 1024 * 1024,
                            chunk_size: 10 * 1024 * 1024,
                            non_level: cyfs.NONAPILevel.NON,
                            ndn_level: cyfs.NDNAPILevel.NDN,
                        },
                        expect: { err: 0 },

                    }, stack_manager.logger!);

                    let result = await action.start({
                        req_path: `/req_path/${path_id}`,
                        context_path: `/context_path/${path_id}`,
                        group: `/group/${path_id}`,
                    });
                    assert.equal(result.err, 0, result.log)
                    report_result.value = action.action
                })
                it.skip("File传输 chunk 大小设置2GMB", async () => {
                    // 创建监听器
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

                    }, stack_manager.logger!);
                    let path_id = RandomGenerator.string(20)
                    let result_handler = await action_handler.start({
                        req_path: `/req_path/${path_id}`,
                    });
                    assert.equal(result_handler.err, 0, result_handler.log)
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
                            file_size: 2 * 1024 * 1024 * 1024,
                            chunk_size: 2 * 1024 * 1024 * 1024,
                            non_level: cyfs.NONAPILevel.NON,
                            ndn_level: cyfs.NDNAPILevel.NDN,
                        },
                        expect: { err: 0 },

                    }, stack_manager.logger!);

                    let result = await action.start({
                        req_path: `/req_path/${path_id}`,
                        context_path: `/context_path/${path_id}`,
                        group: `/group/${path_id}`,
                    });
                    assert.equal(result.err, 0, result.log)
                    report_result.value = action.action
                })
            })
            describe("File传输 Zone权限控制", async () => {
                it("本地:device1 publish_file 到 device1 , device1 从本地下载", async () => {
                    // 创建监听器
                    let action_handler = new action_api.RegisterCommonHandler({
                        local: {
                            peer_name: "zone1_device1",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        },
                        input: {
                            timeout: 200 * 1000,
                        },
                        expect: { err: 0 },

                    }, stack_manager.logger!);
                    let path_id = RandomGenerator.string(20)
                    let result_handler = await action_handler.start({
                        req_path: `/req_path/${path_id}`,
                    });
                    assert.equal(result_handler.err, 0, result_handler.log)
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

                    let result = await action.start({
                        req_path: `/req_path/${path_id}`,
                        context_path: `/context_path/${path_id}`,
                        group: `/group/${path_id}`,
                    });
                    assert.equal(result.err, 0, result.log)
                    report_result.value = action.action
                })
                it("同Zone:device1 publish_file 到 ood1 , device2 从 ood1 下载文件", async () => {
                    // 创建监听器
                    let action_handler = new action_api.RegisterCommonHandler({
                        local: {
                            peer_name: "zone1_device2",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        },
                        input: {
                            timeout: 200 * 1000,
                        },
                        expect: { err: 0 },

                    }, stack_manager.logger!);
                    let path_id = RandomGenerator.string(20)
                    let result_handler = await action_handler.start({
                        req_path: `/req_path/${path_id}`,
                    });
                    assert.equal(result_handler.err, 0, result_handler.log)
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
                            file_size: 10 * 1024 * 1024,
                            chunk_size: 4 * 1024 * 1024,
                            non_level: cyfs.NONAPILevel.NON,
                            ndn_level: cyfs.NDNAPILevel.NDN,
                        },
                        expect: { err: 0 },

                    }, stack_manager.logger!);

                    let result = await action.start({
                        file_source_device: {
                            peer_name: "zone1_device1",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        },
                        req_path: `/req_path/${path_id}`,
                        context_path: `/context_path/${path_id}`,
                        group: `/group/${path_id}`,
                    });
                    assert.equal(result.err, 0, result.log)
                    report_result.value = action.action
                })
                it("跨Zone:device1 publish_file 到 ood1 , ood2 从 ood1 下载文件", async () => {
                    // 创建监听器
                    let action_handler = new action_api.RegisterCommonHandler({
                        local: {
                            peer_name: "zone2_ood",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        },
                        input: {
                            timeout: 200 * 1000,
                        },
                        expect: { err: 0 },

                    }, stack_manager.logger!);
                    let path_id = RandomGenerator.string(20)
                    let result_handler = await action_handler.start({
                        req_path: `/req_path/${path_id}`,
                    });
                    assert.equal(result_handler.err, 0, result_handler.log)
                    // 创建测试任务
                    let action = new action_api.TransFileAction({
                        local: {
                            peer_name: "zone1_ood",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        },
                        remote: {
                            peer_name: "zone2_ood",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        },
                        input: {
                            timeout: 200 * 1000,
                            file_size: 100 * 1024 * 1024,
                            chunk_size: 10 * 1024 * 1024,
                            non_level: cyfs.NONAPILevel.Router,
                            ndn_level: cyfs.NDNAPILevel.Router,
                        },
                        expect: { err: 0 },

                    }, stack_manager.logger!);

                    /**
                     * req_path: `/req_path/${path_id}`,
                    context_path:  `/context_path/${path_id}`,
                        group: `/group/${path_id}`,
                     */
                    let result = await action.start({
                        file_source_device: {
                            peer_name: "zone1_device1",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        },
                        req_path: `/req_path/${path_id}`,
                        context_path: `/context_path/${path_id}`,
                        group: `/group/${path_id}`,
                    });
                    assert.equal(result.err, 0, result.log)
                    report_result.value = action.action
                })
            })
            describe("File传输 Task 状态任务调度控制", async () => {

                describe("对新建任务进行操作", () => {
                    it("查询未auto_start 任务状态为：Paused", async () => {
                        // 创建监听器
                        let action_handler = new action_api.RegisterCommonHandler({
                            local: {
                                peer_name: "zone1_device2",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);
                        let path_id = RandomGenerator.string(20)
                        let result_handler = await action_handler.start({
                            req_path: `/req_path/${path_id}`,
                        });
                        assert.equal(result_handler.err, 0, result_handler.log)
                        // 创建测试任务 local -> remote
                        let action = new action_api.PrepareFileTask({
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
                                file_size: 10 * 1024 * 1024,
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);

                        let result = await action.start({
                            file_source_device: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                            auto_start: false
                        });
                        assert.equal(result.err, 0, result.log);
                        report_result.value = action.action;
                        // remote 检查 任务状态
                        let check_state = await action_api.GetTransTaskState.create_by_parent(action.action, stack_manager.logger!).action!.start({ task_id: result.resp!.task_id! })
                        assert.equal(check_state.resp!.state.state, cyfs.TransTaskState.Paused, "任务状态检查不通过")
                        assert.equal(check_state.resp!.group, `${dec_app_1.to_base_58()}/zone/${path_id}`)
                    })
                    it("查询已经auto_start 任务状态为：Downloading", async () => {
                        // 创建监听器
                        let action_handler = new action_api.RegisterCommonHandler({
                            local: {
                                peer_name: "zone1_device2",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);
                        let path_id = RandomGenerator.string(20)
                        let result_handler = await action_handler.start({
                            req_path: `/req_path/${path_id}`,
                        });
                        assert.equal(result_handler.err, 0, result_handler.log)
                        // 创建测试任务 local -> remote
                        let action = new action_api.PrepareFileTask({
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
                                file_size: 10 * 1024 * 1024,
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);

                        let result = await action.start({
                            file_source_device: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                            auto_start: true
                        });
                        assert.equal(result.err, 0, result.log);
                        report_result.value = action.action;
                        // remote 检查 任务状态
                        let check_state = await action_api.GetTransTaskState.create_by_parent(action.action, stack_manager.logger!).action!.start({ task_id: result.resp!.task_id! })
                        if (check_state.resp!.state.state == cyfs.TransTaskState.Downloading || check_state.resp!.state.state == cyfs.TransTaskState.Finished) {
                            stack_manager.logger!.info(`${result.resp!.task_id} 任务状态为：${check_state.resp!.state.state}`)
                            stack_manager.logger!.info(`${result.resp!.task_id} 下载进度：${JSON.stringify(check_state.resp!.state.on_air_state)}`)
                            stack_manager.logger!.info(`${result.resp!.task_id} 上传速度：${JSON.stringify(check_state.resp!.state.upload_speed)}`)
                            stack_manager.logger!.info(`${result.resp!.task_id}  group ：${check_state.resp!.group}`)
                        } else {
                            assert.ok(false, "错误任务状态")
                        }

                        assert.equal(check_state.resp!.group, `${dec_app_1.to_base_58()}/zone/${path_id}`)
                    })
                    it("新建任务：Paused -> start_task -> Downloading", async () => {
                        // 创建监听器
                        let action_handler = new action_api.RegisterCommonHandler({
                            local: {
                                peer_name: "zone1_device2",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);
                        let path_id = RandomGenerator.string(20)
                        let result_handler = await action_handler.start({
                            req_path: `/req_path/${path_id}`,
                        });
                        assert.equal(result_handler.err, 0, result_handler.log)
                        // 创建测试任务 local -> remote
                        let action = new action_api.PrepareFileTask({
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
                                file_size: 10 * 1024 * 1024,
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);

                        let result = await action.start({
                            file_source_device: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                            auto_start: false
                        });
                        assert.equal(result.err, 0, result.log);
                        report_result.value = action.action;

                        let remote = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_device2",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        }).stack!;
                        let start_info = await remote.trans().start_task({
                            task_id: result.resp!.task_id!,
                            common: {
                                level: cyfs.NDNAPILevel.NDN,
                                flags: 1,
                            }
                        });
                        assert.ok(!start_info.err, start_info.val?.msg);
                        await sleep(10 * 1000);
                        // remote 检查 任务状态
                        let check_state = await action_api.GetTransTaskState.create_by_parent(action.action, stack_manager.logger!).action!.start({ task_id: result.resp!.task_id! })
                        if (check_state.resp!.state.state == cyfs.TransTaskState.Downloading || check_state.resp!.state.state == cyfs.TransTaskState.Finished) {
                            stack_manager.logger!.info(`${result.resp!.task_id} 任务状态为：${check_state.resp!.state.state}`)
                            stack_manager.logger!.info(`${result.resp!.task_id} 下载进度：${JSON.stringify(check_state.resp!.state.on_air_state)}`)
                            stack_manager.logger!.info(`${result.resp!.task_id} 上传速度：${JSON.stringify(check_state.resp!.state.upload_speed)}`)
                            stack_manager.logger!.info(`${result.resp!.task_id} group ：${check_state.resp!.group}`)
                        } else {
                            assert.ok(false, "错误任务状态")
                        }
                        assert.equal(check_state.resp!.group, `${dec_app_1.to_base_58()}/zone/${path_id}`)
                    })
                    it("新建任务：Paused -> delete_task -> Err:Not Found", async () => {
                        // 创建监听器
                        let action_handler = new action_api.RegisterCommonHandler({
                            local: {
                                peer_name: "zone1_device2",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);
                        let path_id = RandomGenerator.string(20)
                        let result_handler = await action_handler.start({
                            req_path: `/req_path/${path_id}`,
                        });
                        assert.equal(result_handler.err, 0, result_handler.log)
                        // 创建测试任务 local -> remote
                        let action = new action_api.PrepareFileTask({
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
                                file_size: 10 * 1024 * 1024,
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);

                        let result = await action.start({
                            file_source_device: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                            auto_start: false
                        });
                        assert.equal(result.err, 0, result.log);
                        report_result.value = action.action;

                        let remote = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_device2",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        }).stack!;
                        let control_info = await remote.trans().delete_task({
                            task_id: result.resp!.task_id!,
                            common: {
                                level: cyfs.NDNAPILevel.NDN,
                                flags: 1,
                            }
                        });
                        stack_manager.logger!.info(`control_task result ： ${JSON.stringify(JSON.stringify(control_info))}`);
                        assert.ok(!control_info.err, control_info.val?.msg);
                        // remote 检查 任务状态
                        let check_state = await action_api.GetTransTaskState.create_by_parent(action.action, stack_manager.logger!).action!.start({ task_id: result.resp!.task_id! })
                        assert.equal(check_state.err, 4)
                    })
                    it("新建任务：Paused -> stop_task -> Paused", async () => {
                        // 创建监听器
                        let action_handler = new action_api.RegisterCommonHandler({
                            local: {
                                peer_name: "zone1_device2",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);
                        let path_id = RandomGenerator.string(20)
                        let result_handler = await action_handler.start({
                            req_path: `/req_path/${path_id}`,
                        });
                        assert.equal(result_handler.err, 0, result_handler.log)
                        // 创建测试任务 local -> remote
                        let action = new action_api.PrepareFileTask({
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
                                file_size: 10 * 1024 * 1024,
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);

                        let result = await action.start({
                            file_source_device: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                            auto_start: false
                        });
                        assert.equal(result.err, 0, result.log);
                        report_result.value = action.action;

                        let remote = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_device2",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        }).stack!;
                        let start_info = await remote.trans().stop_task({
                            task_id: result.resp!.task_id!,
                            common: {
                                level: cyfs.NDNAPILevel.NDN,
                                flags: 1,
                            }
                        });
                        assert.ok(!start_info.err, start_info.val?.msg);
                        await sleep(10 * 1000);
                        // remote 检查 任务状态
                        let check_state = await action_api.GetTransTaskState.create_by_parent(action.action, stack_manager.logger!).action!.start({ task_id: result.resp!.task_id! })
                        if (check_state.resp!.state.state == cyfs.TransTaskState.Paused) {
                            stack_manager.logger!.info(`${result.resp!.task_id} 任务状态为：${check_state.resp!.state.state}`)
                            stack_manager.logger!.info(`${result.resp!.task_id} 下载进度：${JSON.stringify(check_state.resp!.state.on_air_state)}`)
                            stack_manager.logger!.info(`${result.resp!.task_id} 上传速度：${JSON.stringify(check_state.resp!.state.upload_speed)}`)
                            stack_manager.logger!.info(`${result.resp!.task_id} group ：${check_state.resp!.group}`)
                        } else {
                            assert.ok(false, "错误任务状态")
                        }
                        assert.equal(check_state.resp!.group, `${dec_app_1.to_base_58()}/zone/${path_id}`)
                    })
                    it("新建任务：Downloading-> start_task -> Downloading", async () => {
                        // 创建监听器
                        let action_handler = new action_api.RegisterCommonHandler({
                            local: {
                                peer_name: "zone1_device2",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);
                        let path_id = RandomGenerator.string(20)
                        let result_handler = await action_handler.start({
                            req_path: `/req_path/${path_id}`,
                        });
                        assert.equal(result_handler.err, 0, result_handler.log)
                        // 创建测试任务 local -> remote
                        let action = new action_api.PrepareFileTask({
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
                                file_size: 10 * 1024 * 1024,
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);

                        let result = await action.start({
                            file_source_device: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                            auto_start: true
                        });
                        assert.equal(result.err, 0, result.log);
                        report_result.value = action.action;

                        let remote = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_device2",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        }).stack!;
                        let start_info = await remote.trans().start_task({
                            task_id: result.resp!.task_id!,
                            common: {
                                level: cyfs.NDNAPILevel.NDN,
                                flags: 1,
                            }
                        });
                        stack_manager.logger!.info(`start_task ： ${JSON.stringify(JSON.stringify(start_info))}`);
                        assert.ok(!start_info.err, start_info.val?.msg);
                        // remote 检查 任务状态
                        let check_state = await action_api.GetTransTaskState.create_by_parent(action.action, stack_manager.logger!).action!.start({ task_id: result.resp!.task_id! })
                        if (check_state.resp!.state.state == cyfs.TransTaskState.Downloading || check_state.resp!.state.state == cyfs.TransTaskState.Finished) {
                            stack_manager.logger!.info(`${result.resp!.task_id} 任务状态为：${check_state.resp!.state.state}`)
                            stack_manager.logger!.info(`${result.resp!.task_id} 下载进度：${JSON.stringify(check_state.resp!.state.on_air_state)}`)
                            stack_manager.logger!.info(`${result.resp!.task_id} 上传速度：${JSON.stringify(check_state.resp!.state.upload_speed)}`)
                            stack_manager.logger!.info(`${result.resp!.task_id} group ：${check_state.resp!.group}`)
                        } else {
                            assert.ok(false, "错误任务状态")
                        }
                        assert.equal(check_state.resp!.group, `${dec_app_1.to_base_58()}/zone/${path_id}`)
                    })
                    it("新建任务：Downloading-> delete_task -> Err:Not Found", async () => {
                        // 创建监听器
                        let action_handler = new action_api.RegisterCommonHandler({
                            local: {
                                peer_name: "zone1_device2",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);
                        let path_id = RandomGenerator.string(20)
                        let result_handler = await action_handler.start({
                            req_path: `/req_path/${path_id}`,
                        });
                        assert.equal(result_handler.err, 0, result_handler.log)
                        // 创建测试任务 local -> remote
                        let action = new action_api.PrepareFileTask({
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
                                file_size: 10 * 1024 * 1024,
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);

                        let result = await action.start({
                            file_source_device: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                            auto_start: true
                        });
                        assert.equal(result.err, 0, result.log);
                        report_result.value = action.action;

                        let remote = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_device2",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        }).stack!;
                        let start_info = await remote.trans().delete_task({
                            task_id: result.resp!.task_id!,
                            common: {
                                level: cyfs.NDNAPILevel.NDN,
                                flags: 1,
                            }
                        });
                        stack_manager.logger!.info(`delete_task ： ${JSON.stringify(JSON.stringify(start_info))}`);
                        assert.ok(!start_info.err, start_info.val?.msg);
                        // remote 检查 任务状态
                        let check_state = await action_api.GetTransTaskState.create_by_parent(action.action, stack_manager.logger!).action!.start({ task_id: result.resp!.task_id! })
                        assert.equal(check_state.err, 4)
                    })
                    it("新建任务：Downloading-> stop_task -> Paused", async () => {
                        // 创建监听器
                        let action_handler = new action_api.RegisterCommonHandler({
                            local: {
                                peer_name: "zone1_device2",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);
                        let path_id = RandomGenerator.string(20)
                        let result_handler = await action_handler.start({
                            req_path: `/req_path/${path_id}`,
                        });
                        assert.equal(result_handler.err, 0, result_handler.log)
                        // 创建测试任务 local -> remote
                        let action = new action_api.PrepareFileTask({
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
                                file_size: 10 * 1024 * 1024,
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);

                        let result = await action.start({
                            file_source_device: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                            auto_start: true
                        });
                        assert.equal(result.err, 0, result.log);
                        report_result.value = action.action;

                        let remote = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_device2",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        }).stack!;
                        let start_info = await remote.trans().stop_task({
                            task_id: result.resp!.task_id!,
                            common: {
                                level: cyfs.NDNAPILevel.NDN,
                                flags: 1,
                            }
                        });
                        stack_manager.logger!.info(`start_task ： ${JSON.stringify(JSON.stringify(start_info))}`);
                        assert.ok(!start_info.err, start_info.val?.msg);
                        // remote 检查 任务状态
                        let check_state = await action_api.GetTransTaskState.create_by_parent(action.action, stack_manager.logger!).action!.start({ task_id: result.resp!.task_id! })
                        if (check_state.resp!.state.state == cyfs.TransTaskState.Paused) {
                            stack_manager.logger!.info(`${result.resp!.task_id} 任务状态为：${check_state.resp!.state.state}`)
                            stack_manager.logger!.info(`${result.resp!.task_id} 下载进度：${JSON.stringify(check_state.resp!.state.on_air_state)}`)
                            stack_manager.logger!.info(`${result.resp!.task_id} 上传速度：${JSON.stringify(check_state.resp!.state.upload_speed)}`)
                            stack_manager.logger!.info(`${result.resp!.task_id} group ：${check_state.resp!.group}`)
                        } else {
                            assert.ok(false, "错误任务状态")
                        }
                        assert.equal(check_state.resp!.group, `${dec_app_1.to_base_58()}/zone/${path_id}`)
                    })
                })

                describe("File传输 Task 初始化状态为Pasue： 调用Start/Stop/Delete", () => {
                    it("任务状态Paused -> start_task -> Downloading", async () => {
                        // 创建监听器
                        let action_handler = new action_api.RegisterCommonHandler({
                            local: {
                                peer_name: "zone1_device2",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);
                        let path_id = RandomGenerator.string(20)
                        let result_handler = await action_handler.start({
                            req_path: `/req_path/${path_id}`,
                        });
                        assert.equal(result_handler.err, 0, result_handler.log)
                        // 创建测试任务 local -> remote
                        let action = new action_api.PrepareFileTask({
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
                                file_size: 10 * 1024 * 1024,
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);

                        let result = await action.start({
                            file_source_device: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                            auto_start: true,
                            action: cyfs.TransTaskControlAction.Stop
                        });
                        assert.equal(result.err, 0, result.log);
                        report_result.value = action.action;

                        let remote = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_device2",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        }).stack!;
                        let start_info = await remote.trans().start_task({
                            task_id: result.resp!.task_id!,
                            common: {
                                level: cyfs.NDNAPILevel.NDN,
                                flags: 1,
                            }
                        });
                        assert.ok(!start_info.err, start_info.val?.msg);
                        await sleep(10 * 1000);
                        // remote 检查 任务状态
                        let check_state = await action_api.GetTransTaskState.create_by_parent(action.action, stack_manager.logger!).action!.start({ task_id: result.resp!.task_id! })
                        if (check_state.resp!.state.state == cyfs.TransTaskState.Downloading || check_state.resp!.state.state == cyfs.TransTaskState.Finished) {
                            stack_manager.logger!.info(`${result.resp!.task_id} 任务状态为：${check_state.resp!.state.state}`)
                            stack_manager.logger!.info(`${result.resp!.task_id} 下载进度：${JSON.stringify(check_state.resp!.state.on_air_state)}`)
                            stack_manager.logger!.info(`${result.resp!.task_id} 上传速度：${JSON.stringify(check_state.resp!.state.upload_speed)}`)
                            stack_manager.logger!.info(`${result.resp!.task_id} group ：${check_state.resp!.group}`)
                        } else {
                            assert.ok(false, "错误任务状态")
                        }
                        assert.equal(check_state.resp!.group, `${dec_app_1.to_base_58()}/zone/${path_id}`)
                    })
                    it("任务状态Paused -> delete_task -> Err:Not Found", async () => {
                        // 创建监听器
                        let action_handler = new action_api.RegisterCommonHandler({
                            local: {
                                peer_name: "zone1_device2",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);
                        let path_id = RandomGenerator.string(20)
                        let result_handler = await action_handler.start({
                            req_path: `/req_path/${path_id}`,
                        });
                        assert.equal(result_handler.err, 0, result_handler.log)
                        // 创建测试任务 local -> remote
                        let action = new action_api.PrepareFileTask({
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
                                file_size: 10 * 1024 * 1024,
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);

                        let result = await action.start({
                            file_source_device: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                            auto_start: true,
                            action: cyfs.TransTaskControlAction.Stop
                        });
                        assert.equal(result.err, 0, result.log);
                        report_result.value = action.action;

                        let remote = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_device2",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        }).stack!;
                        let control_info = await remote.trans().delete_task({
                            task_id: result.resp!.task_id!,
                            common: {
                                level: cyfs.NDNAPILevel.NDN,
                                flags: 1,
                            }
                        });
                        stack_manager.logger!.info(`control_task result ： ${JSON.stringify(JSON.stringify(control_info))}`);
                        assert.ok(!control_info.err, control_info.val?.msg);
                        // remote 检查 任务状态
                        let check_state = await action_api.GetTransTaskState.create_by_parent(action.action, stack_manager.logger!).action!.start({ task_id: result.resp!.task_id! })
                        assert.equal(check_state.err, 4)
                    })
                    it("任务状态Paused -> stop_task -> Paused", async () => {
                        // 创建监听器
                        let action_handler = new action_api.RegisterCommonHandler({
                            local: {
                                peer_name: "zone1_device2",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);
                        let path_id = RandomGenerator.string(20)
                        let result_handler = await action_handler.start({
                            req_path: `/req_path/${path_id}`,
                        });
                        assert.equal(result_handler.err, 0, result_handler.log)
                        // 创建测试任务 local -> remote
                        let action = new action_api.PrepareFileTask({
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
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);

                        let result = await action.start({
                            file_source_device: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                            auto_start: true,
                            action: cyfs.TransTaskControlAction.Stop,
                            action_wait: 5 * 1000
                        });
                        assert.equal(result.err, 0, result.log);
                        report_result.value = action.action;

                        let remote = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_device2",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        }).stack!;
                        let start_info = await remote.trans().stop_task({
                            task_id: result.resp!.task_id!,
                            common: {
                                level: cyfs.NDNAPILevel.NDN,
                                flags: 1,
                            }
                        });
                        assert.ok(!start_info.err, start_info.val?.msg);
                        await sleep(10 * 1000);
                        // remote 检查 任务状态
                        let check_state = await action_api.GetTransTaskState.create_by_parent(action.action, stack_manager.logger!).action!.start({ task_id: result.resp!.task_id! })
                        if (check_state.resp!.state.state == cyfs.TransTaskState.Paused) {
                            stack_manager.logger!.info(`${result.resp!.task_id} 任务状态为：${check_state.resp!.state.state}`)
                            stack_manager.logger!.info(`${result.resp!.task_id} 下载进度：${JSON.stringify(check_state.resp!.state.on_air_state)}`)
                            stack_manager.logger!.info(`${result.resp!.task_id} 上传速度：${JSON.stringify(check_state.resp!.state.upload_speed)}`)
                            stack_manager.logger!.info(`${result.resp!.task_id} group ：${check_state.resp!.group}`)
                        } else {
                            assert.ok(false, "错误任务状态")
                        }
                        assert.equal(check_state.resp!.group, `${dec_app_1.to_base_58()}/zone/${path_id}`)
                    })
                })
                describe("File传输 Task 初始化状态为Downloading： 调用Start/Stop/Delete", () => {
                    it("任务状态Downloading -> start_task -> Downloading", async () => {
                        // 创建监听器
                        let action_handler = new action_api.RegisterCommonHandler({
                            local: {
                                peer_name: "zone1_device2",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);
                        let path_id = RandomGenerator.string(20)
                        let result_handler = await action_handler.start({
                            req_path: `/req_path/${path_id}`,
                        });
                        assert.equal(result_handler.err, 0, result_handler.log)
                        // 创建测试任务 local -> remote
                        let action = new action_api.PrepareFileTask({
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
                                file_size: 10 * 1024 * 1024,
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);

                        let result = await action.start({
                            file_source_device: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                            auto_start: true,
                        });
                        assert.equal(result.err, 0, result.log);
                        report_result.value = action.action;

                        let remote = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_device2",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        }).stack!;
                        let start_info = await remote.trans().start_task({
                            task_id: result.resp!.task_id!,
                            common: {
                                level: cyfs.NDNAPILevel.NDN,
                                flags: 1,
                            }
                        });
                        assert.ok(!start_info.err, start_info.val?.msg);
                        await sleep(10 * 1000);
                        // remote 检查 任务状态
                        let check_state = await action_api.GetTransTaskState.create_by_parent(action.action, stack_manager.logger!).action!.start({ task_id: result.resp!.task_id! })
                        if (check_state.resp!.state.state == cyfs.TransTaskState.Downloading || check_state.resp!.state.state == cyfs.TransTaskState.Finished) {
                            stack_manager.logger!.info(`${result.resp!.task_id} 任务状态为：${check_state.resp!.state.state}`)
                            stack_manager.logger!.info(`${result.resp!.task_id} 下载进度：${JSON.stringify(check_state.resp!.state.on_air_state)}`)
                            stack_manager.logger!.info(`${result.resp!.task_id} 上传速度：${JSON.stringify(check_state.resp!.state.upload_speed)}`)
                            stack_manager.logger!.info(`${result.resp!.task_id} group ：${check_state.resp!.group}`)
                        } else {
                            assert.ok(false, "错误任务状态")
                        }
                        assert.equal(check_state.resp!.group, `${dec_app_1.to_base_58()}/zone/${path_id}`)
                    })
                    it("任务状态Downloading -> delete_task -> Err:Not Found", async () => {
                        // 创建监听器
                        let action_handler = new action_api.RegisterCommonHandler({
                            local: {
                                peer_name: "zone1_device2",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);
                        let path_id = RandomGenerator.string(20)
                        let result_handler = await action_handler.start({
                            req_path: `/req_path/${path_id}`,
                        });
                        assert.equal(result_handler.err, 0, result_handler.log)
                        // 创建测试任务 local -> remote
                        let action = new action_api.PrepareFileTask({
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
                                file_size: 10 * 1024 * 1024,
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);

                        let result = await action.start({
                            file_source_device: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                            auto_start: true,
                        });
                        assert.equal(result.err, 0, result.log);
                        report_result.value = action.action;

                        let remote = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_device2",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        }).stack!;
                        let control_info = await remote.trans().delete_task({
                            task_id: result.resp!.task_id!,
                            common: {
                                level: cyfs.NDNAPILevel.NDN,
                                flags: 1,
                            }
                        });
                        stack_manager.logger!.info(`control_task result ： ${JSON.stringify(JSON.stringify(control_info))}`);
                        assert.ok(!control_info.err, control_info.val?.msg);
                        // remote 检查 任务状态
                        let check_state = await action_api.GetTransTaskState.create_by_parent(action.action, stack_manager.logger!).action!.start({ task_id: result.resp!.task_id! })
                        assert.equal(check_state.err, 4)
                    })
                    it("任务状态Downloading -> stop_task -> Paused", async () => {
                        // 创建监听器
                        let action_handler = new action_api.RegisterCommonHandler({
                            local: {
                                peer_name: "zone1_device2",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);
                        let path_id = RandomGenerator.string(20)
                        let result_handler = await action_handler.start({
                            req_path: `/req_path/${path_id}`,
                        });
                        assert.equal(result_handler.err, 0, result_handler.log)
                        // 创建测试任务 local -> remote
                        let action = new action_api.PrepareFileTask({
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
                                file_size: 10 * 1024 * 1024,
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);

                        let result = await action.start({
                            file_source_device: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                            auto_start: true,
                            action_wait: 5000,
                        });
                        assert.equal(result.err, 0, result.log);
                        report_result.value = action.action;

                        let remote = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_device2",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        }).stack!;
                        let start_info = await remote.trans().stop_task({
                            task_id: result.resp!.task_id!,
                            common: {
                                level: cyfs.NDNAPILevel.NDN,
                                flags: 1,
                            }
                        });
                        assert.ok(!start_info.err, start_info.val?.msg);
                        await sleep(10 * 1000);
                        // remote 检查 任务状态
                        let check_state = await action_api.GetTransTaskState.create_by_parent(action.action, stack_manager.logger!).action!.start({ task_id: result.resp!.task_id! })
                        if (check_state.resp!.state.state == cyfs.TransTaskState.Paused) {
                            stack_manager.logger!.info(`${result.resp!.task_id} 任务状态为：${check_state.resp!.state.state}`)
                            stack_manager.logger!.info(`${result.resp!.task_id} 下载进度：${JSON.stringify(check_state.resp!.state.on_air_state)}`)
                            stack_manager.logger!.info(`${result.resp!.task_id} 上传速度：${JSON.stringify(check_state.resp!.state.upload_speed)}`)
                            stack_manager.logger!.info(`${result.resp!.task_id} group ：${check_state.resp!.group}`)
                        } else {
                            assert.ok(false, "错误任务状态")
                        }
                        assert.equal(check_state.resp!.group, `${dec_app_1.to_base_58()}/zone/${path_id}`)
                    })
                })
                describe("File传输 Task 初始化状态为Canceled： 调用Start/Stop/Delete", () => {
                    // TODD  目前无法构造 Canceled 的类型任务。
                })
                describe("File传输 Task 初始化状态为Finished： 调用Start/Stop/Delete", () => {
                    it("任务状态Finished -> start_task -> Finished", async () => {
                        // 创建监听器
                        let action_handler = new action_api.RegisterCommonHandler({
                            local: {
                                peer_name: "zone1_device2",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);
                        let path_id = RandomGenerator.string(20)
                        let result_handler = await action_handler.start({
                            req_path: `/req_path/${path_id}`,
                        });
                        assert.equal(result_handler.err, 0, result_handler.log)
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
                                file_size: 10 * 1024 * 1024,
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);

                        let result = await action.start({
                            file_source_device: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)
                        report_result.value = action.action;
                        let remote = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_device2",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        }).stack!;
                        let start_info = await remote.trans().start_task({
                            task_id: result.resp!.task_id!,
                            common: {
                                level: cyfs.NDNAPILevel.NDN,
                                flags: 1,
                            }
                        });
                        assert.ok(!start_info.err, start_info.val?.msg);
                        await sleep(10 * 1000);
                        // remote 检查 任务状态
                        let check_state = await action_api.GetTransTaskState.create_by_parent(action.action, stack_manager.logger!).action!.start({ task_id: result.resp!.task_id! })
                        if (check_state.resp!.state.state == cyfs.TransTaskState.Finished) {
                            stack_manager.logger!.info(`${result.resp!.task_id} 任务状态为：${check_state.resp!.state.state}`)
                            stack_manager.logger!.info(`${result.resp!.task_id} 下载进度：${JSON.stringify(check_state.resp!.state.on_air_state)}`)
                            stack_manager.logger!.info(`${result.resp!.task_id} 上传速度：${JSON.stringify(check_state.resp!.state.upload_speed)}`)
                            stack_manager.logger!.info(`${result.resp!.task_id} group ：${check_state.resp!.group}`)
                        } else {
                            assert.ok(false, "错误任务状态")
                        }
                        assert.equal(check_state.resp!.group, `${dec_app_1.to_base_58()}/zone/${path_id}`)
                    })
                    it("任务状态Finished -> stop_task -> Finished", async () => {
                        // 创建监听器
                        let action_handler = new action_api.RegisterCommonHandler({
                            local: {
                                peer_name: "zone1_device2",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);
                        let path_id = RandomGenerator.string(20)
                        let result_handler = await action_handler.start({
                            req_path: `/req_path/${path_id}`,
                        });
                        assert.equal(result_handler.err, 0, result_handler.log)
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
                                file_size: 10 * 1024 * 1024,
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);

                        let result = await action.start({
                            file_source_device: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)
                        report_result.value = action.action;
                        let remote = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_device2",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        }).stack!;
                        let start_info = await remote.trans().stop_task({
                            task_id: result.resp!.task_id!,
                            common: {
                                level: cyfs.NDNAPILevel.NDN,
                                flags: 1,
                            }
                        });
                        assert.equal(start_info.val!.code, 7, start_info.val?.msg);
                    })
                    it("任务状态Finished -> delete_task -> Finished", async () => {
                        // 创建监听器
                        let action_handler = new action_api.RegisterCommonHandler({
                            local: {
                                peer_name: "zone1_device2",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);
                        let path_id = RandomGenerator.string(20)
                        let result_handler = await action_handler.start({
                            req_path: `/req_path/${path_id}`,
                        });
                        assert.equal(result_handler.err, 0, result_handler.log)
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
                                file_size: 10 * 1024 * 1024,
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, stack_manager.logger!);

                        let result = await action.start({
                            file_source_device: {
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)
                        report_result.value = action.action;
                        let remote = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_device2",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        }).stack!;
                        let start_info = await remote.trans().delete_task({
                            task_id: result.resp!.task_id!,
                            common: {
                                level: cyfs.NDNAPILevel.NDN,
                                flags: 1,
                            }
                        });
                        assert.equal(start_info.val?.code, 7, start_info.val?.msg);
                    })
                })
                describe("File传输 Task 初始化状态为Err： 调用Start/Stop/Delete", () => {
                    // TODD  目前无法构造 Err 类型任务。
                })
            })
        })
        describe("Trans 传输 Group-Context", async () => {
            describe("group-树状结构构造", async () => {
            })
            describe("group 任务调度控制-状态切换", async () => {
                beforeEach(async () => {
                    stack_manager.logger!.info("构造group树")
                    for (let i = 0; i < 5; i++) {
                        await sleep(1000)

                    }
                })
                it("sss", async () => {

                })
                it("sss", async () => {

                })
                it("sss", async () => {

                })
            })
            describe("group 任务调度控制-任务树控制", async () => {

            })
            describe("File传输 Task 状态任务调度控制", async () => {

            })
        })




        describe("Trans 传输Dir", async () => {

        })

    })


})