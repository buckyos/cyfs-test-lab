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
//  npx mocha .\test*.ts --reporter mochawesome --require ts-node/register
//  npx mocha .\test_isolate_path_op_env.ts --reporter mochawesome --require ts-node/register
const dec_app_1 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device1decapp");
const test_agent = {
    zone1_ood_app1: {
        peer_name: "zone1_ood",
        dec_id: dec_app_1.to_base_58(),
        type: cyfs.CyfsStackRequestorType.Http
    }
};
// 
describe("IsolatePathOpEnvStub 功能测试", function () {
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
    describe("IsolatePathOpEnvStub 接口测试 create_isolate_path_op_env", async () => {
        describe("IsolatePathOpEnvStub 创建方式", async () => {
            describe("create_isolate_path_op_env  接口创建IsolatePathOpEnvStub", async () => {
                describe("create_new 接口 初始化 ObjectMap", async () => {
                    it("IsolatePathOpEnvStub.create_new 创建 ObjectMapSimpleContentType.Map 流程", async () => {
                        let stack = await stack_manager.get_cyfs_satck(test_agent.zone1_ood_app1).stack;
                        let op_env = (await stack.root_state_stub().create_isolate_path_op_env()).unwrap();
                        let create_result = (await op_env.create_new(cyfs.ObjectMapSimpleContentType.Map)).unwrap();
                        let test_root_path = common_1.RandomGenerator.string(10);
                        let test1_object = await action_api.PutObjectAction.create_random_text_object(test_agent.zone1_ood_app1, logger);
                        let test1_path = `/${test_root_path}/${test1_object.desc().object_id().to_base_58()}`;
                        let insert_key = (await op_env.insert_with_key(test1_path, test1_object.calculate_id().toString(), test1_object.calculate_id())).mapErr((err) => {
                            logger.error(`insert_key err = ${err}`);
                        });
                        let commit = (await op_env.commit()).unwrap();
                        console.info(`dec_root = ${commit.dec_root}`);
                        console.info(`root = ${commit.root}`);
                        console.info(`revision = ${commit.revision}`);
                    });
                    it("IsolatePathOpEnvStub.create_new 创建 ObjectMapSimpleContentType.Set 流程", async () => {
                        let stack = await stack_manager.get_cyfs_satck(test_agent.zone1_ood_app1).stack;
                        let op_env = (await stack.root_state_stub().create_isolate_path_op_env()).unwrap();
                        let create_result = (await op_env.create_new(cyfs.ObjectMapSimpleContentType.Set)).unwrap();
                        let test_root_path = common_1.RandomGenerator.string(10);
                        let test1_object = await action_api.PutObjectAction.create_random_text_object(test_agent.zone1_ood_app1, logger);
                        let test1_path = `/${test_root_path}/${test1_object.desc().object_id().to_base_58()}`;
                        let insert_ket = await op_env.insert_with_path(test1_path, test1_object.calculate_id());
                        let commit = (await op_env.commit()).unwrap();
                        console.info(`dec_root = ${commit.dec_root}`);
                        console.info(`root = ${commit.root}`);
                        console.info(`revision = ${commit.revision}`);
                    });
                    it("IsolatePathOpEnvStub.create_new 创建 ObjectMapSimpleContentType.DiffMap 流程", async () => {
                        let stack = await stack_manager.get_cyfs_satck(test_agent.zone1_ood_app1).stack;
                        let op_env = (await stack.root_state_stub().create_isolate_path_op_env()).unwrap();
                        let create_result = (await op_env.create_new(cyfs.ObjectMapSimpleContentType.DiffMap)).unwrap();
                        let test_root_path = common_1.RandomGenerator.string(10);
                        let test1_object = await action_api.PutObjectAction.create_random_text_object(test_agent.zone1_ood_app1, logger);
                        let test1_path = `/${test_root_path}/${test1_object.desc().object_id().to_base_58()}`;
                        let insert_ket = await op_env.insert_with_path(test1_path, test1_object.calculate_id());
                        let commit = (await op_env.commit()).unwrap();
                        console.info(`dec_root = ${commit.dec_root}`);
                        console.info(`root = ${commit.root}`);
                        console.info(`revision = ${commit.revision}`);
                    });
                    it("IsolatePathOpEnvStub.create_new 创建 ObjectMapSimpleContentType.DiffSet 流程", async () => {
                        let stack = await stack_manager.get_cyfs_satck(test_agent.zone1_ood_app1).stack;
                        let op_env = (await stack.root_state_stub().create_isolate_path_op_env()).unwrap();
                        let create_result = (await op_env.create_new(cyfs.ObjectMapSimpleContentType.DiffSet)).unwrap();
                        let test_root_path = common_1.RandomGenerator.string(10);
                        let test1_object = await action_api.PutObjectAction.create_random_text_object(test_agent.zone1_ood_app1, logger);
                        let test1_path = `/${test_root_path}/${test1_object.desc().object_id().to_base_58()}`;
                        let insert_ket = await op_env.insert_with_path(test1_path, test1_object.calculate_id());
                        let commit = (await op_env.commit()).unwrap();
                        console.info(`dec_root = ${commit.dec_root}`);
                        console.info(`root = ${commit.root}`);
                        console.info(`revision = ${commit.revision}`);
                    });
                });
                describe("create_new_with_path 接口 初始化 ObjectMap", async () => {
                    it("IsolatePathOpEnvStub.create_new_with_path 创建 ObjectMapSimpleContentType.Map 流程", async () => {
                        let stack = await stack_manager.get_cyfs_satck(test_agent.zone1_ood_app1).stack;
                        let op_env = (await stack.root_state_stub().create_isolate_path_op_env()).unwrap();
                        let root_path = `/QATest/${common_1.RandomGenerator.string(10)}`;
                        let create_new = (await op_env.create_new(cyfs.ObjectMapSimpleContentType.Map)).unwrap();
                        let create_result = (await op_env.create_new_with_path(root_path, cyfs.ObjectMapSimpleContentType.Map)).unwrap();
                        let test_root_path = common_1.RandomGenerator.string(10);
                        let test1_object = await action_api.PutObjectAction.create_random_text_object(test_agent.zone1_ood_app1, logger);
                        let test1_path = `/${test_root_path}/${test1_object.desc().object_id().to_base_58()}`;
                        let insert_key = (await op_env.insert_with_key(test1_path, test1_object.calculate_id().toString(), test1_object.calculate_id())).mapErr((err) => {
                            logger.error(`insert_key err = ${err}`);
                        });
                        let commit = (await op_env.commit()).unwrap();
                        console.info(`dec_root = ${commit.dec_root}`);
                        console.info(`root = ${commit.root}`);
                        console.info(`revision = ${commit.revision}`);
                    });
                });
                describe("create_new_with_key 接口 初始化 ObjectMap", async () => {
                    it("IsolatePathOpEnvStub.create_new_with_key 创建 ObjectMapSimpleContentType.Map 流程", async () => {
                        let stack = await stack_manager.get_cyfs_satck(test_agent.zone1_ood_app1).stack;
                        let op_env = (await stack.root_state_stub().create_isolate_path_op_env()).unwrap();
                        let root_path = `/QATest/${common_1.RandomGenerator.string(10)}`;
                        let create_new = (await op_env.create_new(cyfs.ObjectMapSimpleContentType.Map)).unwrap();
                        let create_result = (await op_env.create_new_with_key(root_path, common_1.RandomGenerator.string(10), cyfs.ObjectMapSimpleContentType.Map)).unwrap();
                        let test_root_path = common_1.RandomGenerator.string(10);
                        let test1_object = await action_api.PutObjectAction.create_random_text_object(test_agent.zone1_ood_app1, logger);
                        let test1_path = `/${test_root_path}/${test1_object.desc().object_id().to_base_58()}`;
                        let insert_key = (await op_env.insert_with_key(test1_path, test1_object.calculate_id().toString(), test1_object.calculate_id())).mapErr((err) => {
                            logger.error(`insert_key err = ${err}`);
                        });
                        let commit = (await op_env.commit()).unwrap();
                        console.info(`dec_root = ${commit.dec_root}`);
                        console.info(`root = ${commit.root}`);
                        console.info(`revision = ${commit.revision}`);
                    });
                });
                describe("load载入现有ObjectMap", async () => {
                    it("IsolatePathOpEnvStub.load 加载ObjectMapSimpleContentType.Map 流程", async () => {
                        let stack = await stack_manager.get_cyfs_satck(test_agent.zone1_ood_app1).stack;
                        let rand_stub = await action_api.RandomIsolatePathOpEnv.rand_one(test_agent.zone1_ood_app1, cyfs.ObjectMapSimpleContentType.Map);
                        assert_1.default.equal(rand_stub.err, common_1.ErrorCode.succ, rand_stub.log);
                        let op_env = (await stack.root_state_stub().create_isolate_path_op_env()).unwrap();
                        let create_result = (await op_env.load(rand_stub.resp.dec_root)).unwrap();
                        let test1_object = await action_api.PutObjectAction.create_random_text_object(test_agent.zone1_ood_app1, logger);
                        let test1_path = `${rand_stub.resp.root_path}/${test1_object.desc().object_id().to_base_58()}`;
                        let insert_ket = await op_env.insert_with_path(test1_path, test1_object.calculate_id());
                        let commit = (await op_env.commit()).unwrap();
                        console.info(`dec_root = ${commit.dec_root}`);
                        console.info(`root = ${commit.root}`);
                        console.info(`revision = ${commit.revision}`);
                    });
                });
                describe("load + inner_path载入现有ObjectMap", async () => {
                    it("IsolatePathOpEnvStub.load + inner_path 加载ObjectMapSimpleContentType.Map 流程", async () => {
                        let stack = await stack_manager.get_cyfs_satck(test_agent.zone1_ood_app1).stack;
                        // 随机一个Object_map1
                        let rand_stub1 = await action_api.RandomIsolatePathOpEnv.rand_one(test_agent.zone1_ood_app1, cyfs.ObjectMapSimpleContentType.Map);
                        assert_1.default.equal(rand_stub1.err, common_1.ErrorCode.succ, rand_stub1.log);
                        // 随机一个Object_map2
                        let rand_stub2 = await action_api.RandomIsolatePathOpEnv.rand_one(test_agent.zone1_ood_app1, cyfs.ObjectMapSimpleContentType.Map);
                        assert_1.default.equal(rand_stub2.err, common_1.ErrorCode.succ, rand_stub2.log);
                        // 将 Object_map1 作为 Object_map2 一个叶子节点 生成 Object_map3
                        let root_path = `/${common_1.RandomGenerator.string(10)}`;
                        let link_stub3 = await action_api.IsolateEnvInsertWithKey.insert_key(test_agent.zone1_ood_app1, {
                            root_path,
                            root_env: rand_stub2.resp.root,
                            key: rand_stub1.resp.root.to_base_58(),
                            value: rand_stub1.resp.root
                        });
                        assert_1.default.equal(link_stub3.err, common_1.ErrorCode.succ, link_stub3.log);
                        // 通过 load + inner_path 加载 Object_map1
                        let op_env = (await stack.root_state_stub().create_isolate_path_op_env()).unwrap();
                        ///${rand_stub1.resp!.dec_root.to_base_58()}
                        logger.info(`op_env will load ${link_stub3.resp.root} inner_path = ${root_path}`);
                        let create_result = (await op_env.load(link_stub3.resp.root, root_path)).unwrap();
                        let test1_object = await action_api.PutObjectAction.create_random_text_object(test_agent.zone1_ood_app1, logger);
                        let root = (await op_env.get_current_root()).unwrap();
                        let commit = (await op_env.commit()).unwrap();
                        console.info(`dec_root = ${commit.dec_root}`);
                        console.info(`root = ${commit.root}`);
                        console.info(`revision = ${commit.revision}`);
                    });
                });
                describe("load_by_path 载入现有ObjectMap", async () => {
                    it("IsolatePathOpEnvStub.load_by_path加载ObjectMapSimpleContentType.Map 流程", async () => {
                        let stack = await stack_manager.get_cyfs_satck(test_agent.zone1_ood_app1).stack;
                        // // 随机一个IsolatePath env Object_map1
                        let rand_stub1 = await action_api.RandomIsolatePathOpEnv.rand_one(test_agent.zone1_ood_app1, cyfs.ObjectMapSimpleContentType.Map);
                        assert_1.default.equal(rand_stub1.err, common_1.ErrorCode.succ, rand_stub1.log);
                        let root_path1 = "/QaTest/" + common_1.RandomGenerator.string(10);
                        // 将  随机一个IsolatePath env Object_map1 作为一个叶子节点 挂载到 Path env  Object_map2
                        //let root_path = `/${RandomGenerator.string(10)}`
                        let rand_stub2 = await action_api.PathEnvInsertWithKey.insert_key(test_agent.zone1_ood_app1, {
                            root_path: root_path1,
                            content_type: cyfs.ObjectMapSimpleContentType.Map,
                            key: rand_stub1.resp.root.to_base_58(),
                            value: rand_stub1.resp.root
                        });
                        assert_1.default.equal(rand_stub2.err, common_1.ErrorCode.succ, rand_stub2.log);
                        // 通过 load + inner_path 加载 Object_map1
                        let op_env = (await stack.root_state_stub().create_isolate_path_op_env()).unwrap();
                        ///${rand_stub1.resp!.root.to_base_58()}
                        logger.info(`op_env will load_by_path /${root_path1}/${rand_stub1.resp.root.to_base_58()}`);
                        let create_result = (await op_env.load_by_path(`${root_path1}/${rand_stub1.resp.root.to_base_58()}`)).unwrap();
                        let test1_object = await action_api.PutObjectAction.create_random_text_object(test_agent.zone1_ood_app1, logger);
                        let root = (await op_env.get_current_root()).unwrap();
                        let commit = (await op_env.commit()).unwrap();
                        console.info(`dec_root = ${commit.dec_root}`);
                        console.info(`root = ${commit.root}`);
                        console.info(`revision = ${commit.revision}`);
                    });
                });
            });
            describe("create_isolate_path_op_env_with_access 接口创建IsolatePathOpEnvStub", async () => {
                describe("create_new 接口 初始化ObjectMap", async () => {
                    it("IsolatePathOpEnvStub.create_new 创建 ObjectMapSimpleContentType.Map 流程", async () => {
                        let stack = await stack_manager.get_cyfs_satck(test_agent.zone1_ood_app1).stack;
                        let test_root_path = common_1.RandomGenerator.string(10);
                        let access = {
                            path: test_root_path,
                            access: cyfs.AccessPermissions.Full
                        };
                        let op_env = (await stack.root_state_stub().create_isolate_path_op_env_with_access(access)).unwrap();
                        let create_result = (await op_env.create_new(cyfs.ObjectMapSimpleContentType.Map)).unwrap();
                        let test1_object = await action_api.PutObjectAction.create_random_text_object(test_agent.zone1_ood_app1, logger);
                        let test1_path = `/${test_root_path}/${test1_object.desc().object_id().to_base_58()}`;
                        let insert_ket = await op_env.insert_with_path(test1_path, test1_object.calculate_id());
                        let commit = (await op_env.commit()).unwrap();
                        console.info(`dec_root = ${commit.dec_root}`);
                        console.info(`root = ${commit.root}`);
                        console.info(`revision = ${commit.revision}`);
                    });
                    it("IsolatePathOpEnvStub.create_new 创建 ObjectMapSimpleContentType.Set 流程", async () => {
                        let stack = await stack_manager.get_cyfs_satck(test_agent.zone1_ood_app1).stack;
                        let test_root_path = common_1.RandomGenerator.string(10);
                        let access = {
                            path: test_root_path,
                            access: cyfs.AccessPermissions.Full
                        };
                        let op_env = (await stack.root_state_stub().create_isolate_path_op_env_with_access(access)).unwrap();
                        let create_result = (await op_env.create_new(cyfs.ObjectMapSimpleContentType.Set)).unwrap();
                        let test1_object = await action_api.PutObjectAction.create_random_text_object(test_agent.zone1_ood_app1, logger);
                        let test1_path = `/${test_root_path}/${test1_object.desc().object_id().to_base_58()}`;
                        let insert_ket = await op_env.insert_with_path(test1_path, test1_object.calculate_id());
                        let commit = (await op_env.commit()).unwrap();
                        console.info(`dec_root = ${commit.dec_root}`);
                        console.info(`root = ${commit.root}`);
                        console.info(`revision = ${commit.revision}`);
                    });
                    it("IsolatePathOpEnvStub.create_new 创建 ObjectMapSimpleContentType.DiffMap 流程", async () => {
                        let stack = await stack_manager.get_cyfs_satck(test_agent.zone1_ood_app1).stack;
                        let test_root_path = common_1.RandomGenerator.string(10);
                        let access = {
                            path: test_root_path,
                            access: cyfs.AccessPermissions.Full
                        };
                        let op_env = (await stack.root_state_stub().create_isolate_path_op_env_with_access(access)).unwrap();
                        let create_result = (await op_env.create_new(cyfs.ObjectMapSimpleContentType.DiffMap)).unwrap();
                        let test1_object = await action_api.PutObjectAction.create_random_text_object(test_agent.zone1_ood_app1, logger);
                        let test1_path = `/${test_root_path}/${test1_object.desc().object_id().to_base_58()}`;
                        let insert_ket = await op_env.insert_with_path(test1_path, test1_object.calculate_id());
                        let commit = (await op_env.commit()).unwrap();
                        console.info(`dec_root = ${commit.dec_root}`);
                        console.info(`root = ${commit.root}`);
                        console.info(`revision = ${commit.revision}`);
                    });
                    it("IsolatePathOpEnvStub.create_new 创建 ObjectMapSimpleContentType.DiffSet 流程", async () => {
                        let stack = await stack_manager.get_cyfs_satck(test_agent.zone1_ood_app1).stack;
                        let test_root_path = common_1.RandomGenerator.string(10);
                        let access = {
                            path: test_root_path,
                            access: cyfs.AccessPermissions.Full
                        };
                        let op_env = (await stack.root_state_stub().create_isolate_path_op_env_with_access(access)).unwrap();
                        let create_result = (await op_env.create_new(cyfs.ObjectMapSimpleContentType.DiffSet)).unwrap();
                        let test1_object = await action_api.PutObjectAction.create_random_text_object(test_agent.zone1_ood_app1, logger);
                        let test1_path = `/${test_root_path}/${test1_object.desc().object_id().to_base_58()}`;
                        let insert_ket = await op_env.insert_with_path(test1_path, test1_object.calculate_id());
                        let commit = (await op_env.commit()).unwrap();
                        console.info(`dec_root = ${commit.dec_root}`);
                        console.info(`root = ${commit.root}`);
                        console.info(`revision = ${commit.revision}`);
                    });
                });
                describe("load载入现有ObjectMap", async () => {
                    it("IsolatePathOpEnvStub.load 加载ObjectMapSimpleContentType.Map 流程", async () => {
                        let stack = await stack_manager.get_cyfs_satck(test_agent.zone1_ood_app1).stack;
                        let rand_stub = await action_api.RandomIsolatePathOpEnv.rand_one(test_agent.zone1_ood_app1, cyfs.ObjectMapSimpleContentType.Map);
                        assert_1.default.equal(rand_stub.err, common_1.ErrorCode.succ, rand_stub.log);
                        let access = {
                            path: rand_stub.resp.root_path,
                            access: cyfs.AccessPermissions.Full
                        };
                        let op_env = (await stack.root_state_stub().create_isolate_path_op_env_with_access(access)).unwrap();
                        let create_result = (await op_env.load(rand_stub.resp.dec_root)).unwrap();
                        let test1_object = await action_api.PutObjectAction.create_random_text_object(test_agent.zone1_ood_app1, logger);
                        let test1_path = `${rand_stub.resp.root_path}/${test1_object.desc().object_id().to_base_58()}`;
                        let insert_ket = await op_env.insert_with_path(test1_path, test1_object.calculate_id());
                        let commit = (await op_env.commit()).unwrap();
                        console.info(`dec_root = ${commit.dec_root}`);
                        console.info(`root = ${commit.root}`);
                        console.info(`revision = ${commit.revision}`);
                    });
                });
                describe("load + inner_path载入现有ObjectMap", async () => {
                    it("IsolatePathOpEnvStub.load + inner_path 加载ObjectMapSimpleContentType.Map 流程", async () => {
                        let stack = await stack_manager.get_cyfs_satck(test_agent.zone1_ood_app1).stack;
                        // 随机一个Object_map1
                        let rand_stub1 = await action_api.RandomIsolatePathOpEnv.rand_one(test_agent.zone1_ood_app1, cyfs.ObjectMapSimpleContentType.Map);
                        assert_1.default.equal(rand_stub1.err, common_1.ErrorCode.succ, rand_stub1.log);
                        // 随机一个Object_map2
                        let rand_stub2 = await action_api.RandomIsolatePathOpEnv.rand_one(test_agent.zone1_ood_app1, cyfs.ObjectMapSimpleContentType.Map);
                        assert_1.default.equal(rand_stub2.err, common_1.ErrorCode.succ, rand_stub2.log);
                        // 将 Object_map1 作为 Object_map2 一个叶子节点 生成 Object_map3
                        let root_path = `/${common_1.RandomGenerator.string(10)}`;
                        let link_stub3 = await action_api.IsolateEnvInsertWithKey.insert_key(test_agent.zone1_ood_app1, {
                            root_path,
                            root_env: rand_stub2.resp.root,
                            key: rand_stub1.resp.root.to_base_58(),
                            value: rand_stub1.resp.root
                        });
                        assert_1.default.equal(link_stub3.err, common_1.ErrorCode.succ, link_stub3.log);
                        // 通过 load + inner_path 加载 Object_map1
                        let access = {
                            path: rand_stub2.resp.root_path,
                            access: cyfs.AccessPermissions.Full
                        };
                        let op_env = (await stack.root_state_stub().create_isolate_path_op_env_with_access(access)).unwrap();
                        ///${rand_stub1.resp!.dec_root.to_base_58()}
                        logger.info(`op_env will load ${link_stub3.resp.root} inner_path = ${root_path}`);
                        let create_result = (await op_env.load(link_stub3.resp.root, root_path)).unwrap();
                        let test1_object = await action_api.PutObjectAction.create_random_text_object(test_agent.zone1_ood_app1, logger);
                        let root = (await op_env.get_current_root()).unwrap();
                        let commit = (await op_env.commit()).unwrap();
                        console.info(`dec_root = ${commit.dec_root}`);
                        console.info(`root = ${commit.root}`);
                        console.info(`revision = ${commit.revision}`);
                    });
                });
                describe("create_new_with_path 接口 初始化 ObjectMap", async () => {
                    it("IsolatePathOpEnvStub.create_new_with_path 创建 ObjectMapSimpleContentType.Map 流程", async () => {
                        let stack = await stack_manager.get_cyfs_satck(test_agent.zone1_ood_app1).stack;
                        let root_path = `/QATest/${common_1.RandomGenerator.string(10)}`;
                        let access = {
                            path: root_path,
                            access: cyfs.AccessPermissions.Full
                        };
                        let op_env = (await stack.root_state_stub().create_isolate_path_op_env_with_access(access)).unwrap();
                        let create_new = (await op_env.create_new(cyfs.ObjectMapSimpleContentType.Map)).unwrap();
                        let create_result = (await op_env.create_new_with_path(root_path, cyfs.ObjectMapSimpleContentType.Map)).unwrap();
                        let test_root_path = common_1.RandomGenerator.string(10);
                        let test1_object = await action_api.PutObjectAction.create_random_text_object(test_agent.zone1_ood_app1, logger);
                        let test1_path = `/${test_root_path}/${test1_object.desc().object_id().to_base_58()}`;
                        let insert_key = (await op_env.insert_with_key(test1_path, test1_object.calculate_id().toString(), test1_object.calculate_id())).mapErr((err) => {
                            logger.error(`insert_key err = ${err}`);
                        });
                        let commit = (await op_env.commit()).unwrap();
                        console.info(`dec_root = ${commit.dec_root}`);
                        console.info(`root = ${commit.root}`);
                        console.info(`revision = ${commit.revision}`);
                    });
                });
                describe("create_new_with_key 接口 初始化 ObjectMap", async () => {
                    it("IsolatePathOpEnvStub.create_new_with_key 创建 ObjectMapSimpleContentType.Map 流程", async () => {
                        let stack = await stack_manager.get_cyfs_satck(test_agent.zone1_ood_app1).stack;
                        let root_path = `/QATest/${common_1.RandomGenerator.string(10)}`;
                        let access = {
                            path: root_path,
                            access: cyfs.AccessPermissions.Full
                        };
                        let op_env = (await stack.root_state_stub().create_isolate_path_op_env_with_access(access)).unwrap();
                        let create_new = (await op_env.create_new(cyfs.ObjectMapSimpleContentType.Map)).unwrap();
                        let create_result = (await op_env.create_new_with_key(root_path, common_1.RandomGenerator.string(10), cyfs.ObjectMapSimpleContentType.Map)).unwrap();
                        let test_root_path = common_1.RandomGenerator.string(10);
                        let test1_object = await action_api.PutObjectAction.create_random_text_object(test_agent.zone1_ood_app1, logger);
                        let test1_path = `/${test_root_path}/${test1_object.desc().object_id().to_base_58()}`;
                        let insert_key = (await op_env.insert_with_key(test1_path, test1_object.calculate_id().toString(), test1_object.calculate_id())).mapErr((err) => {
                            logger.error(`insert_key err = ${err}`);
                        });
                        let commit = (await op_env.commit()).unwrap();
                        console.info(`dec_root = ${commit.dec_root}`);
                        console.info(`root = ${commit.root}`);
                        console.info(`revision = ${commit.revision}`);
                    });
                });
                describe("load_by_path 载入现有ObjectMap", async () => {
                    it("IsolatePathOpEnvStub.load_by_path 加载ObjectMapSimpleContentType.Map 流程", async () => {
                        let stack = await stack_manager.get_cyfs_satck(test_agent.zone1_ood_app1).stack;
                        // // 随机一个IsolatePath env Object_map1
                        let rand_stub1 = await action_api.RandomIsolatePathOpEnv.rand_one(test_agent.zone1_ood_app1, cyfs.ObjectMapSimpleContentType.Map);
                        assert_1.default.equal(rand_stub1.err, common_1.ErrorCode.succ, rand_stub1.log);
                        let root_path1 = "/QaTest/" + common_1.RandomGenerator.string(10);
                        // 将  随机一个IsolatePath env Object_map1 作为一个叶子节点 挂载到 Path env  Object_map2
                        //let root_path = `/${RandomGenerator.string(10)}`
                        let rand_stub2 = await action_api.PathEnvInsertWithKey.insert_key(test_agent.zone1_ood_app1, {
                            root_path: root_path1,
                            content_type: cyfs.ObjectMapSimpleContentType.Map,
                            key: rand_stub1.resp.root.to_base_58(),
                            value: rand_stub1.resp.root
                        });
                        assert_1.default.equal(rand_stub2.err, common_1.ErrorCode.succ, rand_stub2.log);
                        // 通过 load + inner_path 加载 Object_map1
                        let access = {
                            path: root_path1,
                            access: cyfs.AccessPermissions.Full
                        };
                        let op_env = (await stack.root_state_stub().create_isolate_path_op_env_with_access(access)).unwrap();
                        ///${rand_stub1.resp!.root.to_base_58()}
                        logger.info(`op_env will load_by_path /${root_path1}/${rand_stub1.resp.root.to_base_58()}`);
                        let create_result = (await op_env.load_by_path(`${root_path1}/${rand_stub1.resp.root.to_base_58()}`)).unwrap();
                        let test1_object = await action_api.PutObjectAction.create_random_text_object(test_agent.zone1_ood_app1, logger);
                        let root = (await op_env.get_current_root()).unwrap();
                        let commit = (await op_env.commit()).unwrap();
                        console.info(`dec_root = ${commit.dec_root}`);
                        console.info(`root = ${commit.root}`);
                        console.info(`revision = ${commit.revision}`);
                    });
                });
            });
        });
        describe("IsolatePathOpEnvStub ObjectMap 常用操作", async () => {
            describe("ObjectMap 接口通用操作", async () => {
                let stack;
                let op_env;
                let op_env1_id;
                let root_path = "/QaTest/" + common_1.RandomGenerator.string(10);
                it("create_new 创建一个新的IsolatePathOpEnvStub", async () => {
                    stack = await stack_manager.get_cyfs_satck(test_agent.zone1_ood_app1).stack;
                    op_env = (await stack.root_state_stub().create_isolate_path_op_env()).unwrap();
                    let result = (await op_env.create_new(cyfs.ObjectMapSimpleContentType.Map)).unwrap();
                });
                let object1;
                it("insert_with_key 接口插入 object1 ", async () => {
                    let test_object = await action_api.PutObjectAction.create_random_text_object(test_agent.zone1_ood_app1, logger);
                    let result = (await op_env.insert_with_key(root_path, "object1", test_object.calculate_id())).unwrap();
                    object1 = test_object.calculate_id();
                });
                it("get_by_key 接口获取 object1 ", async () => {
                    let result = (await op_env.get_by_key(root_path, "object1")).unwrap();
                    assert_1.default.equal(result === null || result === void 0 ? void 0 : result.to_base_58(), object1.to_base_58());
                });
                let object2;
                it(`insert_with_path 接口插入 ${root_path}/object2 `, async () => {
                    let test_object = await action_api.PutObjectAction.create_random_text_object(test_agent.zone1_ood_app1, logger);
                    let result = (await op_env.insert_with_path(`${root_path}/object2`, test_object.calculate_id())).unwrap();
                    object2 = test_object.calculate_id();
                });
                it(`get_by_path 接口获取 ${root_path}/object2  `, async () => {
                    let result = (await op_env.get_by_path(`${root_path}/object2`)).unwrap();
                    assert_1.default.equal(result === null || result === void 0 ? void 0 : result.to_base_58(), object2.to_base_58());
                });
                let object_update3;
                it(`insert_with_path 接口插入 ${root_path}/object_update3 `, async () => {
                    let test_object = await action_api.PutObjectAction.create_random_text_object(test_agent.zone1_ood_app1, logger);
                    let result = (await op_env.insert_with_path(`${root_path}/object_update3`, test_object.calculate_id())).unwrap();
                    object_update3 = test_object.calculate_id();
                });
                it(`set_with_path 接口更新 ${root_path}/object_update3 `, async () => {
                    let test_object = await action_api.PutObjectAction.create_random_text_object(test_agent.zone1_ood_app1, logger);
                    let result = (await op_env.set_with_path(`${root_path}/object_update3`, test_object.calculate_id())).unwrap();
                    object_update3 = test_object.calculate_id();
                });
                let object_remove4;
                it(`insert_with_path 接口插入 ${root_path}/object_remove4 `, async () => {
                    let test_object = await action_api.PutObjectAction.create_random_text_object(test_agent.zone1_ood_app1, logger);
                    let result = (await op_env.insert_with_path(`${root_path}/object_remove4`, test_object.calculate_id())).unwrap();
                    object_remove4 = test_object.calculate_id();
                });
                it(`remove_with_path 接口删除 ${root_path}/object_remove4 `, async () => {
                    let result = (await op_env.remove_with_path(`${root_path}/object_remove4`)).unwrap();
                });
                let object_update5;
                it(`insert_with_key 接口插入 ${root_path} object_update5 `, async () => {
                    let test_object = await action_api.PutObjectAction.create_random_text_object(test_agent.zone1_ood_app1, logger);
                    let result = (await op_env.insert_with_key(root_path, "object_update5", test_object.calculate_id())).unwrap();
                    object_update5 = test_object.calculate_id();
                });
                it(`set_with_key 接口更新 ${root_path} object_update5 `, async () => {
                    let test_object = await action_api.PutObjectAction.create_random_text_object(test_agent.zone1_ood_app1, logger);
                    let result = (await op_env.set_with_key(root_path, "object_update5", test_object.calculate_id())).unwrap();
                    object_update5 = test_object.calculate_id();
                });
                let object_remove6;
                it(`insert_with_key 接口插入 ${root_path} object_remove6 `, async () => {
                    let test_object = await action_api.PutObjectAction.create_random_text_object(test_agent.zone1_ood_app1, logger);
                    let result = (await op_env.insert_with_key(root_path, "object_remove6", test_object.calculate_id())).unwrap();
                    object_remove6 = test_object.calculate_id();
                });
                it(`remove_with_key 删除 ${root_path} object_remove6 `, async () => {
                    let result = (await op_env.remove_with_key(root_path, "object_remove6")).unwrap();
                });
                let set_path1 = `${root_path}/set1`;
                let object4;
                it(`insert  插入值${set_path1} `, async () => {
                    let test_object = await action_api.PutObjectAction.create_random_text_object(test_agent.zone1_ood_app1, logger);
                    let result = (await op_env.insert(set_path1, test_object.calculate_id())).unwrap();
                    object4 = test_object.calculate_id();
                });
                it(`insert 循环插入${set_path1} 10个值`, async () => {
                    for (let i = 0; i < 10; i++) {
                        let test_object = await action_api.PutObjectAction.create_random_text_object(test_agent.zone1_ood_app1, logger);
                        let result = (await op_env.insert(set_path1, test_object.calculate_id())).unwrap();
                    }
                });
                it(`contains 检查${set_path1} 存在 object4`, async () => {
                    let result = (await op_env.contains(set_path1, object4)).unwrap();
                    assert_1.default.equal(result, true);
                });
                it(`contains 检查${set_path1} 不存在 object2`, async () => {
                    let result = (await op_env.contains(set_path1, object2)).unwrap();
                    assert_1.default.equal(result, false);
                });
                it(`remove 删除 ${set_path1} object4`, async () => {
                    let result = (await op_env.remove(set_path1, object4)).unwrap();
                    assert_1.default.equal(result, true);
                });
                it(`contains 检查${set_path1} 不存在 object4`, async () => {
                    let result = (await op_env.contains(set_path1, object4)).unwrap();
                    assert_1.default.equal(result, false);
                });
                it(`list 获取 ${set_path1} 列表 `, async () => {
                    let result = (await op_env.list(set_path1)).unwrap();
                    for (let item of result) {
                        console.info(item);
                    }
                });
                it(`metadata 获取 ${set_path1} 列表 `, async () => {
                    let result = (await op_env.metadata(set_path1)).unwrap();
                    console.info(result);
                });
                it(`get_current_root 接口获取当前root 信息`, async () => {
                    let result = (await op_env.get_current_root()).unwrap();
                    logger.info(`dec_root = ${result.dec_root}`);
                    logger.info(`root = ${result.root}`);
                    logger.info(`revision = ${result.revision}`);
                });
                it(`update 接口 暂时将当前操作数据保存到NOC中`, async () => {
                    let result = (await op_env.update()).unwrap();
                    logger.info(`dec_root = ${result.dec_root}`);
                    logger.info(`root = ${result.root}`);
                    logger.info(`revision = ${result.revision}`);
                    op_env1_id = result.root;
                });
                describe("op_env2 加载 op_env1 检查数据是否提交", async () => {
                    let op_env2;
                    it("op_env2 load 加载IsolatePathOpEnvStub", async () => {
                        stack = await stack_manager.get_cyfs_satck(test_agent.zone1_ood_app1).stack;
                        op_env2 = (await stack.root_state_stub().create_isolate_path_op_env()).unwrap();
                        let result = (await op_env2.load(op_env1_id)).unwrap();
                    });
                    it("op_env2 get_by_key 接口获取 object1 ", async () => {
                        let result = (await op_env2.get_by_key(root_path, "object1")).unwrap();
                        assert_1.default.equal(result === null || result === void 0 ? void 0 : result.to_base_58(), object1.to_base_58());
                    });
                    it(`op_env2 get_by_path 接口获取 ${root_path}/object2  `, async () => {
                        let result = (await op_env2.get_by_path(`${root_path}/object2`)).unwrap();
                        assert_1.default.equal(result === null || result === void 0 ? void 0 : result.to_base_58(), object2.to_base_58());
                    });
                    it(`commit 接口 将当前操作数据保存NOC`, async () => {
                        let result = (await op_env2.commit()).unwrap();
                    });
                });
                let object3;
                it("insert_with_key 接口插入 object3 ", async () => {
                    let test_object = await action_api.PutObjectAction.create_random_text_object(test_agent.zone1_ood_app1, logger);
                    let result = (await op_env.insert_with_key(root_path, "object3", test_object.calculate_id())).unwrap();
                    object3 = test_object.calculate_id();
                });
                it("get_by_key 接口获取 object3 ", async () => {
                    let result = (await op_env.get_by_key(root_path, "object3")).unwrap();
                    assert_1.default.equal(result === null || result === void 0 ? void 0 : result.to_base_58(), object3.to_base_58());
                });
                it(`abort 接口 将当前操作数据丢弃`, async () => {
                    let result = (await op_env.abort()).unwrap();
                });
                describe("op_env3 加载 op_env1 检查abort 数据", async () => {
                    let op_env3;
                    it("op_env3 load 加载IsolatePathOpEnvStub", async () => {
                        stack = await stack_manager.get_cyfs_satck(test_agent.zone1_ood_app1).stack;
                        op_env3 = (await stack.root_state_stub().create_isolate_path_op_env()).unwrap();
                        console.info("op_env1_id", op_env1_id);
                        let result = (await op_env3.load(op_env1_id)).unwrap();
                    });
                    it("op_env3 get_by_key 接口获取 object3 失败 ", async () => {
                        let result = (await op_env3.get_by_key(root_path, "object3")).unwrap();
                        assert_1.default.equal(result === null || result === void 0 ? void 0 : result.to_base_58(), undefined);
                    });
                    it("op_env3 get_by_key 接口获取 object2 成功", async () => {
                        let result = (await op_env3.get_by_key(root_path, "object2")).unwrap();
                        assert_1.default.equal(result === null || result === void 0 ? void 0 : result.to_base_58(), object2);
                    });
                    it(`commit 接口 将当前操作数据保存NOC`, async () => {
                        let result = (await op_env3.commit()).unwrap();
                    });
                });
                it("op_env load 加载IsolatePathOpEnvStub", async () => {
                    op_env = (await stack.root_state_stub().create_isolate_path_op_env()).unwrap();
                    let result = (await op_env.load(op_env1_id)).unwrap();
                });
                it(`commit 接口 将当前操作数据保存NOC`, async () => {
                    let result = (await op_env.commit()).unwrap();
                    op_env1_id = result.root;
                });
            });
        });
    });
});
