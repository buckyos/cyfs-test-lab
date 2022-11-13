import assert  from 'assert'; 
import * as cyfs from '../../cyfs_node';
import {ZoneSimulator,stringToUint8Array,RandomGenerator,stackInfo} from "../../common";
import * as path from 'path';
import {TestcaseObject,MyTest} from "../../common/types"
import { before } from 'mocha';
import child_process from 'child_process';
import fs from 'fs';
//初始化日志

cyfs.clog.enable_file_log({
    name: "unittest_object_map",
    dir: cyfs.get_app_log_dir("unittest_object_map"),
    file_max_size: 1024 * 1024 *10,
    file_max_count: 10,
});



let stack:cyfs.SharedCyfsStack;
let stack_standby_ood:cyfs.SharedCyfsStack;
let op_env : cyfs.PathOpEnvStub
let op_env_stack_standby_ood:cyfs.PathOpEnvStub
let single_op_env : cyfs.SingleOpEnvStub
let single_op_env_stack_standby_ood : cyfs.SingleOpEnvStub


let data = {
    category:cyfs.GlobalStateCategory,
    AccessMode:cyfs.GlobalStateAccessMode
    }

async function createEnv(stack:cyfs.SharedCyfsStack, env_type:string): Promise <any>{ 
        if(env_type == "op_env")
        {   
            let op_env_result= await stack.root_state_stub().create_path_op_env();
            assert.ok(!op_env_result.err);
             op_env = op_env_result.unwrap(); 
             return op_env
        }
        else if(env_type == "single_op_env")
        {
            let single_op_env_result= await stack.root_state_stub().create_single_op_env();
            assert.ok(!single_op_env_result.err);
            let  single_op_env = single_op_env_result.unwrap();
            let create = await single_op_env.create_new(cyfs.ObjectMapSimpleContentType.Map)
            assert.ok(!create.err);
            return single_op_env
        }
    }

function createPeople(): [cyfs.People, cyfs.PrivateKey] {
    let pk = cyfs.PrivateKey.generate_rsa(1024).unwrap();
    let public_key = pk.public();
    let people = cyfs.People.create(cyfs.None, [], public_key, cyfs.None);
    return [people, pk];
}

function loadDescandSec(path: string): [cyfs.StandardObject, cyfs.PrivateKey] {
    const desc = new cyfs.StandardObjectDecoder().raw_decode(new Uint8Array(fs.readFileSync(path + ".desc"))).unwrap()[0];
    const sec = new cyfs.PrivatekeyDecoder().raw_decode(new Uint8Array(fs.readFileSync(path + ".sec"))).unwrap()[0];
    return [desc, sec];
}

async function createProcess(n:number,op_env:any,obj_list:Array<cyfs.ObjectId>){   
        let child = child_process.fork("node -version" , [], {silent: true});
            child.on("insert path", async function(){
                let insert_path = `/qaTest/${RandomGenerator.string(10)}/${RandomGenerator.string(10)}`
                let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                let obj_id1 = obj1.desc().object_id();
                obj_list.push(obj_id1);
                let save = await stack.non_service().put_object({
                    common: {
                        dec_id:ZoneSimulator.APPID,
                        flags: 0,
                        //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                        level: cyfs.NONAPILevel.NOC, //设置路由类型
                        
                    },
                    object: new cyfs.NONObjectInfo(obj1.desc().calculate_id(), obj1.to_vec().unwrap()),
                    access: cyfs.AccessString.full()
                })
                let create = await op_env.insert_with_path(insert_path,obj_id1)
                assert.ok(!create.err);
            })
        child.on('exit', function(code){
            console.log("===exit=="+code)
            // 如果子线程由于异常意外退出， 则重新启动一个
            createProcess(n,op_env,obj_list)
        })
        child.on('exit', function (code:any) {
            console.log('子进程已退出，退出码 '+code);
        });
}



