import assert = require('assert');
import * as cyfs from '../../../cyfs'

import { StackManager, CyfsDriverType } from "../../../cyfs-driver-client"
import { ErrorCode, RandomGenerator, sleep,Logger } from '../../../base';
import path = require('path');
import * as addContext from "mochawesome/addContext"
import * as action_api from "../../../common_action"
import { HandlerRequestObject } from "../../../common_base"
import { PrepareTransFileRequest } from '../../../common_action';

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
//  npx mocha .\test_ndn_scenario.ts --reporter mochawesome --require ts-node/register
describe("CYFS Stack NDN 模块测试", function () {
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
            title: `用例:${current_actions.testcase_id}`,
            value: current_actions.action_list
        };
        addContext.default(this, report_result);
    })
    describe("")

})