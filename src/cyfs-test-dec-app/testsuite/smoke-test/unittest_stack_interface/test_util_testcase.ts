import assert = require('assert');
import * as cyfs from '../../../cyfs'

import {StackManager,CyfsDriverType} from "../../../cyfs-driver-client"
const dec_app_1 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device1decapp")
const dec_app_2 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device2decapp")

// npx mocha .\test*.ts --reporter mochawesome --require ts-node/register
describe("SharedCyfsStack util相关接口测试", function () {
    this.timeout(0);
    const stack_manager = new StackManager();
    this.beforeAll(async function () {
        //测试前置条件，连接测试模拟器设备
        console.info(`##########用例执开始执行`);
        await stack_manager.init();
        // 所有节点 实例化一个 Http Requestor dec_app_1 协议栈
        await stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.Http,dec_app_1);
        // 所有节点 实例化一个 WebSocket Requestor dec_app_2 协议栈
        await stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.WebSocket,dec_app_2);
        
    })
    this.afterAll(async () => {
        // 停止测试模拟器
        await stack_manager.driver!.stop();
    })
    describe("测试模拟器+真机集成",async()=>{
        it("测试模拟器+真机集成",async()=>{
            //遍历获取所有协议栈
            for(let peer of stack_manager.peer_map.values()){
                for(let stack of peer.values()){
                    let run =await stack.util().get_device({ common: { req_path: undefined, dec_id: undefined, target: undefined, flags: 0 } })
                    assert(!run.err, `调用接口失败:${run}`)
                    console.info(`${JSON.stringify(run.unwrap())}`)
                }
            }
            // 指定获取
            let stack1 = stack_manager.get_cyfs_satck("zone1_ood",dec_app_1.to_base_58(),cyfs.CyfsStackRequestorType.Http).stack!;
            let stack2 = stack_manager.get_cyfs_satck("zone1_device1",dec_app_2.to_base_58(),cyfs.CyfsStackRequestorType.WebSocket).stack!;
            let run =await stack1.util().get_device({ common: { req_path: undefined, dec_id: undefined, target: undefined, flags: 0 } })
            assert(!run.err, `调用接口失败:${run}`)
            console.info(`${JSON.stringify(run.unwrap())}`)
            run =await stack2.util().get_device({ common: { req_path: undefined, dec_id: undefined, target: undefined, flags: 0 } })
            assert(!run.err, `调用接口失败:${run}`)
            console.info(`${JSON.stringify(run.unwrap())}`)
        })
    })
})

