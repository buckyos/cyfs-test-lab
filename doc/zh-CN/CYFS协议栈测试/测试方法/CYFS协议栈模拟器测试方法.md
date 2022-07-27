# CYFS协议栈模拟器测试

## CYFS协议栈模拟器（zone-simulator.exe）
模拟器编译: 
+ CYFS仓库源码 git@github.com:buckyos/CYFS.git
+ 编译模拟器：cargo build -p zone-simulator --release

## 模拟器使用TS封装
``` typescript
// cyfs_stack2\src\cyfs_stack_ts\common\utils\simulator.ts
export class ZoneSimulator{
    // 模拟器模拟两个Zone 7台设备
    static  zone1_ood_stack :cyfs.SharedCyfsStack ;
    static  zone1_standby_ood_stack :cyfs.SharedCyfsStack ;
    static  zone1_device1_stack :cyfs.SharedCyfsStack ;
    static  zone1_device2_stack :cyfs.SharedCyfsStack ;
    static  zone2_ood_stack :cyfs.SharedCyfsStack ;
    static  zone2_device1_stack :cyfs.SharedCyfsStack ;
    static  zone2_device2_stack :cyfs.SharedCyfsStack ;
    // 启动模拟器，连接协议栈
    static async init(debug:boolean=false ,clear:boolean=false)
    // 关闭模拟器
    static async stopZoneSimulator()
}
```
## 单元测试框架Mocha使用
    mocha使用.md

## 冒烟测试用例
    cyfs_stack2\src\cyfs_stack_ts\TestSuite\unittest_stack_interface

## 功能测试用例

+ meta chain 相关用例 ：cyfs_stack2\src\cyfs_stack_ts\TestSuite\unittest_meta
+ NameObject 相关用例  ：cyfs_stack2\src\cyfs_stack_ts\TestSuite\unittest_NON_nameobject
+ NON 相关测试相关用例：handler/acl 权限控制，NON对象操作
    + cyfs_stack2\src\cyfs_stack_ts\TestSuite\unittest_stack_NON_crypto
    + cyfs_stack2\src\cyfs_stack_ts\TestSuite\unittest_stack_NON_delete_object
    + cyfs_stack2\src\cyfs_stack_ts\TestSuite\unittest_stack_NON_get_object
    + cyfs_stack2\src\cyfs_stack_ts\TestSuite\unittest_stack_NON_post_object
    + cyfs_stack2\src\cyfs_stack_ts\TestSuite\unittest_stack_NON_put_object
    + cyfs_stack2\src\cyfs_stack_ts\TestSuite\unittest_stack_NON_select_object
+ NDN 相关测试用例：NDN put_data/get_data,trans Chunk/File/Dir 的传输
    + cyfs_stack2\src\cyfs_stack_ts\TestSuite\unittest_stack_NDN_Chunk
    + cyfs_stack2\src\cyfs_stack_ts\TestSuite\unittest_stack_NDN_File
    + cyfs_stack2\src\cyfs_stack_ts\TestSuite\unittest_stack_NDN_Dir
+ object_map 相关用例：cyfs_stack2\src\cyfs_stack_ts\TestSuite\unittest_object_map
+ 主从OOD相关用例：cyfs_stack2\src\cyfs_stack_ts\TestSuite\unittest_standby_ood（目前部分完成，转交毛毛测试） 
  
