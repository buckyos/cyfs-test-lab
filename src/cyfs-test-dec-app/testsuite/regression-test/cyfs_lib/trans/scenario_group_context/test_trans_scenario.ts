import assert = require('assert');
import * as cyfs from '../../../../../cyfs'

import { StackManager, CyfsDriverType } from "../../../../../cyfs-driver-client"
import { ErrorCode, RandomGenerator, sleep ,Logger} from '../../../../../common';
import path = require('path');
import * as addContext from "mochawesome/addContext"
import * as action_api from "../../../../../dec-app-action"
import { HandlerRequestObject } from "../../../../../dec-app-base"
import { PrepareTransFileRequest } from '../../../../../dec-app-action';

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
//  npx mocha .\test_trans_scenario.ts --reporter mochawesome --require ts-node/register

describe("CYFS Stack Trans 模块测试", function () {
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
        let dec_app_1_client =  await stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.Http, dec_app_1);
        let dec_app_2_client = await stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.WebSocket, dec_app_2);
        assert.equal(dec_app_1_client.err,0,dec_app_1_client.log)
        assert.equal(dec_app_2_client.err,0,dec_app_2_client.log)
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
            title: `用例: ${current_actions.testcase_id}`,
            value: current_actions.action_list
        };
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

            }, logger);
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

            }, logger);
            let result = await action.start({
                req_path: `/req_path/${path_id}`,
                context_path: `/context_path/${path_id}`,
                group: `/group/${path_id}`,
            });
            assert.equal(result.err, 0, result.log)
        })
        describe("Trans 传输File", async () => {
            describe("File传输 文件大小", async () => {
                it.only("File传输 文件大小-传输空文件", async () => {
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

                    }, logger);
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

                    }, logger);

                    let result = await action.start({
                        req_path: `/req_path/${path_id}`,
                        context_path: `/context_path/${path_id}`,
                        group: `/group/${path_id}`,
                    });
                    assert.equal(result.err, 0, result.log)

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

                    }, logger);
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

                    }, logger);

                    let result = await action.start({
                        req_path: `/req_path/${path_id}`,
                        context_path: `/context_path/${path_id}`,
                        group: `/group/${path_id}`,
                    });
                    assert.equal(result.err, 0, result.log)

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

                    }, logger);
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

                    }, logger);

                    let result = await action.start({
                        req_path: `/req_path/${path_id}`,
                        context_path: `/context_path/${path_id}`,
                        group: `/group/${path_id}`,
                    });
                    assert.equal(result.err, 0, result.log)

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

                    }, logger);
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
                            file_size: 1 * 1024 * 1024 * 1024,
                            chunk_size: 10 * 1024 * 1024,
                            non_level: cyfs.NONAPILevel.NON,
                            ndn_level: cyfs.NDNAPILevel.NDN,
                        },
                        expect: { err: 0 },

                    }, logger);

                    let result = await action.start({
                        req_path: `/req_path/${path_id}`,
                        context_path: `/context_path/${path_id}`,
                        group: `/group/${path_id}`,
                    });
                    assert.equal(result.err, 0, result.log)

                })
                it.skip("File传输 文件大小-传输2GB", async () => {
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

                    }, logger);
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
                            file_size: 2 * 1024 * 1024 * 1024,
                            chunk_size: 10 * 1024 * 1024,
                            non_level: cyfs.NONAPILevel.NON,
                            ndn_level: cyfs.NDNAPILevel.NDN,
                        },
                        expect: { err: 0 },

                    }, logger);

                    let result = await action.start({
                        req_path: `/req_path/${path_id}`,
                        context_path: `/context_path/${path_id}`,
                        group: `/group/${path_id}`,
                    });
                    assert.equal(result.err, 0, result.log)

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

                    }, logger);
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

                    }, logger);

                    let result = await action.start({
                        req_path: `/req_path/${path_id}`,
                        context_path: `/context_path/${path_id}`,
                        group: `/group/${path_id}`,
                    });
                    assert.equal(result.err, 2, result.log)

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

                    }, logger);
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

                    }, logger);

                    let result = await action.start({
                        req_path: `/req_path/${path_id}`,
                        context_path: `/context_path/${path_id}`,
                        group: `/group/${path_id}`,
                    });
                    assert.equal(result.err, 0, result.log)

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

                    }, logger);
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

                    }, logger);

                    let result = await action.start({
                        req_path: `/req_path/${path_id}`,
                        context_path: `/context_path/${path_id}`,
                        group: `/group/${path_id}`,
                    });
                    assert.equal(result.err, 0, result.log)

                })
                it.skip("File传输 chunk 大小设置2GB", async () => {
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

                    }, logger);
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

                    }, logger);

                    let result = await action.start({
                        req_path: `/req_path/${path_id}`,
                        context_path: `/context_path/${path_id}`,
                        group: `/group/${path_id}`,
                    });
                    assert.equal(result.err, 0, result.log)

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

                    }, logger);
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

                    }, logger);

                    let result = await action.start({
                        req_path: `/req_path/${path_id}`,
                        context_path: `/context_path/${path_id}`,
                        group: `/group/${path_id}`,
                    });
                    assert.equal(result.err, 0, result.log)

                })
                it("同Zone:ood1 publish_file 到 ood1 , device2 从 ood1 下载文件", async () => {
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

                    }, logger);
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

                    }, logger);

                    let result = await action.start({

                        req_path: `/req_path/${path_id}`,
                        context_path: `/context_path/${path_id}`,
                        group: `/group/${path_id}`,
                    });
                    assert.equal(result.err, 0, result.log)

                })
                it("跨Zone:ood1 publish_file 到 ood1 , ood2 从 ood1 下载文件", async () => {
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

                    }, logger);
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

                    }, logger);
                    let result = await action.start({
                        req_path: `/req_path/${path_id}`,
                        context_path: `/context_path/${path_id}`,
                        group: `/group/${path_id}`,
                    });
                    assert.equal(result.err, 0, result.log)

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

                        }, logger);
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

                        }, logger);

                        let result = await action.start({

                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                            auto_start: false
                        });
                        assert.equal(result.err, 0, result.log);
                        // remote 检查 任务状态
                        let check_state = await action_api.GetTransTaskState.create_by_parent(action.action, logger).action!.start({ task_id: result.resp!.task_id! })
                        assert.equal(check_state.resp!.state.state, cyfs.TransTaskState.Paused, "任务状态检查不通过")
                        assert.equal(check_state.resp!.group, `${dec_app_1.to_base_58()}/group/${path_id}`)
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

                        }, logger);
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

                        }, logger);

                        let result = await action.start({

                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                            auto_start: true
                        });
                        assert.equal(result.err, 0, result.log);

                        // remote 检查 任务状态
                        let check_state = await action_api.GetTransTaskState.create_by_parent(action.action, logger).action!.start({ task_id: result.resp!.task_id! })
                        if (check_state.resp!.state.state == cyfs.TransTaskState.Downloading || check_state.resp!.state.state == cyfs.TransTaskState.Finished) {
                            logger.info(`${result.resp!.task_id} 任务状态为：${check_state.resp!.state.state}`)
                            logger.info(`${result.resp!.task_id} 下载进度：${JSON.stringify(check_state.resp!.state.on_air_state)}`)
                            logger.info(`${result.resp!.task_id} 上传速度：${JSON.stringify(check_state.resp!.state.upload_speed)}`)
                            logger.info(`${result.resp!.task_id}  group ：${check_state.resp!.group}`)
                        } else {
                            assert.ok(false, "错误任务状态")
                        }

                        assert.equal(check_state.resp!.group, `${dec_app_1.to_base_58()}/group/${path_id}`)
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

                        }, logger);
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

                        }, logger);

                        let result = await action.start({

                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                            auto_start: false
                        });
                        assert.equal(result.err, 0, result.log);


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
                        let check_state = await action_api.GetTransTaskState.create_by_parent(action.action, logger).action!.start({ task_id: result.resp!.task_id! })
                        if (check_state.resp!.state.state == cyfs.TransTaskState.Downloading || check_state.resp!.state.state == cyfs.TransTaskState.Finished) {
                            logger.info(`${result.resp!.task_id} 任务状态为：${check_state.resp!.state.state}`)
                            logger.info(`${result.resp!.task_id} 下载进度：${JSON.stringify(check_state.resp!.state.on_air_state)}`)
                            logger.info(`${result.resp!.task_id} 上传速度：${JSON.stringify(check_state.resp!.state.upload_speed)}`)
                            logger.info(`${result.resp!.task_id} group ：${check_state.resp!.group}`)
                        } else {
                            assert.ok(false, "错误任务状态")
                        }
                        assert.equal(check_state.resp!.group, `${dec_app_1.to_base_58()}/group/${path_id}`)
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

                        }, logger);
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

                        }, logger);

                        let result = await action.start({

                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                            auto_start: false
                        });
                        assert.equal(result.err, 0, result.log);


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
                        logger.info(`control_task result ： ${JSON.stringify(JSON.stringify(control_info))}`);
                        assert.ok(!control_info.err, control_info.val?.msg);
                        // remote 检查 任务状态
                        let check_state = await action_api.GetTransTaskState.create_by_parent(action.action, logger).action!.start({ task_id: result.resp!.task_id! })
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

                        }, logger);
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

                        }, logger);

                        let result = await action.start({

                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                            auto_start: false
                        });
                        assert.equal(result.err, 0, result.log);


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
                        assert.equal(start_info.val?.code, 7, start_info.val?.msg);
                        await sleep(10 * 1000);
                        // remote 检查 任务状态
                        let check_state = await action_api.GetTransTaskState.create_by_parent(action.action, logger).action!.start({ task_id: result.resp!.task_id! })
                        if (check_state.resp!.state.state == cyfs.TransTaskState.Paused) {
                            logger.info(`${result.resp!.task_id} 任务状态为：${check_state.resp!.state.state}`)
                            logger.info(`${result.resp!.task_id} 下载进度：${JSON.stringify(check_state.resp!.state.on_air_state)}`)
                            logger.info(`${result.resp!.task_id} 上传速度：${JSON.stringify(check_state.resp!.state.upload_speed)}`)
                            logger.info(`${result.resp!.task_id} group ：${check_state.resp!.group}`)
                        } else {
                            assert.ok(false, "错误任务状态")
                        }
                        assert.equal(check_state.resp!.group, `${dec_app_1.to_base_58()}/group/${path_id}`)
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

                        }, logger);
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

                        }, logger);

                        let result = await action.start({

                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                            auto_start: true
                        });
                        assert.equal(result.err, 0, result.log);


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
                        logger.info(`start_task ： ${JSON.stringify(JSON.stringify(start_info))}`);
                        assert.ok(!start_info.err, start_info.val?.msg);
                        // remote 检查 任务状态
                        let check_state = await action_api.GetTransTaskState.create_by_parent(action.action, logger).action!.start({ task_id: result.resp!.task_id! })
                        if (check_state.resp!.state.state == cyfs.TransTaskState.Downloading || check_state.resp!.state.state == cyfs.TransTaskState.Finished) {
                            logger.info(`${result.resp!.task_id} 任务状态为：${check_state.resp!.state.state}`)
                            logger.info(`${result.resp!.task_id} 下载进度：${JSON.stringify(check_state.resp!.state.on_air_state)}`)
                            logger.info(`${result.resp!.task_id} 上传速度：${JSON.stringify(check_state.resp!.state.upload_speed)}`)
                            logger.info(`${result.resp!.task_id} group ：${check_state.resp!.group}`)
                        } else {
                            assert.ok(false, "错误任务状态")
                        }
                        assert.equal(check_state.resp!.group, `${dec_app_1.to_base_58()}/group/${path_id}`)
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

                        }, logger);
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

                        }, logger);

                        let result = await action.start({

                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                            auto_start: true
                        });
                        assert.equal(result.err, 0, result.log);


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
                        logger.info(`delete_task ： ${JSON.stringify(JSON.stringify(start_info))}`);
                        assert.ok(!start_info.err, start_info.val?.msg);
                        // remote 检查 任务状态
                        let check_state = await action_api.GetTransTaskState.create_by_parent(action.action, logger).action!.start({ task_id: result.resp!.task_id! })
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

                        }, logger);
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

                        }, logger);

                        let result = await action.start({

                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                            auto_start: true
                        });
                        assert.equal(result.err, 0, result.log);


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
                        logger.info(`start_task ： ${JSON.stringify(JSON.stringify(start_info))}`);
                        assert.ok(!start_info.err, start_info.val?.msg);
                        // remote 检查 任务状态
                        let check_state = await action_api.GetTransTaskState.create_by_parent(action.action, logger).action!.start({ task_id: result.resp!.task_id! })
                        if (check_state.resp!.state.state == cyfs.TransTaskState.Paused) {
                            logger.info(`${result.resp!.task_id} 任务状态为：${check_state.resp!.state.state}`)
                            logger.info(`${result.resp!.task_id} 下载进度：${JSON.stringify(check_state.resp!.state.on_air_state)}`)
                            logger.info(`${result.resp!.task_id} 上传速度：${JSON.stringify(check_state.resp!.state.upload_speed)}`)
                            logger.info(`${result.resp!.task_id} group ：${check_state.resp!.group}`)
                        } else {
                            assert.ok(false, "错误任务状态")
                        }
                        assert.equal(check_state.resp!.group, `${dec_app_1.to_base_58()}/group/${path_id}`)
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

                        }, logger);
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

                        }, logger);

                        let result = await action.start({

                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                            auto_start: true,
                            action: cyfs.TransTaskControlAction.Stop
                        });
                        assert.equal(result.err, 0, result.log);


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
                        let check_state = await action_api.GetTransTaskState.create_by_parent(action.action, logger).action!.start({ task_id: result.resp!.task_id! })
                        if (check_state.resp!.state.state == cyfs.TransTaskState.Downloading || check_state.resp!.state.state == cyfs.TransTaskState.Finished) {
                            logger.info(`${result.resp!.task_id} 任务状态为：${check_state.resp!.state.state}`)
                            logger.info(`${result.resp!.task_id} 下载进度：${JSON.stringify(check_state.resp!.state.on_air_state)}`)
                            logger.info(`${result.resp!.task_id} 上传速度：${JSON.stringify(check_state.resp!.state.upload_speed)}`)
                            logger.info(`${result.resp!.task_id} group ：${check_state.resp!.group}`)
                        } else {
                            assert.ok(false, "错误任务状态")
                        }
                        assert.equal(check_state.resp!.group, `${dec_app_1.to_base_58()}/group/${path_id}`)
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

                        }, logger);
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

                        }, logger);

                        let result = await action.start({

                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                            auto_start: true,
                            action: cyfs.TransTaskControlAction.Stop
                        });
                        assert.equal(result.err, 0, result.log);


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
                        logger.info(`control_task result ： ${JSON.stringify(JSON.stringify(control_info))}`);
                        assert.ok(!control_info.err, control_info.val?.msg);
                        // remote 检查 任务状态
                        let check_state = await action_api.GetTransTaskState.create_by_parent(action.action, logger).action!.start({ task_id: result.resp!.task_id! })
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

                        }, logger);
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

                        }, logger);

                        let result = await action.start({

                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                            auto_start: true,
                            action: cyfs.TransTaskControlAction.Stop,
                            action_wait: 5 * 1000
                        });
                        assert.equal(result.err, 0, result.log);


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
                        let check_state = await action_api.GetTransTaskState.create_by_parent(action.action, logger).action!.start({ task_id: result.resp!.task_id! })
                        if (check_state.resp!.state.state == cyfs.TransTaskState.Paused) {
                            logger.info(`${result.resp!.task_id} 任务状态为：${check_state.resp!.state.state}`)
                            logger.info(`${result.resp!.task_id} 下载进度：${JSON.stringify(check_state.resp!.state.on_air_state)}`)
                            logger.info(`${result.resp!.task_id} 上传速度：${JSON.stringify(check_state.resp!.state.upload_speed)}`)
                            logger.info(`${result.resp!.task_id} group ：${check_state.resp!.group}`)
                        } else {
                            assert.ok(false, "错误任务状态")
                        }
                        assert.equal(check_state.resp!.group, `${dec_app_1.to_base_58()}/group/${path_id}`)
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

                        }, logger);
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

                        }, logger);

                        let result = await action.start({

                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                            auto_start: true,
                        });
                        assert.equal(result.err, 0, result.log);


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
                        let check_state = await action_api.GetTransTaskState.create_by_parent(action.action, logger).action!.start({ task_id: result.resp!.task_id! })
                        if (check_state.resp!.state.state == cyfs.TransTaskState.Downloading || check_state.resp!.state.state == cyfs.TransTaskState.Finished) {
                            logger.info(`${result.resp!.task_id} 任务状态为：${check_state.resp!.state.state}`)
                            logger.info(`${result.resp!.task_id} 下载进度：${JSON.stringify(check_state.resp!.state.on_air_state)}`)
                            logger.info(`${result.resp!.task_id} 上传速度：${JSON.stringify(check_state.resp!.state.upload_speed)}`)
                            logger.info(`${result.resp!.task_id} group ：${check_state.resp!.group}`)
                        } else {
                            assert.ok(false, "错误任务状态")
                        }
                        assert.equal(check_state.resp!.group, `${dec_app_1.to_base_58()}/group/${path_id}`)
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

                        }, logger);
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

                        }, logger);

                        let result = await action.start({

                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                            auto_start: true,
                        });
                        assert.equal(result.err, 0, result.log);


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
                        logger.info(`control_task result ： ${JSON.stringify(JSON.stringify(control_info))}`);
                        assert.ok(!control_info.err, control_info.val?.msg);
                        // remote 检查 任务状态
                        let check_state = await action_api.GetTransTaskState.create_by_parent(action.action, logger).action!.start({ task_id: result.resp!.task_id! })
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

                        }, logger);
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

                        }, logger);

                        let result = await action.start({

                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                            auto_start: true,
                            action_wait: 5000,
                        });
                        assert.equal(result.err, 0, result.log);


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
                        let check_state = await action_api.GetTransTaskState.create_by_parent(action.action, logger).action!.start({ task_id: result.resp!.task_id! })
                        if (check_state.resp!.state.state == cyfs.TransTaskState.Paused) {
                            logger.info(`${result.resp!.task_id} 任务状态为：${check_state.resp!.state.state}`)
                            logger.info(`${result.resp!.task_id} 下载进度：${JSON.stringify(check_state.resp!.state.on_air_state)}`)
                            logger.info(`${result.resp!.task_id} 上传速度：${JSON.stringify(check_state.resp!.state.upload_speed)}`)
                            logger.info(`${result.resp!.task_id} group ：${check_state.resp!.group}`)
                        } else {
                            assert.ok(false, "错误任务状态")
                        }
                        assert.equal(check_state.resp!.group, `${dec_app_1.to_base_58()}/group/${path_id}`)
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

                        }, logger);
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

                        }, logger);

                        let result = await action.start({

                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)

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
                        let check_state = await action_api.GetTransTaskState.create_by_parent(action.action, logger).action!.start({ task_id: result.resp!.task_id! })
                        if (check_state.resp!.state.state == cyfs.TransTaskState.Finished) {
                            logger.info(`${result.resp!.task_id} 任务状态为：${check_state.resp!.state.state}`)
                            logger.info(`${result.resp!.task_id} 下载进度：${JSON.stringify(check_state.resp!.state.on_air_state)}`)
                            logger.info(`${result.resp!.task_id} 上传速度：${JSON.stringify(check_state.resp!.state.upload_speed)}`)
                            logger.info(`${result.resp!.task_id} group: ${check_state.resp!.group}`)
                        } else {
                            await sleep(2000)
                            let check_second = await action_api.GetTransTaskState.create_by_parent(action.action, logger).action!.start({ task_id: result.resp!.task_id! });
                            if (check_second.resp!.state.state != cyfs.TransTaskState.Finished) {
                                assert.ok(false, "错误任务状态")
                            }
                        }
                        assert.equal(check_state.resp!.group, `${dec_app_1.to_base_58()}/group/${path_id}`)
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

                        }, logger);
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

                        }, logger);

                        let result = await action.start({

                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)

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

                        }, logger);
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

                        }, logger);

                        let result = await action.start({

                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)

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
                        logger.info(`delete_task result = ${start_info}`)
                        assert.equal(start_info.err, false, start_info.val?.msg);
                    })
                })
                describe("File传输 Task 初始化状态为Err： 调用Start/Stop/Delete", () => {
                    // TODD  目前无法构造 Err 类型任务。
                })
            })
        })
        describe("Trans 传输 Group功能测试", async () => {
            describe("group 树状结构构造", async () => {
                it("group 节点挂载单个task - 同步创建", async () => {
                    // 使用dec_app1 http 请求创建树状结构1
                    let trans_file_tree_action = new action_api.BuildTransGroupTreeAsync({
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

                    }, logger);
                    let path_id = RandomGenerator.string(20)
                    let result_handler = await trans_file_tree_action.start({
                        root_req_path: `/req_path/${path_id}`,
                        task_list: [
                            {
                                req_path: `/req_path/${path_id}/groupA/task0`,
                                context_path: `/context_path/${path_id}/groupA`,
                                group: `/group_path/${path_id}/groupA/`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupA/task1`,
                                context_path: `/context_path/${path_id}/groupA/task1`,
                                group: `/group_path/${path_id}/groupA/task1`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupA/task2`,
                                context_path: `/context_path/${path_id}/groupA/task2`,
                                group: `/group_path/${path_id}/groupA/task2`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupB/task0`,
                                context_path: `/context_path/${path_id}/groupB`,
                                group: `/group_path/${path_id}/groupB/`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupB/task1`,
                                context_path: `/context_path/${path_id}/groupB/task1`,
                                group: `/group_path/${path_id}/groupB/task1`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupB/task2`,
                                context_path: `/context_path/${path_id}/groupB/task1`,
                                group: `/group_path/${path_id}/groupB/task2`
                            },
                        ]
                    });
                    logger.info(`${JSON.stringify(result_handler)}`)
                    assert.equal(result_handler.err, 0, result_handler.log);
                    // 查询group 状态
                    let check_state1_action = await new action_api.GetTransGroupState({
                        local: {
                            peer_name: "zone1_ood",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        },
                        input: {
                            timeout: 200 * 1000,
                        },
                        expect: { err: 0 },

                    }, logger).start({ group: `/group_path/${path_id}/groupA/` });
                    logger.info(`check_state1_action = ${JSON.stringify(check_state1_action)}`);

                    //使用dec_app2 WebSocket 请求创建树状结构2
                    let trans_file_tree_action2 = new action_api.BuildTransGroupTreeAsync({
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

                    }, logger);
                    let path_id2 = RandomGenerator.string(20)
                    let result_handler2 = await trans_file_tree_action2.start({
                        root_req_path: `/req_path/${path_id2}`,
                        task_list: [
                            {
                                req_path: `/req_path/${path_id2}/groupA/task0`,
                                context_path: `/context_path/${path_id2}/groupA`,
                                group: `/group_path/${path_id2}/groupA/`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupA/task1`,
                                context_path: `/context_path/${path_id2}/groupA/task1`,
                                group: `/group_path/${path_id2}/groupA/task1`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupA/task2`,
                                context_path: `/context_path/${path_id2}/groupA/task2`,
                                group: `/group_path/${path_id2}/groupA/task2`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupB/task0`,
                                context_path: `/context_path/${path_id2}/groupB`,
                                group: `/group_path/${path_id2}/groupB/`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupB/task1`,
                                context_path: `/context_path/${path_id2}/groupB/task1`,
                                group: `/group_path/${path_id2}/groupB/task1`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupB/task2`,
                                context_path: `/context_path/${path_id2}/groupB/task2`,
                                group: `/group_path/${path_id2}/groupB/task2`
                            },
                        ]
                    });
                    logger.info(`${JSON.stringify(result_handler2)}`)
                    assert.equal(result_handler2.err, 0, result_handler2.log);
                    // 查询group 状态
                    let check_state2_action = await new action_api.GetTransGroupState({
                        local: {
                            peer_name: "zone1_ood",
                            dec_id: dec_app_2.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.WebSocket
                        },
                        input: {
                            timeout: 200 * 1000,
                        },
                        expect: { err: 0 },

                    }, logger).start({ group: `/group_path/${path_id2}/groupB/` });
                    logger.info(`check_state1_action = ${JSON.stringify(check_state2_action)}`);
                })
                //【简单压力测试】
                it.skip("group 节点挂载5个task - 异步创建", async () => {
                    // 使用dec_app1 http 请求创建树状结构1
                    let trans_file_tree_action = new action_api.BuildTransGroupTree({
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
                            file_size: 10 * 1024 * 1024,
                            chunk_size: 4 * 1024 * 1024,
                            non_level: cyfs.NONAPILevel.NON,
                            ndn_level: cyfs.NDNAPILevel.NDN,
                        },
                        expect: { err: 0 },

                    }, logger);
                    let path_id = RandomGenerator.string(20)
                    let result_handler = await trans_file_tree_action.start({
                        root_req_path: `/req_path/${path_id}`,
                        task_list: [
                            {
                                req_path: `/req_path/${path_id}/groupA/task0`,
                                context_path: `/context_path/${path_id}/groupA`,
                                group: `/group_path/${path_id}/groupA/`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupA/task1`,
                                context_path: `/context_path/${path_id}/groupA`,
                                group: `/group_path/${path_id}/groupA/`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupA/task2`,
                                context_path: `/context_path/${path_id}/groupA`,
                                group: `/group_path/${path_id}/groupA/`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupA/task3`,
                                context_path: `/context_path/${path_id}/groupA`,
                                group: `/group_path/${path_id}/groupA/`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupA/task4`,
                                context_path: `/context_path/${path_id}/groupA`,
                                group: `/group_path/${path_id}/groupA/`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupA/group1/task0`,
                                context_path: `/context_path/${path_id}/groupA/group1`,
                                group: `/group_path/${path_id}/groupA/group1`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupA/group1/task1`,
                                context_path: `/context_path/${path_id}/groupA/group1`,
                                group: `/group_path/${path_id}/groupA/group1`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupA/group1/task2`,
                                context_path: `/context_path/${path_id}/groupA/group1`,
                                group: `/group_path/${path_id}/groupA/group1`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupA/group1/task3`,
                                context_path: `/context_path/${path_id}/groupA/group1`,
                                group: `/group_path/${path_id}/groupA/group1`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupA/group1/task4`,
                                context_path: `/context_path/${path_id}/groupA/group1`,
                                group: `/group_path/${path_id}/groupA/group1`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupA/group2/task0`,
                                context_path: `/context_path/${path_id}/groupA/group2`,
                                group: `/group_path/${path_id}/groupA/group2`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupA/group2/task1`,
                                context_path: `/context_path/${path_id}/groupA/group2`,
                                group: `/group_path/${path_id}/groupA/group2`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupA/group2/task2`,
                                context_path: `/context_path/${path_id}/groupA/group2`,
                                group: `/group_path/${path_id}/groupA/group2`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupA/group2/task3`,
                                context_path: `/context_path/${path_id}/groupA/group2`,
                                group: `/group_path/${path_id}/groupA/group2`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupA/group2/task4`,
                                context_path: `/context_path/${path_id}/groupA/group2`,
                                group: `/group_path/${path_id}/groupA/group2`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupB/task0`,
                                context_path: `/context_path/${path_id}/groupB`,
                                group: `/group_path/${path_id}/groupB/`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupB/task1`,
                                context_path: `/context_path/${path_id}/groupB`,
                                group: `/group_path/${path_id}/groupB/`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupB/task2`,
                                context_path: `/context_path/${path_id}/groupB`,
                                group: `/group_path/${path_id}/groupB/`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupB/task3`,
                                context_path: `/context_path/${path_id}/groupB`,
                                group: `/group_path/${path_id}/groupB/`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupB/task4`,
                                context_path: `/context_path/${path_id}/groupB`,
                                group: `/group_path/${path_id}/groupB/`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupB/group1/task0`,
                                context_path: `/context_path/${path_id}/groupB/group1`,
                                group: `/group_path/${path_id}/groupB/group1`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupB/group1/task1`,
                                context_path: `/context_path/${path_id}/groupB/group1`,
                                group: `/group_path/${path_id}/groupB/group1`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupB/group1/task2`,
                                context_path: `/context_path/${path_id}/groupB/group1`,
                                group: `/group_path/${path_id}/groupB/group1`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupB/group1/task3`,
                                context_path: `/context_path/${path_id}/groupB/group1`,
                                group: `/group_path/${path_id}/groupB/group1`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupB/group1/task4`,
                                context_path: `/context_path/${path_id}/groupB/group1`,
                                group: `/group_path/${path_id}/groupB/group1`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupB/group2/task0`,
                                context_path: `/context_path/${path_id}/groupB/group2`,
                                group: `/group_path/${path_id}/groupB/group2`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupB/group2/task1`,
                                context_path: `/context_path/${path_id}/groupB/group2`,
                                group: `/group_path/${path_id}/groupB/group2`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupB/group2/task2`,
                                context_path: `/context_path/${path_id}/groupB/group2`,
                                group: `/group_path/${path_id}/groupB/group2`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupB/group2/task3`,
                                context_path: `/context_path/${path_id}/groupB/group2`,
                                group: `/group_path/${path_id}/groupB/group2`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupB/group2/task4`,
                                context_path: `/context_path/${path_id}/groupB/group2`,
                                group: `/group_path/${path_id}/groupB/group2`
                            },
                        ]
                    });
                    logger.info(`${JSON.stringify(result_handler)}`)
                    assert.equal(result_handler.err, 0, result_handler.log);
                    // 查询group 状态
                    let check_state1_action = await new action_api.GetTransGroupState({
                        local: {
                            peer_name: "zone1_ood",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        },
                        input: {
                            timeout: 200 * 1000,
                        },
                        expect: { err: 0 },

                    }, logger).start({ group: `/group_path/${path_id}/groupA/` });
                    logger.info(`check_state1_action = ${JSON.stringify(check_state1_action)}`);
                    // 等待group传输完成
                    let group_listerner1 = await new action_api.GroupStateListerner({
                        local: {
                            peer_name: "zone1_ood",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        },
                        input: {
                            timeout: 500 * 1000,
                        },
                        expect: { err: 0 },

                    }, logger).start({ group: `/group_path/${path_id}/` });
                    logger.info(`group_listerner1 = ${JSON.stringify(group_listerner1)}`);
                    //使用dec_app2 WebSocket 请求创建树状结构2
                    let trans_file_tree_action2 = new action_api.BuildTransGroupTree({
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
                            timeout: 500 * 1000,
                            file_size: 10 * 1024 * 1024,
                            chunk_size: 4 * 1024 * 1024,
                            non_level: cyfs.NONAPILevel.NON,
                            ndn_level: cyfs.NDNAPILevel.NDN,
                        },
                        expect: { err: 0 },

                    }, logger);
                    let path_id2 = RandomGenerator.string(20)
                    let result_handler2 = await trans_file_tree_action2.start({
                        root_req_path: `/req_path/${path_id2}`,
                        task_list: [
                            {
                                req_path: `/req_path/${path_id2}/groupA/task0`,
                                context_path: `/context_path/${path_id2}/groupA`,
                                group: `/group_path/${path_id2}/groupA/`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupA/task1`,
                                context_path: `/context_path/${path_id2}/groupA`,
                                group: `/group_path/${path_id2}/groupA/`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupA/task2`,
                                context_path: `/context_path/${path_id2}/groupA`,
                                group: `/group_path/${path_id2}/groupA/`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupA/task3`,
                                context_path: `/context_path/${path_id2}/groupA`,
                                group: `/group_path/${path_id2}/groupA/`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupA/task4`,
                                context_path: `/context_path/${path_id2}/groupA`,
                                group: `/group_path/${path_id2}/groupA/`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupA/group1/task0`,
                                context_path: `/context_path/${path_id2}/groupA/group1`,
                                group: `/group_path/${path_id2}/groupA/group1`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupA/group1/task1`,
                                context_path: `/context_path/${path_id2}/groupA/group1`,
                                group: `/group_path/${path_id2}/groupA/group1`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupA/group1/task2`,
                                context_path: `/context_path/${path_id2}/groupA/group1`,
                                group: `/group_path/${path_id2}/groupA/group1`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupA/group1/task3`,
                                context_path: `/context_path/${path_id2}/groupA/group1`,
                                group: `/group_path/${path_id2}/groupA/group1`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupA/group1/task4`,
                                context_path: `/context_path/${path_id2}/groupA/group1`,
                                group: `/group_path/${path_id2}/groupA/group1`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupA/group2/task0`,
                                context_path: `/context_path/${path_id2}/groupA/group2`,
                                group: `/group_path/${path_id2}/groupA/group2`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupA/group2/task1`,
                                context_path: `/context_path/${path_id2}/groupA/group2`,
                                group: `/group_path/${path_id2}/groupA/group2`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupA/group2/task2`,
                                context_path: `/context_path/${path_id2}/groupA/group2`,
                                group: `/group_path/${path_id2}/groupA/group2`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupA/group2/task3`,
                                context_path: `/context_path/${path_id2}/groupA/group2`,
                                group: `/group_path/${path_id2}/groupA/group2`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupA/group2/task4`,
                                context_path: `/context_path/${path_id2}/groupA/group2`,
                                group: `/group_path/${path_id2}/groupA/group2`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupB/task0`,
                                context_path: `/context_path/${path_id2}/groupB`,
                                group: `/group_path/${path_id2}/groupB/`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupB/task1`,
                                context_path: `/context_path/${path_id2}/groupB`,
                                group: `/group_path/${path_id2}/groupB/`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupB/task2`,
                                context_path: `/context_path/${path_id2}/groupB`,
                                group: `/group_path/${path_id2}/groupB/`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupB/task3`,
                                context_path: `/context_path/${path_id2}/groupB`,
                                group: `/group_path/${path_id2}/groupB/`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupB/task4`,
                                context_path: `/context_path/${path_id2}/groupB`,
                                group: `/group_path/${path_id2}/groupB/`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupB/group1/task0`,
                                context_path: `/context_path/${path_id2}/groupB/group1`,
                                group: `/group_path/${path_id2}/groupB/group1`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupB/group1/task1`,
                                context_path: `/context_path/${path_id2}/groupB/group1`,
                                group: `/group_path/${path_id2}/groupB/group1`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupB/group1/task2`,
                                context_path: `/context_path/${path_id2}/groupB/group1`,
                                group: `/group_path/${path_id2}/groupB/group1`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupB/group1/task3`,
                                context_path: `/context_path/${path_id2}/groupB/group1`,
                                group: `/group_path/${path_id2}/groupB/group1`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupB/group1/task4`,
                                context_path: `/context_path/${path_id2}/groupB/group1`,
                                group: `/group_path/${path_id2}/groupB/group1`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupB/group2/task0`,
                                context_path: `/context_path/${path_id2}/groupB/group2`,
                                group: `/group_path/${path_id2}/groupB/group2`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupB/group2/task1`,
                                context_path: `/context_path/${path_id2}/groupB/group2`,
                                group: `/group_path/${path_id2}/groupB/group2`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupB/group2/task2`,
                                context_path: `/context_path/${path_id2}/groupB/group2`,
                                group: `/group_path/${path_id2}/groupB/group2`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupB/group2/task3`,
                                context_path: `/context_path/${path_id2}/groupB/group2`,
                                group: `/group_path/${path_id2}/groupB/group2`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupB/group2/task4`,
                                context_path: `/context_path/${path_id2}/groupB/group2`,
                                group: `/group_path/${path_id2}/groupB/group2`
                            },
                        ]
                    });
                    logger.info(`${JSON.stringify(result_handler2)}`)
                    assert.equal(result_handler2.err, 0, result_handler2.log);
                    // 查询group 状态
                    let check_state2_action = await new action_api.GetTransGroupState({
                        local: {
                            peer_name: "zone1_ood",
                            dec_id: dec_app_2.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.WebSocket
                        },
                        input: {
                            timeout: 200 * 1000,
                        },
                        expect: { err: 0 },

                    }, logger).start({ group: `/group_path/${path_id2}/groupB/` });
                    logger.info(`check_state1_action = ${JSON.stringify(check_state2_action)}`);
                    // 等待group传输完成
                    let group_listerner2 = await new action_api.GroupStateListerner({
                        local: {
                            peer_name: "zone1_ood",
                            dec_id: dec_app_2.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.WebSocket
                        },
                        input: {
                            timeout: 500 * 1000,
                        },
                        expect: { err: 0 },

                    }, logger).start({ group: `/group_path/${path_id2}/` });
                    logger.info(`group_listerner2 = ${JSON.stringify(group_listerner2)}`);
                })
            })
            describe("group 任务调度控制-group状态切换", async () => {
                describe("Group 下 trans task 完成状态对Group状态影响 ", async () => {
                    it("目前group 下trans task完成，不会修改group 状态", async () => {
                        // 使用dec_app1 http 请求创建树状结构1
                        let trans_file_tree_action = new action_api.BuildTransGroupTreeAsync({
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

                        }, logger);
                        let path_id = RandomGenerator.string(20)
                        let result_handler = await trans_file_tree_action.start({
                            root_req_path: `/req_path/${path_id}`,
                            task_list: [
                                {
                                    req_path: `/req_path/${path_id}/groupA/task0`,
                                    context_path: `/context_path/${path_id}/groupA`,
                                    group: `/group_path/${path_id}/groupA/`
                                },
                                {
                                    req_path: `/req_path/${path_id}/groupA/task1`,
                                    context_path: `/context_path/${path_id}/groupA/task1`,
                                    group: `/group_path/${path_id}/groupA/task1`
                                },
                                {
                                    req_path: `/req_path/${path_id}/groupA/task2`,
                                    context_path: `/context_path/${path_id}/groupA/task2`,
                                    group: `/group_path/${path_id}/groupA/task2`
                                },
                                {
                                    req_path: `/req_path/${path_id}/groupB/task0`,
                                    context_path: `/context_path/${path_id}/groupB`,
                                    group: `/group_path/${path_id}/groupB/`
                                },
                                {
                                    req_path: `/req_path/${path_id}/groupB/task1`,
                                    context_path: `/context_path/${path_id}/groupB/task1`,
                                    group: `/group_path/${path_id}/groupB/task1`
                                },
                                {
                                    req_path: `/req_path/${path_id}/groupB/task2`,
                                    context_path: `/context_path/${path_id}/groupB/task1`,
                                    group: `/group_path/${path_id}/groupB/task2`
                                },
                            ]
                        });
                        logger.info(`${JSON.stringify(result_handler)}`)
                        assert.equal(result_handler.err, 0, result_handler.log);
                        // 查询group 状态
                        let check_state1_action = await new action_api.GetTransGroupState({
                            local: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                            },
                            expect: { err: 0 },

                        }, logger).start({ group: `/group_path/${path_id}/groupA/` });
                        logger.info(`check_state1_action = ${JSON.stringify(check_state1_action)}`);
                        let stack = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_ood",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        }).stack!;
                        // 模拟下载端客户端查询任务状态,直到所有任务执行完成
                        for (let task of result_handler.resp!.task_list) {
                            let check_task_finished_action = await new action_api.WaitTaskFinished({
                                local: {
                                    peer_name: "zone1_ood",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                input: {
                                    timeout: 200 * 1000,
                                },
                                expect: { err: 0 },

                            }, logger).start({ task_id: task.task_id! });
                            logger.info(`task ${task.task_id} run finished , result = ${check_task_finished_action}`);
                        }
                        // 查询group 状态
                        let check_state2_action = await new action_api.GetTransGroupState({
                            local: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                            },
                            expect: { err: 0 },

                        }, logger).start({ group: `/group_path/${path_id}/groupA/` });
                        logger.info(`check_state2_action = ${JSON.stringify(check_state2_action)}`);

                    })
                })
                describe("当前任务状态DownloadTaskControlState Normal", async () => {
                    // dec_appA 每次测试生成 group 的随机值
                    let path_id = RandomGenerator.string(20);
                    let task_list1 = []; // 传输任务列表
                    // dec_appB 每次测试生成 group 的随机值
                    let path_id2 = RandomGenerator.string(20);
                    let task_list2 = [];// 传输任务列表
                    beforeEach(async () => {
                        // 构造Normal 状态 group
                        logger.info(`Build DownloadTaskControlState:Normal group tree`);
                        // 使用dec_app1 http 请求创建树状结构1
                        let trans_file_tree_action1 = new action_api.BuildTransGroupTree({
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

                        }, logger);
                        path_id = RandomGenerator.string(20)
                        let result_handler1 = await trans_file_tree_action1.start({
                            root_req_path: `/req_path/${path_id}`,
                            task_list: [
                                {
                                    req_path: `/req_path/${path_id}/groupA/task0`,
                                    context_path: `/context_path/${path_id}/groupA`,
                                    group: `/group_path/${path_id}/groupA/`,
                                },
                                {
                                    req_path: `/req_path/${path_id}/groupA/task1`,
                                    context_path: `/context_path/${path_id}/groupA/task1`,
                                    group: `/group_path/${path_id}/groupA/task1`,
                                },
                                {
                                    req_path: `/req_path/${path_id}/groupA/task2`,
                                    context_path: `/context_path/${path_id}/groupA/task2`,
                                    group: `/group_path/${path_id}/groupA/task2`,
                                    
                                },
                                {
                                    req_path: `/req_path/${path_id}/groupB/task0`,
                                    context_path: `/context_path/${path_id}/groupB`,
                                    group: `/group_path/${path_id}/groupB/`,
                                },
                                {
                                    req_path: `/req_path/${path_id}/groupB/task1`,
                                    context_path: `/context_path/${path_id}/groupB/task1`,
                                    group: `/group_path/${path_id}/groupB/task1`,
                                },
                                {
                                    req_path: `/req_path/${path_id}/groupB/task2`,
                                    context_path: `/context_path/${path_id}/groupB/task1`,
                                    group: `/group_path/${path_id}/groupB/task2`,
                                },
                            ]
                        });
                        logger.info(`${JSON.stringify(result_handler1)}`)
                        assert.equal(result_handler1.err, 0, result_handler1.log);
                        task_list1 = result_handler1.resp!.task_list;
                        // 查询group 状态
                        let check_state1_action = await new action_api.GetTransGroupState({
                            local: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                            },
                            expect: { err: 0 },

                        }, logger).start({ group: `/group_path/${path_id}/groupA/` });
                        logger.info(`check_state1_action = ${JSON.stringify(check_state1_action)}`);

                        //使用dec_app2 WebSocket 请求创建树状结构2
                        let trans_file_tree_action2 = new action_api.BuildTransGroupTree({
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

                        }, logger);
                        path_id2 = RandomGenerator.string(20)
                        let result_handler2 = await trans_file_tree_action2.start({
                            root_req_path: `/req_path/${path_id2}`,
                            task_list: [
                                {
                                    req_path: `/req_path/${path_id2}/groupA/task0`,
                                    context_path: `/context_path/${path_id2}/groupA`,
                                    group: `/group_path/${path_id2}/groupA/`
                                },
                                {
                                    req_path: `/req_path/${path_id2}/groupA/task1`,
                                    context_path: `/context_path/${path_id2}/groupA/task1`,
                                    group: `/group_path/${path_id2}/groupA/task1`
                                },
                                {
                                    req_path: `/req_path/${path_id2}/groupA/task2`,
                                    context_path: `/context_path/${path_id2}/groupA/task2`,
                                    group: `/group_path/${path_id2}/groupA/task2`
                                },
                                {
                                    req_path: `/req_path/${path_id2}/groupB/task0`,
                                    context_path: `/context_path/${path_id2}/groupB`,
                                    group: `/group_path/${path_id2}/groupB/`
                                },
                                {
                                    req_path: `/req_path/${path_id2}/groupB/task1`,
                                    context_path: `/context_path/${path_id2}/groupB/task1`,
                                    group: `/group_path/${path_id2}/groupB/task1`
                                },
                                {
                                    req_path: `/req_path/${path_id2}/groupB/task2`,
                                    context_path: `/context_path/${path_id2}/groupB/task2`,
                                    group: `/group_path/${path_id2}/groupB/task2`
                                },
                            ]
                        });
                        logger.info(`${JSON.stringify(result_handler2)}`)
                        assert.equal(result_handler2.err, 0, result_handler2.log);
                        task_list2 = result_handler2.resp!.task_list;
                        // 查询group 状态
                        let check_state2_action = await new action_api.GetTransGroupState({
                            local: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_2.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.WebSocket
                            },
                            input: {
                                timeout: 200 * 1000,
                            },
                            expect: { err: 0 },

                        }, logger).start({ group: `/group_path/${path_id2}/groupB/` });
                        logger.info(`check_state1_action = ${JSON.stringify(check_state2_action)}`);
                    })
                    it.skip("【Resume BDT未实现】发送控制指令 TransTaskGroupControlAction Resume", async () => {
                        // 下载端指定zone1_ood
                        let stack_http_decapp1 = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_ood",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        });
                        let stack_ws_decapp2 = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_ood",
                            dec_id: dec_app_2.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.WebSocket
                        });
                        // stack_http_decapp1 操作 `/group_path/${path_id}/groupA/` 发送控制指令 TransTaskGroupControlAction Resume
                        let control_action = await stack_http_decapp1.stack!.trans().control_task_group({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupA/`,
                            action: cyfs.TransTaskGroupControlAction.Resume
                        })
                        logger.info(`control_action resp = ${JSON.stringify(control_action)}`);
                        assert.equal(control_action.err, false, control_action.val.toString());
                        // stack_http_decapp1 检查兄弟路径 `/group_path/${path_id}/groupB/` 状态
                        let check0 = await stack_http_decapp1.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupB/`,
                        })
                        logger.info(`get_task_group_state resp = ${JSON.stringify(check0)}`);
                        assert.equal(check0.unwrap().control_state, cyfs.DownloadTaskControlState.Normal);
                        // stack_http_decapp1 检查 `/group_path/${path_id}/groupA/` 状态
                        let check1 = await stack_http_decapp1.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupA/`,
                        })
                        logger.info(`get_task_group_state resp = ${JSON.stringify(check1)}`);
                        assert.equal(check1.unwrap().control_state, cyfs.DownloadTaskControlState.Normal);
                        // stack_http_decapp1 检查 `/group_path/${path_id}/groupA/task1` 状态
                        let check2 = await stack_http_decapp1.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupA/task1`,
                        })
                        logger.info(`get_task_group_state resp = ${JSON.stringify(check2)}`);
                        assert.equal(check2.unwrap().control_state, cyfs.DownloadTaskControlState.Normal);
                        // stack_ws_decapp2 检查 `/group_path/${path_id2}/groupA/task1` 状态
                        let check3 = await stack_ws_decapp2.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id2}/groupA/task1`,
                        })
                        logger.info(`get_task_group_state resp = ${JSON.stringify(check3)}`);
                        assert.equal(check2.unwrap().control_state, cyfs.DownloadTaskControlState.Normal);
                    })
                    it("发送控制指令 TransTaskGroupControlAction Cancel", async () => {
                        // 下载端指定zone1_ood
                        let stack_http_decapp1 = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_ood",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        });
                        let stack_ws_decapp2 = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_ood",
                            dec_id: dec_app_2.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.WebSocket
                        });
                        // 验证子group 是否被删除
                        // let check0 = await stack_http_decapp1.stack!.trans().get_task_group_state({
                        //     common : {
                        //         level : cyfs.NDNAPILevel.NDC,
                        //         flags : 1,
                        //     },
                        //     group : `/group_path/${path_id}/groupA/task1`,
                        // })
                        // logger.info(`check0 get_task_group_state resp = ${JSON.stringify(check0)}`);
                        // assert.equal(check0.err,false,`${check0}`);
                        // assert.equal(check0.unwrap().control_state,cyfs.DownloadTaskControlState.Normal);
                        // stack_http_decapp1 操作 `/group_path/${path_id}/groupA/` 发送控制指令 TransTaskGroupControlAction Resume
                        let control_action = await stack_http_decapp1.stack!.trans().control_task_group({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupA/`,
                            action: cyfs.TransTaskGroupControlAction.Cancel
                        })
                        logger.info(`control_action resp = ${JSON.stringify(control_action)}`);
                        assert.equal(control_action.err, false, control_action.val.toString());
                        // stack_http_decapp1 检查兄弟路径 `/group_path/${path_id}/groupB/` 状态
                        let check0 = await stack_http_decapp1.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupB/`,
                        })
                        logger.info(`check1 get_task_group_state resp = ${JSON.stringify(check0)}`);
                        assert.equal(check0.err, false, `${check0}`);
                        assert.equal(check0.unwrap().control_state, cyfs.DownloadTaskControlState.Normal);
                        // stack_http_decapp1 检查 `/group_path/${path_id}/groupA/` 状态
                        let check1 = await stack_http_decapp1.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupA/`,
                        })
                        logger.info(`check1 get_task_group_state resp = ${JSON.stringify(check1)}`);
                        assert.equal(check1.err, false, `${check1}`);
                        assert.equal(check1.unwrap().control_state, cyfs.DownloadTaskControlState.Canceled);
                        // stack_http_decapp1 检查 `/group_path/${path_id}/groupA/task1` 状态
                        let check2 = await stack_http_decapp1.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupA/task1`,
                        })
                        logger.info(`check2 get_task_group_state resp = ${JSON.stringify(check2)}`);
                        assert.equal(check2.err, true, `${check2}`);
                        if(check2.err){
                            assert.equal(check2.val!.code,4,check2.val!.msg);
                        }
                        
                        // stack_ws_decapp2 检查 `/group_path/${path_id2}/groupA/task1` 状态
                        let check3 = await stack_ws_decapp2.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id2}/groupA/task1`,
                        })
                        logger.info(`check3 get_task_group_state resp = ${JSON.stringify(check3)}`);
                        assert.equal(check3.err, false, `${check3}`);
       
                    })
                    it.skip("【Pause BDT未实现】发送控制指令 TransTaskGroupControlAction Pause", async () => {
                        // 下载端指定zone1_ood
                        let stack_http_decapp1 = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_ood",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        });
                        let stack_ws_decapp2 = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_ood",
                            dec_id: dec_app_2.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.WebSocket
                        });
                        // stack_http_decapp1 操作 `/group_path/${path_id}/groupA/` 发送控制指令 TransTaskGroupControlAction Pause
                        let control_action = await stack_http_decapp1.stack!.trans().control_task_group({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupA/`,
                            action: cyfs.TransTaskGroupControlAction.Pause
                        })
                        logger.info(`/group_path/${path_id}/groupA/ send ${cyfs.TransTaskGroupControlAction.Pause} control_action resp = ${JSON.stringify(control_action)}`);
                        assert.equal(control_action.err, false, control_action.val.toString());
                        // stack_http_decapp1 检查 `/group_path/${path_id}/groupA/` 状态
                        let check1 = await stack_http_decapp1.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupA/`,
                        })
                        logger.info(`check1 get_task_group_state resp = ${JSON.stringify(check1)}`);
                        assert.equal(check1.unwrap().control_state, cyfs.DownloadTaskControlState.Paused);
                        // stack_http_decapp1 检查 `/group_path/${path_id}/groupA/task1` 状态
                        let check2 = await stack_http_decapp1.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupA/task1`,
                        })
                        logger.info(`check2 get_task_group_state resp = ${JSON.stringify(check2)}`);
                        assert.equal(check2.unwrap().control_state, cyfs.DownloadTaskControlState.Paused);
                        // stack_ws_decapp2 检查 `/group_path/${path_id2}/groupA/task1` 状态
                        let check3 = await stack_ws_decapp2.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id2}/groupA/task1`,
                        })
                        logger.info(`check3 get_task_group_state resp = ${JSON.stringify(check3)}`);
                        assert.equal(check3.unwrap().control_state, cyfs.DownloadTaskControlState.Normal);
                    })
                })
                // 
                describe.skip("【Pause BDT未实现】当前任务状态DownloadTaskControlState Paused", async () => {
                    // dec_appA 每次测试生成 group 的随机值
                    let path_id = RandomGenerator.string(20);
                    let task_list1 = []; // 传输任务列表
                    // dec_appB 每次测试生成 group 的随机值
                    let path_id2 = RandomGenerator.string(20);
                    let task_list2 = [];// 传输任务列表
                    beforeEach(async () => {
                        // 构造Normal 状态 group
                        logger.info(`Build DownloadTaskControlState:Normal group tree`);
                        // 使用dec_app1 http 请求创建树状结构1
                        let trans_file_tree_action1 = new action_api.BuildTransGroupTree({
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

                        }, logger);
                        path_id = RandomGenerator.string(20)
                        let result_handler1 = await trans_file_tree_action1.start({
                            root_req_path: `/req_path/${path_id}`,
                            task_list: [
                                {
                                    req_path: `/req_path/${path_id}/groupA/task0`,
                                    context_path: `/context_path/${path_id}/groupA`,
                                    group: `/group_path/${path_id}/groupA/`
                                },
                                {
                                    req_path: `/req_path/${path_id}/groupA/task1`,
                                    context_path: `/context_path/${path_id}/groupA/task1`,
                                    group: `/group_path/${path_id}/groupA/task1`
                                },
                                {
                                    req_path: `/req_path/${path_id}/groupA/task2`,
                                    context_path: `/context_path/${path_id}/groupA/task2`,
                                    group: `/group_path/${path_id}/groupA/task2`
                                },
                                {
                                    req_path: `/req_path/${path_id}/groupB/task0`,
                                    context_path: `/context_path/${path_id}/groupB`,
                                    group: `/group_path/${path_id}/groupB/`
                                },
                                {
                                    req_path: `/req_path/${path_id}/groupB/task1`,
                                    context_path: `/context_path/${path_id}/groupB/task1`,
                                    group: `/group_path/${path_id}/groupB/task1`
                                },
                                {
                                    req_path: `/req_path/${path_id}/groupB/task2`,
                                    context_path: `/context_path/${path_id}/groupB/task1`,
                                    group: `/group_path/${path_id}/groupB/task2`
                                },
                            ]
                        });
                        logger.info(`${JSON.stringify(result_handler1)}`)
                        assert.equal(result_handler1.err, 0, result_handler1.log);
                        task_list1 = result_handler1.resp!.task_list;
                        // 查询group 状态
                        let check_state1_action = await new action_api.GetTransGroupState({
                            local: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                            },
                            expect: { err: 0 },

                        }, logger).start({ group: `/group_path/${path_id}/groupA/` });
                        logger.info(`check_state1_action = ${JSON.stringify(check_state1_action)}`);

                        //使用dec_app2 WebSocket 请求创建树状结构2
                        let trans_file_tree_action2 = new action_api.BuildTransGroupTree({
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

                        }, logger);
                        path_id2 = RandomGenerator.string(20)
                        let result_handler2 = await trans_file_tree_action2.start({
                            root_req_path: `/req_path/${path_id2}`,
                            task_list: [
                                {
                                    req_path: `/req_path/${path_id2}/groupA/task0`,
                                    context_path: `/context_path/${path_id2}/groupA`,
                                    group: `/group_path/${path_id2}/groupA/`
                                },
                                {
                                    req_path: `/req_path/${path_id2}/groupA/task1`,
                                    context_path: `/context_path/${path_id2}/groupA/task1`,
                                    group: `/group_path/${path_id2}/groupA/task1`
                                },
                                {
                                    req_path: `/req_path/${path_id2}/groupA/task2`,
                                    context_path: `/context_path/${path_id2}/groupA/task2`,
                                    group: `/group_path/${path_id2}/groupA/task2`
                                },
                                {
                                    req_path: `/req_path/${path_id2}/groupB/task0`,
                                    context_path: `/context_path/${path_id2}/groupB`,
                                    group: `/group_path/${path_id2}/groupB/`
                                },
                                {
                                    req_path: `/req_path/${path_id2}/groupB/task1`,
                                    context_path: `/context_path/${path_id2}/groupB/task1`,
                                    group: `/group_path/${path_id2}/groupB/task1`
                                },
                                {
                                    req_path: `/req_path/${path_id2}/groupB/task2`,
                                    context_path: `/context_path/${path_id2}/groupB/task2`,
                                    group: `/group_path/${path_id2}/groupB/task2`
                                },
                            ]
                        });
                        logger.info(`${JSON.stringify(result_handler2)}`)
                        assert.equal(result_handler2.err, 0, result_handler2.log);
                        task_list2 = result_handler2.resp!.task_list;
                        // 查询group 状态
                        let check_state2_action = await new action_api.GetTransGroupState({
                            local: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_2.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.WebSocket
                            },
                            input: {
                                timeout: 200 * 1000,
                            },
                            expect: { err: 0 },

                        }, logger).start({ group: `/group_path/${path_id2}/groupB/` });
                        logger.info(`check_state1_action = ${JSON.stringify(check_state2_action)}`);
                        let stack_http_decapp1 = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_ood",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        });
                        let stack_ws_decapp2 = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_ood",
                            dec_id: dec_app_2.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.WebSocket
                        });
                        // stack_http_decapp1 操作 `/group_path/${path_id}/groupA/` 发送控制指令 TransTaskGroupControlAction Pause
                        let control_action1 = await stack_http_decapp1.stack!.trans().control_task_group({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupA/`,
                            action: cyfs.TransTaskGroupControlAction.Pause
                        })
                        logger.info(`/group_path/${path_id}/groupA/ send ${cyfs.TransTaskGroupControlAction.Pause} control_action resp = ${JSON.stringify(control_action1)}`);
                        let control_action2 = await stack_ws_decapp2.stack!.trans().control_task_group({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id2}/groupA/`,
                            action: cyfs.TransTaskGroupControlAction.Pause
                        })
                        logger.info(`/group_path/${path_id2}/groupA/ send ${cyfs.TransTaskGroupControlAction.Pause} control_action resp = ${JSON.stringify(control_action2)}`);

                    })
                    it("发送控制指令 TransTaskGroupControlAction Resume", async () => {
                        // 下载端指定zone1_ood
                        let stack_http_decapp1 = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_ood",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        });
                        let stack_ws_decapp2 = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_ood",
                            dec_id: dec_app_2.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.WebSocket
                        });
                        // stack_http_decapp1 操作 `/group_path/${path_id}/groupA/` 发送控制指令 TransTaskGroupControlAction Resume
                        let control_action = await stack_http_decapp1.stack!.trans().control_task_group({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupA/`,
                            action: cyfs.TransTaskGroupControlAction.Resume
                        })
                        logger.info(`control_action resp = ${JSON.stringify(control_action)}`);
                        assert.equal(control_action.err, false, control_action.val.toString());
                        // stack_http_decapp1 检查兄弟路径 `/group_path/${path_id}/groupB/` 状态
                        let check0 = await stack_http_decapp1.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupB/`,
                        })
                        logger.info(`get_task_group_state resp = ${JSON.stringify(check0)}`);
                        assert.equal(check0.unwrap().control_state, cyfs.DownloadTaskControlState.Normal);
                        // stack_http_decapp1 检查 `/group_path/${path_id}/groupA/` 状态
                        let check1 = await stack_http_decapp1.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupA/`,
                        })
                        logger.info(`get_task_group_state resp = ${JSON.stringify(check1)}`);
                        assert.equal(check1.unwrap().control_state, cyfs.DownloadTaskControlState.Normal);
                        // stack_http_decapp1 检查 `/group_path/${path_id}/groupA/task1` 状态
                        let check2 = await stack_http_decapp1.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupA/task1`,
                        })
                        logger.info(`get_task_group_state resp = ${JSON.stringify(check2)}`);
                        assert.equal(check2.unwrap().control_state, cyfs.DownloadTaskControlState.Normal);
                        // stack_ws_decapp2 检查 `/group_path/${path_id2}/groupA/task1` 状态
                        let check3 = await stack_ws_decapp2.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id2}/groupA/task1`,
                        })
                        logger.info(`get_task_group_state resp = ${JSON.stringify(check3)}`);
                        assert.equal(check3.unwrap().control_state, cyfs.DownloadTaskControlState.Normal);
                    })
                    it("发送控制指令 TransTaskGroupControlAction Cancel", async () => {
                        // 下载端指定zone1_ood
                        let stack_http_decapp1 = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_ood",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        });
                        let stack_ws_decapp2 = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_ood",
                            dec_id: dec_app_2.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.WebSocket
                        });
                        // 验证子group 是否被删除
                        // let check0 = await stack_http_decapp1.stack!.trans().get_task_group_state({
                        //     common : {
                        //         level : cyfs.NDNAPILevel.NDC,
                        //         flags : 1,
                        //     },
                        //     group : `/group_path/${path_id}/groupA/task1`,
                        // })
                        // logger.info(`check0 get_task_group_state resp = ${JSON.stringify(check0)}`);
                        // assert.equal(check0.err,false,`${check0}`);
                        // assert.equal(check0.unwrap().control_state,cyfs.DownloadTaskControlState.Normal);
                        // stack_http_decapp1 操作 `/group_path/${path_id}/groupA/` 发送控制指令 TransTaskGroupControlAction Resume
                        let control_action = await stack_http_decapp1.stack!.trans().control_task_group({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupA/`,
                            action: cyfs.TransTaskGroupControlAction.Cancel
                        })
                        logger.info(`control_action resp = ${JSON.stringify(control_action)}`);
                        assert.equal(control_action.err, false, control_action.val.toString());
                        // stack_http_decapp1 检查兄弟路径 `/group_path/${path_id}/groupB/` 状态
                        let check0 = await stack_http_decapp1.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupB/`,
                        })
                        logger.info(`check1 get_task_group_state resp = ${JSON.stringify(check0)}`);
                        assert.equal(check0.err, false, `${check0}`);
                        assert.equal(check0.unwrap().control_state, cyfs.DownloadTaskControlState.Normal);
                        // stack_http_decapp1 检查 `/group_path/${path_id}/groupA/` 状态
                        let check1 = await stack_http_decapp1.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupA/`,
                        })
                        logger.info(`check1 get_task_group_state resp = ${JSON.stringify(check1)}`);
                        assert.equal(check1.err, false, `${check1}`);
                        assert.equal(check1.unwrap().control_state, cyfs.DownloadTaskControlState.Canceled);
                        // stack_http_decapp1 检查 `/group_path/${path_id}/groupA/task1` 状态
                        let check2 = await stack_http_decapp1.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupA/task1`,
                        })
                        logger.info(`check2 get_task_group_state resp = ${JSON.stringify(check2)}`);
                        assert.equal(check2.err, false, `${check2}`);
                        assert.equal(check2.unwrap().control_state, cyfs.DownloadTaskControlState.Canceled);
                        // stack_ws_decapp2 检查 `/group_path/${path_id2}/groupA/task1` 状态
                        let check3 = await stack_ws_decapp2.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id2}/groupA/task1`,
                        })
                        logger.info(`check3 get_task_group_state resp = ${JSON.stringify(check3)}`);
                        assert.equal(check3.err, false, `${check3}`);
                        assert.equal(check3.unwrap().control_state, cyfs.DownloadTaskControlState.Normal);
                    })
                    it("【Pause BDT未实现】发送控制指令 TransTaskGroupControlAction Pause", async () => {
                        // 下载端指定zone1_ood
                        let stack_http_decapp1 = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_ood",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        });
                        let stack_ws_decapp2 = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_ood",
                            dec_id: dec_app_2.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.WebSocket
                        });
                        // stack_http_decapp1 操作 `/group_path/${path_id}/groupA/` 发送控制指令 TransTaskGroupControlAction Pause
                        let control_action = await stack_http_decapp1.stack!.trans().control_task_group({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupA/`,
                            action: cyfs.TransTaskGroupControlAction.Pause
                        })
                        logger.info(`/group_path/${path_id}/groupA/ send ${cyfs.TransTaskGroupControlAction.Pause} control_action resp = ${JSON.stringify(control_action)}`);
                        assert.equal(control_action.err, false, control_action.val.toString());
                        // stack_http_decapp1 检查 `/group_path/${path_id}/groupA/` 状态
                        let check1 = await stack_http_decapp1.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupA/`,
                        })
                        logger.info(`check1 get_task_group_state resp = ${JSON.stringify(check1)}`);
                        assert.equal(check1.unwrap().control_state, cyfs.DownloadTaskControlState.Paused);
                        // stack_http_decapp1 检查 `/group_path/${path_id}/groupA/task1` 状态
                        let check2 = await stack_http_decapp1.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupA/task1`,
                        })
                        logger.info(`check2 get_task_group_state resp = ${JSON.stringify(check2)}`);
                        assert.equal(check2.unwrap().control_state, cyfs.DownloadTaskControlState.Paused);
                        // stack_ws_decapp2 检查 `/group_path/${path_id2}/groupA/task1` 状态
                        let check3 = await stack_ws_decapp2.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id2}/groupA/task1`,
                        })
                        logger.info(`check3 get_task_group_state resp = ${JSON.stringify(check3)}`);
                        assert.equal(check3.unwrap().control_state, cyfs.DownloadTaskControlState.Normal);
                    })
                })
                describe("当前任务状态DownloadTaskControlState Canceled", async () => {
                    // dec_appA 每次测试生成 group 的随机值
                    let path_id = RandomGenerator.string(20);
                    let task_list1 = []; // 传输任务列表
                    // dec_appB 每次测试生成 group 的随机值
                    let path_id2 = RandomGenerator.string(20);
                    let task_list2 = [];// 传输任务列表
                    beforeEach(async () => {
                        // 构造Normal 状态 group
                        logger.info(`Build DownloadTaskControlState:Normal group tree`);
                        // 使用dec_app1 http 请求创建树状结构1
                        let trans_file_tree_action1 = new action_api.BuildTransGroupTree({
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

                        }, logger);
                        path_id = RandomGenerator.string(20)
                        let result_handler1 = await trans_file_tree_action1.start({
                            root_req_path: `/req_path/${path_id}`,
                            task_list: [
                                {
                                    req_path: `/req_path/${path_id}/groupA/task0`,
                                    context_path: `/context_path/${path_id}/groupA`,
                                    group: `/group_path/${path_id}/groupA/`
                                },
                                {
                                    req_path: `/req_path/${path_id}/groupA/task1`,
                                    context_path: `/context_path/${path_id}/groupA/task1`,
                                    group: `/group_path/${path_id}/groupA/task1`
                                },
                                {
                                    req_path: `/req_path/${path_id}/groupA/task2`,
                                    context_path: `/context_path/${path_id}/groupA/task2`,
                                    group: `/group_path/${path_id}/groupA/task2`
                                },
                                {
                                    req_path: `/req_path/${path_id}/groupB/task0`,
                                    context_path: `/context_path/${path_id}/groupB`,
                                    group: `/group_path/${path_id}/groupB/`
                                },
                                {
                                    req_path: `/req_path/${path_id}/groupB/task1`,
                                    context_path: `/context_path/${path_id}/groupB/task1`,
                                    group: `/group_path/${path_id}/groupB/task1`
                                },
                                {
                                    req_path: `/req_path/${path_id}/groupB/task2`,
                                    context_path: `/context_path/${path_id}/groupB/task1`,
                                    group: `/group_path/${path_id}/groupB/task2`
                                },
                            ]
                        });
                        logger.info(`${JSON.stringify(result_handler1)}`)
                        assert.equal(result_handler1.err, 0, result_handler1.log);
                        task_list1 = result_handler1.resp!.task_list;
                        // 查询group 状态
                        let check_state1_action = await new action_api.GetTransGroupState({
                            local: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                            },
                            expect: { err: 0 },

                        }, logger).start({ group: `/group_path/${path_id}/groupA/` });
                        logger.info(`check_state1_action = ${JSON.stringify(check_state1_action)}`);

                        //使用dec_app2 WebSocket 请求创建树状结构2
                        let trans_file_tree_action2 = new action_api.BuildTransGroupTree({
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

                        }, logger);
                        path_id2 = RandomGenerator.string(20)
                        let result_handler2 = await trans_file_tree_action2.start({
                            root_req_path: `/req_path/${path_id2}`,
                            task_list: [
                                {
                                    req_path: `/req_path/${path_id2}/groupA/task0`,
                                    context_path: `/context_path/${path_id2}/groupA`,
                                    group: `/group_path/${path_id2}/groupA/`
                                },
                                {
                                    req_path: `/req_path/${path_id2}/groupA/task1`,
                                    context_path: `/context_path/${path_id2}/groupA/task1`,
                                    group: `/group_path/${path_id2}/groupA/task1`
                                },
                                {
                                    req_path: `/req_path/${path_id2}/groupA/task2`,
                                    context_path: `/context_path/${path_id2}/groupA/task2`,
                                    group: `/group_path/${path_id2}/groupA/task2`
                                },
                                {
                                    req_path: `/req_path/${path_id2}/groupB/task0`,
                                    context_path: `/context_path/${path_id2}/groupB`,
                                    group: `/group_path/${path_id2}/groupB/`
                                },
                                {
                                    req_path: `/req_path/${path_id2}/groupB/task1`,
                                    context_path: `/context_path/${path_id2}/groupB/task1`,
                                    group: `/group_path/${path_id2}/groupB/task1`
                                },
                                {
                                    req_path: `/req_path/${path_id2}/groupB/task2`,
                                    context_path: `/context_path/${path_id2}/groupB/task2`,
                                    group: `/group_path/${path_id2}/groupB/task2`
                                },
                            ]
                        });
                        logger.info(`${JSON.stringify(result_handler2)}`)
                        assert.equal(result_handler2.err, 0, result_handler2.log);
                        task_list2 = result_handler2.resp!.task_list;
                        // 查询group 状态
                        let check_state2_action = await new action_api.GetTransGroupState({
                            local: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_2.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.WebSocket
                            },
                            input: {
                                timeout: 200 * 1000,
                            },
                            expect: { err: 0 },

                        }, logger).start({ group: `/group_path/${path_id2}/groupB/` });
                        logger.info(`check_state1_action = ${JSON.stringify(check_state2_action)}`);
                        let stack_http_decapp1 = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_ood",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        });
                        let stack_ws_decapp2 = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_ood",
                            dec_id: dec_app_2.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.WebSocket
                        });
                        // stack_http_decapp1 操作 `/group_path/${path_id}/groupA/` 发送控制指令 TransTaskGroupControlAction Pause
                        let control_action1 = await stack_http_decapp1.stack!.trans().control_task_group({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupA/`,
                            action: cyfs.TransTaskGroupControlAction.Cancel
                        })
                        logger.info(`/group_path/${path_id}/groupA/ send ${cyfs.TransTaskGroupControlAction.Cancel} control_action resp = ${JSON.stringify(control_action1)}`);
                        let control_action2 = await stack_ws_decapp2.stack!.trans().control_task_group({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id2}/groupA/`,
                            action: cyfs.TransTaskGroupControlAction.Cancel
                        })
                        logger.info(`/group_path/${path_id2}/groupA/ send ${cyfs.TransTaskGroupControlAction.Cancel} control_action resp = ${JSON.stringify(control_action2)}`);

                    })
                    it.skip("【Resume BDT未实现】发送控制指令 TransTaskGroupControlAction Resume", async () => {
                        // 下载端指定zone1_ood
                        let stack_http_decapp1 = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_ood",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        });
                        let stack_ws_decapp2 = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_ood",
                            dec_id: dec_app_2.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.WebSocket
                        });
                        // stack_http_decapp1 操作 `/group_path/${path_id}/groupA/` 发送控制指令 TransTaskGroupControlAction Resume
                        let control_action = await stack_http_decapp1.stack!.trans().control_task_group({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupA/`,
                            action: cyfs.TransTaskGroupControlAction.Resume
                        })
                        logger.info(`control_action resp = ${JSON.stringify(control_action)}`);
                        assert.equal(control_action.err, false, control_action.val.toString());
                        // stack_http_decapp1 检查兄弟路径 `/group_path/${path_id}/groupB/` 状态
                        let check0 = await stack_http_decapp1.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupB/`,
                        })
                        logger.info(`get_task_group_state resp = ${JSON.stringify(check0)}`);
                        assert.equal(check0.unwrap().control_state, cyfs.DownloadTaskControlState.Normal);
                        // stack_http_decapp1 检查 `/group_path/${path_id}/groupA/` 状态
                        let check1 = await stack_http_decapp1.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupA/`,
                        })
                        logger.info(`get_task_group_state resp = ${JSON.stringify(check1)}`);
                        assert.equal(check1.unwrap().control_state, cyfs.DownloadTaskControlState.Normal);
                        // stack_http_decapp1 检查 `/group_path/${path_id}/groupA/task1` 状态
                        let check2 = await stack_http_decapp1.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupA/task1`,
                        })
                        logger.info(`get_task_group_state resp = ${check2.err}`);
                        logger.info(`get_task_group_state resp = ${check2}`);
                        logger.info(`assert.equal begin`);
                        assert.equal(check2.err, true);
                        logger.info(`assert.equal finished`);
                        if (check2.err) {
                            logger.info(`get_task_group_state err = ${JSON.stringify(check2)}`);
                            assert.equal(check2.val.code, 4, check2.val.msg);
                        }
                        // stack_ws_decapp2 检查 `/group_path/${path_id2}/groupA/task1` 状态
                        let check3 = await stack_ws_decapp2.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id2}/groupA/`,
                        })
                        logger.info(`get_task_group_state resp = ${JSON.stringify(check3)}`);
                        assert.equal(check3.unwrap().control_state, cyfs.DownloadTaskControlState.Canceled);
                    })
                    it("发送控制指令 TransTaskGroupControlAction Cancel", async () => {
                        // 下载端指定zone1_ood
                        let stack_http_decapp1 = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_ood",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        });
                        let stack_ws_decapp2 = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_ood",
                            dec_id: dec_app_2.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.WebSocket
                        });
                        // stack_http_decapp1 操作 `/group_path/${path_id}/groupA/` 发送控制指令 TransTaskGroupControlAction Resume
                        let control_action = await stack_http_decapp1.stack!.trans().control_task_group({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupA/`,
                            action: cyfs.TransTaskGroupControlAction.Cancel
                        })
                        logger.info(`control_action resp = ${JSON.stringify(control_action)}`);
                        assert.equal(control_action.err, false, control_action.val.toString());
                        // stack_http_decapp1 检查兄弟路径 `/group_path/${path_id}/groupB/` 状态
                        let check0 = await stack_http_decapp1.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupB/`,
                        })
                        logger.info(`get_task_group_state resp = ${JSON.stringify(check0)}`);
                        assert.equal(check0.unwrap().control_state, cyfs.DownloadTaskControlState.Normal);
                        // stack_http_decapp1 检查 `/group_path/${path_id}/groupA/` 状态
                        let check1 = await stack_http_decapp1.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupA/`,
                        })
                        logger.info(`get_task_group_state resp = ${JSON.stringify(check1)}`);
                        assert.equal(check1.unwrap().control_state, cyfs.DownloadTaskControlState.Canceled);
                        // stack_http_decapp1 检查 `/group_path/${path_id}/groupA/task1` 状态 不存在
                        let check2 = await stack_http_decapp1.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupA/task1`,
                        })
                        logger.info(`get_task_group_state resp = ${check2.err}`);
                        logger.info(`get_task_group_state resp = ${check2}`);
                        logger.info(`assert.equal begin`);
                        assert.equal(check2.err, true);
                        logger.info(`assert.equal finished`);
                        if (check2.err) {
                            logger.info(`get_task_group_state err = ${JSON.stringify(check2)}`);
                            assert.equal(check2.val.code, 4, check2.val.msg);
                        }
                        // stack_ws_decapp2 检查 `/group_path/${path_id2}/groupA/task1` 状态
                        let check3 = await stack_ws_decapp2.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id2}/groupA/`,
                        })
                        logger.info(`get_task_group_state resp = ${JSON.stringify(check3)}`);
                        assert.equal(check3.unwrap().control_state, cyfs.DownloadTaskControlState.Canceled);
                    })
                    it.skip("【Pause BDT未实现】发送控制指令 TransTaskGroupControlAction Pause", async () => {
                        // 下载端指定zone1_ood
                        let stack_http_decapp1 = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_ood",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        });
                        let stack_ws_decapp2 = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_ood",
                            dec_id: dec_app_2.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.WebSocket
                        });
                        // stack_http_decapp1 操作 `/group_path/${path_id}/groupA/` 发送控制指令 TransTaskGroupControlAction Pause
                        let control_action = await stack_http_decapp1.stack!.trans().control_task_group({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupA/`,
                            action: cyfs.TransTaskGroupControlAction.Pause
                        })
                        logger.info(`/group_path/${path_id}/groupA/ send ${cyfs.TransTaskGroupControlAction.Pause} control_action resp = ${JSON.stringify(control_action)}`);
                        assert.equal(control_action.err, false, control_action.val.toString());
                        // stack_http_decapp1 检查 `/group_path/${path_id}/groupA/` 状态
                        let check1 = await stack_http_decapp1.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupA/`,
                        })
                        logger.info(`check1 get_task_group_state resp = ${JSON.stringify(check1)}`);
                        assert.equal(check1.unwrap().control_state, cyfs.DownloadTaskControlState.Paused);
                        // stack_http_decapp1 检查 `/group_path/${path_id}/groupA/task1` 状态
                        let check2 = await stack_http_decapp1.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupA/task1`,
                        })
                        logger.info(`check2 get_task_group_state resp = ${JSON.stringify(check2)}`);
                        assert.equal(check2.unwrap().control_state, cyfs.DownloadTaskControlState.Paused);
                        // stack_ws_decapp2 检查 `/group_path/${path_id2}/groupA/task1` 状态
                        let check3 = await stack_ws_decapp2.stack!.trans().get_task_group_state({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id2}/groupA/task1`,
                        })
                        logger.info(`check3 get_task_group_state resp = ${JSON.stringify(check3)}`);
                        assert.equal(check3.unwrap().control_state, cyfs.DownloadTaskControlState.Normal);
                    })
                })
            })
            describe.skip("【BDT 未实现】group 任务调度控制-trans状态切换", async () => {
                describe("group 任务调度控制-trans状态切换 初始task 为Pasue", async () => {
                    // dec_appA 每次测试生成 group 的随机值
                    let path_id = RandomGenerator.string(20);
                    let task_list1: Array<{
                        err: number,
                        log: string,
                        task_id?: string,
                        req_path: string,
                        group: string,
                        context_path: string,

                    }> = []; // 传输任务列表
                    // dec_appB 每次测试生成 group 的随机值
                    let path_id2 = RandomGenerator.string(20);
                    let task_list2: Array<{
                        err: number,
                        log: string,
                        task_id?: string,
                        req_path: string,
                        group: string,
                        context_path: string,
                    }> = [];// 传输任务列表
                    beforeEach(async () => {
                        // 构造Normal 状态 group
                        logger.info(`Build DownloadTaskControlState:Normal group tree`);
                        // 使用dec_app1 http 请求创建树状结构1
                        let trans_file_tree_action1 = new action_api.BuildTransGroupTree({
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

                        }, logger);
                        path_id = RandomGenerator.string(20)
                        let result_handler1 = await trans_file_tree_action1.start({
                            root_req_path: `/req_path/${path_id}`,
                            task_list: [
                                {
                                    req_path: `/req_path/${path_id}/groupA/task0`,
                                    context_path: `/context_path/${path_id}/groupA`,
                                    group: `/group_path/${path_id}/groupA/`,
                                    action: cyfs.TransTaskControlAction.Stop,
                                },
                                {
                                    req_path: `/req_path/${path_id}/groupA/task1`,
                                    context_path: `/context_path/${path_id}/groupA/task1`,
                                    group: `/group_path/${path_id}/groupA/task1`,
                                    action: cyfs.TransTaskControlAction.Stop,
                                },
                                {
                                    req_path: `/req_path/${path_id}/groupA/task2`,
                                    context_path: `/context_path/${path_id}/groupA/task2`,
                                    group: `/group_path/${path_id}/groupA/task2`,
                                    action: cyfs.TransTaskControlAction.Stop,
                                },
                                {
                                    req_path: `/req_path/${path_id}/groupB/task0`,
                                    context_path: `/context_path/${path_id}/groupB`,
                                    group: `/group_path/${path_id}/groupB/`,
                                    action: cyfs.TransTaskControlAction.Stop,
                                },
                                {
                                    req_path: `/req_path/${path_id}/groupB/task1`,
                                    context_path: `/context_path/${path_id}/groupB/task1`,
                                    group: `/group_path/${path_id}/groupB/task1`,
                                    action: cyfs.TransTaskControlAction.Stop,
                                },
                                {
                                    req_path: `/req_path/${path_id}/groupB/task2`,
                                    context_path: `/context_path/${path_id}/groupB/task1`,
                                    group: `/group_path/${path_id}/groupB/task2`,
                                    action: cyfs.TransTaskControlAction.Stop,
                                },
                            ]
                        });
                        logger.info(`${JSON.stringify(result_handler1)}`)
                        assert.equal(result_handler1.err, 0, result_handler1.log);
                        task_list1 = result_handler1.resp!.task_list;
                        // 查询group 状态
                        let check_state1_action = await new action_api.GetTransGroupState({
                            local: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                            },
                            expect: { err: 0 },

                        }, logger).start({ group: `/group_path/${path_id}/groupA/` });
                        logger.info(`check_state1_action = ${JSON.stringify(check_state1_action)}`);

                        //使用dec_app2 WebSocket 请求创建树状结构2
                        let trans_file_tree_action2 = new action_api.BuildTransGroupTree({
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

                        }, logger);
                        path_id2 = RandomGenerator.string(20)
                        let result_handler2 = await trans_file_tree_action2.start({
                            root_req_path: `/req_path/${path_id2}`,
                            task_list: [
                                {
                                    req_path: `/req_path/${path_id2}/groupA/task0`,
                                    context_path: `/context_path/${path_id2}/groupA`,
                                    group: `/group_path/${path_id2}/groupA/`,
                                    action: cyfs.TransTaskControlAction.Stop,
                                },
                                {
                                    req_path: `/req_path/${path_id2}/groupA/task1`,
                                    context_path: `/context_path/${path_id2}/groupA/task1`,
                                    group: `/group_path/${path_id2}/groupA/task1`,
                                    action: cyfs.TransTaskControlAction.Stop,
                                },
                                {
                                    req_path: `/req_path/${path_id2}/groupA/task2`,
                                    context_path: `/context_path/${path_id2}/groupA/task2`,
                                    group: `/group_path/${path_id2}/groupA/task2`,
                                    action: cyfs.TransTaskControlAction.Stop,
                                },
                                {
                                    req_path: `/req_path/${path_id2}/groupB/task0`,
                                    context_path: `/context_path/${path_id2}/groupB`,
                                    group: `/group_path/${path_id2}/groupB/`,
                                    action: cyfs.TransTaskControlAction.Stop,
                                },
                                {
                                    req_path: `/req_path/${path_id2}/groupB/task1`,
                                    context_path: `/context_path/${path_id2}/groupB/task1`,
                                    group: `/group_path/${path_id2}/groupB/task1`,
                                    action: cyfs.TransTaskControlAction.Stop,
                                },
                                {
                                    req_path: `/req_path/${path_id2}/groupB/task2`,
                                    context_path: `/context_path/${path_id2}/groupB/task2`,
                                    group: `/group_path/${path_id2}/groupB/task2`,
                                    action: cyfs.TransTaskControlAction.Stop,
                                },
                            ]
                        });
                        logger.info(`${JSON.stringify(result_handler2)}`)
                        assert.equal(result_handler2.err, 0, result_handler2.log);
                        task_list2 = result_handler2.resp!.task_list;
                        // 查询group 状态
                        let check_state2_action = await new action_api.GetTransGroupState({
                            local: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_2.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.WebSocket
                            },
                            input: {
                                timeout: 200 * 1000,
                            },
                            expect: { err: 0 },

                        }, logger).start({ group: `/group_path/${path_id2}/groupB/` });
                        logger.info(`check_state1_action = ${JSON.stringify(check_state2_action)}`);
                    })
                    it("group树进行resume 操作/dec_appA/groupA", async () => {
                        // 下载端指定zone1_ood
                        let stack_http_decapp1 = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_ood",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        });
                        let stack_ws_decapp2 = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_ood",
                            dec_id: dec_app_2.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.WebSocket
                        });
                        // 检查操作前当前任务状态
                        for (let task_info of task_list1) {
                            let check_state = await stack_http_decapp1.stack!.trans().get_task_state({
                                common: {
                                    level: cyfs.NDNAPILevel.NDC,
                                    flags: 1,
                                },
                                task_id: task_info.task_id!
                            })
                            assert.equal(check_state.err, false, check_state.val.toString());
                            if (check_state.unwrap().state.state == cyfs.TransTaskState.Downloading || check_state.unwrap().state.state == cyfs.TransTaskState.Finished) {
                                assert.ok(false, `${task_info.group}任务状态错误: ${check_state.unwrap().state.state}`)
                            } else {
                                logger.info(`${task_info.group} ${check_state.unwrap().group} check state success ,info = ${check_state.unwrap().state.state}`)
                                assert.equal(check_state.unwrap().state.state, cyfs.TransTaskState.Paused, `${task_info.group}任务状态错误`)
                            }
                        }
                        // stack_http_decapp1 操作 `/group_path/${path_id}/groupA/` 发送控制指令 TransTaskGroupControlAction Resume
                        let control_action = await stack_http_decapp1.stack!.trans().control_task_group({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupA/`,
                            action: cyfs.TransTaskGroupControlAction.Resume
                        })
                        logger.info(`control_action resp = ${JSON.stringify(control_action)}`);
                        // 当前dec_app的任务检查
                        for (let task_info of task_list1) {
                            // 当前group_path、子group_path 传输任收影响
                            if (task_info.group.includes(`/group_path/${path_id}/groupA`)) {
                                let check_state = await stack_http_decapp1.stack!.trans().get_task_state({
                                    common: {
                                        level: cyfs.NDNAPILevel.NDC,
                                        flags: 1,
                                    },
                                    task_id: task_info.task_id!
                                })
                                assert.equal(check_state.err, false, check_state.val.toString());
                                if (check_state.unwrap().state.state == cyfs.TransTaskState.Downloading || check_state.unwrap().state.state == cyfs.TransTaskState.Finished) {
                                    logger.info(`${task_info.group} ${check_state.unwrap().group} check state success ,info = ${check_state.unwrap()}`)

                                } else {
                                    assert.ok(false, `${task_info.group}任务状态错误 ${check_state.unwrap().state.state}`)
                                }

                            } else {
                                let check_state = await stack_http_decapp1.stack!.trans().get_task_state({
                                    common: {
                                        level: cyfs.NDNAPILevel.NDC,
                                        flags: 1,
                                    },
                                    task_id: task_info.task_id!
                                })
                                assert.equal(check_state.err, false, check_state.val.toString());
                                if (check_state.unwrap().state.state == cyfs.TransTaskState.Downloading || check_state.unwrap().state.state == cyfs.TransTaskState.Finished) {
                                    assert.ok(false, `${task_info.group}任务状态错误: ${check_state.unwrap().state.state}`)
                                } else {
                                    logger.info(`${task_info.group} ${check_state.unwrap().group} check state success ,info = ${check_state.unwrap().state.state}`)
                                    assert.equal(check_state.unwrap().state.state, cyfs.TransTaskState.Paused, `${task_info.group}任务状态错误`)
                                }
                            }
                        }
                        // 检查其他dec_app的任务不受影响
                        for (let task_info of task_list2) {
                            // 当前group_path、子group_path 传输任收影响
                            let check_state = await stack_ws_decapp2.stack!.trans().get_task_state({
                                common: {
                                    level: cyfs.NDNAPILevel.NDC,
                                    flags: 1,
                                },
                                task_id: task_info.task_id!
                            })
                            assert.equal(check_state.err, false, check_state.val.toString());
                            if (check_state.unwrap().state.state == cyfs.TransTaskState.Downloading || check_state.unwrap().state.state == cyfs.TransTaskState.Finished) {
                                assert.ok(false, `${task_info.group}任务状态错误`)
                            } else {
                                logger.info(`${task_info.group} ${check_state.unwrap().group} check state success ,info = ${check_state.unwrap()}`)
                                assert.equal(check_state.unwrap().state.state, cyfs.TransTaskState.Paused, `${task_info.group}任务状态错误`)
                            }
                        }
                    })
                    it("group树对task影响： 操作/dec_appA/groupA", async () => {
                        // 下载端指定zone1_ood
                        let stack_http_decapp1 = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_ood",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        });
                        let stack_ws_decapp2 = stack_manager.get_cyfs_satck({
                            peer_name: "zone1_ood",
                            dec_id: dec_app_2.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.WebSocket
                        });

                        // stack_http_decapp1 操作 `/group_path/${path_id}/groupA/` 发送控制指令 TransTaskGroupControlAction Resume
                        let control_action = await stack_http_decapp1.stack!.trans().control_task_group({
                            common: {
                                level: cyfs.NDNAPILevel.NDC,
                                flags: 1,
                            },
                            group: `/group_path/${path_id}/groupA/`,
                            action: cyfs.TransTaskGroupControlAction.Cancel
                        })
                        logger.info(`control_action resp = ${JSON.stringify(control_action)}`);
                        // /dec_appA/groupA 挂载任务受影响
                        // /dec_appA/groupA/task1 挂载任务受影响
                        // /dec_appA/groupA/task2 挂载任务受影响
                        // /dec_appA/groupB 挂载任务无影响
                        // /dec_appB/groupA 挂载任务无影响
                        // 当前dec_app的任务检查
                        for (let task_info of task_list1) {
                            // 当前group_path、子group_path 传输任收影响
                            if (task_info.group.includes(`/group_path/${path_id}/groupA`)) {
                                let check_state = await stack_http_decapp1.stack!.trans().get_task_state({
                                    common: {
                                        level: cyfs.NDNAPILevel.NDC,
                                        flags: 1,
                                    },
                                    task_id: task_info.task_id!
                                })
                                assert.equal(check_state.err, false, check_state.val.toString());
                                logger.info(`check_state = ${JSON.stringify(check_state)}`)
                                if (check_state.unwrap().state.state == cyfs.TransTaskState.Downloading || check_state.unwrap().state.state == cyfs.TransTaskState.Finished) {
                                    assert.ok(false, `${task_info.group}任务状态错误 ${check_state.unwrap().state.state}`)
                                } else {
                                    logger.info(`${task_info.group} ${check_state.unwrap().group} check state success ,info = ${check_state.unwrap()}`)

                                }

                            } else {
                                let check_state = await stack_http_decapp1.stack!.trans().get_task_state({
                                    common: {
                                        level: cyfs.NDNAPILevel.NDC,
                                        flags: 1,
                                    },
                                    task_id: task_info.task_id!
                                })
                                assert.equal(check_state.err, false, check_state.val.toString());
                                if (check_state.unwrap().state.state == cyfs.TransTaskState.Downloading || check_state.unwrap().state.state == cyfs.TransTaskState.Finished) {
                                    logger.info(`${task_info.group} ${check_state.unwrap().group} check state success ,info = ${check_state.unwrap().state.state}`)
                                } else {
                                    assert.ok(false, `${task_info.group}任务状态错误: ${check_state.unwrap().state.state}`)
                                }
                            }
                        }
                        // 检查其他dec_app的任务不受影响
                        for (let task_info of task_list2) {
                            // 当前group_path、子group_path 传输任收影响
                            let check_state = await stack_ws_decapp2.stack!.trans().get_task_state({
                                common: {
                                    level: cyfs.NDNAPILevel.NDC,
                                    flags: 1,
                                },
                                task_id: task_info.task_id!
                            })
                            assert.equal(check_state.err, false, check_state.val.toString());
                            if (check_state.unwrap().state.state == cyfs.TransTaskState.Downloading || check_state.unwrap().state.state == cyfs.TransTaskState.Finished) {
                                logger.info(`${task_info.group} ${check_state.unwrap().group} check state success ,info = ${check_state.unwrap()}`)
                            } else {
                                assert.ok(false, `${task_info.group}任务状态错误`)
                            }
                        }

                    })
                    it("group树对task影响：操作/dec_appA/groupA/task1", async () => {
                        // /dec_appA/groupA 挂载任务无影响
                        // /dec_appA/groupA/task1 挂载任务受影响
                        // /dec_appA/groupA/task2 挂载任务无影响
                        // /dec_appA/groupB 挂载任务无影响
                        // /dec_appB/groupA 挂载任务无影响
                    })
                })
                describe("group 任务调度控制-trans状态切换 初始task 为Downloading", async () => {
                    // dec_appA 每次测试生成 group 的随机值
                    let path_id = RandomGenerator.string(20);
                    let task_list1: Array<{
                        err: number,
                        log: string,
                        task_id?: string,
                        req_path: string,
                        group: string,
                        context_path: string,

                    }> = []; // 传输任务列表
                    // dec_appB 每次测试生成 group 的随机值
                    let path_id2 = RandomGenerator.string(20);
                    let task_list2: Array<{
                        err: number,
                        log: string,
                        task_id?: string,
                        req_path: string,
                        group: string,
                        context_path: string,
                    }> = [];// 传输任务列表
                    beforeEach(async () => {
                        // 构造Normal 状态 group
                        logger.info(`Build DownloadTaskControlState:Normal group tree`);
                        // 使用dec_app1 http 请求创建树状结构1
                        let trans_file_tree_action1 = new action_api.BuildTransGroupTree({
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

                        }, logger);
                        path_id = RandomGenerator.string(20)
                        let result_handler1 = await trans_file_tree_action1.start({
                            root_req_path: `/req_path/${path_id}`,
                            task_list: [
                                {
                                    req_path: `/req_path/${path_id}/groupA/task0`,
                                    context_path: `/context_path/${path_id}/groupA`,
                                    group: `/group_path/${path_id}/groupA/`,
                                },
                                {
                                    req_path: `/req_path/${path_id}/groupA/task1`,
                                    context_path: `/context_path/${path_id}/groupA/task1`,
                                    group: `/group_path/${path_id}/groupA/task1`,
                                },
                                {
                                    req_path: `/req_path/${path_id}/groupA/task2`,
                                    context_path: `/context_path/${path_id}/groupA/task2`,
                                    group: `/group_path/${path_id}/groupA/task2`,
                                },
                                {
                                    req_path: `/req_path/${path_id}/groupB/task0`,
                                    context_path: `/context_path/${path_id}/groupB`,
                                    group: `/group_path/${path_id}/groupB/`,
                                },
                                {
                                    req_path: `/req_path/${path_id}/groupB/task1`,
                                    context_path: `/context_path/${path_id}/groupB/task1`,
                                    group: `/group_path/${path_id}/groupB/task1`,
                                },
                                {
                                    req_path: `/req_path/${path_id}/groupB/task2`,
                                    context_path: `/context_path/${path_id}/groupB/task1`,
                                    group: `/group_path/${path_id}/groupB/task2`,
                                },
                            ]
                        });
                        logger.info(`${JSON.stringify(result_handler1)}`)
                        assert.equal(result_handler1.err, 0, result_handler1.log);
                        task_list1 = result_handler1.resp!.task_list;
                        // 查询group 状态
                        let check_state1_action = await new action_api.GetTransGroupState({
                            local: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 200 * 1000,
                            },
                            expect: { err: 0 },

                        }, logger).start({ group: `/group_path/${path_id}/groupA/` });
                        logger.info(`check_state1_action = ${JSON.stringify(check_state1_action)}`);

                        //使用dec_app2 WebSocket 请求创建树状结构2
                        let trans_file_tree_action2 = new action_api.BuildTransGroupTree({
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

                        }, logger);
                        path_id2 = RandomGenerator.string(20)
                        let result_handler2 = await trans_file_tree_action2.start({
                            root_req_path: `/req_path/${path_id2}`,
                            task_list: [
                                {
                                    req_path: `/req_path/${path_id2}/groupA/task0`,
                                    context_path: `/context_path/${path_id2}/groupA`,
                                    group: `/group_path/${path_id2}/groupA/`,
                                },
                                {
                                    req_path: `/req_path/${path_id2}/groupA/task1`,
                                    context_path: `/context_path/${path_id2}/groupA/task1`,
                                    group: `/group_path/${path_id2}/groupA/task1`,
                                },
                                {
                                    req_path: `/req_path/${path_id2}/groupA/task2`,
                                    context_path: `/context_path/${path_id2}/groupA/task2`,
                                    group: `/group_path/${path_id2}/groupA/task2`,
                                },
                                {
                                    req_path: `/req_path/${path_id2}/groupB/task0`,
                                    context_path: `/context_path/${path_id2}/groupB`,
                                    group: `/group_path/${path_id2}/groupB/`,
                                },
                                {
                                    req_path: `/req_path/${path_id2}/groupB/task1`,
                                    context_path: `/context_path/${path_id2}/groupB/task1`,
                                    group: `/group_path/${path_id2}/groupB/task1`,
                                },
                                {
                                    req_path: `/req_path/${path_id2}/groupB/task2`,
                                    context_path: `/context_path/${path_id2}/groupB/task2`,
                                    group: `/group_path/${path_id2}/groupB/task2`,
                                },
                            ]
                        });
                        logger.info(`${JSON.stringify(result_handler2)}`)
                        assert.equal(result_handler2.err, 0, result_handler2.log);
                        task_list2 = result_handler2.resp!.task_list;
                        // 查询group 状态
                        let check_state2_action = await new action_api.GetTransGroupState({
                            local: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_2.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.WebSocket
                            },
                            input: {
                                timeout: 200 * 1000,
                            },
                            expect: { err: 0 },

                        }, logger).start({ group: `/group_path/${path_id2}/groupB/` });
                        logger.info(`check_state1_action = ${JSON.stringify(check_state2_action)}`);
                    })
                    it("group树 Cancel /dec_appA/groupA 对task影响", async () => {
                        // /dec_appA/groupA 挂载任务受影响
                        // /dec_appA/groupA/task1 挂载任务受影响
                        // /dec_appA/groupA/task2 挂载任务受影响
                        // /dec_appA/groupB 挂载任务无影响
                        // /dec_appB/groupA 挂载任务无影响
                    })
                    it("group树 Cancel /dec_appA/groupA/task1 对task影响", async () => {
                        // /dec_appA/groupA 挂载任务无影响
                        // /dec_appA/groupA/task1 挂载任务受影响
                        // /dec_appA/groupA/task2 挂载任务无影响
                        // /dec_appA/groupB 挂载任务无影响
                        // /dec_appB/groupA 挂载任务无影响
                    })
                })
            })

            describe("group 路径树规则", async () => {
                describe("正常路径-无/结尾", async () => {
                    it("正常路径-无/结尾", async () => {
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

                        }, logger);
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
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)

                    })
                })
                describe("正常路径-/结尾", async () => {
                    it("正常路径-/结尾", async () => {
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

                        }, logger);
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
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}/`,
                        });
                        assert.equal(result.err, 0, result.log)

                    })
                })
                describe("异常路径-存在两个//", async () => {
                    it("//groupA/group1", async () => {
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

                        }, logger);
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
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `//group/${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)

                    })
                    it("/groupA//group1", async () => {
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

                        }, logger);
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
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group//${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)

                    })
                    it("/groupA/group1//", async () => {
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

                        }, logger);
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
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}//`,
                        });
                        assert.equal(result.err, 0, result.log)

                    })
                })
                describe("异常路径-存在空格", async () => {
                    it("/groupA/ group1/", async () => {
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

                        }, logger);
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
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/ group1/${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)

                    })
                    it("/groupA/group1 /", async () => {
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

                        }, logger);
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
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/group1 /${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)

                    })
                    it("/groupA/ /", async () => {
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

                        }, logger);
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
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/ /${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)

                    })
                })
                describe("路径存在特殊字符", async () => {
                    it("/groupA/&group1（/", async () => {
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

                        }, logger);
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
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/&group1（/${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)

                    })
                    it("/groupA/@group1)/", async () => {
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

                        }, logger);
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
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/@group1)/${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)

                    })
                    it("/groupA/、group1+/", async () => {
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

                        }, logger);
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
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/、group1+/${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)

                    })
                })
                describe("路径存在转义字符", async () => {
                    it("/groupA/group1\n/", async () => {
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

                        }, logger);
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
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/group1\n/${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)

                    })
                    it("/groupA/group1\t/", async () => {
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

                        }, logger);
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
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/group1\t/${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)

                    })
                })
                describe("路径存在其他语言文字字符", async () => {
                    it("/groupA/测试中文路径/", async () => {
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

                        }, logger);
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
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/测试中文路径/${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)

                    })
                    it("/groupA/日本語パスをテストする/", async () => {
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

                        }, logger);
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
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/日本語パスをテストする/${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)

                    })
                })
            })
            describe("【BDT未完整实现】group 状态检查", async () => {
                it("group 树节点状态遍历检查", async () => {
                    // dec_appA 每次测试生成 group 的随机值
                    let path_id = RandomGenerator.string(20);
                    let task_list1: Array<{
                        err: number,
                        log: string,
                        task_id?: string,
                        req_path: string,
                        group: string,
                        context_path: string,

                    }> = []; // 传输任务列表
                    // 构造Normal 状态 group
                    logger.info(`Build DownloadTaskControlState:Normal group tree`);
                    // 使用dec_app1 http 请求创建树状结构1
                    let trans_file_tree_action1 = new action_api.BuildTransGroupTree({
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

                    }, logger);
                    path_id = RandomGenerator.string(20)
                    let result_handler1 = await trans_file_tree_action1.start({
                        root_req_path: `/req_path/${path_id}`,
                        task_list: [
                            {
                                req_path: `/req_path/${path_id}/groupA/task0`,
                                context_path: `/context_path/${path_id}/groupA`,
                                group: `/group_path/${path_id}/groupA/`,
                            },
                            {
                                req_path: `/req_path/${path_id}/groupA/task1`,
                                context_path: `/context_path/${path_id}/groupA/task1`,
                                group: `/group_path/${path_id}/groupA/task1`,
                            },
                            {
                                req_path: `/req_path/${path_id}/groupA/task2`,
                                context_path: `/context_path/${path_id}/groupA/task2`,
                                group: `/group_path/${path_id}/groupA/task2`,
                            },
                            {
                                req_path: `/req_path/${path_id}/groupB/task0`,
                                context_path: `/context_path/${path_id}/groupB`,
                                group: `/group_path/${path_id}/groupB/`,
                            },
                            {
                                req_path: `/req_path/${path_id}/groupB/task1`,
                                context_path: `/context_path/${path_id}/groupB/task1`,
                                group: `/group_path/${path_id}/groupB/task1`,
                            },
                            {
                                req_path: `/req_path/${path_id}/groupB/task2`,
                                context_path: `/context_path/${path_id}/groupB/task1`,
                                group: `/group_path/${path_id}/groupB/task2`,
                            },
                        ]
                    });
                    logger.info(`${JSON.stringify(result_handler1)}`)
                    assert.equal(result_handler1.err, 0, result_handler1.log);
                    task_list1 = result_handler1.resp!.task_list;
                    let running_list = []
                    for (let trans_task of task_list1) {
                        running_list.push(
                            new action_api.GroupStateListerner({
                                local: {
                                    peer_name: "zone1_ood",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                input: {
                                    timeout: 500 * 1000,
                                },
                                expect: { err: 0 },

                            }, logger).start({ group: trans_task.group })
                        )
                    }
                    for (let check of running_list) {
                        await check;
                    }
                })
            })
        })
        describe("Trans 传输 Context功能测试", async () => {
            describe("Context 路径树规则", async () => {
                describe("正常路径-无/结尾", async () => {
                    it("正常路径-无/结尾", async () => {
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

                        }, logger);
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
                                file_size: 20 * 1024 * 1024,
                                chunk_size: 10 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}`,
                            group: `/group/${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)

                    })
                })
                describe("正常路径-/结尾", async () => {
                    it("正常路径-/结尾", async () => {
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

                        }, logger);
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
                                file_size: 20 * 1024 * 1024,
                                chunk_size: 10 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}/`,
                            group: `/group/${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)

                    })
                })
                describe("异常路径-存在两个//", async () => {
                    it("//context_path/${Random}", async () => {
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

                        }, logger);
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
                                file_size: 20 * 1024 * 1024,
                                chunk_size: 10 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `//context_path/${path_id}`,
                            group: `/group/${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)

                    })
                    it("/context_path//${Random}", async () => {
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

                        }, logger);
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
                                file_size: 20 * 1024 * 1024,
                                chunk_size: 10 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path//${path_id}`,
                            group: `/group/${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)

                    })
                    it("/context_path/${Random}//", async () => {
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

                        }, logger);
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
                                file_size: 20 * 1024 * 1024,
                                chunk_size: 10 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}//`,
                            group: `/group/${path_id}/`,
                        });
                        assert.equal(result.err, 0, result.log)

                    })
                })
                describe("异常路径-存在空格", async () => {
                    it("/context_path/ ${Random}", async () => {
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

                        }, logger);
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
                                file_size: 20 * 1024 * 1024,
                                chunk_size: 10 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/ ${path_id}`,
                            group: `/group/group1/${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)

                    })
                    it("/context_path/${Random} /task", async () => {
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

                        }, logger);
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
                                file_size: 20 * 1024 * 1024,
                                chunk_size: 10 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id} /task`,
                            group: `/group/group1/${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)

                    })
                    it("/context_path/ /${Random}", async () => {
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

                        }, logger);
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
                                file_size: 20 * 1024 * 1024,
                                chunk_size: 10 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/ /${path_id}`,
                            group: `/group/${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)

                    })
                })
                describe("路径存在特殊字符", async () => {
                    it("/context_path/${Random}/&task1（", async () => {
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

                        }, logger);
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
                                file_size: 20 * 1024 * 1024,
                                chunk_size: 10 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}/&task1（`,
                            group: `/group/group1/${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)

                    })
                    it("/context_path/${Random}/@task1)", async () => {
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

                        }, logger);
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
                                file_size: 20 * 1024 * 1024,
                                chunk_size: 10 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}/@task1)`,
                            group: `/group/group1/${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)

                    })
                    it("/context_path/${Random}/、task1+", async () => {
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

                        }, logger);
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
                                file_size: 20 * 1024 * 1024,
                                chunk_size: 10 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}/、task1+`,
                            group: `/group/group1/${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)

                    })
                })
                describe("路径存在转义字符", async () => {
                    it("/context_path/${path_id}/group1\n/", async () => {
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

                        }, logger);
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
                                file_size: 20 * 1024 * 1024,
                                chunk_size: 10 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}/group1\n/`,
                            group: `/group/group1/${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)

                    })
                    it("/context_path/${path_id}/group1\t/", async () => {
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

                        }, logger);
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
                                file_size: 20 * 1024 * 1024,
                                chunk_size: 10 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}/group1\t/`,
                            group: `/group/group1/${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)

                    })
                })
                describe("路径存在其他语言文字字符", async () => {
                    it("/context_path/测试中文路径/", async () => {
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

                        }, logger);
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
                                file_size: 20 * 1024 * 1024,
                                chunk_size: 10 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/测试中文路径/${path_id}`,
                            group: `/group/${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)

                    })
                    it("/context_path/日本語パスをテストする/", async () => {
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

                        }, logger);
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
                                file_size: 20 * 1024 * 1024,
                                chunk_size: 10 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/日本語パスをテストする/${path_id}`,
                            group: `/group/${path_id}`,
                        });
                        assert.equal(result.err, 0, result.log)

                    })
                })
            })
            describe("context 路径树构造", async () => {
                it("Context 路径只有一个context", async () => {
                    // 使用dec_app1 http 请求创建树状结构1
                    let trans_file_tree_action = new action_api.BuildTransGroupTree({
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

                    }, logger);
                    let path_id = RandomGenerator.string(20)
                    let result_handler = await trans_file_tree_action.start({
                        root_req_path: `/req_path/${path_id}`,
                        task_list: [
                            {
                                req_path: `/req_path/${path_id}/groupA/task0`,
                                context_path: `/context_path/${path_id}/contextA`,
                                group: `/group_path/${path_id}/groupA/`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupA/task1`,
                                context_path: `/context_path/${path_id}/contextA/context1`,
                                group: `/group_path/${path_id}/groupA/task1`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupA/task2`,
                                context_path: `/context_path/${path_id}/contextA/context2`,
                                group: `/group_path/${path_id}/groupA/task2`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupB/task0`,
                                context_path: `/context_path/${path_id}/contextB`,
                                group: `/group_path/${path_id}/groupB/`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupB/task1`,
                                context_path: `/context_path/${path_id}/contextB/context1`,
                                group: `/group_path/${path_id}/groupB/task1`
                            },
                            {
                                req_path: `/req_path/${path_id}/groupB/task2`,
                                context_path: `/context_path/${path_id}/contextB/context2`,
                                group: `/group_path/${path_id}/groupB/task2`
                            },
                        ]
                    });
                    logger.info(`${JSON.stringify(result_handler)}`)
                    assert.equal(result_handler.err, 0, result_handler.log);
                    // 查询group 状态
                    let check_state1_action = await new action_api.GetTransGroupState({
                        local: {
                            peer_name: "zone1_ood",
                            dec_id: dec_app_1.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.Http
                        },
                        input: {
                            timeout: 200 * 1000,
                        },
                        expect: { err: 0 },

                    }, logger).start({ group: `/group_path/${path_id}/groupA/` });
                    logger.info(`check_state1_action = ${JSON.stringify(check_state1_action)}`);

                    //使用dec_app2 WebSocket 请求创建树状结构2
                    let trans_file_tree_action2 = new action_api.BuildTransGroupTreeAsync({
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

                    }, logger);
                    let path_id2 = RandomGenerator.string(20)
                    let result_handler2 = await trans_file_tree_action2.start({
                        root_req_path: `/req_path/${path_id2}`,
                        task_list: [
                            {
                                req_path: `/req_path/${path_id2}/groupA/task0`,
                                context_path: `/context_path/${path_id2}/groupA`,
                                group: `/group_path/${path_id2}/groupA/`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupA/task1`,
                                context_path: `/context_path/${path_id2}/groupA/task1`,
                                group: `/group_path/${path_id2}/groupA/task1`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupA/task2`,
                                context_path: `/context_path/${path_id2}/groupA/task2`,
                                group: `/group_path/${path_id2}/groupA/task2`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupB/task0`,
                                context_path: `/context_path/${path_id2}/groupB`,
                                group: `/group_path/${path_id2}/groupB/`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupB/task1`,
                                context_path: `/context_path/${path_id2}/groupB/task1`,
                                group: `/group_path/${path_id2}/groupB/task1`
                            },
                            {
                                req_path: `/req_path/${path_id2}/groupB/task2`,
                                context_path: `/context_path/${path_id2}/groupB/task2`,
                                group: `/group_path/${path_id2}/groupB/task2`
                            },
                        ]
                    });
                    logger.info(`${JSON.stringify(result_handler2)}`)
                    assert.equal(result_handler2.err, 0, result_handler2.log);
                    // 查询group 状态
                    let check_state2_action = await new action_api.GetTransGroupState({
                        local: {
                            peer_name: "zone1_ood",
                            dec_id: dec_app_2.to_base_58(),
                            type: cyfs.CyfsStackRequestorType.WebSocket
                        },
                        input: {
                            timeout: 200 * 1000,
                        },
                        expect: { err: 0 },

                    }, logger).start({ group: `/group_path/${path_id2}/groupB/` });
                    logger.info(`check_state1_action = ${JSON.stringify(check_state2_action)}`);
                })
            })
            describe("context 路径间的父子关系", async () => {
                //  通过 context_path 路径树 每十秒向上匹配context对象   /a/b/c -> /a/b/ -> /a -> /
                //  一个周期内 通过 context 对象 中的下载源 下载文件
                describe("context_path  子路径继承父路径context对象 规则校验", async () => {
                    let path_id = RandomGenerator.string(20)
                    it("父路径/context_path/${path_id}/ 关联有效context，创建下载任务下载文件成功 ", async () => {
                        
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

                        }, logger);

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

                        }, logger);

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

                        }, logger).start({
                            task_id: result.resp!.task_id!
                        })
                        assert.equal(check_finished.err, 0, check_finished.log)
                    })
                    it("子路径/context_path/${path_id}/task1 未设置context 继承父context_path(下载源有效) 创建下载任务下载文件成功", async () => {
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

                        }, logger);
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

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}/task1`,
                            group: `/group/${path_id}`,
                            auto_start: true,
                            not_set_context: true,
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

                        }, logger).start({
                            task_id: result.resp!.task_id!
                        })
                        assert.equal(check_finished.err, false, check_finished.log)
                    })
                    it("子路径/context_path/${path_id}/task2 未设置context 继承父context_path(下载源无效) 创建下载任务下载文件失败", async () => {
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

                        }, logger);
                        let result_handler = await action_handler.start({
                            req_path: `/req_path/${path_id}`,
                        });
                        assert.equal(result_handler.err, 0, result_handler.log)
                        // 创建测试任务 local -> remote
                        let action = new action_api.PrepareFileTask({
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
                                file_size: 10 * 1024 * 1024,
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}/task2`,
                            group: `/group/${path_id}`,
                            auto_start: true,
                            not_set_context: true,
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

                        }, logger).start({
                            task_id: result.resp!.task_id!
                        })
                        assert.equal(check_finished.err, ErrorCode.timeout, check_finished.log)
                    })
                    it("子路径/context_path/${path_id}/task3 设置新context包含有效下载源 创建下载任务下载文件成功", async () => {
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

                        }, logger);
                        let result_handler = await action_handler.start({
                            req_path: `/req_path/${path_id}`,
                        });
                        assert.equal(result_handler.err, 0, result_handler.log)
                        // 创建测试任务 local -> remote
                        let action = new action_api.PrepareFileTask({
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
                                file_size: 10 * 1024 * 1024,
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}/task3`,
                            group: `/group/${path_id}`,
                            auto_start: true,
                            deviceid_list: [
                                stack_manager.get_device_id({
                                    peer_name: "zone1_device2",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                }).device_id!.object_id,
                            ],
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

                        }, logger).start({
                            task_id: result.resp!.task_id!
                        })
                        assert.equal(check_finished.err, false, check_finished.log)
                    })
                    it("子路径/context_path/${path_id}/task4 设置新context不包含有效下载源 创建下载任务下载文件失败", async () => {
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

                        }, logger);
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

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}/task4`,
                            group: `/group/${path_id}`,
                            auto_start: true,
                            deviceid_list: [
                                stack_manager.get_device_id({
                                    peer_name: "zone1_device2",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                }).device_id!.object_id,
                            ],
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

                        }, logger).start({
                            task_id: result.resp!.task_id!
                        })
                        assert.equal(check_finished.err, ErrorCode.timeout, check_finished.log)
                    })
                })
                describe("通过 context_path 子路径更新 ，覆盖原有 父路径context 下载源", async () => {
                    let path_id = RandomGenerator.string(20)
                    it("父路径/context_path/${path_id}/ 关联有效context，创建下载任务下载文件成功 ", async () => {
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

                        }, logger);

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

                        }, logger);

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

                        }, logger).start({
                            task_id: result.resp!.task_id!
                        })
                        assert.equal(check_finished.err, false, check_finished.log)
                    })
                    it("正确用法：子路径/context_path/${path_id}/task1 未设置context 继承父context_path 创建下载任务下载文件失败 -> 子路径添加有效context -> task通过子路径context下载成功", async () => {
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

                        }, logger);
                        let result_handler = await action_handler.start({
                            req_path: `/req_path/${path_id}`,
                        });
                        assert.equal(result_handler.err, 0, result_handler.log)
                        // 创建测试任务 local -> remote
                        let action = new action_api.PrepareFileTask({
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
                                file_size: 10 * 1024 * 1024,
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}/task1`,
                            group: `/group/${path_id}`,
                            auto_start: true,
                            not_set_context: true,
                        });
                        assert.equal(result.err, 0, result.log);
                        let check_finished_pre = await new action_api.WaitTaskFinished({
                            local: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 60 * 1000,
                            },
                            expect: { err: 0 },

                        }, logger).start({
                            task_id: result.resp!.task_id!,
                            check_time : 10
                        })
                        // 子路径添加有效context zone1_device2
                        let update_context_action = await new action_api.AddContextRequest({
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
                                timeout: 60 * 1000,
                            },
                            expect: { err: 0 },
                        }, logger).start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}/task1`,
                            deviceid_list: [
                                stack_manager.get_device_id({
                                    peer_name: "zone1_device2",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                }).device_id!.object_id,
                            ]
                        })
                        assert.equal(update_context_action.err, 0, update_context_action.log);
                        assert.equal(update_context_action.resp?.result, 0, update_context_action.resp?.msg);
                        // 检查测试任务完成
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

                        }, logger).start({
                            task_id: result.resp!.task_id!
                        })
                        assert.equal(check_finished.err, 0, check_finished.log)
                    })
                    it("子路径/context_path/${path_id}/task2 未设置context 继承父context_path(下载源有效) 创建下载任务下载文件成功", async () => {
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

                        }, logger);
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

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}/task2`,
                            group: `/group/${path_id}`,
                            auto_start: true,
                            not_set_context: true,
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

                        }, logger).start({
                            task_id: result.resp!.task_id!
                        })
                        assert.equal(check_finished.err, false, check_finished.log)
                    })
                    it("错误用法：子路径/context_path/${path_id}/task3 未设置context 继承父context_path 创建下载任务下载文件下载中 -> 子路径添加无效context -> task通过子路径context下载失败", async () => {
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

                        }, logger);
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
                                file_size: 500 * 1024 * 1024,
                                chunk_size: 4 * 1024 * 1024,
                                non_level: cyfs.NONAPILevel.NON,
                                ndn_level: cyfs.NDNAPILevel.NDN,
                            },
                            expect: { err: 0 },

                        }, logger);

                        let result = await action.start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}/task3`,
                            group: `/group/${path_id}`,
                            auto_start: true,
                            not_set_context: true,
                        });
                        assert.equal(result.err, 0, result.log);
                        let check_finished_pre = await new action_api.WaitTaskFinished({
                            local: {
                                peer_name: "zone1_ood",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            },
                            input: {
                                timeout: 60 * 1000,
                            },
                            expect: { err: 0 },

                        }, logger).start({
                            task_id: result.resp!.task_id!,
                            check_time : 5
                        })
                        let update_context_action = await new action_api.AddContextRequest({
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
                                timeout: 60 * 1000,
                            },
                            expect: { err: 0 },
                        }, logger).start({
                            req_path: `/req_path/${path_id}`,
                            context_path: `/context_path/${path_id}/task3`,
                            deviceid_list: [
                                stack_manager.get_device_id({
                                    peer_name: "zone1_device2",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                }).device_id!.object_id,
                            ]
                        })
                        assert.equal(update_context_action.err, 0, update_context_action.log);
                        assert.equal(update_context_action.resp?.result, 0, update_context_action.resp?.msg);
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

                        }, logger).start({
                            task_id: result.resp!.task_id!
                        })
                        assert.equal(check_finished.err, ErrorCode.timeout, check_finished.log)
                    })
                })
            })
            describe("context_path下关联的context 对象", async () => {
                it("异常场景：context_path 未关联context 对象，创建传输任务", async () => {
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

                    }, logger);
                    let path_id = RandomGenerator.string(20)
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

                    }, logger);

                    let result = await action.start({
                        req_path: `/req_path/${path_id}`,
                        context_path: `/context_path/${path_id}/`,
                        group: `/group/${path_id}`,
                        auto_start: true,
                        not_set_context: true,
                        deviceid_list: [
                            stack_manager.get_device_id({
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            }).device_id!.object_id,
                        ],
                    });
                    assert.equal(result.err, 0, result.log);
                    assert.equal(result.resp?.result, 4, result.resp?.msg);
                })
                it("更新context对象下载源，完成下载", async () => {
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

                    }, logger);
                    let path_id = RandomGenerator.string(20)
                    let result_handler = await action_handler.start({
                        req_path: `/req_path/${path_id}`,
                    });
                    assert.equal(result_handler.err, 0, result_handler.log)
                    // 创建测试任务 local -> remote 设置的context device_list 没有该文件
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

                    }, logger);

                    let result = await action.start({
                        req_path: `/req_path/${path_id}`,
                        context_path: `/context_path/${path_id}/`,
                        group: `/group/${path_id}`,
                        auto_start: true,
                        deviceid_list: [
                            stack_manager.get_device_id({
                                peer_name: "zone1_device2",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            }).device_id!.object_id,
                        ],
                    });
                    assert.equal(result.err, 0, result.log);
                    assert.equal(result.resp?.result, 0, result.resp?.msg);
                    // 更新context 对象
                    let update_context_action = await new action_api.UpdateContextRequest({
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
                        },
                        expect: { err: 0 },
                    }, logger).start({
                        req_path: `/req_path/${path_id}`,
                        context_id: result.resp!.context_id!,
                        deviceid_list: [
                            stack_manager.get_device_id({
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            }).device_id!.object_id,
                        ],

                    })
                    assert.equal(update_context_action.err, 0, update_context_action.log);
                    assert.equal(update_context_action.resp?.result, 0, update_context_action.resp?.msg);
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

                    }, logger).start({
                        task_id: result.resp!.task_id!
                    })
                    assert.equal(check_finished.err, false, check_finished.log)
                })
                it("context_path 增加新context 对象，完成文件下载", async () => {
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

                    }, logger);
                    let path_id = RandomGenerator.string(20)
                    let result_handler = await action_handler.start({
                        req_path: `/req_path/${path_id}`,
                    });
                    assert.equal(result_handler.err, 0, result_handler.log)
                    // 创建测试任务 local -> remote 设置的context device_list 没有该文件
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

                    }, logger);

                    let result = await action.start({
                        req_path: `/req_path/${path_id}`,
                        context_path: `/context_path/${path_id}/`,
                        group: `/group/${path_id}`,
                        auto_start: true,
                        deviceid_list: [
                            stack_manager.get_device_id({
                                peer_name: "zone1_device2",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            }).device_id!.object_id,
                        ],
                    });
                    assert.equal(result.err, 0, result.log);
                    assert.equal(result.resp?.result, 0, result.resp?.msg);
                    // 更新context 对象
                    let update_context_action = await new action_api.AddContextRequest({
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
                        },
                        expect: { err: 0 },
                    }, logger).start({
                        req_path: `/req_path/${path_id}`,
                        context_path: `/context_path/${path_id}/`,
                        deviceid_list: [
                            stack_manager.get_device_id({
                                peer_name: "zone1_device1",
                                dec_id: dec_app_1.to_base_58(),
                                type: cyfs.CyfsStackRequestorType.Http
                            }).device_id!.object_id,
                        ]
                    })
                    assert.equal(update_context_action.err, 0, update_context_action.log);
                    assert.equal(update_context_action.resp?.result, 0, update_context_action.resp?.msg);
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

                    }, logger).start({
                        task_id: result.resp!.task_id!
                    })
                    assert.equal(check_finished.err, false, check_finished.log)
                })

                describe("context_path下关联多个context对象复合场景", async () => {
                    // 前置条件准备： zone1_device1 publish_file，zone1_ood 下载
                    let path_id = RandomGenerator.string(20)
                    let file_info: { file_name: string, file_id: string } | undefined
                    beforeEach(async () => {
                        // 设置当前用例id 方便日志定位问题
                        // 创建监听器
                        path_id = RandomGenerator.string(20)
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

                        }, logger);

                        let result_handler = await action_handler.start({
                            req_path: `/req_path/${path_id}`,
                        });
                        assert.equal(result_handler.err, 0, result_handler.log)
                        // 创建测试任务 local -> remote 设置的context device_list 没有该文件
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

                        }, logger);

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
                        });
                        assert.equal(result.err, 0, result.log);
                        assert.equal(result.resp?.result, 0, result.resp?.msg);
                        file_info = result.file_info;
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

                        }, logger).start({
                            task_id: result.resp!.task_id!
                        })
                        assert.equal(check_finished.err, false, check_finished.log)
                        // zone1_ood 增加文件被访问权限
                        let add_access_action = await new action_api.ShareFileAddAccessRequest({
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
                            req_path: `/req_path/${path_id}`,
                            file_id: file_info!.file_id
                        });
                        assert.equal(add_access_action.err, 0, add_access_action.log)
                    })
                    describe("单个context对象内device_list 配置", async () => {

                        it("device_list 包含一个下载源 无效", async () => {
                            // zone2_ood 创建监听器
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

                            }, logger);
                            let result_handler = await action_handler.start({
                                req_path: `/req_path/${path_id}`,
                            });
                            assert.equal(result_handler.err, 0, result_handler.log)
                            // zone1_ood post_object 到zone2_ood 通知设置context_path context 对象
                            let update_context_action = await new action_api.AddContextRequest({
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
                                    timeout: 60 * 1000,
                                },
                                expect: { err: 0 },
                            }, logger).start({
                                req_path: `/req_path/${path_id}`,
                                context_path: `/context_path/${path_id}/`,
                                deviceid_list: [
                                    stack_manager.get_device_id({
                                        peer_name: "zone1_device2",
                                        dec_id: dec_app_1.to_base_58(),
                                        type: cyfs.CyfsStackRequestorType.Http
                                    }).device_id!.object_id,
                                ]
                            })
                            assert.equal(update_context_action.err, 0, update_context_action.log);
                            assert.equal(update_context_action.resp?.result, 0, update_context_action.resp?.msg);
                            // zone1_ood post_object 到zone2_ood  通知下载文件
                            let result = await new PrepareTransFileRequest({
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
                                },
                                expect: { err: 0 },
                            }, logger).start({
                                req_path: `/req_path/${path_id}`,
                                target: stack_manager.get_device_id({ peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }).device_id!.object_id.to_base_58(),
                                context_path: `/context_path/${path_id}/`,
                                group: `/group/${path_id}`,
                                file_id: file_info!.file_id,
                                file_name: file_info!.file_name!,
                                auto_start: true,
                                not_set_context: true,
                            })
                            // 检查任务完成状态
                            let check_finished = await new action_api.WaitTaskFinished({
                                local: {
                                    peer_name: "zone2_ood",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                input: {
                                    timeout: 60 * 1000,
                                },
                                expect: { err: 0 },

                            }, logger).start({
                                task_id: result.resp!.task_id!
                            })
                            assert.equal(check_finished.err, 10, check_finished.log)

                        })
                        it("device_list 包含一个下载源 有效", async () => {
                            // zone2_ood 创建监听器
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

                            }, logger);
                            let result_handler = await action_handler.start({
                                req_path: `/req_path/${path_id}`,
                            });
                            assert.equal(result_handler.err, 0, result_handler.log)
                            // zone1_ood post_object 到zone2_ood 通知设置context_path context 对象
                            let update_context_action = await new action_api.AddContextRequest({
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
                                    timeout: 60 * 1000,
                                },
                                expect: { err: 0 },
                            }, logger).start({
                                req_path: `/req_path/${path_id}`,
                                context_path: `/context_path/${path_id}/`,
                                deviceid_list: [
                                    stack_manager.get_device_id({
                                        peer_name: "zone1_ood",
                                        dec_id: dec_app_1.to_base_58(),
                                        type: cyfs.CyfsStackRequestorType.Http
                                    }).device_id!.object_id,
                                ]
                            })
                            assert.equal(update_context_action.err, 0, update_context_action.log);
                            assert.equal(update_context_action.resp?.result, 0, update_context_action.resp?.msg);
                            // zone1_ood post_object 到zone2_ood  通知下载文件
                            let result = await new PrepareTransFileRequest({
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
                                },
                                expect: { err: 0 },
                            }, logger).start({
                                req_path: `/req_path/${path_id}`,
                                target: stack_manager.get_device_id({ peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }).device_id!.object_id.to_base_58(),
                                context_path: `/context_path/${path_id}/`,
                                group: `/group/${path_id}`,
                                file_id: file_info!.file_id,
                                file_name: file_info!.file_name!,
                                auto_start: true,
                                not_set_context: true,
                            })
                            // 检查任务完成状态
                            let check_finished = await new action_api.WaitTaskFinished({
                                local: {
                                    peer_name: "zone2_ood",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                input: {
                                    timeout: 60 * 1000,
                                },
                                expect: { err: 0 },

                            }, logger).start({
                                task_id: result.resp!.task_id!
                            })
                            assert.equal(check_finished.err, 0, check_finished.log)
                        })
                        it("device_list 包含两个下载源 全部有效", async () => {
                            // zone2_ood 创建监听器
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

                            }, logger);
                            let result_handler = await action_handler.start({
                                req_path: `/req_path/${path_id}`,
                            });
                            assert.equal(result_handler.err, 0, result_handler.log)
                            // zone1_ood post_object 到zone2_ood 通知设置context_path context 对象，并且设置下载源 
                            // 该步骤也可以放到PrepareTransFileRequest  PrepareTransFileRequest 暂不支持设置多个context
                            let update_context_action = await new action_api.AddContextRequest({
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
                                    timeout: 60 * 1000,
                                },
                                expect: { err: 0 },
                            }, logger).start({
                                req_path: `/req_path/${path_id}`,
                                context_path: `/context_path/${path_id}/`,
                                deviceid_list: [
                                    stack_manager.get_device_id({
                                        peer_name: "zone1_ood",
                                        dec_id: dec_app_1.to_base_58(),
                                        type: cyfs.CyfsStackRequestorType.Http
                                    }).device_id!.object_id,
                                    stack_manager.get_device_id({
                                        peer_name: "zone1_device1",
                                        dec_id: dec_app_1.to_base_58(),
                                        type: cyfs.CyfsStackRequestorType.Http
                                    }).device_id!.object_id,
                                ]
                            })
                            assert.equal(update_context_action.err, 0, update_context_action.log);
                            assert.equal(update_context_action.resp?.result, 0, update_context_action.resp?.msg);
                            // zone1_ood post_object 到zone2_ood  通知下载文件
                            let result = await new PrepareTransFileRequest({
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
                                },
                                expect: { err: 0 },
                            }, logger).start({
                                req_path: `/req_path/${path_id}`,
                                target: stack_manager.get_device_id({ peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }).device_id!.object_id.to_base_58(),
                                context_path: `/context_path/${path_id}/`,
                                group: `/group/${path_id}`,
                                file_id: file_info!.file_id,
                                file_name: file_info!.file_name!,
                                auto_start: true,
                                not_set_context: true,
                            })
                            // 检查任务完成状态
                            let check_finished = await new action_api.WaitTaskFinished({
                                local: {
                                    peer_name: "zone2_ood",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                input: {
                                    timeout: 60 * 1000,
                                },
                                expect: { err: 0 },

                            }, logger).start({
                                task_id: result.resp!.task_id!
                            })
                            assert.equal(check_finished.err, 0, check_finished.log)
                        })
                        it("device_list 包含两个下载源 全部无效", async () => {
                            // zone2_ood 创建监听器
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

                            }, logger);
                            let result_handler = await action_handler.start({
                                req_path: `/req_path/${path_id}`,
                            });
                            assert.equal(result_handler.err, 0, result_handler.log)
                            // zone1_ood post_object 到zone2_ood 通知设置context_path context 对象，并且设置下载源 
                            // 该步骤也可以放到PrepareTransFileRequest  PrepareTransFileRequest 暂不支持设置多个context
                            let update_context_action = await new action_api.AddContextRequest({
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
                                    timeout: 60 * 1000,
                                },
                                expect: { err: 0 },
                            }, logger).start({
                                req_path: `/req_path/${path_id}`,
                                context_path: `/context_path/${path_id}/`,
                                deviceid_list: [
                                    stack_manager.get_device_id({
                                        peer_name: "zone2_device1",
                                        dec_id: dec_app_1.to_base_58(),
                                        type: cyfs.CyfsStackRequestorType.Http
                                    }).device_id!.object_id,
                                    stack_manager.get_device_id({
                                        peer_name: "zone1_device2",
                                        dec_id: dec_app_1.to_base_58(),
                                        type: cyfs.CyfsStackRequestorType.Http
                                    }).device_id!.object_id,
                                ]
                            })
                            assert.equal(update_context_action.err, 0, update_context_action.log);
                            assert.equal(update_context_action.resp?.result, 0, update_context_action.resp?.msg);
                            // zone1_ood post_object 到zone2_ood  通知下载文件
                            let result = await new PrepareTransFileRequest({
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
                                },
                                expect: { err: 0 },
                            }, logger).start({
                                req_path: `/req_path/${path_id}`,
                                target: stack_manager.get_device_id({ peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }).device_id!.object_id.to_base_58(),
                                context_path: `/context_path/${path_id}/`,
                                group: `/group/${path_id}`,
                                file_id: file_info!.file_id,
                                file_name: file_info!.file_name!,
                                auto_start: true,
                                not_set_context: true,
                            })
                            // 检查任务完成状态
                            let check_finished = await new action_api.WaitTaskFinished({
                                local: {
                                    peer_name: "zone2_ood",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                input: {
                                    timeout: 60 * 1000,
                                },
                                expect: { err: 0 },

                            }, logger).start({
                                task_id: result.resp!.task_id!
                            })
                            assert.equal(check_finished.err, 10, check_finished.log)
                        })
                        it("device_list 包含两个下载源 无效+有效", async () => {
                            // zone2_ood 创建监听器
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

                            }, logger);
                            let result_handler = await action_handler.start({
                                req_path: `/req_path/${path_id}`,
                            });
                            assert.equal(result_handler.err, 0, result_handler.log)
                            // zone1_ood post_object 到zone2_ood 通知设置context_path context 对象，并且设置下载源 
                            // 该步骤也可以放到PrepareTransFileRequest  PrepareTransFileRequest 暂不支持设置多个context
                            let update_context_action = await new action_api.AddContextRequest({
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
                                    timeout: 60 * 1000,
                                },
                                expect: { err: 0 },
                            }, logger).start({
                                req_path: `/req_path/${path_id}`,
                                context_path: `/context_path/${path_id}/`,
                                deviceid_list: [
                                    stack_manager.get_device_id({
                                        peer_name: "zone2_device1",
                                        dec_id: dec_app_1.to_base_58(),
                                        type: cyfs.CyfsStackRequestorType.Http
                                    }).device_id!.object_id,
                                    stack_manager.get_device_id({
                                        peer_name: "zone1_ood",
                                        dec_id: dec_app_1.to_base_58(),
                                        type: cyfs.CyfsStackRequestorType.Http
                                    }).device_id!.object_id,
                                ]
                            })
                            assert.equal(update_context_action.err, 0, update_context_action.log);
                            assert.equal(update_context_action.resp?.result, 0, update_context_action.resp?.msg);
                            // zone1_ood post_object 到zone2_ood  通知下载文件
                            let result = await new PrepareTransFileRequest({
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
                                },
                                expect: { err: 0 },
                            }, logger).start({
                                req_path: `/req_path/${path_id}`,
                                target: stack_manager.get_device_id({ peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }).device_id!.object_id.to_base_58(),
                                context_path: `/context_path/${path_id}/`,
                                group: `/group/${path_id}`,
                                file_id: file_info!.file_id,
                                file_name: file_info!.file_name!,
                                auto_start: true,
                                not_set_context: true,
                            })
                            // 检查任务完成状态
                            let check_finished = await new action_api.WaitTaskFinished({
                                local: {
                                    peer_name: "zone2_ood",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                input: {
                                    timeout: 60 * 1000,
                                },
                                expect: { err: 0 },

                            }, logger).start({
                                task_id: result.resp!.task_id!
                            })
                            assert.equal(check_finished.err, 0, check_finished.log)
                        })
                        it("device_list 包含两个下载源 有效+无效", async () => {
                            // zone2_ood 创建监听器
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

                            }, logger);
                            let result_handler = await action_handler.start({
                                req_path: `/req_path/${path_id}`,
                            });
                            assert.equal(result_handler.err, 0, result_handler.log)
                            // zone1_ood post_object 到zone2_ood 通知设置context_path context 对象，并且设置下载源 
                            // 该步骤也可以放到PrepareTransFileRequest  PrepareTransFileRequest 暂不支持设置多个context
                            let update_context_action = await new action_api.AddContextRequest({
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
                                    timeout: 60 * 1000,
                                },
                                expect: { err: 0 },
                            }, logger).start({
                                req_path: `/req_path/${path_id}`,
                                context_path: `/context_path/${path_id}/`,
                                deviceid_list: [
                                    stack_manager.get_device_id({
                                        peer_name: "zone1_device1",
                                        dec_id: dec_app_1.to_base_58(),
                                        type: cyfs.CyfsStackRequestorType.Http
                                    }).device_id!.object_id,
                                    stack_manager.get_device_id({
                                        peer_name: "zone2_device1",
                                        dec_id: dec_app_1.to_base_58(),
                                        type: cyfs.CyfsStackRequestorType.Http
                                    }).device_id!.object_id,
                                ]
                            })
                            assert.equal(update_context_action.err, 0, update_context_action.log);
                            assert.equal(update_context_action.resp?.result, 0, update_context_action.resp?.msg);
                            // zone1_ood post_object 到zone2_ood  通知下载文件
                            let result = await new PrepareTransFileRequest({
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
                                },
                                expect: { err: 0 },
                            }, logger).start({
                                req_path: `/req_path/${path_id}`,
                                target: stack_manager.get_device_id({ peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }).device_id!.object_id.to_base_58(),
                                context_path: `/context_path/${path_id}/`,
                                group: `/group/${path_id}`,
                                file_id: file_info!.file_id,
                                file_name: file_info!.file_name!,
                                auto_start: true,
                                not_set_context: true,
                            })
                            // 检查任务完成状态
                            let check_finished = await new action_api.WaitTaskFinished({
                                local: {
                                    peer_name: "zone2_ood",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                input: {
                                    timeout: 60 * 1000,
                                },
                                expect: { err: 0 },

                            }, logger).start({
                                task_id: result.resp!.task_id!
                            })
                            assert.equal(check_finished.err, 0, check_finished.log)
                        })

                    })
                    describe("context_path 下重复关联多个context的覆盖操作 ", async () => {
                        it("context_path 下关联一个 有效context + 无效context", async () => {
                            // zone2_ood 创建监听器
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

                            }, logger);
                            let result_handler = await action_handler.start({
                                req_path: `/req_path/${path_id}`,
                            });
                            assert.equal(result_handler.err, 0, result_handler.log)
                            // zone1_device1 post_object 到zone2_ood 通知设置context_path context 对象
                            // 关联有效可下载的context 
                            let update_context_action = await new action_api.AddContextRequest({
                                local: {
                                    peer_name: "zone1_device1",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                remote: {
                                    peer_name: "zone2_ood",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                input: {
                                    timeout: 60 * 1000,
                                },
                                expect: { err: 0 },
                            }, logger).start({
                                req_path: `/req_path/${path_id}`,
                                context_path: `/context_path/${path_id}/`,
                                deviceid_list: [
                                    stack_manager.get_device_id({
                                        peer_name: "zone1_ood",
                                        dec_id: dec_app_1.to_base_58(),
                                        type: cyfs.CyfsStackRequestorType.Http
                                    }).device_id!.object_id,
                                ]
                            })
                            assert.equal(update_context_action.err, 0, update_context_action.log);
                            assert.equal(update_context_action.resp?.result, 0, update_context_action.resp?.msg);
                            // 关联无效不可下载的context 
                            update_context_action = await new action_api.AddContextRequest({
                                local: {
                                    peer_name: "zone1_device1",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                remote: {
                                    peer_name: "zone2_ood",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                input: {
                                    timeout: 60 * 1000,
                                },
                                expect: { err: 0 },
                            }, logger).start({
                                req_path: `/req_path/${path_id}`,
                                context_path: `/context_path/${path_id}/`,
                                deviceid_list: [
                                    stack_manager.get_device_id({
                                        peer_name: "zone1_device2",
                                        dec_id: dec_app_1.to_base_58(),
                                        type: cyfs.CyfsStackRequestorType.Http
                                    }).device_id!.object_id,
                                ]
                            })
                            assert.equal(update_context_action.err, 0, update_context_action.log);
                            assert.equal(update_context_action.resp?.result, 0, update_context_action.resp?.msg);
                            // zone1_ood post_object 到zone2_ood  通知下载文件
                            let result = await new PrepareTransFileRequest({
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
                                },
                                expect: { err: 0 },
                            }, logger).start({
                                req_path: `/req_path/${path_id}`,
                                target: stack_manager.get_device_id({ peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }).device_id!.object_id.to_base_58(),
                                context_path: `/context_path/${path_id}/`,
                                group: `/group/${path_id}`,
                                file_id: file_info!.file_id,
                                file_name: file_info!.file_name!,
                                auto_start: true,
                                not_set_context: true,
                            })
                            // 检查任务完成状态
                            let check_finished = await new action_api.WaitTaskFinished({
                                local: {
                                    peer_name: "zone2_ood",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                input: {
                                    timeout: 60 * 1000,
                                },
                                expect: { err: 0 },

                            }, logger).start({
                                task_id: result.resp!.task_id!
                            })
                            assert.equal(check_finished.err, 10, check_finished.log)

                        })
                        it("context_path 下关联一个 无效context + 有效context", async () => {
                            // zone2_ood 创建监听器
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

                            }, logger);
                            let result_handler = await action_handler.start({
                                req_path: `/req_path/${path_id}`,
                            });
                            assert.equal(result_handler.err, 0, result_handler.log)
                            // zone1_device1 post_object 到zone2_ood 通知设置context_path context 对象
                            
                            // 关联无效不可下载的context 
                            let update_context_action = await new action_api.AddContextRequest({
                                local: {
                                    peer_name: "zone1_device1",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                remote: {
                                    peer_name: "zone2_ood",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                input: {
                                    timeout: 60 * 1000,
                                },
                                expect: { err: 0 },
                            }, logger).start({
                                req_path: `/req_path/${path_id}`,
                                context_path: `/context_path/${path_id}/`,
                                deviceid_list: [
                                    stack_manager.get_device_id({
                                        peer_name: "zone1_device2",
                                        dec_id: dec_app_1.to_base_58(),
                                        type: cyfs.CyfsStackRequestorType.Http
                                    }).device_id!.object_id,
                                ]
                            })
                            assert.equal(update_context_action.err, 0, update_context_action.log);
                            assert.equal(update_context_action.resp?.result, 0, update_context_action.resp?.msg);
                            // 关联有效可下载的context 
                            update_context_action = await new action_api.AddContextRequest({
                                local: {
                                    peer_name: "zone1_device1",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                remote: {
                                    peer_name: "zone2_ood",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                input: {
                                    timeout: 60 * 1000,
                                },
                                expect: { err: 0 },
                            }, logger).start({
                                req_path: `/req_path/${path_id}`,
                                context_path: `/context_path/${path_id}/`,
                                deviceid_list: [
                                    stack_manager.get_device_id({
                                        peer_name: "zone1_ood",
                                        dec_id: dec_app_1.to_base_58(),
                                        type: cyfs.CyfsStackRequestorType.Http
                                    }).device_id!.object_id,
                                ]
                            })
                            assert.equal(update_context_action.err, 0, update_context_action.log);
                            assert.equal(update_context_action.resp?.result, 0, update_context_action.resp?.msg);
                            // zone1_ood post_object 到zone2_ood  通知下载文件
                            let result = await new PrepareTransFileRequest({
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
                                },
                                expect: { err: 0 },
                            }, logger).start({
                                req_path: `/req_path/${path_id}`,
                                target: stack_manager.get_device_id({ peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }).device_id!.object_id.to_base_58(),
                                context_path: `/context_path/${path_id}/`,
                                group: `/group/${path_id}`,
                                file_id: file_info!.file_id,
                                file_name: file_info!.file_name!,
                                auto_start: true,
                                not_set_context: true,
                            })
                            // 检查任务完成状态
                            let check_finished = await new action_api.WaitTaskFinished({
                                local: {
                                    peer_name: "zone2_ood",
                                    dec_id: dec_app_1.to_base_58(),
                                    type: cyfs.CyfsStackRequestorType.Http
                                },
                                input: {
                                    timeout: 60 * 1000,
                                },
                                expect: { err: 0 },

                            }, logger).start({
                                task_id: result.resp!.task_id!
                            })
                            assert.equal(check_finished.err, 0, check_finished.log)
                        })
                    })
                    

                })
                describe("context_path 下关联context chunk_codec_desc 类型", async () => {
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

                        }, logger);

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

                        }, logger);

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

                        }, logger).start({
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

                        }, logger);

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

                        }, logger);

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

                        }, logger).start({
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

                        }, logger);

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

                        }, logger);

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

                        }, logger).start({
                            task_id: result.resp!.task_id!
                        })
                        assert.equal(check_finished.err, 0, check_finished.log)
                    })
                })

            })
        })

    })
})