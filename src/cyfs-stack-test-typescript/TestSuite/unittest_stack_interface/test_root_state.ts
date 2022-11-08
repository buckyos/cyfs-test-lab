import assert = require('assert'); 
import {cyfs} from '../../cyfs_node'
import {ZoneSimulator,stringToUint8Array,RandomGenerator,stackInfo} from "../../common";
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

describe("SharedCyfsStack root_state 相关接口测试",function(){
    this.timeout(0);
    
    this.beforeAll(async function(){
        //测试前置条件，连接测试模拟器设备
        console.info(`##########用例执开始执行`);
        await ZoneSimulator.init();
        stack_runtime = ZoneSimulator.zone1_device1_stack!;
        stack_ood = ZoneSimulator.zone1_ood_stack!;
        
    })
    this.afterAll(async ()=>{
        //每个函数执行前，清除所有handler
        console.info(`#########用例执行完成`);
        await ZoneSimulator.stopZoneSimulator();
        //process.exit(0)
    })
    it("get_category ",async()=>{
        let state = await stack_runtime.root_state().get_category();
        console.info(JSON.stringify(state))
    })
    it("get_base_requestor ",async()=>{
        let state = await stack_runtime.root_state().get_base_requestor();
        console.info(JSON.stringify(state))
    })
    it("get_dec_id ",async()=>{
        let state = await stack_runtime.root_state().get_dec_id();
        console.info(JSON.stringify(state))
    })
    it("get_current_root ",async()=>{
        let state = await stack_runtime.root_state().get_current_root({common: {
            dec_id: ZoneSimulator.APPID,
            target: stack_ood.local_device_id().object_id,
            flags: 1,
        },
        root_type: cyfs.RootStateRootType.Global});
        console.info(JSON.stringify(state))
    })

    describe("root_state ",async()=>{
        let op_env : cyfs.OpEnvRequestor
        let sid: cyfs.JSBI
        it("create_op_env ",async()=>{
            let state = await stack_runtime.root_state().create_op_env({
                common: {
                    dec_id: ZoneSimulator.APPID,
                    target: stack_ood.local_device_id().object_id,
                 flags: 1,
                },
                op_env_type: cyfs.ObjectMapOpEnvType.Single
            });
            console.info(JSON.stringify(state))
            op_env = state.unwrap();
        })
        it("get_sid ",async()=>{
            let result =  op_env.get_sid();
            console.info(JSON.stringify(result));
            sid = result
        })
        it("get_category ",async()=>{
            let result =  op_env.get_category();
            console.info(JSON.stringify(result));
        })
        it("load ",async()=>{
            let result = await op_env.load( {
                common: {
                    dec_id: ZoneSimulator.APPID,
                    flags: 1,
                    target : stack_ood.local_device_id().object_id,
                    sid: sid,
                },
                target: stack_ood.local_device_id().object_id,
            });
            console.info(JSON.stringify(result));
        })
        it("load_by_path ",async()=>{
            let result = await op_env.load_by_path( {
                common: {
                    dec_id: ZoneSimulator.APPID,
                    flags: 1,
                    target : stack_ood.local_device_id().object_id,
                    sid: sid,
                },
                path: "root-state/op-env",
            });
            console.info(JSON.stringify(result));
        })
        it("create_new ",async()=>{
            let result =await  op_env.create_new( {
                common: {
                    dec_id: ZoneSimulator.APPID,
                    flags: 1,
                    target : stack_ood.local_device_id().object_id,
                    sid: sid,
                },
                content_type: cyfs.ObjectMapSimpleContentType.Set
            });
            console.info(JSON.stringify(result));
        })
        it("insert ",async()=>{
            let result =await  op_env.insert( {
                common: {
                    dec_id: ZoneSimulator.APPID,
                    flags: 1,
                    target : stack_ood.local_device_id().object_id,
                    sid: sid,
                },
                path: "/qaTest/a",
                value: cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()
            });
            console.info(JSON.stringify(result));
        })
        it("contains ",async()=>{
            let result = await op_env.contains( {
                common: {
                    dec_id: ZoneSimulator.APPID,
                    flags: 1,
                    target : stack_ood.local_device_id().object_id,
                    sid: sid,
                },
                path: "/qaTest/a",
                value: cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()
            });
            console.info(JSON.stringify(result));
        })
        it("metadata ",async()=>{
            let result =  await op_env.metadata( {
                common: {
                    dec_id: ZoneSimulator.APPID,
                    flags: 1,
                    target : stack_ood.local_device_id().object_id,
                    sid: sid,
                },
                path: "qaTest",
            });
            console.info(JSON.stringify(result));
        })
    })
    
})