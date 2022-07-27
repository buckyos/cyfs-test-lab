import assert = require('assert'); 
import * as cyfs from "../../cyfs_node/cyfs_node"
import {ZoneSimulator,stringToUint8Array,RandomGenerator,testLanguage,ESC_char,encodeType,stackInfo,AclManager} from "../../common";
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

let charts = encoding.convert("fsdsfs的第三款ÕÄÖÜHJ/n/t", "ascii");
/**
 * ascii
 * utf8
 * utf16le
 * ucs2
 * base64
 * latin1
 * binary
 * hex
 */

describe("#字符兼容测试",function(){
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
    describe("## 语言类别",async()=>{
        //testLanguage.length
        for(let i =0 ;i<1;i++){
            describe(`### 语言类型${testLanguage[i].name} 兼容性`,async()=>{
                let my_path = `/qaTest/language1/${RandomGenerator.language(10,Number(i))}`;
                describe(`#### Map数据获取${my_path}`,async()=>{
                    let op_env : cyfs.PathOpEnvStub
                    
                    console.info(`##测试字符集my_path：${my_path}`)
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
                    describe("#### list 接口",async()=>{
                        it("接口调用正常流程",async()=>{
                            let result= await stack.root_state_access_stub().list(my_path,0,5);
                            console.info(JSON.stringify(result))
                            assert.ok(!result.err)
                        })
                    }) 
                })
                my_path = `/qaTest2/language2/${RandomGenerator.language(10,Number(i))}`;
                describe(`#### Set数据获取${my_path}`,async()=>{
                    let op_env : cyfs.PathOpEnvStub
                    before(async()=>{
                        let result= await stack.local_cache_stub().create_path_op_env();
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
            
            })
        }
        
    })
    describe("## 编码格式",async()=>{
        //encodeType.length
        for(let i =0 ;i<encodeType.length;i++){
            describe(`### 编码格式${encodeType[i]} 兼容性`,async()=>{
                let my_path = `/qaTest/encode/${RandomGenerator.string(10)}/${RandomGenerator.encode(10,encodeType[i])}`;
                describe(`#### Map数据获取${my_path}`,async()=>{
                    let op_env : cyfs.PathOpEnvStub
                    
                    
                    before(async()=>{
                        let result= await stack.root_state_stub().create_path_op_env();
                        assert.ok(!result.err);
                        op_env = result.unwrap();
                        console.info(`##测试字符集my_path：${my_path}`)
                        for(let i=0;i<1;i++){
                            let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                            let obj_id1 = obj1.desc().object_id();
                            let key = RandomGenerator.encode(10,encodeType[i])
                            console.info(`${key}`)
                            let result1 = await op_env.insert_with_key(my_path,key,obj_id1);
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
                    describe("#### list 接口",async()=>{
                        it("接口调用正常流程",async()=>{
                            let result= await stack.root_state_access_stub().list(my_path,0,5);
                            console.info(JSON.stringify(result))
                            assert.ok(!result.err)
                        })
                    }) 
                })
                my_path = `/qaTest/encode/${RandomGenerator.string(10)}/${RandomGenerator.encode(10,encodeType[i])}`;
                describe(`#### Set数据获取${my_path}`,async()=>{
                    let op_env : cyfs.PathOpEnvStub
                    before(async()=>{
                        let result= await stack.local_cache_stub().create_path_op_env();
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
            
            })
        }
    })
    describe("## 转义字符",async()=>{
        for(let i =0 ;i<ESC_char.length;i++){
            describe(`### 转义字符 ${ESC_char[i].name} 兼容性`,async()=>{
                let my_path = `/qaTest/charts/${RandomGenerator.string(10)}/${ESC_char[i].char}`;
                describe(`#### Map数据获取${my_path}`,async()=>{
                    let op_env : cyfs.PathOpEnvStub
                    
                    console.info(`##测试字符集my_path：${my_path}`)
                    before(async()=>{
                        let result= await stack.root_state_stub().create_path_op_env();
                        assert.ok(!result.err);
                        op_env = result.unwrap();
            
                        for(let i=0;i<1;i++){
                            let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                            let obj_id1 = obj1.desc().object_id();
                            let result1 = await op_env.insert_with_key(my_path,ESC_char[i].char,obj_id1);
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
                    describe("#### list 接口",async()=>{
                        it("接口调用正常流程",async()=>{
                            let result= await stack.root_state_access_stub().list(my_path,0,5);
                            console.info(JSON.stringify(result))
                            assert.ok(!result.err)
                        })
                    }) 
                })
                my_path = `/qaTest/charts2/${RandomGenerator.string(10)}/${ESC_char[i].char}`;
                describe(`#### Set数据获取${my_path}`,async()=>{
                    let op_env : cyfs.PathOpEnvStub
                    before(async()=>{
                        let result= await stack.local_cache_stub().create_path_op_env();
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
            
            })
        }
    })
    describe("## 特殊字符",async()=>{
        let charList = ["","/"," "] 
        for(let i =0 ;i<charList.length;i++){
            describe(`### 特殊字符 "${charList[i]}" 兼容性`,async()=>{
                let my_path = `/qaTest/speial、${RandomGenerator.string(10)}/${charList[i]}`;
                describe(`#### Map数据获取${my_path} path包含特殊字符`,async()=>{
                    let op_env : cyfs.PathOpEnvStub
                    
                    console.info(`##测试字符集my_path：${my_path}`)
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
                    describe("#### list 接口",async()=>{
                        it("接口调用正常流程",async()=>{
                            let result= await stack.root_state_access_stub().list(my_path,0,5);
                            console.info(JSON.stringify(result))
                            assert.ok(!result.err)
                        })
                    }) 
                })
                my_path = `/qaTest/speial/${RandomGenerator.string(10)}`;
                describe(`#### Map数据获取${my_path} key包含特殊字符`,async()=>{
                    let op_env : cyfs.PathOpEnvStub
                    
                    console.info(`##测试字符集my_path：${my_path}`)
                    before(async()=>{
                        let result= await stack.root_state_stub().create_path_op_env();
                        assert.ok(!result.err);
                        op_env = result.unwrap();
            
                        for(let i=0;i<1;i++){
                            let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                            let obj_id1 = obj1.desc().object_id();
                            let result1 = await op_env.insert_with_key(my_path,charList[i],obj_id1);
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
                    describe("#### list 接口",async()=>{
                        it("接口调用正常流程",async()=>{
                            let result= await stack.root_state_access_stub().list(my_path,0,5);
                            console.info(JSON.stringify(result))
                            assert.ok(!result.err)
                        })
                    }) 
                })

                my_path = `/qaTest/speial/${RandomGenerator.string(10)}/${charList[i]}`;
                describe(`#### Set数据获取${my_path}`,async()=>{
                    let op_env : cyfs.PathOpEnvStub

                    before(async()=>{
                        let result= await stack.local_cache_stub().create_path_op_env();
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
            
            })
        }
    })
    describe("## unicode 字符随机测试100次",async()=>{
        for(let i =0 ;i<100;i++){
            let char = RandomGenerator.unicode(1);
            describe(`### unicode字符 ${char}兼容性`,async()=>{
                let my_path = `/qaTest/unicode/${RandomGenerator.string(10)}/${char}`;
                describe(`#### Map数据获取${my_path}`,async()=>{
                    let op_env : cyfs.PathOpEnvStub
                    
                    console.info(`##测试字符集my_path：${my_path}`)
                    before(async()=>{
                        let result= await stack.root_state_stub().create_path_op_env();
                        assert.ok(!result.err);
                        op_env = result.unwrap();
            
                        for(let i=0;i<10;i++){
                            let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                            let obj_id1 = obj1.desc().object_id();
                            let key = RandomGenerator.unicode(1);
                            let result1 = await op_env.insert_with_key(my_path,key,obj_id1);
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
                    describe("#### list 接口",async()=>{
                        it("接口调用正常流程",async()=>{
                            let result= await stack.root_state_access_stub().list(my_path,0,5);
                            console.info(JSON.stringify(result))
                            assert.ok(!result.err)
                        })
                    }) 
                })
                my_path = `/qaTest/unicode/${RandomGenerator.string(10)}/${char}`;
                describe(`#### Set数据获取${my_path}`,async()=>{
                    let op_env : cyfs.PathOpEnvStub
                    before(async()=>{
                        let result= await stack.local_cache_stub().create_path_op_env();
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
            
            })
        }
    })
    describe("## ascii 字符 随机测试100次",async()=>{
        for(let i =0 ;i<100;i++){
            let char = RandomGenerator.accii(1);
            describe(`### ascii字符 ${char}兼容性`,async()=>{
                let my_path = `/qaTest/ascii/${char}`;
                describe(`#### Map数据获取${my_path}`,async()=>{
                    let op_env : cyfs.PathOpEnvStub
                    
                    console.info(`##测试字符集my_path：${my_path}`)
                    before(async()=>{
                        let result= await stack.root_state_stub().create_path_op_env();
                        assert.ok(!result.err);
                        op_env = result.unwrap();
            
                        for(let i=0;i<10;i++){
                            let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                            let obj_id1 = obj1.desc().object_id();
                            let key = RandomGenerator.accii(1);
                            let result1 = await op_env.insert_with_key(my_path,key,obj_id1);
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
                    describe("#### list 接口",async()=>{
                        it("接口调用正常流程",async()=>{
                            let result= await stack.root_state_access_stub().list(my_path,0,5);
                            console.info(JSON.stringify(result))
                            assert.ok(!result.err)
                        })
                    }) 
                })
                my_path = `/qaTest/ascii/${char}`;
                describe(`#### Set数据获取${my_path}`,async()=>{
                    let op_env : cyfs.PathOpEnvStub
                    before(async()=>{
                        let result= await stack.local_cache_stub().create_path_op_env();
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
            
            })
        }
    })
})

