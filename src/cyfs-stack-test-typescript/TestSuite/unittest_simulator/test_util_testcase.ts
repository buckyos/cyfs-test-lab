import assert = require('assert'); 
import {cyfs} from '../../cyfs_node'
import {ZoneSimulator} from "../../common/utils";




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
        
        
    })
    this.afterAll(async ()=>{
        //每个函数执行前，清除所有handler
        console.info(`#########用例执行完成`);
    })
    
    describe("unittest_simulator",async()=>{
        it("模拟器启动",async()=>{
            await ZoneSimulator.connecStimulator();
        })
    })
        
        
    
})

