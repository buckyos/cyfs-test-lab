import assert  from 'assert'; 
import * as cyfs from '../../../../cyfs';
import {RandomGenerator,testLanguage,ESC_char,encodeType,Logger,sleep} from "../../../../common";
import * as path from 'path';

let encoding = require('encoding');

import { StackManager,ActionManager} from "../../../../cyfs-test-util"
import * as action_api from "../../../../dec-app-action"



let stack:cyfs.SharedCyfsStack;
const dec_app_1 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device1decapp")
let owner_id = ""

// npx mocha .\test_opt_access.ts --reporter mochawesome --require ts-node/register

// TO_FIX : root_state_accessor ACL权限控制部分用例未修改，用例为旧的ACL配置文件体系，已删除用例

 describe("root_state 模块: root_state_accessor 测试 ", function () {
    
    const stack_manager = StackManager.createInstance();
    let logger : Logger;
    const data_manager = ActionManager.createInstance();
    beforeAll(async function () {
        //测试前置条件，连接测试模拟器设备
        await stack_manager.init();
        
        await sleep(5000);
        // 所有节点 实例化一个 Http Requestor dec_app_1 协议栈
        let dec_app_1_client =  await stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.Http, dec_app_1);
        assert.equal(dec_app_1_client.err,0,dec_app_1_client.log)
        stack = stack_manager.get_cyfs_satck({
            peer_name: "zone1_ood",
            dec_id: dec_app_1.to_base_58(),
            type: cyfs.CyfsStackRequestorType.Http
        }).stack!;
        owner_id = stack.local_device_id().to_base_58();
        console.info(`############用例执开始执行`);
    })
    afterAll(async () => {
        // 停止测试模拟器
        stack_manager.destory();
        // 停止测试驱动
        await stack_manager.driver!.stop();
        // 保存测试记录
        data_manager.save_history_to_file("E:\\log");
    })
    let report_result: {
        title: string;
        value: any;
    };
    beforeEach(function () {
        // 设置当前用例id 方便日志定位问题
        let testcase_id = `Testcase-${RandomGenerator.string(10)}-${Date.now()}`;
        data_manager.update_current_testcase_id(testcase_id);
        console.info(`\n\n########### ${testcase_id} 开始运行###########\n\n`)
    })
    afterEach(function () {
        // 将当前用例执行记录到history
        let current_actions = data_manager.report_current_actions();
        console.info(`########### ${current_actions.testcase_id} 运行结束`)
        report_result = {
            title: `用例:${current_actions.testcase_id}`,
            value: current_actions.action_list
        };
        // addContext.default(this, report_result);
    })
    describe("## access 初始化方式",async()=>{
        describe("### root_state_access",async()=>{
            let op_env : cyfs.PathOpEnvStub
            let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
            beforeAll(async()=>{
                let result= await stack.root_state_stub().create_path_op_env();
                assert.ok(!result.err);
                op_env = result.unwrap();

                for(let i=0;i<10;i++){
                    let obj1  = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                    let obj_id1 = obj1.desc().object_id();
                    let result1 = await op_env.insert_with_key(my_path,RandomGenerator.string(10),obj_id1);
                    console.info(JSON.stringify(result1))
                    assert.ok(!result1.err)
                }
                let save_update = await op_env.update();
                console.info(JSON.stringify(save_update))
                assert.ok(!save_update.err);

                let save = await op_env.commit();
                console.info(JSON.stringify(save))
                assert.ok(!save.err);

                
            })
                
            describe("#### get_category接口",async()=>{
                it("接口调用正常流程",async()=>{
                    let  result= await stack.root_state().get_category();
                    console.info(JSON.stringify(result))
                })
            })
            describe("#### get_category接口",async()=>{
                it("接口调用正常流程",async()=>{
                    let  result= await stack.root_state_accessor().get_dec_id();
                    console.info(JSON.stringify(result))
                    assert.ok(result == dec_app_1)
                })
            })
            describe("#### get_object_by_path 接口",async()=>{
                
                it("接口调用正常流程",async()=>{
                    let  result= await stack.root_state_accessor().get_object_by_path({
                        common: {
                            dec_id: dec_app_1,
                            flags: 1,
                            target : stack.local_device_id().object_id
                        },
                        inner_path: my_path
                    });
                    console.info(JSON.stringify(result))
                    assert.ok(!result.err);
                    
                })
            })
            describe("#### get_category接口",async()=>{
                it("接口调用正常流程",async()=>{
                    let result= await stack.root_state_accessor().list({
                        common: {
                            dec_id: dec_app_1,
                            flags: 1,
                            target : stack.local_device_id().object_id
                        },
                        inner_path: my_path,
                        page_index: 0,
                        page_size: 5,
                    })
                    console.info(JSON.stringify(result))
                    assert.ok(!result.err)
                })
            })
            
        })
        describe("### root_state_accessor_stub",async()=>{
            let op_env : cyfs.PathOpEnvStub
            let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
            beforeAll(async()=>{
                let result= await stack.root_state_stub().create_path_op_env();
                assert.ok(!result.err);
                op_env = result.unwrap();

                for(let i=0;i<10;i++){
                    let obj1  = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                    let obj_id1 = obj1.desc().object_id();
                    let result1 = await op_env.insert_with_key(my_path,RandomGenerator.string(10),obj_id1);
                    console.info(JSON.stringify(result1))
                    assert.ok(!result1.err)
                }
                let save_update = await op_env.update();
                console.info(JSON.stringify(save_update))
                assert.ok(!save_update.err);

                let save = await op_env.commit();
                console.info(JSON.stringify(save))
                assert.ok(!save.err);

                
            })
            describe("#### get_object_by_path 接口",async()=>{
                it("接口调用正常流程",async()=>{
                    let result= await stack.root_state_accessor_stub().get_object_by_path(my_path);
                    console.info(JSON.stringify(result))
                    assert.ok(!result.err)
                })
            })
            describe("#### get_object_by_path 接口",async()=>{
                it("接口调用正常流程",async()=>{
                    let result= await stack.root_state_accessor_stub().list(my_path,0,5);
                    console.info(JSON.stringify(result))
                    assert.ok(!result.err)
                })
            })
        })
        describe("### local_cache_accessor",async()=>{
            let op_env : cyfs.PathOpEnvStub
            let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
            beforeAll(async()=>{
                let result= await stack.root_state_stub().create_path_op_env();
                assert.ok(!result.err);
                op_env = result.unwrap();

                for(let i=0;i<10;i++){
                    let obj1  = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                    let obj_id1 = obj1.desc().object_id();
                    let result1 = await op_env.insert_with_key(my_path,RandomGenerator.string(10),obj_id1);
                    console.info(JSON.stringify(result1))
                    assert.ok(!result1.err)
                }
                let save_update = await op_env.update();
                console.info(JSON.stringify(save_update))
                assert.ok(!save_update.err);

                let save = await op_env.commit();
                console.info(JSON.stringify(save))
                assert.ok(!save.err);

                
            })
                
            describe("#### get_category接口",async()=>{
                it("接口调用正常流程",async()=>{
                    let  result= await stack.local_cache_accessor().get_category();
                    console.info(JSON.stringify(result))
                })
            })
            describe("#### get_category接口",async()=>{
                it("接口调用正常流程",async()=>{
                    let  result= await stack.local_cache_accessor().get_dec_id();
                    console.info(JSON.stringify(result))
                    assert.ok(result == dec_app_1)
                })
            })
            describe("#### get_object_by_path 接口",async()=>{
                
                it("接口调用正常流程",async()=>{
                    let  result= await stack.local_cache_accessor().get_object_by_path({
                        common: {
                            dec_id: dec_app_1,
                            flags: 1,
                            target : stack.local_device_id().object_id
                        },
                        inner_path: my_path
                    });
                    console.info(JSON.stringify(result))
                    assert.ok(!result.err);
                    
                })
            })
            describe("#### get_category接口",async()=>{
                it("接口调用正常流程",async()=>{
                    let result= await stack.local_cache_accessor().list({
                        common: {
                            dec_id: dec_app_1,
                            flags: 1,
                            target : stack.local_device_id().object_id
                        },
                        inner_path: my_path,
                        page_index: 0,
                        page_size: 5,
                    })
                    console.info(JSON.stringify(result))
                    assert.ok(!result.err)
                })
            })
         
        })
        describe("### local_cache_accessor_stub",async()=>{
            let op_env : cyfs.PathOpEnvStub
            let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
            beforeAll(async()=>{
                let result= await stack.root_state_stub().create_path_op_env();
                assert.ok(!result.err);
                op_env = result.unwrap();

                for(let i=0;i<10;i++){
                    let obj1  = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                    let obj_id1 = obj1.desc().object_id();
                    let result1 = await op_env.insert_with_key(my_path,RandomGenerator.string(10),obj_id1);
                    console.info(JSON.stringify(result1))
                    assert.ok(!result1.err)
                }
                let save_update = await op_env.update();
                console.info(JSON.stringify(save_update))
                assert.ok(!save_update.err);

                let save = await op_env.commit();
                console.info(JSON.stringify(save))
                assert.ok(!save.err);

                
            })
            describe("#### get_object_by_path 接口",async()=>{
                it("接口调用正常流程",async()=>{
                    let result= await stack.local_cache_accessor_stub().get_object_by_path(my_path);
                    console.info(JSON.stringify(result))
                    assert.ok(!result.err)
                })
            })
            describe("#### list 接口",async()=>{
                it("接口调用正常流程",async()=>{
                    let result= await stack.local_cache_accessor_stub().list(my_path,0,5);
                    console.info(JSON.stringify(result))
                    assert.ok(!result.err)
                })
            })    
        })
    })
    describe("## access 获取object_数据",async()=>{
        describe("#### Map数据获取",async()=>{
            let op_env : cyfs.PathOpEnvStub
            let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
            beforeAll(async()=>{
                let result= await stack.root_state_stub().create_path_op_env();
                assert.ok(!result.err);
                op_env = result.unwrap();

                for(let i=0;i<10;i++){
                    let obj1  = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                    let obj_id1 = obj1.desc().object_id();
                    let result1 = await op_env.insert_with_key(my_path,RandomGenerator.string(10),obj_id1);
                    console.info(JSON.stringify(result1))
                    assert.ok(!result1.err)
                }
                let save_update = await op_env.update();
                console.info(JSON.stringify(save_update))
                assert.ok(!save_update.err);
                
                let save = await op_env.commit();
                console.info(JSON.stringify(save))
                assert.ok(!save.err);

                
            })
            
            describe("#### get_object_by_path 接口",async()=>{
                it("接口调用正常流程",async()=>{
                    let result= await stack.local_cache_accessor_stub().get_object_by_path(my_path);
                    console.info(JSON.stringify(result))
                    assert.ok(!result.err)
                })
            })
            describe("#### list 接口",async()=>{
                it("接口调用正常流程",async()=>{
                    let result= await stack.local_cache_accessor_stub().list(my_path,0,5);
                    console.info(JSON.stringify(result))
                    assert.ok(!result.err)
                })
            }) 
        })
        describe("#### Set数据获取",async()=>{
            let op_env : cyfs.PathOpEnvStub
            let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
            beforeAll(async()=>{
                let result= await stack.root_state_stub().create_path_op_env();
                assert.ok(!result.err);
                op_env = result.unwrap();
                for(let i=0;i<10;i++){
                    let obj1  = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(owner_id).unwrap(),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                    let obj_id1 = obj1.desc().object_id();
                    let result1 = await op_env.insert(my_path,obj_id1);
                    console.info(JSON.stringify(result1))
                    assert.ok(!result1.err)
                }
                let save_update = await op_env.update();
                console.info(JSON.stringify(save_update))
                assert.ok(!save_update.err);
                
                let save = await op_env.commit();
                console.info(JSON.stringify(save))
                assert.ok(!save.err);

            })
            describe("#### get_object_by_path 接口",async()=>{
                it("接口调用正常流程",async()=>{
                    let result= await stack.local_cache_accessor_stub().get_object_by_path(my_path);
                    console.info(JSON.stringify(result))
                    assert.ok(!result.err)
                })
            })
            describe("#### list 接口",async()=>{
                it("接口调用正常流程",async()=>{
                    let result= await stack.local_cache_accessor_stub().list(my_path,0,5);
                    console.info(JSON.stringify(result))
                    assert.ok(!result.err)
                })
            })
            
        })

    })
    

})


