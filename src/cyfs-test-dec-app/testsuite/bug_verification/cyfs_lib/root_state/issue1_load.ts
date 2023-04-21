import assert = require('assert');
import * as cyfs from '../../../../cyfs'

import { StackManager,ActionManager} from "../../../../cyfs-test-util"
import { ErrorCode, RandomGenerator, sleep,Logger } from '../../../../common';
import path = require('path');
import * as addContext from "mochawesome/addContext"
import * as action_api from "../../../../dec-app-action"
import { HandlerRequestObject } from "../../../../dec-app-base"
import { PrepareTransFileRequest } from '../../../../dec-app-action';

const dec_app_1 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device1decapp")
const dec_app_2 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device2decapp")


//  npx mocha .\*\issue*.ts--reporter mochawesome --require ts-node/register
//  npx mocha .\issue1_get_object.ts --reporter mochawesome --require ts-node/register
//  npx mocha .\issue*.ts --reporter mochawesome --require ts-node/register
describe("【root_state-issue1】SingleOpEnvStub支持inner_path参数和新的加载模式", function () {
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
    describe("BUG回归验证:", function () {
        //  创建 op_env_2  ，op_env_1 作为 op_env_2 一个子路径
        let object_id: cyfs.ObjectId;
        let inner_path = "";
        this.beforeAll(async () => {
            let stack = stack_manager.get_cyfs_satck({
                peer_name: "zone1_ood",
                dec_id: dec_app_1.to_base_58(),
                type: cyfs.CyfsStackRequestorType.Http
            }).stack!
            let op_env_1 = (await stack.root_state_stub(stack.local_device_id().object_id,stack.dec_id).create_single_op_env()).unwrap();
            let create = await op_env_1.create_new(cyfs.ObjectMapSimpleContentType.Map)
            let test_path_1 = `/path/${RandomGenerator.string(10)}`;
            let test_path_2= `${test_path_1}/${RandomGenerator.string(10)}`
            let result1 = await op_env_1.insert_with_key(test_path_1,stack.local_device_id().object_id);
            let result2 = await op_env_1.insert_with_key(test_path_1,stack.local_device_id().object_id);
            let save = await op_env_1.commit();
            let child_object = save.unwrap().dec_root;
            let op_env_2 = (await stack.root_state_stub(stack.local_device_id().object_id,stack.dec_id).create_single_op_env()).unwrap();
            let create2 = await op_env_2.create_new(cyfs.ObjectMapSimpleContentType.Map)
            let test_path_3 = `${RandomGenerator.string(10)}`;
            inner_path = test_path_3;
            let result3 = await op_env_2.insert_with_key(test_path_3,child_object);
            let save2 = await op_env_2.commit();
            object_id = save2.unwrap().dec_root;

        })
        it("SingleOpEnvStub load支持inner_path参数",async()=>{
            let stack = stack_manager.get_cyfs_satck({
                peer_name: "zone1_ood",
                dec_id: dec_app_1.to_base_58(),
                type: cyfs.CyfsStackRequestorType.Http
            }).stack!
            let op_env_test = (await stack.root_state_stub(stack.local_device_id().object_id,stack.dec_id).create_single_op_env()).unwrap();
            //let create_new = await op_env_test.create_new(cyfs.ObjectMapSimpleContentType.Map)
            let op_env_info = await op_env_test.load(object_id,`/${inner_path}`);
            assert.equal(op_env_info.err,false,op_env_info.toString())
        })
        it("SingleOpEnvStub load 不使用 inner_path参数",async()=>{
            let stack = stack_manager.get_cyfs_satck({
                peer_name: "zone1_ood",
                dec_id: dec_app_1.to_base_58(),
                type: cyfs.CyfsStackRequestorType.Http
            }).stack!
            let op_env_test = (await stack.root_state_stub(stack.local_device_id().object_id,stack.dec_id).create_single_op_env()).unwrap();
            //let create_new = await op_env_test.create_new(cyfs.ObjectMapSimpleContentType.Map)
            let op_env_info = await op_env_test.load(object_id);
            assert.equal(op_env_info.err,false,op_env_info.toString())
        })
    })
    

})