describe("# 主从OOD 数据同步功能测试",function(){
    this.timeout(0);
    this.beforeAll(async function(){
        //测试前置条件，连接测试模拟器设备
        console.info(`##########用例执开始执行`);
        await ZoneSimulator.init();
        stack = ZoneSimulator.zone1_ood_stack!;
        stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
        
    })
    this.afterAll(async ()=>{
        //每个函数执行前，清除所有handler
        console.info(`#########用例执行完成`);
        ZoneSimulator.stopZoneSimulator();
    })
    describe("#主从OOD数据同步业务流程冒烟测试",async()=>{
        it("#业务流程测试",async()=>{
            // (1) 主 OOD root_state 插入数据commit
            let insert_list = [];
            for(let i = 0;i<10;i++){
                insert_list.push(new Promise<{revision:cyfs.JSBI,obj_id:cyfs.ObjectId,async_time?:number}>(async(V)=>{
                    let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                    assert.ok(!result.err);
                    let op_env = result.unwrap();
                    let insert_path = `/qaTest/pathopt${RandomGenerator.string(10)}`
                    let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                    let obj_id1 = obj1.desc().object_id();
                    let save = await stack.non_service().put_object({
                        common: {
                            dec_id:ZoneSimulator.APPID,
                            flags: 0,
                            //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                            level: cyfs.NONAPILevel.NOC //设置路由类型
                            
                        },
                        object: new cyfs.NONObjectInfo(obj1.desc().calculate_id(), obj1.to_vec().unwrap()),
                        access: cyfs.AccessString.full()
                    })
                    let create = await op_env.insert_with_path(insert_path,obj_id1)
                    assert.ok(!create.err);
                    let result3 =  await op_env.commit();
                    let begin =Date.now();
                    console.info(JSON.stringify(result3))
                    assert.ok(!result3.err)
                    let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 主OOD 第 ${i} 次操作 当前 revision : ${JSON.stringify(ood_revision)}`)
                    let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 从OOD 第 ${i} 次操作， 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                    while( Number(standby_ood_revision) < Number(ood_revision)){
                        standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 从OOD 第 ${i} 次操作 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                        await cyfs.sleep(2000)
                   }
                   let  async_time = Date.now() - begin;
                   let get_ret = await stack_standby_ood.non_service().get_object({
                    object_id:obj_id1,
                    common: {
                        req_path: "/qa/get_object",
                        level: cyfs.NONAPILevel.NOC,
                        dec_id:ZoneSimulator.APPID,
                        flags: 0,
                    }});
                    assert.ok(!get_ret.err);

                    V({revision : ood_revision ,obj_id: obj_id1,async_time})
                }))
                await cyfs.sleep(50)
            }

            for(let i in insert_list){
                let result = await insert_list[i];
                console.info(`第 ${i} 次操作 revision = ${result.revision} , obj_id = ${result.obj_id} async_time = ${result.async_time}`)
            }
        })
    
    })
    describe("#主从OOD#数据同步#revision 同步",async()=>{
        describe("#同步机制校验",async()=>{
            it("#业务流程测试",async()=>{
                // (1) 主 OOD root_state 插入数据commit
                let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                assert.ok(!result.err);
                let op_env = result.unwrap();
                let obj_list:Array<cyfs.ObjectId> = [];
                for(let i=0;i<10;i++){
                    let insert_path = `/qaTest/${RandomGenerator.string(10)}/${RandomGenerator.string(10)}`
                    let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                    let obj_id1 = obj1.desc().object_id();
                    obj_list.push(obj_id1);
                    let save = await stack.non_service().put_object({
                        common: {
                            dec_id:ZoneSimulator.APPID,
                            flags: 0,
                            //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                            level: cyfs.NONAPILevel.NOC //设置路由类型
                        },
                        object: new cyfs.NONObjectInfo(obj1.desc().calculate_id(), obj1.to_vec().unwrap()),
                        access: cyfs.AccessString.full()
                    })
                    let create = await op_env.insert_with_path(insert_path,obj_id1)
                    assert.ok(!create.err);
                }
                let result3 =  await op_env.commit();
                let begin =Date.now();
                console.info(JSON.stringify(result3))
                assert.ok(!result3.err)
                let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                while( Number(standby_ood_revision) < Number(ood_revision)){
                    standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                    await cyfs.sleep(2000)
               }
               let  async_time = Date.now() - begin;
               for(let i in obj_list){
                let get_ret = await stack_standby_ood.non_service().get_object({
                    object_id:obj_list[i],
                    common: {
                        req_path: "/qa/get_object",
                        level: cyfs.NONAPILevel.NOC,
                        dec_id:ZoneSimulator.APPID,
                        flags: 0,
                    }});
                    assert.ok(!get_ret.err);
                    let check = get_ret.unwrap().object;
                    assert.ok(check.object_id = obj_list[i]);
               }
            })
        
        })
    })
    describe("#主从OOD数据同步#数据类型",async()=>{
        describe("Object Map 数据类型",async()=>{
            // 操作Object Paht List
            let obj_path_list_map :Array<{
                path:string,
                key:string,
                value:cyfs.ObjectId,
                prev? :cyfs.ObjectId,
            }> = [];
            describe("MAP 类型数据 插入值 同步校验",async()=>{
                it("#业务流程测试",async()=>{
                    // (1) 主 OOD root_state 插入数据commit
                    let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                    let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                    assert.ok(!result.err);
                    let op_env = result.unwrap();
                    let obj_list:Array<cyfs.ObjectId> = [];
                    for(let i=0;i<10;i++){
                        let insert_path = `/qaTest/${RandomGenerator.string(10)}/${RandomGenerator.string(10)}`
                        let key = RandomGenerator.string(10);
                        let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                        let obj_id1 = obj1.desc().object_id();
                        obj_list.push(obj_id1);
                        let save = await stack.non_service().put_object({
                            common: {
                                dec_id:ZoneSimulator.APPID,
                                flags: 0,
                                //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                level: cyfs.NONAPILevel.NOC //设置路由类型
                                

                            },
                            object: new cyfs.NONObjectInfo(obj1.desc().calculate_id(), obj1.to_vec().unwrap()),
                            access: cyfs.AccessString.full()
                        })
                        let create = await op_env.insert_with_key(insert_path,key,obj_id1)
                        assert.ok(!create.err);
                        obj_path_list_map.push({
                            path:insert_path,
                            key:key,
                            value:obj_id1
                        });
                    }
                    let result3 =  await op_env.commit();
                    let begin =Date.now();
                    console.info(JSON.stringify(result3))
                    assert.ok(!result3.err)
                    let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                    let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                    while( Number(standby_ood_revision) < Number(ood_revision)){
                        standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                        await cyfs.sleep(2000)
                   }
                   let  async_time = Date.now() - begin;
                   console.info(`从OOD数据同步时间`)
                   for(let i in obj_list){
                    let get_ret = await stack_standby_ood.non_service().get_object({
                        object_id:obj_list[i],
                        common: {
                            req_path: "/qa/get_object",
                            level: cyfs.NONAPILevel.NOC,
                            dec_id:ZoneSimulator.APPID,
                            flags: 0,
                        }});
                        assert.ok(!get_ret.err);
                        let check = get_ret.unwrap().object;
                        assert.ok(check.object_id.to_base_58() == obj_list[i].to_base_58() ,`${check.object_id} != ${obj_list[i]}`);
                   }
                })
            
            })
            
            describe("MAP 类型数据 更新值 同步校验",async()=>{
                it("#业务流程测试",async()=>{
                    assert.ok(obj_path_list_map.length ==10,"obj_path_list_map 未插入完成");
                    // (1) 主 OOD root_state 插入数据commit
                    let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                    let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                    assert.ok(!result.err);
                    let op_env = result.unwrap();
                    let obj_list:Array<cyfs.ObjectId> = [];
                    for(let i in obj_path_list_map){
                        let insert_path = obj_path_list_map[i].path
                        let key = obj_path_list_map[i].key
                        let prev = obj_path_list_map[i].value
                        let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                        let obj_id1 = obj1.desc().object_id();
                        obj_list.push(obj_id1);
                        let save = await stack.non_service().put_object({
                            common: {
                                dec_id:ZoneSimulator.APPID,
                                flags: 0,
                                //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                level: cyfs.NONAPILevel.NOC //设置路由类型
                            },
                            object: new cyfs.NONObjectInfo(obj1.desc().calculate_id(), obj1.to_vec().unwrap()),
                            access: cyfs.AccessString.full()
                        })
                        let create = await op_env.set_with_key(insert_path,key,obj_id1,prev);
                        assert.ok(!create.err);
                        obj_path_list_map[i] = {
                            path:insert_path,
                            key:key,
                            value:obj_id1,
                            prev : prev,
                        }
                        
                    }
                    let result3 =  await op_env.commit();
                    let begin =Date.now();
                    console.info(JSON.stringify(result3))
                    assert.ok(!result3.err)
                    let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                    let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                    while( Number(standby_ood_revision) < Number(ood_revision)){
                        standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                        await cyfs.sleep(2000)
                   }
                   let  async_time = Date.now() - begin;
                   for(let i in obj_list){
                    let get_ret = await stack_standby_ood.non_service().get_object({
                        object_id:obj_list[i],
                        common: {
                            req_path: "/qa/get_object",
                            level: cyfs.NONAPILevel.NOC,
                            dec_id:ZoneSimulator.APPID,
                            flags: 0,
                        }});
                        assert.ok(!get_ret.err);
                        let check = get_ret.unwrap().object;
                        assert.ok(check.object_id.to_base_58() == obj_list[i].to_base_58() ,`${check.object_id} != ${obj_list[i]}`);
                   }
                })
            
            })
            describe("MAP 类型数据 删除值 同步校验",async()=>{
                it("#业务流程测试",async()=>{
                    assert.ok(obj_path_list_map.length ==10,"obj_path_list_map 未插入完成");
                    // (1) 主 OOD root_state 插入数据commit
                    let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                    let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                    assert.ok(!result.err);
                    let op_env = result.unwrap();
                    for(let i in obj_path_list_map){
                        let insert_path = obj_path_list_map[i].path
                        let key = obj_path_list_map[i].key
                        let create = await op_env.remove_with_key(insert_path,key);
                        assert.ok(!create.err);
                        
                    }
                    let result3 =  await op_env.commit();
                    let begin =Date.now();
                    console.info(JSON.stringify(result3))
                    assert.ok(!result3.err)
                    let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                    let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                    while( Number(standby_ood_revision) < Number(ood_revision)){
                        standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                        await cyfs.sleep(2000)
                   }
                   let  async_time = Date.now() - begin;
                   for(let i in obj_path_list_map){
                    let get_ret = await stack_standby_ood.non_service().get_object({
                        object_id:obj_path_list_map[i].value,
                        common: {
                            req_path: "/qa/get_object",
                            level: cyfs.NONAPILevel.NOC,
                            dec_id:ZoneSimulator.APPID,
                            flags: 0,
                        }});
                        console.info(`从本地 NOC 获取被移除的key${JSON.stringify(get_ret)}`)
                        //assert.ok(get_ret.err);
                   }
                   for(let i in obj_path_list_map){
                    let get_ret = await stack_standby_ood.non_service().get_object({
                        object_id:obj_path_list_map[i].prev!,
                        common: {
                            req_path: "/qa/get_object",
                            level: cyfs.NONAPILevel.NOC,
                            dec_id:ZoneSimulator.APPID,
                            flags: 0,
                        }});
                        console.info(`从本地 NOC 获取被移除的key${JSON.stringify(get_ret)}`)
                        //assert.ok(get_ret.err);
                   }
                })
            
            })
            let obj_path_list_set :Array<{
                path:string,
                key:string,
                value:cyfs.ObjectId,
                prev? :cyfs.ObjectId,
            }> = [];
            describe("Set 类型数据 插入值 同步校验",async()=>{
                it("#业务流程测试",async()=>{
                    // (1) 主 OOD root_state 插入数据commit
                    let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                    let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                    assert.ok(!result.err);
                    let op_env = result.unwrap();
                    let obj_list:Array<cyfs.ObjectId> = [];
                    let insert_path = `/qaTest/${RandomGenerator.string(10)}/${RandomGenerator.string(10)}`
                    for(let i=0;i<10;i++){
                        
                        let key = RandomGenerator.string(10);
                        let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                        let obj_id1 = obj1.desc().object_id();
                        obj_list.push(obj_id1);
                        let save = await stack.non_service().put_object({
                            common: {
                                dec_id:ZoneSimulator.APPID,
                                flags: 0,
                                //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                level: cyfs.NONAPILevel.NOC //设置路由类型
                            },
                            object: new cyfs.NONObjectInfo(obj1.desc().calculate_id(), obj1.to_vec().unwrap()),
                            access: cyfs.AccessString.full()
                        })
                        let create = await op_env.insert(insert_path,obj_id1);
                        assert.ok(!create.err);
                        obj_path_list_set.push({
                            path:insert_path,
                            key:key,
                            value:obj_id1
                        });
                    }
                    let result3 =  await op_env.commit();
                    let begin =Date.now();
                    console.info(JSON.stringify(result3))
                    assert.ok(!result3.err)
                    let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                    let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                    while( Number(standby_ood_revision) < Number(ood_revision)){
                        standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                        await cyfs.sleep(2000)
                   }
                   let  async_time = Date.now() - begin;
                   console.info(`从OOD数据同步时间`)
                   for(let i in obj_list){
                    let get_ret = await stack_standby_ood.non_service().get_object({
                        object_id:obj_list[i],
                        common: {
                            req_path: "/qa/get_object",
                            level: cyfs.NONAPILevel.NOC,
                            dec_id:ZoneSimulator.APPID,
                            flags: 0,
                        }});
                        assert.ok(!get_ret.err);
                        let check = get_ret.unwrap().object;
                        assert.ok(check.object_id.to_base_58() == obj_list[i].to_base_58() ,`${check.object_id} != ${obj_list[i]}`);
                   }
                })
            
            })
            describe("Set 类型数据 增加新obejct 同步校验",async()=>{
                it("#业务流程测试",async()=>{
                    // (1) 主 OOD root_state 插入数据commit
                    let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                    let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                    assert.ok(!result.err);
                    let op_env = result.unwrap();
                    let obj_list:Array<cyfs.ObjectId> = [];
                    let insert_path = obj_path_list_set[0].path;
                    for(let i=0;i<10;i++){
                        
                        let key = RandomGenerator.string(10);
                        let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                        let obj_id1 = obj1.desc().object_id();
                        obj_list.push(obj_id1);
                        let save = await stack.non_service().put_object({
                            common: {
                                dec_id:ZoneSimulator.APPID,
                                flags: 0,
                                //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                level: cyfs.NONAPILevel.NOC //设置路由类型
                            },
                            object: new cyfs.NONObjectInfo(obj1.desc().calculate_id(), obj1.to_vec().unwrap()),
                            access: cyfs.AccessString.full()
        
                        })
                        let create = await op_env.insert(insert_path,obj_id1);
                        assert.ok(!create.err);
                        obj_path_list_set.push({
                            path:insert_path,
                            key:key,
                            value:obj_id1
                        });
                    }
                    let result3 =  await op_env.commit();
                    let begin =Date.now();
                    console.info(JSON.stringify(result3))
                    assert.ok(!result3.err)
                    let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                    let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                    while( Number(standby_ood_revision) < Number(ood_revision)){
                        standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                        await cyfs.sleep(2000)
                   }
                   let  async_time = Date.now() - begin;
                   console.info(`从OOD数据同步时间`)
                   for(let i in obj_list){
                    let get_ret = await stack_standby_ood.non_service().get_object({
                        object_id:obj_list[i],
                        common: {
                            req_path: "/qa/get_object",
                            level: cyfs.NONAPILevel.NOC,
                            dec_id:ZoneSimulator.APPID,
                            flags: 0,
                        }});
                        assert.ok(!get_ret.err);
                        let check = get_ret.unwrap().object;
                        assert.ok(check.object_id.to_base_58() == obj_list[i].to_base_58() ,`${check.object_id} != ${obj_list[i]}`);
                   }
                })
            
            })
            describe("Set 类型数据 删除值 同步校验",async()=>{
                it("#业务流程测试",async()=>{
                    // (1) 主 OOD root_state 插入数据commit
                    let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                    let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                    assert.ok(!result.err);
                    let op_env = result.unwrap();
                    let insert_path = obj_path_list_set[0].path;
                    for(let i in obj_path_list_set){
                        let obj_id1 = obj_path_list_set[i].value;
                        let create = await op_env.remove(insert_path,obj_id1);
                        assert.ok(!create.err);
                    }
                    let result3 =  await op_env.commit();
                    let begin =Date.now();
                    console.info(JSON.stringify(result3))
                    assert.ok(!result3.err)
                    let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                    let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                    while( Number(standby_ood_revision) < Number(ood_revision)){
                        standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                        await cyfs.sleep(2000)
                   }
                   let  async_time = Date.now() - begin;
                   console.info(`从OOD数据同步时间`)
                   for(let i in obj_path_list_set){
                    let get_ret = await stack_standby_ood.non_service().get_object({
                        object_id:obj_path_list_set[i].value,
                        common: {
                            req_path: "/qa/get_object",
                            level: cyfs.NONAPILevel.NOC,
                            dec_id:ZoneSimulator.APPID,
                            flags: 0,
                        }});
                        console.info(`从OOD 检查 remove 后本地NOC ${JSON.stringify(get_ret)}`)
                        //assert.ok(!get_ret.err);
                        
                   }
                })
            
            })
        })
        describe("#关联Object NON操作 修改主OOD object ，从OOD同步机制（目前不同步数据）",async()=>{
            let obj_path_list_map :Array<{
                path:string,
                key:string,
                value:cyfs.ObjectId,
                prev? :cyfs.ObjectId,
            }> = [];
            before(async()=>{
                // (1) 主 OOD root_state 插入数据commit
                let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                assert.ok(!result.err);
                let op_env = result.unwrap();
                let obj_list:Array<cyfs.ObjectId> = [];
                for(let i=0;i<10;i++){
                    let insert_path = `/qaTest/${RandomGenerator.string(10)}/${RandomGenerator.string(10)}`
                    let key = RandomGenerator.string(10);
                    let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                    let obj_id1 = obj1.desc().object_id();
                    obj_list.push(obj_id1);
                    let save = await stack.non_service().put_object({
                        common: {
                            dec_id:ZoneSimulator.APPID,
                            flags: 0,
                            //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                            level: cyfs.NONAPILevel.NOC //设置路由类型
                        },
                        object: new cyfs.NONObjectInfo(obj1.desc().calculate_id(), obj1.to_vec().unwrap()),
                        access: cyfs.AccessString.full()
                    })
                    let create = await op_env.insert_with_key(insert_path,key,obj_id1)
                    assert.ok(!create.err);
                    obj_path_list_map.push({
                        path:insert_path,
                        key:key,
                        value:obj_id1
                    });
                }
                let result3 =  await op_env.commit();
                let begin =Date.now();
                console.info(JSON.stringify(result3))
                assert.ok(!result3.err)
                let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                while( Number(standby_ood_revision) < Number(ood_revision)){
                    standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                    await cyfs.sleep(2000)
               }
               let  async_time = Date.now() - begin;
               console.info(`从OOD数据同步时间`)
               for(let i in obj_list){
                let get_ret = await stack_standby_ood.non_service().get_object({
                    object_id:obj_list[i],
                    common: {
                        req_path: "/qa/get_object",
                        level: cyfs.NONAPILevel.NOC,
                        dec_id:ZoneSimulator.APPID,
                        flags: 0,
                    }});
                    assert.ok(!get_ret.err);
                    let check = get_ret.unwrap().object;
                    assert.ok(check.object_id.to_base_58() == obj_list[i].to_base_58() ,`${check.object_id} != ${obj_list[i]}`);
               }
            })
            describe("主OOD 修改NOC中Object body",async()=>{
                
                it("#业务流程测试",async()=>{
                    // (1) 主 OOD root_state 插入数据commit
                    let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                    let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                    assert.ok(!result.err);
                    let op_env = result.unwrap();
                    let obj_list:Array<cyfs.ObjectId> = [];
                    for(let i in obj_path_list_map){
                        let get_ret = await stack.non_service().get_object({
                            object_id:obj_path_list_map[i].value,
                            common: {
                                req_path: "/qa/get_object",
                                level: cyfs.NONAPILevel.NOC,
                                dec_id:ZoneSimulator.APPID,
                                flags: 0,
                            }});
                        assert.ok(!get_ret.err);
                        let [ood_obj] = new cyfs.TextObjectDecoder().raw_decode(get_ret.unwrap().object.object_raw).unwrap();
                        ood_obj.value = RandomGenerator.string(100);
                        let save = await stack.non_service().put_object({
                            common: {
                                dec_id:ZoneSimulator.APPID,
                                flags: 0,
                                //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                level: cyfs.NONAPILevel.NOC //设置路由类型
                            },
                            object: new cyfs.NONObjectInfo(ood_obj.desc().calculate_id(), ood_obj.to_vec().unwrap()),
                            access: cyfs.AccessString.full()
                        })
                        assert.ok(save)
                    }
                    let result3 =  await op_env.commit();
                    let begin =Date.now();
                    console.info(JSON.stringify(result3))
                    assert.ok(!result3.err)
                    let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                    let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                    while( Number(standby_ood_revision) < Number(ood_revision)){
                        standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                        await cyfs.sleep(2000)
                   }
                   let  async_time = Date.now() - begin;
                   console.info(`从OOD数据同步时间`)
                   for(let i in obj_list){
                    let get_ret = await stack_standby_ood.non_service().get_object({
                        object_id:obj_list[i],
                        common: {
                            req_path: "/qa/get_object",
                            level: cyfs.NONAPILevel.NOC,
                            dec_id:ZoneSimulator.APPID,
                            flags: 0,
                        }});
                        assert.ok(!get_ret.err);
                        let check = get_ret.unwrap().object;
                        assert.ok(check.object_id.to_base_58() == obj_list[i].to_base_58() ,`${check.object_id} != ${obj_list[i]}`);
                   }
                })
            
            })
            describe("主OOD 删除NOC中Object",async()=>{
                it("#业务流程测试",async()=>{
                    // (1) 主 OOD root_state 插入数据commit
                    let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                    let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                    assert.ok(!result.err);
                    let op_env = result.unwrap();
                    let obj_list:Array<cyfs.ObjectId> = [];
                    for(let i in obj_path_list_map){
                        let get_ret = await stack.non_service().get_object({
                            object_id:obj_path_list_map[i].value,
                            common: {
                                req_path: "/qa/get_object",
                                level: cyfs.NONAPILevel.NOC,
                                dec_id:ZoneSimulator.APPID,
                                flags: 0,
                            }});
                        assert.ok(!get_ret.err);
                        let [ood_obj] = new cyfs.TextObjectDecoder().raw_decode(get_ret.unwrap().object.object_raw).unwrap();
                        ood_obj.value = RandomGenerator.string(100);
                        let save = await stack.non_service().delete_object({
                            common: {
                                dec_id:ZoneSimulator.APPID,
                                flags: 0,
                                level: cyfs.NONAPILevel.NOC //设置路由类型
                            },
                            object_id: ood_obj.desc().calculate_id()
                        })
                        assert.ok(save)
                    }
                    let result3 =  await op_env.commit();
                    let begin =Date.now();
                    console.info(JSON.stringify(result3))
                    assert.ok(!result3.err)
                    let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                    let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                    while( Number(standby_ood_revision) < Number(ood_revision)){
                        standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                        await cyfs.sleep(2000)
                   }
                   let  async_time = Date.now() - begin;
                   console.info(`从OOD数据同步时间`)
                   for(let i in obj_list){
                    let get_ret = await stack_standby_ood.non_service().get_object({
                        object_id:obj_list[i],
                        common: {
                            req_path: "/qa/get_object",
                            level: cyfs.NONAPILevel.NOC,
                            dec_id:ZoneSimulator.APPID,
                            flags: 0,
                        }});
                        assert.ok(!get_ret.err);
                        let check = get_ret.unwrap().object;
                        assert.ok(check.object_id.to_base_58() == obj_list[i].to_base_58() ,`${check.object_id} != ${obj_list[i]}`);
                   }
                })
                
            })
        })
        describe("NameObject 数据类型校验",async()=>{
            describe("标准对象",async()=>{
                it("#业务流程测试",async()=>{
                    // (1) 主 OOD root_state 插入数据commit
                    let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                    let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                    assert.ok(!result.err);
                    let op_env = result.unwrap();
                    let obj_list:Array<cyfs.ObjectId> = [];
                    for(let i=0;i<10;i++){
                        let insert_path = `/qaTest/${RandomGenerator.string(10)}/${RandomGenerator.string(10)}`
                        let key = RandomGenerator.string(10);
                        //let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                        let pk = cyfs.PrivateKey.generate_rsa(1024).unwrap();
                        let public_key = pk.public();
                        let unique = cyfs.UniqueId.copy_from_slice(stringToUint8Array(Date.now().toString()))
                        let obj1 = cyfs.Device.create(cyfs.None, unique, [], [], [], public_key, cyfs.Area.default(), cyfs.DeviceCategory.PC);
                        let obj_id1 = obj1.desc().object_id();
                        obj_list.push(obj_id1);
                        let save = await stack.non_service().put_object({
                            common: {
                                dec_id:ZoneSimulator.APPID,
                                flags: 0,
                                //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                level: cyfs.NONAPILevel.NOC //设置路由类型
                            },
                            object: new cyfs.NONObjectInfo(obj1.desc().calculate_id(), obj1.to_vec().unwrap()),
                            access: cyfs.AccessString.full()
                        })
                        let create = await op_env.insert_with_key(insert_path,key,obj_id1)
                        assert.ok(!create.err);
                    }
                    let result3 =  await op_env.commit();
                    let begin =Date.now();
                    console.info(JSON.stringify(result3))
                    assert.ok(!result3.err)
                    let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                    let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                    while( Number(standby_ood_revision) < Number(ood_revision)){
                        standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                        await cyfs.sleep(2000)
                   }
                   let  async_time = Date.now() - begin;
                   console.info(`从OOD数据同步时间`)
                   for(let i in obj_list){
                    let get_ret = await stack_standby_ood.non_service().get_object({
                        object_id:obj_list[i],
                        common: {
                            req_path: "/qa/get_object",
                            level: cyfs.NONAPILevel.NOC,
                            dec_id:ZoneSimulator.APPID,
                            flags: 0,
                        }});
                        assert.ok(!get_ret.err);
                        let check = get_ret.unwrap().object;
                        assert.ok(check.object_id.to_base_58() == obj_list[i].to_base_58() ,`${check.object_id} != ${obj_list[i]}`);
                   }
                })
            
            })
            describe("核心对象",async()=>{
                it("#业务流程测试",async()=>{
                    // (1) 主 OOD root_state 插入数据commit
                    let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                    let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                    assert.ok(!result.err);
                    let op_env = result.unwrap();
                    let obj_list:Array<cyfs.ObjectId> = [];
                    for(let i=0;i<10;i++){
                        let insert_path = `/qaTest/${RandomGenerator.string(10)}/${RandomGenerator.string(10)}`
                        let key = RandomGenerator.string(10);
                        let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                        let obj_id1 = obj1.desc().object_id();
                        obj_list.push(obj_id1);
                        let save = await stack.non_service().put_object({
                            common: {
                                dec_id:ZoneSimulator.APPID,
                                flags: 0,
                                //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                level: cyfs.NONAPILevel.NOC //设置路由类型
                            },
                            object: new cyfs.NONObjectInfo(obj1.desc().calculate_id(), obj1.to_vec().unwrap()),
                            access: cyfs.AccessString.full()
                        })
                        let create = await op_env.insert_with_key(insert_path,key,obj_id1)
                        assert.ok(!create.err);
                    }
                    let result3 =  await op_env.commit();
                    let begin =Date.now();
                    console.info(JSON.stringify(result3))
                    assert.ok(!result3.err)
                    let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                    let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                    while( Number(standby_ood_revision) < Number(ood_revision)){
                        standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                        await cyfs.sleep(2000)
                   }
                   let  async_time = Date.now() - begin;
                   console.info(`从OOD数据同步时间`)
                   for(let i in obj_list){
                    let get_ret = await stack_standby_ood.non_service().get_object({
                        object_id:obj_list[i],
                        common: {
                            req_path: "/qa/get_object",
                            level: cyfs.NONAPILevel.NOC,
                            dec_id:ZoneSimulator.APPID,
                            flags: 0,
                        }});
                        assert.ok(!get_ret.err);
                        let check = get_ret.unwrap().object;
                        assert.ok(check.object_id.to_base_58() == obj_list[i].to_base_58() ,`${check.object_id} != ${obj_list[i]}`);
                   }
                })
            
            })
            describe("扩展对象",async()=>{
                it("#业务流程测试",async()=>{
                    // (1) 主 OOD root_state 插入数据commit
                    let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                    let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                    assert.ok(!result.err);
                    let op_env = result.unwrap();
                    let obj_list:Array<cyfs.ObjectId> = [];
                    for(let i=0;i<10;i++){
                        let insert_path = `/qaTest/${RandomGenerator.string(10)}/${RandomGenerator.string(10)}`
                        let key = RandomGenerator.string(10);
                        let obj1 =TestcaseObject.create(
                            cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),
                            RandomGenerator.string(10),
                            RandomGenerator.string(10),
                            RandomGenerator.string(10),
                            RandomGenerator.string(10),
                            RandomGenerator.string(10),
                            RandomGenerator.string(10),
                            RandomGenerator.string(10),
                            RandomGenerator.string(10),
                            Date.now(),
                            Date.now(),
                            RandomGenerator.string(10),
                            RandomGenerator.string(10),
                            RandomGenerator.string(10),
                            RandomGenerator.string(10),
                            RandomGenerator.string(10),);
                        let obj_id1 = obj1.desc().object_id();
                        obj_list.push(obj_id1);
                        let save = await stack.non_service().put_object({
                            common: {
                                dec_id:ZoneSimulator.APPID,
                                flags: 0,
                                //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                level: cyfs.NONAPILevel.NOC //设置路由类型
                            },
                            object: new cyfs.NONObjectInfo(obj1.desc().calculate_id(), obj1.to_vec().unwrap()),
                            access: cyfs.AccessString.full()
                        })
                        let create = await op_env.insert_with_key(insert_path,key,obj_id1)
                        assert.ok(!create.err);
                    }
                    let result3 =  await op_env.commit();
                    let begin =Date.now();
                    console.info(JSON.stringify(result3))
                    assert.ok(!result3.err)
                    let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                    let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                    while( Number(standby_ood_revision) < Number(ood_revision)){
                        standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                        await cyfs.sleep(2000)
                   }
                   let  async_time = Date.now() - begin;
                   console.info(`从OOD数据同步时间`)
                   for(let i in obj_list){
                    let get_ret = await stack_standby_ood.non_service().get_object({
                        object_id:obj_list[i],
                        common: {
                            req_path: "/qa/get_object",
                            level: cyfs.NONAPILevel.NOC,
                            dec_id:ZoneSimulator.APPID,
                            flags: 0,
                        }});
                        assert.ok(!get_ret.err);
                        let check = get_ret.unwrap().object;
                        assert.ok(check.object_id.to_base_58() == obj_list[i].to_base_58() ,`${check.object_id} != ${obj_list[i]}`);
                   }
                })
            
            })
        })
        describe("关联数据类型同步校验",async()=>{
            describe("结构化数据",async()=>{

                describe("关联对象 owner 同步 NameObject数据",async()=>{
                    it("#业务流程测试",async()=>{
                        // (1) 主 OOD root_state 插入数据commit
                        let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                        let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                        assert.ok(!result.err);
                        let op_env = result.unwrap();
                        let obj_list:Array<cyfs.ObjectId> = [];
                        for(let i=0;i<10;i++){
                            let insert_path = `/qaTest/${RandomGenerator.string(10)}/${RandomGenerator.string(10)}`
                            let key = RandomGenerator.string(10);
                            let [owner] = createPeople();
                            
                            let save_1 = await stack.non_service().put_object({
                                common: {
                                    dec_id:ZoneSimulator.APPID,
                                    flags: 0,
                                    //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                    level: cyfs.NONAPILevel.NOC //设置路由类型
                                },
                                object: new cyfs.NONObjectInfo(owner.desc().calculate_id(), owner.to_vec().unwrap()),
                                access: cyfs.AccessString.full()
                            })
                            assert.ok(!save_1.err)

                            let obj1 = MyTest.create(cyfs.Some(owner.calculate_id()),cyfs.None,cyfs.None,cyfs.None,cyfs.None,RandomGenerator.string(10),RandomGenerator.string(10));
                            let obj_id1 = obj1.desc().object_id();
                            obj_list.push(owner.desc().calculate_id());
                            obj_list.push(obj_id1);
                            let save = await stack.non_service().put_object({
                                common: {
                                    dec_id:ZoneSimulator.APPID,
                                    flags: 0,
                                    //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                    level: cyfs.NONAPILevel.NOC //设置路由类型
                                },
                                object: new cyfs.NONObjectInfo(obj1.desc().calculate_id(), obj1.to_vec().unwrap()),
                                access: cyfs.AccessString.full()
                            })
                            let create = await op_env.insert_with_key(insert_path,key,obj_id1)
                            assert.ok(!create.err);
                        }
                        let result3 =  await op_env.commit();
                        let begin =Date.now();
                        console.info(JSON.stringify(result3))
                        assert.ok(!result3.err)
                        let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                        let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                        while( Number(standby_ood_revision) < Number(ood_revision)){
                            standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                            console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                            await cyfs.sleep(2000)
                       }
                       let  async_time = Date.now() - begin;
                       console.info(`从OOD数据同步时间`)
                       for(let i in obj_list){
                        let get_ret = await stack_standby_ood.non_service().get_object({
                            object_id:obj_list[i],
                            common: {
                                req_path: "/qa/get_object",
                                level: cyfs.NONAPILevel.NOC,
                                dec_id:ZoneSimulator.APPID,
                                flags: 0,
                            }});
                            assert.ok(!get_ret.err);
                            let check = get_ret.unwrap().object;
                            assert.ok(check.object_id.to_base_58() == obj_list[i].to_base_58() ,`${check.object_id} != ${obj_list[i]}`);
                       }
                    })
                
                })
                describe("关联对象 author 同步 NameObject数据",async()=>{
                    it("#业务流程测试",async()=>{
                        // (1) 主 OOD root_state 插入数据commit
                        let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                        let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                        assert.ok(!result.err);
                        let op_env = result.unwrap();
                        let obj_list:Array<cyfs.ObjectId> = [];
                        for(let i=0;i<10;i++){
                            let insert_path = `/qaTest/${RandomGenerator.string(10)}/${RandomGenerator.string(10)}`
                            let key = RandomGenerator.string(10);
                 
                            let [author] = createPeople();

                            let save_1 = await stack.non_service().put_object({
                                common: {
                                    dec_id:ZoneSimulator.APPID,
                                    flags: 0,
                                    //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                    level: cyfs.NONAPILevel.NOC //设置路由类型
                                },
                                object: new cyfs.NONObjectInfo(author.desc().calculate_id(), author.to_vec().unwrap()),
                                access: cyfs.AccessString.full()
                            })
                            assert.ok(!save_1.err)

                            let obj1 = MyTest.create(cyfs.None,cyfs.Some(author.calculate_id()),cyfs.None,cyfs.None,cyfs.None,RandomGenerator.string(10),RandomGenerator.string(10));
                            let obj_id1 = obj1.desc().object_id();
                            obj_list.push(author.calculate_id());
                            obj_list.push(obj_id1);
                            let save = await stack.non_service().put_object({
                                common: {
                                    dec_id:ZoneSimulator.APPID,
                                    flags: 0,
                                    //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                    level: cyfs.NONAPILevel.NOC //设置路由类型
                                },
                                object: new cyfs.NONObjectInfo(obj1.desc().calculate_id(), obj1.to_vec().unwrap()),
                                access: cyfs.AccessString.full()
                            })
                            let create = await op_env.insert_with_key(insert_path,key,obj_id1)
                            assert.ok(!create.err);
                        }
                        let result3 =  await op_env.commit();
                        let begin =Date.now();
                        console.info(JSON.stringify(result3))
                        assert.ok(!result3.err)
                        let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                        let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                        while( Number(standby_ood_revision) < Number(ood_revision)){
                            standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                            console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                            await cyfs.sleep(2000)
                       }
                       let  async_time = Date.now() - begin;
                       console.info(`从OOD数据同步时间`)
                       for(let i in obj_list){
                        let get_ret = await stack_standby_ood.non_service().get_object({
                            object_id:obj_list[i],
                            common: {
                                req_path: "/qa/get_object",
                                level: cyfs.NONAPILevel.NOC,
                                dec_id:ZoneSimulator.APPID,
                                flags: 0,
                            }});
                            assert.ok(!get_ret.err);
                            let check = get_ret.unwrap().object;
                            assert.ok(check.object_id.to_base_58() == obj_list[i].to_base_58() ,`${check.object_id} != ${obj_list[i]}`);
                       }
                    })
                
                })
                describe("关联对象 prev 同步NameObject数据",async()=>{
                    it("#业务流程测试",async()=>{
                        // (1) 主 OOD root_state 插入数据commit
                        let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                        let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                        assert.ok(!result.err);
                        let op_env = result.unwrap();
                        let obj_list:Array<cyfs.ObjectId> = [];
                        for(let i=0;i<10;i++){
                            let insert_path = `/qaTest/${RandomGenerator.string(10)}/${RandomGenerator.string(10)}`
                            let key = RandomGenerator.string(10);
                 
                            let [prev] = createPeople();

                            let save_1 = await stack.non_service().put_object({
                                common: {
                                    dec_id:ZoneSimulator.APPID,
                                    flags: 0,
                                    //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                    level: cyfs.NONAPILevel.NOC //设置路由类型
                                },
                                object: new cyfs.NONObjectInfo(prev.desc().calculate_id(), prev.to_vec().unwrap()),
                                access: cyfs.AccessString.full()
                            })
                            assert.ok(!save_1.err)

                            let obj1 = MyTest.create(cyfs.None,cyfs.None,cyfs.Some(prev.calculate_id()),cyfs.None,cyfs.None,RandomGenerator.string(10),RandomGenerator.string(10));
                            let obj_id1 = obj1.desc().object_id();
                            obj_list.push(prev.calculate_id());
                            obj_list.push(obj_id1);
                            let save = await stack.non_service().put_object({
                                common: {
                                    dec_id:ZoneSimulator.APPID,
                                    flags: 0,
                                    //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                    level: cyfs.NONAPILevel.NOC //设置路由类型
                                },
                                object: new cyfs.NONObjectInfo(obj1.desc().calculate_id(), obj1.to_vec().unwrap()),
                                access: cyfs.AccessString.full()
                            })
                            let create = await op_env.insert_with_key(insert_path,key,obj_id1)
                            assert.ok(!create.err);
                        }
                        let result3 =  await op_env.commit();
                        let begin =Date.now();
                        console.info(JSON.stringify(result3))
                        assert.ok(!result3.err)
                        let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                        let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                        while( Number(standby_ood_revision) < Number(ood_revision)){
                            standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                            console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                            await cyfs.sleep(2000)
                       }
                       let  async_time = Date.now() - begin;
                       console.info(`从OOD数据同步时间`)
                       for(let i in obj_list){
                        let get_ret = await stack_standby_ood.non_service().get_object({
                            object_id:obj_list[i],
                            common: {
                                req_path: "/qa/get_object",
                                level: cyfs.NONAPILevel.NOC,
                                dec_id:ZoneSimulator.APPID,
                                flags: 0,
                            }});
                            assert.ok(!get_ret.err);
                            let check = get_ret.unwrap().object;
                            assert.ok(check.object_id.to_base_58() == obj_list[i].to_base_58() ,`${check.object_id} != ${obj_list[i]}`);
                       }
                    })
                
                })

                describe("关联对象 ref_objs 同步NameObject数据",async()=>{
                    it("#业务流程测试",async()=>{
                        // (1) 主 OOD root_state 插入数据commit
                        let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                        let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                        assert.ok(!result.err);
                        let op_env = result.unwrap();
                        let obj_list:Array<cyfs.ObjectId> = [];
                        for(let i=0;i<10;i++){
                            let insert_path = `/qaTest/${RandomGenerator.string(10)}/${RandomGenerator.string(10)}`
                            let key = RandomGenerator.string(10);
                 
                            let [prev] = createPeople();

                            let save_1 = await stack.non_service().put_object({
                                common: {
                                    dec_id:ZoneSimulator.APPID,
                                    flags: 0,
                                    //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                    level: cyfs.NONAPILevel.NOC //设置路由类型
                                },
                                object: new cyfs.NONObjectInfo(prev.desc().calculate_id(), prev.to_vec().unwrap()),
                                access: cyfs.AccessString.full()
                            })
                            let [prev2] = createPeople();

                            let save_1_2 = await stack.non_service().put_object({
                                common: {
                                    dec_id:ZoneSimulator.APPID,
                                    flags: 0,
                                    //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                    level: cyfs.NONAPILevel.NOC //设置路由类型
                                },
                                object: new cyfs.NONObjectInfo(prev2.desc().calculate_id(), prev2.to_vec().unwrap()),
                                access: cyfs.AccessString.full()
                            })
                            assert.ok(!save_1_2.err)
                            let ref_objects : cyfs.Option<cyfs.Vec<cyfs.ObjectLink>> = cyfs.Some(new cyfs.Vec([ new cyfs.ObjectLink(prev.calculate_id(),cyfs.None),new cyfs.ObjectLink(prev2.calculate_id(),cyfs.None)]))
                            let obj1 = MyTest.create(cyfs.None,cyfs.None,cyfs.None,ref_objects,cyfs.None,RandomGenerator.string(10),RandomGenerator.string(10));
                            let obj_id1 = obj1.desc().object_id();
                            obj_list.push(prev.calculate_id());
                            obj_list.push(prev2.calculate_id());
                            obj_list.push(obj_id1);
                            let save = await stack.non_service().put_object({
                                common: {
                                    dec_id:ZoneSimulator.APPID,
                                    flags: 0,
                                    //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                    level: cyfs.NONAPILevel.NOC //设置路由类型
                                },
                                object: new cyfs.NONObjectInfo(obj1.desc().calculate_id(), obj1.to_vec().unwrap()),
                                access: cyfs.AccessString.full()
                            })
                            let create = await op_env.insert_with_key(insert_path,key,obj_id1)
                            assert.ok(!create.err);
                        }
                        let result3 =  await op_env.commit();
                        let begin =Date.now();
                        console.info(JSON.stringify(result3))
                        assert.ok(!result3.err)
                        let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                        let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                        while( Number(standby_ood_revision) < Number(ood_revision)){
                            standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                            console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                            await cyfs.sleep(2000)
                       }
                       let  async_time = Date.now() - begin;
                       console.info(`从OOD数据同步时间`)
                       for(let i in obj_list){
                        let get_ret = await stack_standby_ood.non_service().get_object({
                            object_id:obj_list[i],
                            common: {
                                req_path: "/qa/get_object",
                                level: cyfs.NONAPILevel.NOC,
                                dec_id:ZoneSimulator.APPID,
                                flags: 0,
                            }});
                            assert.ok(!get_ret.err);
                            let check = get_ret.unwrap().object;
                            assert.ok(check.object_id.to_base_58() == obj_list[i].to_base_58() ,`${check.object_id} != ${obj_list[i]}`);
                       }
                    })
                
                })
                describe("关联对象 sign_soutce_objs 同步NameObject数据",async()=>{
                    let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                        let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                        assert.ok(!result.err);
                        let op_env = result.unwrap();
                        let obj_list:Array<cyfs.ObjectId> = [];
                        for(let i=0;i<10;i++){
                            let insert_path = `/qaTest/${RandomGenerator.string(10)}/${RandomGenerator.string(10)}`
                            let key = RandomGenerator.string(10);
                 
                            let [people,people_pk] = createPeople();

                            let save_1 = await stack.non_service().put_object({
                                common: {
                                    dec_id:ZoneSimulator.APPID,
                                    flags: 0,
                                    //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                    level: cyfs.NONAPILevel.NOC //设置路由类型
                                },
                                object: new cyfs.NONObjectInfo(people.desc().calculate_id(), people.to_vec().unwrap()),
                                access: cyfs.AccessString.full()
                            })
                            

                            let obj1 = MyTest.create(cyfs.None,cyfs.None,cyfs.None,cyfs.None,cyfs.None,RandomGenerator.string(10),RandomGenerator.string(10));
                            cyfs.sign_and_set_named_object(people_pk,obj1,new cyfs.SignatureObject( new cyfs.ObjectLink(people.desc().calculate_id(),cyfs.Some(people.desc().calculate_id()))))
                            let obj_id1 = obj1.desc().object_id();

                            obj_list.push(obj_id1);
                            let save = await stack.non_service().put_object({
                                common: {
                                    dec_id:ZoneSimulator.APPID,
                                    flags: 0,
                                    //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                    level: cyfs.NONAPILevel.NOC //设置路由类型
                                },
                                object: new cyfs.NONObjectInfo(obj1.desc().calculate_id(), obj1.to_vec().unwrap()),
                                access: cyfs.AccessString.full()
                            })
                            let create = await op_env.insert_with_key(insert_path,key,obj_id1)
                            assert.ok(!create.err);
                        }
                        let result3 =  await op_env.commit();
                        let begin =Date.now();
                        console.info(JSON.stringify(result3))
                        assert.ok(!result3.err)
                        let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                        let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                        while( Number(standby_ood_revision) < Number(ood_revision)){
                            standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                            console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                            await cyfs.sleep(2000)
                       }
                       let  async_time = Date.now() - begin;
                       console.info(`从OOD数据同步时间`)
                       for(let i in obj_list){
                        let get_ret = await stack_standby_ood.non_service().get_object({
                            object_id:obj_list[i],
                            common: {
                                req_path: "/qa/get_object",
                                level: cyfs.NONAPILevel.NOC,
                                dec_id:ZoneSimulator.APPID,
                                flags: 0,
                            }});
                            assert.ok(!get_ret.err);
                            let check = get_ret.unwrap().object;
                            assert.ok(check.object_id.to_base_58() == obj_list[i].to_base_58() ,`${check.object_id} != ${obj_list[i]}`);
                       }
                    }               
            )
            describe("非结构化数据",async()=>{
                describe("关联对象 owner 同步 Chunk 数据",async()=>{
                    it("#业务流程测试",async()=>{
                        // (1) 主 OOD root_state 插入数据commit
                        let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                        let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                        assert.ok(!result.err);
                        let op_env = result.unwrap();
                        let obj_list:Array<cyfs.ObjectId> = [];
                        let insert_path = `/qaTest/${RandomGenerator.string(10)}`
                        for(let i=0;i<10;i++){
                            let key = RandomGenerator.string(10);
                            let randomStr = RandomGenerator.string(4*1024*1024);
                            let uint8Array : Uint8Array = stringToUint8Array(randomStr)
                            let chunkId = cyfs.ChunkId.calculate(uint8Array);
                            let chunkId1 = chunkId.unwrap();
                            obj_list.push(chunkId1.calculate_id());
                            console.info(`测试随机的chunkId 为：${chunkId}`)
                            let rep : cyfs.NDNPutDataOutputRequest = {
                                common: {
                                    // 请求路径，可为空
                                    req_path : "qaTest",
                                    // 来源DEC
                                    dec_id: ZoneSimulator.APPID,
                                    // api级别
                                    level: cyfs.NDNAPILevel.NDC,
                                    // targrt设备参数目前无用
                                    target: stack.local_device_id().object_id,
                                    // 需要处理数据的关联对象，主要用以chunk/file等
                                    referer_object: [],
                                    flags: 0,
                                },
                                object_id: chunkId.unwrap().desc().calculate_id(),
                                length: uint8Array.length,
                                data: uint8Array,
                            }
                            //调用接口
                            let resp =  await stack.ndn_service().put_data(rep);
                            console.info(`${resp}`)
                            let obj1 = MyTest.create(cyfs.Some(chunkId1.calculate_id()),cyfs.None,cyfs.None,cyfs.None,cyfs.None,RandomGenerator.string(10),RandomGenerator.string(10));                            
                            let save = await stack.non_service().put_object({
                                common: {
                                    dec_id:ZoneSimulator.APPID,
                                    flags: 0,
                                    //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                    level: cyfs.NONAPILevel.NOC //设置路由类型
                                },
                                object: new cyfs.NONObjectInfo(obj1.calculate_id(), obj1.to_vec().unwrap()),
                                access: cyfs.AccessString.full()
                            })
                            console.info("save",JSON.stringify(save))                           
                            let create = await op_env.insert_with_key(insert_path,key,obj1.calculate_id());
                            assert.ok(!create.err);
                        }
                        let result3 =  await op_env.commit();
                        let begin =Date.now();
                        console.info(JSON.stringify(result3))
                        assert.ok(!result3.err)
                        let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                        let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                        while( Number(standby_ood_revision) < Number(ood_revision)){
                            standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                            console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                            await cyfs.sleep(2000)
                       }
                       let  async_time = Date.now() - begin;
                       console.info(`从OOD数据同步时间`)
                       for(let i in obj_list){
                            let rep2 : cyfs.NDNGetDataOutputRequest = {
                                common: {
                                    // 请求路径，可为空
                                    req_path : "qaTest",
                                    // 来源DEC
                                    dec_id: ZoneSimulator.APPID,
                                    // api级别
                                    level: cyfs.NDNAPILevel.NDC,
                                    // targrt设备参数
                                    // 需要处理数据的关联对象，主要用以chunk/file等
                                    referer_object: [],
                                    flags: 0,
                                },
                                object_id: obj_list[i],
                                inner_path: `qaTest`,
                            }
                            //调用接口
                            let resp =  await stack_standby_ood.ndn_service().get_data(rep2);
                            console.info(`${resp}`)
                       }
                        
                    })
                
                })
                describe("关联对象 author 同步 Chunk数据",async()=>{
                    it("#业务流程测试",async()=>{
                        // (1) 主 OOD root_state 插入数据commit
                        let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                        let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                        assert.ok(!result.err);
                        let op_env = result.unwrap();
                        let obj_list:Array<cyfs.ObjectId> = [];
                        let insert_path = `/qaTest/${RandomGenerator.string(10)}`
                        for(let i=0;i<10;i++){
                            let key = RandomGenerator.string(10);
                            let randomStr = RandomGenerator.string(4*1024*1024);
                            let uint8Array : Uint8Array = stringToUint8Array(randomStr)
                            let chunkId = cyfs.ChunkId.calculate(uint8Array);
                            let chunkId1 = chunkId.unwrap();
                            obj_list.push(chunkId1.calculate_id());
                            console.info(`测试随机的chunkId 为：${chunkId}`)
                            let rep : cyfs.NDNPutDataOutputRequest = {
                                common: {
                                    // 请求路径，可为空
                                    req_path : "qaTest",
                                    // 来源DEC
                                    dec_id: ZoneSimulator.APPID,
                                    // api级别
                                    level: cyfs.NDNAPILevel.NDC,
                                    // targrt设备参数目前无用
                                    target: stack.local_device_id().object_id,
                                    // 需要处理数据的关联对象，主要用以chunk/file等
                                    referer_object: [],
                                    flags: 0,
                                },
                                object_id: chunkId.unwrap().desc().calculate_id(),
                                length: uint8Array.length,
                                data: uint8Array,
                            }
                            //调用接口
                            let resp =  await stack.ndn_service().put_data(rep);
                            console.info(`${resp}`)
                            let obj1 = MyTest.create(cyfs.None,cyfs.Some(chunkId1.calculate_id()),cyfs.None,cyfs.None,cyfs.None,RandomGenerator.string(10),RandomGenerator.string(10));

                            let save = await stack.non_service().put_object({
                                common: {
                                    dec_id:ZoneSimulator.APPID,
                                    flags: 0,
                                    //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                    level: cyfs.NONAPILevel.NOC //设置路由类型
                                },
                                object: new cyfs.NONObjectInfo(obj1.calculate_id(), obj1.to_vec().unwrap()),
                                access: cyfs.AccessString.full()
                            })
                            console.info("save",JSON.stringify(save)) 

                            let create = await op_env.insert_with_key(insert_path,key,obj1.calculate_id());
                            assert.ok(!create.err);
                        }
                        let result3 =  await op_env.commit();
                        let begin =Date.now();
                        console.info(JSON.stringify(result3))
                        assert.ok(!result3.err)
                        let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                        let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                        while( Number(standby_ood_revision) < Number(ood_revision)){
                            standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                            console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                            await cyfs.sleep(2000)
                       }
                       let  async_time = Date.now() - begin;
                       console.info(`从OOD数据同步时间`)
                       for(let i in obj_list){
                            let rep2 : cyfs.NDNGetDataOutputRequest = {
                                common: {
                                    // 请求路径，可为空
                                    req_path : "qaTest",
                                    // 来源DEC
                                    dec_id: ZoneSimulator.APPID,
                                    // api级别
                                    level: cyfs.NDNAPILevel.NDC,
                                    // targrt设备参数
                                    // 需要处理数据的关联对象，主要用以chunk/file等
                                    referer_object: [],
                                    flags: 0,
                                },
                                object_id: obj_list[i],
                                inner_path: `qaTest`,
                            }
                            //调用接口
                            let resp =  await stack_standby_ood.ndn_service().get_data(rep2);
                            console.info(`${resp}`)
                       }
                        
                    })
                
                })
                describe("关联对象 prev 同步 Chunk数据",async()=>{
                    it("#业务流程测试",async()=>{
                        // (1) 主 OOD root_state 插入数据commit
                        let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                        let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                        assert.ok(!result.err);
                        let op_env = result.unwrap();
                        let obj_list:Array<cyfs.ObjectId> = [];
                        let insert_path = `/qaTest/${RandomGenerator.string(10)}`
                        for(let i=0;i<10;i++){
                            let key = RandomGenerator.string(10);
                            let randomStr = RandomGenerator.string(4*1024*1024);
                            let uint8Array : Uint8Array = stringToUint8Array(randomStr)
                            let chunkId = cyfs.ChunkId.calculate(uint8Array);
                            let chunkId1 = chunkId.unwrap();
                            obj_list.push(chunkId1.calculate_id());
                            console.info(`测试随机的chunkId 为：${chunkId}`)
                            let rep : cyfs.NDNPutDataOutputRequest = {
                                common: {
                                    // 请求路径，可为空
                                    req_path : "qaTest",
                                    // 来源DEC
                                    dec_id: ZoneSimulator.APPID,
                                    // api级别
                                    level: cyfs.NDNAPILevel.NDC,
                                    // targrt设备参数目前无用
                                    target: stack.local_device_id().object_id,
                                    // 需要处理数据的关联对象，主要用以chunk/file等
                                    referer_object: [],
                                    flags: 0,
                                },
                                object_id: chunkId.unwrap().desc().calculate_id(),
                                length: uint8Array.length,
                                data: uint8Array,
                            }
                            //调用接口
                            let resp =  await stack.ndn_service().put_data(rep);
                            console.info(`${resp}`)
                            let obj1 = MyTest.create(cyfs.None,cyfs.None,cyfs.Some(chunkId1.calculate_id()),cyfs.None,cyfs.None,RandomGenerator.string(10),RandomGenerator.string(10));
                            
                            let save = await stack.non_service().put_object({
                                common: {
                                    dec_id:ZoneSimulator.APPID,
                                    flags: 0,
                                    //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                    level: cyfs.NONAPILevel.NOC //设置路由类型
                                },
                                object: new cyfs.NONObjectInfo(obj1.calculate_id(), obj1.to_vec().unwrap()),
                                access: cyfs.AccessString.full()
                            })
                            console.info("save",JSON.stringify(save)) 

                            let create = await op_env.insert_with_key(insert_path,key,obj1.calculate_id());
                            assert.ok(!create.err);
                        }
                        let result3 =  await op_env.commit();
                        let begin =Date.now();
                        console.info(JSON.stringify(result3))
                        assert.ok(!result3.err)
                        let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                        let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                        while( Number(standby_ood_revision) < Number(ood_revision)){
                            standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                            console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                            await cyfs.sleep(2000)
                       }
                       let  async_time = Date.now() - begin;
                       console.info(`从OOD数据同步时间`)
                       for(let i in obj_list){
                            let rep2 : cyfs.NDNGetDataOutputRequest = {
                                common: {
                                    // 请求路径，可为空
                                    req_path : "qaTest",
                                    // 来源DEC
                                    dec_id: ZoneSimulator.APPID,
                                    // api级别
                                    level: cyfs.NDNAPILevel.NDC,
                                    // targrt设备参数
                                    // 需要处理数据的关联对象，主要用以chunk/file等
                                    referer_object: [],
                                    flags: 0,
                                },
                                object_id: obj_list[i],
                                inner_path: `qaTest`,
                            }
                            //调用接口
                            let resp =  await stack_standby_ood.ndn_service().get_data(rep2);
                            console.info(`${resp}`)
                       }
                        
                    })
                
                })
                describe("关联对象 ref_objs 同步 Chunk数据",async()=>{
                    it("#业务流程测试",async()=>{
                        // (1) 主 OOD root_state 插入数据commit
                        let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                        let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                        assert.ok(!result.err);
                        let op_env = result.unwrap();
                        let obj_list:Array<cyfs.ObjectId> = [];
                        let insert_path = `/qaTest/${RandomGenerator.string(10)}`
                        for(let i=0;i<10;i++){
                            let key = RandomGenerator.string(10);
                            let randomStr = RandomGenerator.string(4*1024*1024);
                            let uint8Array : Uint8Array = stringToUint8Array(randomStr)
                            let chunkId = cyfs.ChunkId.calculate(uint8Array);
                            let chunkId1 = chunkId.unwrap();
                            obj_list.push(chunkId1.calculate_id());
                            console.info(`测试随机的chunkId 为：${chunkId}`)
                            let rep : cyfs.NDNPutDataOutputRequest = {
                                common: {
                                    // 请求路径，可为空
                                    req_path : "qaTest",
                                    // 来源DEC
                                    dec_id: ZoneSimulator.APPID,
                                    // api级别
                                    level: cyfs.NDNAPILevel.NDC,
                                    // targrt设备参数目前无用
                                    target: stack.local_device_id().object_id,
                                    // 需要处理数据的关联对象，主要用以chunk/file等
                                    referer_object: [],
                                    flags: 0,
                                },
                                object_id: chunkId.unwrap().desc().calculate_id(),
                                length: uint8Array.length,
                                data: uint8Array,
                            }
                            //调用接口
                            let resp =  await stack.ndn_service().put_data(rep);
                            console.info(`${resp}`)
                            let ref_objects : cyfs.Option<cyfs.Vec<cyfs.ObjectLink>> = cyfs.Some(new cyfs.Vec([ new cyfs.ObjectLink(chunkId1.calculate_id(),cyfs.None)]))
                            let obj1 = MyTest.create(cyfs.None,cyfs.None,cyfs.None,ref_objects,cyfs.None,RandomGenerator.string(10),RandomGenerator.string(10));

                            let save = await stack.non_service().put_object({
                                common: {
                                    dec_id:ZoneSimulator.APPID,
                                    flags: 0,
                                    //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                    level: cyfs.NONAPILevel.NOC //设置路由类型
                                },
                                object: new cyfs.NONObjectInfo(obj1.calculate_id(), obj1.to_vec().unwrap()),
                                access: cyfs.AccessString.full()
                            })
                            console.info("save",JSON.stringify(save)) 

                            let create = await op_env.insert_with_key(insert_path,key,obj1.calculate_id());
                            assert.ok(!create.err);
                        }
                        let result3 =  await op_env.commit();
                        let begin =Date.now();
                        console.info(JSON.stringify(result3))
                        assert.ok(!result3.err)
                        let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                        let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                        while( Number(standby_ood_revision) < Number(ood_revision)){
                            standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                            console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                            await cyfs.sleep(2000)
                       }
                       let  async_time = Date.now() - begin;
                       console.info(`从OOD数据同步时间`)
                       for(let i in obj_list){
                            let rep2 : cyfs.NDNGetDataOutputRequest = {
                                common: {
                                    // 请求路径，可为空
                                    req_path : "qaTest",
                                    // 来源DEC
                                    dec_id: ZoneSimulator.APPID,
                                    // api级别
                                    level: cyfs.NDNAPILevel.NDC,
                                    // targrt设备参数
                                    // 需要处理数据的关联对象，主要用以chunk/file等
                                    referer_object: [],
                                    flags: 0,
                                },
                                object_id: obj_list[i],
                                inner_path: `qaTest`,
                            }
                            //调用接口
                            let resp =  await stack_standby_ood.ndn_service().get_data(rep2);
                            console.info(`${resp}`)
                       }
                        
                    })
                
                })
                describe("关联对象 sign_soutce_objs 同步 Chunk数据",async()=>{
                    let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                    let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                    assert.ok(!result.err);
                    let op_env = result.unwrap();
                    let obj_list:Array<cyfs.ObjectId> = [];
                    let insert_path = `/qaTest/${RandomGenerator.string(10)}`
                    for(let i=0;i<10;i++){
                        let key = RandomGenerator.string(10);
                        let randomStr = RandomGenerator.string(4*1024*1024);
                        let uint8Array : Uint8Array = stringToUint8Array(randomStr)
                        let chunkId = cyfs.ChunkId.calculate(uint8Array);
                        let chunkId1 = chunkId.unwrap();
                        obj_list.push(chunkId1.calculate_id());
                        console.info(`测试随机的chunkId 为：${chunkId}`)
                        let rep : cyfs.NDNPutDataOutputRequest = {
                            common: {
                                // 请求路径，可为空
                                req_path : "qaTest",
                                // 来源DEC
                                dec_id: ZoneSimulator.APPID,
                                // api级别
                                level: cyfs.NDNAPILevel.NDC,
                                // targrt设备参数目前无用
                                target: stack.local_device_id().object_id,
                                // 需要处理数据的关联对象，主要用以chunk/file等
                                referer_object: [],
                                flags: 0,
                            },
                            object_id: chunkId.unwrap().desc().calculate_id(),
                            length: uint8Array.length,
                            data: uint8Array,
                        }
                        //调用接口
                        let resp =  await stack.ndn_service().put_data(rep);
                        console.info("rep",JSON.stringify(rep))
                        let obj1 = MyTest.create(cyfs.Some(chunkId1.calculate_id()),cyfs.None,cyfs.None,cyfs.None,cyfs.None,RandomGenerator.string(10),RandomGenerator.string(10));
                        let [people,people_pk] = createPeople();
                        cyfs.sign_and_set_named_object(people_pk,obj1,new cyfs.SignatureObject( new cyfs.ObjectLink(people.desc().calculate_id(),cyfs.Some(people.desc().calculate_id()))))
                        console.info("obj1",obj1.calculate_id())
                        let save = await stack.non_service().put_object({
                            common: {
                                dec_id:ZoneSimulator.APPID,
                                flags: 0,
                                //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                level: cyfs.NONAPILevel.NOC //设置路由类型
                            },
                            object: new cyfs.NONObjectInfo(obj1.calculate_id(), obj1.to_vec().unwrap()),
                            access: cyfs.AccessString.full()
                        })
                        console.info("save",JSON.stringify(save))
                        let create = await op_env.insert_with_key(insert_path,key,obj1.calculate_id());
                        assert.ok(!create.err);
                    }
                    let result3 =  await op_env.commit();
                    let begin =Date.now();
                    console.info(JSON.stringify(result3))
                    assert.ok(!result3.err)
                    let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                    let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                    while( Number(standby_ood_revision) < Number(ood_revision)){
                        standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                        await cyfs.sleep(2000)
                   }
                   let  async_time = Date.now() - begin;
                   console.info(`从OOD数据同步时间`)
                   for(let i in obj_list){
                        let rep2 : cyfs.NDNGetDataOutputRequest = {
                            common: {
                                // 请求路径，可为空
                                req_path : "qaTest",
                                // 来源DEC
                                dec_id: ZoneSimulator.APPID,
                                // api级别
                                level: cyfs.NDNAPILevel.NDC,
                                // targrt设备参数
                                // 需要处理数据的关联对象，主要用以chunk/file等
                                referer_object: [],
                                flags: 0,
                            },
                            object_id: obj_list[i],
                            inner_path: `qaTest`,
                        }
                        //调用接口
                        let resp =  await stack_standby_ood.ndn_service().get_data(rep2);
                        console.info(`${resp}`)
                   }})
                describe("单个 chunk 同步",async()=>{
                    it("#业务流程测试",async()=>{
                        let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                        let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                        assert.ok(!result.err);
                        let op_env = result.unwrap();
                        let obj_list:Array<cyfs.ObjectId> = [];
                        let insert_path = `/qaTest/chunk/${RandomGenerator.string(10)}/${RandomGenerator.string(10)}`
                        for(let i =0;i<10;i++){
                            let key = RandomGenerator.string(10);
                            let randomStr = RandomGenerator.string(4*1024*1024);
                            let uint8Array : Uint8Array = stringToUint8Array(randomStr)
                            let chunkId = cyfs.ChunkId.calculate(uint8Array);
                            let chunkId1 = chunkId.unwrap();
                            obj_list.push(chunkId1.calculate_id());
                            console.info(`测试随机的chunkId 为：${chunkId}`)
                            let rep : cyfs.NDNPutDataOutputRequest = {
                                common: {
                                    // 请求路径，可为空
                                    req_path : "qaTest",
                                    // 来源DEC
                                    dec_id: ZoneSimulator.APPID,
                                    // api级别
                                    level: cyfs.NDNAPILevel.NDC,
                                    // targrt设备参数目前无用
                                    target: stack.local_device_id().object_id,
                                    // 需要处理数据的关联对象，主要用以chunk/file等
                                    referer_object: [],
                                    flags: 0,
                                },
                                object_id: chunkId.unwrap().desc().calculate_id(),
                                length: uint8Array.length,
                                data: uint8Array,
                            }
                            //调用接口
                            let resp =  await stack.ndn_service().put_data(rep);
                            console.info(`${resp}`)
                            let create = await op_env.insert_with_key(insert_path,key,chunkId1.calculate_id())
                        }
                        let result3 =  await op_env.commit();
                        let begin =Date.now();
                        console.info(JSON.stringify(result3))
                        assert.ok(!result3.err)
                        let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                        let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                        while( Number(standby_ood_revision) < Number(ood_revision)){
                            standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                            console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                            await cyfs.sleep(2000)
                        }
                        let check = (await stack.root_state_access_stub().list(insert_path)).unwrap()
                        console.info(`主OOD ${insert_path}当前 Map `)
                        for(let i in check){
                            console.info(JSON.stringify(check[i]));
                        }
                        console.info(`从OOD ${insert_path}当前 Map `)
                        let check2 = (await stack_standby_ood.root_state_access_stub().list(insert_path)).unwrap()
                        for(let i in check2){
                            console.info(JSON.stringify(check2[i]));
                        }
                        for(let i in obj_list){
                            let rep2 : cyfs.NDNGetDataOutputRequest = {
                                common: {
                                    // 请求路径，可为空
                                    req_path : "qaTest",
                                    // 来源DEC
                                    dec_id: ZoneSimulator.APPID,
                                    // api级别
                                    level: cyfs.NDNAPILevel.NDC,
                                    // targrt设备参数

                                    // 需要处理数据的关联对象，主要用以chunk/file等
                                    referer_object: [],
                                    flags: 0,
                                },
                                object_id: obj_list[i],
                                inner_path: `qaTest`,
                            }
                            //调用接口
                            let resp =  await stack.ndn_service().get_data(rep2);
                            console.info(`${resp}`)
                        }
                        for(let i in obj_list){
                            let rep2 : cyfs.NDNGetDataOutputRequest = {
                                common: {
                                    // 请求路径，可为空
                                    req_path : "qaTest",
                                    // 来源DEC
                                    dec_id: ZoneSimulator.APPID,
                                    // api级别
                                    level: cyfs.NDNAPILevel.NDC,
                                    // targrt设备参数
                                    // 需要处理数据的关联对象，主要用以chunk/file等
                                    referer_object: [],
                                    flags: 0,
                                },
                                object_id: obj_list[i],
                                inner_path: `qaTest`,
                            }
                            //调用接口
                            let resp =  await stack_standby_ood.ndn_service().get_data(rep2);
                            console.info(`${resp}`)
                        }
                        
                    })
                
                })
                describe("FIle 中 chunk 同步",async()=>{
                    it("业务流程测试",async()=>{
                        let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                        let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                        assert.ok(!result.err);
                        let op_env = result.unwrap();
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname,"../../test_cache_file/source")
                        let file = RandomGenerator.createRandomFile(filePath,fileName,100*1024*1024);
                        let add_file = await stack.trans().publish_file({
                            common :{// 请求路径，可为空
                                req_path : "qaTest",
                                // 来源DEC
                                dec_id: ZoneSimulator.APPID,
                                // api级别
                                level: cyfs.NDNAPILevel.NDC,
                                // targrt设备参数
                                // 需要处理数据的关联对象，主要用以chunk/file等
                                referer_object: [],
                                flags: 1,},
                            owner: cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap(),
                            local_path: path.join(filePath,fileName),
                            chunk_size: 4*1024*1024
                        });
                        console.info(JSON.stringify(add_file));
                        assert.ok(!add_file.err,"publish_file 失败");
                        let test_file = add_file.unwrap().file_id
                        let insert_path = `/qaTest/${RandomGenerator.string(10)}/${RandomGenerator.string(10)}`
                        let key = RandomGenerator.string(10);
                        let create = await op_env.insert_with_key(insert_path,key,test_file)
                        let result3 =  await op_env.commit();
                        let begin =Date.now();
                        console.info(JSON.stringify(result3))
                        assert.ok(!result3.err)
                        let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                        let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                        while( Number(standby_ood_revision) < Number(ood_revision)){
                            standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                            console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                            await cyfs.sleep(2000)
                        }
                        // 主 OOD 做校验
                        let get_ret1 = await stack.non_service().get_object({
                            object_id:test_file,
                            common: {
                                req_path: "/qa/get_object",
                                level: cyfs.NONAPILevel.NOC,
                                dec_id:ZoneSimulator.APPID,
                                flags: 0,
                        }});
                        assert.ok(!get_ret1.err);
                        // 从 OOD 做数据校验
                        let get_ret = await stack_standby_ood.non_service().get_object({
                            object_id:test_file,
                            common: {
                                req_path: "/qa/get_object",
                                level: cyfs.NONAPILevel.NOC,
                                dec_id:ZoneSimulator.APPID,
                                flags: 0,
                        }});
                        assert.ok(!get_ret.err);
                        let filePathTargrt = path.join(__dirname,"../../test_cache_file/target")
                        let task = await stack_standby_ood.trans().create_task( {
                            common:  {
                                req_path: "qaTest",
                                dec_id: ZoneSimulator.APPID,
                                level: cyfs.NDNAPILevel.NDC,
                                referer_object: [],
                                flags: 1,
                            },
                            object_id: test_file,
                            local_path: path.join(filePathTargrt,fileName),
                            device_list: [stack_standby_ood.local_device_id()],
                            auto_start: true,
                        })
                        console.info(JSON.stringify(task));
                        assert.ok(!task.err,"create_task 失败");
                        let task_id = task.unwrap().task_id
                        for(let i =0;i<10;i++){
                            let task = await stack_standby_ood.trans().get_task_state( {
                                common:  {
                                    req_path: "qaTest",
                                    dec_id: ZoneSimulator.APPID,
                                    level: cyfs.NDNAPILevel.NDC,
                                    referer_object: [],
                                    flags: 1,
                                },
                                task_id : task_id
                            })
                            console.info(JSON.stringify(task));
                            let state = task.unwrap().state;
                            if(state==4){
                                break;
                            }
                            assert.ok(!task.err,"control_task 失败");
                            await cyfs.sleep(1000)
                        }
                    })
                    
                })
                describe("Dir 中 File对象同步 + chunk 同步",async()=>{
                    it("业务流程测试",async()=>{
                        let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                        let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                        assert.ok(!result.err);
                        let op_env = result.unwrap();
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname,"../../test_cache_file/source",fileName)
                        let dir = await RandomGenerator.createRandomDir(filePath,0,10,1*1024*1024,0) ;
                        let add_file = await stack.trans().publish_file({
                            common :{// 请求路径，可为空
                                req_path : "qaTest",
                                // 来源DEC
                                dec_id: ZoneSimulator.APPID,
                                // api级别
                                level: cyfs.NDNAPILevel.NDC,
                                // targrt设备参数
                                // 需要处理数据的关联对象，主要用以chunk/file等
                                referer_object: [],
                                flags: 1,},
                            owner: cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap(),
                            local_path: filePath,
                            chunk_size: 4*1024*1024
                        });
                        console.info(JSON.stringify(add_file));
                        assert.ok(!add_file.err,"publish_file 失败");
                        let test_file = add_file.unwrap().file_id
                        let insert_path = `/qaTest/${RandomGenerator.string(10)}/${RandomGenerator.string(10)}`
                        let key = RandomGenerator.string(10);
                        let create = await op_env.insert_with_key(insert_path,key,test_file)
                        let result3 =  await op_env.commit();
                        let begin =Date.now();
                        console.info(JSON.stringify(result3))
                        assert.ok(!result3.err)
                        let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                        let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                        while( Number(standby_ood_revision) < Number(ood_revision)){
                            standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                            console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                            await cyfs.sleep(2000)
                        }
                        // 主 OOD 做校验
                        let get_ret1 = await stack.non_service().get_object({
                            object_id:test_file,
                            common: {
                                req_path: "qaTest",
                                level: cyfs.NONAPILevel.NOC,
                                dec_id:ZoneSimulator.APPID,
                                flags: 0,
                        }});
                        assert.ok(!get_ret1.err);
                        let OOD_map = get_ret1.unwrap()
                        console.info(`OOD_map 对象：${OOD_map.object.object_id} ${OOD_map.object.object?.obj_type()} ${OOD_map.object.object?.obj_type_code()}`)
                        let dir_obj_resp1 = await stack.util().build_dir_from_object_map({
                            common: {
                                req_path: "",
                                target : stack.local_device_id().object_id,
                                dec_id: ZoneSimulator.APPID,
                                flags: 0,
                            },
                            object_map_id: get_ret1.unwrap().object.object_id,
                            dir_type: cyfs.BuildDirType.Zip,
                        });
                        console.info(dir_obj_resp1.unwrap().object_id);
                        // 从 OOD 做数据校验
                        let get_ret = await stack_standby_ood.non_service().get_object({
                            object_id:test_file,
                            common: {
                                req_path: "qaTest",
                                level: cyfs.NONAPILevel.NOC,
                                dec_id:ZoneSimulator.APPID,
                                flags: 0,
                        }});
                        assert.ok(!get_ret.err);
                        let dir_obj_resp = await stack_standby_ood.util().build_dir_from_object_map({
                            common: {
                                req_path: "",
                                dec_id: ZoneSimulator.APPID,
                                target : stack_standby_ood.local_device_id().object_id,
                                flags: 0,
                            },
                            object_map_id: get_ret.unwrap().object.object_id,
                            dir_type: cyfs.BuildDirType.Zip,
                        });
                        
                        let dir_id = dir_obj_resp.unwrap().object_id;
                        console.info(`#transDir build_dir_from_object_map dir_id ; ${dir_id.to_base_58()}`)
                        const dir_obj_resp_1 = (await stack_standby_ood.non_service().get_object({
                            common: {
                                level: cyfs.NONAPILevel.NOC,
                                flags: 0
                            },
                            object_id: dir_id
                        })); 
                        let dir_obj = dir_obj_resp_1.unwrap();
                        console.info(`dir 对象：${dir_obj.object.object_id} ${dir_obj.object.object?.obj_type()} ${dir_obj.object.object?.obj_type_code()}`)
                        const [dir_standby] = new cyfs.DirDecoder().raw_decode(dir_obj.object.object_raw).unwrap();
                        let downloadTask:Array<any> = [];
                        await dir_standby.desc().content().obj_list().match({
                            Chunk: (chunk_id: cyfs.ChunkId) => {
                                console.error(`obj_list in chunk not support yet! ${chunk_id}`);
                            },
                            ObjList: async (obj_list) => {
                                console.info(`obj_list : ${JSON.stringify(obj_list)},keys= ${JSON.stringify(obj_list.object_map().keys())}`)
                                
                                for (const [inner_path, info] of obj_list.object_map().entries()) {
                                    let filePath = path.join(__dirname,"../../test_cache_file/target",fileName)
                                    const segs = inner_path.value().split('/');
                                    console.assert(segs.length > 0);
                                    console.info(`###文件节点信息：${inner_path},${info.node().object_id()}`)
                                    const file_obj_resp = (await stack_standby_ood.non_service().get_object({
                                        common: {
                                            level: cyfs.NONAPILevel.NOC,
                                            flags: 0
                                        },
            
                                        object_id: info.node()!.object_id()!
                                    })); 
                                    assert.ok(!file_obj_resp.err,`${JSON.stringify(file_obj_resp)}`);
                                    // 检查NDN chunk 是否同步
                                    let task = await stack_standby_ood.trans().create_task( {
                                        common:  {
                                            req_path: "qaTest",
                                            dec_id: ZoneSimulator.APPID,
                                            level: cyfs.NDNAPILevel.NDC,
                                            referer_object: [],
                                            flags: 1,
                                        },
                                        object_id: info.node()!.object_id()!,
                                        local_path: path.join(filePath,inner_path.toString()),
                                        device_list: [stack_standby_ood.local_device_id()],
                                        auto_start: true,
                                    })
                                    console.info(JSON.stringify(task));
                                    assert.ok(!task.err,"create_task 失败");
                                    let task_id = task.unwrap().task_id
                                    for(let i =0;i<10;i++){
                                        let task = await stack_standby_ood.trans().get_task_state( {
                                            common:  {
                                                req_path: "qaTest",
                                                dec_id: ZoneSimulator.APPID,
                                                level: cyfs.NDNAPILevel.NDC,
                                                referer_object: [],
                                                flags: 1,
                                            },
                                            task_id : task_id
                                        })
                                        console.info(JSON.stringify(task));
                                        let state = task.unwrap().state;
                                        if(state==4){
                                            break;
                                        }
                                        assert.ok(!task.err,"control_task 失败");
                                        await cyfs.sleep(1000)
                                    }
                                    
                                    
                                }
                                
                            }
                        })
                        await cyfs.sleep(10*1000)
                    })
                    
                })
            })
            describe("多级关联关系Object/Chunk 数据同步",async()=>{
                describe("一个Object 关联数据类型同时包含多个类型owner/author/prev/ref_objs,关联对象为Object",async()=>{
                    it("#业务流程测试",async()=>{
                        // (1) 主 OOD root_state 插入数据commit
                        let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                        let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                        assert.ok(!result.err);
                        let op_env = result.unwrap();
                        let obj_list:Array<cyfs.ObjectId> = [];
                        for(let i=0;i<10;i++){
                            let insert_path = `/qaTest/${RandomGenerator.string(10)}/${RandomGenerator.string(10)}`
                            let key = RandomGenerator.string(10);
                            let [owner] = createPeople();
                            
                            let save_1 = await stack.non_service().put_object({
                                common: {
                                    dec_id:ZoneSimulator.APPID,
                                    flags: 0,
                                    //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                    level: cyfs.NONAPILevel.NOC //设置路由类型
                                },
                                object: new cyfs.NONObjectInfo(owner.desc().calculate_id(), owner.to_vec().unwrap()),
                                access: cyfs.AccessString.full()
                            })
                            assert.ok(!save_1.err)
                            let [obj2] = createPeople();
                            
                            let save_2 = await stack.non_service().put_object({
                                common: {
                                    dec_id:ZoneSimulator.APPID,
                                    flags: 0,
                                    //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                    level: cyfs.NONAPILevel.NOC //设置路由类型
                                },
                                object: new cyfs.NONObjectInfo(obj2.desc().calculate_id(), obj2.to_vec().unwrap()),
                                access: cyfs.AccessString.full()
                            })
                            assert.ok(!save_2.err)
                            let [obj3] = createPeople();
                            let save_3 = await stack.non_service().put_object({
                                common: {
                                    dec_id:ZoneSimulator.APPID,
                                    flags: 0,
                                    //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                    level: cyfs.NONAPILevel.NOC //设置路由类型
                                },
                                object: new cyfs.NONObjectInfo(obj3.desc().calculate_id(), obj3.to_vec().unwrap()),
                                access: cyfs.AccessString.full()
                            })
                            assert.ok(!save_3.err)
                            let [obj4] = createPeople();
                            let save_4 = await stack.non_service().put_object({
                                common: {
                                    dec_id:ZoneSimulator.APPID,
                                    flags: 0,
                                    //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                    level: cyfs.NONAPILevel.NOC //设置路由类型
                                },
                                object: new cyfs.NONObjectInfo(obj4.desc().calculate_id(), obj4.to_vec().unwrap()),
                                access: cyfs.AccessString.full()
                            })
                            assert.ok(!save_4.err)
                            let ref_objects : cyfs.Option<cyfs.Vec<cyfs.ObjectLink>> = cyfs.Some(new cyfs.Vec([ new cyfs.ObjectLink(obj4.calculate_id(),cyfs.None)]))
                            let obj1 = MyTest.create(cyfs.Some(owner.calculate_id()),cyfs.Some(obj2.calculate_id()),cyfs.Some(obj3.calculate_id()),ref_objects,cyfs.None,RandomGenerator.string(10),RandomGenerator.string(10));
                            let obj_id1 = obj1.desc().object_id();
                            obj_list.push(owner.desc().calculate_id());
                            obj_list.push(obj_id1);
                            obj_list.push(obj2.calculate_id());
                            obj_list.push(obj3.calculate_id());
                            obj_list.push(obj4.calculate_id());
                            let save = await stack.non_service().put_object({
                                common: {
                                    dec_id:ZoneSimulator.APPID,
                                    flags: 0,
                                    //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                    level: cyfs.NONAPILevel.NOC //设置路由类型
                                },
                                object: new cyfs.NONObjectInfo(obj1.desc().calculate_id(), obj1.to_vec().unwrap()),
                                access: cyfs.AccessString.full()
                            })
                            let create = await op_env.insert_with_key(insert_path,key,obj_id1)
                            assert.ok(!create.err);
                        }
                        let result3 =  await op_env.commit();
                        let begin =Date.now();
                        console.info(JSON.stringify(result3))
                        assert.ok(!result3.err)
                        let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                        let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                        while( Number(standby_ood_revision) < Number(ood_revision)){
                            standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                            console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                            await cyfs.sleep(2000)
                       }
                       let  async_time = Date.now() - begin;
                       console.info(`从OOD数据同步时间`)
                       for(let i in obj_list){
                        let get_ret = await stack_standby_ood.non_service().get_object({
                            object_id:obj_list[i],
                            common: {
                                req_path: "/qa/get_object",
                                level: cyfs.NONAPILevel.NOC,
                                dec_id:ZoneSimulator.APPID,
                                flags: 0,
                            }});
                            assert.ok(!get_ret.err);
                            let check = get_ret.unwrap().object;
                            assert.ok(check.object_id.to_base_58() == obj_list[i].to_base_58() ,`${check.object_id} != ${obj_list[i]}`);
                       }
                    })
                
                })
                describe("一个Object 关联数据类型同时包含多个类型owner/author/prev/ref_objs,关联对象为chunk",async()=>{
                    it("#业务流程测试",async()=>{
                        // (1) 主 OOD root_state 插入数据commit
                        let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                        let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                        assert.ok(!result.err);
                        let op_env = result.unwrap();
                        let obj_list:Array<cyfs.ObjectId> = [];
                        let insert_path = `/qaTest/${RandomGenerator.string(10)}`
                        for(let i=0;i<10;i++){
                            let key = RandomGenerator.string(10);
                            let randomStr = RandomGenerator.string(4*1024*1024);
                            let uint8Array : Uint8Array = stringToUint8Array(randomStr)
                            let chunkId = cyfs.ChunkId.calculate(uint8Array);
                            let chunkId1 = chunkId.unwrap();
                            obj_list.push(chunkId1.calculate_id());
                            console.info(`测试随机的chunkId 为：${chunkId}`)
                            let rep : cyfs.NDNPutDataOutputRequest = {
                                common: {
                                    // 请求路径，可为空
                                    req_path : "qaTest",
                                    // 来源DEC
                                    dec_id: ZoneSimulator.APPID,
                                    // api级别
                                    level: cyfs.NDNAPILevel.NDC,
                                    // targrt设备参数目前无用
                                    target: stack.local_device_id().object_id,
                                    // 需要处理数据的关联对象，主要用以chunk/file等
                                    referer_object: [],
                                    flags: 0,
                                },
                                object_id: chunkId.unwrap().desc().calculate_id(),
                                length: uint8Array.length,
                                data: uint8Array,
                            }
                            //调用接口
                            let resp =  await stack.ndn_service().put_data(rep);
                            console.info(`${resp}`)

                            randomStr = RandomGenerator.string(4*1024*1024);
                            uint8Array = stringToUint8Array(randomStr)
                            chunkId = cyfs.ChunkId.calculate(uint8Array);
                            chunkId1 = chunkId.unwrap();
                            obj_list.push(chunkId1.calculate_id());
                            console.info(`测试随机的chunkId 为：${chunkId}`)
                            rep  = {
                                common: {
                                    // 请求路径，可为空
                                    req_path : "qaTest",
                                    // 来源DEC
                                    dec_id: ZoneSimulator.APPID,
                                    // api级别
                                    level: cyfs.NDNAPILevel.NDC,
                                    // targrt设备参数目前无用
                                    target: stack.local_device_id().object_id,
                                    // 需要处理数据的关联对象，主要用以chunk/file等
                                    referer_object: [],
                                    flags: 0,
                                },
                                object_id: chunkId.unwrap().desc().calculate_id(),
                                length: uint8Array.length,
                                data: uint8Array,
                            }
                            //调用接口
                            resp =  await stack.ndn_service().put_data(rep);
                            console.info(`${resp}`)
                            let ref_objects : cyfs.Option<cyfs.Vec<cyfs.ObjectLink>> = cyfs.Some(new cyfs.Vec([ new cyfs.ObjectLink(chunkId1.calculate_id(),cyfs.None)]))
                            let obj1 = MyTest.create(cyfs.None,cyfs.None,cyfs.None,ref_objects,cyfs.None,RandomGenerator.string(10),RandomGenerator.string(10));
                            let create = await op_env.insert_with_key(insert_path,key,obj1.calculate_id());
                            assert.ok(!create.err);
                        }
                        let result3 =  await op_env.commit();
                        let begin =Date.now();
                        console.info(JSON.stringify(result3))
                        assert.ok(!result3.err)
                        let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                        let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                        while( Number(standby_ood_revision) < Number(ood_revision)){
                            standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                            console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                            await cyfs.sleep(2000)
                       }
                       let  async_time = Date.now() - begin;
                       console.info(`从OOD数据同步时间`)
                       for(let i in obj_list){
                            let rep2 : cyfs.NDNGetDataOutputRequest = {
                                common: {
                                    // 请求路径，可为空
                                    req_path : "qaTest",
                                    // 来源DEC
                                    dec_id: ZoneSimulator.APPID,
                                    // api级别
                                    level: cyfs.NDNAPILevel.NDC,
                                    // targrt设备参数
                                    // 需要处理数据的关联对象，主要用以chunk/file等
                                    referer_object: [],
                                    flags: 0,
                                },
                                object_id: obj_list[i],
                                inner_path: `qaTest`,
                            }
                            //调用接口
                            let resp =  await stack_standby_ood.ndn_service().get_data(rep2);
                            console.info(`${resp}`)
                       }
                        
                    })
                
                })
                describe("多级关联关系,",async()=>{
                    it("#业务流程测试",async()=>{
                                stack = ZoneSimulator.zone1_ood_stack!;
                                let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                                let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                                assert.ok(!result.err);
                                let op_env = result.unwrap();
                                let obj_list:Array<cyfs.ObjectId> = [];
                                let insert_path = `/qaTest/${RandomGenerator.string(10)}`
                                for(let i=0;i<10;i++){
                                    let key = RandomGenerator.string(10);
                                    let randomStr = RandomGenerator.string(4*1024*1024);
                                    let uint8Array : Uint8Array = stringToUint8Array(randomStr)
                                    let chunkId = cyfs.ChunkId.calculate(uint8Array);
                                    let chunkId1 = chunkId.unwrap();
                                    obj_list.push(chunkId1.calculate_id());
                                    console.info(`测试随机的chunkId 为：${chunkId}`)
                                    let rep : cyfs.NDNPutDataOutputRequest = {
                                        common: {
                                            // 请求路径，可为空
                                            req_path : "qaTest",
                                            // 来源DEC
                                            dec_id: ZoneSimulator.APPID,
                                            // api级别
                                            level: cyfs.NDNAPILevel.NDC,
                                            // targrt设备参数目前无用
                                            target: stack.local_device_id().object_id,
                                            // 需要处理数据的关联对象，主要用以chunk/file等
                                            referer_object: [],
                                            flags: 0,
                                        },
                                        object_id: chunkId.unwrap().desc().calculate_id(),
                                        length: uint8Array.length,
                                        data: uint8Array,
                                    }
                                    //调用接口
                                    let resp =  await stack.ndn_service().put_data(rep);
                                    console.info(`${resp}`)

                                    let ref_objects : cyfs.Option<cyfs.Vec<cyfs.ObjectLink>> = cyfs.Some(new cyfs.Vec([ new cyfs.ObjectLink(chunkId1.calculate_id(),cyfs.None)]))
                                    let obj1 = MyTest.create(cyfs.None,cyfs.None,cyfs.None,ref_objects,cyfs.None,RandomGenerator.string(10),RandomGenerator.string(10))
                                    let ref_objects1:cyfs.Option<cyfs.Vec<cyfs.ObjectLink>> = cyfs.Some(new cyfs.Vec([ new cyfs.ObjectLink(obj1.calculate_id(),cyfs.None)]))
                                    let obj2 = MyTest.create(cyfs.None,cyfs.None,cyfs.None,ref_objects1,cyfs.None,RandomGenerator.string(10),RandomGenerator.string(10))
                                    let ref_objects2:cyfs.Option<cyfs.Vec<cyfs.ObjectLink>> = cyfs.Some(new cyfs.Vec([ new cyfs.ObjectLink(obj2.calculate_id(),cyfs.None)]))
                                    let obj3 = MyTest.create(cyfs.None,cyfs.None,cyfs.None,ref_objects2,cyfs.None,RandomGenerator.string(10),RandomGenerator.string(10))
                                    let save1 = await stack.non_service().put_object({
                                        common: {
                                            dec_id:ZoneSimulator.APPID,
                                            flags: 0,
                                            //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                            level: cyfs.NONAPILevel.NOC //设置路由类型
                                        },
                                        object: new cyfs.NONObjectInfo(obj1.calculate_id(), obj1.to_vec().unwrap()),
                                        access: cyfs.AccessString.full()
                                    })
                                    console.info("save",JSON.stringify(save1))

                                    let save2 = await stack.non_service().put_object({
                                        common: {
                                            dec_id:ZoneSimulator.APPID,
                                            flags: 0,
                                            //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                            level: cyfs.NONAPILevel.NOC //设置路由类型
                                        },
                                        object: new cyfs.NONObjectInfo(obj2.calculate_id(), obj2.to_vec().unwrap()),
                                        access: cyfs.AccessString.full()
                                    })
                                    console.info("save",JSON.stringify(save2))
 

                                    let save3 = await stack.non_service().put_object({
                                        common: {
                                            dec_id:ZoneSimulator.APPID,
                                            flags: 0,
                                            //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                            level: cyfs.NONAPILevel.NOC //设置路由类型
                                        },
                                        object: new cyfs.NONObjectInfo(obj3.calculate_id(), obj3.to_vec().unwrap()),
                                        access: cyfs.AccessString.full()
                                    })
                                    console.info("save",JSON.stringify(save3))

                                    let create = await op_env.insert_with_key(insert_path,key,obj3.calculate_id());
                                    assert.ok(!create.err);


                                }
                                let result3 =  await op_env.commit();
                                let begin =Date.now();
                                console.info("result3",JSON.stringify(result3))
                                assert.ok(!result3.err)
                                let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                                console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                                let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                                console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                                while( Number(standby_ood_revision) < Number(ood_revision)){
                                    standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                                    console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                                    await cyfs.sleep(2000)
                            }
                            let  async_time = Date.now() - begin;
                            console.info(`从OOD数据同步时间`)
                            for(let i in obj_list){
                                    let rep2 : cyfs.NDNGetDataOutputRequest = {
                                        common: {
                                            // 请求路径，可为空
                                            req_path : "qaTest",
                                            // 来源DEC
                                            dec_id: ZoneSimulator.APPID,
                                            // api级别
                                            level: cyfs.NDNAPILevel.NDC,
                                            // targrt设备参数
                                            // 需要处理数据的关联对象，主要用以chunk/file等
                                            referer_object: [],
                                            flags: 0,
                                        },
                                        object_id: obj_list[i],
                                        inner_path: `qaTest`,
                                    }
                                    //调用接口
                                    let resp =  await stack_standby_ood.ndn_service().get_data(rep2);
                                    console.info(`${resp}`)
                            }
                    
                })
            })
        })
        describe("不同GlobalStateStub 类型",async()=>{
            describe("Local_cache",async()=>{
                it("#业务流程测试",async()=>{
                    let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                    let result= await stack.local_cache_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                    assert.ok(!result.err);
                    let op_env = result.unwrap();
                    let obj_list:Array<cyfs.ObjectId> = [];
                    for(let i=0;i<10;i++){
                        let insert_path = `/qaTest/${RandomGenerator.string(10)}/${RandomGenerator.string(10)}`
                        let key = RandomGenerator.string(10);
                        let [owner] = createPeople();
                        
                        let save_1 = await stack.non_service().put_object({
                            common: {
                                dec_id:ZoneSimulator.APPID,
                                flags: 0,
                                //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                level: cyfs.NONAPILevel.NOC //设置路由类型
                            },
                            object: new cyfs.NONObjectInfo(owner.desc().calculate_id(), owner.to_vec().unwrap()),
                            access: cyfs.AccessString.full()
                        })
                        assert.ok(!save_1.err)

                        let obj1 = MyTest.create(cyfs.Some(owner.calculate_id()),cyfs.None,cyfs.None,cyfs.None,cyfs.None,RandomGenerator.string(10),RandomGenerator.string(10));
                        let obj_id1 = obj1.desc().object_id();
                        obj_list.push(owner.desc().calculate_id());
                        obj_list.push(obj_id1);
                        let save = await stack.non_service().put_object({
                            common: {
                                dec_id:ZoneSimulator.APPID,
                                flags: 0,
                                //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                level: cyfs.NONAPILevel.NOC //设置路由类型
                            },
                            object: new cyfs.NONObjectInfo(obj1.desc().calculate_id(), obj1.to_vec().unwrap()),
                            access: cyfs.AccessString.full()
                        })
                        let create = await op_env.insert_with_key(insert_path,key,obj_id1)
                        assert.ok(!create.err);
                    }
                    let result3 =  await op_env.commit();
                    let begin =Date.now();
                    console.info(JSON.stringify(result3))
                    assert.ok(!result3.err)
                    let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                    let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                    while( Number(standby_ood_revision) < Number(ood_revision)){
                        standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                        await cyfs.sleep(2000)
                   }
                   let  async_time = Date.now() - begin;
                   console.info(`从OOD数据同步时间`)
                   for(let i in obj_list){
                    let get_ret = await stack_standby_ood.non_service().get_object({
                        object_id:obj_list[i],
                        common: {
                            req_path: "/qa/get_object",
                            level: cyfs.NONAPILevel.NOC,
                            dec_id:ZoneSimulator.APPID,
                            flags: 0,
                        }});
                        assert.ok(get_ret.err);
                        //let check = get_ret.unwrap().object;
                        //assert.ok(check.object_id.to_base_58() == obj_list[i].to_base_58() ,`${check.object_id} != ${obj_list[i]}`);
                   }
                })
            
            })
        
            })
            describe("root_state",async()=>{
                it("#业务流程测试",async()=>{
                    // (1) 主 OOD root_state 插入数据commit
                    let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                    let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                    assert.ok(!result.err);
                    let op_env = result.unwrap();
                    let obj_list:Array<cyfs.ObjectId> = [];
                    for(let i=0;i<10;i++){
                        let insert_path = `/qaTest/${RandomGenerator.string(10)}/${RandomGenerator.string(10)}`
                        let key = RandomGenerator.string(10);
                        let [owner] = createPeople();
                        
                        let save_1 = await stack.non_service().put_object({
                            common: {
                                dec_id:ZoneSimulator.APPID,
                                flags: 0,
                                //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                level: cyfs.NONAPILevel.NOC //设置路由类型
                            },
                            object: new cyfs.NONObjectInfo(owner.desc().calculate_id(), owner.to_vec().unwrap()),
                            access: cyfs.AccessString.full()
                        })
                        assert.ok(!save_1.err)

                        let obj1 = MyTest.create(cyfs.Some(owner.calculate_id()),cyfs.None,cyfs.None,cyfs.None,cyfs.None,RandomGenerator.string(10),RandomGenerator.string(10));
                        let obj_id1 = obj1.desc().object_id();
                        obj_list.push(owner.desc().calculate_id());
                        obj_list.push(obj_id1);
                        let save = await stack.non_service().put_object({
                            common: {
                                dec_id:ZoneSimulator.APPID,
                                flags: 0,
                                //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                level: cyfs.NONAPILevel.NOC //设置路由类型
                            },
                            object: new cyfs.NONObjectInfo(obj1.desc().calculate_id(), obj1.to_vec().unwrap()),
                            access: cyfs.AccessString.full()
                        })
                        let create = await op_env.insert_with_key(insert_path,key,obj_id1)
                        assert.ok(!create.err);
                    }
                    let result3 =  await op_env.commit();
                    let begin =Date.now();
                    console.info(JSON.stringify(result3))
                    assert.ok(!result3.err)
                    let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                    let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                    while( Number(standby_ood_revision) < Number(ood_revision)){
                        standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                        await cyfs.sleep(2000)
                   }
                   let  async_time = Date.now() - begin;
                   console.info(`从OOD数据同步时间`)
                   for(let i in obj_list){
                    let get_ret = await stack_standby_ood.non_service().get_object({
                        object_id:obj_list[i],
                        common: {
                            req_path: "/qa/get_object",
                            level: cyfs.NONAPILevel.NOC,
                            dec_id:ZoneSimulator.APPID,
                            flags: 0,
                        }});
                        assert.ok(!get_ret.err);
                        let check = get_ret.unwrap().object;
                        assert.ok(check.object_id.to_base_58() == obj_list[i].to_base_58() ,`${check.object_id} != ${obj_list[i]}`);
                   }
            })
        })
        describe("不同OpEnvStub 类型",async()=>{
            describe("PathOpEnvStub",async()=>{
                it("#业务流程测试",async()=>{
                    // (1) 主 OOD root_state 插入数据commit
                    let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                    let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                    assert.ok(!result.err);
                    let op_env = result.unwrap();
                    let obj_list:Array<cyfs.ObjectId> = [];
                    for(let i=0;i<10;i++){
                        let insert_path = `/qaTest/${RandomGenerator.string(10)}/${RandomGenerator.string(10)}`
                        let key = RandomGenerator.string(10);
                        let [owner] = createPeople();
                        
                        let save_1 = await stack.non_service().put_object({
                            common: {
                                dec_id:ZoneSimulator.APPID,
                                flags: 0,
                                //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                level: cyfs.NONAPILevel.NOC //设置路由类型
                            },
                            object: new cyfs.NONObjectInfo(owner.desc().calculate_id(), owner.to_vec().unwrap()),
                            access: cyfs.AccessString.full()
                        })
                        assert.ok(!save_1.err)

                        let obj1 = MyTest.create(cyfs.Some(owner.calculate_id()),cyfs.None,cyfs.None,cyfs.None,cyfs.None,RandomGenerator.string(10),RandomGenerator.string(10));
                        let obj_id1 = obj1.desc().object_id();
                        obj_list.push(owner.desc().calculate_id());
                        obj_list.push(obj_id1);
                        let save = await stack.non_service().put_object({
                            common: {
                                dec_id:ZoneSimulator.APPID,
                                flags: 0,
                                //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                level: cyfs.NONAPILevel.NOC //设置路由类型
                            },
                            object: new cyfs.NONObjectInfo(obj1.desc().calculate_id(), obj1.to_vec().unwrap()),
                            access: cyfs.AccessString.full()
                        })
                        let create = await op_env.insert_with_key(insert_path,key,obj_id1)
                        assert.ok(!create.err);
                    }
                    let result3 =  await op_env.commit();
                    let begin =Date.now();
                    console.info(JSON.stringify(result3))
                    assert.ok(!result3.err)
                    let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                    let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                    while( Number(standby_ood_revision) < Number(ood_revision)){
                        standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                        await cyfs.sleep(2000)
                   }
                   let  async_time = Date.now() - begin;
                   console.info(`从OOD数据同步时间`)
                   for(let i in obj_list){
                    let get_ret = await stack_standby_ood.non_service().get_object({
                        object_id:obj_list[i],
                        common: {
                            req_path: "/qa/get_object",
                            level: cyfs.NONAPILevel.NOC,
                            dec_id:ZoneSimulator.APPID,
                            flags: 0,
                        }});
                        assert.ok(!get_ret.err);
                        let check = get_ret.unwrap().object;
                        assert.ok(check.object_id.to_base_58() == obj_list[i].to_base_58() ,`${check.object_id} != ${obj_list[i]}`);
                   }
            })
        
            })
            describe("SingleOpEnvStub",async()=>{
                it("#业务流程测试",async()=>{
                    // (1) 主 OOD root_state 插入数据commit
                    let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                    let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_single_op_env();
                    let map_result = await result.unwrap().create_new(cyfs.ObjectMapSimpleContentType.Map)
                    assert.ok(!result.err);
                    assert.ok(!map_result.err);
                    let op_env = result.unwrap();
                    let obj_list:Array<cyfs.ObjectId> = [];
                    for(let i=0;i<10;i++){
                        let insert_path = `/qaTest/${RandomGenerator.string(10)}/${RandomGenerator.string(10)}`
                        let key = RandomGenerator.string(10);
                        let [owner] = createPeople();
                        
                        let save_1 = await stack.non_service().put_object({
                            common: {
                                dec_id:ZoneSimulator.APPID,
                                flags: 0,
                                //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                level: cyfs.NONAPILevel.NOC //设置路由类型
                            },
                            object: new cyfs.NONObjectInfo(owner.desc().calculate_id(), owner.to_vec().unwrap()),
                            access: cyfs.AccessString.full()
                        })
                        assert.ok(!save_1.err)

                        let obj1 = MyTest.create(cyfs.Some(owner.calculate_id()),cyfs.None,cyfs.None,cyfs.None,cyfs.None,RandomGenerator.string(10),RandomGenerator.string(10));
                        let obj_id1 = obj1.desc().object_id();
                        obj_list.push(owner.desc().calculate_id());
                        obj_list.push(obj_id1);
                        let save = await stack.non_service().put_object({
                            common: {
                                dec_id:ZoneSimulator.APPID,
                                flags: 0,
                                //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                                level: cyfs.NONAPILevel.NOC //设置路由类型
                            },
                            object: new cyfs.NONObjectInfo(obj1.desc().calculate_id(), obj1.to_vec().unwrap()),
                            access: cyfs.AccessString.full()
                        })
                        let create = await op_env.insert_with_key(key,obj_id1)
                        assert.ok(!create.err);
                    }
                    let result3 =  await op_env.commit();
                    let begin =Date.now();
                    console.info(JSON.stringify(result3))
                    assert.ok(!result3.err)
                    let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                    let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                    while( Number(standby_ood_revision) < Number(ood_revision)){
                        standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                        console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                        await cyfs.sleep(2000)
                   }
                   let  async_time = Date.now() - begin;
                   console.info(`从OOD数据同步时间`)
                   for(let i in obj_list){
                    let get_ret = await stack_standby_ood.non_service().get_object({
                        object_id:obj_list[i],
                        common: {
                            req_path: "/qa/get_object",
                            level: cyfs.NONAPILevel.NOC,
                            dec_id:ZoneSimulator.APPID,
                            flags: 0,
                        }});
                        assert.ok(!get_ret.err);
                        let check = get_ret.unwrap().object;
                        assert.ok(check.object_id.to_base_58() == obj_list[i].to_base_58() ,`${check.object_id} != ${obj_list[i]}`);
                   }
            })

            })
        })
        describe("主OOD 本地NOC不存在Object，只同步object_id",async()=>{
            it("#业务流程测试 删除已putobject",async()=>{
                // (1) 主 OOD root_state 插入数据commit
                let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_single_op_env();
                let map_result = await result.unwrap().create_new(cyfs.ObjectMapSimpleContentType.Map)
                assert.ok(!result.err);
                assert.ok(!map_result.err);
                let op_env = result.unwrap();
                let obj_list:Array<cyfs.ObjectId> = [];
                for(let i=0;i<10;i++){
                    let insert_path = `/qaTest/${RandomGenerator.string(10)}/${RandomGenerator.string(10)}`
                    let key = RandomGenerator.string(10);
                    let [owner] = createPeople();
                    
                    /*let save_1 = await stack.non_service().put_object({
                        common: {
                            dec_id:ZoneSimulator.APPID,
                            flags: 0,
                            //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                            level: cyfs.NONAPILevel.NOC //设置路由类型
                        },
                        object: new cyfs.NONObjectInfo(owner.desc().calculate_id(), owner.to_vec().unwrap())
                    })
                    assert.ok(!save_1.err)*/


                    let obj1 = MyTest.create(cyfs.Some(owner.calculate_id()),cyfs.None,cyfs.None,cyfs.None,cyfs.None,RandomGenerator.string(10),RandomGenerator.string(10));
                    let obj_id1 = obj1.desc().object_id();
                    obj_list.push(owner.desc().calculate_id());
                    obj_list.push(obj_id1);
                    let create = await op_env.insert_with_key(key,obj_id1)
                    assert.ok(!create.err);
                    let save_2= await stack.non_service().delete_object({
                        common: {
                            dec_id:ZoneSimulator.APPID,
                            flags: 0,
                            //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                            level: cyfs.NONAPILevel.NOC //设置路由类型
                        },
                        object_id: new cyfs.NONObjectInfo(owner.desc().calculate_id(), owner.to_vec().unwrap()).object_id,
                        inner_path: insert_path 
                    })
                    console.info("save_2",save_2)
                    assert.ok(!save_2.err)
                }
                let result3 =  await op_env.commit();
                let begin =Date.now();
                console.info(JSON.stringify(result3))
                assert.ok(!result3.err)
                let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                while( Number(standby_ood_revision) < Number(ood_revision)){
                    standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                    await cyfs.sleep(2000)
               }
               let  async_time = Date.now() - begin;
               console.info(`从OOD数据同步时间`)
               for(let i in obj_list){
                let get_ret = await stack_standby_ood.non_service().get_object({
                    object_id:obj_list[i],
                    common: {
                        req_path: "/qa/get_object",
                        level: cyfs.NONAPILevel.NOC,
                        dec_id:ZoneSimulator.APPID,
                        flags: 0,
                    }});
                    assert.ok(get_ret.err);
                    //let check = get_ret.unwrap().object;
                    //assert.ok(!(check.object_id.to_base_58() == obj_list[i].to_base_58() ,`${check.object_id} != ${obj_list[i]}`));
               }
        })

 
        })
        describe("主OOD NOC 中Object 未关联root_state 不进行",async()=>{
            it("#业务流程测试",async()=>{
                // (1) 主 OOD root_state 插入数据commit
                let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_single_op_env();
                let map_result = await result.unwrap().create_new(cyfs.ObjectMapSimpleContentType.Map)
                assert.ok(!result.err);
                assert.ok(!map_result.err);
                let op_env = result.unwrap();
                let obj_list:Array<cyfs.ObjectId> = [];
                for(let i=0;i<10;i++){
                    let insert_path = `/qaTest/${RandomGenerator.string(10)}/${RandomGenerator.string(10)}`
                    let key = RandomGenerator.string(10);
                    let [owner] = createPeople();
                    
                    let save_1 = await stack.non_service().put_object({
                        common: {
                            dec_id:ZoneSimulator.APPID,
                            flags: 0,
                            //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                            level: cyfs.NONAPILevel.NOC //设置路由类型
                        },
                        object: new cyfs.NONObjectInfo(owner.desc().calculate_id(), owner.to_vec().unwrap()),
                        access: cyfs.AccessString.full()
                    })
                    assert.ok(!save_1.err)

                    let obj1 = MyTest.create(cyfs.None,cyfs.None,cyfs.None,cyfs.None,cyfs.None,RandomGenerator.string(10),RandomGenerator.string(10));
                    let obj_id1 = obj1.desc().object_id();
                    obj_list.push(owner.desc().calculate_id());
                    obj_list.push(obj_id1);
                    let save = await stack.non_service().put_object({
                        common: {
                            dec_id:ZoneSimulator.APPID,
                            flags: 0,
                            //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
                            level: cyfs.NONAPILevel.NOC //设置路由类型
                        },
                        object: new cyfs.NONObjectInfo(obj1.desc().calculate_id(), obj1.to_vec().unwrap()),
                        access: cyfs.AccessString.full()
                    })
                    assert.ok(!save.err);
                    let create = await op_env.insert_with_key(key,obj_id1)
                    assert.ok(!create.err);
                }
                let result3 =  await op_env.commit();
                let begin =Date.now();
                console.info(JSON.stringify(result3))
                assert.ok(!result3.err)
                let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
                let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                while( Number(standby_ood_revision) < Number(ood_revision)){
                    standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
                    console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
                    await cyfs.sleep(2000)
               }
               let  async_time = Date.now() - begin;
               console.info(`从OOD数据同步时间`)
               for(let i in obj_list){
                let get_ret = await stack_standby_ood.non_service().get_object({
                    object_id:obj_list[i],
                    common: {
                        req_path: "/qa/get_object",
                        level: cyfs.NONAPILevel.NOC,
                        dec_id:ZoneSimulator.APPID,
                        flags: 0,
                    }});
                    assert.ok(get_ret.err);
                    //let check = get_ret.unwrap().object;
                    //assert.ok(check.object_id.to_base_58() == obj_list[i].to_base_58() ,`${check.object_id} != ${obj_list[i]}`);
               }
        })
 
        })
            })
        })
    })

