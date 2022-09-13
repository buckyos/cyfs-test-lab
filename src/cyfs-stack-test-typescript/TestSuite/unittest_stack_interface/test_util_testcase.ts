import assert = require('assert'); 
import * as cyfs from "../../cyfs_node/cyfs_node"
import {ZoneSimulator} from "../../common/utils";
import * as mocha from "mocha"



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
        stack_runtime = ZoneSimulator.zone1_device1_stack!;
        stack_ood = ZoneSimulator.zone1_ood_stack!;
        
    })
    this.afterAll(async ()=>{
        //每个函数执行前，清除所有handler
        console.info(`#########用例执行完成`);
        ZoneSimulator.stopZoneSimulator();
        //console.info(JSON.stringify(this.suites))
        //console.info(this.tests)
        
        //process.exit(0);
 
    })
    
    describe("unit接口白盒测试",async()=>{
        describe("unit 接口 get_device",async()=>{
            it.only("runtime接口正常调用",async()=>{
                let run =  await stack_runtime.util().get_device({common: {flags: 0}})
                assert(!run.err,`调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("ood接口正常调用",async()=>{
                let run =  await stack_ood.util().get_device({common: {flags: 0}})
                assert(!run.err,`调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
        }) 
        describe("unit 接口 get_zone",async()=>{
            it("runtime接口正常调用",async()=>{
                let run =  await stack_runtime.util().get_zone({common: {flags: 0}})
                assert(!run.err,`调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("ood接口正常调用",async()=>{
                let run =  await stack_ood.util().get_zone({common: {flags: 0}})
                assert(!run.err,`调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
        })  
        describe("unit 接口 resolve_ood",async()=>{
            it("runtime接口正常调用",async()=>{
                let run =  await stack_runtime.util().resolve_ood({ object_id : stack_ood.local_device_id().object_id , common: {flags: 0}})
                assert(!run.err,`调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("ood接口正常调用",async()=>{
                let run =  await stack_ood.util().resolve_ood({ object_id : stack_ood.local_device_id().object_id , common: {flags: 0}})
                assert(!run.err,`调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
        }) 
        describe("unit 接口 get_ood_status",async()=>{
            it("runtime接口正常调用",async()=>{
                let run =  await stack_runtime.util().get_ood_status({common: {flags: 0}})
                assert(!run.err,`调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
        })  
        describe("unit 接口 get_noc_info",async()=>{
            it("runtime接口正常调用",async()=>{
                let run =  await stack_runtime.util().get_noc_info({common: {flags: 0}})
                assert(!run.err,`调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("ood接口正常调用",async()=>{
                let run =  await stack_ood.util().get_noc_info({common: {flags: 0}})
                assert(!run.err,`调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
        }) 
        describe("unit 接口 get_network_access_info",async()=>{
            it("runtime接口正常调用",async()=>{
                let run =  await stack_runtime.util().get_network_access_info({common: {flags: 0}})
                assert(!run.err,`调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("ood接口正常调用",async()=>{
                let run =  await stack_ood.util().get_network_access_info({common: {flags: 0}})
                assert(!run.err,`调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
        }) 
        describe("unit 接口 get_device_static_info",async()=>{
            it("runtime接口正常调用",async()=>{
                let run =  await stack_runtime.util().get_device_static_info({common: {flags: 0}})
                assert(!run.err,`调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("ood接口正常调用",async()=>{
                let run =  await stack_ood.util().get_device_static_info({common: {flags: 0}})
                assert(!run.err,`调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
        })  
        describe("unit 接口 get_system_info",async()=>{
            it("runtime接口正常调用",async()=>{
                let run =  await stack_runtime.util().get_system_info({common: {flags: 0}})
                assert(!run.err,`调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("ood接口正常调用",async()=>{
                let run =  await stack_ood.util().get_system_info({common: {flags: 0}})
                assert(!run.err,`调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
        })   
        describe("unit 接口 get_version_info",async()=>{
            it("runtime接口正常调用",async()=>{
                let run =  await stack_runtime.util().get_version_info({common: {flags: 0}})
                assert(!run.err,`调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("ood接口正常调用",async()=>{
                let run =  await stack_ood.util().get_version_info({common: {flags: 0}})
                assert(!run.err,`调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
        }) 
        describe("unit 接口 build_dir_from_object_map",async()=>{
           
        })           
    })
        
        
    
})

