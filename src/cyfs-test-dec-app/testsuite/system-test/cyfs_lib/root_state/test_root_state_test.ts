import assert  from 'assert'; 
import * as cyfs from '../../../../cyfs';
import {RandomGenerator,testLanguage,ESC_char,encodeType,Logger,sleep} from "../../../../base";
import * as path from 'path';
import { before } from 'mocha';
let encoding = require('encoding');
import * as addContext from "mochawesome/addContext"
import { StackManager, CyfsDriverType } from "../../../../cyfs-driver-client"
import * as action_api from "../../../../common_action"

let stack_a: cyfs.SharedCyfsStack;
let stack_b: cyfs.SharedCyfsStack;

describe("#Beta版 AccessPermissions 功能测试 ", function () {
    this.timeout(0);
    this.beforeAll(async () => {
        //测试前置条件，连接测试模拟器设备
        console.info(`##########用例执开始执行`);

        
    })
    this.afterAll(async () => {
        //每个函数执行前，清除所有handler
        console.info(`#########用例执行完成`);
        //ZoneSimulator.stopZoneSimulator();
    })
    describe("## SharedCyfsStack.root_state_stub AccessPermissions操作", async () => {
        describe("###create_path_op_env root-state的同zone单节点单dec,接口测试", async () => {            
            describe("正常流程AccessPermissions-ReadOnly", async () => {
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadOnly-AccessString.dec_default()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                         
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`

    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.dec_default()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.ReadOnly
                    }
    
                    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadOnly-AccessString.default()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                        
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.default()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    
                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.ReadOnly
                    }
                    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
    
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
      
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadOnly-AccessString.full()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                          
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }
                        
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();

                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadOnly-AccessString.full_except_write()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                         
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full_except_write()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.ReadOnly
                    }
                       
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
    
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadOnly-AccessString.set_group_permissions()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadOnly-AccessString.make()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadOnly-AccessString.constructor()权限组初始化",async() => {})   
            })
            describe("正常流程AccessPermissions-None,", async () => {
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-None-AccessString.dec_default()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                         
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`

    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.dec_default()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.None
                    }
    
                    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-None-AccessString.default()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                        
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.default()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    
                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.None
                    }
                    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
    
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
      
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-None-AccessString.full()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                          
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.None
                    }
                        
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();

                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-None-AccessString.full_except_write()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                         
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full_except_write()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.None
                    }
                       
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
    
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-None-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-None-AccessString.set_group_permissions()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-None-AccessString.make()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-None-AccessString.constructor()权限组初始化",async() => {})      
            })
            describe("正常流程AccessPermissions-CallOnly", async () => {
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-CallOnly-AccessString.dec_default()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                         
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`

    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.dec_default()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.CallOnly
                    }
    
                    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-CallOnly-AccessString.default()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                        
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.default()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    
                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.CallOnly
                    }
                    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
    
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
      
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-CallOnly-AccessString.full()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                          
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.CallOnly
                    }
                        
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();

                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-CallOnly-AccessString.full_except_write()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                         
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full_except_write()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.ReadOnly
                    }
                       
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
    
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-CallOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-CallOnly-AccessString.set_group_permissions()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-CallOnly-AccessString.make()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-CallOnly-AccessString.constructor()权限组初始化",async() => {})                      
            })
            describe("正常流程AccessPermissions-WriteOnly", async () => {
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-WriteOnly-AccessString.dec_default()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                         
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`

    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.dec_default()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.WriteOnly
                    }
    
                    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-WriteOnly-AccessString.default()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                        
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.default()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    
                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.WriteOnly
                    }
                    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
    
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
      
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-WriteOnly-AccessString.full()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                          
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.WriteOnly
                    }
                        
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();

                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-WriteOnly-AccessString.full_except_write()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                         
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full_except_write()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.WriteOnly
                    }
                       
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
    
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-WriteOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-WriteOnly-AccessString.set_group_permissions()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-WriteOnly-AccessString.make()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-WriteOnly-AccessString.constructor()权限组初始化",async() => {})     
            })
            describe("正常流程AccessPermissions-WirteAndCall", async () => {
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-WirteAndCall-AccessString.dec_default()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                         
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`

    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.dec_default()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.WirteAndCall
                    }
    
                    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-WirteAndCall-AccessString.default()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                        
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.default()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    
                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.WirteAndCall
                    }
                    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
    
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
      
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-WirteAndCall-AccessString.full()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                          
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.WirteAndCall
                    }
                        
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();

                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-WirteAndCall-AccessString.full_except_write()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                         
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full_except_write()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.WirteAndCall
                    }
                       
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
    
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-WirteAndCall-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-WirteAndCall-AccessString.set_group_permissions()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-WirteAndCall-AccessString.make()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-WirteAndCall-AccessString.constructor()权限组初始化",async() => {})     

            })
            describe("正常流程AccessPermissions-ReadAndCall", async () => {
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadAndCall-AccessString.dec_default()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                         
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`

    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.dec_default()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.ReadAndCall
                    }
    
                    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadAndCall-AccessString.default()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                        
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.default()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    
                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.ReadAndCall
                    }
                    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
    
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
      
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadAndCall-AccessString.full()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                          
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.ReadAndCall
                    }
                        
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();

                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadAndCall-AccessString.full_except_write()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                         
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full_except_write()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.ReadAndCall
                    }
                       
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
    
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadAndCall-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadAndCall-AccessString.set_group_permissions()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadAndCall-AccessString.make()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadAndCall-AccessString.constructor()权限组初始化",async() => {})
            })
            describe("正常流程AccessPermissions-ReadAndWrite", async () => {
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadAndWrite-AccessString.dec_default()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                         
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`

    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.dec_default()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.ReadAndWrite
                    }
    
                    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadAndWrite-AccessString.default()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                        
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.default()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    
                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.ReadAndWrite
                    }
                    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
    
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
      
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadAndWrite-AccessString.full()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                          
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.ReadAndWrite
                    }   
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();

                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadAndWrite-AccessString.full_except_write()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                         
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full_except_write()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.ReadAndWrite
                    }
                       
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
    
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadAndWrite-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadAndWrite-AccessString.set_group_permissions()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadAndWrite-AccessString.make()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadAndWrite-AccessString.constructor()权限组初始化",async() => {})
            })
            describe("正常流程AccessPermissions-Full", async () => {
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-Full-AccessString.dec_default()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                         
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`

    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.dec_default()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }
    
                    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-Full-AccessString.default()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                        
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.default()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    
                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }
                    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
    
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
      
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-Full-AccessString.full()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                          
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();

                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-Full-AccessString.full()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                         
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full_except_write()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }
                       
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
    
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-Full-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-Full-AccessString.set_group_permissions()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-Full-AccessString.make()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-Full-AccessString.constructor()权限组初始化",async() => {})
            })
        })
        describe("###create_path_op_env root-state的同zone单节点多dec,接口测试", async () => {
            describe("正常流程AccessPermissions-None,", async () => {
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-None-AccessString.dec_default()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                         
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`

    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.dec_default()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.None
                    }
    
                    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    assert.ok(create_result0.err)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    assert.ok(insert_result1.err)
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    assert.ok(set_result1.err)
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    assert.ok(insert_result2.err)
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    assert.ok(!commit_result0 .err)
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
    
                })
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-None-AccessString.default()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                        
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.default()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    
                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.None
                    }
                    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    assert.ok(create_result0.err)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    assert.ok(insert_result1.err)
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    assert.ok(set_result1.err)
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    assert.ok(insert_result2.err)
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    assert.ok(!commit_result0 .err)
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
    
    
                })
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-None-AccessString.full()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                          
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.None
                    }
                        
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    assert.ok(create_result0.err)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    assert.ok(insert_result1.err)
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    assert.ok(set_result1.err)
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    assert.ok(insert_result2.err)
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    assert.ok(!commit_result0 .err)
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
    
    
                })
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-None-AccessString.full_except_write()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                         
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full_except_write()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.None
                    }
                       
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    assert.ok(create_result0.err)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    assert.ok(insert_result1.err)
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    assert.ok(set_result1.err)
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    assert.ok(insert_result2.err)
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    assert.ok(!commit_result0 .err)
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
    
    
                })
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-None-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-None-AccessString.set_group_permissions()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-None-AccessString.make()权限组设定",async() => {})
                // it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-None-AccessString.constructor()权限组初始化",async() => {
                //     console.info(`Access_params.AccessStringp['length'],${Access_params.AccessStringp.OthersDec['length']}`)
                //     for (let i in Access_params.AccessStringp){
                //         console.info(`Access_params0 ${i}`)
                //     for(let j=0; j <= Access_params.AccessStringp[i]['length']-1 ; j++){
                //      //await ZoneSimulator.init();
                //      const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                //      const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                //      const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                //      param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                //      const stack_a = cyfs.SharedCyfsStack.open(param_a);
                //      console.info("decidb",stack_a.dec_id)
                //      await stack_a.online()
     
                //      const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                //      //let stack_b = stack_a.fork_with_new_dec(decid_b);
                //      param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                //      //console.info("decidb",stack_b.dec_id)
                //      const stack_b = cyfs.SharedCyfsStack.open(param_b);
                //      console.info("decidb",stack_b.dec_id) 
                //      await stack_b.online()
                //      let gen_obj = async () => {
                //          return cyfs.TextObject.create(
                //              cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                //              //cyfs.Some(cyfs.ObjectId.from_base_58( ZoneSimulator.zone1_people).unwrap()),
                //              `A${RandomGenerator.string(10)}`,
                //              `A${RandomGenerator.string(10)}`,
                //              `A${RandomGenerator.string(10)}`)
                //          }
                //      let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                //      let key1 = RandomGenerator.string(10);                
                //      let path1 = `/qatest/${key1}/${obj_id1}`
                //      //let path1 = '/test/bug/7126'                          
                //      let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                //      let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                //      let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                //      let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                //      let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
                //      //console.info("zone1_ood_stack_dec_id",stack_a.dec_id)
                //      //console.info("zone1_device1_dec_id",ZoneSimulator.zone1_device1_stack.dec_id)
                //      //console.info("zone1_device2_dec_id",ZoneSimulator.zone1_device2_stack.dec_id)
                //      console.info(`Access_params1 ${i}`)
                //      let acc:cyfs.AccessString = (new cyfs.AccessString(Access_params.AccessStringp.OthersDec[j]))
                //      console.info(`acc_${acc}`)
                //      //acc.set_group_permission(cyfs.AccessGroup.CurrentDevice,cyfs.AccessPermission.Write)
                //      //acc.set_group_permissions(cyfs.AccessGroup.CurrentDevice,cyfs.AccessPermissions.Full)
                    
                //      let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
     
                //      let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
     
                //      let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
     
     
                //      console.info("stub_a_access",stub_a_access)
     
                //      console.info("stub_b_access",stub_b_access)
     
                //      //console.info("cyfs.GlobalStatePathAccessItem.new(path,cyfs.AccessString.full())",JSON.stringify(cyfs.GlobalStatePathAccessItem.new(path,cyfs.AccessString.full()).access))
                //      /*let gstub_access = gstub.add_access(cyfs.GlobalStatePathAccessItem.new_group(path,
                //          (await (ZoneSimulator.zone1_ood_stack.util().get_zone({ common: { flags: 0 } }))).unwrap().zone_id.object_id,
                //          cyfs.DeviceZoneCategory.CurrentDevice,
                //          ZoneSimulator.zone1_device2_stack.local_device_id().object_id,
                //          0))*/
                //      let access: cyfs.RootStateOpEnvAccess = {
                //          path: path1,
                //          access: cyfs.AccessPermissions.Full
                //      }
     
                     
                //      let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
                //      //assert.ok(!op_result.err)
                //      //console.info(`op_result ${JSON.stringify(op_result)}`)    
                     
                //      //console.info("GlobalStateStub dec_root",(await stub.get_dec_root()).unwrap().dec_root)
     
                //      console.info("insert_key",key1)
                //      let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                //      assert.ok(!insert_result0.err)
                //      console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                     
                //      let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                //      console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
     
     
                //      let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                //      console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
     
                //      let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                //      console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
     
                //      let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                //      console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
     
                //      let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                //      console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
       
                //      let update_result0 = await op_env.update()
                //      assert.ok(!update_result0.err)
                //      console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
     
                //      let commit_result0 = await op_env.commit();
                //      console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                //      assert.ok(!commit_result0 .err)
                // }}})
                
            })
            describe("正常流程AccessPermissions-CallOnly", async () => {
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-CallOnly-AccessString.dec_default()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                         
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`

    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.dec_default()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.CallOnly
                    }
    
                    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    assert.ok(create_result0.err)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    assert.ok(insert_result1.err)
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    assert.ok(set_result1.err)
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    assert.ok(insert_result2.err)
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    assert.ok(!commit_result0 .err)
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
    
                })
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-CallOnly-AccessString.default()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                        
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.default()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    
                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.CallOnly
                    }
                    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    assert.ok(create_result0.err)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    assert.ok(insert_result1.err)
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    assert.ok(set_result1.err)
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    assert.ok(insert_result2.err)
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    assert.ok(!commit_result0 .err)
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
    
                })
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-CallOnly-AccessString.full()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                          
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.CallOnly
                    }
                        
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    assert.ok(create_result0.err)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    assert.ok(insert_result1.err)
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    assert.ok(set_result1.err)
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    assert.ok(insert_result2.err)
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    assert.ok(!commit_result0 .err)
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
    
                })
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-CallOnly-AccessString.full_except_write()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                         
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full_except_write()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.ReadOnly
                    }
                       
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    assert.ok(create_result0.err)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    assert.ok(insert_result1.err)
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    assert.ok(set_result1.err)
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    assert.ok(insert_result2.err)
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    assert.ok(!commit_result0 .err)
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
    
                })
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-CallOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-CallOnly-AccessString.set_group_permissions()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-CallOnly-AccessString.make()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-CallOnly-AccessString.constructor()权限组初始化",async() => {})
                    
            })
            describe("正常流程AccessPermissions-WriteOnly", async () => {
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-WriteOnly-AccessString.dec_default()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                         
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`

    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.dec_default()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.WriteOnly
                    }
    
                    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    assert.ok(!commit_result0 .err)
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                })
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-WriteOnly-AccessString.default()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                        
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.default()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    
                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.WriteOnly
                    }
                    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
    
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    assert.ok(!commit_result0 .err)
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    
    
                })
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-WriteOnly-AccessString.full()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                          
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.WriteOnly
                    }
                        
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
    
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    assert.ok(!commit_result0 .err)
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    
    
                })
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-WriteOnly-AccessString.full_except_write()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                         
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full_except_write()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.WriteOnly
                    }
                       
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
    
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    assert.ok(!commit_result0 .err)
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    
    
                })
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-WriteOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-WriteOnly-AccessString.set_group_permissions()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-WriteOnly-AccessString.make()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-WriteOnly-AccessString.constructor()权限组初始化",async() => {})
            })
            describe("正常流程AccessPermissions-WirteAndCall", async () => {
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-WirteAndCall-AccessString.dec_default()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                         
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`

    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.dec_default()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.WirteAndCall
                    }
    
                    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    assert.ok(!commit_result0 .err)
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                })
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-WirteAndCall-AccessString.default()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                        
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.default()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    
                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.WirteAndCall
                    }
                    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    assert.ok(!commit_result0 .err)
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                })
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-WirteAndCall-AccessString.full()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                          
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.WirteAndCall
                    }
                        
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    assert.ok(!commit_result0 .err)
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
    
                })
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-WirteAndCall-AccessString.full_except_write()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                         
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full_except_write()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.WirteAndCall
                    }
                       
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    assert.ok(!commit_result0 .err)
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                })
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-WirteAndCall-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-WirteAndCall-AccessString.set_group_permissions()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-WirteAndCall-AccessString.make()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-WirteAndCall-AccessString.constructor()权限组初始化",async() => {})

            })
            describe("正常流程AccessPermissions-ReadOnly", async () => {
                it.only("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-ReadOnly-AccessString.dec_default()权限组", async () => {

                    const sysdec_id = cyfs.get_system_dec_app().object_id
                    const anydec_id = cyfs.get_anonymous_dec_app().object_id
                    
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    

                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, sysdec_id).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                         
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`

                
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.dec_default()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    
                    //await stack_a.root_state_access_stub(stack_b.local_device_id().object_id,decid_b).get_object_by_path(path1)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }
    
                    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
                    //console.info("root_state_access_stub_path",await stack_a.root_state_access_stub(stack_b.local_device_id().object_id,decid_b).get_object_by_path(path1))
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    assert.ok(create_result0.err)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    assert.ok(insert_result1.err)
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    assert.ok(set_result1.err)
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    assert.ok(insert_result2.err)
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    assert.ok(!commit_result0 .err)
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)

                    
                    
    
                })
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-WirteAndCall-AccessString.default()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                        
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.default()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    
                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.ReadOnly
                    }
                    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    assert.ok(create_result0.err)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    assert.ok(insert_result1.err)
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    assert.ok(set_result1.err)
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    assert.ok(insert_result2.err)
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    assert.ok(!commit_result0 .err)
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
    
                })
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-WirteAndCall-AccessString.full()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                          
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.ReadOnly
                    }
                        
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    assert.ok(create_result0.err)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    assert.ok(insert_result1.err)
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    assert.ok(set_result1.err)
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    assert.ok(insert_result2.err)
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    assert.ok(!commit_result0 .err)
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                })
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-WirteAndCall-AccessString.full_except_write()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                         
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full_except_write()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.ReadOnly
                    }
                       
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    assert.ok(create_result0.err)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    assert.ok(insert_result1.err)
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    assert.ok(set_result1.err)
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    assert.ok(insert_result2.err)
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    assert.ok(!commit_result0 .err)
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                })
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-ReadOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-ReadOnly-AccessString.set_group_permissions()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-ReadOnly-AccessString.make()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone单节点多dec,AccessPermissions-ReadOnly-AccessString.constructor()权限组初始化",async() => {})
                
            })
            describe("正常流程AccessPermissions-ReadAndCall", async () => {
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadAndCall-AccessString.dec_default()", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                         
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`

    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.dec_default()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.ReadAndCall
                    }
    
                    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    assert.ok(create_result0.err)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    assert.ok(insert_result1.err)
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    assert.ok(set_result1.err)
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    assert.ok(insert_result2.err)
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    assert.ok(!commit_result0 .err)
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadAndCall-AccessString.default()", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                        
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.default()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    
                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.ReadAndCall
                    }
                    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    assert.ok(create_result0.err)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    assert.ok(insert_result1.err)
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    assert.ok(set_result1.err)
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    assert.ok(insert_result2.err)
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    assert.ok(!commit_result0 .err)
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadAndCall-AccessString.full()", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                          
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.ReadAndCall
                    }
                        
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    assert.ok(create_result0.err)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    assert.ok(insert_result1.err)
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    assert.ok(set_result1.err)
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    assert.ok(insert_result2.err)
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    assert.ok(!commit_result0 .err)
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadAndCall-AccessString.full_except_write()", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                         
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full_except_write()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.ReadAndCall
                    }
                       
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    assert.ok(create_result0.err)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    assert.ok(insert_result1.err)
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    assert.ok(set_result1.err)
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    assert.ok(insert_result2.err)
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    assert.ok(!commit_result0 .err)
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadAndCall-AccessString.set_group_permission()权限组设定",async() => {
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadAndCall-AccessString.set_group_permissions()权限组设定",async()=> {
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadAndCall-AccessString.make()权限组设定",async() => {
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadAndCall-AccessString.constructor()权限组初始化",async() => {
                })
            })
            describe("正常流程AccessPermissions-ReadAndWrite", async () => {
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadAndWrite-AccessString.dec_default()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                         
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`

    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.dec_default()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.ReadAndWrite
                    }
    
                    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    assert.ok(!commit_result0 .err)
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadAndWrite-AccessString.default()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                        
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.default()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    
                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.ReadAndWrite
                    }
                    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    assert.ok(!commit_result0 .err)
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadAndWrite-AccessString.full()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                          
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.ReadAndWrite
                    }   
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    assert.ok(!commit_result0 .err)
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadAndWrite-AccessString.full_except_write()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                         
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full_except_write()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.ReadAndWrite
                    }
                       
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
    
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadAndWrite-AccessString.set_group_permission()权限组设定",async() => {
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadAndWrite-AccessString.set_group_permissions()权限组设定",async()=> {
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadAndWrite-AccessString.make()权限组设定",async() => {
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-ReadAndWrite-AccessString.constructor()权限组初始化",async() => {
                })
            })
            describe("正常流程AccessPermissions-Full", async () => {
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-Full-AccessString.dec_default()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                         
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`

    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.dec_default()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }
    
                    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    assert.ok(!commit_result0 .err)
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-Full-AccessString.default()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                        
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.default()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    
                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }
                    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    assert.ok(!commit_result0 .err)
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-Full-AccessString.full_except_write()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                          
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    assert.ok(!commit_result0 .err)
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-Full-AccessString.set_group_permission()权限组设定", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                         
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
                   
                    let stub_a_access = await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full_except_write()))
    
                    let stub_b_access = await stack_b.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.root_state_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)

                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }
                       
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
  
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
                    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
      
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    assert.ok(!commit_result0 .err)
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
    
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-Full-AccessString.set_group_permissions()权限组设定", async =>{
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-Full-AccessString.make()权限组设定", async =>{ 
                })
                it("create_path_op_env root-state的同zone单节点单dec,AccessPermissions-Full-AccessString.constructor()权限组初始化", async =>{
                })
            })
        })
        describe("### create_path_op_env root-state的同zone多节点多dec,接口测试", async () => {
            
            describe("正常流程AccessPermissions-ReadOnly", async () => {
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-ReadOnly-AccessString.dec_default()权限组", async () => {
                const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const stack_a = cyfs.SharedCyfsStack.open(param_a);
                console.info("decidb",stack_a.dec_id)
                await stack_a.online()

                const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const stack_b = cyfs.SharedCyfsStack.open(param_b);
                console.info("decidb",stack_b.dec_id) 
                await stack_b.online()
                let gen_obj = async () => {
                    return cyfs.TextObject.create(
                        cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                        `A${RandomGenerator.string(10)}`,
                        `A${RandomGenerator.string(10)}`,
                        `A${RandomGenerator.string(10)}`)
                    }
                let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                let key1 = RandomGenerator.string(10);                
                let path1 = `/qatest/${key1}/${obj_id1}`                       
                let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`

                let acc:cyfs.AccessString = (new cyfs.AccessString(0))

                let stub_a_access = await stack_a.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.dec_default()))

                let stub_b_access = await stack_b.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))

                let b_a_stub  = stack_b.local_cache_stub(stack_a.local_device_id().object_id,decid_a)

                let a_b_stub  = stack_a.local_cache_stub(stack_a.local_device_id().object_id,decid_a)

                console.info("stub_a_access",stub_a_access)

                console.info("stub_b_access",stub_b_access)

                let access: cyfs.RootStateOpEnvAccess = {
                    path: path1,
                    access: cyfs.AccessPermissions.ReadOnly
                }

                let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();

                console.info("insert_key",key1)
                let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                assert.ok(!insert_result0.err)
                console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)

                let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                console.info(`####set_result0 ${JSON.stringify(set_result0)}`)


                let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                console.info(`####create_result0 ${JSON.stringify(create_result0)}`)

                let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)

                let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                console.info(`####create_result0 ${JSON.stringify(set_result1)}`)

                let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)

                let update_result0 = await op_env.update()
                assert.ok(!update_result0.err)
                console.info(`####update_result2 ${JSON.stringify(update_result0)}`)

                let commit_result0 = await op_env.commit();
                console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                assert.ok(!commit_result0 .err)

                })
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-ReadOnly-AccessString.default()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
    
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                       
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
    
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
    
                    let stub_a_access = await stack_a.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.default()))
    
                    let stub_b_access = await stack_b.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
    
                    let b_a_stub  = stack_b.local_cache_stub(stack_a.local_device_id().object_id,decid_a)
    
                    let a_b_stub  = stack_a.local_cache_stub(stack_a.local_device_id().object_id,decid_a)
    
                    console.info("stub_a_access",stub_a_access)
    
                    console.info("stub_b_access",stub_b_access)
    
                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.ReadOnly
                    }
    
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
    
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
    
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
    
    
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
    
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
    
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
    
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
    
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
    
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
    
                })
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-ReadOnly-AccessString.full()权限组", async () => {
                        const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                        const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                        const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                        param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                        const stack_a = cyfs.SharedCyfsStack.open(param_a);
                        console.info("decidb",stack_a.dec_id)
                        await stack_a.online()
        
                        const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                        param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                        const stack_b = cyfs.SharedCyfsStack.open(param_b);
                        console.info("decidb",stack_b.dec_id) 
                        await stack_b.online()
                        let gen_obj = async () => {
                            return cyfs.TextObject.create(
                                cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                                `A${RandomGenerator.string(10)}`,
                                `A${RandomGenerator.string(10)}`,
                                `A${RandomGenerator.string(10)}`)
                            }
                        let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                        let key1 = RandomGenerator.string(10);                
                        let path1 = `/qatest/${key1}/${obj_id1}`                       
                        let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                        let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                        let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                        let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                        let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
        
                        let acc:cyfs.AccessString = (new cyfs.AccessString(0))
        
                        let stub_a_access = await stack_a.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full()))
        
                        let stub_b_access = await stack_b.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
        
                        let b_a_stub  = stack_b.local_cache_stub(stack_a.local_device_id().object_id,decid_a)
        
                        let a_b_stub  = stack_a.local_cache_stub(stack_a.local_device_id().object_id,decid_a)
        
                        console.info("stub_a_access",stub_a_access)
        
                        console.info("stub_b_access",stub_b_access)
        
                        let access: cyfs.RootStateOpEnvAccess = {
                            path: path1,
                            access: cyfs.AccessPermissions.ReadOnly
                        }
        
                        let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
        
                        console.info("insert_key",key1)
                        let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                        assert.ok(!insert_result0.err)
                        console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
        
                        let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                        console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
        
        
                        let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                        console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
        
                        let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                        console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
        
                        let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                        console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
        
                        let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                        console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
        
                        let update_result0 = await op_env.update()
                        assert.ok(!update_result0.err)
                        console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
        
                        let commit_result0 = await op_env.commit();
                        console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                        assert.ok(!commit_result0 .err)
        
                })
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-ReadOnly-AccessString.full_except_write()权限组", async () => {
                            const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                            const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                            const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                            param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                            const stack_a = cyfs.SharedCyfsStack.open(param_a);
                            console.info("decidb",stack_a.dec_id)
                            await stack_a.online()
            
                            const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                            param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                            const stack_b = cyfs.SharedCyfsStack.open(param_b);
                            console.info("decidb",stack_b.dec_id) 
                            await stack_b.online()
                            let gen_obj = async () => {
                                return cyfs.TextObject.create(
                                    cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                                    `A${RandomGenerator.string(10)}`,
                                    `A${RandomGenerator.string(10)}`,
                                    `A${RandomGenerator.string(10)}`)
                                }
                            let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                            let key1 = RandomGenerator.string(10);                
                            let path1 = `/qatest/${key1}/${obj_id1}`                       
                            let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                            let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                            let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                            let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                            let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
            
                            let acc:cyfs.AccessString = (new cyfs.AccessString(0))
            
                            let stub_a_access = await stack_a.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full_except_write()))
            
                            let stub_b_access = await stack_b.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
            
                            let b_a_stub  = stack_b.local_cache_stub(stack_a.local_device_id().object_id,decid_a)
            
                            let a_b_stub  = stack_a.local_cache_stub(stack_a.local_device_id().object_id,decid_a)
            
                            console.info("stub_a_access",stub_a_access)
            
                            console.info("stub_b_access",stub_b_access)
            
                            let access: cyfs.RootStateOpEnvAccess = {
                                path: path1,
                                access: cyfs.AccessPermissions.ReadOnly
                            }
            
                            let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
            
                            console.info("insert_key",key1)
                            let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                            assert.ok(!insert_result0.err)
                            console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
            
                            let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                            console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
            
            
                            let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                            console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
            
                            let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                            console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
            
                            let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                            console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
            
                            let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                            console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
            
                            let update_result0 = await op_env.update()
                            assert.ok(!update_result0.err)
                            console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
            
                            let commit_result0 = await op_env.commit();
                            console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                            assert.ok(!commit_result0 .err)
            
                })
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-ReadOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-ReadOnly-AccessString.set_group_permissions()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-ReadOnly-AccessString.make()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-ReadOnly-AccessString.constructor()权限组初始化",async() => {}) 
            })
            describe("正常流程AccessPermissions-None", async () => {
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-None-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-None-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-None-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-None-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-None-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-None-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-None-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-None-AccessString.set_group_permission()权限组设定",async() => {})
            })
            describe("正常流程AccessPermissions-CallOnly", async () => {
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-CallOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-CallOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-CallOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-CallOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-CallOnlyAccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-CallOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-CallOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-CallOnly-AccessString.set_group_permission()权限组设定",async() => {})
            })
            describe("正常流程AccessPermissions-WriteOnly", async () => {
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-WriteOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-WriteOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-WriteOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-WriteOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-WriteOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-WriteOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-WriteOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-WriteOnly-AccessString.set_group_permission()权限组设定",async() => {})
            })
            describe("正常流程AccessPermissions-WirteAndCall", async () => {
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-WirteAndCall-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-WirteAndCall-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-WirteAndCall-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-WirteAndCall-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-WirteAndCall-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-WirteAndCall-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-WirteAndCall-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-WirteAndCall-AccessString.set_group_permission()权限组设定",async() => {})
            })
            describe("正常流程AccessPermissions-ReadAndCall", async () => {
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-ReadAndCall-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-ReadAndCall-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-ReadAndCall-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-ReadAndCall-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-ReadAndCall-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-ReadAndCall-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-ReadAndCall-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-ReadAndCall-AccessString.set_group_permission()权限组设定",async() => {})
            })
            describe("正常流程AccessPermissions-ReadAndWrite", async () => {
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-ReadAndWrite-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-ReadAndWrite-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-ReadAndWrite-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-ReadAndWrite-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-ReadAndWrite-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-ReadAndWrite-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-ReadAndWrite-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-ReadAndWrite-AccessString.set_group_permission()权限组设定",async() => {})
            })
            describe("正常流程AccessPermissions-Full", async () => {
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-Full-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-Full-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-Full-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-Full-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-Full-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-Full-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-Full-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec,AccessPermissions-Full-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec_sys_id,AccessPermissions-Full-AccessString.constructor()权限组初始化",async() => {})
                it("create_path_op_env root-state的同zone多节点多dec_any_id,AccessPermissions-Full-AccessString.constructor()权限组初始化",async() => {})
            })
        })
        describe("### create_path_op_env local_cache的同zone单节点单dec,接口测试",async() => {
            describe("正常流程AccessPermissions-ReadOnly", async () => {
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-ReadOnly-AccessString.dec_default()权限组", async () => {
                const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const stack_a = cyfs.SharedCyfsStack.open(param_a);
                console.info("decidb",stack_a.dec_id)
                await stack_a.online()
            
                const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const stack_b = cyfs.SharedCyfsStack.open(param_b);
                console.info("decidb",stack_b.dec_id) 
                await stack_b.online()
                let gen_obj = async () => {
                    return cyfs.TextObject.create(
                        cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                        `A${RandomGenerator.string(10)}`,
                        `A${RandomGenerator.string(10)}`,
                        `A${RandomGenerator.string(10)}`)
                    }
                let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                let key1 = RandomGenerator.string(10);                
                let path1 = `/qatest/${key1}/${obj_id1}`                       
                let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
            
                let acc:cyfs.AccessString = (new cyfs.AccessString(0))
            
                let stub_a_access = await stack_a.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.dec_default()))
            
                let stub_b_access = await stack_b.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
            
                let b_a_stub  = stack_b.local_cache_stub(stack_a.local_device_id().object_id,decid_a)
            
                let a_b_stub  = stack_a.local_cache_stub(stack_a.local_device_id().object_id,decid_a)
            
                console.info("stub_a_access",stub_a_access)
            
                console.info("stub_b_access",stub_b_access)
            
                let access: cyfs.RootStateOpEnvAccess = {
                    path: path1,
                    access: cyfs.AccessPermissions.ReadOnly
                }
            
                let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
            
                console.info("insert_key",key1)
                let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                assert.ok(!insert_result0.err)
                console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
            
                let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
            
            
                let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
            
                let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
            
                let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
            
                let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
            
                let update_result0 = await op_env.update()
                assert.ok(!update_result0.err)
                console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
            
                let commit_result0 = await op_env.commit();
                console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                assert.ok(!commit_result0 .err)
            
                })
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-ReadOnly-AccessString.default()权限组", async () => {
                    const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                    const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                    const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                    param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_a = cyfs.SharedCyfsStack.open(param_a);
                    console.info("decidb",stack_a.dec_id)
                    await stack_a.online()
            
                    const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                    param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                    const stack_b = cyfs.SharedCyfsStack.open(param_b);
                    console.info("decidb",stack_b.dec_id) 
                    await stack_b.online()
                    let gen_obj = async () => {
                        return cyfs.TextObject.create(
                            cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`,
                            `A${RandomGenerator.string(10)}`)
                        }
                    let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                    let key1 = RandomGenerator.string(10);                
                    let path1 = `/qatest/${key1}/${obj_id1}`                       
                    let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                    let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                    let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                    let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                    let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
            
                    let acc:cyfs.AccessString = (new cyfs.AccessString(0))
            
                    let stub_a_access = await stack_a.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.default()))
            
                    let stub_b_access = await stack_b.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
            
                    let b_a_stub  = stack_b.local_cache_stub(stack_a.local_device_id().object_id,decid_a)
            
                    let a_b_stub  = stack_a.local_cache_stub(stack_a.local_device_id().object_id,decid_a)
            
                    console.info("stub_a_access",stub_a_access)
            
                    console.info("stub_b_access",stub_b_access)
            
                    let access: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.ReadOnly
                    }
            
                    let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
            
                    console.info("insert_key",key1)
                    let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    assert.ok(!insert_result0.err)
                    console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
            
                    let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                    console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
            
            
                    let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                    console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
            
                    let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
            
                    let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
            
                    let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                    console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
            
                    let update_result0 = await op_env.update()
                    assert.ok(!update_result0.err)
                    console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
            
                    let commit_result0 = await op_env.commit();
                    console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                    assert.ok(!commit_result0 .err)
            
                })
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-ReadOnly-AccessString.full()权限组", async () => {
                        const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                        const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                        const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                        param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                        const stack_a = cyfs.SharedCyfsStack.open(param_a);
                        console.info("decidb",stack_a.dec_id)
                        await stack_a.online()
            
                        const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                        param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                        const stack_b = cyfs.SharedCyfsStack.open(param_b);
                        console.info("decidb",stack_b.dec_id) 
                        await stack_b.online()
                        let gen_obj = async () => {
                            return cyfs.TextObject.create(
                                cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                                `A${RandomGenerator.string(10)}`,
                                `A${RandomGenerator.string(10)}`,
                                `A${RandomGenerator.string(10)}`)
                            }
                        let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                        let key1 = RandomGenerator.string(10);                
                        let path1 = `/qatest/${key1}/${obj_id1}`                       
                        let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                        let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                        let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                        let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                        let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
            
                        let acc:cyfs.AccessString = (new cyfs.AccessString(0))
            
                        let stub_a_access = await stack_a.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full()))
            
                        let stub_b_access = await stack_b.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
            
                        let b_a_stub  = stack_b.local_cache_stub(stack_a.local_device_id().object_id,decid_a)
            
                        let a_b_stub  = stack_a.local_cache_stub(stack_a.local_device_id().object_id,decid_a)
            
                        console.info("stub_a_access",stub_a_access)
            
                        console.info("stub_b_access",stub_b_access)
            
                        let access: cyfs.RootStateOpEnvAccess = {
                            path: path1,
                            access: cyfs.AccessPermissions.ReadOnly
                        }
            
                        let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
            
                        console.info("insert_key",key1)
                        let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                        assert.ok(!insert_result0.err)
                        console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
            
                        let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                        console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
            
            
                        let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                        console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
            
                        let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                        console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
            
                        let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                        console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
            
                        let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                        console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
            
                        let update_result0 = await op_env.update()
                        assert.ok(!update_result0.err)
                        console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
            
                        let commit_result0 = await op_env.commit();
                        console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                        assert.ok(!commit_result0 .err)
            
                })
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-ReadOnly-AccessString.full_except_write()权限组", async () => {
                            const decid_a = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                            const decid_b = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                            const param_a = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, decid_a).unwrap();
                            param_a.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                            const stack_a = cyfs.SharedCyfsStack.open(param_a);
                            console.info("decidb",stack_a.dec_id)
                            await stack_a.online()
            
                            const param_b = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, decid_b).unwrap(); 
                            param_b.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                            const stack_b = cyfs.SharedCyfsStack.open(param_b);
                            console.info("decidb",stack_b.dec_id) 
                            await stack_b.online()
                            let gen_obj = async () => {
                                return cyfs.TextObject.create(
                                    cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                                    `A${RandomGenerator.string(10)}`,
                                    `A${RandomGenerator.string(10)}`,
                                    `A${RandomGenerator.string(10)}`)
                                }
                            let obj_id1:cyfs.ObjectId  =  (await gen_obj()).desc().object_id();               
                            let key1 = RandomGenerator.string(10);                
                            let path1 = `/qatest/${key1}/${obj_id1}`                       
                            let path2 = `/qatest/${path1}/${(await gen_obj()).desc().object_id()}`
                            let path3 = `/qatest/${path2}/${(await gen_obj()).desc().object_id()}`
                            let path4 = `/qatest/${path3}/${(await gen_obj()).desc().object_id()}`
                            let path5 = `/qatest/${path4}/${(await gen_obj()).desc().object_id()}`
                            let path6 = `/qatest/${path5}/${(await gen_obj()).desc().object_id()}`
            
                            let acc:cyfs.AccessString = (new cyfs.AccessString(0))
            
                            let stub_a_access = await stack_a.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,cyfs.AccessString.full_except_write()))
            
                            let stub_b_access = await stack_b.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1,acc))
            
                            let b_a_stub  = stack_b.local_cache_stub(stack_a.local_device_id().object_id,decid_a)
            
                            let a_b_stub  = stack_a.local_cache_stub(stack_a.local_device_id().object_id,decid_a)
            
                            console.info("stub_a_access",stub_a_access)
            
                            console.info("stub_b_access",stub_b_access)
            
                            let access: cyfs.RootStateOpEnvAccess = {
                                path: path1,
                                access: cyfs.AccessPermissions.ReadOnly
                            }
            
                            let op_env =  (await b_a_stub.create_path_op_env_with_access(access)).unwrap();
            
                            console.info("insert_key",key1)
                            let insert_result0 = await op_env.insert_with_key(path1, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                            assert.ok(!insert_result0.err)
                            console.info(`####insert_result0 ${JSON.stringify(insert_result0)}`)
            
                            let set_result0 = await op_env.set_with_key(path2, RandomGenerator.string(10), (await gen_obj()).desc().object_id())
                            console.info(`####set_result0 ${JSON.stringify(set_result0)}`)
            
            
                            let create_result0 = await op_env.create_new_with_path(path3,cyfs.ObjectMapSimpleContentType.Map)
                            console.info(`####create_result0 ${JSON.stringify(create_result0)}`)
            
                            let insert_result1 = await op_env.insert_with_path(path4,(await gen_obj()).desc().object_id())
                            console.info(`####create_result0 ${JSON.stringify(insert_result1)}`)
            
                            let set_result1 = await op_env.set_with_path(path5,(await gen_obj()).desc().object_id())
                            console.info(`####create_result0 ${JSON.stringify(set_result1)}`)
            
                            let insert_result2 = await op_env.insert(path6,(await gen_obj()).desc().object_id())
                            console.info(`####create_result0 ${JSON.stringify(insert_result2)}`)
            
                            let update_result0 = await op_env.update()
                            assert.ok(!update_result0.err)
                            console.info(`####update_result2 ${JSON.stringify(update_result0)}`)
            
                            let commit_result0 = await op_env.commit();
                            console.info(`####commit_result0 ${JSON.stringify(commit_result0)}`)
                            assert.ok(!commit_result0 .err)
            
                })
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-ReadOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-ReadOnly-AccessString.set_group_permissions()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-ReadOnly-AccessString.make()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-ReadOnly-AccessString.constructor()权限组初始化",async() => {}) 
            })
            describe("正常流程AccessPermissions-None", async () => {
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-None-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-None-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-None-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-None-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-None-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-None-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-None-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-None-AccessString.set_group_permission()权限组设定",async() => {})
            })
            describe("正常流程AccessPermissions-CallOnly", async () => {
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-CallOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-CallOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-CallOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-CallOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-CallOnlyAccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-CallOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-CallOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-CallOnly-AccessString.set_group_permission()权限组设定",async() => {})
            })
            describe("正常流程AccessPermissions-WriteOnly", async () => {
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-WriteOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-WriteOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-WriteOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-WriteOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-WriteOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-WriteOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-WriteOnly-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-WriteOnly-AccessString.set_group_permission()权限组设定",async() => {})
            })
            describe("正常流程AccessPermissions-WirteAndCall", async () => {
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-WirteAndCall-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-WirteAndCall-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-WirteAndCall-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-WirteAndCall-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-WirteAndCall-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-WirteAndCall-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-WirteAndCall-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-WirteAndCall-AccessString.set_group_permission()权限组设定",async() => {})
            })
            describe("正常流程AccessPermissions-ReadAndCall", async () => {
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-ReadAndCall-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-ReadAndCall-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-ReadAndCall-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-ReadAndCall-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-ReadAndCall-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-ReadAndCall-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-ReadAndCall-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-ReadAndCall-AccessString.set_group_permission()权限组设定",async() => {})
            })
            describe("正常流程AccessPermissions-ReadAndWrite", async () => {
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-ReadAndWrite-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-ReadAndWrite-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-ReadAndWrite-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-ReadAndWrite-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-ReadAndWrite-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-ReadAndWrite-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-ReadAndWrite-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-ReadAndWrite-AccessString.set_group_permission()权限组设定",async() => {})
            })
            describe("正常流程AccessPermissions-Full", async () => {
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-Full-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-Full-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-Full-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-Full-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-Full-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-Full-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-Full-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec,AccessPermissions-Full-AccessString.set_group_permission()权限组设定",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec_sys_id,AccessPermissions-Full-AccessString.constructor()权限组初始化",async() => {})
                it("create_path_op_env local_cache的同zone单节点单dec_any_id,AccessPermissions-Full-AccessString.constructor()权限组初始化",async() => {})
            })
    
        })
    })
})

