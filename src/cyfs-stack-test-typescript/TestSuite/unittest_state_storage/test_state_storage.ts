import assert = require('assert'); 
import * as cyfs from "../../cyfs_node/cyfs_node"
import {ZoneSimulator,stringToUint8Array,RandomGenerator,stackInfo} from "../../common";
import * as path from 'path';
import { before } from 'mocha';
import { PassThrough } from 'stream';
const sleep = require('util').promisify(setTimeout)

let stack:cyfs.SharedCyfsStack;
let storage:cyfs.StateStorage;

interface storage_para{
    category: cyfs.GlobalStateCategory, 
    path: string, 
    content_type: cyfs.ObjectMapSimpleContentType, 
    target?: cyfs.ObjectId, 
    dec_id?: cyfs.ObjectId

} 

cyfs.clog.enable_file_log({
    name: "unittest_object_map",
    dir: cyfs.get_app_log_dir("unittest_object_map"),
    file_max_size: 1024 * 1024 *10,
    file_max_count: 10,
});

function gen_objid(num:number):Array<cyfs.ObjectId>{
    let objectids:Array<cyfs.ObjectId> = []
    return objectids
}

describe("#state_storage 测试执行",function(){
    this.timeout(0);
    this.beforeAll(async function(){
        //测试前置条件，连接测试模拟器设备      
        console.info(`########用例执开始执行`);
        await ZoneSimulator.init();
        stack = ZoneSimulator.zone1_device1_stack!;
    })
    this.afterAll(async ()=>{
        //每个函数执行前，清除所有handler
        console.info(`########用例执行完成`);
        ZoneSimulator.stopZoneSimulator();
    })
    describe("##StateStorageMap 接口测试",async()=>{
        before(async() => {})
        after(async() => {})
        describe("#function storage",async()=>{
<<<<<<< HEAD
            it("storage_Map_RootState 正常调用,返回storage对象",async()=>{
=======
            it("storage_Map_RootState 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.RootState,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Map,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );

                assert.strictEqual(storage,new cyfs.StateStorageMap(new cyfs.StateStorageMap(new cyfs.StateStorageMap(storage).storage()).storage()).storage());
            })
<<<<<<< HEAD
            it("storage_Map_LocalCache 正常调用,返回storage对象",async()=>{
=======
            it("storage_Map_LocalCache 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.LocalCache,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Map,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                    
                assert.strictEqual(storage,new cyfs.StateStorageMap(new cyfs.StateStorageMap(new cyfs.StateStorageMap(storage).storage()).storage()).storage());
            })
<<<<<<< HEAD
            it("storage_Set_RootState 正常调用,返回storage对象",async()=>{
=======
            it("storage_Set_RootState 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.RootState,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Set,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                    
                assert.strictEqual(storage,new cyfs.StateStorageMap(new cyfs.StateStorageMap(new cyfs.StateStorageMap(storage).storage()).storage()).storage());
            })
<<<<<<< HEAD
            it("storage_Set_LocalCache 正常调用,返回storage对象",async()=>{
=======
            it("storage_Set_LocalCache 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.LocalCache,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Set,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                    
                assert.strictEqual(storage,new cyfs.StateStorageMap(new cyfs.StateStorageMap(new cyfs.StateStorageMap(storage).storage()).storage()).storage());

            })
        })
        describe("#function save",async()=>{
<<<<<<< HEAD
            it("save_Map_RootState 正常调用,多次save",async()=>{
=======
            it("save_Map_RootState 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                let map = new cyfs.StateStorageMap(storage)
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.RootState,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Map,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.set(`${obj0_id}`,obj0_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result1 ${JSON.stringify(set_result0)}`)
                    
                    let save_result1= await map.save()
                    assert.ok(!save_result1.err)
                    console.info(`save_result0 ${JSON.stringify(save_result1)}`)
                    }
            })
<<<<<<< HEAD
            it("save_Map_LocalCache 正常调用,多次save",async()=>{
=======
            it("save_Map_LocalCache 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                //storage.op_data = (await storage.load()).unwrap();
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(10)}`,
                        `${RandomGenerator.string(10)}`,
                        `${RandomGenerator.string(10)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.LocalCache,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Map,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
                    
                    (await storage.init()).unwrap();
                    let save_result0= await new cyfs.StateStorageMap(storage).save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await new cyfs.StateStorageMap(storage).set(`${obj0_id}`,obj0_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result1 ${JSON.stringify(set_result0)}`)
                    
                    let save_result1= await new cyfs.StateStorageMap(storage).save()
                    assert.ok(!save_result1.err)
                    console.info(`save_result0 ${JSON.stringify(save_result1)}`)
                    }

            })
<<<<<<< HEAD
            it("save_Set_RootState 正常调用,多次save",async()=>{
=======
            it("save_Set_RootState 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                //storage.op_data = (await storage.load()).unwrap();
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(10)}`,
                        `${RandomGenerator.string(10)}`,
                        `${RandomGenerator.string(10)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.RootState,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Set,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
                    
                    (await storage.init()).unwrap();
                    let save_result0= await new cyfs.StateStorageMap(storage).save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await new cyfs.StateStorageMap(storage).set(`${obj0_id}`,obj0_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result1 ${JSON.stringify(set_result0)}`)
                    
                    let save_result1= await new cyfs.StateStorageMap(storage).save()
                    assert.ok(!save_result1.err)
                    console.info(`save_result0 ${JSON.stringify(save_result1)}`)
                    }

            })
<<<<<<< HEAD
            it("save_Set_LocalCache 正常调用,多次save",async()=>{
=======
            it("save_Set_LocalCache 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                //storage.op_data = (await storage.load()).unwrap();
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(10)}`,
                        `${RandomGenerator.string(10)}`,
                        `${RandomGenerator.string(10)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.LocalCache,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Set,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
                    
                    (await storage.init()).unwrap();
                    let save_result0= await new cyfs.StateStorageMap(storage).save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await new cyfs.StateStorageMap(storage).set(`${obj0_id}`,obj0_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result1 ${JSON.stringify(set_result0)}`)
                    
                    let save_result1= await new cyfs.StateStorageMap(storage).save()
                    assert.ok(!save_result1.err)
                    console.info(`save_result0 ${JSON.stringify(save_result1)}`)
                    }
            })
        })
        describe("#function abort",async()=>{
<<<<<<< HEAD
            it("abort_Map_RootState  正常调用,多次abort后insert",async()=>{
=======
            it("abort_Map_RootState  正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.RootState,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Map,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
    
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let map = new cyfs.StateStorageMap(storage)
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.insert(`${obj1_id}`,obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)

                    await map.abort()
                    console.info("map.abort()")
                    //assert.ok(!abort_result0.err)
                    //console.info(`save_result0 ${JSON.stringify(abort_result0)}`)

                    
                    let set_result1 = await map.insert(`${obj1_id}`,obj1_id)
                    assert.ok(set_result1.err)
                    console.info(`save_result1 ${JSON.stringify(set_result1)}`)
                }
            })
<<<<<<< HEAD
            it("abort_Map_LocalCache 正常调用,多次abort后insert",async()=>{
=======
            it("abort_Map_LocalCache 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.LocalCache,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Map,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
    
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let map = new cyfs.StateStorageMap(storage)
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.insert(`${obj1_id}`,obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)

                    await map.abort()
                    console.info("map.abort()")
                    //assert.ok(!abort_result0.err)
                    //console.info(`save_result0 ${JSON.stringify(abort_result0)}`)
                   
                    let set_result1 = await map.insert(`${obj1_id}`,obj1_id)
                    assert.ok(set_result1.err)
                    console.info(`save_result1 ${JSON.stringify(set_result1)}`)
                }
            })
<<<<<<< HEAD
            it("abort_Set_RootState  正常调用,多次abort后insert",async()=>{
=======
            it("abort_Set_RootState  正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.RootState,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Set,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
    
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let map = new cyfs.StateStorageMap(storage)
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.insert(`${obj1_id}`,obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)

                    await map.abort()
                    console.info("map.abort()")
                    //assert.ok(!abort_result0.err)
                    //console.info(`save_result0 ${JSON.stringify(abort_result0)}`)

                    
                    let set_result1 = await map.insert(`${obj1_id}`,obj1_id)
                    assert.ok(set_result1.err)
                    console.info(`save_result1 ${JSON.stringify(set_result1)}`)
                }
            })
<<<<<<< HEAD
            it("abort_Set_LocalCache  正常调用,多次abort后insert",async()=>{
=======
            it("abort_Set_LocalCache  正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.LocalCache,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Set,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
    
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let map = new cyfs.StateStorageMap(storage)
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.insert(`${obj1_id}`,obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)

                    await map.abort()
                    console.info("map.abort()")
                    //assert.ok(!abort_result0.err)
                    //console.info(`save_result0 ${JSON.stringify(abort_result0)}`)

                    
                    let set_result1 = await map.insert(`${obj1_id}`,obj1_id)
                    assert.ok(set_result1.err)
                    console.info(`save_result1 ${JSON.stringify(set_result1)}`)
                }
            })
        })
        describe("#function get",async()=>{
<<<<<<< HEAD
            it("get_Map_RootState 正常调用,set后进行get",async()=>{                
=======
            it("get_Map_RootState 正常调用",async()=>{                
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(10)}`,
                        `${RandomGenerator.string(10)}`,
                        `${RandomGenerator.string(10)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.RootState,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Map,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
                    
                    (await storage.init()).unwrap();
                    let save_result0= await new cyfs.StateStorageMap(storage).save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await new cyfs.StateStorageMap(storage).set(`${obj0_id}`,obj0_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result1 ${JSON.stringify(set_result0)}`)
                    
                    let save_result1= await new cyfs.StateStorageMap(storage).save()
                    assert.ok(!save_result1.err)
                    console.info(`save_result0 ${JSON.stringify(save_result1)}`)

<<<<<<< HEAD
                    let get_result0= await new cyfs.StateStorageMap(storage).get(`${obj0_id}`)
=======
                    let get_result0= await new cyfs.StateStorageMap(storage).save()
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                    assert.ok(!get_result0.err)
                    console.info(`get_result0 ${JSON.stringify(get_result0)}`)
                }
            })
<<<<<<< HEAD
            it("get_Map_LocalCache 正常调用,set后进行get",async()=>{
=======
            it("get_Map_LocalCache 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(10)}`,
                        `${RandomGenerator.string(10)}`,
                        `${RandomGenerator.string(10)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.LocalCache,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Map,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
                    
                    (await storage.init()).unwrap();
                    let save_result0= await new cyfs.StateStorageMap(storage).save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await new cyfs.StateStorageMap(storage).set(`${obj0_id}`,obj0_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result1 ${JSON.stringify(set_result0)}`)
                    
                    let save_result1= await new cyfs.StateStorageMap(storage).save()
                    assert.ok(!save_result1.err)
                    console.info(`save_result0 ${JSON.stringify(save_result1)}`)

<<<<<<< HEAD
                    let get_result0= await new cyfs.StateStorageMap(storage).get(`${obj0_id}`)
=======
                    let get_result0= await new cyfs.StateStorageMap(storage).save()
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                    assert.ok(!get_result0.err)
                    console.info(`get_result0 ${JSON.stringify(get_result0)}`)
                }
            })
<<<<<<< HEAD
            it("get_Set_RootState 正常调用,set后进行get",async()=>{
=======
            it("get_Set_RootState 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(10)}`,
                        `${RandomGenerator.string(10)}`,
                        `${RandomGenerator.string(10)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.RootState,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Set,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
                    
                    (await storage.init()).unwrap();
                    let save_result0= await new cyfs.StateStorageMap(storage).save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await new cyfs.StateStorageMap(storage).set(`${obj0_id}`,obj0_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result1 ${JSON.stringify(set_result0)}`)
                    
                    let save_result1= await new cyfs.StateStorageMap(storage).save()
                    assert.ok(!save_result1.err)
                    console.info(`save_result0 ${JSON.stringify(save_result1)}`)

<<<<<<< HEAD
                    let get_result0= await new cyfs.StateStorageMap(storage).get(`${obj0_id}`)
=======
                    let get_result0= await new cyfs.StateStorageMap(storage).save()
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                    assert.ok(!get_result0.err)
                    console.info(`get_result0 ${JSON.stringify(get_result0)}`)
                }
            })
<<<<<<< HEAD
            it("get_Set_LocalCache 正常调用,set后进行get",async()=>{
=======
            it("get_Set_LocalCache 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(10)}`,
                        `${RandomGenerator.string(10)}`,
                        `${RandomGenerator.string(10)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.LocalCache,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Set,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
                    
                    (await storage.init()).unwrap();
                    let save_result0= await new cyfs.StateStorageMap(storage).save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await new cyfs.StateStorageMap(storage).set(`${obj0_id}`,obj0_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result1 ${JSON.stringify(set_result0)}`)
                    
                    let save_result1= await new cyfs.StateStorageMap(storage).save()
                    assert.ok(!save_result1.err)
                    console.info(`save_result0 ${JSON.stringify(save_result1)}`)

<<<<<<< HEAD
                    let get_result0= await new cyfs.StateStorageMap(storage).get(`${obj0_id}`)
=======
                    let get_result0= await new cyfs.StateStorageMap(storage).save()
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                    assert.ok(!get_result0.err)
                    console.info(`get_result0 ${JSON.stringify(get_result0)}`)
                }
            })
        })
        describe("#function set",async()=>{
<<<<<<< HEAD
            it("set_Map_RootState 正常调用,多次set",async()=>{
=======
            it("set_Map_RootState 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.RootState,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Map,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
    
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let map = new cyfs.StateStorageMap(storage)
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.set(`${obj1_id}`,obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)

                    await map.abort()
                    console.info("map.abort()")
                    //assert.ok(!abort_result0.err)
                    //console.info(`save_result0 ${JSON.stringify(abort_result0)}`)

                    
                    let set_result1 = await map.set(`${obj1_id}`,obj1_id)
                    assert.ok(set_result1.err)
                    console.info(`save_result1 ${JSON.stringify(set_result1)}`)
                }
            })
<<<<<<< HEAD
            it("set_Map_LocalCache 正常调用,多次set",async()=>{
=======
            it("set_Map_LocalCache 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.LocalCache,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Map,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
    
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let map = new cyfs.StateStorageMap(storage)
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.set(`${obj1_id}`,obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)

                    await map.abort()
                    console.info("map.abort()")
                    //assert.ok(!abort_result0.err)
                    //console.info(`save_result0 ${JSON.stringify(abort_result0)}`)

                    
                    let set_result1 = await map.set(`${obj1_id}`,obj1_id)
                    assert.ok(set_result1.err)
                    console.info(`save_result1 ${JSON.stringify(set_result1)}`)
                }
            })
<<<<<<< HEAD
            it("set_Set_RootState 正常调用,多次set",async()=>{
=======
            it("set_Set_RootState 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.RootState,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Set,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
    
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let map = new cyfs.StateStorageMap(storage)
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.set(`${obj1_id}`,obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)

                    await map.abort()
                    console.info("map.abort()")
                    //assert.ok(!abort_result0.err)
                    //console.info(`save_result0 ${JSON.stringify(abort_result0)}`)

                    
                    let set_result1 = await map.set(`${obj1_id}`,obj1_id)
                    assert.ok(set_result1.err)
                    console.info(`save_result1 ${JSON.stringify(set_result1)}`)
                }
            })
<<<<<<< HEAD
            it("set_Set_LocalCache 正常调用,多次set",async()=>{
=======
            it("set_Set_LocalCache 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.LocalCache,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Set,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
    
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let map = new cyfs.StateStorageMap(storage)
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.set(`${obj1_id}`,obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)

                    await map.abort()
                    console.info("map.abort()")
                    //assert.ok(!abort_result0.err)
                    //console.info(`save_result0 ${JSON.stringify(abort_result0)}`)

                    
                    let set_result1 = await map.set(`${obj1_id}`,obj1_id)
                    assert.ok(set_result1.err)
                    console.info(`save_result1 ${JSON.stringify(set_result1)}`)
                }
            })
        })
        describe("#function set_ex",async()=>{
<<<<<<< HEAD
            it("set_ex_Map_RootState正常调用,多次set_ex",async()=>{
=======
            it("set_ex_Map_RootState正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.RootState,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Map,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
    
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let map = new cyfs.StateStorageMap(storage)
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.set_ex(`${obj1_id}`,obj1_id,undefined,false)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
                 
                    let set_result1 = await map.set_ex(`${obj2_id}`,obj2_id,obj1_id,true)
                    assert.ok(set_result1.err)
                    console.info(`save_result1 ${JSON.stringify(set_result1)}`)
                }
            })                
<<<<<<< HEAD
            it("set_ex_Map_LocalCache正常调用,多次set_ex",async()=>{
=======
            it("set_ex_Map_LocalCache正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.LocalCache,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Map,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
    
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let map = new cyfs.StateStorageMap(storage)
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.set_ex(`${obj1_id}`,obj1_id,undefined,false)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
                 
                    let set_result1 = await map.set_ex(`${obj2_id}`,obj2_id,obj1_id,true)
                    assert.ok(set_result1.err)
                    console.info(`save_result1 ${JSON.stringify(set_result1)}`)
                    }
            })
<<<<<<< HEAD
            it("set_ex_Set_RootState正常调用,多次set_ex",async()=>{
=======
            it("set_ex_Set_RootState正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.RootState,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Set,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
    
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let map = new cyfs.StateStorageMap(storage)
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.set_ex(`${obj1_id}`,obj1_id,undefined,false)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
                 
                    let set_result1 = await map.set_ex(`${obj2_id}`,obj2_id,obj1_id,true)
                    assert.ok(set_result1.err)
                    console.info(`save_result1 ${JSON.stringify(set_result1)}`)
                }
            })
<<<<<<< HEAD
            it("set_ex_Set_LocalCache正常调用,多次set_ex",async()=>{
=======
            it("set_ex_Set_LocalCache正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.LocalCache,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Set,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
    
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let map = new cyfs.StateStorageMap(storage)
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.set_ex(`${obj1_id}`,obj1_id,undefined,false)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
                 
                    let set_result1 = await map.set_ex(`${obj2_id}`,obj2_id,obj1_id,true)
                    assert.ok(set_result1.err)
                    console.info(`save_result1 ${JSON.stringify(set_result1)}`)
                }
            })  
        })
        describe("#function insert",async()=>{
<<<<<<< HEAD
            it("insert_Map_RootState 正常调用,取消插入后重复插入",async()=>{
=======
            it("insert_Map_RootState 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.RootState,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Map,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
    
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let map = new cyfs.StateStorageMap(storage)
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.insert(`${obj1_id}`,obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)

                    await map.abort()
                    console.info("map.abort()")
                    //assert.ok(!abort_result0.err)
                    //console.info(`save_result0 ${JSON.stringify(abort_result0)}`)

                    
                    let set_result1 = await map.insert(`${obj1_id}`,obj1_id)
                    assert.ok(set_result1.err)
                    console.info(`save_result1 ${JSON.stringify(set_result1)}`)
                }
            })
<<<<<<< HEAD
            it("insert_Map_LocalCache 正常调用,取消插入后重复插入",async()=>{
=======
            it("insert_Map_LocalCache 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.LocalCache,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Map,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
    
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let map = new cyfs.StateStorageMap(storage)
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.insert(`${obj1_id}`,obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)

                    await map.abort()
                    console.info("map.abort()")
                    //assert.ok(!abort_result0.err)
                    //console.info(`save_result0 ${JSON.stringify(abort_result0)}`)

                    
                    let set_result1 = await map.insert(`${obj1_id}`,obj1_id)
                    assert.ok(set_result1.err)
                    console.info(`save_result1 ${JSON.stringify(set_result1)}`)
                }
            })
<<<<<<< HEAD
            it("insert_Set_RootState 正常调用,取消插入后重复插入",async()=>{
=======
            it("insert_Set_RootState 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.RootState,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Set,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
    
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let map = new cyfs.StateStorageMap(storage)
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.insert(`${obj1_id}`,obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)

                    await map.abort()
                    console.info("map.abort()")
                    //assert.ok(!abort_result0.err)
                    //console.info(`save_result0 ${JSON.stringify(abort_result0)}`)

                    
                    let set_result1 = await map.insert(`${obj1_id}`,obj1_id)
                    assert.ok(set_result1.err)
                    console.info(`save_result1 ${JSON.stringify(set_result1)}`)
                }
            })
<<<<<<< HEAD
            it("insert_Set_LocalCache 正常调用,取消插入后重复插入",async()=>{
=======
            it("insert_Set_LocalCache 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.LocalCache,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Set,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
    
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let map = new cyfs.StateStorageMap(storage)
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.insert(`${obj1_id}`,obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)

                    await map.abort()
                    console.info("map.abort()")
                    //assert.ok(!abort_result0.err)
                    //console.info(`save_result0 ${JSON.stringify(abort_result0)}`)

                    
                    let set_result1 = await map.insert(`${obj1_id}`,obj1_id)
                    assert.ok(set_result1.err)
                    console.info(`save_result1 ${JSON.stringify(set_result1)}`)
                }
            })
        })  
        describe("#function remove",async()=>{
<<<<<<< HEAD
            it("remove_Map_RootState正常调用,插入后移除",async()=>{
=======
            it("remove_Map_RootState正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.RootState,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Map,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
    
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let map = new cyfs.StateStorageMap(storage)
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.set(`${obj1_id}`,obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
        
                    let remove_result1 = await map.remove(`${obj1_id}`)
                    assert.ok(remove_result1.err)
                    console.info(`save_result1 ${JSON.stringify(remove_result1)}`)
            }
            })
<<<<<<< HEAD
            it("remove_Map_LocalCache正常调用,插入后移除",async()=>{
=======
            it("remove_Map_LocalCache正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.LocalCache,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Map,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
    
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let map = new cyfs.StateStorageMap(storage)
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.set(`${obj1_id}`,obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
        
                    let remove_result1 = await map.remove(`${obj1_id}`)
                    assert.ok(remove_result1.err)
                    console.info(`save_result1 ${JSON.stringify(remove_result1)}`)
            }
            })
<<<<<<< HEAD
            it("remove_Set_RootState正常调用,插入后移除",async()=>{
=======
            it("remove_Set_RootState正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.RootState,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Set,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
    
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let map = new cyfs.StateStorageMap(storage)
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.set(`${obj1_id}`,obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
        
                    let remove_result1 = await map.remove(`${obj1_id}`)
                    assert.ok(remove_result1.err)
                    console.info(`save_result1 ${JSON.stringify(remove_result1)}`)
            }
            })
<<<<<<< HEAD
            it("remove_Set_LocalCache正常调用,插入后移除",async()=>{
=======
            it("remove_Set_LocalCache正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.RootState,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Set,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
    
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let map = new cyfs.StateStorageMap(storage)
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.set(`${obj1_id}`,obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
        
                    let remove_result1 = await map.remove(`${obj1_id}`)
                    assert.ok(remove_result1.err)
                    console.info(`save_result1 ${JSON.stringify(remove_result1)}`)
            }
            })
        })
<<<<<<< HEAD
        describe("#function next",async()=>{
            it("next_Map_RootState正常调用,查找多次插入结果",async()=>{
=======
        describe("#function next....",async()=>{
            it("next_Map_RootState正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.RootState,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Map,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
<<<<<<< HEAD
                (await storage.init()).unwrap();
                let map = new cyfs.StateStorageMap(storage)
                for(let i=0 ; i<= 99;i++){
                    //storage.op_data = (await storage.load()).unwrap();                   
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 

                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.set(`${obj1_id}`,obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
                  
                    let insert_result1 = await map.insert(`${obj2_id}`,obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let set_ex_result0 = await map.set_ex(`${obj3_id}`,obj3_id,obj2_id,true)
                    assert.ok(set_ex_result0.err)
                    console.info(`save_result1 ${JSON.stringify(set_ex_result0)}`)

                    let save_result1= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result1 ${JSON.stringify(save_result0)}`)
                    
                    assert.ok(!map.next(i))
                    console.info(`map.next(i) ${map.next(i)}`)

                }
            })
            it("next_Map_LocalCache正常调用,查找多次插入结果",async()=>{    
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.LocalCache,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Map,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                (await storage.init()).unwrap();
                let map = new cyfs.StateStorageMap(storage)
                for(let i=0 ; i<= 99;i++){
                    //storage.op_data = (await storage.load()).unwrap();                   
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 

                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.set(`${obj1_id}`,obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
                  
                    let insert_result1 = await map.insert(`${obj2_id}`,obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let set_ex_result0 = await map.set_ex(`${obj3_id}`,obj3_id,obj2_id,true)
                    assert.ok(set_ex_result0.err)
                    console.info(`save_result1 ${JSON.stringify(set_ex_result0)}`)

                    let save_result1= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result1 ${JSON.stringify(save_result0)}`)
                    
                    assert.ok(!map.next(i))
                    console.info(`map.next(i) ${map.next(i)}`)

                }            
            })
            it("next_Set_RootState正常调用,查找多次插入结果",async()=>{   
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.RootState,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Set,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                (await storage.init()).unwrap();
                let map = new cyfs.StateStorageMap(storage)
                for(let i=0 ; i<= 99;i++){
                    //storage.op_data = (await storage.load()).unwrap();                   
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 

                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.set(`${obj1_id}`,obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
                  
                    let insert_result1 = await map.insert(`${obj2_id}`,obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let set_ex_result0 = await map.set_ex(`${obj3_id}`,obj3_id,obj2_id,true)
                    assert.ok(set_ex_result0.err)
                    console.info(`save_result1 ${JSON.stringify(set_ex_result0)}`)

                    let save_result1= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result1 ${JSON.stringify(save_result0)}`)
                    
                    assert.ok(!map.next(i))
                    console.info(`map.next(i) ${map.next(i)}`)

                }            
            })
            it("next_Set_LocalCache正常调用,查找多次插入结果",async()=>{    
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.LocalCache,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Set,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                (await storage.init()).unwrap();
                let map = new cyfs.StateStorageMap(storage)
                for(let i=0 ; i<= 99;i++){
                    //storage.op_data = (await storage.load()).unwrap();                   
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 

                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.set(`${obj1_id}`,obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
                  
                    let insert_result1 = await map.insert(`${obj2_id}`,obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let set_ex_result0 = await map.set_ex(`${obj3_id}`,obj3_id,obj2_id,true)
                    assert.ok(set_ex_result0.err)
                    console.info(`save_result1 ${JSON.stringify(set_ex_result0)}`)

                    let save_result1= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result1 ${JSON.stringify(save_result0)}`)
                    
                    assert.ok(!map.next(i))
                    console.info(`map.next(i) ${map.next(i)}`)

                }           
            })
        })
        describe("#function reset",async()=>{
            it("reset_Map_RootState正常调用,反复reset后多次插入",async()=>{
=======

                (await storage.init()).unwrap();
                //storage.op_data = (await storage.load()).unwrap();
                for(let i=0 ; i<= 99;i++){
                let save_result0= await new cyfs.StateStorageMap(storage).save()
                assert.ok(!save_result0.err)
                console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                
                let save_result1 = await new cyfs.StateStorageMap(storage).set(`${obj0_id}`,obj0_id)
                assert.ok(!save_result1.err)
                console.info(`save_result1 ${JSON.stringify(save_result1)}`)

                let get_result0 = await new cyfs.StateStorageMap(storage).get(`${obj0_id}`)
                assert.ok(!get_result0.err)
                console.info(`save_result1 ${JSON.stringify(get_result0)}`)
            }
            })
            it("next_Map_LocalCache正常调用",async()=>{
                
            })
            it("next_Set_RootState正常调用",async()=>{
                
            })
            it("next_Set_LocalCache正常调用",async()=>{
                
            })
        })
        describe("#function reset....",async()=>{
            it("reset_Map_RootState正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.RootState,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Map,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
<<<<<<< HEAD
                (await storage.init()).unwrap();
                let map = new cyfs.StateStorageMap(storage)
                for(let i=0 ; i<= 99;i++){
                    //storage.op_data = (await storage.load()).unwrap();                   
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 

                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.set(`${obj1_id}`,obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
                  
                    let insert_result1 = await map.insert(`${obj2_id}`,obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let reset_result0 = await map.reset()
                    assert.ok(reset_result0.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let set_ex_result0 = await map.set_ex(`${obj3_id}`,obj3_id,obj2_id,true)
                    assert.ok(set_ex_result0.err)
                    console.info(`insert_result2 ${JSON.stringify(set_ex_result0)}`)

                    let insert_result3= await map.insert(`${obj3_id}`,obj3_id)
                    assert.ok(insert_result3.err)
                    console.info(`insert_result3 ${JSON.stringify(insert_result3)}`)

                    let save_result1= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result1 ${JSON.stringify(save_result1)}`)
                    
                    assert.ok(!map.next(i))
                    console.info(`map.next(i) ${map.next(i)}`)
                }
            })
            it("reset_Map_LocalCache正常调用,反复reset后多次插入",async()=>{
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.LocalCache,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Map,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                (await storage.init()).unwrap();
                let map = new cyfs.StateStorageMap(storage)
                for(let i=0 ; i<= 99;i++){
                    //storage.op_data = (await storage.load()).unwrap();                   
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 

                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.set(`${obj1_id}`,obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
                  
                    let insert_result1 = await map.insert(`${obj2_id}`,obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let reset_result0 = await map.reset()
                    assert.ok(reset_result0.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let set_ex_result0 = await map.set_ex(`${obj3_id}`,obj3_id,obj2_id,true)
                    assert.ok(set_ex_result0.err)
                    console.info(`insert_result2 ${JSON.stringify(set_ex_result0)}`)

                    let insert_result3= await map.insert(`${obj3_id}`,obj3_id)
                    assert.ok(insert_result3.err)
                    console.info(`insert_result3 ${JSON.stringify(insert_result3)}`)

                    let save_result1= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result1 ${JSON.stringify(save_result1)}`)
                    
                    assert.ok(!map.next(i))
                    console.info(`map.next(i) ${map.next(i)}`)
                }


            })
            it("reset_Set_RootState正常调用,反复reset后多次插入",async()=>{
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.RootState,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Set,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                (await storage.init()).unwrap();
                let map = new cyfs.StateStorageMap(storage)
                for(let i=0 ; i<= 99;i++){
                    //storage.op_data = (await storage.load()).unwrap();                   
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 

                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.set(`${obj1_id}`,obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
                  
                    let insert_result1 = await map.insert(`${obj2_id}`,obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let reset_result0 = await map.reset()
                    assert.ok(reset_result0.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let set_ex_result0 = await map.set_ex(`${obj3_id}`,obj3_id,obj2_id,true)
                    assert.ok(set_ex_result0.err)
                    console.info(`insert_result2 ${JSON.stringify(set_ex_result0)}`)

                    let insert_result3= await map.insert(`${obj3_id}`,obj3_id)
                    assert.ok(insert_result3.err)
                    console.info(`insert_result3 ${JSON.stringify(insert_result3)}`)

                    let save_result1= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result1 ${JSON.stringify(save_result1)}`)
                    
                    assert.ok(!map.next(i))
                    console.info(`map.next(i) ${map.next(i)}`)
                }


            })
            it("reset_Set_LocalCache正常调用,反复reset后多次插入",async()=>{
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.LocalCache,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Set,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                (await storage.init()).unwrap();
                let map = new cyfs.StateStorageMap(storage)
                for(let i=0 ; i<= 99;i++){
                    //storage.op_data = (await storage.load()).unwrap();                   
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 

                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.set(`${obj1_id}`,obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
                  
                    let insert_result1 = await map.insert(`${obj2_id}`,obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let reset_result0 = await map.reset()
                    assert.ok(reset_result0.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let set_ex_result0 = await map.set_ex(`${obj3_id}`,obj3_id,obj2_id,true)
                    assert.ok(set_ex_result0.err)
                    console.info(`insert_result2 ${JSON.stringify(set_ex_result0)}`)

                    let insert_result3= await map.insert(`${obj3_id}`,obj3_id)
                    assert.ok(insert_result3.err)
                    console.info(`insert_result3 ${JSON.stringify(insert_result3)}`)

                    let save_result1= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result1 ${JSON.stringify(save_result1)}`)
                    
                    assert.ok(!map.next(i))
                    console.info(`map.next(i) ${map.next(i)}`)
                }
=======

                (await storage.init()).unwrap();
                //storage.op_data = (await storage.load()).unwrap();
                for(let i=0 ; i<= 99;i++){
                let save_result0= await new cyfs.StateStorageMap(storage).save()
                assert.ok(!save_result0.err)
                console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                
                let save_result1 = await new cyfs.StateStorageMap(storage).set(`${obj0_id}`,obj0_id)
                assert.ok(!save_result1.err)
                console.info(`save_result1 ${JSON.stringify(save_result1)}`)

                let get_result0 = await new cyfs.StateStorageMap(storage).get(`${obj0_id}`)
                assert.ok(!get_result0.err)
                console.info(`save_result1 ${JSON.stringify(get_result0)}`)
            }

            })
            it("reset_Map_LocalCache正常调用",async()=>{


            })
            it("reset_Set_RootState正常调用",async()=>{


            })
            it("reset_Set_LocalCache正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                

            })
        })
        describe("#function list",async()=>{
<<<<<<< HEAD
            it("list_Map_RootState正常调用,查找所有插入结果",async()=>{
=======
            it("list_Map_RootState正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.RootState,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Map,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                (await storage.init()).unwrap();
                let map = new cyfs.StateStorageMap(storage)
                for(let i=0 ; i<= 99;i++){
                    //storage.op_data = (await storage.load()).unwrap();                   
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 

                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.set(`${obj1_id}`,obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
                  
                    let insert_result1 = await map.insert(`${obj2_id}`,obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let set_ex_result0 = await map.set_ex(`${obj3_id}`,obj3_id,obj2_id,true)
                    assert.ok(set_ex_result0.err)
                    console.info(`save_result1 ${JSON.stringify(set_ex_result0)}`)

                    let save_result1= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result1 ${JSON.stringify(save_result0)}`)
                }
                let list_result1 = await map.list()
                assert.ok(list_result1.err)
                console.info(`save_result1 ${JSON.stringify(list_result1)}`)

            })
<<<<<<< HEAD
            it("list_Map_LocalCache正常调用,查找所有插入结果",async()=>{
=======
            it("list_Map_LocalCache正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.LocalCache,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Map,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                (await storage.init()).unwrap();
                let map = new cyfs.StateStorageMap(storage)
                for(let i=0 ; i<= 99;i++){
                    //storage.op_data = (await storage.load()).unwrap();                   
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 

                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.set(`${obj1_id}`,obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
                  
                    let insert_result1 = await map.insert(`${obj2_id}`,obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let set_ex_result0 = await map.set_ex(`${obj3_id}`,obj3_id,obj2_id,true)
                    assert.ok(set_ex_result0.err)
                    console.info(`save_result1 ${JSON.stringify(set_ex_result0)}`)

                    let save_result1= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result1 ${JSON.stringify(save_result0)}`)
                }
                let list_result1 = await map.list()
                assert.ok(list_result1.err)
                console.info(`save_result1 ${JSON.stringify(list_result1)}`)
            })
<<<<<<< HEAD
            it("list_Set_RootState正常调用,查找所有插入结果",async()=>{
=======
            it("list_Set_RootState正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.RootState,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Set,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                (await storage.init()).unwrap();
                let map = new cyfs.StateStorageMap(storage)
                for(let i=0 ; i<= 99;i++){
                    //storage.op_data = (await storage.load()).unwrap();                   
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 

                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.set(`${obj1_id}`,obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
                  
                    let insert_result1 = await map.insert(`${obj2_id}`,obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let set_ex_result0 = await map.set_ex(`${obj3_id}`,obj3_id,obj2_id,true)
                    assert.ok(set_ex_result0.err)
                    console.info(`save_result1 ${JSON.stringify(set_ex_result0)}`)

                    let save_result1= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result1 ${JSON.stringify(save_result0)}`)
                }
                let list_result1 = await map.list()
                assert.ok(list_result1.err)
                console.info(`save_result1 ${JSON.stringify(list_result1)}`)
            })
<<<<<<< HEAD
            it("list_Set_LocalCache正常调用,查找所有插入结果",async()=>{
=======
            it("list_Set_LocalCache正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.LocalCache,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Set,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                (await storage.init()).unwrap();
                let map = new cyfs.StateStorageMap(storage)
                for(let i=0 ; i<= 99;i++){
                    //storage.op_data = (await storage.load()).unwrap();                   
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 

                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.set(`${obj1_id}`,obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
                  
                    let insert_result1 = await map.insert(`${obj2_id}`,obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let set_ex_result0 = await map.set_ex(`${obj3_id}`,obj3_id,obj2_id,true)
                    assert.ok(set_ex_result0.err)
                    console.info(`save_result1 ${JSON.stringify(set_ex_result0)}`)

                    let save_result1= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result1 ${JSON.stringify(save_result0)}`)
                }
                let list_result1 = await map.list()
                assert.ok(list_result1.err)
                console.info(`save_result1 ${JSON.stringify(list_result1)}`)
            })
        })
        describe("#function convert_list",async()=>{
<<<<<<< HEAD
            it("convert_list_Map_RootState正常调用,多次插入后进行列表转换",async()=>{
=======
            it("convert_list_Map_RootState正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.RootState,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Map,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                (await storage.init()).unwrap();
                let map = new cyfs.StateStorageMap(storage)
                for(let i=0 ; i<= 99;i++){
                    //storage.op_data = (await storage.load()).unwrap();                   
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 

                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.set(`${obj1_id}`,obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
                  
                    let insert_result1 = await map.insert(`${obj2_id}`,obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let set_ex_result0 = await map.set_ex(`${obj3_id}`,obj3_id,obj2_id,true)
                    assert.ok(set_ex_result0.err)
                    console.info(`save_result1 ${JSON.stringify(set_ex_result0)}`)

                    let save_result1= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result1 ${JSON.stringify(save_result0)}`)
                }
                let list_result0 = await map.list()
                assert.ok(list_result0.err)
                console.info(`save_result1 ${JSON.stringify(list_result0)}`)

                let convert_list_para:cyfs.ObjectMapContentItem = {content_type:cyfs.ObjectMapSimpleContentType.Set}
                let convert_list_result0 = map.convert_list([convert_list_para])
                console.info(`convert_list_result0 ${JSON.stringify(convert_list_result0)}`)

            })
<<<<<<< HEAD
            it("convert_list_Map_LocalCache正常调用,多次插入后进行列表转换",async()=>{
=======
            it("convert_list_Map_LocalCache正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.LocalCache,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Map,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                (await storage.init()).unwrap();
                let map = new cyfs.StateStorageMap(storage)
                for(let i=0 ; i<= 99;i++){
                    //storage.op_data = (await storage.load()).unwrap();                   
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 

                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.set(`${obj1_id}`,obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
                  
                    let insert_result1 = await map.insert(`${obj2_id}`,obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let set_ex_result0 = await map.set_ex(`${obj3_id}`,obj3_id,obj2_id,true)
                    assert.ok(set_ex_result0.err)
                    console.info(`save_result1 ${JSON.stringify(set_ex_result0)}`)

                    let save_result1= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result1 ${JSON.stringify(save_result0)}`)
                }
                let list_result0 = await map.list()
                assert.ok(list_result0.err)
                console.info(`save_result1 ${JSON.stringify(list_result0)}`)

                let convert_list_para:cyfs.ObjectMapContentItem = {content_type:cyfs.ObjectMapSimpleContentType.Set}
                let convert_list_result0 = map.convert_list([convert_list_para])
                console.info(`convert_list_result0 ${JSON.stringify(convert_list_result0)}`)
            })
<<<<<<< HEAD
            it("convert_list_Set_RootState正常调用,多次插入后进行列表转换",async()=>{
=======
            it("convert_list_Set_RootState正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.RootState,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Set,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                (await storage.init()).unwrap();
                let map = new cyfs.StateStorageMap(storage)
                for(let i=0 ; i<= 99;i++){
                    //storage.op_data = (await storage.load()).unwrap();                   
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 

                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.set(`${obj1_id}`,obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
                  
                    let insert_result1 = await map.insert(`${obj2_id}`,obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let set_ex_result0 = await map.set_ex(`${obj3_id}`,obj3_id,obj2_id,true)
                    assert.ok(set_ex_result0.err)
                    console.info(`save_result1 ${JSON.stringify(set_ex_result0)}`)

                    let save_result1= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result1 ${JSON.stringify(save_result0)}`)
                }
                let list_result0 = await map.list()
                assert.ok(list_result0.err)
                console.info(`save_result1 ${JSON.stringify(list_result0)}`)

                let convert_list_para:cyfs.ObjectMapContentItem = {content_type:cyfs.ObjectMapSimpleContentType.Set}
                let convert_list_result0 = map.convert_list([convert_list_para])
                console.info(`convert_list_result0 ${JSON.stringify(convert_list_result0)}`)
            })
<<<<<<< HEAD
            it("convert_list_Set_LocalCache正常调用,多次插入后进行列表转换",async()=>{
=======
            it("convert_list_Set_LocalCache正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.LocalCache,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Set,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                (await storage.init()).unwrap();
                let map = new cyfs.StateStorageMap(storage)
                for(let i=0 ; i<= 99;i++){
                    //storage.op_data = (await storage.load()).unwrap();                   
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 

                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.set(`${obj1_id}`,obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
                  
                    let insert_result1 = await map.insert(`${obj2_id}`,obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let set_ex_result0 = await map.set_ex(`${obj3_id}`,obj3_id,obj2_id,true)
                    assert.ok(set_ex_result0.err)
                    console.info(`save_result1 ${JSON.stringify(set_ex_result0)}`)

                    let save_result1= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result1 ${JSON.stringify(save_result0)}`)
                }
                let list_result0 = await map.list()
                assert.ok(list_result0.err)
                console.info(`save_result1 ${JSON.stringify(list_result0)}`)

                let convert_list_para:cyfs.ObjectMapContentItem = {content_type:cyfs.ObjectMapSimpleContentType.Set}
                let convert_list_result0 = map.convert_list([convert_list_para])
                console.info(`convert_list_result0 ${JSON.stringify(convert_list_result0)}`)
            })
        })
    })
 
    describe("##StateStorageSet 接口测试",async()=>{
        before(async() => {
            let obj0 = cyfs.TextObject.create(cyfs.Some(
                cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                `${RandomGenerator.string(10)}`,
                `${RandomGenerator.string(10)}`,
                `${RandomGenerator.string(10)}`)

            let obj0_id = obj0.desc().object_id() 
            let storage_para0:storage_para = {
                category:cyfs.GlobalStateCategory.RootState,
                path:`/user/friends/${obj0_id}`,
                content_type:cyfs.ObjectMapSimpleContentType.Map,
                target:undefined,
                dec_id:cyfs.get_system_dec_app().object_id}

            let storage = stack.global_state_storage_ex(
                    storage_para0.category,
                    storage_para0.path,
                    storage_para0.content_type,
                    storage_para0.target,
                    storage_para0.dec_id
                );

            assert.strictEqual(storage,new cyfs.StateStorageSet(new cyfs.StateStorageSet(new cyfs.StateStorageSet(storage).storage()).storage()).storage());
        })
        after(async() => {})
<<<<<<< HEAD
        describe.only("#function storage",async()=>{
            it("storage_Map_RootState 正常调用,返回storage对象",async()=>{
=======
        describe("#function storage",async()=>{
            it("storage_Map_RootState 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`)
    
                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.RootState,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Map,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}
    
                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
    
                assert.strictEqual(storage,new cyfs.StateStorageSet(new cyfs.StateStorageSet(new cyfs.StateStorageSet(storage).storage()).storage()).storage());
            })
<<<<<<< HEAD
            it("storage_Map_LocalCache 正常调用,返回storage对象",async()=>{
=======
            it("storage_Map_LocalCache 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`)
    
                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.LocalCache,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Map,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}
    
                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
    
                assert.strictEqual(storage,new cyfs.StateStorageSet(new cyfs.StateStorageSet(new cyfs.StateStorageSet(storage).storage()).storage()).storage());
            })
<<<<<<< HEAD
            it("storage_Set_RootState 正常调用,返回storage对象",async()=>{
=======
            it("storage_Set_RootState 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`)
    
                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.RootState,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Set,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}
    
                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
    
                assert.strictEqual(storage,new cyfs.StateStorageSet(new cyfs.StateStorageSet(new cyfs.StateStorageSet(storage).storage()).storage()).storage());
            })
<<<<<<< HEAD
            it("storage_Set_LocalCache 正常调用,返回storage对象",async()=>{
=======
            it("storage_Set_LocalCache 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`)
    
                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.LocalCache,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Set,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}
    
                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
    
                assert.strictEqual(storage,new cyfs.StateStorageSet(new cyfs.StateStorageSet(new cyfs.StateStorageSet(storage).storage()).storage()).storage());
            })
        })
        describe("#function save",async()=>{
<<<<<<< HEAD
            it("save_Map_RootState 正常调用, 多次save",async()=>{
=======
            it("save_Map_RootState 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                let set = new cyfs.StateStorageSet(storage)
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.RootState,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Map,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let save_result0= await set.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let insert_result0 = await set.insert(obj0_id)
                    assert.ok(!insert_result0.err)
                    console.info(`save_result1 ${JSON.stringify(insert_result0)}`)
                    
                    let save_result1= await set.save()
                    assert.ok(!save_result1.err)
                    console.info(`save_result0 ${JSON.stringify(save_result1)}`)
                    }
            })
<<<<<<< HEAD
            it("save_Map_LocalCache 正常调用,多次save",async()=>{
=======
            it("save_Map_LocalCache 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                let set = new cyfs.StateStorageSet(storage)
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.LocalCache,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Map,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let save_result0= await set.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let insert_result0 = await set.insert(obj0_id)
                    assert.ok(!insert_result0.err)
                    console.info(`save_result1 ${JSON.stringify(insert_result0)}`)
                    
                    let save_result1= await set.save()
                    assert.ok(!save_result1.err)
                    console.info(`save_result0 ${JSON.stringify(save_result1)}`)
                    }
            })
<<<<<<< HEAD
            it("save_Set_RootState 正常调用,多次save",async()=>{
=======
            it("save_Set_RootState 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                let set = new cyfs.StateStorageSet(storage)
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.RootState,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Set,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let save_result0= await set.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let insert_result0 = await set.insert(obj0_id)
                    assert.ok(!insert_result0.err)
                    console.info(`save_result1 ${JSON.stringify(insert_result0)}`)
                    
                    let save_result1= await set.save()
                    assert.ok(!save_result1.err)
                    console.info(`save_result0 ${JSON.stringify(save_result1)}`)
                    }
            })
<<<<<<< HEAD
            it("save_Set_LocalCache 正常调用,多次save",async()=>{
=======
            it("save_Set_LocalCache 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                let set = new cyfs.StateStorageSet(storage)
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.LocalCache,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Set,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let save_result0= await set.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let insert_result0 = await set.insert(obj0_id)
                    assert.ok(!insert_result0.err)
                    console.info(`save_result1 ${JSON.stringify(insert_result0)}`)
                    
                    let save_result1= await set.save()
                    assert.ok(!save_result1.err)
                    console.info(`save_result0 ${JSON.stringify(save_result1)}`)
                    }
            })
        })    
        describe("#function abort",async()=>{
<<<<<<< HEAD
            it("abort_Map_RootState  正常调用,多次abort后插入", async()=>{
=======
            it("abort_Map_RootState  正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.RootState,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Map,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
    
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let set = new cyfs.StateStorageSet(storage)
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id() 
                
                    let save_result0= await set.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await set.insert(obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)

                    await set.abort()
                    console.info("set.abort()")
                    //assert.ok(!abort_result0.err)
                    //console.info(`save_result0 ${JSON.stringify(abort_result0)}`)

                    
                    let set_result1 = await set.insert(obj1_id)
                    assert.ok(set_result1.err)
                    console.info(`save_result1 ${JSON.stringify(set_result1)}`)
                }
            })
<<<<<<< HEAD
            it("abort_Map_LocalCache 正常调用,多次abort后插入",async()=>{
=======
            it("abort_Map_LocalCache 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.LocalCache,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Map,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
    
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let set = new cyfs.StateStorageSet(storage)
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id() 
                
                    let save_result0= await set.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await set.insert(obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)

                    await set.abort()
                    console.info("set.abort()")
                    //assert.ok(!abort_result0.err)
                    //console.info(`save_result0 ${JSON.stringify(abort_result0)}`)

                    
                    let set_result1 = await set.insert(obj1_id)
                    assert.ok(set_result1.err)
                    console.info(`save_result1 ${JSON.stringify(set_result1)}`)
                }
            })
<<<<<<< HEAD
            it("abort_Set_RootState  正常调用,多次abort后插入",async()=>{
=======
            it("abort_Set_RootState  正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.RootState,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Set,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
    
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let set = new cyfs.StateStorageSet(storage)
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id() 
                
                    let save_result0= await set.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await set.insert(obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)

                    await set.abort()
                    console.info("set.abort()")
                    //assert.ok(!abort_result0.err)
                    //console.info(`save_result0 ${JSON.stringify(abort_result0)}`)

                    
                    let set_result1 = await set.insert(obj1_id)
                    assert.ok(set_result1.err)
                    console.info(`save_result1 ${JSON.stringify(set_result1)}`)
                }
            })
<<<<<<< HEAD
            it("abort_Set_LocalCache  正常调用,多次abort后插入",async()=>{
=======
            it("abort_Set_LocalCache  正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.LocalCache,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Set,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
    
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let set = new cyfs.StateStorageSet(storage)
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id() 
                
                    let save_result0= await set.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await set.insert(obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)

                    await set.abort()
                    console.info("set.abort()")
                    //assert.ok(!abort_result0.err)
                    //console.info(`save_result0 ${JSON.stringify(abort_result0)}`)

                    
                    let set_result1 = await set.insert(obj1_id)
                    assert.ok(set_result1.err)
                    console.info(`save_result1 ${JSON.stringify(set_result1)}`)
                }
            })
        })
<<<<<<< HEAD
        describe("#function contains",async()=>{
            it("contains_Map_RootState 正常调用,多次插入及移除及取消后contains",async()=>{
                    let set = new cyfs.StateStorageSet(storage)
                    for(let i=0 ; i<= 99;i++){
                        let obj0 = cyfs.TextObject.create(cyfs.Some(
                            cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                            `${RandomGenerator.string(1000)}`,
                            `${RandomGenerator.string(1000)}`,
                            `${RandomGenerator.string(1000)}`)
        
                        let obj0_id = obj0.desc().object_id() 
                        let storage_para0:storage_para = {
                            category:cyfs.GlobalStateCategory.RootState,
                            path:`/user/friends/${obj0_id}`,
                            content_type:cyfs.ObjectMapSimpleContentType.Map,
                            target:undefined,
                            dec_id:cyfs.get_system_dec_app().object_id}
        
                        let storage = stack.global_state_storage_ex(
                                storage_para0.category,
                                storage_para0.path,
                                storage_para0.content_type,
                                storage_para0.target,
                                storage_para0.dec_id
                            );
                        (await storage.init()).unwrap();
                        //storage.op_data = (await storage.load()).unwrap();
                        let save_result0= await set.save()
                        assert.ok(!save_result0.err)
                        console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                        
                        let insert_result0 = await set.insert(obj0_id)
                        assert.ok(!insert_result0.err)
                        console.info(`save_result1 ${JSON.stringify(insert_result0)}`)
                        
                        let save_result1= await set.save()
                        assert.ok(!save_result1.err)
                        console.info(`save_result0 ${JSON.stringify(save_result1)}`)

                        let contains_result0 =  await set.contains(obj0_id)
                        console.info(`contains_result0 ${JSON.stringify(contains_result0)}`)
                        }
            })
            it("contains_Map_LocalCache 正常调用,多次插入及移除及取消后contains",async()=>{
                let set = new cyfs.StateStorageSet(storage)
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.LocalCache,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Map,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let save_result0= await set.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let insert_result0 = await set.insert(obj0_id)
                    assert.ok(!insert_result0.err)
                    console.info(`save_result1 ${JSON.stringify(insert_result0)}`)
                    
                    let save_result1= await set.save()
                    assert.ok(!save_result1.err)
                    console.info(`save_result0 ${JSON.stringify(save_result1)}`)

                    let contains_result0 =  await set.contains(obj0_id)
                    console.info(`contains_result0 ${JSON.stringify(contains_result0)}`)
                    }
            })
            it("contains_Set_RootState 正常调用,多次插入及移除及取消后contains",async()=>{
                let set = new cyfs.StateStorageSet(storage)
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.RootState,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Set,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let save_result0= await set.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let insert_result0 = await set.insert(obj0_id)
                    assert.ok(!insert_result0.err)
                    console.info(`save_result1 ${JSON.stringify(insert_result0)}`)
                    
                    let save_result1= await set.save()
                    assert.ok(!save_result1.err)
                    console.info(`save_result0 ${JSON.stringify(save_result1)}`)

                    let contains_result0 =  await set.contains(obj0_id)
                    console.info(`contains_result0 ${JSON.stringify(contains_result0)}`)
                    }
            })
            it("contains_Set_LocalCache 正常调用,多次插入及移除及取消后contains",async()=>{
                let set = new cyfs.StateStorageSet(storage)
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.LocalCache,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Set,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let save_result0= await set.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let insert_result0 = await set.insert(obj0_id)
                    assert.ok(!insert_result0.err)
                    console.info(`save_result1 ${JSON.stringify(insert_result0)}`)
                    
                    let save_result1= await set.save()
                    assert.ok(!save_result1.err)
                    console.info(`save_result0 ${JSON.stringify(save_result1)}`)

                    let contains_result0 =  await set.contains(obj0_id)
                    console.info(`contains_result0 ${JSON.stringify(contains_result0)}`)
                }
            })
        })
        describe("#function insert", async()=>{
            it("insert_Map_RootState 正常调用,多次abort后insert",async()=>{
=======
        describe("#function contains....",async()=>{
            it("contains_Map_RootState 正常调用",async()=>{
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.LocalCache,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Map,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                    
                assert.strictEqual(storage,new cyfs.StateStorageMap(new cyfs.StateStorageMap(new cyfs.StateStorageMap(storage).storage()).storage()).storage());             
            })
            it("contains_Map_LocalCache 正常调用",async()=>{
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.LocalCache,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Map,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                    
                assert.strictEqual(storage,new cyfs.StateStorageMap(new cyfs.StateStorageMap(new cyfs.StateStorageMap(storage).storage()).storage()).storage());             
            })
            it("contains_Set_RootState 正常调用",async()=>{
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.LocalCache,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Map,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                    
                assert.strictEqual(storage,new cyfs.StateStorageMap(new cyfs.StateStorageMap(new cyfs.StateStorageMap(storage).storage()).storage()).storage());             
            })
            it("contains_Set_LocalCache 正常调用",async()=>{
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.LocalCache,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Map,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                    
                assert.strictEqual(storage,new cyfs.StateStorageMap(new cyfs.StateStorageMap(new cyfs.StateStorageMap(storage).storage()).storage()).storage());             
            })
        })
        describe("#function insert",async()=>{
            it("insert_Map_RootState 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.RootState,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Map,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
    
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let set = new cyfs.StateStorageSet(storage)
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id() 
                
                    let save_result0= await set.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await set.insert(obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)

                    await set.abort()
                    console.info("set.abort()")
                    //assert.ok(!abort_result0.err)
                    //console.info(`save_result0 ${JSON.stringify(abort_result0)}`)

                    
                    let set_result1 = await set.insert(obj1_id)
                    assert.ok(set_result1.err)
                    console.info(`save_result1 ${JSON.stringify(set_result1)}`)
                }
            })
<<<<<<< HEAD
            it("insert_Map_LocalCache 正常调用,多次abort后insert",async()=>{
=======
            it("insert_Map_LocalCache 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.LocalCache,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Map,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
    
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let set = new cyfs.StateStorageSet(storage)
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id() 
                
                    let save_result0= await set.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await set.insert(obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)

                    await set.abort()
                    console.info("set.abort()")
                    //assert.ok(!abort_result0.err)
                    //console.info(`save_result0 ${JSON.stringify(abort_result0)}`)

                    
                    let set_result1 = await set.insert(obj1_id)
                    assert.ok(set_result1.err)
                    console.info(`save_result1 ${JSON.stringify(set_result1)}`)
                }
            })
<<<<<<< HEAD
            it("insert_Set_RootState 正常调用,多次abort后insert",async()=>{
=======
            it("insert_Set_RootState 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.RootState,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Set,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
    
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let set = new cyfs.StateStorageSet(storage)
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id() 
                
                    let save_result0= await set.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await set.insert(obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)

                    await set.abort()
                    console.info("set.abort()")
                    //assert.ok(!abort_result0.err)
                    //console.info(`save_result0 ${JSON.stringify(abort_result0)}`)

                    
                    let set_result1 = await set.insert(obj1_id)
                    assert.ok(set_result1.err)
                    console.info(`save_result1 ${JSON.stringify(set_result1)}`)
                }
            })
<<<<<<< HEAD
            it("insert_Set_LocalCache 正常调用,多次abort后insert",async()=>{
=======
            it("insert_Set_LocalCache 正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.LocalCache,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Set,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
    
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let set = new cyfs.StateStorageSet(storage)
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id() 
                
                    let save_result0= await set.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await set.insert(obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)

                    await set.abort()
                    console.info("set.abort()")
                    //assert.ok(!abort_result0.err)
                    //console.info(`save_result0 ${JSON.stringify(abort_result0)}`)

                    
                    let set_result1 = await set.insert(obj1_id)
                    assert.ok(set_result1.err)
                    console.info(`save_result1 ${JSON.stringify(set_result1)}`)
                }
            })
        })
        describe("#function remove",async()=>{
<<<<<<< HEAD
            it("remove_Map_RootState正常调用,插入后移除",async()=>{
=======
            it("remove_Map_RootState正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.RootState,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Map,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
    
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let set = new cyfs.StateStorageSet(storage)
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id() 
                
                    let save_result0= await set.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await set.insert(obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
        
                    let remove_result1 = await set.remove(obj1_id)
                    assert.ok(remove_result1.err)
                    console.info(`save_result1 ${JSON.stringify(remove_result1)}`)
            }
            })
<<<<<<< HEAD
            it("remove_Map_LocalCache正常调用,插入后移除",async()=>{
=======
            it("remove_Map_LocalCache正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.LocalCache,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Map,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
    
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let set = new cyfs.StateStorageSet(storage)
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id() 
                
                    let save_result0= await set.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await set.insert(obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
        
                    let remove_result1 = await set.remove(obj1_id)
                    assert.ok(remove_result1.err)
                    console.info(`save_result1 ${JSON.stringify(remove_result1)}`)
            }
            })
<<<<<<< HEAD
            it("remove_Set_RootState正常调用,插入后移除",async()=>{
=======
            it("remove_Set_RootState正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.RootState,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Set,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
    
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let set = new cyfs.StateStorageSet(storage)
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id() 
                
                    let save_result0= await set.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await set.insert(obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
        
                    let remove_result1 = await set.remove(obj1_id)
                    assert.ok(remove_result1.err)
                    console.info(`save_result1 ${JSON.stringify(remove_result1)}`)
            }
            })
<<<<<<< HEAD
            it("remove_Set_LocalCache正常调用,插入后移除",async()=>{
=======
            it("remove_Set_LocalCache正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                for(let i=0 ; i<= 99;i++){
                    let obj0 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj0_id = obj0.desc().object_id() 
                    let storage_para0:storage_para = {
                        category:cyfs.GlobalStateCategory.LocalCache,
                        path:`/user/friends/${obj0_id}`,
                        content_type:cyfs.ObjectMapSimpleContentType.Set,
                        target:undefined,
                        dec_id:cyfs.get_system_dec_app().object_id}
    
                    let storage = stack.global_state_storage_ex(
                            storage_para0.category,
                            storage_para0.path,
                            storage_para0.content_type,
                            storage_para0.target,
                            storage_para0.dec_id
                        );
    
                    (await storage.init()).unwrap();
                    //storage.op_data = (await storage.load()).unwrap();
                    let set = new cyfs.StateStorageSet(storage)
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id() 
                
                    let save_result0= await set.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await set.insert(obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
        
                    let remove_result1 = await set.remove(obj1_id)
                    assert.ok(remove_result1.err)
                    console.info(`save_result1 ${JSON.stringify(remove_result1)}`)
            }
            })             
        })
<<<<<<< HEAD
        describe("#function next",async()=>{
            it("next_Map_RootState 正常调用,查找多次插入结果",async()=>{
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.RootState,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Map,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                (await storage.init()).unwrap();
                let map = new cyfs.StateStorageSet(storage)
                for(let i=0 ; i<= 99;i++){
                    //storage.op_data = (await storage.load()).unwrap();                   
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 

                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.insert(obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
                  
                    let insert_result1 = await map.insert(obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let set_ex_result0 = await map.insert(obj3_id)
                    assert.ok(set_ex_result0.err)
                    console.info(`save_result1 ${JSON.stringify(set_ex_result0)}`)

                    let save_result1= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result1 ${JSON.stringify(save_result0)}`)
                    
                    assert.ok(!map.next(i))
                    console.info(`map.next(i) ${map.next(i)}`)
                    }
            })
            it("next_Map_LocalCache 正常调用,查找多次插入结果",async()=>{
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)
=======
        describe("#function next....",async()=>{
            it("next_Map_RootState 正常调用",async()=>{
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`)
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.LocalCache,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Map,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
<<<<<<< HEAD
                (await storage.init()).unwrap();
                let map = new cyfs.StateStorageSet(storage)
                for(let i=0 ; i<= 99;i++){
                    //storage.op_data = (await storage.load()).unwrap();                   
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 

                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.insert(obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
                  
                    let insert_result1 = await map.insert(obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let set_ex_result0 = await map.insert(obj3_id)
                    assert.ok(set_ex_result0.err)
                    console.info(`save_result1 ${JSON.stringify(set_ex_result0)}`)

                    let save_result1= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result1 ${JSON.stringify(save_result0)}`)
                    
                    assert.ok(!map.next(i))
                    console.info(`map.next(i) ${map.next(i)}`)
                }
            })
            it("next_Set_RootState 正常调用,查找多次插入结果",async()=>{
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.RootState,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Set,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                (await storage.init()).unwrap();
                let map = new cyfs.StateStorageSet(storage)
                for(let i=0 ; i<= 99;i++){
                    //storage.op_data = (await storage.load()).unwrap();                   
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 

                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.insert(obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
                  
                    let insert_result1 = await map.insert(obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let set_ex_result0 = await map.insert(obj3_id)
                    assert.ok(set_ex_result0.err)
                    console.info(`save_result1 ${JSON.stringify(set_ex_result0)}`)

                    let save_result1= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result1 ${JSON.stringify(save_result0)}`)
                    
                    assert.ok(!map.next(i))
                    console.info(`map.next(i) ${map.next(i)}`)
                }
            })
            it("next_Set_LocalCache 正常调用,查找多次插入结果",async()=>{
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)
=======
                    
                assert.strictEqual(storage,new cyfs.StateStorageMap(new cyfs.StateStorageMap(new cyfs.StateStorageMap(storage).storage()).storage()).storage());             
            })
            it("next_Map_LocalCache 正常调用",async()=>{
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`)
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.LocalCache,
                    path:`/user/friends/${obj0_id}`,
<<<<<<< HEAD
                    content_type:cyfs.ObjectMapSimpleContentType.Set,
=======
                    content_type:cyfs.ObjectMapSimpleContentType.Map,
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
<<<<<<< HEAD
                (await storage.init()).unwrap();
                let map = new cyfs.StateStorageSet(storage)
                for(let i=0 ; i<= 99;i++){
                    //storage.op_data = (await storage.load()).unwrap();                   
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 

                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let set_result0 = await map.insert(obj1_id)
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
                  
                    let insert_result1 = await map.insert(obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let set_ex_result0 = await map.insert(obj3_id)
                    assert.ok(set_ex_result0.err)
                    console.info(`save_result1 ${JSON.stringify(set_ex_result0)}`)

                    let save_result1= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result1 ${JSON.stringify(save_result0)}`)
                    
                    assert.ok(!map.next(i))
                    console.info(`map.next(i) ${map.next(i)}`)
                }
            })             
        })
        describe("#function reset",async()=>{
            it("reset_Map_RootState 正常调用,反复reset后多次插入",async()=>{
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.RootState,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Map,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                (await storage.init()).unwrap();
                let map = new cyfs.StateStorageSet(storage)
                for(let i=0 ; i<= 99;i++){
                    //storage.op_data = (await storage.load()).unwrap();                   
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 

                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let insert_result0 = await map.insert(obj1_id)
                    assert.ok(!insert_result0.err)
                    console.info(`save_result0 ${JSON.stringify(insert_result0)}`)
                  
                    let insert_result1 = await map.insert(obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let reset_result0 = await map.reset()
                    assert.ok(reset_result0.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let insert_result2 = await map.insert(obj2_id)
                    assert.ok(insert_result2.err)
                    console.info(`insert_result2 ${JSON.stringify(insert_result2)}`)

                    let insert_result3= await map.insert(obj3_id)
                    assert.ok(insert_result3.err)
                    console.info(`insert_result3 ${JSON.stringify(insert_result3)}`)

                    let save_result1= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result1 ${JSON.stringify(save_result1)}`)
                    
                    assert.ok(!map.next(i))
                    console.info(`map.next(i) ${map.next(i)}`)
                }
            })
            it("reset_Map_LocalCache 正常调用,反复reset后多次插入",async()=>{
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)
=======
                    
                assert.strictEqual(storage,new cyfs.StateStorageMap(new cyfs.StateStorageMap(new cyfs.StateStorageMap(storage).storage()).storage()).storage());             
            })
            it("next_Set_RootState 正常调用",async()=>{
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.LocalCache,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Map,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                    
                assert.strictEqual(storage,new cyfs.StateStorageMap(new cyfs.StateStorageMap(new cyfs.StateStorageMap(storage).storage()).storage()).storage());             
            })
            it("next_Set_LocalCache 正常调用",async()=>{
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.LocalCache,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Map,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                    
                assert.strictEqual(storage,new cyfs.StateStorageMap(new cyfs.StateStorageMap(new cyfs.StateStorageMap(storage).storage()).storage()).storage());             
            })             
        })
        describe("#function reset....",async()=>{
            it("reset_Map_RootState 正常调用",async()=>{
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`)
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.LocalCache,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Map,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
<<<<<<< HEAD
                (await storage.init()).unwrap();
                let map = new cyfs.StateStorageSet(storage)
                for(let i=0 ; i<= 99;i++){
                    //storage.op_data = (await storage.load()).unwrap();                   
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 

                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let insert_result0 = await map.insert(obj1_id)
                    assert.ok(!insert_result0.err)
                    console.info(`save_result0 ${JSON.stringify(insert_result0)}`)
                  
                    let insert_result1 = await map.insert(obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let reset_result0 = await map.reset()
                    assert.ok(reset_result0.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let insert_result2 = await map.insert(obj2_id)
                    assert.ok(insert_result2.err)
                    console.info(`insert_result2 ${JSON.stringify(insert_result2)}`)

                    let insert_result3= await map.insert(obj3_id)
                    assert.ok(insert_result3.err)
                    console.info(`insert_result3 ${JSON.stringify(insert_result3)}`)

                    let save_result1= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result1 ${JSON.stringify(save_result1)}`)
                    
                    assert.ok(!map.next(i))
                    console.info(`map.next(i) ${map.next(i)}`)
                }
            })
            it("reset_Set_RootState 正常调用,反复reset后多次插入",async()=>{
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.RootState,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Set,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                (await storage.init()).unwrap();
                let map = new cyfs.StateStorageSet(storage)
                for(let i=0 ; i<= 99;i++){
                    //storage.op_data = (await storage.load()).unwrap();                   
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 

                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let insert_result0 = await map.insert(obj1_id)
                    assert.ok(!insert_result0.err)
                    console.info(`save_result0 ${JSON.stringify(insert_result0)}`)
                  
                    let insert_result1 = await map.insert(obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let reset_result0 = await map.reset()
                    assert.ok(reset_result0.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let insert_result2 = await map.insert(obj2_id)
                    assert.ok(insert_result2.err)
                    console.info(`insert_result2 ${JSON.stringify(insert_result2)}`)

                    let insert_result3= await map.insert(obj3_id)
                    assert.ok(insert_result3.err)
                    console.info(`insert_result3 ${JSON.stringify(insert_result3)}`)

                    let save_result1= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result1 ${JSON.stringify(save_result1)}`)
                    
                    assert.ok(!map.next(i))
                    console.info(`map.next(i) ${map.next(i)}`)
                }
            })
            it("reset_Set_LocalCache 正常调用,反复reset后多次插入",async()=>{
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)
=======
                    
                assert.strictEqual(storage,new cyfs.StateStorageMap(new cyfs.StateStorageMap(new cyfs.StateStorageMap(storage).storage()).storage()).storage());             
            })
            it("reset_Map_LocalCache 正常调用",async()=>{
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`)
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.LocalCache,
                    path:`/user/friends/${obj0_id}`,
<<<<<<< HEAD
                    content_type:cyfs.ObjectMapSimpleContentType.Set,
=======
                    content_type:cyfs.ObjectMapSimpleContentType.Map,
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
<<<<<<< HEAD
                (await storage.init()).unwrap();
                let map = new cyfs.StateStorageSet(storage)
                for(let i=0 ; i<= 99;i++){
                    //storage.op_data = (await storage.load()).unwrap();                   
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 

                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let insert_result0 = await map.insert(obj1_id)
                    assert.ok(!insert_result0.err)
                    console.info(`save_result0 ${JSON.stringify(insert_result0)}`)
                  
                    let insert_result1 = await map.insert(obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let reset_result0 = await map.reset()
                    assert.ok(reset_result0.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let insert_result2 = await map.insert(obj2_id)
                    assert.ok(insert_result2.err)
                    console.info(`insert_result2 ${JSON.stringify(insert_result2)}`)

                    let insert_result3= await map.insert(obj3_id)
                    assert.ok(insert_result3.err)
                    console.info(`insert_result3 ${JSON.stringify(insert_result3)}`)

                    let save_result1= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result1 ${JSON.stringify(save_result1)}`)
                    
                    assert.ok(!map.next(i))
                    console.info(`map.next(i) ${map.next(i)}`)
                }
            })
        })
        describe("#function list",async()=>{
            it("list_Map_RootState正常调用,多次插入后查看列表",async()=>{
=======
                    
                assert.strictEqual(storage,new cyfs.StateStorageMap(new cyfs.StateStorageMap(new cyfs.StateStorageMap(storage).storage()).storage()).storage());             
            })
            it("reset_Set_RootState 正常调用",async()=>{
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.LocalCache,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Map,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                    
                assert.strictEqual(storage,new cyfs.StateStorageMap(new cyfs.StateStorageMap(new cyfs.StateStorageMap(storage).storage()).storage()).storage());             
            })
            it("reset_Set_LocalCache 正常调用",async()=>{
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`,
                    `${RandomGenerator.string(10)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.LocalCache,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Map,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                    
                assert.strictEqual(storage,new cyfs.StateStorageMap(new cyfs.StateStorageMap(new cyfs.StateStorageMap(storage).storage()).storage()).storage());             
            })           
        })
        describe("#function list",async()=>{
            it("list_Map_RootState正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.RootState,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Map,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                (await storage.init()).unwrap();
                let set = new cyfs.StateStorageSet(storage)
                for(let i=0 ; i<= 99;i++){
                    //storage.op_data = (await storage.load()).unwrap();                   
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 

                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let set_result0= await set.save()
                    assert.ok(!set_result0.err)
                    console.info(`save_result0 ${JSON.stringify(set_result0)}`)
                    
                    let insert_result0 = await set.insert(obj1_id)
                    assert.ok(!insert_result0.err)
                    console.info(`save_result0 ${JSON.stringify(insert_result0)}`)
                  
                    let insert_result1 = await set.insert(obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let insert_result2 = await set.insert(obj3_id)
                    assert.ok(insert_result2.err)
                    console.info(`save_result1 ${JSON.stringify(insert_result2)}`)

                    let set_result1= await set.save()
                    assert.ok(!set_result1.err)
                    console.info(`save_result1 ${JSON.stringify(set_result1)}`)
                }
                let list_result0 = await set.list()
                assert.ok(list_result0.err)
                console.info(`save_result1 ${JSON.stringify(list_result0)}`)

            })
<<<<<<< HEAD
            it("list_Map_LocalCache正常调用,多次插入后查看列表",async()=>{
=======
            it("list_Map_LocalCache正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.LocalCache,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Map,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                (await storage.init()).unwrap();
                let set = new cyfs.StateStorageSet(storage)
                for(let i=0 ; i<= 99;i++){                 
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 

                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let insert_result0 = await set.insert(obj1_id)
                    assert.ok(!insert_result0.err)
                    console.info(`save_result0 ${JSON.stringify(insert_result0)}`)
                  
                    let insert_result1 = await set.insert(obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let insert_result2 = await set.insert(obj3_id)
                    assert.ok(insert_result2.err)
                    console.info(`save_result1 ${JSON.stringify(insert_result2)}`)

                    let set_result1= await set.save()
                    assert.ok(!set_result1.err)
                    console.info(`save_result1 ${JSON.stringify(set_result1)}`)
                }
                let list_result0 = await set.list()
                assert.ok(list_result0.err)
                console.info(`save_result1 ${JSON.stringify(list_result0)}`)
            })
<<<<<<< HEAD
            it("list_Set_RootState正常调用,多次插入后查看列表",async()=>{
=======
            it("list_Set_RootState正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.RootState,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Set,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                (await storage.init()).unwrap();
                let set = new cyfs.StateStorageSet(storage)
                for(let i=0 ; i<= 99;i++){                 
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 

                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let insert_result0 = await set.insert(obj1_id)
                    assert.ok(!insert_result0.err)
                    console.info(`save_result0 ${JSON.stringify(insert_result0)}`)
                  
                    let insert_result1 = await set.insert(obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let insert_result2 = await set.insert(obj3_id)
                    assert.ok(insert_result2.err)
                    console.info(`save_result1 ${JSON.stringify(insert_result2)}`)

                    let set_result1= await set.save()
                    assert.ok(!set_result1.err)
                    console.info(`save_result1 ${JSON.stringify(set_result1)}`)
                }
                let list_result0 = await set.list()
                assert.ok(list_result0.err)
                console.info(`save_result1 ${JSON.stringify(list_result0)}`)
            })
<<<<<<< HEAD
            it("list_Set_LocalCache正常调用,多次插入后查看列表",async()=>{
=======
            it("list_Set_LocalCache正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.LocalCache,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Set,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                (await storage.init()).unwrap();
                let set = new cyfs.StateStorageSet(storage)
                for(let i=0 ; i<= 99;i++){                 
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 

                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let save_result0= await set.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let insert_result0 = await set.insert(obj1_id)
                    assert.ok(!insert_result0.err)
                    console.info(`save_result0 ${JSON.stringify(insert_result0)}`)
                  
                    let insert_result1 = await set.insert(obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let insert_result2 = await set.insert(obj3_id)
                    assert.ok(insert_result2.err)
                    console.info(`save_result1 ${JSON.stringify(insert_result2)}`)

                    let set_result1= await set.save()
                    assert.ok(!set_result1.err)
                    console.info(`save_result1 ${JSON.stringify(set_result1)}`)
                }
                let list_result0 = await set.list()
                assert.ok(list_result0.err)
                console.info(`save_result1 ${JSON.stringify(list_result0)}`)
            })
        })
        describe("#function convert_list",async()=>{
<<<<<<< HEAD
            it("convert_list_Map_RootState正常调用,多次插入后进行列表转换",async()=>{
=======
            it("convert_list_Map_RootState正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.RootState,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Map,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                (await storage.init()).unwrap();
                let set = new cyfs.StateStorageSet(storage)
                for(let i=0 ; i<= 99;i++){
                    //storage.op_data = (await storage.load()).unwrap();                   
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 

                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let save_result0= await set.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let insert_result0 = await set.insert(obj1_id)
                    assert.ok(!insert_result0.err)
                    console.info(`save_result0 ${JSON.stringify(insert_result0)}`)
                  
                    let insert_result1 = await set.insert(obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let insert_result2 = await set.insert(obj3_id)
                    assert.ok(insert_result2.err)
                    console.info(`save_result2 ${JSON.stringify(insert_result2)}`)

                    let save_result1= await set.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result1 ${JSON.stringify(save_result1)}`)
                }
                let list_result0 = await set.list()
                assert.ok(list_result0.err)
                console.info(`save_result1 ${JSON.stringify(list_result0)}`)

                let convert_list_para:cyfs.ObjectMapContentItem = {content_type:cyfs.ObjectMapSimpleContentType.Map}
                let convert_list_result0 = set.convert_list([convert_list_para])
                console.info(`convert_list_result0 ${JSON.stringify(convert_list_result0)}`)

            })
<<<<<<< HEAD
            it("convert_list_Map_LocalCache正常调用,多次插入后进行列表转换",async()=>{
=======
            it("convert_list_Map_LocalCache正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.LocalCache,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Map,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                (await storage.init()).unwrap();
                let set = new cyfs.StateStorageSet(storage)
                for(let i=0 ; i<= 99;i++){
                    //storage.op_data = (await storage.load()).unwrap();                   
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 

                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let save_result0= await set.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let insert_result0 = await set.insert(obj1_id)
                    assert.ok(!insert_result0.err)
                    console.info(`save_result0 ${JSON.stringify(insert_result0)}`)
                  
                    let insert_result1 = await set.insert(obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let insert_result2 = await set.insert(obj3_id)
                    assert.ok(insert_result2.err)
                    console.info(`save_result2 ${JSON.stringify(insert_result2)}`)

                    let save_result1= await set.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result1 ${JSON.stringify(save_result1)}`)
                }
                let list_result0 = await set.list()
                assert.ok(list_result0.err)
                console.info(`save_result1 ${JSON.stringify(list_result0)}`)

                let convert_list_para:cyfs.ObjectMapContentItem = {content_type:cyfs.ObjectMapSimpleContentType.Map}
                let convert_list_result0 = set.convert_list([convert_list_para])
                console.info(`convert_list_result0 ${JSON.stringify(convert_list_result0)}`)
            })
<<<<<<< HEAD
            it("convert_list_Set_RootState正常调用,多次插入后进行列表转换",async()=>{
=======
            it("convert_list_Set_RootState正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.RootState,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Set,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                (await storage.init()).unwrap();
                let set = new cyfs.StateStorageSet(storage)
                for(let i=0 ; i<= 99;i++){
                    //storage.op_data = (await storage.load()).unwrap();                   
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 

                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let save_result0= await set.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let insert_result0 = await set.insert(obj1_id)
                    assert.ok(!insert_result0.err)
                    console.info(`save_result0 ${JSON.stringify(insert_result0)}`)
                  
                    let insert_result1 = await set.insert(obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let insert_result2 = await set.insert(obj3_id)
                    assert.ok(insert_result2.err)
                    console.info(`save_result2 ${JSON.stringify(insert_result2)}`)

                    let save_result1= await set.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result1 ${JSON.stringify(save_result1)}`)
                }
                let list_result0 = await set.list()
                assert.ok(list_result0.err)
                console.info(`save_result1 ${JSON.stringify(list_result0)}`)

                let convert_list_para:cyfs.ObjectMapContentItem = {content_type:cyfs.ObjectMapSimpleContentType.Map}
                let convert_list_result0 = set.convert_list([convert_list_para])
                console.info(`convert_list_result0 ${JSON.stringify(convert_list_result0)}`)
            })
<<<<<<< HEAD
            it("convert_list_Set_LocalCache正常调用,多次插入后进行列表转换",async()=>{
=======
            it("convert_list_Set_LocalCache正常调用",async()=>{
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.LocalCache,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Set,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}

                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                (await storage.init()).unwrap();
                let set = new cyfs.StateStorageSet(storage)
                for(let i=0 ; i<= 99;i++){
                    //storage.op_data = (await storage.load()).unwrap();                   
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()

                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 

                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let save_result0= await set.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let insert_result0 = await set.insert(obj1_id)
                    assert.ok(!insert_result0.err)
                    console.info(`save_result0 ${JSON.stringify(insert_result0)}`)
                  
                    let insert_result1 = await set.insert(obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                    let insert_result2 = await set.insert(obj3_id)
                    assert.ok(insert_result2.err)
                    console.info(`save_result2 ${JSON.stringify(insert_result2)}`)

                    let save_result1= await set.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result1 ${JSON.stringify(save_result1)}`)
                }
                let list_result0 = await set.list()
                assert.ok(list_result0.err)
                console.info(`save_result1 ${JSON.stringify(list_result0)}`)

                let convert_list_para:cyfs.ObjectMapContentItem = {content_type:cyfs.ObjectMapSimpleContentType.Map}
                let convert_list_result0 = set.convert_list([convert_list_para])
                console.info(`convert_list_result0 ${JSON.stringify(convert_list_result0)}`)
            })
        })
<<<<<<< HEAD
    })   
    describe("##StateStorageMap 接口流程",async()=>{
        it("#state_storageMap 测试接口执行,多个object_id插入后移除并重置",async()=>{
            let obj0 = cyfs.TextObject.create(cyfs.Some(
                cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                `${RandomGenerator.string(1000)}`,
                `${RandomGenerator.string(1000)}`,
                `${RandomGenerator.string(1000)}`)

            let obj0_id = obj0.desc().object_id() 
            let storage_para0:storage_para = {
                category:cyfs.GlobalStateCategory.RootState,
                path:`/user/friends/${obj0_id}`,
                content_type:cyfs.ObjectMapSimpleContentType.Map,
                target:undefined,
                dec_id:cyfs.get_system_dec_app().object_id}

            let storage = stack.global_state_storage_ex(
                    storage_para0.category,
                    storage_para0.path,
                    storage_para0.content_type,
                    storage_para0.target,
                    storage_para0.dec_id
                );
            (await storage.init()).unwrap();
            let map = new cyfs.StateStorageMap(storage)
            for(let i=0 ; i<= 99;i++){
                //storage.op_data = (await storage.load()).unwrap();                   
                let obj1 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj1_id = obj1.desc().object_id()

                let obj2 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj2_id = obj1.desc().object_id() 

                let obj3 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj3_id = obj1.desc().object_id() 
            
                let save_result0= await map.save()
                assert.ok(!save_result0.err)
                console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                
                let set_result0 = await map.set(`${obj1_id}`,obj1_id)
                assert.ok(!set_result0.err)
                console.info(`save_result0 ${JSON.stringify(set_result0)}`)
                
                map.remove(`${obj1_id}`)
              
                let insert_result1 = await map.insert(`${obj2_id}`,obj2_id)
                assert.ok(insert_result1.err)
                console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                map.remove_ex(`${obj2_id}`)

                let set_ex_result0 = await map.set_ex(`${obj3_id}`,obj3_id,obj2_id,true)
                assert.ok(set_ex_result0.err)
                console.info(`save_result1 ${JSON.stringify(set_ex_result0)}`)

                map.reset()

                let save_result1= await map.save()
                assert.ok(!save_result0.err)
                console.info(`save_result1 ${JSON.stringify(save_result0)}`)

                assert.ok(!map.next(i))
                console.info(`map.next(i) ${map.next(i)}`)


            }
            let list_result1 = await map.list()
            assert.ok(list_result1.err)
            console.info(`save_result1 ${JSON.stringify(list_result1)}`)

            let convert_list_para:cyfs.ObjectMapContentItem = {content_type:cyfs.ObjectMapSimpleContentType.Set}
            let convert_list_result0 = map.convert_list([convert_list_para])
            console.info(`convert_list_result0 ${JSON.stringify(convert_list_result0)}`)
        })
        it("#state_storageMap 测试接口执行,多级path",async()=>{
            let obj0 = cyfs.TextObject.create(cyfs.Some(
                cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                `${RandomGenerator.string(1000)}`,
                `${RandomGenerator.string(1000)}`,
                `${RandomGenerator.string(1000)}`)
            
            let obj01 = cyfs.TextObject.create(cyfs.Some(
                cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                `${RandomGenerator.string(100)}`,
                `${RandomGenerator.string(100)}`,
                `${RandomGenerator.string(100)}`)

            let obj02 = cyfs.TextObject.create(cyfs.Some(
                cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                `${RandomGenerator.string(10)}`,
                `${RandomGenerator.string(10)}`,
                `${RandomGenerator.string(10)}`)
    

            let obj0_id = obj0.desc().object_id()
            let obj01_id = obj01.desc().object_id()
            let obj02_id = obj02.desc().object_id()
            let storage_para0:storage_para = {
                category:cyfs.GlobalStateCategory.RootState,
                path:`/${obj01_id}/${obj01_id}/${obj0_id}`,
                content_type:cyfs.ObjectMapSimpleContentType.Map,
                target:undefined,
                dec_id:cyfs.get_system_dec_app().object_id}

            let storage = stack.global_state_storage_ex(
                    storage_para0.category,
                    storage_para0.path,
                    storage_para0.content_type,
                    storage_para0.target,
                    storage_para0.dec_id
                );
            (await storage.init()).unwrap();
            let map = new cyfs.StateStorageMap(storage)
            for(let i=0 ; i<= 99;i++){
                //storage.op_data = (await storage.load()).unwrap();                   
                let obj1 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj1_id = obj1.desc().object_id()

                let obj2 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj2_id = obj1.desc().object_id() 

                let obj3 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj3_id = obj1.desc().object_id() 
            
                let save_result0= await map.save()
                assert.ok(!save_result0.err)
                console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                
                let set_result0 = await map.set(`${obj1_id}`,obj1_id)
                assert.ok(!set_result0.err)
                console.info(`save_result0 ${JSON.stringify(set_result0)}`)
              
                let insert_result1 = await map.insert(`${obj2_id}`,obj2_id)
                assert.ok(insert_result1.err)
                console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                let set_ex_result0 = await map.set_ex(`${obj3_id}`,obj3_id,obj2_id,true)
                assert.ok(set_ex_result0.err)
                console.info(`save_result1 ${JSON.stringify(set_ex_result0)}`)

                let save_result1= await map.save()
                assert.ok(!save_result0.err)
                console.info(`save_result1 ${JSON.stringify(save_result0)}`)


                assert.ok(!map.next(i))
                console.info(`map.next(i) ${map.next(i)}`)
            }
            let list_result1 = await map.list()
            assert.ok(list_result1.err)
            console.info(`save_result1 ${JSON.stringify(list_result1)}`)
            
            let convert_list_para:cyfs.ObjectMapContentItem = {content_type:cyfs.ObjectMapSimpleContentType.Set}
            let convert_list_result0 = map.convert_list([convert_list_para])
            console.info(`convert_list_result0 ${JSON.stringify(convert_list_result0)}`)
        })
        it("#state_storageMap 测试接口执行,remove_ex多次多个关联objid",async()=>{
            let obj0 = cyfs.TextObject.create(cyfs.Some(
                cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                `${RandomGenerator.string(1000)}`,
                `${RandomGenerator.string(1000)}`,
                `${RandomGenerator.string(1000)}`)

            let obj0_id = obj0.desc().object_id() 
            let storage_para0:storage_para = {
                category:cyfs.GlobalStateCategory.RootState,
                path:`/user/friends/${obj0_id}`,
                content_type:cyfs.ObjectMapSimpleContentType.Map,
                target:undefined,
                dec_id:cyfs.get_system_dec_app().object_id}

            let storage = stack.global_state_storage_ex(
                    storage_para0.category,
                    storage_para0.path,
                    storage_para0.content_type,
                    storage_para0.target,
                    storage_para0.dec_id
                );
            (await storage.init()).unwrap();
            let map = new cyfs.StateStorageMap(storage)
            for(let i=0 ; i<= 99;i++){
                //storage.op_data = (await storage.load()).unwrap();                   
                let obj1 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj1_id = obj1.desc().object_id()

                let obj2 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj2_id = obj1.desc().object_id() 

                let obj3 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj3_id = obj1.desc().object_id() 
            
                let save_result0= await map.save()
                assert.ok(!save_result0.err)
                console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                
                let set_result0 = await map.set(`${obj1_id}`,obj1_id)
                assert.ok(!set_result0.err)
                console.info(`save_result0 ${JSON.stringify(set_result0)}`)
                
                map.remove(`${obj1_id}`)
              
                let insert_result1 = await map.insert(`${obj2_id}`,obj2_id)
                assert.ok(insert_result1.err)
                console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)


                let set_ex_result0 = await map.set_ex(`${obj3_id}`,obj3_id,obj2_id,true)
                assert.ok(set_ex_result0.err)
                console.info(`save_result1 ${JSON.stringify(set_ex_result0)}`)
                map.remove_ex(`${obj3_id}`,obj2_id)

                map.reset()

                let save_result1= await map.save()
                assert.ok(!save_result0.err)
                console.info(`save_result1 ${JSON.stringify(save_result0)}`)

                assert.ok(!map.next(i))
                console.info(`map.next(i) ${map.next(i)}`)


            }
            let list_result1 = await map.list()
            assert.ok(list_result1.err)
            console.info(`save_result1 ${JSON.stringify(list_result1)}`)

            let convert_list_para:cyfs.ObjectMapContentItem = {content_type:cyfs.ObjectMapSimpleContentType.Set}
            let convert_list_result0 = map.convert_list([convert_list_para])
            console.info(`convert_list_result0 ${JSON.stringify(convert_list_result0)}`)
        })

    })
    describe("##StateStorageSet 接口流程",async()=>{
        it("#state_storageMap 测试接口执行,多个object_id插入后移除并重置",async()=>{
                let obj0 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)
    
                let obj0_id = obj0.desc().object_id() 
                let storage_para0:storage_para = {
                    category:cyfs.GlobalStateCategory.RootState,
                    path:`/user/friends/${obj0_id}`,
                    content_type:cyfs.ObjectMapSimpleContentType.Map,
                    target:undefined,
                    dec_id:cyfs.get_system_dec_app().object_id}
    
                let storage = stack.global_state_storage_ex(
                        storage_para0.category,
                        storage_para0.path,
                        storage_para0.content_type,
                        storage_para0.target,
                        storage_para0.dec_id
                    );
                (await storage.init()).unwrap();
                let map = new cyfs.StateStorageSet(storage)
                for(let i=0 ; i<= 99;i++){
                    //storage.op_data = (await storage.load()).unwrap();                   
                    let obj1 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj1_id = obj1.desc().object_id()
    
                    let obj2 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj2_id = obj1.desc().object_id() 
    
                    let obj3 = cyfs.TextObject.create(cyfs.Some(
                        cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`,
                        `${RandomGenerator.string(1000)}`)
    
                    let obj3_id = obj1.desc().object_id() 
                
                    let save_result0= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                    
                    let insert_result0 = await map.insert(obj1_id)
                    assert.ok(!insert_result0.err)
                    console.info(`save_result0 ${JSON.stringify(insert_result0)}`)
                    
                    map.remove(obj1_id)
                  
                    let insert_result1 = await map.insert(obj2_id)
                    assert.ok(insert_result1.err)
                    console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)
    
                    let insert_result2 = await map.insert(obj3_id)
                    assert.ok(insert_result2.err)
                    console.info(`insert_result2 ${JSON.stringify(insert_result2)}`)
    
                    map.reset()
    
                    let save_result1= await map.save()
                    assert.ok(!save_result0.err)
                    console.info(`save_result1 ${JSON.stringify(save_result0)}`)
    
                    assert.ok(!map.next(i))
                    console.info(`map.next(i) ${map.next(i)}`)
    
    
                }
                let list_result1 = await map.list()
                assert.ok(list_result1.err)
                console.info(`save_result1 ${JSON.stringify(list_result1)}`)
    
                let convert_list_para:cyfs.ObjectMapContentItem = {content_type:cyfs.ObjectMapSimpleContentType.Set}
                let convert_list_result0 = map.convert_list([convert_list_para])
                console.info(`convert_list_result0 ${JSON.stringify(convert_list_result0)}`)
        })
        it("#state_storageSet 测试接口执行,多级path",async()=>{
            let obj0 = cyfs.TextObject.create(cyfs.Some(
                cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                `${RandomGenerator.string(1000)}`,
                `${RandomGenerator.string(1000)}`,
                `${RandomGenerator.string(1000)}`)
            
            let obj01 = cyfs.TextObject.create(cyfs.Some(
                cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                `${RandomGenerator.string(100)}`,
                `${RandomGenerator.string(100)}`,
                `${RandomGenerator.string(100)}`)

            let obj02 = cyfs.TextObject.create(cyfs.Some(
                cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                `${RandomGenerator.string(10)}`,
                `${RandomGenerator.string(10)}`,
                `${RandomGenerator.string(10)}`)
    

            let obj0_id = obj0.desc().object_id()
            let obj01_id = obj01.desc().object_id()
            let obj02_id = obj02.desc().object_id()
            let storage_para0:storage_para = {
                category:cyfs.GlobalStateCategory.LocalCache,
                path:`/${obj01_id}/${obj01_id}/${obj0_id}`,
                content_type:cyfs.ObjectMapSimpleContentType.Set,
                target:undefined,
                dec_id:cyfs.get_system_dec_app().object_id}

            let storage = stack.global_state_storage_ex(
                    storage_para0.category,
                    storage_para0.path,
                    storage_para0.content_type,
                    storage_para0.target,
                    storage_para0.dec_id
                );
            (await storage.init()).unwrap();
            let map = new cyfs.StateStorageSet(storage)
            for(let i=0 ; i<= 99;i++){
                //storage.op_data = (await storage.load()).unwrap();                   
                let obj1 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj1_id = obj1.desc().object_id()

                let obj2 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj2_id = obj1.desc().object_id() 

                let obj3 = cyfs.TextObject.create(cyfs.Some(
                    cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`,
                    `${RandomGenerator.string(1000)}`)

                let obj3_id = obj1.desc().object_id() 
            
                let save_result0= await map.save()
                assert.ok(!save_result0.err)
                console.info(`save_result0 ${JSON.stringify(save_result0)}`)
                
                let insert_result0 = await map.insert(obj1_id)
                assert.ok(!insert_result0.err)
                console.info(`save_result0 ${JSON.stringify(insert_result0)}`)
              
                let insert_result1 = await map.insert(obj2_id)
                assert.ok(insert_result1.err)
                console.info(`insert_result1 ${JSON.stringify(insert_result1)}`)

                let insert_result2 = await map.insert(obj3_id)
                assert.ok(insert_result2.err)
                console.info(`save_result1 ${JSON.stringify(insert_result2)}`)

                let save_result1= await map.save()
                assert.ok(!save_result0.err)
                console.info(`save_result1 ${JSON.stringify(save_result0)}`)


                assert.ok(!map.next(i))
                console.info(`map.next(i) ${map.next(i)}`)
            }
            let list_result1 = await map.list()
            assert.ok(list_result1.err)
            console.info(`save_result1 ${JSON.stringify(list_result1)}`)
            
            let convert_list_para:cyfs.ObjectMapContentItem = {content_type:cyfs.ObjectMapSimpleContentType.Set}
            let convert_list_result0 = map.convert_list([convert_list_para])
            console.info(`convert_list_result0 ${JSON.stringify(convert_list_result0)}`)

        })

    })
    
})
=======
    })
    describe("##StateStorageMap 接口流程",async()=>{})
    describe("##StateStorageSet 接口流程",async()=>{})
})
>>>>>>> f89deeae8eb0365aaa06eec4e474bf0df6779e20
