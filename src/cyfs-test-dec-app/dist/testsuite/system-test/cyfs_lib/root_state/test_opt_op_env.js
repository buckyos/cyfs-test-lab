"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const cyfs = __importStar(require("../../../../cyfs"));
const common_1 = require("../../../../common");
let encoding = require('encoding');
const addContext = __importStar(require("mochawesome/addContext"));
const cyfs_driver_client_1 = require("../../../../cyfs-driver-client");
const action_api = __importStar(require("../../../../dec-app-action"));
let stack;
const dec_app_1 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device1decapp");
let owner_id = "";
let zone1_ood_stack;
let zone1_device1_stack;
let zone1_device2_stack;
let zone2_ood_stack;
let zone2_device1_stack;
let zone2_device2_stack;
describe("#op-env 初始化方式", function () {
    this.timeout(0);
    const stack_manager = cyfs_driver_client_1.StackManager.createInstance();
    let logger;
    const data_manager = action_api.ActionManager.createInstance();
    this.beforeAll(async function () {
        //测试前置条件，连接测试模拟器设备
        await stack_manager.init();
        logger = stack_manager.logger;
        await common_1.sleep(5000);
        // 所有节点 实例化一个 Http Requestor dec_app_1 协议栈
        let dec_app_1_client = await stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.Http, dec_app_1);
        assert_1.default.equal(dec_app_1_client.err, 0, dec_app_1_client.log);
        stack = stack_manager.get_cyfs_satck({
            peer_name: "zone1_ood",
            dec_id: dec_app_1.to_base_58(),
            type: cyfs.CyfsStackRequestorType.Http
        }).stack;
        zone1_ood_stack = stack_manager.get_cyfs_satck({
            peer_name: "zone1_ood",
            dec_id: dec_app_1.to_base_58(),
            type: cyfs.CyfsStackRequestorType.Http
        }).stack;
        zone1_device1_stack = stack_manager.get_cyfs_satck({
            peer_name: "zone1_device1",
            dec_id: dec_app_1.to_base_58(),
            type: cyfs.CyfsStackRequestorType.Http
        }).stack;
        zone1_device2_stack = stack_manager.get_cyfs_satck({
            peer_name: "zone1_device2",
            dec_id: dec_app_1.to_base_58(),
            type: cyfs.CyfsStackRequestorType.Http
        }).stack;
        zone2_ood_stack = stack_manager.get_cyfs_satck({
            peer_name: "zone2_ood",
            dec_id: dec_app_1.to_base_58(),
            type: cyfs.CyfsStackRequestorType.Http
        }).stack;
        zone2_device1_stack = stack_manager.get_cyfs_satck({
            peer_name: "zone2_device1",
            dec_id: dec_app_1.to_base_58(),
            type: cyfs.CyfsStackRequestorType.Http
        }).stack;
        zone2_device2_stack = stack_manager.get_cyfs_satck({
            peer_name: "zone2_device2",
            dec_id: dec_app_1.to_base_58(),
            type: cyfs.CyfsStackRequestorType.Http
        }).stack;
        owner_id = stack.local_device_id().to_base_58();
        logger.info(`############用例执开始执行`);
    });
    this.afterAll(async () => {
        // 停止测试模拟器
        stack_manager.destory();
        // 停止测试驱动
        await stack_manager.driver.stop();
        // 保存测试记录
        data_manager.save_history_to_file(logger.dir());
    });
    let report_result;
    beforeEach(function () {
        // 设置当前用例id 方便日志定位问题
        let testcase_id = `Testcase-${common_1.RandomGenerator.string(10)}-${Date.now()}`;
        data_manager.update_current_testcase_id(testcase_id);
        logger.info(`\n\n########### ${testcase_id} 开始运行###########\n\n`);
    });
    afterEach(function () {
        // 将当前用例执行记录到history
        let current_actions = data_manager.report_current_actions();
        logger.info(`########### ${current_actions.testcase_id} 运行结束`);
        report_result = {
            title: `用例:${current_actions.testcase_id}`,
            value: current_actions.action_list
        };
        addContext.default(this, report_result);
    });
    describe("## SharedCyfsStack.root_state() 初始化op-env", async () => {
        describe("### get_category 接口测试", async () => {
            it("全部参数正常流程", async () => {
                let result = await stack.root_state().get_category();
                console.info(JSON.stringify(result));
            });
        });
        describe("### get_base_requestor 接口测试", async () => {
            it("全部参数正常流程", async () => {
                let result = await stack.root_state().get_base_requestor();
                console.info(JSON.stringify(result));
            });
        });
        describe("### get_dec_id 接口测试", async () => {
            it("全部参数正常流程", async () => {
                let result = await stack.root_state().get_dec_id();
                console.info(JSON.stringify(result));
                assert_1.default.ok(dec_app_1 == result, "dec_id 校验失败");
            });
        });
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
                console.info(JSON.stringify(result));
            });
            it("全部参数正常流程 RootStateRootType.Global", async () => {
                let result = await stack.root_state().get_current_root({
                    common: {
                        dec_id: dec_app_1,
                        target: stack.local_device_id().object_id,
                        flags: 1,
                    },
                    root_type: cyfs.RootStateRootType.Global
                });
                console.info(JSON.stringify(result));
            });
        });
        describe("### create_op_env 接口测试", async () => {
            it("全部参数正常流程-path-target为空", async () => {
                let state = await stack.root_state().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Path
                });
                console.info(JSON.stringify(state));
                assert_1.default.ok(!state.err);
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`);
            });
            it("全部参数正常流程-path-target指定本地", async () => {
                let state = await stack.root_state().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                        target: zone1_device1_stack.local_device_id().object_id
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Path
                });
                console.info(JSON.stringify(state));
                assert_1.default.ok(!state.err);
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`);
            });
            it("全部参数正常流程-path-target指定其他device", async () => {
                let state = await stack.root_state().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                        target: zone1_device2_stack.local_device_id().object_id
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Path
                });
                console.info(JSON.stringify(state));
                assert_1.default.ok(!state.err);
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`);
            });
            it("全部参数正常流程-path-target指定主OOD", async () => {
                let state = await stack.root_state().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                        target: zone1_ood_stack.local_device_id().object_id
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Path
                });
                console.info(JSON.stringify(state));
                assert_1.default.ok(!state.err);
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`);
            });
            it("全部参数正常流程-path-target指定从OOD", async () => {
                let state = await stack.root_state().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                        target: zone1_ood_stack.local_device_id().object_id
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Path
                });
                console.info(JSON.stringify(state));
                assert_1.default.ok(!state.err);
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`);
            });
            it("全部参数正常流程-single-target为空", async () => {
                let state = await stack.root_state().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Single
                });
                console.info(JSON.stringify(state));
                assert_1.default.ok(!state.err);
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`);
            });
            it("全部参数正常流程-single-target指定本地", async () => {
                let state = await stack.root_state().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                        target: stack.local_device_id().object_id
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Single
                });
                console.info(JSON.stringify(state));
                assert_1.default.ok(!state.err);
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`);
            });
            it("全部参数正常流程-single-target指定其他device", async () => {
                let state = await stack.root_state().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                        target: zone1_device2_stack.local_device_id().object_id
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Single
                });
                console.info(JSON.stringify(state));
                assert_1.default.ok(!state.err);
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`);
            });
            it("全部参数正常流程-single-target指定主OOD", async () => {
                let state = await stack.root_state().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                        target: zone1_ood_stack.local_device_id().object_id
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Single
                });
                console.info(JSON.stringify(state));
                assert_1.default.ok(!state.err);
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`);
            });
            it("全部参数正常流程-single-target指定从OOD", async () => {
                let state = await stack.root_state().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                        target: zone1_ood_stack.local_device_id().object_id
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Single
                });
                console.info(JSON.stringify(state));
                assert_1.default.ok(!state.err);
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`);
            });
        });
    });
    describe("## SharedCyfsStack.root_state_stub() 初始化op-env", async () => {
        describe("### get_current_root 接口测试", async () => {
            it("全部参数正常流程", async () => {
                let result = await stack.root_state_stub().get_current_root();
                console.info(JSON.stringify(result));
            });
        });
        describe("### get_dec_root 接口测试", async () => {
            it("全部参数正常流程", async () => {
                let result = await stack.root_state_stub().get_dec_root();
                console.info(JSON.stringify(result));
            });
        });
        describe("### create_path_op_env 接口测试", async () => {
            it("全部参数正常流程-path-target为空", async () => {
                let result = await stack.root_state_stub().create_path_op_env();
                console.info(JSON.stringify(result));
                assert_1.default.ok(!result.err);
            });
            it("全部参数正常流程-path-target指定本地", async () => {
                let result = await stack.root_state_stub(stack.local_device_id().object_id).create_path_op_env();
                console.info(JSON.stringify(result));
                assert_1.default.ok(!result.err);
            });
            it("全部参数正常流程-path-target指定其他device", async () => {
                let result = await stack.root_state_stub(zone1_device2_stack.local_device_id().object_id).create_path_op_env();
                console.info(JSON.stringify(result));
                assert_1.default.ok(!result.err);
            });
            it("全部参数正常流程-path-target指定主OOD", async () => {
                let result = await stack.root_state_stub(zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                console.info(JSON.stringify(result));
                assert_1.default.ok(!result.err);
            });
            it("全部参数正常流程-path-target指定从OOD", async () => {
                let result = await stack.root_state_stub(zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                console.info(JSON.stringify(result));
                assert_1.default.ok(!result.err);
            });
        });
        describe("### create_single_op_env 接口测试", async () => {
            it("全部参数正常流程-single-target为空", async () => {
                let result = await stack.root_state_stub().create_single_op_env();
                console.info(JSON.stringify(result));
                assert_1.default.ok(!result.err);
            });
            it("全部参数正常流程-single-target指定本地", async () => {
                let result = await stack.root_state_stub(stack.local_device_id().object_id).create_single_op_env();
                console.info(JSON.stringify(result));
                assert_1.default.ok(!result.err);
            });
            it("全部参数正常流程-single-target指定其他device", async () => {
                let result = await stack.root_state_stub(zone1_device2_stack.local_device_id().object_id).create_single_op_env();
                console.info(JSON.stringify(result));
                assert_1.default.ok(!result.err);
            });
            it("全部参数正常流程-single-target指定主OOD", async () => {
                let result = await stack.root_state_stub(zone1_ood_stack.local_device_id().object_id).create_single_op_env();
                console.info(JSON.stringify(result));
                assert_1.default.ok(!result.err);
            });
            it("全部参数正常流程-single-target指定从OOD", async () => {
                let result = await stack.root_state_stub(zone1_ood_stack.local_device_id().object_id).create_single_op_env();
                console.info(JSON.stringify(result));
                assert_1.default.ok(!result.err);
            });
        });
    });
    describe("## SharedCyfsStack.local_cache() 初始化op-env", async () => {
        describe("### get_category 接口测试", async () => {
            it("全部参数正常流程", async () => {
                let result = await stack.local_cache().get_category();
                console.info(JSON.stringify(result));
            });
        });
        describe("### get_base_requestor 接口测试", async () => {
            it("全部参数正常流程", async () => {
                let result = await stack.local_cache().get_base_requestor();
                console.info(JSON.stringify(result));
            });
        });
        describe("### get_dec_id 接口测试", async () => {
            it("全部参数正常流程", async () => {
                let result = await stack.local_cache().get_dec_id();
                console.info(JSON.stringify(result));
                assert_1.default.ok(dec_app_1 == result, "dec_id 校验失败");
            });
        });
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
                console.info(JSON.stringify(result));
                assert_1.default.ok(!result.err);
            });
        });
        describe("### create_op_env 接口测试", async () => {
            it("全部参数正常流程-path-target为空", async () => {
                let state = await stack.local_cache().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Path
                });
                console.info(JSON.stringify(state));
                assert_1.default.ok(!state.err);
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`);
            });
            it("全部参数正常流程-path-target指定本地", async () => {
                let state = await stack.local_cache().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                        target: stack.local_device_id().object_id,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Path
                });
                console.info(JSON.stringify(state));
                assert_1.default.ok(!state.err);
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`);
            });
            it("全部参数正常流程-path-target指定其他device", async () => {
                let state = await stack.local_cache().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                        target: zone1_device2_stack.local_device_id().object_id,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Path
                });
                console.info(JSON.stringify(state));
                assert_1.default.ok(!state.err);
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`);
            });
            it("全部参数正常流程-path-target指定主OOD", async () => {
                let state = await stack.local_cache().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                        target: zone1_ood_stack.local_device_id().object_id,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Path
                });
                console.info(JSON.stringify(state));
                assert_1.default.ok(!state.err);
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`);
            });
            it("全部参数正常流程-path-target指定从OOD", async () => {
                let state = await stack.local_cache().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                        target: zone1_ood_stack.local_device_id().object_id,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Path
                });
                console.info(JSON.stringify(state));
                assert_1.default.ok(!state.err);
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`);
            });
            it("全部参数正常流程-single-target为空", async () => {
                let state = await stack.local_cache().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Single
                });
                console.info(JSON.stringify(state));
                assert_1.default.ok(!state.err);
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`);
            });
            it("全部参数正常流程-single-target指定本地", async () => {
                let state = await stack.local_cache().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                        target: zone1_device1_stack.local_device_id().object_id,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Single
                });
                console.info(JSON.stringify(state));
                assert_1.default.ok(!state.err);
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`);
            });
            it("全部参数正常流程-single-target指定其他device", async () => {
                let state = await stack.local_cache().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                        target: zone1_device2_stack.local_device_id().object_id,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Single
                });
                console.info(JSON.stringify(state));
                assert_1.default.ok(!state.err);
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`);
            });
            it("全部参数正常流程-single-target指定主OOD", async () => {
                let state = await stack.local_cache().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                        target: zone1_ood_stack.local_device_id().object_id,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Single
                });
                console.info(JSON.stringify(state));
                assert_1.default.ok(!state.err);
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`);
            });
            it("全部参数正常流程-single-target指定从OOD", async () => {
                let state = await stack.local_cache().create_op_env({
                    common: {
                        dec_id: dec_app_1,
                        flags: 1,
                        target: zone1_ood_stack.local_device_id().object_id,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Single
                });
                console.info(JSON.stringify(state));
                assert_1.default.ok(!state.err);
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`);
            });
        });
    });
    describe("## SharedCyfsStack.local_cache_stub() 初始化op-env", async () => {
        describe("### get_current_root 接口测试", async () => {
            it("全部参数正常流程", async () => {
                let state = await stack.local_cache_stub().get_current_root();
                console.info(`${JSON.stringify(state)}`);
            });
        });
        describe("### get_dec_root 接口测试", async () => {
            it("全部参数正常流程", async () => {
                let state = await stack.local_cache_stub().get_dec_root();
                console.info(`${JSON.stringify(state)}`);
            });
        });
        describe("### create_path_op_env 接口测试", async () => {
            it("全部参数正常流程-path-target为空", async () => {
                let result = await stack.local_cache_stub().create_path_op_env();
                console.info(JSON.stringify(result));
                assert_1.default.ok(!result.err);
            });
            it("全部参数正常流程-path-target指定本地", async () => {
                let result = await stack.local_cache_stub(zone1_device1_stack.local_device_id().object_id).create_path_op_env();
                console.info(JSON.stringify(result));
                assert_1.default.ok(!result.err);
            });
            it("全部参数正常流程-path-target指定其他device", async () => {
                let result = await stack.local_cache_stub(zone1_device2_stack.local_device_id().object_id).create_path_op_env();
                console.info(JSON.stringify(result));
                assert_1.default.ok(!result.err);
            });
            it("全部参数正常流程-path-target指定主OOD", async () => {
                let result = await stack.local_cache_stub(zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                console.info(JSON.stringify(result));
                assert_1.default.ok(!result.err);
            });
            it("全部参数正常流程-path-target指定从OOD", async () => {
                let result = await stack.local_cache_stub(zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                console.info(JSON.stringify(result));
                assert_1.default.ok(!result.err);
            });
        });
        describe("### create_single_op_env 接口测试", async () => {
            it("全部参数正常流程-single-target为空", async () => {
                let result = await stack.local_cache_stub().create_single_op_env();
                console.info(JSON.stringify(result));
                assert_1.default.ok(!result.err);
            });
            it("全部参数正常流程-single-target指定本地", async () => {
                let result = await stack.local_cache_stub(zone1_device1_stack.local_device_id().object_id).create_single_op_env();
                console.info(JSON.stringify(result));
                assert_1.default.ok(!result.err);
            });
            it("全部参数正常流程-single-target指定其他device", async () => {
                let result = await stack.local_cache_stub(zone1_device2_stack.local_device_id().object_id).create_single_op_env();
                console.info(JSON.stringify(result));
                assert_1.default.ok(!result.err);
            });
            it("全部参数正常流程-single-target指定主OOD", async () => {
                let result = await stack.local_cache_stub(zone1_ood_stack.local_device_id().object_id).create_single_op_env();
                console.info(JSON.stringify(result));
                assert_1.default.ok(!result.err);
            });
            it("全部参数正常流程-single-target指定从OOD", async () => {
                let result = await stack.local_cache_stub(zone1_ood_stack.local_device_id().object_id).create_single_op_env();
                console.info(JSON.stringify(result));
                assert_1.default.ok(!result.err);
            });
        });
    });
});
