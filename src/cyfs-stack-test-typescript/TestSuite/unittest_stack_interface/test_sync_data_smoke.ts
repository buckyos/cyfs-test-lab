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
                        level: cyfs.NONAPILevel.NOC //设置路由类型
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


async function make_dir_obj(){}


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

 
})
