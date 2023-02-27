import assert  from 'assert'; 
import * as cyfs from '../../../../cyfs';
import {RandomGenerator,testLanguage,ESC_char,encodeType,Logger,sleep} from "../../../../base";
import * as path from 'path';
import { before } from 'mocha';
let encoding = require('encoding');
import * as addContext from "mochawesome/addContext"
import { StackManager, CyfsDriverType } from "../../../../cyfs-driver-client"
import * as action_api from "../../../../common_action"


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

 describe("IsolatePathOpEnvStub 冒烟测测试", function () {
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
    describe("IsolatePathOpEnvStub 接口测试 create_isolate_path_op_env",async()=>{
        it("IsolatePathOpEnvStub 基本流程测试",async()=>{
            let stack = await stack_manager.get_cyfs_satck(test_agent.zone1_ood_app1).stack!
            let op_env =  (await stack.root_state_stub().create_isolate_path_op_env()).unwrap();
            let create_result = (await op_env.create_new(cyfs.ObjectMapSimpleContentType.Map)).unwrap();
            //let root = await op_env.get_current_root();
            //console.info("current_root:",root.unwrap())
            let test_root_path = RandomGenerator.string(10);
            let test1_object = await action_api.PutObjectAction.create_random_text_object(test_agent.zone1_ood_app1,logger);
            let test1_path = `${test_root_path}/${test1_object.desc().object_id().to_base_58()}`;
            let insert_ket = await op_env.insert_with_path(test1_path,test1_object.calculate_id());
            let commit = (await op_env.commit()).unwrap();
            console.info(`${commit.dec_root}`)
            
        })
        it("IsolatePathOpEnvStub 基本流程测试 create_isolate_path_op_env_with_access",async()=>{
            let stack = await stack_manager.get_cyfs_satck(test_agent.zone1_ood_app1).stack!
            let path_acc: cyfs.RootStateOpEnvAccess = {
                path: "/",
                access: cyfs.AccessPermissions.Full
            }
            let op_env = (await stack.root_state_stub().create_isolate_path_op_env_with_access(path_acc)).unwrap();
            let create_result = (await op_env.create_new(cyfs.ObjectMapSimpleContentType.Map)).unwrap();
            //let root = await op_env.get_current_root();
            //console.info("current_root:",root.unwrap())
            let test_root_path = RandomGenerator.string(10);
            let test1_object = await action_api.PutObjectAction.create_random_text_object(test_agent.zone1_ood_app1,logger);
            let test1_path = `${test_root_path}/${test1_object.desc().object_id().to_base_58()}`;
            let insert_ket = await op_env.insert_with_path(test1_path,test1_object.calculate_id());
            let commit = (await op_env.commit()).unwrap();
            console.info(`${commit}`)
            
        })
    })

})

