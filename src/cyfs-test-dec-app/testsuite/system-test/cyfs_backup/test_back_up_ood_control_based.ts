import { RandomGenerator } from '@/common';
import * as cyfs from '@/cyfs';
import {CyfsTestRunner,DEC_APP_1,DEC_APP_2} from "@/cyfs-test-util";
import assert from "assert";
import {DynamicTokenHandler,ShareObjectWithTokenAction} from "@/dec-app-action"
import { HandlerRequestObject,HandlerRequestObjectDecoder, HandlerType } from "../../../dec-app-base"
import * as fs from "fs-extra";
import path  from "path";
import {LocalUtilTool } from "cyfs-driver-client"
import {CyfsDriverType} from "@/cyfs-test-base"
// npm run test testsuite/system-test/cyfs_backup/test_back_up_ood_control_based.ts
import fetch from "node-fetch"


const save_path = "E:\\bucky_file\\OneDrive - buckyos\\测试项目\\CYFS\\OOD数据备份测试\\test_data";
// NameObject num = nameobject_thread * nameobject_number
const nameobject_thread = 10;
const nameobject_number = 10

// Each type of ObjectMap key value data  num = ket_data_thread * ket_data_number,There contains (root_state local_cache)*(Path IsolatePath Single)
const ket_data_thread = 5;
const ket_data_number = 20

// chunk data size = chunk_thread * chunk_number * chunk_size(10MB)
const chunk_thread = 5;
const chunk_number = 10;

// file data size = file_thread * file_number * file_size(10MBFile)
const file_thread = 5;
const file_number = 10;
const json_name = Date.now().toString(); 



