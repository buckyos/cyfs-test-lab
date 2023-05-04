import assert  from 'assert'; 
import * as cyfs from '../../../../cyfs';
import {RandomGenerator,testLanguage,ESC_char,encodeType,Logger,sleep} from "../../../../common";
import * as path from 'path';

let encoding = require('encoding');

import { StackManager,ActionManager} from "../../../../cyfs-test-util"
import * as action_api from "../../../../dec-app-action"


let stack: cyfs.SharedCyfsStack;
const dec_app_1 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device1decapp")
let owner_id = ""
let zone1_ood_stack : cyfs.SharedCyfsStack;
let zone1_device1_stack : cyfs.SharedCyfsStack;
let zone1_device2_stack : cyfs.SharedCyfsStack;
let zone2_ood_stack : cyfs.SharedCyfsStack;
let zone2_device1_stack : cyfs.SharedCyfsStack;
let zone2_device2_stack : cyfs.SharedCyfsStack;
describe("#op-env 初始化方式", function () {
    
    const stack_manager = StackManager.createInstance();
    let logger : Logger;
    const data_manager = ActionManager.createInstance();
    beforeAll(async function () {
        //测试前置条件，连接测试模拟器设备
        await stack_manager.init();
        
        await sleep(5000);
        // 所有节点 实例化一个 Http Requestor dec_app_1 协议栈
        let dec_app_1_client =  await stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.Http, dec_app_1);
        assert.equal(dec_app_1_client.err,0,dec_app_1_client.log)
        stack = stack_manager.get_cyfs_satck({
            peer_name: "zone1_ood",
            dec_id: dec_app_1.to_base_58(),
            type: cyfs.CyfsStackRequestorType.Http
        }).stack!;
        zone1_ood_stack = stack_manager.get_cyfs_satck({
            peer_name: "zone1_ood",
            dec_id: dec_app_1.to_base_58(),
            type: cyfs.CyfsStackRequestorType.Http
        }).stack!;
        zone1_device1_stack = stack_manager.get_cyfs_satck({
            peer_name: "zone1_device1",
            dec_id: dec_app_1.to_base_58(),
            type: cyfs.CyfsStackRequestorType.Http
        }).stack!;
        zone1_device2_stack = stack_manager.get_cyfs_satck({
            peer_name: "zone1_device2",
            dec_id: dec_app_1.to_base_58(),
            type: cyfs.CyfsStackRequestorType.Http
        }).stack!;
        zone2_ood_stack = stack_manager.get_cyfs_satck({
            peer_name: "zone2_ood",
            dec_id: dec_app_1.to_base_58(),
            type: cyfs.CyfsStackRequestorType.Http
        }).stack!;
        zone2_device1_stack = stack_manager.get_cyfs_satck({
            peer_name: "zone2_device1",
            dec_id: dec_app_1.to_base_58(),
            type: cyfs.CyfsStackRequestorType.Http
        }).stack!;
        zone2_device2_stack = stack_manager.get_cyfs_satck({
            peer_name: "zone2_device2",
            dec_id: dec_app_1.to_base_58(),
            type: cyfs.CyfsStackRequestorType.Http
        }).stack!;
        owner_id = stack.local_device_id().to_base_58();
        console.info(`############用例执开始执行`);
    })
    afterAll(async () => {
        // 停止测试模拟器
        stack_manager.destory();
        // 停止测试驱动
        await stack_manager.driver!.stop();
        // 保存测试记录
        data_manager.save_history_to_file("E:\\log");
    })
    let report_result: {
        title: string;
        value: any;
    };
    beforeEach(function () {
        // 设置当前用例id 方便日志定位问题
        let testcase_id = `Testcase-${RandomGenerator.string(10)}-${Date.now()}`;
        data_manager.update_current_testcase_id(testcase_id);
        console.info(`\n\n########### ${testcase_id} 开始运行###########\n\n`)
    })
    afterEach(function () {
        // 将当前用例执行记录到history
        let current_actions = data_manager.report_current_actions();
        console.info(`########### ${current_actions.testcase_id} 运行结束`)
        report_result = {
            title: `用例:${current_actions.testcase_id}`,
            value: current_actions.action_list
        };
        // addContext.default(this, report_result);
    })
    describe("## SharedCyfsStack.root_state() 初始化op-env", async () => {
        describe("### get_category 接口测试", async () => {
            it("全部参数正常流程", async () => {
                let result = await stack.root_state().get_category();
                console.info(JSON.stringify(result))
            })
        })
        describe("### get_base_requestor 接口测试", async () => {
            it("全部参数正常流程", async () => {
                let result = await stack.root_state().get_base_requestor();
                console.info(JSON.stringify(result))
            })
        })
        describe("### get_dec_id 接口测试", async () => {
            it("全部参数正常流程", async () => {
                let result = await stack.root_state().get_dec_id();
                console.info(JSON.stringify(result))
                assert.ok(dec_app_1 == result, "dec_id 校验失败")
            })
        })
        describe("### get_current_root 接口测试", async () => {
            it("全部参数正常流程 RootStateRootType.Dec", async () => {
                let result = await stack.root_state().get_current_root({
                    common: {
                        dec_id: dec_app_1,
                        target: stack.local_device_id().object_id,
                        flags: 1,
                    },
                    root_type: cyfs.RootStateRootType.Dec
                });
                console.info(JSON.stringify(result))
            })
            it("全部参数正常流程 RootStateRootType.Global", async () => {
                let result = await stack.root_state().get_current_root({
                    common: {
                        dec_id: dec_app_1,
                        target: stack.local_device_id().object_id,
                        flags: 1,
                    },
                    root_type: cyfs.RootStateRootType.Global
                });
                console.info(JSON.stringify(result))
            })
        })
        describe("### create_op_env 接口测试", async () => {
            it("全部参数正常流程-path-target为空", async () => {
                let state = await stack.root_state().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Path
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-path-target指定本地", async () => {
                let state = await stack.root_state().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                        target: zone1_device1_stack.local_device_id().object_id
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Path
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-path-target指定其他device", async () => {
                let state = await stack.root_state().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                        target: zone1_device2_stack.local_device_id().object_id
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Path
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-path-target指定主OOD", async () => {
                let state = await stack.root_state().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                        target: zone1_ood_stack.local_device_id().object_id
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Path
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-path-target指定从OOD", async () => {
                let state = await stack.root_state().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                        target: zone1_ood_stack.local_device_id().object_id
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Path
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-single-target为空", async () => {
                let state = await stack.root_state().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Single
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-single-target指定本地", async () => {
                let state = await stack.root_state().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                        target: stack.local_device_id().object_id
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Single
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-single-target指定其他device", async () => {
                let state = await stack.root_state().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                        target: zone1_device2_stack.local_device_id().object_id
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Single
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-single-target指定主OOD", async () => {
                let state = await stack.root_state().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                        target: zone1_ood_stack.local_device_id().object_id
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Single
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-single-target指定从OOD", async () => {
                let state = await stack.root_state().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                        target: zone1_ood_stack.local_device_id().object_id
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Single
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
        })

    })
    describe("## SharedCyfsStack.root_state_stub() 初始化op-env", async () => {

        describe("### get_current_root 接口测试", async () => {
            it("全部参数正常流程", async () => {
                let result = await stack.root_state_stub().get_current_root();
                console.info(JSON.stringify(result))
            })
        })
        describe("### get_dec_root 接口测试", async () => {
            it("全部参数正常流程", async () => {
                let result = await stack.root_state_stub().get_dec_root();
                console.info(JSON.stringify(result))
            })
        })
        describe("### create_path_op_env 接口测试", async () => {
            it("全部参数正常流程-path-target为空", async () => {
                let result = await stack.root_state_stub().create_path_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
            it("全部参数正常流程-path-target指定本地", async () => {
                let result = await stack.root_state_stub(stack.local_device_id().object_id).create_path_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
            it("全部参数正常流程-path-target指定其他device", async () => {
                let result = await stack.root_state_stub(zone1_device2_stack.local_device_id().object_id).create_path_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
            it("全部参数正常流程-path-target指定主OOD", async () => {
                let result = await stack.root_state_stub(zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
            it("全部参数正常流程-path-target指定从OOD", async () => {
                let result = await stack.root_state_stub(zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
        })
        describe("### create_single_op_env 接口测试", async () => {
            it("全部参数正常流程-single-target为空", async () => {
                let result = await stack.root_state_stub().create_single_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
            it("全部参数正常流程-single-target指定本地", async () => {
                let result = await stack.root_state_stub(stack.local_device_id().object_id).create_single_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
            it("全部参数正常流程-single-target指定其他device", async () => {
                let result = await stack.root_state_stub(zone1_device2_stack.local_device_id().object_id).create_single_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
            it("全部参数正常流程-single-target指定主OOD", async () => {
                let result = await stack.root_state_stub(zone1_ood_stack.local_device_id().object_id).create_single_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
            it("全部参数正常流程-single-target指定从OOD", async () => {
                let result = await stack.root_state_stub(zone1_ood_stack.local_device_id().object_id).create_single_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
        })

    })
    describe("## SharedCyfsStack.local_cache() 初始化op-env", async () => {
        describe("### get_category 接口测试", async () => {
            it("全部参数正常流程", async () => {
                let result = await stack.local_cache().get_category();
                console.info(JSON.stringify(result))
            })
        })
        describe("### get_base_requestor 接口测试", async () => {
            it("全部参数正常流程", async () => {
                let result = await stack.local_cache().get_base_requestor();
                console.info(JSON.stringify(result))
            })
        })
        describe("### get_dec_id 接口测试", async () => {
            it("全部参数正常流程", async () => {
                let result = await stack.local_cache().get_dec_id();
                console.info(JSON.stringify(result))
                assert.ok(dec_app_1 == result, "dec_id 校验失败")
            })
        })
        describe("### get_current_root 接口测试", async () => {
            it("全部参数正常流程", async () => {
                let result = await stack.local_cache().get_current_root({
                    common: {
                        dec_id: dec_app_1,
                        target: stack.local_device_id().object_id,
                        flags: 1,
                    },
                    root_type: cyfs.RootStateRootType.Dec
                });
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
        })
        describe("### create_op_env 接口测试", async () => {
            it("全部参数正常流程-path-target为空", async () => {
                let state = await stack.local_cache().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Path
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-path-target指定本地", async () => {
                let state = await stack.local_cache().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                        target: stack.local_device_id().object_id,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Path
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-path-target指定其他device", async () => {
                let state = await stack.local_cache().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                        target: zone1_device2_stack.local_device_id().object_id,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Path
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-path-target指定主OOD", async () => {
                let state = await stack.local_cache().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                        target: zone1_ood_stack.local_device_id().object_id,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Path
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-path-target指定从OOD", async () => {
                let state = await stack.local_cache().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                        target: zone1_ood_stack.local_device_id().object_id,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Path
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-single-target为空", async () => {
                let state = await stack.local_cache().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Single
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-single-target指定本地", async () => {
                let state = await stack.local_cache().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                        target: zone1_device1_stack.local_device_id().object_id,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Single
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-single-target指定其他device", async () => {
                let state = await stack.local_cache().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                        target: zone1_device2_stack.local_device_id().object_id,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Single
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-single-target指定主OOD", async () => {
                let state = await stack.local_cache().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                        target: zone1_ood_stack.local_device_id().object_id,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Single
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-single-target指定从OOD", async () => {
                let state = await stack.local_cache().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                        target: zone1_ood_stack.local_device_id().object_id,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Single
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
        })

    })
    describe("## SharedCyfsStack.local_cache_stub() 初始化op-env", async () => {
        describe("### get_current_root 接口测试", async () => {
            it("全部参数正常流程", async () => {
                let state = await stack.local_cache_stub().get_current_root();
                console.info(`${JSON.stringify(state)}`)
            })
        })
        describe("### get_dec_root 接口测试", async () => {
            it("全部参数正常流程", async () => {
                let state = await stack.local_cache_stub().get_dec_root();
                console.info(`${JSON.stringify(state)}`)
            })
        })
        describe("### create_path_op_env 接口测试", async () => {
            it("全部参数正常流程-path-target为空", async () => {
                let result = await stack.local_cache_stub().create_path_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
            it("全部参数正常流程-path-target指定本地", async () => {
                let result = await stack.local_cache_stub(zone1_device1_stack.local_device_id().object_id).create_path_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
            it("全部参数正常流程-path-target指定其他device", async () => {
                let result = await stack.local_cache_stub(zone1_device2_stack.local_device_id().object_id).create_path_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
            it("全部参数正常流程-path-target指定主OOD", async () => {
                let result = await stack.local_cache_stub(zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
            it("全部参数正常流程-path-target指定从OOD", async () => {
                let result = await stack.local_cache_stub(zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
        })
        describe("### create_single_op_env 接口测试", async () => {
            it("全部参数正常流程-single-target为空", async () => {
                let result = await stack.local_cache_stub().create_single_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
            it("全部参数正常流程-single-target指定本地", async () => {
                let result = await stack.local_cache_stub(zone1_device1_stack.local_device_id().object_id).create_single_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
            it("全部参数正常流程-single-target指定其他device", async () => {
                let result = await stack.local_cache_stub(zone1_device2_stack.local_device_id().object_id).create_single_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
            it("全部参数正常流程-single-target指定主OOD", async () => {
                let result = await stack.local_cache_stub(zone1_ood_stack.local_device_id().object_id).create_single_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
            it("全部参数正常流程-single-target指定从OOD", async () => {
                let result = await stack.local_cache_stub(zone1_ood_stack.local_device_id().object_id).create_single_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
        })

    })
})
