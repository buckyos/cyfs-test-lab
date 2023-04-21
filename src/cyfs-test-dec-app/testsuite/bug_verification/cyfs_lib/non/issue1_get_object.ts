import assert = require('assert');
import * as cyfs from '../../../../cyfs'

import { StackManager,ActionManager} from "../../../../cyfs-test-util"
import { ErrorCode, RandomGenerator, sleep, Logger } from '../../../../common';
import path = require('path');
import * as addContext from "mochawesome/addContext"
import * as action_api from "../../../../dec-app-action"
import { HandlerRequestObject } from "../../../../dec-app-base"
import { PrepareTransFileRequest } from '../../../../dec-app-action';

const dec_app_1 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device1decapp")
const dec_app_2 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device2decapp")



//  npx mocha .\issue1_get_object.ts --reporter mochawesome --require ts-node/register
//  npx mocha .\issue*.ts --reporter mochawesome --require ts-node/register
describe("【NON-issue1】优化non get_object带inner_path情况下的错误返回值", function () {
    this.timeout(0);
    const stack_manager = StackManager.createInstance();
    let logger: Logger;
    const data_manager = ActionManager.createInstance();
    this.beforeAll(async function () {
        //测试前置条件，连接测试模拟器设备
        await stack_manager.init();
        logger = stack_manager.logger!;
        await sleep(5000);
        // 所有节点 实例化一个 Http Requestor dec_app_1 协议栈
        let dec_app_1_client = await stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.Http, dec_app_1);
        let dec_app_2_client = await stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.WebSocket, dec_app_2);
        assert.equal(dec_app_1_client.err, 0, dec_app_1_client.log)
        assert.equal(dec_app_2_client.err, 0, dec_app_2_client.log)
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
        // zone1_ood 准备一个 Dir 对象
        let object_id: cyfs.ObjectId;
        let dir_inner_path = "";
        beforeEach(async () => {
            let action = new action_api.PublishDirAction({
                local: {
                    peer_name: "zone1_ood",
                    dec_id: dec_app_1.to_base_58(),
                    type: cyfs.CyfsStackRequestorType.Http
                },
                remote: {
                    peer_name: "zone1_ood",
                    dec_id: dec_app_1.to_base_58(),
                    type: cyfs.CyfsStackRequestorType.Http
                },
                input: {
                    timeout: 200 * 1000,
                    ndn_level: cyfs.NDNAPILevel.Router,
                    non_level: cyfs.NONAPILevel.Router,
                },
                expect: { err: 0 },
            }, logger)
            let result = await action.start({
                rand_file: true,
                file_num: 5,
                chunk_size: 4 * 1024 * 1024,
                file_size: 1*1024 * 1024,
                req_path: "/req_path/issue1_get_object",
                level: cyfs.NDNAPILevel.NDC,
                flags: 1,
            })
            assert.equal(result.err,0,result.log)
            let object_map_id = result.resp!.dir_id!
            let dir_get = await action_api.BuildDirFromObjectMapAction.create_by_parent_remote_noc(action.action,logger).action!.start({
                object_id:object_map_id
            })
            let dir_id = dir_get.resp!.object_id;
            object_id = dir_id;
            let dir_object_get = await action_api.GetObjectAction.create_by_parent_remote_noc(action.action,logger).action!.start({
                object_id:dir_id,
            })
            let dir_object =  new cyfs.DirDecoder().from_raw(dir_object_get.resp!.object_raw!).unwrap() 
            dir_object.desc().content().obj_list().match({
                Chunk: (chunk_id: cyfs.ChunkId) => {
                    logger.error(`obj_list in chunk not support yet! ${chunk_id}`);
                },
                ObjList: (obj_list) => {
                    for (const [inner_path, info] of obj_list.object_map().entries()) {
                         if(info.node().is_object_id()){
                            logger!.info(`Dir inner_path=<${inner_path}> object_id =  ${info.node().object_id()}`);
                            dir_inner_path = inner_path.toString();
                         }
                    }
                }})

        })

        it("【验证BUG】non get_object 使用inner_path 路径不存在，返回报错类型 ", async () => {
            let stack = stack_manager.get_cyfs_satck({
                peer_name: "zone1_ood",
                dec_id: dec_app_1.to_base_58(),
                type: cyfs.CyfsStackRequestorType.Http
            }).stack!
            let get_result = await stack.non_service().get_object({
                common: {
                    flags: 1,
                    level: cyfs.NONAPILevel.NON,
                },
                object_id,
                inner_path: "/test_error",
            });
            if(get_result.err){
                assert.equal(get_result.val.code,42,get_result.val.m_msg)
                assert.notStrictEqual(get_result.val.m_msg,"get_object with objectmap and inner_path but not found!",get_result.val.m_msg)
            }else{
                assert.ok(false,`未返回正确错误`)
            }
        })
        it("non get_object 使用inner_path正常流程 ", async () => {
            let stack = stack_manager.get_cyfs_satck({
                peer_name: "zone1_ood",
                dec_id: dec_app_1.to_base_58(),
                type: cyfs.CyfsStackRequestorType.Http
            }).stack!
            let get_result = await stack.non_service().get_object({
                common: {
                    flags: 1,
                    level: cyfs.NONAPILevel.NON,
                },
                object_id,
                inner_path: dir_inner_path,
            });
            assert.equal(get_result.err,false,get_result.toString())
        })
        it("non get_object 未使用inner_path正常流程 ", async () => {
            let stack = stack_manager.get_cyfs_satck({
                peer_name: "zone1_ood",
                dec_id: dec_app_1.to_base_58(),
                type: cyfs.CyfsStackRequestorType.Http
            }).stack!
            let get_result = await stack.non_service().get_object({
                common: {
                    flags: 1,
                    level: cyfs.NONAPILevel.NOC,
                },
                object_id,
            });
            assert.equal(get_result.err,false,get_result.toString())
        })
    })


})