describe("Random testing data for cyfs backup",()=>{
    // Use Nginx proxy data,the cyfs test driver has perf issuse
    const service_url = `http://192.168.100.205:${11318}`;
    const ws_url = `ws://192.168.100.205:${11319}`;
    let stack_param= new cyfs.SharedCyfsStackParam(
        service_url,
        cyfs.CyfsStackEventType.WebSocket,
        DEC_APP_1,
        ws_url
    )
    let stack = cyfs.SharedCyfsStack.open(stack_param) ;

    let test_runner =  CyfsTestRunner.createInstance(CyfsDriverType.other,[
        {
            peer_name: "zone3_ood",
            zone_tag: "zone3",
            stack_type: "ood",
            bdt_port: 30000,
            http_port: 30001,
            ws_port: 30002,
        }
    ]);
    beforeAll(async function () {
        await new Promise(async resolve => {
            await stack.wait_online();
            await test_runner.init()
            await test_runner.before_all_common();
            resolve("finished");
        })
    },60*1000)
    

    it("Create random NameObject save to NOC",async()=>{
        //let stack = stack_manager.get_cyfs_satck(test_device).stack!;
        let running = []
        for (let i = 0; i < nameobject_thread; i++) {
            running.push(new Promise(async(resolve)=>{
                let object_list = [];
                for (let j = 0; j < nameobject_number; j++) {
                    let id = `message-${RandomGenerator.string(20)}-${Date.now()}`;
                    let request_json = JSON.stringify({
                        message: RandomGenerator.string(20)
                    });
                    let begin = Date.now();
                    let save_object = HandlerRequestObject.create(stack.local_device_id().object_id, HandlerType.PutObject, id,request_json, new Uint8Array(0));
                    let create_time = Date.now() - begin;
                    let result = await stack.non_service().put_object({
                        common: {
                            flags: 1,
                            level: cyfs.NONAPILevel.NOC
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(save_object.to_vec().unwrap()).unwrap(),
                    })
                    let put_time = Date.now() - begin - create_time;
                    assert.ok(!result.err)
                    let object_id = save_object.calculate_id().to_base_58()
                    console.info(`task ${i} put object success ${object_id} ,create_time = ${create_time} put_time = ${put_time}`)
                    object_list.push({
                        object_id,
                        id,
                        request_json,
                        create_time,
                        put_time
                    })
                }
                fs.writeFileSync(path.join(save_path,`nameobject_${json_name}_${i}.json`),JSON.stringify({nameobject:object_list}))
                resolve("")
            })) 

            
            
        }
        for(let run of running){
            await run
        }
    })
    it ("Create random root_state ObjectMapOpEnvType.Path data",async()=>{
        //let stack = stack_manager.get_cyfs_satck(test_device).stack!;
        let running = []
        for (let i = 0; i < ket_data_thread; i++) {
            running.push(new Promise(async(resolve)=>{
                let env_path =`/backup/${RandomGenerator.string(20)}`;    
                
                let create_result = await stack.root_state().create_op_env({
                    common: {
                        flags : 1,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Path,
                    access:  {
                        path : env_path,
                        access : cyfs.AccessPermissions.Full
                    }
                });
                let op_env =  create_result.unwrap();
                


                let object_list = [];
                for (let j = 0; j < ket_data_number; j++) {
                    let id = `message-${RandomGenerator.string(20)}-${Date.now()}`;
                    let request_json = JSON.stringify({
                        message: RandomGenerator.string(20)
                    });
                    let begin = Date.now();
                    let save_object = HandlerRequestObject.create(stack.local_device_id().object_id, HandlerType.PutObject, id,request_json, new Uint8Array(0));
                    let create_time = Date.now() - begin;
                    let result = await stack.non_service().put_object({
                        common: {
                            flags: 1,
                            level: cyfs.NONAPILevel.NOC
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(save_object.to_vec().unwrap()).unwrap(),
                    })
                    let put_time = Date.now() - begin - create_time;
                    assert.ok(!result.err)
                    let object_id = save_object.calculate_id().to_base_58()
                    console.info(`task ${i} put object success ${object_id} ,create_time = ${create_time} put_time = ${put_time}`)
                    let object_path =  `${env_path}/${object_id}`;
                    let insert_root =await op_env.insert_with_key({
                        common: {
                            flags : 1,
                            sid : op_env.get_sid() 
                        },
                        path: object_path,
                        key: object_id,
                        value: save_object.calculate_id(),
                    })
                    assert.ok(!insert_root.err);
                    object_list.push({
                        object_path,
                        key : object_id,
                        object_id,
                        id,
                        request_json,
                        create_time,
                        put_time
                    })
                }
                let commit =await op_env.commit({
                    common: {
                        flags : 1,
                        sid : op_env.get_sid() 
                    },
                    op_type: cyfs.OpEnvCommitOpType.Commit,
                });
                fs.writeFileSync(path.join(save_path,`root_state_path_${json_name}_${i}.json`),JSON.stringify({
                    nameobject:object_list,
                    env_path,
                }))
                resolve("")
            }))  
        }
        for(let run of running){
            await run
        }
    })
    it("Create random root_state ObjectMapOpEnvType.IsolatePath data",async()=>{
        //let stack = stack_manager.get_cyfs_satck(test_device).stack!;
        let running = []
        for (let i = 0; i < ket_data_thread; i++) {
            running.push(new Promise(async(resolve)=>{
                let env_path =`/backup/${RandomGenerator.string(20)}`;    
                
                let create_result = await stack.root_state_stub().create_isolate_path_op_env_with_access({
                    access :cyfs.AccessPermissions.Full,
                    path : env_path
                });
                let op_env =  create_result.unwrap();
                let create_info =await op_env.create_new(cyfs.ObjectMapSimpleContentType.Map)
                assert.ok(!create_info.err);
                let object_list = [];
                for (let j = 0; j < ket_data_number; j++) {
                    let id = `message-${RandomGenerator.string(20)}-${Date.now()}`;
                    let request_json = JSON.stringify({
                        message: RandomGenerator.string(20)
                    });
                    let begin = Date.now();
                    let save_object = HandlerRequestObject.create(stack.local_device_id().object_id, HandlerType.PutObject, id,request_json, new Uint8Array(0));
                    let create_time = Date.now() - begin;
                    let result = await stack.non_service().put_object({
                        common: {
                            flags: 1,
                            level: cyfs.NONAPILevel.NOC
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(save_object.to_vec().unwrap()).unwrap(),
                    })
                    let put_time = Date.now() - begin - create_time;
                    assert.ok(!result.err)
                    assert.ok(!result.err)
                    let object_id = save_object.calculate_id().to_base_58()
                    console.info(`task ${i} put object success ${object_id} ,create_time = ${create_time} put_time = ${put_time}`)
                    let object_path =  `${env_path}/${object_id}`;
                    let insert_root =await op_env.insert_with_key(object_path,
                        object_id,
                        save_object.calculate_id(),)
                    assert.ok(!insert_root.err);
                    object_list.push({
                        object_path,
                        key : object_id,
                        object_id,
                        id,
                        request_json,
                        create_time,
                        put_time
                    })
                }
                let commit =await op_env.commit();
                fs.writeFileSync(path.join(save_path,`root_state_isolate_${json_name}_${i}.json`),JSON.stringify({
                    nameobject:object_list,
                    env_path,
                    dec_root : commit.unwrap().dec_root
                }))
                resolve("")
            }))  
        }
        for(let run of running){
            await run
        }
    })
    it("Create random root_state ObjectMapOpEnvType.Single data",async()=>{
        //let stack = stack_manager.get_cyfs_satck(test_device).stack!;
        let running = []
        for (let i = 0; i < ket_data_thread; i++) {
            running.push(new Promise(async(resolve)=>{
                let env_path =`/backup/${RandomGenerator.string(20)}`;    
                
                 
                let create_result = await stack.root_state_stub().create_single_op_env_with_access({
                    access :cyfs.AccessPermissions.Full,
                    path : env_path
                });
                let op_env =  create_result.unwrap();
                let create_info =await op_env.create_new(cyfs.ObjectMapSimpleContentType.Map)
                assert.ok(!create_info.err);


                let object_list = [];
                for (let j = 0; j < ket_data_number; j++) {
                    let id = `message-${RandomGenerator.string(20)}-${Date.now()}`;
                    let request_json = JSON.stringify({
                        message: RandomGenerator.string(20)
                    });
                    let begin = Date.now();
                    let save_object = HandlerRequestObject.create(stack.local_device_id().object_id, HandlerType.PutObject, id,request_json, new Uint8Array(0));
                    let create_time = Date.now() - begin;
                    let result = await stack.non_service().put_object({
                        common: {
                            flags: 1,
                            level: cyfs.NONAPILevel.NOC
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(save_object.to_vec().unwrap()).unwrap(),
                    })
                    let put_time = Date.now() - begin - create_time;
                    assert.ok(!result.err)
                    let object_id = save_object.calculate_id().to_base_58()
                    console.info(`task ${i} put object success ${object_id} ,create_time = ${create_time} put_time = ${put_time}`)
                    let object_path =  `${env_path}/${object_id}`;
                    let insert_root =await op_env.insert_with_key(
                        object_id,
                        save_object.calculate_id(),
                    )
                    assert.ok(!insert_root.err);
                    object_list.push({
                        object_path,
                        key : object_id,
                        object_id,
                        id,
                        request_json,
                        create_time,
                        put_time
                    })
                }
                let commit =await op_env.commit();
                fs.writeFileSync(path.join(save_path,`root_state_single_${json_name}_${i}.json`),JSON.stringify({
                    nameobject:object_list,
                    env_path,
                    dec_root : commit.unwrap().dec_root
                }))
                resolve("")
            }))  
        }
        for(let run of running){
            await run
        }
    })
    it("Create random local_cache ObjectMapOpEnvType.Path data",async()=>{
        //let stack = stack_manager.get_cyfs_satck(test_device).stack!;
        let running = []
        for (let i = 0; i < ket_data_thread; i++) {
            running.push(new Promise(async(resolve)=>{
                let env_path =`/backup/${RandomGenerator.string(20)}`;    
                
                let create_result = await stack.local_cache().create_op_env({
                    common: {
                        flags : 1,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Path,
                    access:  {
                        path : env_path,
                        access : cyfs.AccessPermissions.Full
                    }
                });
                let op_env =  create_result.unwrap();
                


                let object_list = [];
                for (let j = 0; j < ket_data_number; j++) {
                    let id = `message-${RandomGenerator.string(20)}-${Date.now()}`;
                    let request_json = JSON.stringify({
                        message: RandomGenerator.string(20)
                    });
                    let begin = Date.now();
                    let save_object = HandlerRequestObject.create(stack.local_device_id().object_id, HandlerType.PutObject, id,request_json, new Uint8Array(0));
                    let create_time = Date.now() - begin;
                    let result = await stack.non_service().put_object({
                        common: {
                            flags: 1,
                            level: cyfs.NONAPILevel.NOC
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(save_object.to_vec().unwrap()).unwrap(),
                    })
                    let put_time = Date.now() - begin - create_time;
                    assert.ok(!result.err)
                    let object_id = save_object.calculate_id().to_base_58()
                    console.info(`task ${i} put object success ${object_id} ,create_time = ${create_time} put_time = ${put_time}`)
                    let object_path =  `${env_path}/${object_id}`;
                    let insert_root =await op_env.insert_with_key({
                        common: {
                            flags : 1,
                            sid : op_env.get_sid() 
                        },
                        path: object_path,
                        key: object_id,
                        value: save_object.calculate_id(),
                    })
                    assert.ok(!insert_root.err);
                    object_list.push({
                        object_path,
                        key : object_id,
                        object_id,
                        id,
                        request_json,
                        create_time,
                        put_time
                    })
                }
                let commit =await op_env.commit({
                    common: {
                        flags : 1,
                        sid : op_env.get_sid() 
                    },
                    op_type: cyfs.OpEnvCommitOpType.Commit,
                });
                fs.writeFileSync(path.join(save_path,`local_cache_path_${json_name}_${i}.json`),JSON.stringify({
                    nameobject:object_list,
                    env_path,
                }))
                resolve("")
            }))  
        }
        for(let run of running){
            await run
        }
    })
    it("Create random local_cache ObjectMapOpEnvType.IsolatePath data",async()=>{
        //let stack = stack_manager.get_cyfs_satck(test_device).stack!;
        let running = []
        for (let i = 0; i < ket_data_thread; i++) {
            running.push(new Promise(async(resolve)=>{
                let env_path =`/backup/${RandomGenerator.string(20)}`;    
                
                let create_result = await stack.local_cache_stub().create_isolate_path_op_env_with_access({
                    access :cyfs.AccessPermissions.Full,
                    path : env_path
                });
                let op_env =  create_result.unwrap();
                let create_info =await op_env.create_new(cyfs.ObjectMapSimpleContentType.Map)
                assert.ok(!create_info.err);
                let object_list = [];
                for (let j = 0; j < ket_data_number; j++) {
                    let id = `message-${RandomGenerator.string(20)}-${Date.now()}`;
                    let request_json = JSON.stringify({
                        message: RandomGenerator.string(20)
                    });
                    let begin = Date.now();
                    let save_object = HandlerRequestObject.create(stack.local_device_id().object_id, HandlerType.PutObject, id,request_json, new Uint8Array(0));
                    let create_time = Date.now() - begin;
                    let result = await stack.non_service().put_object({
                        common: {
                            flags: 1,
                            level: cyfs.NONAPILevel.NOC
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(save_object.to_vec().unwrap()).unwrap(),
                    })
                    let put_time = Date.now() - begin - create_time;
                    assert.ok(!result.err)
                    assert.ok(!result.err)
                    let object_id = save_object.calculate_id().to_base_58()
                    console.info(`task ${i} put object success ${object_id} ,create_time = ${create_time} put_time = ${put_time}`)
                    let object_path =  `${env_path}/${object_id}`;
                    let insert_root =await op_env.insert_with_key(object_path,
                        object_id,
                        save_object.calculate_id(),)
                    assert.ok(!insert_root.err);
                    object_list.push({
                        object_path,
                        key : object_id,
                        object_id,
                        id,
                        request_json,
                        create_time,
                        put_time
                    })
                }
                let commit =await op_env.commit();
                fs.writeFileSync(path.join(save_path,`local_cache_isolate_${json_name}_${i}.json`),JSON.stringify({
                    nameobject:object_list,
                    env_path,
                    dec_root : commit.unwrap().dec_root
                }))
                resolve("")
            }))  
        }
        for(let run of running){
            await run
        }
    })
    it("Create random local_cache ObjectMapOpEnvType.Single data",async()=>{
        //let stack = stack_manager.get_cyfs_satck(test_device).stack!;
        let running = []
        for (let i = 0; i < ket_data_thread; i++) {
            running.push(new Promise(async(resolve)=>{
                let env_path =`/backup/${RandomGenerator.string(20)}`;    
                
                 
                let create_result = await stack.local_cache_stub().create_single_op_env_with_access({
                    access :cyfs.AccessPermissions.Full,
                    path : env_path
                });
                let op_env =  create_result.unwrap();
                let create_info =await op_env.create_new(cyfs.ObjectMapSimpleContentType.Map)
                assert.ok(!create_info.err);


                let object_list = [];
                for (let j = 0; j < ket_data_number; j++) {
                    let id = `message-${RandomGenerator.string(20)}-${Date.now()}`;
                    let request_json = JSON.stringify({
                        message: RandomGenerator.string(20)
                    });
                    let begin = Date.now();
                    let save_object = HandlerRequestObject.create(stack.local_device_id().object_id, HandlerType.PutObject, id,request_json, new Uint8Array(0));
                    let create_time = Date.now() - begin;
                    let result = await stack.non_service().put_object({
                        common: {
                            flags: 1,
                            level: cyfs.NONAPILevel.NOC
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(save_object.to_vec().unwrap()).unwrap(),
                    })
                    let put_time = Date.now() - begin - create_time;
                    assert.ok(!result.err)
                    let object_id = save_object.calculate_id().to_base_58()
                    console.info(`task ${i} put object success ${object_id} ,create_time = ${create_time} put_time = ${put_time}`)
                    let object_path =  `${env_path}/${object_id}`;
                    let insert_root =await op_env.insert_with_key(
                        object_id,
                        save_object.calculate_id(),
                    )
                    assert.ok(!insert_root.err);
                    object_list.push({
                        object_path,
                        key : object_id,
                        object_id,
                        id,
                        request_json,
                        create_time,
                        put_time
                    })
                }
                let commit =await op_env.commit();
                fs.writeFileSync(path.join(save_path,`local_cache_single_${json_name}_${i}.json`),JSON.stringify({
                    nameobject:object_list,
                    env_path,
                    dec_root : commit.unwrap().dec_root
                }))
                resolve("")
            }))  
        }
        for(let run of running){
            await run
        }
    })
    it("Create random NDC chunk_cahce data",async()=>{
        //let stack = stack_manager.get_cyfs_satck(test_device).stack!;
        let running = []
        for (let i = 0; i < chunk_thread; i++) {
            running.push(new Promise(async(resolve)=>{
                let object_list = [];
                for (let j = 0; j < chunk_number; j++) {
                    let begin = Date.now();
                    let tool =  new LocalUtilTool("E:\\local_data")
                    //let tool = test_runner.stack_manager.driver!.get_client("zone3_ood").client!.get_util_tool();
                    let random_chunk =await tool.rand_cyfs_chunk_cache(10*1024*1024);
                    console.info(`random chunk success ${random_chunk.chunk_id}`)
                    assert.ok(!random_chunk.err);
                    let create_time = Date.now() - begin;
                    let result = await stack.ndn_service().put_data({
                        common : {
                            flags : 1,
                            level : cyfs.NDNAPILevel.NDC,
                        },
                        object_id: random_chunk.chunk_id.calculate_id(),
                        length: 10*1024*1024,
                        data: random_chunk.chunk_data,
                    })
                    console.info(result)
                    let put_time = Date.now() - begin - create_time;
                    assert.ok(!result.err)
                    let object_id = random_chunk.chunk_id.calculate_id().to_base_58()
                    console.info(`task ${i} put chunk success ${object_id} ,create_time = ${create_time} put_time = ${put_time}`)
                    object_list.push({
                        object_id,
                        size : 10*1024*1024,
                        create_time,
                        put_time
                    })
                }
                fs.writeFileSync(path.join(save_path,`chunk_${json_name}_${i}.json`),JSON.stringify({nameobject:object_list}))
                resolve("")
            })) 
        }
        for(let run of running){
            await run
        }
    })
    it("Create random trans tracker file data",async()=>{
        //let stack = stack_manager.get_cyfs_satck(test_device).stack!;
        let running = []
        for (let i = 0; i < file_thread; i++) {
            running.push(new Promise(async(resolve)=>{
                let object_list = [];
                for (let j = 0; j < file_number; j++) {
                    let begin = Date.now();
                    //let tool =  new LocalUtilTool("E:\\local_data") //stack_manager.driver!.get_client(test_device.peer_name).client!.get_util_tool();
                    let tool = test_runner.stack_manager.driver!.get_client("zone3_ood").client!.get_util_tool();
                    let random_file =await tool.create_file(10*1024*1024);
                    console.info(`random file success ${random_file.file_name}`)
                    assert.ok(!random_file.err);
                    let create_time = Date.now() - begin;
                    let result = await stack.trans().publish_file({
                        common : {
                            flags : 1,
                            level : cyfs.NDNAPILevel.NDC,
                        },
                        owner: stack.local_device_id().object_id,
                        local_path: random_file.file_path!,
                        chunk_size: 4*1024*1024,
                    })
                    console.info(result)
                    let put_time = Date.now() - begin - create_time;
                    assert.ok(!result.err)
                    let object_id = result.unwrap().file_id
                    console.info(`task ${i} publish file success ${object_id} ,create_time = ${create_time} put_time = ${put_time}`)
                    object_list.push({
                        object_id,
                        file_name : random_file.file_name,
                        size : 10*1024*1024,
                        create_time,
                        put_time
                    })
                }
                fs.writeFileSync(path.join(save_path,`file_${json_name}_${i}.json`),JSON.stringify({nameobject:object_list}))
                resolve("")
            })) 
        }
        for(let run of running){
            await run
        }
    })
})


const remote_restore_ood_host = "http://192.168.100.205:1320";

describe("Restore ood data by ood-daemon",()=>{

    describe("Create restore task 001",()=>{
        test("Use must params create restore task",async()=>{
            let response : Response = await fetch("http://192.168.100.205:1320/restore", {
                method: "POST",
                body: JSON.stringify({
                    id : "001",
                    remote_archive : "http://192.168.200.151/001/data.zip"
                }),
                headers: {'Content-Type': 'application/json'},
            });
            const resp_json = await response.text();
            console.info(`Create restore task : ${JSON.stringify(resp_json)}`);
            assert.equal(response.status,200,`${resp_json}`);
            
        })
        test("Get restore task status check task finished",async()=>{
            let finished = false;
            while(!finished){
                let response : Response = await fetch("http://192.168.100.205:1320/restore/001", {
                    method: "GET",
                    headers: {'Content-Type': 'application/json'},
                });
                const resp_json = await response.json();
                console.info(`Get restore task status: ${JSON.stringify(resp_json)}`);
                await cyfs.sleep(2000);
                if(resp_json.phase == "Complete"){
                    break;
                }
            }

        })
        test("Cancel restore task 001",async()=>{
            let response : Response = await fetch("http://192.168.100.205:1320/restore/001", {
                method: "DELETE",
                headers: {'Content-Type': 'application/json'},
            });
           
            const resp_json = await response.json();
            console.info(`Cancel restore task : ${JSON.stringify(resp_json)}`);
            assert.equal(response.status,200,`${JSON.stringify(resp_json)}`);
        })

    })
    describe("Create restore task 002",()=>{
        test("Use all params create restore task",async()=>{
            let response : Response = await fetch("http://192.168.100.205:1320/restore", {
                method: "POST",
                body: JSON.stringify({
                    id : "002",
                    remote_archive : "http://192.168.200.151/002/${filename}",
                    cyfs_root : "/cyfs",
                    password : "token-dhjfkfsfsaf"
                }),
                headers: {'Content-Type': 'application/json'},
            });
           
            const resp_json = await response.text();
            console.info(`Create restore task : ${JSON.stringify(resp_json)}`);
            assert.equal(response.status,200,`${resp_json}`);
            
        })
        test("Get restore task status check task finished",async()=>{
            let finished = false;
            while(!finished){
                let response : Response = await fetch("http://192.168.100.205:1320/restore/002/", {
                    method: "GET",
                    headers: {'Content-Type': 'application/json'},
                });
                const resp_json = await response.json();
                console.info(`Get restore task status: ${JSON.stringify(resp_json)}`);
                await cyfs.sleep(2000);
                if(resp_json.phase == "Complete"){
                    break;
                }
            }

        })
        test("Cancel restore task 002",async()=>{
            let response : Response = await fetch("http://192.168.100.205:1320/restore/002", {
                method: "DELETE",
                headers: {'Content-Type': 'application/json'},
            });
           
            const resp_json = await response.json();
            console.info(`Cancel restore task : ${JSON.stringify(resp_json)}`);
            assert.equal(response.status,200,`${JSON.stringify(resp_json)}`);
        })

    })
    describe("Cancel restore task",()=>{
        test("Cancel restore task 001",async()=>{
            let response : Response = await fetch("http://192.168.100.205:1320/restore/001", {
                method: "DELETE",
                headers: {'Content-Type': 'application/json'},
            });
           
            const resp_json = await response.json();
            console.info(`Cancel restore task : ${JSON.stringify(resp_json)}`);
            assert.equal(response.status,200,`${JSON.stringify(resp_json)}`);
        })
        test("Cancel restore task 002",async()=>{
            let response : Response = await fetch("http://192.168.100.205:1320/restore/002", {
                method: "DELETE",
                headers: {'Content-Type': 'application/json'},
            });
           
            const resp_json = await response.json();
            console.info(`Cancel restore task : ${JSON.stringify(resp_json)}`);
            assert.equal(response.status,200,`${JSON.stringify(resp_json)}`);
        })
    })
    describe("Query current restore task",()=>{
        test("Query the current restore task",async()=>{
            let response : Response = await fetch("http://192.168.100.205:1320/restore/tasks", {
                method: "GET",
                headers: {'Content-Type': 'application/json'},
            });
            const resp_json = await response.text();
            console.info(`Get restore task status: ${JSON.stringify(resp_json)}`);
            assert.equal(response.status,200,`${JSON.stringify(resp_json)}`);
        })
    })
})