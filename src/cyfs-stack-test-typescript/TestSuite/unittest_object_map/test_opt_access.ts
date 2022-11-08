import assert = require('assert'); 
import {cyfs} from '../../cyfs_node'
import {ZoneSimulator,stringToUint8Array,RandomGenerator,stackInfo,AclManager} from "../../common";
import * as path from 'path';
import { before } from 'mocha';
let encoding = require('encoding');
//初始化日志
cyfs.clog.enable_file_log({
    name: "unittest_object_map",
    dir: cyfs.get_app_log_dir("unittest_object_map"),
    file_max_size: 1024 * 1024 *10,
    file_max_count: 10,
});

let stack:cyfs.SharedCyfsStack;

describe("#op-env access 获取object_map",function(){
    this.timeout(0);
    this.beforeAll(async function(){
        //测试前置条件，连接测试模拟器设备
        console.info(`##########用例执开始执行`);
        await ZoneSimulator.init();
        stack = ZoneSimulator.zone1_ood_stack!;;
    })
    this.afterAll(async ()=>{
        //每个函数执行前，清除所有handler
        console.info(`#########用例执行完成`);
        ZoneSimulator.stopZoneSimulator();
    })
    describe("## access 初始化方式",async()=>{
        describe("### root_state_access",async()=>{
            let op_env : cyfs.PathOpEnvStub
            let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
            before(async()=>{
                let result= await stack.root_state_stub().create_path_op_env();
                assert.ok(!result.err);
                op_env = result.unwrap();

                for(let i=0;i<10;i++){
                    let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
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
                    let  result= await stack.root_state_access().get_category();
                    console.info(JSON.stringify(result))
                })
            })
            describe("#### get_category接口",async()=>{
                it("接口调用正常流程",async()=>{
                    let  result= await stack.root_state_access().get_dec_id();
                    console.info(JSON.stringify(result))
                    assert.ok(result == ZoneSimulator.APPID)
                })
            })
            describe("#### get_object_by_path 接口",async()=>{
                
                it("接口调用正常流程",async()=>{
                    let  result= await stack.root_state_access().get_object_by_path({
                        common: {
                            dec_id: ZoneSimulator.APPID,
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
                    let result= await stack.root_state_access().list({
                        common: {
                            dec_id: ZoneSimulator.APPID,
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
        describe("### root_state_access_stub",async()=>{
            let op_env : cyfs.PathOpEnvStub
            let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
            before(async()=>{
                let result= await stack.root_state_stub().create_path_op_env();
                assert.ok(!result.err);
                op_env = result.unwrap();

                for(let i=0;i<10;i++){
                    let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
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
                    let result= await stack.root_state_access_stub().get_object_by_path(my_path);
                    console.info(JSON.stringify(result))
                    assert.ok(!result.err)
                })
            })
            describe("#### get_object_by_path 接口",async()=>{
                it("接口调用正常流程",async()=>{
                    let result= await stack.root_state_access_stub().list(my_path,0,5);
                    console.info(JSON.stringify(result))
                    assert.ok(!result.err)
                })
            })
        })
        describe("### local_cache_access",async()=>{
            let op_env : cyfs.PathOpEnvStub
            let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
            before(async()=>{
                let result= await stack.root_state_stub().create_path_op_env();
                assert.ok(!result.err);
                op_env = result.unwrap();

                for(let i=0;i<10;i++){
                    let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
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
                    let  result= await stack.local_cache_access().get_category();
                    console.info(JSON.stringify(result))
                })
            })
            describe("#### get_category接口",async()=>{
                it("接口调用正常流程",async()=>{
                    let  result= await stack.local_cache_access().get_dec_id();
                    console.info(JSON.stringify(result))
                    assert.ok(result == ZoneSimulator.APPID)
                })
            })
            describe("#### get_object_by_path 接口",async()=>{
                
                it("接口调用正常流程",async()=>{
                    let  result= await stack.local_cache_access().get_object_by_path({
                        common: {
                            dec_id: ZoneSimulator.APPID,
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
                    let result= await stack.local_cache_access().list({
                        common: {
                            dec_id: ZoneSimulator.APPID,
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
        describe("### local_cache_access_stub",async()=>{
            let op_env : cyfs.PathOpEnvStub
            let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
            before(async()=>{
                let result= await stack.root_state_stub().create_path_op_env();
                assert.ok(!result.err);
                op_env = result.unwrap();

                for(let i=0;i<10;i++){
                    let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
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
                    let result= await stack.local_cache_access_stub().get_object_by_path(my_path);
                    console.info(JSON.stringify(result))
                    assert.ok(!result.err)
                })
            })
            describe("#### list 接口",async()=>{
                it("接口调用正常流程",async()=>{
                    let result= await stack.local_cache_access_stub().list(my_path,0,5);
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
            before(async()=>{
                let result= await stack.root_state_stub().create_path_op_env();
                assert.ok(!result.err);
                op_env = result.unwrap();

                for(let i=0;i<10;i++){
                    let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
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
                    let result= await stack.local_cache_access_stub().get_object_by_path(my_path);
                    console.info(JSON.stringify(result))
                    assert.ok(!result.err)
                })
            })
            describe("#### list 接口",async()=>{
                it("接口调用正常流程",async()=>{
                    let result= await stack.local_cache_access_stub().list(my_path,0,5);
                    console.info(JSON.stringify(result))
                    assert.ok(!result.err)
                })
            }) 
        })
        describe("#### Set数据获取",async()=>{
            let op_env : cyfs.PathOpEnvStub
            let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
            before(async()=>{
                let result= await stack.root_state_stub().create_path_op_env();
                assert.ok(!result.err);
                op_env = result.unwrap();
                for(let i=0;i<10;i++){
                    let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
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
                    let result= await stack.local_cache_access_stub().get_object_by_path(my_path);
                    console.info(JSON.stringify(result))
                    assert.ok(!result.err)
                })
            })
            describe("#### list 接口",async()=>{
                it("接口调用正常流程",async()=>{
                    let result= await stack.local_cache_access_stub().list(my_path,0,5);
                    console.info(JSON.stringify(result))
                    assert.ok(!result.err)
                })
            })
            
        })
    

        describe("### 权限路由机制",async()=>{
            describe("### runtime发起操作",async()=>{
                

                describe("### runtime发起操作从跨zone OOD - 配置ACL 可以访问 ",async()=>{
                    let op_env : cyfs.PathOpEnvStub
                    let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                    before(async()=>{
                        let acl = new AclManager();
                        await acl.init();
                        await acl.zone1_device1_acl!.initAclToml(path.join(__dirname,"acl","acceptAll.toml"));
                        await acl.zone1_ood_acl!.initAclToml(path.join(__dirname,"acl","acceptAll.toml"));
                        await acl.zone2_device1_acl!.initAclToml(path.join(__dirname,"acl","acceptAll.toml"));
                        await acl.zone2_ood_acl!.initAclToml(path.join(__dirname,"acl","acceptAll.toml"));
                        await ZoneSimulator.stopZoneSimulator();
                        await ZoneSimulator.init();
                        stack = ZoneSimulator.zone2_ood_stack
                        let result= await stack.root_state_stub().create_path_op_env();
                        assert.ok(!result.err);
                        op_env = result.unwrap();
        
                        for(let i=0;i<10;i++){
                            let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone2_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
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
                    it("get_object_by_path接口调用正常流程",async()=>{
                        let result= await ZoneSimulator.zone1_device1_stack.root_state_access_stub(ZoneSimulator.zone2_ood_stack.local_device_id().object_id).get_object_by_path(my_path);
                        console.info(JSON.stringify(result))
                        assert.ok(!result.err)
                    })
                    it("list接口调用正常流程",async()=>{
                        let result= await ZoneSimulator.zone1_device1_stack.root_state_access_stub(ZoneSimulator.zone2_ood_stack.local_device_id().object_id).list(my_path,0,5);
                        console.info(JSON.stringify(result))
                        assert.ok(!result.err)
                    })
                
                })
                describe("### runtime发起操作从跨zone OOD - 未配置ACL 禁止访问 ",async()=>{
                    let op_env : cyfs.PathOpEnvStub
                    let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                    before(async()=>{
                        let acl = new AclManager();
                        await acl.init();
                        await acl.removeAllAcl();
                        await ZoneSimulator.stopZoneSimulator();
                        await ZoneSimulator.init();
                        stack = ZoneSimulator.zone2_ood_stack
                        let result= await stack.root_state_stub().create_path_op_env();
                        assert.ok(!result.err);
                        op_env = result.unwrap();
        
                        for(let i=0;i<10;i++){
                            let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone2_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
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
                    it("get_object_by_path接口调用正常流程",async()=>{
                        let result= await ZoneSimulator.zone1_device1_stack.root_state_access_stub(ZoneSimulator.zone2_ood_stack.local_device_id().object_id).get_object_by_path(my_path);
                        console.info(JSON.stringify(result))
                        assert.ok(result.err)
                    })
                    it("list接口调用正常流程",async()=>{
                        let result= await ZoneSimulator.zone1_device1_stack.root_state_access_stub(ZoneSimulator.zone2_ood_stack.local_device_id().object_id).list(my_path,0,5);
                        console.info(JSON.stringify(result))
                        assert.ok(result.err)
                    })
                
                })
                describe("### runtime发起操作从跨zone device  - 配置ACL 可以访问",async()=>{
                    let op_env : cyfs.PathOpEnvStub
                    let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                    before(async()=>{
                        let acl = new AclManager();
                        await acl.init();
                        await acl.zone1_device1_acl!.initAclToml(path.join(__dirname,"acl","acceptAll.toml"));
                        await acl.zone1_ood_acl!.initAclToml(path.join(__dirname,"acl","acceptAll.toml"));
                        await acl.zone2_device1_acl!.initAclToml(path.join(__dirname,"acl","acceptAll.toml"));
                        await acl.zone2_ood_acl!.initAclToml(path.join(__dirname,"acl","acceptAll.toml"));
                        await ZoneSimulator.stopZoneSimulator();
                        await ZoneSimulator.init();
                        stack = ZoneSimulator.zone2_device1_stack
                        let result= await stack.root_state_stub().create_path_op_env();
                        assert.ok(!result.err);
                        op_env = result.unwrap();
        
                        for(let i=0;i<10;i++){
                            let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone2_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
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
                    it("get_object_by_path接口调用正常流程",async()=>{
                        let result= await ZoneSimulator.zone1_device1_stack.root_state_access_stub(ZoneSimulator.zone2_device1_stack.local_device_id().object_id).get_object_by_path(my_path);
                        console.info(JSON.stringify(result))
                        assert.ok(!result.err)
                    })
                    it("list接口调用正常流程",async()=>{
                        let result= await ZoneSimulator.zone1_device1_stack.root_state_access_stub(ZoneSimulator.zone2_device1_stack.local_device_id().object_id).list(my_path,0,5);
                        console.info(JSON.stringify(result))
                        assert.ok(!result.err)
                    })
                
                })
                describe("### runtime发起操作从跨zone device  - 未配置ACL 禁止访问",async()=>{
                    let op_env : cyfs.PathOpEnvStub
                    let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                    before(async()=>{
                        let acl = new AclManager();
                        await acl.init();
                        await acl.removeAllAcl();
                        await ZoneSimulator.stopZoneSimulator();
                        await ZoneSimulator.init();
                        stack = ZoneSimulator.zone2_device1_stack
                        let result= await stack.root_state_stub().create_path_op_env();
                        assert.ok(!result.err);
                        op_env = result.unwrap();
        
                        for(let i=0;i<10;i++){
                            let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone2_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
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
                    it("get_object_by_path接口调用正常流程",async()=>{
                        let result= await ZoneSimulator.zone1_device1_stack.root_state_access_stub(ZoneSimulator.zone2_device1_stack.local_device_id().object_id).get_object_by_path(my_path);
                        console.info(JSON.stringify(result))
                        assert.ok(result.err)
                    })
                    it("list接口调用正常流程",async()=>{
                        let result= await ZoneSimulator.zone1_device1_stack.root_state_access_stub(ZoneSimulator.zone2_device1_stack.local_device_id().object_id).list(my_path,0,5);
                        console.info(JSON.stringify(result))
                        assert.ok(result.err)
                    })
                
                })
            
            
            })
            describe("### 主OOD 发起操作",async()=>{
                describe("### OOD 发起操作从跨zone OOD - 配置ACL 可以访问 ",async()=>{
                    let op_env : cyfs.PathOpEnvStub
                    let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                    before(async()=>{
                        let acl = new AclManager();
                        await acl.init();
                        await acl.zone1_device1_acl!.initAclToml(path.join(__dirname,"acl","acceptAll.toml"));
                        await acl.zone1_ood_acl!.initAclToml(path.join(__dirname,"acl","acceptAll.toml"));
                        await acl.zone2_device1_acl!.initAclToml(path.join(__dirname,"acl","acceptAll.toml"));
                        await acl.zone2_ood_acl!.initAclToml(path.join(__dirname,"acl","acceptAll.toml"));
                        await ZoneSimulator.stopZoneSimulator();
                        await ZoneSimulator.init();
                        stack = ZoneSimulator.zone2_ood_stack
                        let result= await stack.root_state_stub().create_path_op_env();
                        assert.ok(!result.err);
                        op_env = result.unwrap();
        
                        for(let i=0;i<10;i++){
                            let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone2_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
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
                    it("get_object_by_path接口调用正常流程",async()=>{
                        let result= await ZoneSimulator.zone1_ood_stack.root_state_access_stub(ZoneSimulator.zone2_ood_stack.local_device_id().object_id).get_object_by_path(my_path);
                        console.info(JSON.stringify(result))
                        assert.ok(!result.err)
                    })
                    it("list接口调用正常流程",async()=>{
                        let result= await ZoneSimulator.zone1_ood_stack.root_state_access_stub(ZoneSimulator.zone2_ood_stack.local_device_id().object_id).list(my_path,0,5);
                        console.info(JSON.stringify(result))
                        assert.ok(!result.err)
                    })
                
                })
                describe("### OOD 发起操作从跨zone OOD - 未配置ACL 禁止访问 ",async()=>{
                    let op_env : cyfs.PathOpEnvStub
                    let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                    before(async()=>{
                        let acl = new AclManager();
                        await acl.init();
                        await acl.removeAllAcl();
                        await ZoneSimulator.stopZoneSimulator();
                        await ZoneSimulator.init();
                        stack = ZoneSimulator.zone2_ood_stack
                        let result= await stack.root_state_stub().create_path_op_env();
                        assert.ok(!result.err);
                        op_env = result.unwrap();
        
                        for(let i=0;i<10;i++){
                            let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone2_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
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
                    it("get_object_by_path接口调用正常流程",async()=>{
                        let result= await ZoneSimulator.zone1_ood_stack.root_state_access_stub(ZoneSimulator.zone2_ood_stack.local_device_id().object_id).get_object_by_path(my_path);
                        console.info(JSON.stringify(result))
                        assert.ok(result.err)
                    })
                    it("list接口调用正常流程",async()=>{
                        let result= await ZoneSimulator.zone1_ood_stack.root_state_access_stub(ZoneSimulator.zone2_ood_stack.local_device_id().object_id).list(my_path,0,5);
                        console.info(JSON.stringify(result))
                        assert.ok(result.err)
                    })
                
                })
                describe("### OOD 发起操作从跨zone device  - 配置ACL 可以访问",async()=>{
                    let op_env : cyfs.PathOpEnvStub
                    let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                    before(async()=>{
                        let acl = new AclManager();
                        await acl.init();
                        await acl.zone1_device1_acl!.initAclToml(path.join(__dirname,"acl","acceptAll.toml"));
                        await acl.zone1_ood_acl!.initAclToml(path.join(__dirname,"acl","acceptAll.toml"));
                        await acl.zone2_device1_acl!.initAclToml(path.join(__dirname,"acl","acceptAll.toml"));
                        await acl.zone2_ood_acl!.initAclToml(path.join(__dirname,"acl","acceptAll.toml"));
                        await ZoneSimulator.stopZoneSimulator();
                        await ZoneSimulator.init();
                        stack = ZoneSimulator.zone2_device1_stack
                        let result= await stack.root_state_stub().create_path_op_env();
                        assert.ok(!result.err);
                        op_env = result.unwrap();
        
                        for(let i=0;i<10;i++){
                            let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone2_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
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
                    it("get_object_by_path接口调用正常流程",async()=>{
                        let result= await ZoneSimulator.zone1_ood_stack.root_state_access_stub(ZoneSimulator.zone2_device1_stack.local_device_id().object_id).get_object_by_path(my_path);
                        console.info(JSON.stringify(result))
                        assert.ok(!result.err)
                    })
                    it("list接口调用正常流程",async()=>{
                        let result= await ZoneSimulator.zone1_ood_stack.root_state_access_stub(ZoneSimulator.zone2_device1_stack.local_device_id().object_id).list(my_path,0,5);
                        console.info(JSON.stringify(result))
                        assert.ok(!result.err)
                    })
                
                })
                describe("### OOD 发起操作从跨zone device  - 未配置ACL 禁止访问",async()=>{
                    let op_env : cyfs.PathOpEnvStub
                    let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                    before(async()=>{
                        let acl = new AclManager();
                        await acl.init();
                        await acl.removeAllAcl();
                        await ZoneSimulator.stopZoneSimulator();
                        await ZoneSimulator.init();
                        stack = ZoneSimulator.zone2_device1_stack
                        let result= await stack.root_state_stub().create_path_op_env();
                        assert.ok(!result.err);
                        op_env = result.unwrap();
        
                        for(let i=0;i<10;i++){
                            let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone2_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
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
                    it("get_object_by_path接口调用正常流程",async()=>{
                        let result= await ZoneSimulator.zone1_ood_stack.root_state_access_stub(ZoneSimulator.zone2_device1_stack.local_device_id().object_id).get_object_by_path(my_path);
                        console.info(JSON.stringify(result))
                        assert.ok(result.err)
                    })
                    it("list接口调用正常流程",async()=>{
                        let result= await ZoneSimulator.zone1_ood_stack.root_state_access_stub(ZoneSimulator.zone2_device1_stack.local_device_id().object_id).list(my_path,0,5);
                        console.info(JSON.stringify(result))
                        assert.ok(result.err)
                    })
                
                })
            
            })

        
        })

    })
    

})


