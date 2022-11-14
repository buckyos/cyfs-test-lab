//import assert  from 'assert'; 
import * as assert from "assert";
import * as cyfs from '../../cyfs_node';
import {ZoneSimulator,stringToUint8Array,RandomGenerator,stackInfo,AclManager, stack} from "../../common";
import * as path from 'path';
//初始化日志
cyfs.clog.enable_file_log({
    name: "unittest_stack_interface",
    dir: cyfs.get_app_log_dir("unittest_stack_interface"),
    file_max_size: 1024 * 1024 *10,
    file_max_count: 10,
});

let stack_runtime:cyfs.SharedCyfsStack;
let stack_ood:cyfs.SharedCyfsStack;

describe("SharedCyfsStack util相关接口测试",function(){
    this.timeout(0);
    
    this.beforeAll(async function(){
        //测试前置条件，连接测试模拟器设备
        console.info(`##########用例执开始执行`);
        await ZoneSimulator.init();
        //await cyfs.sleep(5000)
        stack_runtime = ZoneSimulator.zone1_device1_stack!;
        stack_ood = ZoneSimulator.zone1_ood_stack!;
        
    })
    this.afterAll(async ()=>{
        //每个函数执行前，清除所有handler
        console.info(`#########用例执行完成`);
        ZoneSimulator.stopZoneSimulator();
 
    })
    let test_file : cyfs.ObjectId;
    it("publish_file 接口调用",async()=>{
        let fileName = RandomGenerator.string(10);
        let filePath = path.join(__dirname,"../../test_cache_file/source")
        let file = RandomGenerator.createRandomFile(filePath,fileName,100*1024*1024);
        let add_file = await stack_runtime.trans().publish_file({
            common :{// 请求路径，可为空
                req_path : "qaTest",
                // 来源DEC
                dec_id: ZoneSimulator.APPID,
                // api级别
                level: cyfs.NDNAPILevel.NDN,
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
        test_file = add_file.unwrap().file_id
    })
    let task_id : string;
    it("create_task 接口调用",async()=>{
        let fileName = RandomGenerator.string(10);
        let filePath = path.join(__dirname,"../../test_cache_file/target")
        const req1: cyfs.NONGetObjectOutputRequest = {
            object_id:test_file,
            common: {
                req_path: "qaTest",
                level: cyfs.NONAPILevel.NON,
                target : stack_runtime.local_device_id().object_id,
                dec_id:stackInfo.appID,
                flags: 0,
            }
        };
        const get_ret = await stack_runtime.non_service().get_object(req1);
        console.info("获取task object");
        console.info(JSON.stringify(get_ret));
        assert.ok(!get_ret.err,"create_task get object 失败");

        let task = await stack_runtime.trans().create_task( {
            common:  {
                req_path: "qaTest",
                dec_id: ZoneSimulator.APPID,
                level: cyfs.NDNAPILevel.NDN,
                target : stack_runtime.local_device_id().object_id,
                referer_object: [],
                flags: 1,
            },
            object_id: test_file,
            local_path: path.join(filePath,fileName),
            device_list: [stack_ood.local_device_id()],
            auto_start: true,
        })
        console.info(JSON.stringify(task));
        assert.ok(!task.err,"create_task 失败");
        task_id = task.unwrap().task_id
    })
    it("stop_task 接口调用",async()=>{
        let task = await stack_runtime.trans().stop_task( {
            common:  {
                req_path: "qaTest",
                dec_id: ZoneSimulator.APPID,
                level: cyfs.NDNAPILevel.NDN,
                target : stack_runtime.local_device_id().object_id,
                referer_object: [],
                flags: 1,
            },
            task_id : task_id
        })
        console.info(JSON.stringify(task));
        assert.ok(!task.err,"stop_task 失败");
    })
    it("start_task 接口调用",async()=>{
        let task = await stack_runtime.trans().start_task( {
            common:  {
                req_path: "qaTest",
                dec_id: ZoneSimulator.APPID,
                level: cyfs.NDNAPILevel.NDN,
                target : stack_runtime.local_device_id().object_id,
                referer_object: [],
                flags: 1,
            },
            task_id : task_id
        })
        console.info(JSON.stringify(task));
        assert.ok(!task.err,"start_task 失败");
    })
    it("control_task 接口调用",async()=>{
        let task = await stack_runtime.trans().control_task( {
            common:  {
                req_path: "qaTest",
                dec_id: ZoneSimulator.APPID,
                level: cyfs.NDNAPILevel.NDN,
                target : stack_runtime.local_device_id().object_id,
                referer_object: [],
                flags: 1,
            },
            task_id : task_id,
            action: cyfs.TransTaskControlAction.Stop
        })
        console.info(JSON.stringify(task));
        assert.ok(!task.err,"control_task 失败");
    })
    it("control_task 接口调用",async()=>{
        let task = await stack_runtime.trans().control_task( {
            common:  {
                req_path: "qaTest",
                dec_id: ZoneSimulator.APPID,
                level: cyfs.NDNAPILevel.NDN,
                target : stack_runtime.local_device_id().object_id,
                referer_object: [],
                flags: 1,
            },
            task_id : task_id,
            action: cyfs.TransTaskControlAction.Start
        })
        console.info(JSON.stringify(task));
        assert.ok(!task.err,"control_task 失败");
    })
    it("get_task_state 接口调用",async()=>{
        let task = await stack_runtime.trans().get_task_state( {
            common:  {
                req_path: "qaTest",
                dec_id: ZoneSimulator.APPID,
                level: cyfs.NDNAPILevel.NDN,
                target : stack_runtime.local_device_id().object_id,
                referer_object: [],
                flags: 1,
            },
            task_id : task_id
        })
        console.info(JSON.stringify(task));
        assert.ok(!task.err,"control_task 失败");
    })
    it("query_tasks 接口调用",async()=>{
        let task = await stack_runtime.trans().query_tasks( {
            common:  {
                req_path: "qaTest",
                dec_id: ZoneSimulator.APPID,
                level: cyfs.NDNAPILevel.NDN,
                target : stack_runtime.local_device_id().object_id,
                referer_object: [],
                flags: 1,
            }
        })
        console.info(JSON.stringify(task));
        assert.ok(!task.err,"control_task 失败");
    })
    it("delete_task 接口调用",async()=>{
        let task = await stack_runtime.trans().delete_task( { 
            
            common:  {
                req_path: "qaTest",
                dec_id: ZoneSimulator.APPID,
                level: cyfs.NDNAPILevel.NDN,
                target : stack_runtime.local_device_id().object_id,
                referer_object: [],
                flags: 1,
            },
            task_id : task_id,
        })
        console.info(JSON.stringify(task));
        assert.ok(!task.err,"control_task 失败");
    })
    describe("下载进度测试",async()=>{
        let stack_ood2 : cyfs.SharedCyfsStack
        before(async()=>{
            let acl = new AclManager();
            await acl.init();
            await acl.zone1_device1_acl!.initAclToml(path.join(__dirname,"acl","acceptAll.toml"));
            await acl.zone1_ood_acl!.initAclToml(path.join(__dirname,"acl","acceptAll.toml"));
            await acl.zone2_device1_acl!.initAclToml(path.join(__dirname,"acl","acceptAll.toml"));
            await acl.zone2_ood_acl!.initAclToml(path.join(__dirname,"acl","acceptAll.toml"));
            await ZoneSimulator.stopZoneSimulator();
            await cyfs.sleep(5000)
            await ZoneSimulator.init();
            stack_runtime = ZoneSimulator.zone1_device1_stack!;
            stack_ood = ZoneSimulator.zone1_ood_stack!;
            stack_ood2 = ZoneSimulator.zone1_device2_stack!;
        })
        it("下载进度测试",async()=>{
            let fileName = RandomGenerator.string(10);
            let filePath = path.join(__dirname,"../../test_cache_file/source")
            let file = RandomGenerator.createRandomFile(filePath,fileName,10);
            let add_file = await stack_runtime.trans().publish_file({
                common :{// 请求路径，可为空
                    req_path : "qaTest",
                    // 来源DEC
                    dec_id: ZoneSimulator.APPID,
                    // api级别
                    level: cyfs.NDNAPILevel.NDN,
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
            test_file = add_file.unwrap().file_id;
            // let task = await stack_runtime.trans().create_task( {
            //     common:  {
            //         req_path: "qaTest",
            //         dec_id: ZoneSimulator.APPID,
            //         level: cyfs.NDNAPILevel.NDN,
            //         target : stack_runtime.local_device_id().object_id,
            //         referer_object: [],
            //         flags: 1,
            //     },
            //     object_id: test_file,
            //     local_path: path.join(filePath,fileName),
            //     device_list: [stack_ood.local_device_id()],
            //     auto_start: true,
            // })
            // console.info(JSON.stringify(task));
            // assert.ok(!task.err,"create_task 失败");
            // task_id = task.unwrap().task_id
            // for(let i =0;i<10;i++){
            //     let task = await stack_runtime.trans().get_task_state( {
            //         common:  {
            //             req_path: "qaTest",
            //             dec_id: ZoneSimulator.APPID,
            //             level: cyfs.NDNAPILevel.NDN,
            //             target : stack_runtime.local_device_id().object_id,
            //             referer_object: [],
            //             flags: 1,
            //         },
            //         task_id : task_id
            //     })
            //     console.info(JSON.stringify(task));
            //     let state = task.unwrap().state;
            //     if(state==4){
            //         break;
            //     }
            //     assert.ok(!task.err,"control_task 失败");
            //     await cyfs.sleep(1000)
            // }
            const req1: cyfs.NONGetObjectOutputRequest = {
                object_id:test_file,
                common: {
                    req_path: "/qa/get_object",
                    level: cyfs.NONAPILevel.NOC,
                    dec_id:stackInfo.appID,
                    flags: 0,
                }
            };
            const get_ret = await stack_runtime.non_service().get_object(req1);
            let file_obj = get_ret.unwrap().object;
            let stream = await stack_runtime.non_service().put_object({
                common: {
                    dec_id:ZoneSimulator.APPID,
                    flags: 0,
                    target: stack_ood2.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router //设置路由类型
                },
                object: new cyfs.NONObjectInfo(test_file, file_obj.object_raw)
            })
            console.info(`${JSON.stringify(stream) }`)
            const req2: cyfs.NONGetObjectOutputRequest = {
                object_id:test_file,
                common: {
                    req_path: "/qa/get_object",
                    level: cyfs.NONAPILevel.Router,
                    target :stack_runtime.local_device_id().object_id,
                    dec_id:stackInfo.appID,
                    flags: 0,
                }
            };
            const get_ret2 = await stack_ood2.non_service().get_object(req1);
            let save_filePath = path.join(__dirname,"../../test_cache_file/target")
            console.info(`${JSON.stringify(get_ret2) }`)
            let download = await stack_ood2.trans().create_task( {
                common:  {
                    req_path: "qaTest",
                    dec_id: ZoneSimulator.APPID,
                    level: cyfs.NDNAPILevel.Router,
                    //target : stack_runtime.local_device_id().object_id,
                    referer_object: [new cyfs.NDNDataRefererObject(undefined,test_file)],
                    flags: 1,
                },
                object_id: test_file,
                local_path: path.join(save_filePath,fileName),
                device_list: [stack_runtime.local_device_id()],
                auto_start: true,
            })
            console.info(`##${download}`)
            
            let download_id  = download.unwrap().task_id
            for(let i =0;i<10;i++){
                let task = await stack_ood2.trans().get_task_state( {
                    common:  {
                        req_path: "qaTest",
                        dec_id: ZoneSimulator.APPID,
                        level: cyfs.NDNAPILevel.Router,
                        referer_object: [],
                        flags: 1,
                    },
                    task_id : download_id
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
    

})