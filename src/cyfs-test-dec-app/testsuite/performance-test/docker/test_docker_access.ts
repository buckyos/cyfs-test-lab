import assert = require('assert');
import * as cyfs from 'cyfs'
import {CyfsDriverType} from "cyfs-test-base";
import {StackManager} from  "cyfs-test-util";
import {CyfsStackDriverManager} from "cyfs-driver-client"
import { ErrorCode, RandomGenerator, sleep ,Logger} from 'common';
import path = require('path');
import * as addContext from "mochawesome/addContext"
import {ActionManager} from "cyfs-test-util"

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
//  npx mocha .\test_service_status.ts --reporter mochawesome --require ts-node/register

describe("Docker 权限控制测试", function () {
    this.timeout(0);
    let logger : Logger;
    const stack_manager = StackManager.createInstance(CyfsDriverType.other,[{
        peer_name: "zone1_ood",
        zone_tag: "zone1",
        stack_type: "ood",
        bdt_port: 30001,
        http_port: 31000,
        ws_port: 31001,
        ood_daemon_status_port : 32001,
    }]);
    const driver_manager = CyfsStackDriverManager.createInstance();
    const data_manager = ActionManager.createInstance();
    this.beforeAll(async function () {
        let make_dirver = await stack_manager.init();
        logger = stack_manager.logger!;
        await sleep(5000);
        logger.info(`############用例执开始执行`);
    })
    this.afterAll(async () => {
        // 停止测试模拟器
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
        addContext.default(this, report_result);
    });
    describe("磁盘IO操作",async()=>{
        describe("读取磁盘文件",async()=>{
        
        })
        describe("写入磁盘文件",async()=>{
        
        })
        describe("执行命令",async()=>{
        
        })
        describe("执行可执行程序",async()=>{
        
        })      
    })
    describe("网络操作",async()=>{
        
    })
})