//root-state的读写模式切换控制遵循主从切换原则，主OOD切换为写入或者只读后，从OOD维持在只读状态，可以将主OOD及从OOD都设置为写入或者只读状态

    describe("#root-state的读写模式切换控制",async()=>{ 
        describe("#root_state",async()=>{
            describe("# 主OOD默认权限",async()=>{
                let res =(await stack.util().get_device_static_info({common:{flags:0}})).unwrap().info.root_state_access_mode
                assert.ok(res=="write")
            })
            describe("# 从OOD默认权限",async()=>{
                let res =(await stack_standby_ood.util().get_device_static_info({common:{flags:0}})).unwrap().info.root_state_access_mode
                assert.ok(res=="read")           
            })
            describe("# 控制权限修改",async()=>{
                describe("#PathOpEnv",async()=>{
                    describe("##主OOD操作",async()=>{
                        describe("主OOD修改为read",async()=>{
                            it("进行读取操作",async()=>{
                                let people_id = stack.local_device().desc().owner()?.unwrap() 
                                op_env = await createEnv(stack,"op_env")
                                //let op_env_result= await stack.root_state_stub().create_path_op_env();
                                //assert.ok(!op_env_result.err);
                                //op_env = op_env_result.unwrap();

                                let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                                let key = RandomGenerator.string(10)
                                
                                //插入操作
                                let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id1 = obj1.desc().object_id();
                                let result1 = await op_env.insert_with_key(my_path,key,obj_id1);
                                console.info("result1",JSON.stringify(result1))
                                assert.ok(!result1.err)
                                let save_update1 = await op_env.update();
                                console.info(JSON.stringify(save_update1))
                                assert.ok(!save_update1.err);

                                //修改为read
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Read))))          
                                let target = stack.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object = cyfs.Admin.create(target,cmd)
                                console.info("admin_object.obj_type_code",admin_object.obj_type_code())
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()                          
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },                               
                                    object:new cyfs.NONObjectInfo(admin_id ,buf),
                                    
                                }

                                let result =  (await stack.non_service().post_object(req)).unwrap();                          
                                console.info("result2",JSON.stringify(result))                     
                            
                                //读取操作
                                let result2 = await op_env.get_by_key(my_path,key)
                                assert.ok(!result2.err);
                                let save_update = await op_env.update();
                                console.info(JSON.stringify(save_update))
                                assert.ok(!save_update.err);          

                            })
                            it("进行写入操作_20221031",async()=>{
                                let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                                let key = RandomGenerator.string(10)
                                let people_id = stack.local_device().desc().owner()?.unwrap() 
                                //修改为write
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Write))))          
                                let target = stack.local_device_id()
                                let admin_object = cyfs.Admin.create(target,cmd)
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }

                                let res=  (await stack.non_service().post_object(req)).unwrap();
                                console.info("result2",JSON.stringify(res.object))    
                                
                                
                                //写入操作                           
                                let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id1 = obj1.desc().object_id();
                                let result1 = await op_env.insert_with_key(my_path,key,obj_id1);
                                console.info(JSON.stringify(result1))
                                assert.ok(!result1.err)
                                
                                let save_update = await op_env.update();
                                console.info(JSON.stringify(save_update))
                                assert.ok(!save_update.err);
                

                                //修改为Read
                                let cmd1:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Read))))          
                                let target1 = stack.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object1 = cyfs.Admin.create(target1,cmd1)
                                console.info("admin_object.obj_type_code",admin_object.obj_type_code())
                                let [people_desc1,people_sec1] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object1, new cyfs.SignatureRefIndex(254))
                                let admin_id1 = admin_object1.desc().calculate_id()
                                let buf1 = admin_object1.to_vec().unwrap()
                                
                                let req1:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id1 ,buf1)
                                }

                                let res1 =  (await stack.non_service().post_object(req1)).unwrap();
                                console.info("res1",JSON.stringify(res1))  


                                //写入操作
                                let my_path1 = `/qaTest/access/${RandomGenerator.string(9)}`
                                let key1 = RandomGenerator.string(9)
                                let obj2  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id2 = obj1.desc().object_id();
                                let result2 = await op_env.insert_with_key(my_path1,key1,obj_id2);
                                console.info(JSON.stringify(result2))
                                assert.ok(!result2.err)

                                let save_update1 = await op_env.update();
                                console.info(JSON.stringify(save_update1))
                                assert.ok(save_update1.err);
                
                                let save1 = await op_env.commit();
                                console.info(JSON.stringify(save1))
                                assert.ok(save1.err);

                            })
                            it("进行重启模拟器",async()=>{
                                let people_id = stack.local_device().desc().owner()?.unwrap() 
                                let data = {
                                    category:cyfs.GlobalStateCategory,
                                    AccessMode:cyfs.GlobalStateAccessMode
                                    }

                                //修改为Read
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Read))))          
                                let target = stack.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object = cyfs.Admin.create(target,cmd)
                                console.info("admin_object.obj_type_code",admin_object.obj_type_code())
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }

                                let result =  (await stack.non_service().post_object(req)).unwrap();

                                let res1 =(await stack.util().get_device_static_info({common:{flags:0}})).unwrap().info.root_state_access_mode
                                assert.ok(res1 =="read")
                                
                                //重启模拟器
                                await ZoneSimulator.restartZoneSimulator()
                                
                                let res2 =(await stack.util().get_device_static_info({common:{flags:0}})).unwrap().info.root_state_access_mode
                                assert.ok(res2 =="write")
                               
                            })
                            it("进行读取操作",async()=>{
                                let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                                let people_id = stack.local_device().desc().owner()?.unwrap() 
                                let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                                let key = RandomGenerator.string(10)
                                op_env = await createEnv(stack,"op_env")

                                //读取前插入操作
                                
                                let obj  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id = obj.desc().object_id();
                                let result = await op_env.insert_with_key(my_path,key,obj_id);
                                console.info("result1",JSON.stringify(result))
                                assert.ok(!result.err)
                                let save_update1 = await op_env.update();
                                console.info(JSON.stringify(save_update1))
                                assert.ok(!save_update1.err);


                                //读取操作
                                let result2 = await op_env.get_by_key(my_path,key)
                                assert.ok(!result2.err);

                                //修改为read
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Read))))          
                                let target = stack.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object = cyfs.Admin.create(target,cmd)
                                console.info("admin_object.obj_type_code",admin_object.obj_type_code())
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }

                                let result1 =  (await stack.non_service().post_object(req)).unwrap();
                                
                                console.info("result2",JSON.stringify(result1))                     

                                //读取操作
                                let result3 = await op_env.get_by_key(my_path,key)
                                assert.ok(!result3.err);



                            })
                            it("进行写入操作",async()=>{
                                let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                                let people_id = stack.local_device().desc().owner()?.unwrap() 
                                let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                                let key = RandomGenerator.string(10)
                               
                                //修改为read
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Read))))          
                                let target = stack.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object = cyfs.Admin.create(target,cmd)
                                console.info("admin_object.obj_type_code",admin_object.obj_type_code())
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }
                
                                let result =  (await stack.non_service().post_object(req)).unwrap();   
                
                                //修改后写入
                                let obj  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id = obj.desc().object_id();
                                let result2 = await op_env.insert_with_key(my_path,key,obj_id);
                                console.info("result2",JSON.stringify(result2))
                                assert.ok(!result2.err)
                                let save_update1 = await op_env.update();
                                console.info("update()",JSON.stringify(save_update1))
                                assert.ok(save_update1.err);
                
                                //修改为write
                                let cmd1:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Write))))          
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object1 = cyfs.Admin.create(target,cmd1)
                                console.info("admin_object.obj_type_code",admin_object1.obj_type_code())
                                cyfs.sign_and_push_named_object(people_sec,admin_object1, new cyfs.SignatureRefIndex(254))
                                let admin_id1 = admin_object1.desc().calculate_id()
                                let buf1 = admin_object1.to_vec().unwrap()
                                
                                let req1:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id1 ,buf1)
                                }
                
                                let result1 =  (await stack.non_service().post_object(req1)).unwrap();
                                console.info("result1",JSON.stringify(result1))                        
                                //修改后写入
                                let my_path1 = `/qaTest/access/${RandomGenerator.string(9)}`
                                let key1 = RandomGenerator.string(9)
                                let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id1 = obj1.desc().object_id();
                                let result3 = await op_env.insert_with_key(my_path1,key1,obj_id1);
                                console.info("result3",JSON.stringify(result3))
                                assert.ok(!result3.err)
                                let save_update2= await op_env.update();
                                console.info("update()1",JSON.stringify(save_update2))
                                assert.ok(!save_update2.err);
                                let save1 = await op_env.commit();
                                console.info("commit()1",JSON.stringify(save1))
                                assert.ok(!save1.err);
                
                            })
                        })
                        describe("主OOD修改为Write",async()=>{
                            it("进行读取操作",async()=>{
                                let people_id = stack.local_device().desc().owner()?.unwrap() 
                                let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                                let key = RandomGenerator.string(10)
                                                        
                                op_env = await createEnv(stack,"op_env")

                                //插入操作
                                let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id1 = obj1.desc().object_id();
                                let result1 = await op_env.insert_with_key(my_path,key,obj_id1);
                                console.info("result1",JSON.stringify(result1))
                                assert.ok(!result1.err)
                            
                                let save_update1 = await op_env.update();
                                console.info(JSON.stringify(save_update1))
                                assert.ok(!save_update1.err);

                                //修改为Write
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Write))))          
                                let target = stack.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object = cyfs.Admin.create(target,cmd)
                                console.info("admin_object.obj_type_code",admin_object.obj_type_code())
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }

                                let result =  (await stack.non_service().post_object(req)).unwrap();
                                
                                
                                //读取操作
                                let result2 = await op_env.get_by_key(my_path,key)
                                assert.ok(!result2.err);
                                



                            })
                            it("进行写入操作",async()=>{
                                let people_id = stack.local_device().desc().owner()?.unwrap() 
                                let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                                let key = RandomGenerator.string(10)

                                //修改为Read
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Read))))          
                                let target = stack.local_device_id()
                                let admin_object = cyfs.Admin.create(target,cmd)
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }

                                let result =  (await stack.non_service().post_object(req)).unwrap();
                                console.info("result2",JSON.stringify(result))    
                                
                                
                                //写入操作
                                
                                let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id1 = obj1.desc().object_id();
                                let result1 = await op_env.insert_with_key(my_path,key,obj_id1);
                                console.info(JSON.stringify(result1))
                                assert.ok(!result1.err)
                            
                                let save_update = await op_env.update();
                                console.info(JSON.stringify(save_update))
                                assert.ok(save_update.err);
                

                                //修改为Write
                                let cmd1:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Write))))          
                                let target1 = stack.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object1 = cyfs.Admin.create(target1,cmd1)
                                console.info("admin_object.obj_type_code",admin_object1.obj_type_code())
                                let [people_desc1,people_sec1] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec1,admin_object1, new cyfs.SignatureRefIndex(254))
                                let admin_id1 = admin_object1.desc().calculate_id()
                                let buf1 = admin_object1.to_vec().unwrap()
                                
                                let req1:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id1 ,buf1)
                                }

                                let result2 =  (await stack.non_service().post_object(req1)).unwrap();


                                //写入操作
                                let my_path1 = `/qaTest/access/${RandomGenerator.string(9)}`
                                let key1 = RandomGenerator.string(9)
                                let obj2  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id2 = obj2.desc().object_id();
                                let result3 = await op_env.insert_with_key(my_path1,key1,obj_id2);
                                console.info(JSON.stringify(result3))
                                assert.ok(!result3.err)
                        
                                let save_update1 = await op_env.update();
                                console.info("update()",JSON.stringify(save_update1))
                                assert.ok(!save_update1.err);
                
                                let save1 = await op_env.commit();
                                console.info("commit()",JSON.stringify(save1))
                                assert.ok(!save1.err);

                            })
                            it("进行重启模拟器",async()=>{
                                let people_id = stack.local_device().desc().owner()?.unwrap() 
                                let op_env_result= await stack.root_state_stub().create_path_op_env();
                                assert.ok(!op_env_result.err);
                                op_env = op_env_result.unwrap();

                                //修改为Write
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Write))))          
                                let target = stack.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object = cyfs.Admin.create(target,cmd)
                                console.info("admin_object.obj_type_code",admin_object.obj_type_code())
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }

                                let result =  (await stack.non_service().post_object(req)).unwrap();
                                

                                //重启模拟器
                                await ZoneSimulator.restartZoneSimulator()

                                let res2 =(await stack.util().get_device_static_info({common:{flags:0}})).unwrap().info.root_state_access_mode
                                assert.ok(res2 =="write")
                            })
                            it("进行读取操作",async()=>{
                                let people_id = stack.local_device().desc().owner()?.unwrap() 
                                let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                                let key = RandomGenerator.string(10)

                                op_env = await createEnv(stack,"op_env")


                                //读取前插入操作                           
                                let obj  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id = obj.desc().object_id();
                                let result = await op_env.insert_with_key(my_path,key,obj_id);
                                console.info("result1",JSON.stringify(result))
                                assert.ok(!result.err)
                                let save_update1 = await op_env.update();
                                console.info(JSON.stringify(save_update1))
                                assert.ok(!save_update1.err);
                            

                                //修改为Write
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Write))))          
                                let target = stack.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object = cyfs.Admin.create(target,cmd)
                                console.info("admin_object.obj_type_code",admin_object.obj_type_code())
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }

                                let result1 =  (await stack.non_service().post_object(req)).unwrap();
                                
                                console.info("result2",JSON.stringify(result1))                     
                                console.info("device_static_info",JSON.stringify((await stack.util().get_device_static_info({common:{flags:0}})).unwrap().info))
                                console.info("stack_standby_ood device_static_info",JSON.stringify((await stack_standby_ood.util().get_device_static_info({common:{flags:0}})).unwrap().info))


                                //读取操作
                                let result2 = await op_env.get_by_key(my_path,key)
                                assert.ok(!result2.err);


                            })
                            it("进行写入操作",async()=>{
                                let people_id = stack.local_device().desc().owner()?.unwrap() 
                                let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                                let key = RandomGenerator.string(10)

                                
                                //修改为Write
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Write))))          
                                let target = stack.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object = cyfs.Admin.create(target,cmd)
                                console.info("admin_object.obj_type_code",admin_object.obj_type_code())
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }

                                let result =  (await stack.non_service().post_object(req)).unwrap();
                            
                                //修改为Read
                                let cmd1:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Read))))          
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object1 = cyfs.Admin.create(target,cmd1)
                                console.info("admin_object.obj_type_code",admin_object1.obj_type_code())
                                cyfs.sign_and_push_named_object(people_sec,admin_object1, new cyfs.SignatureRefIndex(254))
                                let admin_id1 = admin_object1.desc().calculate_id()
                                let buf1 = admin_object1.to_vec().unwrap()
                                
                                let req1:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id1 ,buf1)
                                }

                                let result1 =  (await stack.non_service().post_object(req1)).unwrap();
                                console.info("result1",JSON.stringify(result1))   
    
                        
                                
                                //修改后写入
                                let my_path1 = `/qaTest/access/${RandomGenerator.string(9)}`
                                let key1 = RandomGenerator.string(9)
                                let obj  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id = obj.desc().object_id();
                                let result2 = await op_env.insert_with_key(my_path1,key1,obj_id);
                                console.info("result2",JSON.stringify(result2))
                                assert.ok(!result2.err)
                                let save_update1 = await op_env.update();
                                console.info(JSON.stringify(save_update1))
                                assert.ok(save_update1.err);
                                let save1 = await op_env.commit();
                                console.info(JSON.stringify(save1))
                                assert.ok(save1.err);
                            })
                        })
                            
                    })
                    describe("# 从OOD操作",async()=>{
                        describe("从OOD修改为read",async()=>{
                            it("进行读取操作",async()=>{
    
                                let people_id = stack_standby_ood.local_device().desc().owner()?.unwrap() 
                                
                                op_env_stack_standby_ood = await createEnv(stack_standby_ood,"op_env")

                                let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                                let key = RandomGenerator.string(10)
                                
                                //插入操作
                                let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id1 = obj1.desc().object_id();
                                let result1 = await op_env.insert_with_key(my_path,key,obj_id1);
                                console.info("result1",JSON.stringify(result1))
                                assert.ok(!result1.err)
                                let save_update1 = await op_env.update();
                                console.info(JSON.stringify(save_update1))
                                assert.ok(save_update1.err);


                                //修改为Write
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Write))))          
                                let target = stack_standby_ood.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object = cyfs.Admin.create(target,cmd)
                                console.info("admin_object.obj_type_code",admin_object.obj_type_code())
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()                          
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },                               
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }

                                let result =  (await stack_standby_ood.non_service().post_object(req)).unwrap();                          
                                console.info("result2",JSON.stringify(result))                     
                            
                                //插入操作
                                let my_path1 = `/qaTest/access/${RandomGenerator.string(9)}`
                                let key1 = RandomGenerator.string(9)
                                let obj2  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id2 = obj2.desc().object_id();
                                let result2 = await op_env.insert_with_key(my_path1,key1,obj_id2);
                                console.info("result3",JSON.stringify(result2))
                                assert.ok(!result2.err)
                                let save_update2 = await op_env.update();
                                console.info(JSON.stringify(save_update2))
                                assert.ok(!save_update2.err);


                                //读取操作
                                let result3 = await op_env.get_by_key(my_path,key)
                                assert.ok(!result3.err);
                                let save_update = await op_env.update();
                                console.info(JSON.stringify(save_update))
                                assert.ok(!save_update.err);          


                            })
                            it("进行写入操作",async()=>{
                                let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                                let key = RandomGenerator.string(10)
                                let people_id = stack_standby_ood.local_device().desc().owner()?.unwrap() 

                                //修改为write
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Write))))          
                                let target = stack_standby_ood.local_device_id()
                                let admin_object = cyfs.Admin.create(target,cmd)
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }

                                let res=  (await stack_standby_ood.non_service().post_object(req)).unwrap();
                                console.info("result2",JSON.stringify(res.object))    
                                
                                
                                //写入操作                           
                                let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id1 = obj1.desc().object_id();
                                let result1 = await op_env.insert_with_key(my_path,key,obj_id1);
                                console.info(JSON.stringify(result1))
                                assert.ok(!result1.err)
                                
                                let save_update = await op_env.update();
                                console.info(JSON.stringify(save_update))
                                assert.ok(!save_update.err);
                

                                //修改为Read
                                let cmd1:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Read))))          
                                let target1 = stack_standby_ood.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object1 = cyfs.Admin.create(target1,cmd1)
                                console.info("admin_object.obj_type_code",admin_object.obj_type_code())
                                let [people_desc1,people_sec1] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object1, new cyfs.SignatureRefIndex(254))
                                let admin_id1 = admin_object1.desc().calculate_id()
                                let buf1 = admin_object1.to_vec().unwrap()
                                
                                let req1:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id1 ,buf1)
                                }

                                let res1 =  (await stack_standby_ood.non_service().post_object(req1)).unwrap();
                                console.info("res1",JSON.stringify(res1))  


                                //写入操作
                                let my_path1 = `/qaTest/access/${RandomGenerator.string(9)}`
                                let key1 = RandomGenerator.string(9)
                                let obj2  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id2 = obj1.desc().object_id();
                                let result2 = await op_env.insert_with_key(my_path1,key1,obj_id2);
                                console.info(JSON.stringify(result2))
                                assert.ok(!result2.err)

                                let save_update1 = await op_env.update();
                                console.info(JSON.stringify(save_update1))
                                assert.ok(save_update1.err);
                
                                let save1 = await op_env.commit();
                                console.info(JSON.stringify(save1))
                                assert.ok(save1.err);

                            })
                            it("进行重启模拟器",async()=>{
                                let people_id = stack_standby_ood.local_device().desc().owner()?.unwrap() 

                                //修改为Write
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Write))))          
                                let target = stack_standby_ood.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object = cyfs.Admin.create(target,cmd)
                                console.info("admin_object.obj_type_code",admin_object.obj_type_code())
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }

                                let result =  (await stack_standby_ood.non_service().post_object(req)).unwrap();


                                //重启模拟器
                                await ZoneSimulator.restartZoneSimulator()

                                let res2 =(await stack_standby_ood.util().get_device_static_info({common:{flags:0}})).unwrap().info.root_state_access_mode
                                assert.ok(res2 =="read")
                            })
                            it("进行读取操作",async()=>{
                                let people_id = stack_standby_ood.local_device().desc().owner()?.unwrap() 
                                let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                                let key = RandomGenerator.string(10)
                                op_env_stack_standby_ood = await createEnv(stack_standby_ood,"op_env")
                                
                                //修改为write
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Write))))          
                                let target = stack_standby_ood.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object = cyfs.Admin.create(target,cmd)
                                console.info("admin_object.obj_type_code",admin_object.obj_type_code())
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }

                                let result =  (await stack_standby_ood.non_service().post_object(req)).unwrap();

                                //读取前插入操作
                                let obj  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id = obj.desc().object_id();
                                let result1 = await op_env.insert_with_key(my_path,key,obj_id);
                                console.info("result1",JSON.stringify(result1))
                                assert.ok(!result1.err)
                                let save_update1 = await op_env.update();
                                console.info(JSON.stringify(save_update1))
                                assert.ok(!save_update1.err);


                                //读取操作
                                let result2 = await op_env.get_by_key(my_path,key)
                                assert.ok(!result2.err);

                                //修改为read
                                let cmd1:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Read))))          
                                let target1 = stack_standby_ood.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object1 = cyfs.Admin.create(target1,cmd1)
                                console.info("admin_object.obj_type_code",admin_object1.obj_type_code())
                                let [people_desc1,people_sec1] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec1,admin_object1, new cyfs.SignatureRefIndex(254))
                                let admin_id1 = admin_object1.desc().calculate_id()
                                let buf1 = admin_object1.to_vec().unwrap()
                                
                                let req1:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id1 ,buf1)
                                }

                                let result3 =  (await stack_standby_ood.non_service().post_object(req)).unwrap();
                                                       
                                //读取操作
                                let result4 = await op_env.get_by_key(my_path,key)
                                assert.ok(!result4.err);
                            })
                            it("进行写入操作",async()=>{

                                let people_id = stack_standby_ood.local_device().desc().owner()?.unwrap() 
                                let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                                let key = RandomGenerator.string(10)
                                
                                //修改为read
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Read))))          
                                let target = stack_standby_ood.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object = cyfs.Admin.create(target,cmd)
                                console.info("admin_object.obj_type_code",admin_object.obj_type_code())
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }
                
                                let result =  (await stack_standby_ood.non_service().post_object(req)).unwrap();
                                console.info("result2",JSON.stringify(result))                        
                                console.info("device_static_info",JSON.stringify((await stack_standby_ood.util().get_device_static_info({common:{flags:0}})).unwrap().info))
                                console.info("stack_standby_ood_standby_ood device_static_info",JSON.stringify((await stack_standby_ood.util().get_device_static_info({common:{flags:0}})).unwrap().info))
                
                                //修改后写入
                                let obj  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id = obj.desc().object_id();
                                let result2 = await op_env.insert_with_key(my_path,key,obj_id);
                                console.info("result2",JSON.stringify(result2))
                                assert.ok(!result2.err)
                                let save_update1 = await op_env.update();
                                console.info("update()",JSON.stringify(save_update1))
                                assert.ok(save_update1.err);
                
                                //修改为write
                                let cmd1:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Write))))          
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object1 = cyfs.Admin.create(target,cmd1)
                                console.info("admin_object.obj_type_code",admin_object1.obj_type_code())
                                cyfs.sign_and_push_named_object(people_sec,admin_object1, new cyfs.SignatureRefIndex(254))
                                let admin_id1 = admin_object1.desc().calculate_id()
                                let buf1 = admin_object1.to_vec().unwrap()
                                
                                let req1:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id1 ,buf1)
                                }
                
                                let result1 =  (await stack_standby_ood.non_service().post_object(req1)).unwrap();
                                console.info("result1",JSON.stringify(result1))                        
                                //修改后写入
                                let my_path1 = `/qaTest/access/${RandomGenerator.string(9)}`
                                let key1 = RandomGenerator.string(9)
                                let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id1 = obj1.desc().object_id();
                                let result3 = await op_env.insert_with_key(my_path1,key1,obj_id1);
                                console.info("result3",JSON.stringify(result3))
                                assert.ok(!result3.err)
                                let save_update2= await op_env.update();
                                console.info("update()1",JSON.stringify(save_update2))
                                assert.ok(!save_update2.err);
                                let save1 = await op_env.commit();
                                console.info("commit()1",JSON.stringify(save1))
                                assert.ok(!save1.err);
                
                            })
                        })
                        describe("从OOD修改为Write",async()=>{
                            it("进行读取操作",async()=>{
                                let people_id = stack_standby_ood.local_device().desc().owner()?.unwrap() 
                                let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                                let key = RandomGenerator.string(10)
                                                        
                                let op_env_result= await stack_standby_ood.root_state_stub().create_path_op_env();
                                assert.ok(!op_env_result.err);
                                op_env = op_env_result.unwrap();


                                let data = {
                                    category:cyfs.GlobalStateCategory,
                                    AccessMode:cyfs.GlobalStateAccessMode
                                    }
                                
                                //修改为Read
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Read))))          
                                let target = stack_standby_ood.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object = cyfs.Admin.create(target,cmd)
                                console.info("admin_object.obj_type_code",admin_object.obj_type_code())
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }

                                //插入操作
                                let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id1 = obj1.desc().object_id();
                                let result1 = await op_env.insert_with_key(my_path,key,obj_id1);
                                console.info("result1",JSON.stringify(result1))
                                assert.ok(!result1.err)
                            
                                let save_update2 = await op_env.update();
                                console.info(JSON.stringify(save_update2))
                                assert.ok(!save_update2.err);
                            
                                //修改为Write
                                let cmd1:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Write))))          
                                let target1 = stack_standby_ood.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object1 = cyfs.Admin.create(target1,cmd1)
                                console.info("admin_object.obj_type_code",admin_object1.obj_type_code())
                                let [people_desc1,people_sec1] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec1,admin_object1, new cyfs.SignatureRefIndex(254))
                                let admin_id1 = admin_object1.desc().calculate_id()
                                let buf1 = admin_object1.to_vec().unwrap()
                                
                                let req1:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id1 ,buf1)
                                }

                                let result2 =  (await stack_standby_ood.non_service().post_object(req1)).unwrap();
                                
                                console.info("result2",JSON.stringify(result2))                     
                                console.info("device_static_info",JSON.stringify((await stack_standby_ood.util().get_device_static_info({common:{flags:0}})).unwrap().info))
                                console.info("stack_standby_ood_standby_ood device_static_info",JSON.stringify((await stack_standby_ood.util().get_device_static_info({common:{flags:0}})).unwrap().info))
        
                                
                                //插入操作
                                let my_path1 = `/qaTest/access/${RandomGenerator.string(9)}`
                                let key1 = RandomGenerator.string(9)
                                let obj2  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id2 = obj2.desc().object_id();
                                let result3 = await op_env.insert_with_key(my_path1,key1,obj_id2);
                                console.info("result1",JSON.stringify(result3))
                                assert.ok(!result3.err)
                                
                                let save_update1 = await op_env.update();
                                console.info(JSON.stringify(save_update1))
                                assert.ok(!save_update1.err);

                                //读取操作
                                let result4 = await op_env.get_by_key(my_path,key)
                                assert.ok(!result4.err);
                                
                                let save1 = await op_env.commit();
                                console.info(JSON.stringify(save1))
                                assert.ok(!save1.err);



                            })
                            it("进行写入操作",async()=>{
                                let people_id = stack_standby_ood.local_device().desc().owner()?.unwrap() 
                                let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                                let key = RandomGenerator.string(10)

                                let data = {
                                    category:cyfs.GlobalStateCategory,
                                    AccessMode:cyfs.GlobalStateAccessMode
                                    }

                                let op_env_result= await stack_standby_ood.root_state_stub().create_path_op_env();
                                assert.ok(!op_env_result.err);
                                op_env = op_env_result.unwrap();

                                //修改为Read
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Read))))          
                                let target = stack_standby_ood.local_device_id()
                                let admin_object = cyfs.Admin.create(target,cmd)
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }

                                let result =  (await stack_standby_ood.non_service().post_object(req)).unwrap();
                                console.info("result2",JSON.stringify(result))    
                                
                                
                                //写入操作
                                
                                let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id1 = obj1.desc().object_id();
                                let result1 = await op_env.insert_with_key(my_path,key,obj_id1);
                                console.info(JSON.stringify(result1))
                                assert.ok(!result1.err)
                            
                                let save_update = await op_env.update();
                                console.info(JSON.stringify(save_update))
                                assert.ok(save_update.err);
                

                                //修改为Write
                                let cmd1:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Write))))          
                                let target1 = stack_standby_ood.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object1 = cyfs.Admin.create(target1,cmd1)
                                console.info("admin_object.obj_type_code",admin_object1.obj_type_code())
                                let [people_desc1,people_sec1] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec1,admin_object1, new cyfs.SignatureRefIndex(254))
                                let admin_id1 = admin_object1.desc().calculate_id()
                                let buf1 = admin_object1.to_vec().unwrap()
                                
                                let req1:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id1 ,buf1)
                                }

                                let result2 =  (await stack_standby_ood.non_service().post_object(req1)).unwrap();
                                console.info("result2",JSON.stringify(result2))  
                                console.info("device_static_info",JSON.stringify((await stack_standby_ood.util().get_device_static_info({common:{flags:0}})).unwrap().info))
                                console.info("stack_standby_ood_standby_ood device_static_info_2",JSON.stringify((await stack_standby_ood.util().get_device_static_info({common:{flags:0}})).unwrap().info))


                                //写入操作
                                let my_path1 = `/qaTest/access/${RandomGenerator.string(9)}`
                                let key1 = RandomGenerator.string(9)
                                let obj2  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id2 = obj2.desc().object_id();
                                let result3 = await op_env.insert_with_key(my_path1,key1,obj_id2);
                                console.info(JSON.stringify(result3))
                                assert.ok(!result3.err)
                        
                                let save_update1 = await op_env.update();
                                console.info("update()",JSON.stringify(save_update1))
                                assert.ok(!save_update1.err);
                
                                let save1 = await op_env.commit();
                                console.info("commit()",JSON.stringify(save1))
                                assert.ok(!save1.err);

                            })
                            it("进行重启模拟器",async()=>{
                                let people_id = stack_standby_ood.local_device().desc().owner()?.unwrap() 
                                let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                                let key = RandomGenerator.string(10)

                                let data = {
                                    category:cyfs.GlobalStateCategory,
                                    AccessMode:cyfs.GlobalStateAccessMode
                                    }

                                let op_env_result= await stack_standby_ood.root_state_stub().create_path_op_env();
                                assert.ok(!op_env_result.err);
                                op_env = op_env_result.unwrap();

                                //修改为Write
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Write))))          
                                let target = stack_standby_ood.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object = cyfs.Admin.create(target,cmd)
                                console.info("admin_object.obj_type_code",admin_object.obj_type_code())
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }

                                let result =  (await stack_standby_ood.non_service().post_object(req)).unwrap();
                                
                                //重启模拟器
                                await ZoneSimulator.restartZoneSimulator()

                                let res2 =(await stack_standby_ood.util().get_device_static_info({common:{flags:0}})).unwrap().info.root_state_access_mode
                                assert.ok(res2 =="read")
                            })
                            it("进行读取操作",async()=>{
                                let people_id = stack_standby_ood.local_device().desc().owner()?.unwrap() 
                                let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                                let key = RandomGenerator.string(10)
                                                        
                                let op_env_result= await stack_standby_ood.root_state_stub().create_path_op_env();
                                assert.ok(!op_env_result.err);
                                op_env = op_env_result.unwrap();


                                let data = {
                                    category:cyfs.GlobalStateCategory,
                                    AccessMode:cyfs.GlobalStateAccessMode
                                    }
                                
                                //修改为Read
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Read))))          
                                let target = stack_standby_ood.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object = cyfs.Admin.create(target,cmd)
                                console.info("admin_object.obj_type_code",admin_object.obj_type_code())
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }

                                //插入操作
                                let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id1 = obj1.desc().object_id();
                                let result1 = await op_env.insert_with_key(my_path,key,obj_id1);
                                console.info("result1",JSON.stringify(result1))
                                assert.ok(!result1.err)
                            
                                let save_update2 = await op_env.update();
                                console.info(JSON.stringify(save_update2))
                                assert.ok(save_update2.err);
                            
                                //修改为Write
                                let cmd1:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Write))))          
                                let target1 = stack_standby_ood.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object1 = cyfs.Admin.create(target1,cmd1)
                                console.info("admin_object.obj_type_code",admin_object1.obj_type_code())
                                let [people_desc1,people_sec1] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec1,admin_object1, new cyfs.SignatureRefIndex(254))
                                let admin_id1 = admin_object1.desc().calculate_id()
                                let buf1 = admin_object1.to_vec().unwrap()
                                
                                let req1:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id1 ,buf1)
                                }

                                let result2 =  (await stack_standby_ood.non_service().post_object(req1)).unwrap();
                                
                                console.info("result2",JSON.stringify(result2))                     
                                console.info("device_static_info",JSON.stringify((await stack_standby_ood.util().get_device_static_info({common:{flags:0}})).unwrap().info))
                                console.info("stack_standby_ood_standby_ood device_static_info",JSON.stringify((await stack_standby_ood.util().get_device_static_info({common:{flags:0}})).unwrap().info))
        
                                
                                //插入操作
                                let my_path1 = `/qaTest/access/${RandomGenerator.string(9)}`
                                let key1 = RandomGenerator.string(9)
                                let obj2  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id2 = obj2.desc().object_id();
                                let result3 = await op_env.insert_with_key(my_path1,key1,obj_id2);
                                console.info("result1",JSON.stringify(result3))
                                assert.ok(!result3.err)
                                
                                let save_update1 = await op_env.update();
                                console.info(JSON.stringify(save_update1))
                                assert.ok(!save_update1.err);

                                //读取操作
                                let result4 = await op_env.get_by_key(my_path,key)
                                assert.ok(!result4.err);
                                
                                let save1 = await op_env.commit();
                                console.info(JSON.stringify(save1))
                                assert.ok(!save1.err);
                            })
                            it("进行写入操作",async()=>{
                                let people_id = stack_standby_ood.local_device().desc().owner()?.unwrap() 
                                let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                                let key = RandomGenerator.string(10)

                                let data = {
                                    category:cyfs.GlobalStateCategory,
                                    AccessMode:cyfs.GlobalStateAccessMode
                                    }

                                let op_env_result= await stack_standby_ood.root_state_stub().create_path_op_env();
                                assert.ok(!op_env_result.err);
                                op_env = op_env_result.unwrap();

                                //修改为Read
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Read))))          
                                let target = stack_standby_ood.local_device_id()
                                let admin_object = cyfs.Admin.create(target,cmd)
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }

                                let result =  (await stack_standby_ood.non_service().post_object(req)).unwrap();
                                console.info("result2",JSON.stringify(result))    
                                
                                
                                //写入操作
                                
                                let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id1 = obj1.desc().object_id();
                                let result1 = await op_env.insert_with_key(my_path,key,obj_id1);
                                console.info(JSON.stringify(result1))
                                assert.ok(!result1.err)
                            
                                let save_update = await op_env.update();
                                console.info(JSON.stringify(save_update))
                                assert.ok(save_update.err);
                

                                //修改为Write
                                let cmd1:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Write))))          
                                let target1 = stack_standby_ood.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object1 = cyfs.Admin.create(target1,cmd1)
                                console.info("admin_object.obj_type_code",admin_object1.obj_type_code())
                                let [people_desc1,people_sec1] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec1,admin_object1, new cyfs.SignatureRefIndex(254))
                                let admin_id1 = admin_object1.desc().calculate_id()
                                let buf1 = admin_object1.to_vec().unwrap()
                                
                                let req1:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id1 ,buf1)
                                }

                                let result2 =  (await stack_standby_ood.non_service().post_object(req1)).unwrap();
                                console.info("result2",JSON.stringify(result2))  
                                console.info("device_static_info",JSON.stringify((await stack_standby_ood.util().get_device_static_info({common:{flags:0}})).unwrap().info))
                                console.info("stack_standby_ood_standby_ood device_static_info_2",JSON.stringify((await stack_standby_ood.util().get_device_static_info({common:{flags:0}})).unwrap().info))


                                //写入操作
                                let my_path1 = `/qaTest/access/${RandomGenerator.string(9)}`
                                let key1 = RandomGenerator.string(9)
                                let obj2  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id2 = obj2.desc().object_id();
                                let result3 = await op_env.insert_with_key(my_path1,key1,obj_id2);
                                console.info(JSON.stringify(result3))
                                assert.ok(!result3.err)
                        
                                let save_update1 = await op_env.update();
                                console.info("update()",JSON.stringify(save_update1))
                                assert.ok(!save_update1.err);
                
                                let save1 = await op_env.commit();
                                console.info("commit()",JSON.stringify(save1))
                                assert.ok(!save1.err);
                            })
                        })
                    })
                })
                describe("# SingleOpEnv",async()=>{
                    describe("##主OOD操作",async()=>{
                        describe("主OOD修改为read",async()=>{
                            it("进行读取操作",async()=>{
                                let people_id = stack.local_device().desc().owner()?.unwrap() 
                                let key = RandomGenerator.string(10)
                                single_op_env  = await createEnv(stack,"single_op_env")
                                //插入操作
                                let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id1 = obj1.desc().object_id();
                                let result1 = await single_op_env.insert_with_key(key,obj_id1);
                                console.info("result1",JSON.stringify(result1))
                                assert.ok(!result1.err)
                                let save_update1 = await single_op_env.update();
                                console.info(JSON.stringify(save_update1))
                                assert.ok(!save_update1.err);    
        
                                //修改为read
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Read))))          
                                let target = stack.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object = cyfs.Admin.create(target,cmd)
                                console.info("admin_object.obj_type_code",admin_object.obj_type_code())
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()                          
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },                               
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }
        
                                let result =  (await stack.non_service().post_object(req)).unwrap();                          
                                console.info("result22",JSON.stringify(result))                     
                              
                                //读取操作
                                let result2 = await single_op_env.get_by_key(key)
                                assert.ok(!result2.err);
                                let save_update = await single_op_env.update();
                                console.info(JSON.stringify(save_update))
                                assert.ok(!save_update.err);          

        
                            })
                            it("进行写入操作",async()=>{
                                let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                                let key = RandomGenerator.string(10)
                                let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                                let people_id = stack.local_device().desc().owner()?.unwrap() 
        
                                let single_op_env_result= await stack.root_state_stub().create_single_op_env();
                                assert.ok(!single_op_env_result.err);
                                single_op_env = single_op_env_result.unwrap();
                                let create = await single_op_env.create_new(cyfs.ObjectMapSimpleContentType.Map)
                                assert.ok(!create.err);
        
                                let data = {
                                    category:cyfs.GlobalStateCategory,
                                    AccessMode:cyfs.GlobalStateAccessMode
                                    }
        
                                //修改为write
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Write))))          
                                let target = stack.local_device_id()
                                let admin_object = cyfs.Admin.create(target,cmd)
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }
        
                                let res=  (await stack.non_service().post_object(req)).unwrap();
                                console.info("result2",JSON.stringify(res.object))    
                                
                                
                                //写入操作                           
                                let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id1 = obj1.desc().object_id();
                                let result1 = await single_op_env.insert_with_key(key,obj_id1);
                                console.info(JSON.stringify(result1))
                                assert.ok(!result1.err)
                                
                                let save_update = await single_op_env.update();
                                console.info(JSON.stringify(save_update))
                                assert.ok(!save_update.err);
                
        
                                //修改为Read
                                let cmd1:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Read))))          
                                let target1 = stack.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object1 = cyfs.Admin.create(target1,cmd1)
                                console.info("admin_object.obj_type_code",admin_object1.obj_type_code())
                                let [people_desc1,people_sec1] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec1,admin_object1, new cyfs.SignatureRefIndex(254))
                                let admin_id1 = admin_object1.desc().calculate_id()
                                let buf1 = admin_object1.to_vec().unwrap()
                                
                                let req1:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id1 ,buf1)
                                }
        
                                let res1 =  (await stack.non_service().post_object(req1)).unwrap();
                               
        
                                //写入操作
                                let key1 = RandomGenerator.string(9)
                                let obj2  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id2 = obj2.desc().object_id();
                                let result2 = await single_op_env.insert_with_key(key1,obj_id2);
                                console.info(JSON.stringify(result2))
                                assert.ok(!result2.err)
        
                                let save_update1 = await single_op_env.update();
                                console.info("update()24",JSON.stringify(save_update1))
                                assert.ok(!save_update1.err);
                
                                let save1 = await single_op_env.commit();
                                console.info("commit()24",JSON.stringify(save1))
                                assert.ok(!save1.err);
        
                            })
                            it("进行重启模拟器",async()=>{
                                let people_id = stack.local_device().desc().owner()?.unwrap() 
                                single_op_env  = await createEnv(stack,"single_op_env")
        

                                //修改为Read
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Read))))          
                                let target = stack.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object = cyfs.Admin.create(target,cmd)
                                console.info("admin_object.obj_type_code",admin_object.obj_type_code())
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }
        
                                let result =  (await stack.non_service().post_object(req)).unwrap();
                    
        
                                //重启模拟器
                                await ZoneSimulator.restartZoneSimulator()

                                let res2 =(await stack.util().get_device_static_info({common:{flags:0}})).unwrap().info.root_state_access_mode
                                assert.ok(res2 =="write")
                            })
                            it("进行读取操作",async()=>{
                                let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                                let people_id = stack.local_device().desc().owner()?.unwrap() 
                                let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                                let key = RandomGenerator.string(10)
                                single_op_env  = await createEnv(stack,"single_op_env")
        
                                //读取前插入操作
                                
                                let obj  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id = obj.desc().object_id();
                                let result = await single_op_env.insert_with_key(key,obj_id);
                                console.info("result1",JSON.stringify(result))
                                assert.ok(!result.err)
                                
                                let save_update1 = await single_op_env.update();
                                console.info(JSON.stringify(save_update1))
                                assert.ok(!save_update1.err);
       
                                //读取操作
                                let result2 = await single_op_env.get_by_key(key)
                                assert.ok(!result2.err);
        
                                //修改为read
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Read))))          
                                let target = stack.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object = cyfs.Admin.create(target,cmd)
                                console.info("admin_object.obj_type_code",admin_object.obj_type_code())
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }
        
                                let result1 =  (await stack.non_service().post_object(req)).unwrap();
                               
        
                                //读取操作
                                let result3 = await single_op_env.get_by_key(key)
                                assert.ok(!result3.err);
        
        
        
                            })
                            it("进行写入操作",async()=>{
                                let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                                let people_id = stack.local_device().desc().owner()?.unwrap() 
                                let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                                let key = RandomGenerator.string(10)
        
                                
                                //修改为read
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Read))))          
                                let target = stack.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object = cyfs.Admin.create(target,cmd)
                                console.info("admin_object.obj_type_code",admin_object.obj_type_code())
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }
                
                                let result =  (await stack.non_service().post_object(req)).unwrap();
                            
                
                                //修改后写入
                                let obj  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id = obj.desc().object_id();
                                let result2 = await single_op_env.insert_with_key(key,obj_id);
                                console.info("result2",JSON.stringify(result2))
                                assert.ok(!result2.err)
                                let save_update1 = await single_op_env.update();
                                console.info("update()",JSON.stringify(save_update1))
                                assert.ok(!save_update1.err);
                
                                //修改为write
                                let cmd1:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Write))))          
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object1 = cyfs.Admin.create(target,cmd1)
                                console.info("admin_object.obj_type_code",admin_object1.obj_type_code())
                                cyfs.sign_and_push_named_object(people_sec,admin_object1, new cyfs.SignatureRefIndex(254))
                                let admin_id1 = admin_object1.desc().calculate_id()
                                let buf1 = admin_object1.to_vec().unwrap()
                                
                                let req1:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id1 ,buf1)
                                }
                
                                let result1 =  (await stack.non_service().post_object(req1)).unwrap();
                                console.info("result1",JSON.stringify(result1))                        
                                //修改后写入
                                let my_path1 = `/qaTest/access/${RandomGenerator.string(9)}`
                                let key1 = RandomGenerator.string(9)
                                let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id1 = obj1.desc().object_id();
                                let result3 = await single_op_env.insert_with_key(key1,obj_id1);
                                console.info("result3",JSON.stringify(result3))
                                assert.ok(!result3.err)
                                let save_update2= await single_op_env.update();
                                console.info("update()1",JSON.stringify(save_update2))
                                assert.ok(!save_update2.err);
                                let save1 = await single_op_env.commit();
                                console.info("commit()1",JSON.stringify(save1))
                                assert.ok(!save1.err);
                
                            })
                        })
                        describe("主OOD修改为Write",async()=>{
                            it("进行读取操作",async()=>{
                                let people_id = stack.local_device().desc().owner()?.unwrap() 
                                let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                                let key = RandomGenerator.string(10)
                                single_op_env  = await createEnv(stack,"single_op_env")                     

        
                                //插入操作
                                let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id1 = obj1.desc().object_id();
                                let result1 = await single_op_env.insert_with_key(key,obj_id1);
                                console.info("result1",JSON.stringify(result1))
                                assert.ok(!result1.err)
                              
                                let save_update1 = await single_op_env.update();
                                console.info(JSON.stringify(save_update1))
                                assert.ok(!save_update1.err);
                                 
                                //修改为Write
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Write))))          
                                let target = stack.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object = cyfs.Admin.create(target,cmd)
                                console.info("admin_object.obj_type_code",admin_object.obj_type_code())
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }
        
                                let result =  (await stack.non_service().post_object(req)).unwrap();
                                
                                
                                //读取操作
                                let result2 = await single_op_env.get_by_key(key)
                                assert.ok(!result2.err);

                            })
                            it("进行写入操作",async()=>{
                                let people_id = stack.local_device().desc().owner()?.unwrap() 
                                let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                                let key = RandomGenerator.string(10)
               
                                //修改为Read
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Read))))          
                                let target = stack.local_device_id()
                                let admin_object = cyfs.Admin.create(target,cmd)
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }
        
                                let result =  (await stack.non_service().post_object(req)).unwrap();
                                console.info("result2",JSON.stringify(result))    
                                
                                
                                //写入操作                       
                                let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id1 = obj1.desc().object_id();
                                let result1 = await single_op_env.insert_with_key(key,obj_id1);
                                console.info(JSON.stringify(result1))
                                assert.ok(!result1.err)
                              
                                let save_update = await single_op_env.update();
                                console.info(JSON.stringify(save_update))
                                assert.ok(!save_update.err);
                
        
                                //修改为Write
                                let cmd1:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Write))))          
                                let target1 = stack.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object1 = cyfs.Admin.create(target1,cmd1)
                                console.info("admin_object.obj_type_code",admin_object1.obj_type_code())
                                let [people_desc1,people_sec1] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec1,admin_object1, new cyfs.SignatureRefIndex(254))
                                let admin_id1 = admin_object1.desc().calculate_id()
                                let buf1 = admin_object1.to_vec().unwrap()
                                
                                let req1:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id1 ,buf1)
                                }
        
                                let result2 =  (await stack.non_service().post_object(req1)).unwrap();
                        
        
        
                                //写入操作
                                let my_path1 = `/qaTest/access/${RandomGenerator.string(9)}`
                                let key1 = RandomGenerator.string(9)
                                let obj2  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id2 = obj2.desc().object_id();
                                let result3 = await single_op_env.insert_with_key(key1,obj_id2);
                                console.info(JSON.stringify(result3))
                                assert.ok(!result3.err)
                        
                                let save_update1 = await single_op_env.update();
                                console.info("update()",JSON.stringify(save_update1))
                                assert.ok(!save_update1.err);
                
                                let save1 = await single_op_env.commit();
                                console.info("commit()",JSON.stringify(save1))
                                assert.ok(!save1.err);
        
                            })
                            it("进行重启模拟器",async()=>{
                                let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                                let people_id = stack.local_device().desc().owner()?.unwrap() 
                                let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                                let key = RandomGenerator.string(10)
        
        
                                let single_op_env_result= await stack.root_state_stub().create_single_op_env();
                                assert.ok(!single_op_env_result.err);
                                single_op_env = single_op_env_result.unwrap();
                                let create = await single_op_env.create_new(cyfs.ObjectMapSimpleContentType.Map)
                                assert.ok(!create.err);
        
                                //修改为Write
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Write))))          
                                let target = stack.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object = cyfs.Admin.create(target,cmd)
                                console.info("admin_object.obj_type_code",admin_object.obj_type_code())
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }
        
                                let result =  (await stack.non_service().post_object(req)).unwrap();

        
                                await ZoneSimulator.restartZoneSimulator()

                                let res2 =(await stack.util().get_device_static_info({common:{flags:0}})).unwrap().info.root_state_access_mode
                                assert.ok(res2 =="write")
                            })
                            it("进行读取操作",async()=>{
                                let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                                let people_id = stack.local_device().desc().owner()?.unwrap() 
                                let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                                let key = RandomGenerator.string(10)
               
                                single_op_env  = await createEnv(stack,"single_op_env")

                                //读取前插入操作                           
                                let obj  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id = obj.desc().object_id();
                                let result = await single_op_env.insert_with_key(key,obj_id);
                                console.info("result1",JSON.stringify(result))
                                assert.ok(!result.err)
                                let save_update1 = await single_op_env.update();
                                console.info(JSON.stringify(save_update1))
                                assert.ok(!save_update1.err);
                            
    
                                //修改为Write
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Write))))          
                                let target = stack.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object = cyfs.Admin.create(target,cmd)
                                console.info("admin_object.obj_type_code",admin_object.obj_type_code())
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }
        
                                let result1 =  (await stack.non_service().post_object(req)).unwrap();
                                
                                //读取操作
                                let result2 = await single_op_env.get_by_key(key)
                                assert.ok(!result2.err);
        
        
                            })
                            it("进行写入操作",async()=>{
                                let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                                let people_id = stack.local_device().desc().owner()?.unwrap() 
                                let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                                let key = RandomGenerator.string(10)
        
                                
                                //修改为Write
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Write))))          
                                let target = stack.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object = cyfs.Admin.create(target,cmd)
                                console.info("admin_object.obj_type_code",admin_object.obj_type_code())
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }
        
                                let result =  (await stack.non_service().post_object(req)).unwrap();

                                //修改为Read
                                let cmd1:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Read))))          
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object1 = cyfs.Admin.create(target,cmd1)
                                console.info("admin_object.obj_type_code",admin_object1.obj_type_code())
                                cyfs.sign_and_push_named_object(people_sec,admin_object1, new cyfs.SignatureRefIndex(254))
                                let admin_id1 = admin_object1.desc().calculate_id()
                                let buf1 = admin_object1.to_vec().unwrap()
                                
                                let req1:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id1 ,buf1)
                                }
        
                                let result1 =  (await stack.non_service().post_object(req1)).unwrap();
                                console.info("result1",JSON.stringify(result1))   
        
                                //修改后写入
                                let my_path1 = `/qaTest/access/${RandomGenerator.string(9)}`
                                let key1 = RandomGenerator.string(9)
                                let obj  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id = obj.desc().object_id();
                                let result2 = await single_op_env.insert_with_key(key1,obj_id);
                                console.info("result2",JSON.stringify(result2))
                                assert.ok(!result2.err)
                                let save_update1 = await single_op_env.update();
                                console.info(JSON.stringify(save_update1))
                                assert.ok(!save_update1.err);
                                let save1 = await single_op_env.commit();
                                console.info(JSON.stringify(save1))
                                assert.ok(!save1.err);
                            })
                        })
                    })
                    describe("##从OOD操作",async()=>{
                        describe("从OOD修改为read",async()=>{
                            it("进行读取操作",async()=>{
                                let people_id = stack_standby_ood.local_device().desc().owner()?.unwrap()                                              
                                let key = RandomGenerator.string(10)
                                single_op_env_stack_standby_ood= await createEnv(stack_standby_ood,"single_op_env")
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                
                                //插入操作
                                let obj0 = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id0 = obj0.desc().object_id();
                                let result0 = await single_op_env_stack_standby_ood.insert_with_key(key,obj_id0);
                                assert.ok(!result0.err)
                                let save_update0 = await single_op_env_stack_standby_ood.update();
                                assert.ok(!save_update0.err);

                                //修改为read
                                let cmd0:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Read))))          
                                let target0 = stack_standby_ood.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object0 = cyfs.Admin.create(target0,cmd0)
                                console.info("admin_object.obj_type_code",admin_object0.obj_type_code())
                                cyfs.sign_and_push_named_object(people_sec,admin_object0, new cyfs.SignatureRefIndex(254))
                                let admin_id0 = admin_object0.desc().calculate_id()
                                let buf0 = admin_object0.to_vec().unwrap()                          
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target0.object_id,
                                        flags: 0
                    
                                    },                               
                                    object:new cyfs.NONObjectInfo(admin_id0 ,buf0)
                                }
        
                                let result1 =  (await stack_standby_ood.non_service().post_object(req)).unwrap();                          
                                console.info("result1",JSON.stringify(result1))                     
                              
                                //读取操作
                                let result2 = await single_op_env_stack_standby_ood.get_by_key(key)
                                assert.ok(!result2.err);
        
                            })
                            it("进行写入操作",async()=>{
                                let key = RandomGenerator.string(10)
                                let people_id = stack.local_device().desc().owner()?.unwrap() 
              
                                //修改为write
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Write))))          
                                let target = stack_standby_ood.local_device_id()
                                let admin_object = cyfs.Admin.create(target,cmd)
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }
        
                                let res=  (await stack_standby_ood.non_service().post_object(req)).unwrap();
                                console.info("result2",JSON.stringify(res.object))    
                                
                                
                                //写入操作                           
                                let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id1 = obj1.desc().object_id();
                                let result1 = await single_op_env_stack_standby_ood.insert_with_key(key,obj_id1);
                                console.info(JSON.stringify(result1))
                                assert.ok(!result1.err)
                                let save_update = await single_op_env_stack_standby_ood.update();
                                console.info(JSON.stringify(save_update))
                                assert.ok(!save_update.err);
                
        
                                //修改为Read
                                let cmd1:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Read))))          
                                let target1 = stack_standby_ood.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object1 = cyfs.Admin.create(target1,cmd1)
                                console.info("admin_object.obj_type_code",admin_object1.obj_type_code())
                                let [people_desc1,people_sec1] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec1,admin_object1, new cyfs.SignatureRefIndex(254))
                                let admin_id1 = admin_object1.desc().calculate_id()
                                let buf1 = admin_object1.to_vec().unwrap()
                                
                                let req1:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id1 ,buf1)
                                }
                               
                                let res1 =  (await stack_standby_ood.non_service().post_object(req1)).unwrap();
                                
                                //写入操作
                                let key1 = RandomGenerator.string(9)
                                let obj2  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id2 = obj2.desc().object_id();
                                let result2 = await single_op_env_stack_standby_ood.insert_with_key(key1,obj_id2);
                                console.info(JSON.stringify(result2))
                                assert.ok(!result2.err)
        
                                let save_update1 = await single_op_env_stack_standby_ood.update();
                                console.info("update()24",JSON.stringify(save_update1))
                                assert.ok(!save_update1.err);
                
                                let save1 = await single_op_env_stack_standby_ood.commit();
                                console.info("commit()24",JSON.stringify(save1))
                                assert.ok(!save1.err);
        
                            })
                            it("进行重启模拟器",async()=>{
                                let people_id = stack.local_device().desc().owner()?.unwrap() 

                                //修改为Read
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Read))))          
                                let target = stack_standby_ood.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object = cyfs.Admin.create(target,cmd)
                                console.info("admin_object.obj_type_code",admin_object.obj_type_code())
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }
        
                                let result =  (await stack_standby_ood.non_service().post_object(req)).unwrap();
        
                                      
                                await ZoneSimulator.restartZoneSimulator()

                                let res2 =(await stack_standby_ood.util().get_device_static_info({common:{flags:0}})).unwrap().info.root_state_access_mode
                                assert.ok(res2 =="read")  
                                
                               
                            it("进行读取操作",async()=>{
                                single_op_env_stack_standby_ood= await createEnv(stack_standby_ood,"single_op_env")
                                let people_id = stack_standby_ood.local_device().desc().owner()?.unwrap() 
                                let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                                let key = RandomGenerator.string(10)
        
        
                                //读取前插入操作
                                
                                let obj  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id = obj.desc().object_id();
                                let result = await single_op_env_stack_standby_ood.insert_with_key(key,obj_id);
                                console.info("result1",JSON.stringify(result))
                                assert.ok(!result.err)
                                
                                let save_update1 = await single_op_env_stack_standby_ood.update();
                                console.info(JSON.stringify(save_update1))
                                assert.ok(!save_update1.err);
        
                                //读取操作
                                let result2 = await single_op_env_stack_standby_ood.get_by_key(key)
                                assert.ok(!result2.err);
        
                                //修改为read
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Read))))          
                                let target = stack_standby_ood.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object = cyfs.Admin.create(target,cmd)
                                console.info("admin_object.obj_type_code",admin_object.obj_type_code())
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }
        
                                let result1 =  (await stack_standby_ood.non_service().post_object(req)).unwrap();
                                
                                console.info("result2",JSON.stringify(result1))                     
                                console.info("device_static_info",JSON.stringify((await stack.util().get_device_static_info({common:{flags:0}})).unwrap().info))
                                console.info("stack_standby_ood device_static_info",JSON.stringify((await stack_standby_ood.util().get_device_static_info({common:{flags:0}})).unwrap().info))
        
                                //读取操作
                                let result3 = await single_op_env_stack_standby_ood.get_by_key(key)
                                assert.ok(!result3.err);
        
        
        
                            })
                            it("进行写入操作",async()=>{
                                let people_id = stack_standby_ood.local_device().desc().owner()?.unwrap() 
                                let key = RandomGenerator.string(10)
        
                                
                                //修改为read
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Read))))          
                                let target = stack_standby_ood.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object = cyfs.Admin.create(target,cmd)
                                console.info("admin_object.obj_type_code",admin_object.obj_type_code())
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }
                
                                let result =  (await stack_standby_ood.non_service().post_object(req)).unwrap();
                            
                                //修改后写入
                                let obj  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id = obj.desc().object_id();
                                let result2 = await single_op_env_stack_standby_ood.insert_with_key(key,obj_id);
                                console.info("result2",JSON.stringify(result2))
                                assert.ok(!result2.err)
                                let save_update1 = await single_op_env_stack_standby_ood.update();
                                console.info("update()",JSON.stringify(save_update1))
                                assert.ok(!save_update1.err);
                
                                //修改为write
                                let cmd1:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Write))))          
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object1 = cyfs.Admin.create(target,cmd1)
                                console.info("admin_object.obj_type_code",admin_object1.obj_type_code())
                                cyfs.sign_and_push_named_object(people_sec,admin_object1, new cyfs.SignatureRefIndex(254))
                                let admin_id1 = admin_object1.desc().calculate_id()
                                let buf1 = admin_object1.to_vec().unwrap()
                                
                                let req1:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id1 ,buf1)
                                }
                
                                let result1 =  (await stack_standby_ood.non_service().post_object(req1)).unwrap();
                                console.info("result1",JSON.stringify(result1))                        
                                //修改后写入
                                let my_path1 = `/qaTest/access/${RandomGenerator.string(9)}`
                                let key1 = RandomGenerator.string(9)
                                let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id1 = obj1.desc().object_id();
                                let result3 = await single_op_env_stack_standby_ood.insert_with_key(key1,obj_id1);
                                console.info("result3",JSON.stringify(result3))
                                assert.ok(!result3.err)
                                let save_update2= await single_op_env_stack_standby_ood.update();
                                console.info("update()1",JSON.stringify(save_update2))
                                assert.ok(!save_update2.err);
                                let save1 = await single_op_env_stack_standby_ood.commit();
                                console.info("commit()1",JSON.stringify(save1))
                                assert.ok(!save1.err);
                
                            })
                        })
                        describe("从OOD修改为Write",async()=>{
                            it("进行读取操作",async()=>{
                                let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
                                let people_id = stack_standby_ood.local_device().desc().owner()?.unwrap() 
                                let key = RandomGenerator.string(10)
                                single_op_env_stack_standby_ood= await createEnv(stack_standby_ood,"single_op_env")
                                 
                                //插入操作
                                let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id1 = obj1.desc().object_id();
                                let result1 = await single_op_env_stack_standby_ood.insert_with_key(key,obj_id1);
                                console.info("result1",JSON.stringify(result1))
                                assert.ok(!result1.err)                            
                                let save_update1 = await single_op_env_stack_standby_ood.update();
                                console.info(JSON.stringify(save_update1))
                                assert.ok(!save_update1.err);

                               
                                //修改为Write
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Write))))          
                                let target = stack_standby_ood.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object = cyfs.Admin.create(target,cmd)
                                console.info("admin_object.obj_type_code",admin_object.obj_type_code())
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }
        
                                let result =  (await stack_standby_ood.non_service().post_object(req)).unwrap();
                                
                                
                                //读取操作
                                let result2 = await single_op_env_stack_standby_ood.get_by_key(key)
                                assert.ok(!result2.err);
                                
                            })
                            it("进行写入操作",async()=>{
                                let people_id = stack.local_device().desc().owner()?.unwrap() 
                                let key = RandomGenerator.string(10)
          
                                //修改为Read
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Read))))          
                                let target = stack_standby_ood.local_device_id()
                                let admin_object = cyfs.Admin.create(target,cmd)
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }
        
                                let result =  (await stack_standby_ood.non_service().post_object(req)).unwrap();
                                console.info("result2",JSON.stringify(result))    
                                
                                
                                //写入操作                       
                                let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id1 = obj1.desc().object_id();
                                let result1 = await single_op_env_stack_standby_ood.insert_with_key(key,obj_id1);
                                console.info(JSON.stringify(result1))
                                assert.ok(!result1.err)
                              
                                let save_update = await single_op_env_stack_standby_ood.update();
                                console.info(JSON.stringify(save_update))
                                assert.ok(!save_update.err);
                
        
                                //修改为Write
                                let cmd1:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Write))))          
                                let target1 = stack_standby_ood.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object1 = cyfs.Admin.create(target1,cmd1)
                                console.info("admin_object.obj_type_code",admin_object1.obj_type_code())
                                let [people_desc1,people_sec1] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec1,admin_object1, new cyfs.SignatureRefIndex(254))
                                let admin_id1 = admin_object1.desc().calculate_id()
                                let buf1 = admin_object1.to_vec().unwrap()
                                
                                let req1:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id1 ,buf1)
                                }
        
                                let result2 =  (await stack_standby_ood.non_service().post_object(req1)).unwrap();
                                
        
                                //写入操作
                                let my_path1 = `/qaTest/access/${RandomGenerator.string(9)}`
                                let key1 = RandomGenerator.string(9)
                                let obj2  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id2 = obj2.desc().object_id();
                                let result3 = await single_op_env_stack_standby_ood.insert_with_key(key1,obj_id2);
                                console.info(JSON.stringify(result3))
                                assert.ok(!result3.err)
                        
                                let save_update1 = await single_op_env_stack_standby_ood.update();
                                console.info("update()",JSON.stringify(save_update1))
                                assert.ok(!save_update1.err);
                
                                let save1 = await single_op_env_stack_standby_ood.commit();
                                console.info("commit()",JSON.stringify(save1))
                                assert.ok(!save1.err);
        
                            })
                            it("进行重启模拟器",async()=>{
                                let people_id = stack.local_device().desc().owner()?.unwrap() 
                                let key = RandomGenerator.string(10)
          
                                //修改为Write
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Write))))          
                                let target = stack_standby_ood.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object = cyfs.Admin.create(target,cmd)
                                console.info("admin_object.obj_type_code",admin_object.obj_type_code())
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }
        
                                let result =  (await stack_standby_ood.non_service().post_object(req)).unwrap();
                               
                                await ZoneSimulator.restartZoneSimulator()

                                let res2 =(await stack_standby_ood.util().get_device_static_info({common:{flags:0}})).unwrap().info.root_state_access_mode
                                assert.ok(res2 =="read")  
                            })
                            it("进行读取操作",async()=>{
                                let people_id = stack.local_device().desc().owner()?.unwrap() 
                                let key = RandomGenerator.string(10)
                                single_op_env_stack_standby_ood= await createEnv(stack_standby_ood,"single_op_env")
        
        
                                //读取前插入操作                           
                                let obj  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id = obj.desc().object_id();
                                let result = await single_op_env_stack_standby_ood.insert_with_key(key,obj_id);
                                console.info("result1",JSON.stringify(result))
                                assert.ok(!result.err)
                                let save_update1 = await single_op_env_stack_standby_ood.update();
                                console.info(JSON.stringify(save_update1))
                                assert.ok(!save_update1.err);
                            
        
        
    
                                //修改为Write
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Write))))          
                                let target = stack_standby_ood.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object = cyfs.Admin.create(target,cmd)
                                console.info("admin_object.obj_type_code",admin_object.obj_type_code())
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }
        
                                let result1 =  (await stack_standby_ood.non_service().post_object(req)).unwrap();
                                           
                                //读取操作
                                let result2 = await single_op_env_stack_standby_ood.get_by_key(key)
                                assert.ok(!result2.err);
        
                            })
                            it("进行写入操作",async()=>{
                                let people_id = stack.local_device().desc().owner()?.unwrap() 
                                let my_path = `/qaTest/access/${RandomGenerator.string(10)}`
                                let key = RandomGenerator.string(10)
        
                                
                                //修改为Write
                                let cmd:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Write))))          
                                let target = stack_standby_ood.local_device_id()
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object = cyfs.Admin.create(target,cmd)
                                console.info("admin_object.obj_type_code",admin_object.obj_type_code())
                                let [people_desc,people_sec] = loadDescandSec("C:\\cyfs\\etc\\zone-simulator\\user1\\people")
                                cyfs.sign_and_push_named_object(people_sec,admin_object, new cyfs.SignatureRefIndex(254))
                                let admin_id = admin_object.desc().calculate_id()
                                let buf = admin_object.to_vec().unwrap()
                                
                                let req:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id ,buf)
                                }
        
                                let result =  (await stack_standby_ood.non_service().post_object(req)).unwrap();
                    
        
                                //修改为Read
                                let cmd1:cyfs.AdminCommand =(new cyfs.AdminCommand((cyfs.AdminCommandCode.GlobalStateAccessMode),(new cyfs.AdminGlobalStateAccessModeData(data.category.RootState,data.AccessMode.Read))))          
                                console.info("owner_object.obj_type_code",people_id)
                                let admin_object1 = cyfs.Admin.create(target,cmd1)
                                console.info("admin_object.obj_type_code",admin_object1.obj_type_code())
                                cyfs.sign_and_push_named_object(people_sec,admin_object1, new cyfs.SignatureRefIndex(254))
                                let admin_id1 = admin_object1.desc().calculate_id()
                                let buf1 = admin_object1.to_vec().unwrap()
                                
                                let req1:cyfs.NONPostObjectOutputRequest = 
                                {
                                    common:{
                                        level: cyfs.NONAPILevel.Router,
                                        target: target.object_id,
                                        flags: 0
                    
                                    },
                                    
                                    object:new cyfs.NONObjectInfo(admin_id1 ,buf1)
                                }
        
                                let result1 =  (await stack_standby_ood.non_service().post_object(req1)).unwrap();
                                console.info("result1",JSON.stringify(result1))   
        
                         
                                
                                //修改后写入
                                let my_path1 = `/qaTest/access/${RandomGenerator.string(9)}`
                                let key1 = RandomGenerator.string(9)
                                let obj  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
                                let obj_id = obj.desc().object_id();
                                let result2 = await single_op_env_stack_standby_ood.insert_with_key(key1,obj_id);
                                console.info("result2",JSON.stringify(result2))
                                assert.ok(!result2.err)
                                let save_update1 = await single_op_env_stack_standby_ood.update();
                                console.info(JSON.stringify(save_update1))
                                assert.ok(!save_update1.err);
                                let save1 = await single_op_env_stack_standby_ood.commit();
                                console.info(JSON.stringify(save1))
                                assert.ok(!save1.err);
                            })
                        })
                        })     
                    })

                })
            })
    
        })
    // describe("#主从OOD 数据同步性能测试",async()=>{
    //     describe("#NON 对象数据同步性能测试10万",async()=>{
    //             it("单次修改新增1个Object",async()=>{
    //                     // (1) 主 OOD root_state 插入数据commit
    //                     let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
    //                     let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
    //                     assert.ok(!result.err);
    //                     let op_env = result.unwrap();
    //                     let obj_list:Array<cyfs.ObjectId> = [];
    //                     for(let i=0;i<100000;i++){
    //                         let insert_path = `/qaTest/${RandomGenerator.string(10)}/${RandomGenerator.string(10)}`
    //                         let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
    //                         let obj_id1 = obj1.desc().object_id();
    //                         obj_list.push(obj_id1);
    //                         let save = await stack.non_service().put_object({
    //                             common: {
    //                                 dec_id:ZoneSimulator.APPID,
    //                                 flags: 0,
    //                                 //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
    //                                 level: cyfs.NONAPILevel.NOC //设置路由类型
    //                             },
    //                             object: new cyfs.NONObjectInfo(obj1.desc().calculate_id(), obj1.to_vec().unwrap())
    //                         })
    //                         let create = await op_env.insert_with_path(insert_path,obj_id1)
    //                         assert.ok(!create.err);
    //                     }
    //                     let result3 =  await op_env.commit();
    //                     let begin =Date.now();
    //                     console.info(JSON.stringify(result3))
    //                     assert.ok(!result3.err)
    //                     let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
    //                     console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
    //                     let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
    //                     console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
    //                     while( Number(standby_ood_revision) < Number(ood_revision)){
    //                         standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
    //                         console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
    //                         await cyfs.sleep(2000)
    //                 }
    //                 let  async_time = Date.now() - begin;
    //                 for(let i in obj_list){
    //                     let get_ret = await stack_standby_ood.non_service().get_object({
    //                         object_id:obj_list[i],
    //                         common: {
    //                             req_path: "/qa/get_object",
    //                             level: cyfs.NONAPILevel.NOC,
    //                             dec_id:ZoneSimulator.APPID,
    //                             flags: 0,
    //                         }});
    //                         assert.ok(!get_ret.err);
    //                         let check = get_ret.unwrap().object;
    //                         assert.ok(check.object_id = obj_list[i]);
    //                 }      

    //                     })
    //             it("单次修改新增100个Object",async()=>{
    //                     // (1) 主 OOD root_state 插入数据commit
    //                 //     let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
    //                 //     let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
    //                 //     assert.ok(!result.err);
    //                 //     let op_env = result.unwrap();
    //                 //     let obj_list:Array<cyfs.ObjectId> = [];
    //                 //     for(let i=0;i<100;i++){

                            
                            
                                    

                                
    //                 //     }
                            
                        
    //                 //     let result3 =  await op_env.commit();
    //                 //     let begin =Date.now();
    //                 //     console.info(JSON.stringify(result3))
    //                 //     assert.ok(!result3.err)
    //                 //     let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
    //                 //     console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
    //                 //     let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
    //                 //     console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
    //                 //     while( Number(standby_ood_revision) < Number(ood_revision)){
    //                 //         standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
    //                 //         console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
    //                 //         await cyfs.sleep(2000)
    //                 // }
    //                 // let  async_time = Date.now() - begin;
    //                 // for(let i in obj_list){
    //                 //     let get_ret = await stack_standby_ood.non_service().get_object({
    //                 //         object_id:obj_list[i],
    //                 //         common: {
    //                 //             req_path: "/qa/get_object",
    //                 //             level: cyfs.NONAPILevel.NOC,
    //                 //             dec_id:ZoneSimulator.APPID,
    //                 //             flags: 0,
    //                 //         }});
    //                 //         assert.ok(!get_ret.err);
    //                 //         let check = get_ret.unwrap().object;
    //                 //         assert.ok(check.object_id = obj_list[i]);
    //                 // }        
                    
    //             })
    //             it("单次修改新增10000个Object",async()=>{
    //                     // (1) 主 OOD root_state 插入数据commit
    //                     let stack_standby_ood = ZoneSimulator.zone1_standby_ood_stack!;
    //                     let result= await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
    //                     assert.ok(!result.err);
    //                     let op_env = result.unwrap();
    //                     let obj_list:Array<cyfs.ObjectId> = [];
    //                     for(let i=0;i<100000;i++){
    //                         let insert_path = `/qaTest/${RandomGenerator.string(10)}/${RandomGenerator.string(10)}`
    //                         let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
    //                         let obj_id1 = obj1.desc().object_id();
    //                         obj_list.push(obj_id1);
    //                         let save = await stack.non_service().put_object({
    //                             common: {
    //                                 dec_id:ZoneSimulator.APPID,
    //                                 flags: 0,
    //                                 //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
    //                                 level: cyfs.NONAPILevel.NOC //设置路由类型
    //                             },
    //                             object: new cyfs.NONObjectInfo(obj1.desc().calculate_id(), obj1.to_vec().unwrap())
    //                         })
    //                         let create = await op_env.insert_with_path(insert_path,obj_id1)
    //                         assert.ok(!create.err);
    //                     }
    //                     let result3 =  await op_env.commit();
    //                     let begin =Date.now();
    //                     console.info(JSON.stringify(result3))
    //                     assert.ok(!result3.err)
    //                     let ood_revision =  (await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
    //                     console.info(`# 主OOD 当前 revision : ${JSON.stringify(ood_revision)}`)
    //                     let standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
    //                     console.info(`# 从OOD 当前 revision : ${JSON.stringify(standby_ood_revision)}`)
    //                     while( Number(standby_ood_revision) < Number(ood_revision)){
    //                         standby_ood_revision =  (await stack_standby_ood.root_state_stub(ZoneSimulator.zone1_standby_ood_stack.local_device_id().object_id).get_current_root()).unwrap().revision;
    //                         console.info(`# 从OOD  当前 revision : ${JSON.stringify(standby_ood_revision)}`)
    //                         await cyfs.sleep(2000)
    //                 }
    //                 let  async_time = Date.now() - begin;
    //                 for(let i in obj_list){
    //                     let get_ret = await stack_standby_ood.non_service().get_object({
    //                         object_id:obj_list[i],
    //                         common: {
    //                             req_path: "/qa/get_object",
    //                             level: cyfs.NONAPILevel.NOC,
    //                             dec_id:ZoneSimulator.APPID,
    //                             flags: 0,
    //                         }});
    //                         assert.ok(!get_ret.err);
    //                         let check = get_ret.unwrap().object;
    //                         assert.ok(check.object_id = obj_list[i]);
    //                 }      

    //                     })                  
    //     describe("#NDN chunk数据同步性能测试",async()=>{
    //         assert.ok(true)
       
    //     })
    // })
    // })

    })
})
