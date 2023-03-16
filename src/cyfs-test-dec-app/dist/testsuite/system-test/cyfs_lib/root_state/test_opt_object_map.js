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
let zone1_ood_id;
let zone1_ood_stack;
let zone1_device1_stack;
let zone1_device2_stack;
let zone2_ood_stack;
let zone2_device1_stack;
let zone2_device2_stack;
// npx mocha .\test_opt_object_map.ts --reporter mochawesome --require ts-node/register
describe("#op-env 操作object_map", function () {
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
    describe("##PathOpEnvStub", async () => {
        describe("### Map相关接口操作", async () => {
            let op_env;
            let sid;
            mocha_1.before(async () => {
                let result = await stack.root_state_stub().create_path_op_env();
                assert_1.default.ok(!result.err);
                op_env = result.unwrap();
            });
            after(async () => {
            });
            let insert_key = `ABC${common_1.RandomGenerator.string(10)}`;
            let insert_path = `/qaTest/path/A`;
            describe("#### insert_with_key 接口", async () => {
                it("正常流程", async () => {
                    let obj = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id = obj.desc().object_id();
                    let result = await op_env.insert_with_key(insert_path, insert_key, obj_id);
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
            let set_path = "/qaTest/pathsds";
            describe("#### set_with_key 接口", async () => {
                it("正常流程", async () => {
                    let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id1 = obj1.desc().object_id();
                    let obj2 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `B${common_1.RandomGenerator.string(10)}`, `B${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id2 = obj2.desc().object_id();
                    let path = set_path;
                    let key = `dsa${common_1.RandomGenerator.string(10)}`;
                    set_path = set_path + `/${key}`;
                    let result = await op_env.set_with_key(path, key, obj_id1, obj_id2, true);
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
            let remove_path = "/qaTest/path/";
            describe("#### remove_with_key 接口", async () => {
                it("正常流程", async () => {
                    let obj = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id = obj.desc().object_id();
                    let insert_key = `abc${common_1.RandomGenerator.string(10)}`;
                    let insert_path = "/qaTest/path/" + common_1.RandomGenerator.string(10);
                    let result = await op_env.insert_with_key(insert_path, insert_key, obj_id);
                    console.info("insert_path1", insert_path);
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                    let result2 = await op_env.remove_with_key(insert_path, insert_key, obj_id);
                    console.info(JSON.stringify(result2));
                    assert_1.default.ok(!result2.err);
                });
            });
            describe("#### get_by_key 接口", async () => {
                it("正常流程", async () => {
                    console.info("insert_path2", insert_path);
                    let result = await op_env.get_by_key(insert_path, insert_key);
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
            describe("#### update 操作记录", async () => {
                it("正常流程", async () => {
                    let result = await op_env.update();
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
            describe("#### commit 操作记录", async () => {
                it("正常流程", async () => {
                    let result = await op_env.commit();
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
            describe("#### get_by_path 检查操作结果", async () => {
                it("正常流程", async () => {
                    let result1 = await stack.root_state_stub().create_path_op_env();
                    assert_1.default.ok(!result1.err);
                    op_env = result1.unwrap();
                    let result = await op_env.get_by_path(`${insert_path}/${insert_key}`);
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                    let result2 = await op_env.commit();
                    console.info(JSON.stringify(result2));
                    assert_1.default.ok(!result2.err);
                });
            });
        });
        describe("### Set相关接口操作", async () => {
            let op_env;
            let sid;
            mocha_1.before(async () => {
                let result = await stack.root_state_stub().create_path_op_env();
                assert_1.default.ok(!result.err);
                op_env = result.unwrap();
            });
            after(async () => {
            });
            let set_path = `/qaTest/set${common_1.RandomGenerator.string(10)}`;
            let insert_obj;
            describe("#### insert 接口", async () => {
                it("正常流程", async () => {
                    let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id1 = obj1.desc().object_id();
                    insert_obj = obj_id1;
                    let result = await op_env.insert(set_path, obj_id1);
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
            describe("#### remove 接口", async () => {
                it("正常流程", async () => {
                    let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id1 = obj1.desc().object_id();
                    let result = await op_env.insert(set_path, obj_id1);
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                    let result2 = await op_env.remove(set_path, obj_id1);
                    console.info(JSON.stringify(result2));
                    assert_1.default.ok(!result2.err);
                });
            });
            describe("#### contains 接口", async () => {
                it("正常流程", async () => {
                    let result2 = await op_env.contains(set_path, insert_obj);
                    console.info(JSON.stringify(result2));
                    assert_1.default.ok(!result2.err);
                });
            });
            describe("#### update 操作记录", async () => {
                it("正常流程", async () => {
                    let result = await op_env.update();
                    console.info("update", JSON.stringify(result));
                    let result1 = await op_env.get_current_root();
                    console.info("get_current_root", JSON.stringify(result1));
                    assert_1.default.ok(!result.err);
                });
            });
            describe("#### get_by_path 检查操作结果", async () => {
                it("正常流程", async () => {
                    let result1 = await stack.root_state_stub().create_path_op_env();
                    assert_1.default.ok(result1.err);
                    let result = await op_env.get_by_path(set_path);
                    console.info("get_by_path", JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
            describe("#### update 操作记录", async () => {
                it("正常流程", async () => {
                    let result = await op_env.update();
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
            describe("#### commit 操作记录", async () => {
                it("正常流程", async () => {
                    let result = await op_env.commit();
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
            describe("#### get_by_path 检查操作结果", async () => {
                it("正常流程", async () => {
                    let result1 = await stack.root_state_stub().create_path_op_env();
                    assert_1.default.ok(!result1.err);
                    op_env = result1.unwrap();
                    let result = await op_env.get_by_path(set_path);
                    console.info("get_by_path", JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                    let result2 = await op_env.commit();
                    console.info(JSON.stringify(result2));
                    assert_1.default.ok(!result2.err);
                });
            });
        });
        describe("### 通过path操作object_map", async () => {
            let op_env;
            let sid;
            mocha_1.before(async () => {
                let result = await stack.root_state_stub().create_path_op_env();
                assert_1.default.ok(!result.err);
                op_env = result.unwrap();
            });
            let insert_path = `/qaTest/pathopt${common_1.RandomGenerator.string(10)}`;
            describe("#### insert_with_path 接口", async () => {
                it("正常流程", async () => {
                    let obj = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id = obj.desc().object_id();
                    let result = await op_env.insert_with_path(insert_path, obj_id);
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
            describe("#### set_with_path 接口", async () => {
                it("正常流程", async () => {
                    let set_path = `/qaTest/pathoptsa${common_1.RandomGenerator.string(10)}`;
                    let obj = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id = obj.desc().object_id();
                    let result = await op_env.insert_with_path(set_path, obj_id);
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                    let result2 = await op_env.set_with_path(set_path, obj_id, obj_id, true);
                    console.info(JSON.stringify(result2));
                    assert_1.default.ok(!result2.err);
                });
            });
            describe("#### remove_with_path 接口", async () => {
                it("正常流程", async () => {
                    let set_path = `/qaTest/pathopfstsa${common_1.RandomGenerator.string(10)}`;
                    let obj = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id = obj.desc().object_id();
                    let result = await op_env.insert_with_path(set_path, obj_id);
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                    let result2 = await op_env.remove_with_path(set_path, obj_id);
                    console.info(JSON.stringify(result2));
                    assert_1.default.ok(!result2.err);
                });
            });
            describe("#### get_by_path 接口", async () => {
                it("正常流程", async () => {
                    let result = await op_env.get_by_path(insert_path);
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
            describe("#### update 操作记录", async () => {
                it("正常流程", async () => {
                    let result = await op_env.update();
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
            describe("#### commit 操作记录", async () => {
                it("正常流程", async () => {
                    let result = await op_env.commit();
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
        });
    });
    describe("##SingleOpEnvStub", async () => {
        describe("### Map相关接口操作", async () => {
            let op_env;
            let sid;
            mocha_1.before(async () => {
                let result = await stack.root_state_stub().create_single_op_env();
                assert_1.default.ok(!result.err);
                op_env = result.unwrap();
                let create = await op_env.create_new(cyfs.ObjectMapSimpleContentType.Map);
                assert_1.default.ok(!create.err);
            });
            after(async () => {
            });
            let insert_key = `ABC${common_1.RandomGenerator.string(10)}`;
            describe("#### insert_with_key 接口", async () => {
                it("正常流程", async () => {
                    let obj = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id = obj.desc().object_id();
                    let result = await op_env.insert_with_key(insert_key, obj_id);
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
            describe("#### set_with_key 接口", async () => {
                it("正常流程", async () => {
                    let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id1 = obj1.desc().object_id();
                    let obj2 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `B${common_1.RandomGenerator.string(10)}`, `B${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id2 = obj2.desc().object_id();
                    let key = `dsa${common_1.RandomGenerator.string(10)}`;
                    let result = await op_env.set_with_key(key, obj_id1, obj_id2, true);
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
            let remove_path = "/qaTest/path/";
            describe("#### remove_with_key 接口", async () => {
                it("正常流程", async () => {
                    let obj = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id = obj.desc().object_id();
                    let key = `abc${common_1.RandomGenerator.string(10)}`;
                    let result = await op_env.insert_with_key(key, obj_id);
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                    let result2 = await op_env.remove_with_key(key, obj_id);
                    console.info(JSON.stringify(result2));
                    assert_1.default.ok(!result2.err);
                });
            });
            describe("#### get_by_key 接口", async () => {
                it("正常流程", async () => {
                    let result = await op_env.get_by_key(insert_key);
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
            describe("#### update 操作记录", async () => {
                it("正常流程", async () => {
                    let result = await op_env.update();
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
            describe("#### commit 操作记录", async () => {
                it("正常流程", async () => {
                    let result = await op_env.commit();
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
        });
        describe("### Set相关接口操作", async () => {
            let op_env;
            let sid;
            mocha_1.before(async () => {
                let result = await stack.root_state_stub().create_single_op_env();
                assert_1.default.ok(!result.err);
                op_env = result.unwrap();
                let create = await op_env.create_new(cyfs.ObjectMapSimpleContentType.Set);
                assert_1.default.ok(!create.err);
            });
            after(async () => {
            });
            let insert_obj;
            describe("#### insert 接口", async () => {
                it("正常流程", async () => {
                    let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id1 = obj1.desc().object_id();
                    insert_obj = obj_id1;
                    let result = await op_env.insert(obj_id1);
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
            describe("#### remove 接口", async () => {
                it("正常流程", async () => {
                    let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id1 = obj1.desc().object_id();
                    let result = await op_env.insert(obj_id1);
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                    let result2 = await op_env.remove(obj_id1);
                    console.info(JSON.stringify(result2));
                    assert_1.default.ok(!result2.err);
                });
            });
            describe("#### contains 接口", async () => {
                it("正常流程", async () => {
                    let result2 = await op_env.contains(insert_obj);
                    console.info(JSON.stringify(result2));
                    assert_1.default.ok(!result2.err);
                });
            });
            describe("#### update 操作记录", async () => {
                it("正常流程", async () => {
                    let result = await op_env.update();
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
            describe("#### commit 操作记录", async () => {
                it("正常流程", async () => {
                    let result = await op_env.commit();
                    console.info(JSON.stringify(result));
                    assert_1.default.ok(!result.err);
                });
            });
        });
        describe("### load() 加载object_map", async () => {
            let op_env;
            let obj_map_root;
            let obj_map_dec;
            mocha_1.before(async () => {
                let result = await stack.root_state_stub().create_single_op_env();
                assert_1.default.ok(!result.err);
                op_env = result.unwrap();
                let create = await op_env.create_new(cyfs.ObjectMapSimpleContentType.Set);
                assert_1.default.ok(!create.err);
                let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                let obj_id1 = obj1.desc().object_id();
                let result1 = await op_env.insert(obj_id1);
                console.info(JSON.stringify(result1));
                assert_1.default.ok(!result1.err);
                let result3 = await op_env.commit();
                console.info(JSON.stringify(result3));
                assert_1.default.ok(!result3.err);
                obj_map_root = result3.unwrap().root;
                obj_map_dec = result3.unwrap().dec_root;
            });
            after(async () => {
            });
            it("正常调用流程 obj_map_root 加载", async () => {
                let result = await stack.root_state_stub().create_single_op_env();
                assert_1.default.ok(!result.err);
                op_env = result.unwrap();
                let result2 = await op_env.load(obj_map_root);
                console.info(JSON.stringify(result2));
                assert_1.default.ok(!result2.err);
                let result3 = await op_env.commit();
                console.info(JSON.stringify(result3));
                assert_1.default.ok(!result3.err);
            });
            it("正常调用流程 obj_map dec_root 加载", async () => {
                let result = await stack.root_state_stub().create_single_op_env();
                assert_1.default.ok(!result.err);
                op_env = result.unwrap();
                let result2 = await op_env.load(obj_map_dec);
                console.info(JSON.stringify(result2));
                assert_1.default.ok(!result2.err);
                let result3 = await op_env.commit();
                console.info(JSON.stringify(result3));
                assert_1.default.ok(!result3.err);
            });
        });
        describe("### load_by_path() 加载object_map", async () => {
            let op_env;
            let sid;
            mocha_1.before(async () => {
                let result = await stack.root_state_stub().create_single_op_env();
                assert_1.default.ok(!result.err);
                op_env = result.unwrap();
                let create = await op_env.create_new(cyfs.ObjectMapSimpleContentType.Set);
                assert_1.default.ok(!create.err);
                let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                let obj_id1 = obj1.desc().object_id();
                let result1 = await op_env.insert(obj_id1);
                console.info(JSON.stringify(result1));
                assert_1.default.ok(!result1.err);
                let result3 = await op_env.commit();
                console.info(JSON.stringify(result3));
                assert_1.default.ok(!result3.err);
            });
            after(async () => {
            });
            it("正常调用流程", async () => {
                let result = await stack.root_state_stub().create_single_op_env();
                assert_1.default.ok(!result.err);
                op_env = result.unwrap();
                let result2 = await op_env.load_by_path(`/qaTest/path/A`);
                console.info(JSON.stringify(result2));
                assert_1.default.ok(!result2.err);
                let result3 = await op_env.commit();
                console.info(JSON.stringify(result3));
                assert_1.default.ok(!result3.err);
            });
        });
        describe("### next遍历object_map", async () => {
            let op_env;
            let sid;
            mocha_1.before(async () => {
                let result = await stack.root_state_stub().create_single_op_env();
                assert_1.default.ok(!result.err);
                op_env = result.unwrap();
                let create = await op_env.create_new(cyfs.ObjectMapSimpleContentType.Set);
                assert_1.default.ok(!create.err);
                for (let i = 0; i < 10; i++) {
                    let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id1 = obj1.desc().object_id();
                    let result1 = await op_env.insert(obj_id1);
                    console.info(JSON.stringify(result1));
                    assert_1.default.ok(!result1.err);
                }
            });
            after(async () => {
                let result3 = await op_env.commit();
                console.info(JSON.stringify(result3));
                assert_1.default.ok(!result3.err);
            });
            it("next遍历object_map 正常调用流程", async () => {
                for (let i = 0; i < 10; i++) {
                    let result = await op_env.next(i);
                    console.info(JSON.stringify(result));
                }
            });
        });
        describe("### metadata 遍历object_map", async () => {
            let op_env;
            let sid;
            mocha_1.before(async () => {
                let result = await stack.root_state_stub().create_single_op_env();
                assert_1.default.ok(!result.err);
                op_env = result.unwrap();
                let create = await op_env.create_new(cyfs.ObjectMapSimpleContentType.Set);
                assert_1.default.ok(!create.err);
                for (let i = 0; i < 10; i++) {
                    let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id1 = obj1.desc().object_id();
                    let result1 = await op_env.insert(obj_id1);
                    console.info(JSON.stringify(result1));
                    assert_1.default.ok(!result1.err);
                }
            });
            after(async () => {
                let result3 = await op_env.commit();
                console.info(JSON.stringify(result3));
                assert_1.default.ok(!result3.err);
            });
            it("metadata遍历object_map 正常调用流程", async () => {
                let result = await op_env.metadata();
                console.info(JSON.stringify(result));
                assert_1.default.ok(!result.err);
            });
        });
    });
    describe("##Local_cache/root_state区别", async () => {
        describe("###Local_cache 操作runtime", async () => {
            it("创建object_map操作数据流程", async () => {
                let result = await stack.local_cache_stub().create_single_op_env();
                assert_1.default.ok(!result.err);
                let op_env = result.unwrap();
                let create = await op_env.create_new(cyfs.ObjectMapSimpleContentType.Set);
                assert_1.default.ok(!create.err);
                let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                let obj_id1 = obj1.desc().object_id();
                let result1 = await op_env.insert(obj_id1);
                console.info(JSON.stringify(result1));
                assert_1.default.ok(!result1.err);
                let result3 = await op_env.commit();
                console.info(JSON.stringify(result3));
                assert_1.default.ok(!result3.err);
            });
        });
        describe("###Local_cache 操作主OOD", async () => {
            it("创建object_map操作数据流程", async () => {
                let result = await stack.local_cache_stub(zone1_ood_id).create_single_op_env();
                assert_1.default.ok(!result.err);
                let op_env = result.unwrap();
                let create = await op_env.create_new(cyfs.ObjectMapSimpleContentType.Set);
                assert_1.default.ok(!create.err);
                let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                let obj_id1 = obj1.desc().object_id();
                let result1 = await op_env.insert(obj_id1);
                console.info(JSON.stringify(result1));
                assert_1.default.ok(!result1.err);
                let result3 = await op_env.commit();
                console.info(JSON.stringify(result3));
                assert_1.default.ok(!result3.err);
            });
        });
        describe("###Local_cache 操作从OOD", async () => {
            it("创建object_map操作数据流程", async () => {
                let result = await stack.local_cache_stub(zone1_ood_id).create_single_op_env();
                assert_1.default.ok(!result.err);
                let op_env = result.unwrap();
                let create = await op_env.create_new(cyfs.ObjectMapSimpleContentType.Set);
                assert_1.default.ok(!create.err);
                let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                let obj_id1 = obj1.desc().object_id();
                let result1 = await op_env.insert(obj_id1);
                console.info(JSON.stringify(result1));
                assert_1.default.ok(!result1.err);
                let result3 = await op_env.commit();
                console.info(JSON.stringify(result3));
                assert_1.default.ok(!result3.err);
            });
        });
        describe("###root_state 操作runtime", async () => {
            it("创建object_map操作数据流程", async () => {
                let result = await stack.root_state_stub().create_single_op_env();
                assert_1.default.ok(!result.err);
                let op_env = result.unwrap();
                let create = await op_env.create_new(cyfs.ObjectMapSimpleContentType.Set);
                assert_1.default.ok(!create.err);
                let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                let obj_id1 = obj1.desc().object_id();
                let result1 = await op_env.insert(obj_id1);
                console.info(JSON.stringify(result1));
                assert_1.default.ok(!result1.err);
                let result3 = await op_env.commit();
                console.info(JSON.stringify(result3));
                assert_1.default.ok(!result3.err);
            });
        });
        describe("###root_state 操作主OOD", async () => {
            it("创建object_map操作数据流程", async () => {
                let result = await stack.root_state_stub(zone1_ood_id).create_single_op_env();
                assert_1.default.ok(!result.err);
                let op_env = result.unwrap();
                let create = await op_env.create_new(cyfs.ObjectMapSimpleContentType.Set);
                assert_1.default.ok(!create.err);
                let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                let obj_id1 = obj1.desc().object_id();
                let result1 = await op_env.insert(obj_id1);
                console.info(JSON.stringify(result1));
                assert_1.default.ok(!result1.err);
                let result3 = await op_env.commit();
                console.info(JSON.stringify(result3));
                assert_1.default.ok(!result3.err);
            });
        });
        describe("###root_state 操作从OOD", async () => {
            it("创建object_map操作数据流程", async () => {
                let result = await stack.root_state_stub(zone1_ood_id).create_single_op_env();
                assert_1.default.ok(!result.err);
                let op_env = result.unwrap();
                let create = await op_env.create_new(cyfs.ObjectMapSimpleContentType.Set);
                assert_1.default.ok(!create.err);
                let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                let obj_id1 = obj1.desc().object_id();
                let result1 = await op_env.insert(obj_id1);
                console.info(JSON.stringify(result1));
                assert_1.default.ok(!result1.err);
                let result3 = await op_env.commit();
                console.info(JSON.stringify(result3));
                assert_1.default.ok(!result3.err);
            });
        });
    });
    describe("##targrt路由权限控制", async () => {
        describe("### runtime发起操作", async () => {
            describe("### runtime发起操作本地", async () => {
                it("基本业务流程", async () => {
                    let result = await stack.root_state_stub(zone1_device1_stack.local_device_id().object_id).create_single_op_env();
                    assert_1.default.ok(!result.err);
                    let op_env = result.unwrap();
                    let create = await op_env.create_new(cyfs.ObjectMapSimpleContentType.Set);
                    assert_1.default.ok(!create.err);
                    let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id1 = obj1.desc().object_id();
                    let result1 = await op_env.insert(obj_id1);
                    console.info(JSON.stringify(result1));
                    assert_1.default.ok(!result1.err);
                    let result3 = await op_env.commit();
                    console.info(JSON.stringify(result3));
                    assert_1.default.ok(!result3.err);
                });
            });
            describe("### runtime发起操作主OOD", async () => {
                it("基本业务流程", async () => {
                    let result = await stack.root_state_stub(zone1_ood_id).create_single_op_env();
                    assert_1.default.ok(!result.err);
                    let op_env = result.unwrap();
                    let create = await op_env.create_new(cyfs.ObjectMapSimpleContentType.Set);
                    assert_1.default.ok(!create.err);
                    let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id1 = obj1.desc().object_id();
                    let result1 = await op_env.insert(obj_id1);
                    console.info(JSON.stringify(result1));
                    assert_1.default.ok(!result1.err);
                    let result3 = await op_env.commit();
                    console.info(JSON.stringify(result3));
                    assert_1.default.ok(!result3.err);
                });
            });
            describe("### runtime发起操作从OOD", async () => {
                it("基本业务流程", async () => {
                    let result = await stack.root_state_stub(zone1_ood_id).create_single_op_env();
                    assert_1.default.ok(!result.err);
                    let op_env = result.unwrap();
                    let create = await op_env.create_new(cyfs.ObjectMapSimpleContentType.Set);
                    assert_1.default.ok(!create.err);
                    let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id1 = obj1.desc().object_id();
                    let result1 = await op_env.insert(obj_id1);
                    console.info(JSON.stringify(result1));
                    assert_1.default.ok(!result1.err);
                    let result3 = await op_env.commit();
                    console.info(JSON.stringify(result3));
                    assert_1.default.ok(!result3.err);
                });
            });
            describe("### runtime发起操作从device", async () => {
                it("基本业务流程", async () => {
                    let result = await stack.root_state_stub(zone1_device2_stack.local_device_id().object_id).create_single_op_env();
                    assert_1.default.ok(!result.err);
                    let op_env = result.unwrap();
                    let create = await op_env.create_new(cyfs.ObjectMapSimpleContentType.Set);
                    assert_1.default.ok(!create.err);
                    let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id1 = obj1.desc().object_id();
                    let result1 = await op_env.insert(obj_id1);
                    console.info(JSON.stringify(result1));
                    assert_1.default.ok(!result1.err);
                    let result3 = await op_env.commit();
                    console.info(JSON.stringify(result3));
                    assert_1.default.ok(!result3.err);
                });
            });
            describe("### runtime发起操作从跨zone", async () => {
                it("基本业务流程", async () => {
                    let result = await zone1_device1_stack.root_state_stub(zone2_device1_stack.local_device_id().object_id).create_single_op_env();
                    assert_1.default.ok(result.err);
                    // let op_env = result.unwrap();
                    // let create = await op_env.create_new(cyfs.ObjectMapSimpleContentType.Set)
                    // assert.ok(!create.err);
                    // let obj1  = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                    // let obj_id1 = obj1.desc().object_id();
                    // let result1 = await op_env.insert(obj_id1);
                    // console.info(JSON.stringify(result1))
                    // assert.ok(!result1.err)
                    // let result3 =  await op_env.commit();
                    // console.info(JSON.stringify(result3))
                    // assert.ok(!result3.err)
                });
            });
        });
        describe("### 主OOD 发起操作", async () => {
            describe("### 主OOD发起操作本地", async () => {
                it("基本业务流程", async () => {
                    let result = await zone1_ood_stack.root_state_stub(zone1_ood_id).create_single_op_env();
                    assert_1.default.ok(!result.err);
                    let op_env = result.unwrap();
                    let create = await op_env.create_new(cyfs.ObjectMapSimpleContentType.Set);
                    assert_1.default.ok(!create.err);
                    let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id1 = obj1.desc().object_id();
                    let result1 = await op_env.insert(obj_id1);
                    console.info(JSON.stringify(result1));
                    assert_1.default.ok(!result1.err);
                    let result3 = await op_env.commit();
                    console.info(JSON.stringify(result3));
                    assert_1.default.ok(!result3.err);
                });
            });
            describe("### 主OOD发起操作主OOD", async () => {
                it("基本业务流程", async () => {
                    let result = await zone1_ood_stack.root_state_stub(zone1_ood_id).create_single_op_env();
                    assert_1.default.ok(!result.err);
                    let op_env = result.unwrap();
                    let create = await op_env.create_new(cyfs.ObjectMapSimpleContentType.Set);
                    assert_1.default.ok(!create.err);
                    let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id1 = obj1.desc().object_id();
                    let result1 = await op_env.insert(obj_id1);
                    console.info(JSON.stringify(result1));
                    assert_1.default.ok(!result1.err);
                    let result3 = await op_env.commit();
                    console.info(JSON.stringify(result3));
                    assert_1.default.ok(!result3.err);
                });
            });
            describe("### 主OOD发起操作从OOD", async () => {
                it("基本业务流程", async () => {
                    let result = await zone1_ood_stack.root_state_stub(zone1_ood_id).create_single_op_env();
                    assert_1.default.ok(!result.err);
                    let op_env = result.unwrap();
                    let create = await op_env.create_new(cyfs.ObjectMapSimpleContentType.Set);
                    assert_1.default.ok(!create.err);
                    let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id1 = obj1.desc().object_id();
                    let result1 = await op_env.insert(obj_id1);
                    console.info(JSON.stringify(result1));
                    assert_1.default.ok(!result1.err);
                    let result3 = await op_env.commit();
                    console.info(JSON.stringify(result3));
                    assert_1.default.ok(!result3.err);
                });
            });
            describe("### 主OOD发起操作从device", async () => {
                it("基本业务流程", async () => {
                    let result = await zone1_ood_stack.root_state_stub(zone1_device1_stack.local_device_id().object_id).create_single_op_env();
                    assert_1.default.ok(!result.err);
                    let op_env = result.unwrap();
                    let create = await op_env.create_new(cyfs.ObjectMapSimpleContentType.Set);
                    assert_1.default.ok(!create.err);
                    let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id1 = obj1.desc().object_id();
                    let result1 = await op_env.insert(obj_id1);
                    console.info(JSON.stringify(result1));
                    assert_1.default.ok(!result1.err);
                    let result3 = await op_env.commit();
                    console.info(JSON.stringify(result3));
                    assert_1.default.ok(!result3.err);
                });
            });
            describe("### 主OOD发起操作从跨zone", async () => {
                it("基本业务流程", async () => {
                    let result = await zone1_ood_stack.root_state_stub(zone2_device1_stack.local_device_id().object_id).create_single_op_env();
                    assert_1.default.ok(result.err);
                    // let op_env = result.unwrap();
                    // let create = await op_env.create_new(cyfs.ObjectMapSimpleContentType.Set)
                    // assert.ok(!create.err);
                    // let obj1  = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                    // let obj_id1 = obj1.desc().object_id();
                    // let result1 = await op_env.insert(obj_id1);
                    // console.info(JSON.stringify(result1))
                    // assert.ok(!result1.err)
                    // let result3 =  await op_env.commit();
                    // console.info(JSON.stringify(result3))
                    // assert.ok(!result3.err)
                });
            });
        });
        describe("### 从OOD 发起操作", async () => {
            describe("### 主OOD发起操作本地", async () => {
                it("基本业务流程", async () => {
                    let result = await zone1_ood_stack.root_state_stub(zone1_ood_id).create_single_op_env();
                    assert_1.default.ok(!result.err);
                    let op_env = result.unwrap();
                    let create = await op_env.create_new(cyfs.ObjectMapSimpleContentType.Set);
                    assert_1.default.ok(!create.err);
                    let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id1 = obj1.desc().object_id();
                    let result1 = await op_env.insert(obj_id1);
                    console.info(JSON.stringify(result1));
                    assert_1.default.ok(!result1.err);
                    let result3 = await op_env.commit();
                    console.info(JSON.stringify(result3));
                    assert_1.default.ok(!result3.err);
                });
            });
            describe("### 主OOD发起操作主OOD", async () => {
                it("基本业务流程", async () => {
                    let result = await zone1_ood_stack.root_state_stub(zone1_ood_id).create_single_op_env();
                    assert_1.default.ok(!result.err);
                    let op_env = result.unwrap();
                    let create = await op_env.create_new(cyfs.ObjectMapSimpleContentType.Set);
                    assert_1.default.ok(!create.err);
                    let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id1 = obj1.desc().object_id();
                    let result1 = await op_env.insert(obj_id1);
                    console.info(JSON.stringify(result1));
                    assert_1.default.ok(!result1.err);
                    let result3 = await op_env.commit();
                    console.info(JSON.stringify(result3));
                    assert_1.default.ok(!result3.err);
                });
            });
            describe("### 主OOD发起操作从OOD", async () => {
                it("基本业务流程", async () => {
                    let result = await zone1_ood_stack.root_state_stub(zone1_ood_id).create_single_op_env();
                    assert_1.default.ok(!result.err);
                    let op_env = result.unwrap();
                    let create = await op_env.create_new(cyfs.ObjectMapSimpleContentType.Set);
                    assert_1.default.ok(!create.err);
                    let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id1 = obj1.desc().object_id();
                    let result1 = await op_env.insert(obj_id1);
                    console.info(JSON.stringify(result1));
                    assert_1.default.ok(!result1.err);
                    let result3 = await op_env.commit();
                    console.info(JSON.stringify(result3));
                    assert_1.default.ok(!result3.err);
                });
            });
            describe("### 主OOD发起操作从device", async () => {
                it("基本业务流程", async () => {
                    let result = await zone1_ood_stack.root_state_stub(zone1_device1_stack.local_device_id().object_id).create_single_op_env();
                    assert_1.default.ok(!result.err);
                    let op_env = result.unwrap();
                    let create = await op_env.create_new(cyfs.ObjectMapSimpleContentType.Set);
                    assert_1.default.ok(!create.err);
                    let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id1 = obj1.desc().object_id();
                    let result1 = await op_env.insert(obj_id1);
                    console.info(JSON.stringify(result1));
                    assert_1.default.ok(!result1.err);
                    let result3 = await op_env.commit();
                    console.info(JSON.stringify(result3));
                    assert_1.default.ok(!result3.err);
                });
            });
            describe("### 主OOD发起操作从跨zone", async () => {
                it("基本业务流程", async () => {
                    let result = await zone1_ood_stack.root_state_stub(zone2_device1_stack.local_device_id().object_id).create_single_op_env();
                    assert_1.default.ok(!result.err);
                    let op_env = result.unwrap();
                    let create = await op_env.create_new(cyfs.ObjectMapSimpleContentType.Set);
                    assert_1.default.ok(!create.err);
                    let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                    let obj_id1 = obj1.desc().object_id();
                    let result1 = await op_env.insert(obj_id1);
                    console.info(JSON.stringify(result1));
                    assert_1.default.ok(!result1.err);
                    let result3 = await op_env.commit();
                    console.info(JSON.stringify(result3));
                    assert_1.default.ok(result3.err);
                });
            });
        });
    });
    describe("##事务机制", async () => {
        describe("### 事务执行之前object_map 数据校验", async () => {
            it("基本业务流程", async () => {
                let obj_id1;
                let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                obj_id1 = obj1.desc().object_id();
                let process1 = new Promise(async (V) => {
                    let result = await zone1_ood_stack.root_state_stub(zone1_ood_id).create_single_op_env();
                    assert_1.default.ok(!result.err);
                    let op_env = result.unwrap();
                    let create = await op_env.create_new(cyfs.ObjectMapSimpleContentType.Set);
                    assert_1.default.ok(!create.err);
                    let result1 = await op_env.insert(obj_id1);
                    console.info(JSON.stringify(result1));
                    assert_1.default.ok(!result1.err);
                    let result3 = await op_env.commit();
                    console.info(JSON.stringify(result3));
                    assert_1.default.ok(!result3.err);
                    V("commit ");
                });
                let result = await zone1_ood_stack.root_state_stub(zone1_ood_id).create_single_op_env();
                assert_1.default.ok(!result.err);
                let op_env = result.unwrap();
                let check = await op_env.contains(obj_id1);
                assert_1.default.ok(check.err);
                await process1;
            });
        });
        describe("### commit后object_map 数据校验", async () => {
            it("基本业务流程", async () => {
                let obj_id1;
                let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                obj_id1 = obj1.desc().object_id();
                let path = `/qatest/${common_1.RandomGenerator.string(15)}`;
                let key = common_1.RandomGenerator.string(15);
                let process1 = new Promise(async (V) => {
                    let result = await zone1_ood_stack.root_state_stub(zone1_ood_id).create_path_op_env();
                    assert_1.default.ok(!result.err);
                    let op_env = result.unwrap();
                    let result1 = await op_env.insert_with_key(path, key, obj_id1);
                    console.info(JSON.stringify(result1));
                    assert_1.default.ok(!result1.err);
                    let result3 = await op_env.commit();
                    console.info(JSON.stringify(result3));
                    assert_1.default.ok(!result3.err);
                    V("commit ");
                });
                await process1;
                let result = await zone1_ood_stack.root_state_stub(zone1_ood_id).create_path_op_env();
                console.info(result);
                assert_1.default.ok(!result.err);
                let op_env = result.unwrap();
                let check = await op_env.get_by_key(path, key);
                console.info(JSON.stringify(check));
                assert_1.default.ok(!check.err);
            });
        });
        describe("### abort后object_map 数据校验", async () => {
            it("基本业务流程", async () => {
                let obj_id1;
                let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                obj_id1 = obj1.desc().object_id();
                let process1 = new Promise(async (V) => {
                    let result = await zone1_ood_stack.root_state_stub(zone1_ood_id).create_single_op_env();
                    assert_1.default.ok(!result.err);
                    let op_env = result.unwrap();
                    let create = await op_env.create_new(cyfs.ObjectMapSimpleContentType.Set);
                    assert_1.default.ok(!create.err);
                    let result1 = await op_env.insert(obj_id1);
                    console.info(JSON.stringify(result1));
                    assert_1.default.ok(!result1.err);
                    let result3 = await op_env.abort();
                    console.info(JSON.stringify(result3));
                    assert_1.default.ok(!result3.err);
                    V("commit ");
                });
                await process1;
                let result = await zone1_ood_stack.root_state_stub(zone1_ood_id).create_single_op_env();
                assert_1.default.ok(!result.err);
                let op_env = result.unwrap();
                let check = await op_env.contains(obj_id1);
                assert_1.default.ok(check.err);
            });
        });
    });
    describe("##lock机制", async () => {
        describe("### 乐观锁lock机制", async () => {
            describe("### 乐观锁lock机制功能流程 - 父path校验", async () => {
                it("业务流程测试", async () => {
                    // 父path
                    let pathA = `/qatest/${common_1.RandomGenerator.string(10)}`;
                    // path
                    let pathB = pathA + `/${common_1.RandomGenerator.string(10)}`;
                    // 兄弟path
                    let pathB1 = pathA + `/${common_1.RandomGenerator.string(10)}`;
                    // 子path
                    let pathC = pathB + `/${common_1.RandomGenerator.string(10)}`;
                    // 进程1发起操作
                    let process1 = new Promise(async (V) => {
                        // mocha 本身不支持 异步函数中 error 捕获，使用try catch 捕获
                        try {
                            let key = common_1.RandomGenerator.string(10);
                            let obj_id1;
                            let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                            obj_id1 = obj1.desc().object_id();
                            // 初始化 op_env
                            let result = await zone1_ood_stack.root_state_stub(zone1_ood_id).create_path_op_env();
                            console.info(`####### process1 init:${JSON.stringify(result)}`);
                            assert_1.default.ok(!result.err);
                            let op_env = result.unwrap();
                            // 对 object_map 添加锁
                            let lock_rs = await op_env.lock([pathB], cyfs.JSBI.BigInt(0));
                            console.info(`####### process1 lock:${JSON.stringify(lock_rs)}`);
                            assert_1.default.ok(!lock_rs.err);
                            // 业务操作
                            let result1 = await op_env.insert_with_key(pathB, key, obj_id1);
                            console.info(`####### process1 insert:${JSON.stringify(result1)}}`);
                            assert_1.default.ok(!result1.err);
                            // 模拟业务处理时间 15s
                            await cyfs.sleep(15 * 1000);
                            // 提交object_map 操作事务
                            let result3 = await op_env.commit();
                            console.info(`####### process1 commit:${JSON.stringify(result3)}`);
                            assert_1.default.ok(!result3.err);
                        }
                        catch (error) {
                            V({ err: true, log: `${JSON.stringify(error)}`, time: Date.now() });
                        }
                        V({ err: false, log: "run sucesss", time: Date.now() });
                    });
                    // 进程2发起操作
                    await cyfs.sleep(2 * 1000);
                    let process2 = new Promise(async (V) => {
                        try {
                            let key = common_1.RandomGenerator.string(10);
                            let obj_id1;
                            let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                            obj_id1 = obj1.desc().object_id();
                            // 初始化 op_env
                            let result = await zone1_ood_stack.root_state_stub(zone1_ood_id).create_path_op_env();
                            console.info(`####### process2 init:${JSON.stringify(result)}`);
                            assert_1.default.ok(!result.err);
                            let op_env = result.unwrap();
                            // 协议栈为君子协议，业务层主动判断操作路径是否有锁，lock 会等待另外一个线程完成操作后，才会返回
                            // 使用操作可能遇到常见的死锁卡死问题....
                            let lock_rs = await op_env.lock([pathA], cyfs.JSBI.BigInt(0));
                            console.info(`####### process2 lock:${JSON.stringify(lock_rs)}`);
                            assert_1.default.ok(!lock_rs.err);
                            // 业务操作
                            let result1 = await op_env.insert_with_key(pathA, key, obj_id1);
                            console.info(`####### process2 insert:${JSON.stringify(result1)}`);
                            assert_1.default.ok(!result1.err);
                            // 模拟业务处理时间 5s
                            await cyfs.sleep(5 * 1000);
                            let result3 = await op_env.commit();
                            console.info(`####### process2 commit:${JSON.stringify(result3)}`);
                            assert_1.default.ok(!result3.err);
                        }
                        catch (error) {
                            V({ err: true, log: `${JSON.stringify(error)}` });
                        }
                        V({ err: false, log: "run sucesss", time: Date.now() });
                    });
                    // 测试结果校验
                    let info1 = await process1;
                    console.info(JSON.stringify(info1));
                    assert_1.default.ok(!info1.err, info1.log);
                    let info2 = await process2;
                    console.info(JSON.stringify(info2));
                    assert_1.default.ok(!info2.err, info2.log);
                    // 执行时间 process1 必须比 process2 先执行
                    assert_1.default.ok(info1.time < info2.time, "事务锁执行时间校验失败");
                });
            });
            describe("### 乐观锁lock机制功能流程 - 同path校验", async () => {
                it("业务流程测试", async () => {
                    // 父path
                    let pathA = `/qatest/${common_1.RandomGenerator.string(10)}`;
                    // path
                    let pathB = pathA + `/${common_1.RandomGenerator.string(10)}`;
                    // 兄弟path
                    let pathB1 = pathA + `/${common_1.RandomGenerator.string(10)}`;
                    // 子path
                    let pathC = pathB + `/${common_1.RandomGenerator.string(10)}`;
                    // 进程1发起操作
                    let process1 = new Promise(async (V) => {
                        // mocha 本身不支持 异步函数中 error 捕获，使用try catch 捕获
                        try {
                            let key = common_1.RandomGenerator.string(10);
                            let obj_id1;
                            let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                            obj_id1 = obj1.desc().object_id();
                            // 初始化 op_env
                            let result = await zone1_ood_stack.root_state_stub(zone1_ood_id).create_path_op_env();
                            console.info(`####### process1 init:${JSON.stringify(result)}`);
                            assert_1.default.ok(!result.err);
                            let op_env = result.unwrap();
                            // 对 object_map 添加锁
                            let lock_rs = await op_env.lock([pathB], cyfs.JSBI.BigInt(0));
                            console.info(`####### process1 lock:${JSON.stringify(lock_rs)}`);
                            assert_1.default.ok(!lock_rs.err);
                            // 业务操作
                            let result1 = await op_env.insert_with_key(pathB, key, obj_id1);
                            console.info(`####### process1 insert:${JSON.stringify(result1)}}`);
                            assert_1.default.ok(!result1.err);
                            // 模拟业务处理时间 15s
                            await cyfs.sleep(15 * 1000);
                            // 提交object_map 操作事务
                            let result3 = await op_env.commit();
                            console.info(`####### process1 commit:${JSON.stringify(result3)}`);
                            assert_1.default.ok(!result3.err);
                        }
                        catch (error) {
                            V({ err: true, log: `${JSON.stringify(error)}`, time: Date.now() });
                        }
                        V({ err: false, log: "run sucesss", time: Date.now() });
                    });
                    // 进程2发起操作
                    await cyfs.sleep(2 * 1000);
                    let process2 = new Promise(async (V) => {
                        try {
                            let key = common_1.RandomGenerator.string(10);
                            let obj_id1;
                            let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                            obj_id1 = obj1.desc().object_id();
                            // 初始化 op_env
                            let result = await zone1_ood_stack.root_state_stub(zone1_ood_id).create_path_op_env();
                            console.info(`####### process2 init:${JSON.stringify(result)}`);
                            assert_1.default.ok(!result.err);
                            let op_env = result.unwrap();
                            // 协议栈为君子协议，业务层主动判断操作路径是否有锁，lock 会等待另外一个线程完成操作后，才会返回
                            // 使用操作可能遇到常见的死锁卡死问题....
                            let lock_rs = await op_env.lock([pathB], cyfs.JSBI.BigInt(0));
                            console.info(`####### process2 lock:${JSON.stringify(lock_rs)}`);
                            assert_1.default.ok(!lock_rs.err);
                            // 业务操作
                            let result1 = await op_env.insert_with_key(pathB, key, obj_id1);
                            console.info(`####### process2 insert:${JSON.stringify(result1)}`);
                            assert_1.default.ok(!result1.err);
                            // 模拟业务处理时间 5s
                            await cyfs.sleep(5 * 1000);
                            let result3 = await op_env.commit();
                            console.info(`####### process2 commit:${JSON.stringify(result3)}`);
                            assert_1.default.ok(!result3.err);
                        }
                        catch (error) {
                            V({ err: true, log: `${JSON.stringify(error)}` });
                        }
                        V({ err: false, log: "run sucesss", time: Date.now() });
                    });
                    // 测试结果校验
                    let info1 = await process1;
                    console.info(JSON.stringify(info1));
                    assert_1.default.ok(!info1.err, info1.log);
                    let info2 = await process2;
                    console.info(JSON.stringify(info2));
                    assert_1.default.ok(!info2.err, info2.log);
                    // 执行时间 process1 必须比 process2 先执行
                    assert_1.default.ok(info1.time < info2.time, "事务锁执行时间校验失败");
                });
            });
            describe("### 乐观锁lock机制功能流程 - 子path校验", async () => {
                it("业务流程测试", async () => {
                    // 父path
                    let pathA = `/qatest/${common_1.RandomGenerator.string(10)}`;
                    // path
                    let pathB = pathA + `/${common_1.RandomGenerator.string(10)}`;
                    // 兄弟path
                    let pathB1 = pathA + `/${common_1.RandomGenerator.string(10)}`;
                    // 子path
                    let pathC = pathB + `/${common_1.RandomGenerator.string(10)}`;
                    // 进程1发起操作
                    let process1 = new Promise(async (V) => {
                        // mocha 本身不支持 异步函数中 error 捕获，使用try catch 捕获
                        try {
                            let key = common_1.RandomGenerator.string(10);
                            let obj_id1;
                            let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                            obj_id1 = obj1.desc().object_id();
                            // 初始化 op_env
                            let result = await zone1_ood_stack.root_state_stub(zone1_ood_id).create_path_op_env();
                            console.info(`####### process1 init:${JSON.stringify(result)}`);
                            assert_1.default.ok(!result.err);
                            let op_env = result.unwrap();
                            // 对 object_map 添加锁
                            let lock_rs = await op_env.lock([pathB], cyfs.JSBI.BigInt(0));
                            console.info(`####### process1 lock:${JSON.stringify(lock_rs)}`);
                            assert_1.default.ok(!lock_rs.err);
                            // 业务操作
                            let result1 = await op_env.insert_with_key(pathB, key, obj_id1);
                            console.info(`####### process1 insert:${JSON.stringify(result1)}}`);
                            assert_1.default.ok(!result1.err);
                            // 模拟业务处理时间 15s
                            await cyfs.sleep(15 * 1000);
                            // 提交object_map 操作事务
                            let result3 = await op_env.commit();
                            console.info(`####### process1 commit:${JSON.stringify(result3)}`);
                            assert_1.default.ok(!result3.err);
                        }
                        catch (error) {
                            V({ err: true, log: `${JSON.stringify(error)}`, time: Date.now() });
                        }
                        V({ err: false, log: "run sucesss", time: Date.now() });
                    });
                    // 进程2发起操作
                    await cyfs.sleep(2 * 1000);
                    let process2 = new Promise(async (V) => {
                        try {
                            let key = common_1.RandomGenerator.string(10);
                            let obj_id1;
                            let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                            obj_id1 = obj1.desc().object_id();
                            // 初始化 op_env
                            let result = await zone1_ood_stack.root_state_stub(zone1_ood_id).create_path_op_env();
                            console.info(`####### process2 init:${JSON.stringify(result)}`);
                            assert_1.default.ok(!result.err);
                            let op_env = result.unwrap();
                            // 协议栈为君子协议，业务层主动判断操作路径是否有锁，lock 会等待另外一个线程完成操作后，才会返回
                            // 使用操作可能遇到常见的死锁卡死问题....
                            let lock_rs = await op_env.lock([pathC], cyfs.JSBI.BigInt(0));
                            console.info(`####### process2 lock:${JSON.stringify(lock_rs)}`);
                            assert_1.default.ok(!lock_rs.err);
                            // 业务操作
                            let result1 = await op_env.insert_with_key(pathC, key, obj_id1);
                            console.info(`####### process2 insert:${JSON.stringify(result1)}`);
                            assert_1.default.ok(!result1.err);
                            // 模拟业务处理时间 5s
                            await cyfs.sleep(5 * 1000);
                            let result3 = await op_env.commit();
                            console.info(`####### process2 commit:${JSON.stringify(result3)}`);
                            assert_1.default.ok(!result3.err);
                        }
                        catch (error) {
                            V({ err: true, log: `${JSON.stringify(error)}` });
                        }
                        V({ err: false, log: "run sucesss", time: Date.now() });
                    });
                    // 测试结果校验
                    let info1 = await process1;
                    console.info(JSON.stringify(info1));
                    assert_1.default.ok(!info1.err, info1.log);
                    let info2 = await process2;
                    console.info(JSON.stringify(info2));
                    assert_1.default.ok(!info2.err, info2.log);
                    // 执行时间 process1 必须比 process2 先执行
                    assert_1.default.ok(info1.time < info2.time, "事务锁执行时间校验失败");
                });
            });
            describe("### 乐观锁lock机制功能流程 - 兄弟path校验", async () => {
                it("业务流程测试", async () => {
                    // 父path
                    let pathA = `/qatest/${common_1.RandomGenerator.string(10)}`;
                    // path
                    let pathB = pathA + `/${common_1.RandomGenerator.string(10)}`;
                    // 兄弟path
                    let pathB1 = pathA + `/${common_1.RandomGenerator.string(10)}`;
                    // 子path
                    let pathC = pathB + `/${common_1.RandomGenerator.string(10)}`;
                    // 进程1发起操作
                    let process1 = new Promise(async (V) => {
                        // mocha 本身不支持 异步函数中 error 捕获，使用try catch 捕获
                        try {
                            let key = common_1.RandomGenerator.string(10);
                            let obj_id1;
                            let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                            obj_id1 = obj1.desc().object_id();
                            // 初始化 op_env
                            let result = await zone1_ood_stack.root_state_stub(zone1_ood_id).create_path_op_env();
                            console.info(`####### process1 init:${JSON.stringify(result)}`);
                            assert_1.default.ok(!result.err);
                            let op_env = result.unwrap();
                            // 对 object_map 添加锁
                            let lock_rs = await op_env.lock([pathB], cyfs.JSBI.BigInt(0));
                            console.info(`####### process1 lock:${JSON.stringify(lock_rs)}`);
                            assert_1.default.ok(!lock_rs.err);
                            // 业务操作
                            let result1 = await op_env.insert_with_key(pathB, key, obj_id1);
                            console.info(`####### process1 insert:${JSON.stringify(result1)}}`);
                            assert_1.default.ok(!result1.err);
                            // 模拟业务处理时间 15s
                            await cyfs.sleep(15 * 1000);
                            // 提交object_map 操作事务
                            let result3 = await op_env.commit();
                            console.info(`####### process1 commit:${JSON.stringify(result3)}`);
                            assert_1.default.ok(!result3.err);
                        }
                        catch (error) {
                            V({ err: true, log: `${JSON.stringify(error)}`, time: Date.now() });
                        }
                        V({ err: false, log: "run sucesss", time: Date.now() });
                    });
                    // 进程2发起操作
                    await cyfs.sleep(2 * 1000);
                    let process2 = new Promise(async (V) => {
                        try {
                            let key = common_1.RandomGenerator.string(10);
                            let obj_id1;
                            let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                            obj_id1 = obj1.desc().object_id();
                            // 初始化 op_env
                            let result = await zone1_ood_stack.root_state_stub(zone1_ood_id).create_path_op_env();
                            console.info(`####### process2 init:${JSON.stringify(result)}`);
                            assert_1.default.ok(!result.err);
                            let op_env = result.unwrap();
                            // 协议栈为君子协议，业务层主动判断操作路径是否有锁，lock 会等待另外一个线程完成操作后，才会返回
                            // 使用操作可能遇到常见的死锁卡死问题....
                            let lock_rs = await op_env.lock([pathB1], cyfs.JSBI.BigInt(0));
                            console.info(`####### process2 lock:${JSON.stringify(lock_rs)}`);
                            assert_1.default.ok(!lock_rs.err);
                            // 业务操作
                            let result1 = await op_env.insert_with_key(pathB1, key, obj_id1);
                            console.info(`####### process2 insert:${JSON.stringify(result1)}`);
                            assert_1.default.ok(!result1.err);
                            // 模拟业务处理时间 5s
                            await cyfs.sleep(5 * 1000);
                            let result3 = await op_env.commit();
                            console.info(`####### process2 commit:${JSON.stringify(result3)}`);
                            assert_1.default.ok(!result3.err);
                        }
                        catch (error) {
                            V({ err: true, log: `${JSON.stringify(error)}` });
                        }
                        V({ err: false, log: "run sucesss", time: Date.now() });
                    });
                    // 测试结果校验
                    let info1 = await process1;
                    console.info(JSON.stringify(info1));
                    assert_1.default.ok(!info1.err, info1.log);
                    let info2 = await process2;
                    console.info(JSON.stringify(info2));
                    assert_1.default.ok(!info2.err, info2.log);
                    // 执行时间 process1 必须比 process2 先执行
                    assert_1.default.ok(info1.time > info2.time, "事务锁执行时间校验失败");
                });
            });
        });
        describe("## 悲观锁try_lock机制", async () => {
            describe("### 悲观锁try_lock机制功能流程 - 父path校验", async () => {
                it("业务流程测试", async () => {
                    // 父path
                    let pathA = `/qatest/${common_1.RandomGenerator.string(10)}`;
                    // path
                    let pathB = pathA + `/${common_1.RandomGenerator.string(10)}`;
                    // 兄弟path
                    let pathB1 = pathA + `/${common_1.RandomGenerator.string(10)}`;
                    // 子path
                    let pathC = pathB + `/${common_1.RandomGenerator.string(10)}`;
                    // 进程1发起操作
                    let process1 = new Promise(async (V) => {
                        // mocha 本身不支持 异步函数中 error 捕获，使用try catch 捕获
                        try {
                            let key = common_1.RandomGenerator.string(10);
                            let obj_id1;
                            let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                            obj_id1 = obj1.desc().object_id();
                            // 初始化 op_env
                            let result = await zone1_ood_stack.root_state_stub(zone1_ood_id).create_path_op_env();
                            console.info(`####### process1 init:${JSON.stringify(result)}`);
                            assert_1.default.ok(!result.err);
                            let op_env = result.unwrap();
                            // 对 object_map 添加锁
                            let lock_rs = await op_env.try_lock([pathB], cyfs.JSBI.BigInt(0));
                            console.info(`####### process1 lock:${JSON.stringify(lock_rs)}`);
                            assert_1.default.ok(!lock_rs.err);
                            // 业务操作
                            let result1 = await op_env.insert_with_key(pathB, key, obj_id1);
                            console.info(`####### process1 insert:${JSON.stringify(result1)}}`);
                            assert_1.default.ok(!result1.err);
                            // 模拟业务处理时间 15s
                            await cyfs.sleep(15 * 1000);
                            // 提交object_map 操作事务
                            let result3 = await op_env.commit();
                            console.info(`####### process1 commit:${JSON.stringify(result3)}`);
                            assert_1.default.ok(!result3.err);
                        }
                        catch (error) {
                            V({ err: true, log: `${JSON.stringify(error)}`, time: Date.now() });
                        }
                        V({ err: false, log: "run sucesss", time: Date.now() });
                    });
                    // 进程2发起操作
                    await cyfs.sleep(2 * 1000);
                    let process2 = new Promise(async (V) => {
                        try {
                            let key = common_1.RandomGenerator.string(10);
                            let obj_id1;
                            let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                            obj_id1 = obj1.desc().object_id();
                            // 初始化 op_env
                            let result = await zone1_ood_stack.root_state_stub(zone1_ood_id).create_path_op_env();
                            console.info(`####### process2 init:${JSON.stringify(result)}`);
                            assert_1.default.ok(!result.err);
                            let op_env = result.unwrap();
                            // 协议栈为君子协议，业务层主动判断操作路径是否有锁，lock 会等待另外一个线程完成操作后，才会返回
                            // 使用操作可能遇到常见的死锁卡死问题....
                            //悲观锁直接返回错误
                            let lock_rs = await op_env.try_lock([pathA], cyfs.JSBI.BigInt(0));
                            console.info(`####### process2 lock:${JSON.stringify(lock_rs)}`);
                            assert_1.default.ok(lock_rs.err);
                        }
                        catch (error) {
                            V({ err: true, log: `${JSON.stringify(error)}` });
                        }
                        V({ err: false, log: "run sucesss" });
                    });
                    // 测试结果校验
                    let info1 = await process1;
                    console.info(JSON.stringify(info1));
                    assert_1.default.ok(!info1.err, info1.log);
                    let info2 = await process2;
                    console.info(JSON.stringify(info2));
                    assert_1.default.ok(!info2.err, info2.log);
                });
            });
            describe("### 悲观锁try_lock机制功能流程 - 同path校验", async () => {
                it("业务流程测试", async () => {
                    // 父path
                    let pathA = `/qatest/${common_1.RandomGenerator.string(10)}`;
                    // path
                    let pathB = pathA + `/${common_1.RandomGenerator.string(10)}`;
                    // 兄弟path
                    let pathB1 = pathA + `/${common_1.RandomGenerator.string(10)}`;
                    // 子path
                    let pathC = pathB + `/${common_1.RandomGenerator.string(10)}`;
                    // 进程1发起操作
                    let process1 = new Promise(async (V) => {
                        // mocha 本身不支持 异步函数中 error 捕获，使用try catch 捕获
                        try {
                            let key = common_1.RandomGenerator.string(10);
                            let obj_id1;
                            let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                            obj_id1 = obj1.desc().object_id();
                            // 初始化 op_env
                            let result = await zone1_ood_stack.root_state_stub(zone1_ood_id).create_path_op_env();
                            console.info(`####### process1 init:${JSON.stringify(result)}`);
                            assert_1.default.ok(!result.err);
                            let op_env = result.unwrap();
                            // 对 object_map 添加锁
                            let lock_rs = await op_env.try_lock([pathB], cyfs.JSBI.BigInt(0));
                            console.info(`####### process1 lock:${JSON.stringify(lock_rs)}`);
                            assert_1.default.ok(!lock_rs.err);
                            // 业务操作
                            let result1 = await op_env.insert_with_key(pathB, key, obj_id1);
                            console.info(`####### process1 insert:${JSON.stringify(result1)}}`);
                            assert_1.default.ok(!result1.err);
                            // 模拟业务处理时间 15s
                            await cyfs.sleep(15 * 1000);
                            // 提交object_map 操作事务
                            let result3 = await op_env.commit();
                            console.info(`####### process1 commit:${JSON.stringify(result3)}`);
                            assert_1.default.ok(!result3.err);
                        }
                        catch (error) {
                            V({ err: true, log: `${JSON.stringify(error)}`, time: Date.now() });
                        }
                        V({ err: false, log: "run sucesss", time: Date.now() });
                    });
                    // 进程2发起操作
                    await cyfs.sleep(2 * 1000);
                    let process2 = new Promise(async (V) => {
                        try {
                            let key = common_1.RandomGenerator.string(10);
                            let obj_id1;
                            let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                            obj_id1 = obj1.desc().object_id();
                            // 初始化 op_env
                            let result = await zone1_ood_stack.root_state_stub(zone1_ood_id).create_path_op_env();
                            console.info(`####### process2 init:${JSON.stringify(result)}`);
                            assert_1.default.ok(!result.err);
                            let op_env = result.unwrap();
                            // 协议栈为君子协议，业务层主动判断操作路径是否有锁，lock 会等待另外一个线程完成操作后，才会返回
                            // 使用操作可能遇到常见的死锁卡死问题....
                            //悲观锁直接返回错误
                            let lock_rs = await op_env.try_lock([pathB], cyfs.JSBI.BigInt(0));
                            console.info(`####### process2 lock:${JSON.stringify(lock_rs)}`);
                            assert_1.default.ok(lock_rs.err);
                        }
                        catch (error) {
                            V({ err: true, log: `${JSON.stringify(error)}` });
                        }
                        V({ err: false, log: "run sucesss" });
                    });
                    // 测试结果校验
                    let info1 = await process1;
                    console.info(JSON.stringify(info1));
                    assert_1.default.ok(!info1.err, info1.log);
                    let info2 = await process2;
                    console.info(JSON.stringify(info2));
                    assert_1.default.ok(!info2.err, info2.log);
                });
            });
            describe("### 悲观锁try_lock机制功能流程 - 子path校验", async () => {
                it("业务流程测试", async () => {
                    // 父path
                    let pathA = `/qatest/${common_1.RandomGenerator.string(10)}`;
                    // path
                    let pathB = pathA + `/${common_1.RandomGenerator.string(10)}`;
                    // 兄弟path
                    let pathB1 = pathA + `/${common_1.RandomGenerator.string(10)}`;
                    // 子path
                    let pathC = pathB + `/${common_1.RandomGenerator.string(10)}`;
                    // 进程1发起操作
                    let process1 = new Promise(async (V) => {
                        // mocha 本身不支持 异步函数中 error 捕获，使用try catch 捕获
                        try {
                            let key = common_1.RandomGenerator.string(10);
                            let obj_id1;
                            let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                            obj_id1 = obj1.desc().object_id();
                            // 初始化 op_env
                            let result = await zone1_ood_stack.root_state_stub(zone1_ood_id).create_path_op_env();
                            console.info(`####### process1 init:${JSON.stringify(result)}`);
                            assert_1.default.ok(!result.err);
                            let op_env = result.unwrap();
                            // 对 object_map 添加锁
                            let lock_rs = await op_env.try_lock([pathB], cyfs.JSBI.BigInt(0));
                            console.info(`####### process1 lock:${JSON.stringify(lock_rs)}`);
                            assert_1.default.ok(!lock_rs.err);
                            // 业务操作
                            let result1 = await op_env.insert_with_key(pathB, key, obj_id1);
                            console.info(`####### process1 insert:${JSON.stringify(result1)}}`);
                            assert_1.default.ok(!result1.err);
                            // 模拟业务处理时间 15s
                            await cyfs.sleep(15 * 1000);
                            // 提交object_map 操作事务
                            let result3 = await op_env.commit();
                            console.info(`####### process1 commit:${JSON.stringify(result3)}`);
                            assert_1.default.ok(!result3.err);
                        }
                        catch (error) {
                            V({ err: true, log: `${JSON.stringify(error)}`, time: Date.now() });
                        }
                        V({ err: false, log: "run sucesss", time: Date.now() });
                    });
                    // 进程2发起操作
                    await cyfs.sleep(2 * 1000);
                    let process2 = new Promise(async (V) => {
                        try {
                            let key = common_1.RandomGenerator.string(10);
                            let obj_id1;
                            let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                            obj_id1 = obj1.desc().object_id();
                            // 初始化 op_env
                            let result = await zone1_ood_stack.root_state_stub(zone1_ood_id).create_path_op_env();
                            console.info(`####### process2 init:${JSON.stringify(result)}`);
                            assert_1.default.ok(!result.err);
                            let op_env = result.unwrap();
                            // 协议栈为君子协议，业务层主动判断操作路径是否有锁，lock 会等待另外一个线程完成操作后，才会返回
                            // 使用操作可能遇到常见的死锁卡死问题....
                            //悲观锁直接返回错误
                            let lock_rs = await op_env.try_lock([pathC], cyfs.JSBI.BigInt(0));
                            console.info(`####### process2 lock:${JSON.stringify(lock_rs)}`);
                            assert_1.default.ok(lock_rs.err);
                        }
                        catch (error) {
                            V({ err: true, log: `${JSON.stringify(error)}` });
                        }
                        V({ err: false, log: "run sucesss" });
                    });
                    // 测试结果校验
                    let info1 = await process1;
                    console.info(JSON.stringify(info1));
                    assert_1.default.ok(!info1.err, info1.log);
                    let info2 = await process2;
                    console.info(JSON.stringify(info2));
                    assert_1.default.ok(!info2.err, info2.log);
                });
            });
            describe("### 悲观锁try_lock机制功能流程 - 同级path校验", async () => {
                it("业务流程测试", async () => {
                    // 父path
                    let pathA = `/qatest/${common_1.RandomGenerator.string(10)}`;
                    // path
                    let pathB = pathA + `/${common_1.RandomGenerator.string(10)}`;
                    // 兄弟path
                    let pathB1 = pathA + `/${common_1.RandomGenerator.string(10)}`;
                    // 子path
                    let pathC = pathB + `/${common_1.RandomGenerator.string(10)}`;
                    // 进程1发起操作
                    let process1 = new Promise(async (V) => {
                        // mocha 本身不支持 异步函数中 error 捕获，使用try catch 捕获
                        try {
                            let key = common_1.RandomGenerator.string(10);
                            let obj_id1;
                            let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                            obj_id1 = obj1.desc().object_id();
                            // 初始化 op_env
                            let result = await zone1_ood_stack.root_state_stub(zone1_ood_id).create_path_op_env();
                            console.info(`####### process1 init:${JSON.stringify(result)}`);
                            assert_1.default.ok(!result.err);
                            let op_env = result.unwrap();
                            // 对 object_map 添加锁
                            let lock_rs = await op_env.try_lock([pathB], cyfs.JSBI.BigInt(0));
                            console.info(`####### process1 lock:${JSON.stringify(lock_rs)}`);
                            assert_1.default.ok(!lock_rs.err);
                            // 业务操作
                            let result1 = await op_env.insert_with_key(pathB, key, obj_id1);
                            console.info(`####### process1 insert:${JSON.stringify(result1)}}`);
                            assert_1.default.ok(!result1.err);
                            // 模拟业务处理时间 15s
                            await cyfs.sleep(15 * 1000);
                            // 提交object_map 操作事务
                            let result3 = await op_env.commit();
                            console.info(`####### process1 commit:${JSON.stringify(result3)}`);
                            assert_1.default.ok(!result3.err);
                        }
                        catch (error) {
                            V({ err: true, log: `${JSON.stringify(error)}`, time: Date.now() });
                        }
                        V({ err: false, log: "run sucesss", time: Date.now() });
                    });
                    // 进程2发起操作
                    await cyfs.sleep(2 * 1000);
                    let process2 = new Promise(async (V) => {
                        try {
                            let key = common_1.RandomGenerator.string(10);
                            let obj_id1;
                            let obj1 = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(), `A${common_1.RandomGenerator.string(10)}`, `A${common_1.RandomGenerator.string(10)}`, `${common_1.RandomGenerator.string(10)}`);
                            obj_id1 = obj1.desc().object_id();
                            // 初始化 op_env
                            let result = await zone1_ood_stack.root_state_stub(zone1_ood_id).create_path_op_env();
                            console.info(`####### process2 init:${JSON.stringify(result)}`);
                            assert_1.default.ok(!result.err);
                            let op_env = result.unwrap();
                            // 协议栈为君子协议，业务层主动判断操作路径是否有锁，lock 会等待另外一个线程完成操作后，才会返回
                            // 使用操作可能遇到常见的死锁卡死问题....
                            let lock_rs = await op_env.try_lock([pathB1], cyfs.JSBI.BigInt(0));
                            console.info(`####### process2 lock:${JSON.stringify(lock_rs)}`);
                            assert_1.default.ok(!lock_rs.err);
                            // 业务操作
                            let result1 = await op_env.insert_with_key(pathB1, key, obj_id1);
                            console.info(`####### process2 insert:${JSON.stringify(result1)}`);
                            assert_1.default.ok(!result1.err);
                            // 模拟业务处理时间 5s
                            await cyfs.sleep(5 * 1000);
                            let result3 = await op_env.commit();
                            console.info(`####### process2 commit:${JSON.stringify(result3)}`);
                            assert_1.default.ok(!result3.err);
                        }
                        catch (error) {
                            V({ err: true, log: `${JSON.stringify(error)}` });
                        }
                        V({ err: false, log: "run sucesss", time: Date.now() });
                    });
                    // 测试结果校验
                    let info1 = await process1;
                    console.info(JSON.stringify(info1));
                    assert_1.default.ok(!info1.err, info1.log);
                    let info2 = await process2;
                    console.info(JSON.stringify(info2));
                    assert_1.default.ok(!info2.err, info2.log);
                    assert_1.default.ok(info1.time > info2.time, "事务锁执行时间校验失败");
                });
            });
        });
    });
});