## 模拟器测试用例封装
``` typescript
// cyfs_stack2\src\cyfs_stack_ts\TestSuiteTool\stack_simulator\testcase_runner.ts
describe("cyfs协议栈测试",async function(){
    this.timeout(0);

    describe(`${datas.module}`,async function() {
        for(let j in datas.testcaseList){
            let inputData:InputInfo;
            let expectData:ResultInfo;
            describe(`${datas.testcaseList[j].id}:${datas.testcaseList[j].name}`,async()=> {
                before(async function () {
                    //获取测试数据
                    let tmg = new TestcaseManger();
                    await tmg.initMongo();
                    let res = await tmg.findRecordById(datas.testcaseList[j].id);
                    assert.ok(!res.err,res.log)
                    let testcaseInfo : testcaseInfo  = res.datas![0];
                    inputData = JSON.parse(testcaseInfo.input_data.toString());
                    expectData = JSON.parse(testcaseInfo.expect_result.toString());
                    //初始化ACL配置文件
                    await ZoneSimulator.getPeerId();
                    await ZoneSimulator.removeAllConfig();
                    for(let j in inputData.stackCfgList){
                        await aclManager.getdevice(inputData.stackCfgList[j].deviceName)!.initAcl({configFile:path.join(__dirname,"acl",inputData.stackCfgList[j].ACL.configFile!)})
                    }
                    //启动模拟器连接协议栈
                    await ZoneSimulator.init();
                })
                after(async function(){
                    //数据清理
                    await handlerManager.clearAllHandler();
                    await cyfs.sleep(2*1000);
                    await ZoneSimulator.stopZoneSimulator();
                    await cyfs.sleep(2*1000);
                    //清除ACL配置文件
                    await aclManager.removeAllAcl();
                })
                it(`${datas.testcaseList[j].name}`,async()=> {
                    // 异常用例阻塞暂时跳过
                    console.info(`开始执行测试用例：${datas.testcaseList[j].name}`)
                    if(inputData.skip){
                        assert(false,"测试用例异常，暂时标记不执行")
                    }
                    //运行超时处理机制
                    let run = true;
                    let timeout = 120*1000
                    if(inputData.timeout){
                        timeout = inputData.timeout
                    }
                    setTimeout(()=>{
                        if(run){
                            console.error(false,"测试用例运行超时")
                        }
                    },timeout)
                    //运行测试用例
                    switch(inputData.opt.optType){
                        case "put_data_chunk":{
                            await initHandlerList(inputData);
                            await put_data_chunk(inputData,expectData);
                            break;
                        }
                        case "get_data_chunk":{
                            await initHandlerList(inputData);
                            await get_data_chunk(inputData,expectData);
                            break;
                        }
                        case "get_data_chunk_second":{
                            await initHandlerList(inputData);
                            await get_data_chunk_second(inputData,expectData);
                            break;
                        }
                        case "trans_file":{
                            await initHandlerList(inputData);
                            await trans_file(inputData,expectData);
                            break;
                        }
                        case "trans_file_second":{
                            await initHandlerList(inputData);
                            await trans_file_second(inputData,expectData);
                            break;
                        }
                        case "trans_dir":{
                            await initHandlerList(inputData);
                            await trans_dir(inputData,expectData);
                            break;
                        }
                        case "put_object":{
                            await initHandlerList(inputData);
                            await put_object(inputData,expectData);
                            break;
                        }
                        case "get_object":{
                            await initHandlerList(inputData);
                            await get_object(inputData,expectData);
                            break;
                        }
                        case "select_object":{
                            await initHandlerList(inputData);
                            await select_object(inputData,expectData);
                            break;
                        }
                        case "delect_object":{
                            await initHandlerList(inputData);
                            await delect_object(inputData,expectData);
                            break;
                        }
                        case "post_object":{
                            await initHandlerList(inputData);
                            await post_object(inputData,expectData);
                            break;
                        }
                        case "sign_verify_object":{
                            await initHandlerList(inputData);
                            await sign_verify_object(inputData,expectData);
                            break;
                        }
                    }
                    run = false;
                })
            
            })

        }
    })
    

})

```

## 测试用例添加/执行
``` typescript
// 添加新的测试用例
//cyfs_stack2\src\cyfs_stack_ts\testcase_demo\testcase_add.ts
async function main() {
  // 添加测试用例的方式。添加用例最好保证id唯一性，后面最好加上lzh yqh lx之类的，省的把别人的用例改了。
  await test_add();
  // 运行测试用例通过命令行 参照 unittest_demo下面的用法
    //(1) 运行用例执行封装在,有更新最好更新 ,cyfs_stack2\src\cyfs_stack_ts\TestSuiteTool\stack_simulator 
    //(2) 测试用例要执行的用例id在data.ts文件里面，通过id 会查询你本地mongodb 里面的数据
    //(3) 运行可以通过命令行运行，也可以通过mocha_run_ts.ts 运行
    //(4) 所有单个测试用例全部执行完成，有通过system 、 module 批量生成data.ts的工具，注意这连个字段使用。也可以自己手写data.ts 执行自己要用的用例
  // 修改测试用例的方式
  await test_update();
  // 删除测试用例方式
  await test_delete();
}
```
