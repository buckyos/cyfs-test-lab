import * as cyfs from '../cyfs_node/cyfs_node';
import * as proxy_stack from "../common/utils/stack"
import * as myHandler from "./handler"
import {RandomGenerator} from "../common";
import path from "path";
import assert from "assert";
async function createTestObject(stack:cyfs.SharedCyfsStack,peerId:string) {
    const saveobjectOwner = cyfs.ObjectId.from_base_58(peerId).unwrap()
    const saveobject = cyfs.TextObject.create(cyfs.Some(saveobjectOwner), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
    const saveObjectId = saveobject.desc().calculate_id();
    console.info(`will put_object: id=${saveObjectId},object value = ${saveobject.value} `);
    const object_raw = saveobject.to_vec().unwrap();
    const req: cyfs.NONPutObjectOutputRequest = {
        common: {
            dec_id:saveobjectOwner,
            flags: 0,
            //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
            level: cyfs.NONAPILevel.NOC //设置路由类型
        },
        object: new cyfs.NONObjectInfo(saveObjectId, object_raw)
    };
    const put_ret = await stack.non_service().put_object(req);
    //校验结果
    console.info('put_object result:', put_ret);
    assert(!put_ret.err);
    return {saveobject,saveObjectId,saveobjectOwner,object_raw}  
}

async function main() {
    cyfs.clog.enable_file_log({
        name: "unittest_stack_interface",
        dir: cyfs.get_app_log_dir("unittest_stack_interface"),
        file_max_size: 1024 * 1024 * 10,
        file_max_count: 10,
    });
    let stack = cyfs.SharedCyfsStack.open(cyfs.SharedCyfsStackParam.new_with_ws_event_ports(20002,20001).unwrap())
    //let stack = cyfs.SharedCyfsStack.open(cyfs.SharedCyfsStackParam.new_with_ws_event_ports(19999,20000).unwrap())
    let resp = await stack.wait_online(cyfs.Some(cyfs.JSBI.BigInt(10000000)));
    console.info(JSON.stringify(resp.unwrap()));
    await cyfs.sleep(5000)
    let res = await stack.util().get_zone({common: {flags: 0}});
    console.info(JSON.stringify(res.unwrap()))
    await cyfs.sleep(1000)
    const handlerManager = new myHandler.handlerManager(); //用来回收handler 和监听校验handler触发
    const obj = cyfs.TextObject.create(cyfs.None, 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
    const object_id = obj.desc().calculate_id();
    console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
    const object_raw = obj.to_vec().unwrap();
    const req2: cyfs.NONPutObjectOutputRequest = {
        common: {
            req_path: "/qa/put_object",
            flags: 0,
            target: stack.local_device_id().object_id,
            level: cyfs.NONAPILevel.Router //设置路由类型
        },
        object: new cyfs.NONObjectInfo(object_id, object_raw)
    };
    const put_ret2 = await stack.non_service().put_object(req2);
    await cyfs.sleep(1000)
    let fileName = RandomGenerator.string(10);
    let filePath = path.join(__dirname,"./test_cache_file/source")
    let file = RandomGenerator.createRandomFile(filePath,fileName,100*1024*1024);
    let add_file = await stack.trans().publish_file({
        common :{// 请求路径，可为空
            req_path : "qaTest",
            // 来源DEC
            // api级别
            dec_id : cyfs.ObjectId.from_base_58("5aSixgMDm3E5EELo5CzZ874jizVUm9SPjr1wczSwYBF8").unwrap(),
            level: cyfs.NDNAPILevel.NDC,
            // targrt设备参数
            // 需要处理数据的关联对象，主要用以chunk/file等
            referer_object: [],
            flags: 1,},
        owner: cyfs.ObjectId.from_base_58("5aSixgMDm3E5EELo5CzZ874jizVUm9SPjr1wczSwYBF8").unwrap(),
        local_path: "C:\\node_tester_app\\node_tester_app\\service\\cyfs-bdt\\bdt-tools",
        chunk_size: 4*1024*1024
    });
    console.info(JSON.stringify(add_file));
    assert.ok(!add_file.err,"publish_file 失败");
    let test_file = add_file.unwrap().file_id
    let task_id : string;
    await cyfs.sleep(1000)
    fileName = "desc-tool";
    filePath = path.join(__dirname,"./test_cache_file/target")
    const req1: cyfs.NONGetObjectOutputRequest = {
        object_id:test_file,
        common: {
            req_path: "qaTest",
            level: cyfs.NONAPILevel.NON,
            target : stack.local_device_id().object_id,
            dec_id : cyfs.ObjectId.from_base_58("5aSixgMDm3E5EELo5CzZ874jizVUm9SPjr1wczSwYBF8").unwrap(),
            flags: 0,
        }
    };
    const get_ret = await stack.non_service().get_object(req1);
    await cyfs.sleep(1000)
    console.info("获取task object");
    console.info(JSON.stringify(get_ret));
    assert.ok(!get_ret.err,"create_task get object 失败");

    let task = await stack.trans().create_task( {
        common:  {
            req_path: "qaTest",
            dec_id : cyfs.ObjectId.from_base_58("5aSixgMDm3E5EELo5CzZ874jizVUm9SPjr1wczSwYBF8").unwrap(),
            level: cyfs.NDNAPILevel.NDC,
            target : stack.local_device_id().object_id,
            referer_object: [],
            flags: 1,
        },
        object_id: test_file,
        local_path: path.join(filePath,fileName),
        device_list: [stack.local_device_id()],
        auto_start: true,
    })
    console.info(JSON.stringify(task.unwrap()));
    assert.ok(!task.err,"create_task 失败");
    task_id = task.unwrap().task_id
    await cyfs.sleep(1000)
    let task1 = await stack.trans().start_task( {
        common:  {
            req_path: "qaTest",
            dec_id : cyfs.ObjectId.from_base_58("5aSixgMDm3E5EELo5CzZ874jizVUm9SPjr1wczSwYBF8").unwrap(),
            level: cyfs.NDNAPILevel.NDN,
            target : stack.local_device_id().object_id,
            referer_object: [],
            flags: 1,
        },
        task_id : task_id
    })
    console.info(JSON.stringify(task1.unwrap()));
    assert.ok(!task.err,"start_task 失败");
    for(let i =0;i<10;i++){
        let task = await stack.trans().get_task_state( {
            common:  {
                req_path: "qaTest",
                dec_id : cyfs.ObjectId.from_base_58("5aSixgMDm3E5EELo5CzZ874jizVUm9SPjr1wczSwYBF8").unwrap(),
                level: cyfs.NDNAPILevel.Router,
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

    {
        const ret01 = await handlerManager.addHandler(
            `${stack.local_device_id().to_base_58()}`,
            stack,
            cyfs.RouterHandlerCategory.PutObject,
            cyfs.RouterHandlerChain.PreNOC,
            "put-object-handler-001" ,
            -1,
            `dec_id == 5aSixgMDm3E5EELo5CzZ874jizVUm9SPjr1wczSwYBF8`,
            cyfs.RouterHandlerAction.Default,
            myHandler.PutObjectHandlerDefault,
            "PutObjectHandlerDefault",
            10,
        )
        
        let check =  handlerManager.startHandlerCheck(100*1000);
        await cyfs.sleep(5000)
        for(let i=0;i<10;i++){
            const obj = cyfs.TextObject.create(cyfs.None, 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
            const object_raw = obj.to_vec().unwrap();
            const req2: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: "/qa/put_object",
                    flags: 0,
                    dec_id : cyfs.ObjectId.from_base_58("5aSixgMDm3E5EELo5CzZ874jizVUm9SPjr1wczSwYBF8").unwrap(),
                    target: stack.local_device_id().object_id,
                    level: cyfs.NONAPILevel.NOC //设置路由类型
                },
                object: new cyfs.NONObjectInfo(object_id, object_raw)
            };
            const put_ret2 = await stack.non_service().put_object(req2);
            assert(!put_ret2.err,`put object failed,err : ${JSON.stringify(put_ret2)}`)
            }
            
            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`post_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)
            await cyfs.sleep(2000)
    }
    while(true){
        await cyfs.sleep(2000);
    }
}

main()