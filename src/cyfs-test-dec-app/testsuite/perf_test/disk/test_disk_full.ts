import assert = require('assert');
import * as cyfs from '../../../cyfs'

import { StackManager, CyfsDriverType } from "../../../cyfs-driver-client"
import { ErrorCode, RandomGenerator, sleep ,Logger} from '../../../base';
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
//  npx mocha .\test_trans_scenario.ts --reporter mochawesome --require ts-node/register

describe("CYFS Stack Trans 模块测试", function () {
    this.timeout(0);
    const stack_manager = StackManager.createInstance(CyfsDriverType.other);
   
    let logger : Logger;
    const data_manager = action_api.ActionManager.createInstance();
    this.beforeAll(async function () {
        //测试前置条件，连接测试模拟器设备
        await stack_manager.init();
        logger = stack_manager.logger!;
        await sleep(5000);
        // 所有节点 实例化一个 Http Requestor dec_app_1 协议栈
        await stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.Http, dec_app_1);
        await stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.WebSocket, dec_app_2);
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
            title: `用例: ${current_actions.testcase_id}`,
            value: current_actions.action_list
        };
        addContext.default(this, report_result);
    });

    describe(`验证磁盘写满请求: NON/NDN 数据读取`,async()=>{
        it(`从NOC中读取Object`,async()=>{
            let ood = await stack_manager.get_cyfs_satck({
                peer_name: "zone4_ood",
                dec_id: dec_app_1.to_base_58(),
                type: cyfs.CyfsStackRequestorType.Http
            });
            let satck =  ood.stack!;
            
        })
        it(`从NDC中读取Chunk`,async()=>{

        })
    })
    describe(`验证磁盘写满请求: NON/NDN 数据写入`,async()=>{
        it(`往NOC中写入Object`,async()=>{
            let ood = await stack_manager.get_cyfs_satck({
                peer_name: "zone4_ood",
                dec_id: dec_app_1.to_base_58(),
                type: cyfs.CyfsStackRequestorType.Http
            });
            let satck =  ood.stack!;
            let context_cache  = cyfs.TransContext.new(dec_app_1, "/context_path");
            let context_id = context_cache.desc().calculate_id().to_base_58();
            let chunk_codec_desc : cyfs.ChunkCodecDesc = cyfs.ChunkCodecDesc.Stream();
            let  device_id = satck.local_device_id();
            context_cache.body_expect().content().device_list.push(new cyfs.TransContextDevice(device_id,chunk_codec_desc!));

            // let put_object = satck.non_service().put_object({
            //     common : {}
            //     object: cyfs.NONObjectInfo.,
            // })
        })
        it(`往NDC中写入Chunk`,async()=>{

        })
    })
})