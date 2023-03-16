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
const common_1 = require("../../../../common");
const addContext = __importStar(require("mochawesome/addContext"));
const action_api = __importStar(require("../../../../dec-app-action"));
const request_1 = require("./request");
//Interface
//Test scenario
//System testing
//Performance testing
//Stress testing
//Smoke testing
//Regression testing
//  npx mocha .\test*.ts --reporter mochawesome --require ts-node/register
//  npx mocha .\test_service_status_beta.ts --reporter mochawesome --require ts-node/register
describe("ood-daemon 本地1330服务测试", function () {
    this.timeout(0);
    const data_manager = action_api.ActionManager.createInstance();
    this.beforeAll(async function () {
        await common_1.sleep(5000);
    });
    this.afterAll(async () => {
        // 停止测试模拟器
        // 保存测试记录
    });
    let report_result;
    beforeEach(function () {
        // 设置当前用例id 方便日志定位问题
        let testcase_id = `Testcase-${common_1.RandomGenerator.string(10)}-${Date.now()}`;
        data_manager.update_current_testcase_id(testcase_id);
    });
    afterEach(function () {
        // 将当前用例执行记录到history
        addContext.default(this, report_result);
    });
    describe("获取OOD service数据", async () => {
        it("GET service_status 获取全部配置数据", async () => {
            let get_data = await request_1.request("http://192.168.100.18:11330", "GET", "service_status");
            console.info(`${JSON.stringify(get_data)}`);
            report_result = {
                title: `http://127.0.0.1:1330/service_status`,
                value: get_data
            };
        });
        it("GET service_status 获取ood-daemon 配置数据", async () => {
            let get_data = await request_1.request("http://192.168.100.18:11330", "GET", "service_status/ood-daemon");
            console.info(`${JSON.stringify(get_data)}`);
            report_result = {
                title: `http://127.0.0.1:1330/service_status`,
                value: get_data
            };
        });
        it("GET service_status 获取 获取不存在的name配置数据", async () => {
            let get_data = await request_1.request("http://192.168.100.18:11330", "GET", "service_status/not_hahahahh");
            console.info(`${JSON.stringify(get_data)}`);
            report_result = {
                title: `http://127.0.0.1:1330/service_status`,
                value: get_data
            };
        });
    });
    describe("POST/GET 维护 app-manager 配置 数据", async () => {
        let rand_key = "QA_Test";
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
            let update = await request_1.request("http://192.168.100.18:11330", "POST", `service_status/${rand_key}`, create_value, request_1.ContentType.raw);
            console.info(`update resp = ${JSON.stringify(update)}`);
            report_result = {
                title: `http://127.0.0.1:1330/service_status`,
                value: update
            };
        });
        it(`GET service_status 获取${rand_key} 配置数据`, async () => {
            let get_data = await request_1.request("http://192.168.100.18:11330", "GET", `service_status/${rand_key}`);
            console.info(`${JSON.stringify(get_data)}`);
            report_result = {
                title: `http://127.0.0.1:1330/service_status`,
                value: get_data
            };
        });
        it(`Post service_status/${rand_key} 更新 key value `, async () => {
            let update = await request_1.request("http://192.168.100.18:11330", "POST", `service_status/${rand_key}`, update_value, request_1.ContentType.raw);
            console.info(`update resp = ${JSON.stringify(update)}`);
        });
        it(`GET service_status 获取${rand_key} 配置数据`, async () => {
            let get_data = await request_1.request("http://192.168.100.18:11330", "GET", `service_status/${rand_key}`);
            console.info(`${JSON.stringify(get_data)}`);
            report_result = {
                title: `http://127.0.0.1:1330/service_status`,
                value: get_data
            };
        });
    });
});
