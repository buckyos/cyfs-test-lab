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
Object.defineProperty(exports, "__esModule", { value: true });
const cyfs = __importStar(require("../../../../cyfs"));
const cyfs_driver_client_1 = require("../../../../cyfs-driver-client");
const common_1 = require("../../../../common");
const addContext = __importStar(require("mochawesome/addContext"));
const action_api = __importStar(require("../../../../dec-app-action"));
const request_1 = require("./request");
const dec_app_1 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device1decapp");
const dec_app_2 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device2decapp");
//Interface
//Test scenario
//System testing
//Performance testing
//Stress testing
//Smoke testing
//Regression testing
//  npx mocha .\test*.ts --reporter mochawesome --require ts-node/register
//  npx mocha .\test_service_status.ts --reporter mochawesome --require ts-node/register
describe("ood-daemon 本地1330服务测试", function () {
    this.timeout(0);
    let logger;
    const stack_manager = cyfs_driver_client_1.StackManager.createInstance(cyfs_driver_client_1.CyfsDriverType.other, [{
            peer_name: "zone1_ood",
            zone_tag: "zone1",
            stack_type: "ood",
            bdt_port: 30001,
            http_port: 31000,
            ws_port: 31001,
            ood_daemon_status_port: 32001,
        }]);
    const driver_manager = cyfs_driver_client_1.CyfsStackDriverManager.createInstance();
    const data_manager = action_api.ActionManager.createInstance();
    this.beforeAll(async function () {
        let make_dirver = await stack_manager.init();
        logger = stack_manager.logger;
        await common_1.sleep(5000);
        logger.info(`############用例执开始执行`);
    });
    this.afterAll(async () => {
        // 停止测试模拟器
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
        addContext.default(this, report_result);
    });
    describe("获取OOD service数据", async () => {
        it("GET service_status 获取全部配置数据", async () => {
            let get_data = await request_1.request("http://127.0.0.1:32001", "GET", "service_status");
            console.info(`${JSON.stringify(get_data)}`);
            report_result = {
                title: `http://127.0.0.1:1330/service_status`,
                value: get_data
            };
        });
        it("GET service_status 获取ood-daemon 配置数据", async () => {
            let get_data = await request_1.request("http://127.0.0.1:32001", "GET", "service_status/ood-daemon");
            console.info(`${JSON.stringify(get_data)}`);
            report_result = {
                title: `http://127.0.0.1:1330/service_status`,
                value: get_data
            };
        });
        it("GET service_status 获取 获取不存在的name配置数据", async () => {
            let get_data = await request_1.request("http://127.0.0.1:32001", "GET", "service_status/not_hahahahh");
            console.info(`${JSON.stringify(get_data)}`);
            report_result = {
                title: `http://127.0.0.1:1330/service_status`,
                value: get_data
            };
        });
    });
    describe("POST/GET 维护 app-manager 配置 数据", async () => {
        let rand_key = common_1.RandomGenerator.string(20);
        const create_value = {
            rand_key,
            type: "create_value",
            data_info: common_1.RandomGenerator.string(100),
            update_time: cyfs.bucky_time_now()
        };
        const update_value = {
            rand_key,
            type: "update_value",
            data_info: common_1.RandomGenerator.string(100),
            update_time: cyfs.bucky_time_now()
        };
        it(`Post service_status/${rand_key} 添加新的key value `, async () => {
            let update = await request_1.request("http://127.0.0.1:32001", "POST", `service_status/${rand_key}`, create_value, request_1.ContentType.raw);
            console.info(`update resp = ${JSON.stringify(update)}`);
        });
        it(`GET service_status 获取${rand_key} 配置数据`, async () => {
            let get_data = await request_1.request("http://127.0.0.1:32001", "GET", `service_status/${rand_key}`);
            console.info(`${JSON.stringify(get_data)}`);
            report_result = {
                title: `http://127.0.0.1:1330/service_status`,
                value: get_data
            };
        });
        it(`Post service_status/${rand_key} 更新 key value `, async () => {
            let update = await request_1.request("http://127.0.0.1:32001", "POST", `service_status/${rand_key}`, update_value, request_1.ContentType.raw);
            console.info(`update resp = ${JSON.stringify(update)}`);
        });
        it(`GET service_status 获取${rand_key} 配置数据`, async () => {
            let get_data = await request_1.request("http://127.0.0.1:32001", "GET", `service_status/${rand_key}`);
            console.info(`${JSON.stringify(get_data)}`);
            report_result = {
                title: `http://127.0.0.1:1330/service_status`,
                value: get_data
            };
        });
    });
});
