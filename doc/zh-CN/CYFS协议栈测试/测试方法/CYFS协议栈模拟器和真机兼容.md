# CYFS Stack 真机和模拟器测试方法
## 使用方法

+ npx mocha .\test*.ts --reporter mochawesome --require ts-node/register
``` ts
// cyfs-test-lab\src\cyfs-test-dec-app\testsuite\smoke-test\unittest_stack_interface\test_util_testcase.ts
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
            let stack1 = stack_manager.get_cyfs_satck("zone1_ood",`${dec_app_1.to_base_58()}_${cyfs.CyfsStackRequestorType.Http}`).stack!;
            let stack2 = stack_manager.get_cyfs_satck("zone1_device1",`${dec_app_2.to_base_58()}_${cyfs.CyfsStackRequestorType.WebSocket}`).stack!;
            let run =await stack1.util().get_device({ common: { req_path: undefined, dec_id: undefined, target: undefined, flags: 0 } })
            assert(!run.err, `调用接口失败:${run}`)
            console.info(`${JSON.stringify(run.unwrap())}`)
            run =await stack2.util().get_device({ common: { req_path: undefined, dec_id: undefined, target: undefined, flags: 0 } })
            assert(!run.err, `调用接口失败:${run}`)
            console.info(`${JSON.stringify(run.unwrap())}`)
        })
    })
})

```
## 配置文件说明
``` ts
// cyfs-test-lab\src\cyfs-test-dec-app\config\cyfs_driver_config.ts
export type CyfsStackClientConfig = {
    peer_name: string, //节点名称
    zone_tag: string, // zone 标记
    stack_type: string, // 协议栈类型 runtime 、ood
    bdt_port: number, // bdt 端口，当前协议栈测试无用
    http_port: number, // http_port
    ws_port: number, // ws_port
}
export const DRIVER_TYPE = "real_machine"; // 当前默认使用的测试驱动类型
export const REAL_MACHINE_LIST: Array<CyfsStackClientConfig> //真机配置列表，支持横向拓展
export const SIMULATOR_LIST: Array<CyfsStackClientConfig>  //模拟器配置列表，支持横向拓展
```

## StackManager

### 方法
+ constructor(driver_type?: CyfsDriverType) 
  + 若设置driver_type 则使用设置当前测试驱动类型真机或模拟器
  + 若未设置若设置driver_type，则读取配置文件中 DRIVER_TYPE
  + 若全部未配置默认使用模拟器

+ async init() 
    + (1) 初始化cyfs log 
    + (2) 实例化当前选择的CyfsDriverType 对应的驱动，会启动模拟器或者启动真机代理连接真机协议栈

+ async load_config_stack(requestor_type: cyfs.CyfsStackRequestorType = cyfs.CyfsStackRequestorType.Http, dec_id?: cyfs.ObjectId)
    + 实例配置文件中所有设备的SharedCyfsStack，会将数据保存到peer_map中
    + requestor_type 可选择 Http WebSocket 
    + dec_id 协议栈的dec_id ， 默认为system
+ get_cyfs_satck(peer_name:string,dec_id:string=`system`,type: cyfs.CyfsStackRequestorType = cyfs.CyfsStackRequestorType.Http ): { err: ErrorCode, log: string,stack?:cyfs.SharedCyfsStack}
    + 获取对应device 的协议栈 peer_name：节点名称  、dec_id 、CyfsStackRequestorType
### 属性
+  public peer_map: Map<string, Map<string, cyfs.SharedCyfsStack>>;
    + 二维的Map ,cache 所有device实例化的协议栈 {`${peer_name}`:{`${dec_id}_${CyfsStackRequestorType}`:SharedCyfsStack}
+  public driver?: CyfsStackDriver;
    + 测试驱动，启动和关闭 真机代理或模拟器

## CyfsStackDriverManager

+ static createInstance(): CyfsStackDriverManager 
    + 实例化CyfsStackDriverManager，初始化测试驱动日志根目录

+ async create_driver(type: CyfsDriverType): Promise<{ err: ErrorCode, log: string, driver?: CyfsStackDriver }> 
    + 初始化测试驱动配置
    + 启动模拟器或真机代理
    + 加载配置文件中各测试节点客户端

## CyfsStackDriver

+ CyfsStackDriver
    + CyfsStackProxyDriver ：真机代理测试驱动
    + CyfsStackSimulatorDriver ： 模拟器测试驱动
+ CyfsStackClient
    + CyfsStackProxyClient ： 真机代理代理隧道客户端
    + CyfsStackSimulatorClient ：模拟器绑定所有协议栈客户端，暂时未做分类无用
+ UtilTool
    + ProxyUtilTool ：真机代理远程工具方法请求
    + LocalUtilTool ：本地工具方法请求
``` ts
// 测试驱动，启动模拟器服务和本地代理服务
export abstract  class CyfsStackDriver{
    // 初始化CYFS Stack测试驱动
    abstract init():Promise<{err:ErrorCode,log:string}>; 
    // 启动 
    abstract start():Promise<{err:ErrorCode,log:string}>;
    // 停止
    abstract stop():Promise<{err:ErrorCode,log:string}>;
    // 重启
    abstract restart():Promise<{err:ErrorCode,log:string}>;
    // 加载配置文件初始化CYFS Stack 测试客户端
    abstract load_config():Promise<{err:ErrorCode,log:string}>;
    // 添加一个 CYFS Stack 测试客户端
    abstract add_client(name:string,client:CyfsStackClient):{err:ErrorCode,log:string}
    // 获取一个CYFS Stack 测试客户端
    abstract get_client(name:string):{err:ErrorCode,log:string,client?:CyfsStackClient}
}

// 连接测试框架服务器，代理网络请求
export abstract  class CyfsStackClient{
    //获取工具类
    abstract get_util_tool():UtilTool
}

// 测试工具类，主要用于测试节点一些本地操作，如生成测试文件等
export abstract class UtilTool{
    //创建测试文件
    abstract create_file(file_size:number):Promise<{err:ErrorCode,log?:string,file_name?:string,file_path?:string,md5?:string}>;
    //创建测试文件夹
    abstract create_dir(file_number:number,file_size:number,dir_number?:number,deep?:string):Promise<{err:ErrorCode,log?:string,dir_name?:string,dir_path?:string}>;
    //计算文件hash md5算法
    abstract md5_file(file_path:string):Promise<{err:ErrorCode,md5?:string}>;
    //文件缓存目录
    abstract get_cache_path():Promise<{err:ErrorCode,cache_path? : {file_upload:string,file_download:string}}>
}
```