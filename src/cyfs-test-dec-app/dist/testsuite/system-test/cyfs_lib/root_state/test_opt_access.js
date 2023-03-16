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
const mocha_1 = require("mocha");
let encoding = require('encoding');
const addContext = __importStar(require("mochawesome/addContext"));
const cyfs_driver_client_1 = require("../../../../cyfs-driver-client");
const action_api = __importStar(require("../../../../dec-app-action"));
let stack;
const dec_app_1 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device1decapp");
let owner_id = "";
// npx mocha .\test_opt_access.ts --reporter mochawesome --require ts-node/register
// TO_FIX : root_state_accessor ACL权限控制部分用例未修改，用例为旧的ACL配置文件体系，已删除用例
describe("root_state 模块: root_state_accessor 测试 ", function () {
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
    describe("## access 初始化方式", async () => {
        describe("### root_state_access", async () => {
            let op_env;
            let my_path = `/qaTest/access/${common_1.RandomGenerator.string(10)}`;
            mocha_1.before(async () => {
                let result = await stack.root_state_stub().create_path_op_env();
                assert_1.default.ok(!result.err);
                op_env = result.unwrap();
                for (let i = 0; i < 10; i++) {
                    let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id1 = obj1.desc().object_id();
                    let result1 = await op_env.insert_with_key(my_path, common_1.RandomGenerator.string(10), obj_id1);
                    console.info(JSON.stringify(result1));
                    assert_1.default.ok(!result1.err);
                }
                let save_update = await op_env.update();
                console.info(JSON.stringify(save_update));
                assert_1.default.ok(!save_update.err);
                let save = await op_env.commit();
                console.info(JSON.stringify(save));
                assert_1.default.ok(!save.err);
            });
            describe("#### get_category接口", async () => {
                it("接口调用正常流程", async () => {
                    let result = await stack.root_state().get_category();
                    console.info(JSON.stringify(result));
                });
            });
            describe("#### get_category接口", async () => {
                it("接口调用正常流程", async () => {
                    let result = await stack.root_state_accessor().get_dec_id();
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(result == dec_app_1);
                });
            });
            describe("#### get_object_by_path 接口", async () => {
                it("接口调用正常流程", async () => {
                    let result = await stack.root_state_accessor().get_object_by_path({
                        common: {
                            dec_id: dec_app_1,
                            flags: 1,
                            target: stack.local_device_id().object_id
                        },
                        inner_path: my_path
                    });
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
            describe("#### get_category接口", async () => {
                it("接口调用正常流程", async () => {
                    let result = await stack.root_state_accessor().list({
                        common: {
                            dec_id: dec_app_1,
                            flags: 1,
                            target: stack.local_device_id().object_id
                        },
                        inner_path: my_path,
                        page_index: 0,
                        page_size: 5,
                    });
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
        });
        describe("### root_state_accessor_stub", async () => {
            let op_env;
            let my_path = `/qaTest/access/${common_1.RandomGenerator.string(10)}`;
            mocha_1.before(async () => {
                let result = await stack.root_state_stub().create_path_op_env();
                assert_1.default.ok(!result.err);
                op_env = result.unwrap();
                for (let i = 0; i < 10; i++) {
                    let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id1 = obj1.desc().object_id();
                    let result1 = await op_env.insert_with_key(my_path, common_1.RandomGenerator.string(10), obj_id1);
                    console.info(JSON.stringify(result1));
                    assert_1.default.ok(!result1.err);
                }
                let save_update = await op_env.update();
                console.info(JSON.stringify(save_update));
                assert_1.default.ok(!save_update.err);
                let save = await op_env.commit();
                console.info(JSON.stringify(save));
                assert_1.default.ok(!save.err);
            });
            describe("#### get_object_by_path 接口", async () => {
                it("接口调用正常流程", async () => {
                    let result = await stack.root_state_accessor_stub().get_object_by_path(my_path);
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
            describe("#### get_object_by_path 接口", async () => {
                it("接口调用正常流程", async () => {
                    let result = await stack.root_state_accessor_stub().list(my_path, 0, 5);
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
        });
        describe("### local_cache_accessor", async () => {
            let op_env;
            let my_path = `/qaTest/access/${common_1.RandomGenerator.string(10)}`;
            mocha_1.before(async () => {
                let result = await stack.root_state_stub().create_path_op_env();
                assert_1.default.ok(!result.err);
                op_env = result.unwrap();
                for (let i = 0; i < 10; i++) {
                    let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id1 = obj1.desc().object_id();
                    let result1 = await op_env.insert_with_key(my_path, common_1.RandomGenerator.string(10), obj_id1);
                    console.info(JSON.stringify(result1));
                    assert_1.default.ok(!result1.err);
                }
                let save_update = await op_env.update();
                console.info(JSON.stringify(save_update));
                assert_1.default.ok(!save_update.err);
                let save = await op_env.commit();
                console.info(JSON.stringify(save));
                assert_1.default.ok(!save.err);
            });
            describe("#### get_category接口", async () => {
                it("接口调用正常流程", async () => {
                    let result = await stack.local_cache_accessor().get_category();
                    console.info(JSON.stringify(result));
                });
            });
            describe("#### get_category接口", async () => {
                it("接口调用正常流程", async () => {
                    let result = await stack.local_cache_accessor().get_dec_id();
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(result == dec_app_1);
                });
            });
            describe("#### get_object_by_path 接口", async () => {
                it("接口调用正常流程", async () => {
                    let result = await stack.local_cache_accessor().get_object_by_path({
                        common: {
                            dec_id: dec_app_1,
                            flags: 1,
                            target: stack.local_device_id().object_id
                        },
                        inner_path: my_path
                    });
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
            describe("#### get_category接口", async () => {
                it("接口调用正常流程", async () => {
                    let result = await stack.local_cache_accessor().list({
                        common: {
                            dec_id: dec_app_1,
                            flags: 1,
                            target: stack.local_device_id().object_id
                        },
                        inner_path: my_path,
                        page_index: 0,
                        page_size: 5,
                    });
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
        });
        describe("### local_cache_accessor_stub", async () => {
            let op_env;
            let my_path = `/qaTest/access/${common_1.RandomGenerator.string(10)}`;
            mocha_1.before(async () => {
                let result = await stack.root_state_stub().create_path_op_env();
                assert_1.default.ok(!result.err);
                op_env = result.unwrap();
                for (let i = 0; i < 10; i++) {
                    let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id1 = obj1.desc().object_id();
                    let result1 = await op_env.insert_with_key(my_path, common_1.RandomGenerator.string(10), obj_id1);
                    console.info(JSON.stringify(result1));
                    assert_1.default.ok(!result1.err);
                }
                let save_update = await op_env.update();
                console.info(JSON.stringify(save_update));
                assert_1.default.ok(!save_update.err);
                let save = await op_env.commit();
                console.info(JSON.stringify(save));
                assert_1.default.ok(!save.err);
            });
            describe("#### get_object_by_path 接口", async () => {
                it("接口调用正常流程", async () => {
                    let result = await stack.local_cache_accessor_stub().get_object_by_path(my_path);
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
            describe("#### list 接口", async () => {
                it("接口调用正常流程", async () => {
                    let result = await stack.local_cache_accessor_stub().list(my_path, 0, 5);
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
        });
    });
    describe("## access 获取object_数据", async () => {
        describe("#### Map数据获取", async () => {
            let op_env;
            let my_path = `/qaTest/access/${common_1.RandomGenerator.string(10)}`;
            mocha_1.before(async () => {
                let result = await stack.root_state_stub().create_path_op_env();
                assert_1.default.ok(!result.err);
                op_env = result.unwrap();
                for (let i = 0; i < 10; i++) {
                    let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id1 = obj1.desc().object_id();
                    let result1 = await op_env.insert_with_key(my_path, common_1.RandomGenerator.string(10), obj_id1);
                    console.info(JSON.stringify(result1));
                    assert_1.default.ok(!result1.err);
                }
                let save_update = await op_env.update();
                console.info(JSON.stringify(save_update));
                assert_1.default.ok(!save_update.err);
                let save = await op_env.commit();
                console.info(JSON.stringify(save));
                assert_1.default.ok(!save.err);
            });
            describe("#### get_object_by_path 接口", async () => {
                it("接口调用正常流程", async () => {
                    let result = await stack.local_cache_accessor_stub().get_object_by_path(my_path);
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
            describe("#### list 接口", async () => {
                it("接口调用正常流程", async () => {
                    let result = await stack.local_cache_accessor_stub().list(my_path, 0, 5);
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
        });
        describe("#### Set数据获取", async () => {
            let op_env;
            let my_path = `/qaTest/access/${common_1.RandomGenerator.string(10)}`;
            mocha_1.before(async () => {
                let result = await stack.root_state_stub().create_path_op_env();
                assert_1.default.ok(!result.err);
                op_env = result.unwrap();
                for (let i = 0; i < 10; i++) {
                    let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id1 = obj1.desc().object_id();
                    let result1 = await op_env.insert(my_path, obj_id1);
                    console.info(JSON.stringify(result1));
                    assert_1.default.ok(!result1.err);
                }
                let save_update = await op_env.update();
                console.info(JSON.stringify(save_update));
                assert_1.default.ok(!save_update.err);
                let save = await op_env.commit();
                console.info(JSON.stringify(save));
                assert_1.default.ok(!save.err);
            });
            describe("#### get_object_by_path 接口", async () => {
                it("接口调用正常流程", async () => {
                    let result = await stack.local_cache_accessor_stub().get_object_by_path(my_path);
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
            describe("#### list 接口", async () => {
                it("接口调用正常流程", async () => {
                    let result = await stack.local_cache_accessor_stub().list(my_path, 0, 5);
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
        });
    });
});
