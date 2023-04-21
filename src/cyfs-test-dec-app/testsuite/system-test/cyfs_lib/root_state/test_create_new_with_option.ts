import assert  from 'assert'; 
import * as cyfs from '../../../../cyfs';
import {RandomGenerator,testLanguage,ESC_char,encodeType,Logger,sleep, ErrorCode} from "../../../../common";
import * as path from 'path';
import { before } from 'mocha';
let encoding = require('encoding');
import * as addContext from "mochawesome/addContext"
import { StackManager,ActionManager} from "../../../../cyfs-test-util"
import * as action_api from "../../../../dec-app-action"


//  npx mocha .\test*.ts --reporter mochawesome --require ts-node/register
//  npx mocha .\test_isolate_path_op_env.ts --reporter mochawesome --require ts-node/register


const dec_app_1 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device1decapp")
const test_agent = {
    zone1_ood_app1 : {
        peer_name: "zone1_ood",
        dec_id: dec_app_1.to_base_58(),
        type: cyfs.CyfsStackRequestorType.Http
    }
}

// 

 describe("IsolatePathOpEnvStub 功能测试", function () {
    this.timeout(0);
    const stack_manager = StackManager.createInstance();
    let logger : Logger;
    const data_manager = ActionManager.createInstance();
    this.beforeAll(async function () {
        //测试前置条件，连接测试模拟器设备
        await stack_manager.init();
        logger = stack_manager.logger!;
        await sleep(5000);
        // 所有节点 实例化一个 Http Requestor dec_app_1 协议栈
        let dec_app_1_client =  await stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.Http, dec_app_1);
        assert.equal(dec_app_1_client.err,0,dec_app_1_client.log)
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
    describe("create_new_with_option",async()=>{

        it("create_new_with_option",async()=>{
            let stack = stack_manager.get_cyfs_satck(test_agent.zone1_ood_app1).stack!;
            let env = (await stack.root_state_stub().create_single_op_env()).unwrap();
            env.create_new
        })
    })

})

