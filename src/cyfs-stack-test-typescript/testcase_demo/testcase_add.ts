import { TestcaseManger, testcaseInfo } from "../common/models/testcaseInfo";
import { stack, stackInfo } from "../common/utils/stack";
import { InputInfo, ResultInfo } from "../common/types/type";
import * as cyfs from "../cyfs_node/cyfs_node"



let input_data: InputInfo = {
    // 测试用例ID
    id: "test_stack_001",
    // 测试用例名称
    testcaseName: "#put_object-Router target 为跨zone ood 设置handler-ACL 全部为default",
    // 测试用例的操作
    opt: {
      // 操作类型
      optType: "put_object",
      // 操作NON API 级别
      level: cyfs.NONAPILevel.Router,
      // source设备 协议栈， 通过名称会连模拟器协议栈
      source: "zone1_ood",
     //  target设备 协议栈， 通过名称会连模拟器协议栈
      target: "zone2_ood",
    },
    // 预期结果
    expect: { err: false },
    // 每个协议栈的配置，handler acl
    stackCfgList: [
      {
        // 协议栈名称
        stack: "zone1_ood",
        deviceName: "zone1_ood",
        // handler 配置列表，看协议栈handler 相关文档了解
        handlerList: [
          {
            //handler id
            id: "put-object-handler-011",
            //handler 事务类型
            type: cyfs.RouterHandlerCategory.PutObject ,
            //handler 触发类型
            chain: cyfs.RouterHandlerChain.PreNOC,
            //handler index 相当于优先级，越小优先级越高
            index: -1,
            // handler 匹配规则
            filter: "obj_type == 41",
            // handler 默认事件处理方式
            default_action:cyfs.RouterHandlerAction.Default,
            // handler 自定义的事件处理方式，这个是通过名称然后通过cyfs_stack2\src\cyfs_stack_ts\common\utils\handler.ts 注册
            routineType: "PutObjectHandlerDefault",
            // 触发的预期次数   实现和校验在cyfs_stack2\src\cyfs_stack_ts\common\utils\handler.ts 
            runSum: 1,
          },
          {
            id: "put-object-handler-012",
            type: cyfs.RouterHandlerCategory.PutObject ,
            chain: cyfs.RouterHandlerChain.PostNOC,
            index: -1,
            filter: "obj_type == 41",
            default_action:cyfs.RouterHandlerAction.Default,
            routineType: "PutObjectHandlerDefault",
            runSum: 1,
          },
          {
            id: "put-object-handler-013",
            type: cyfs.RouterHandlerCategory.PutObject ,
            chain: cyfs.RouterHandlerChain.PreForward,
            index: -1,
            filter: "obj_type == 41",
            default_action:cyfs.RouterHandlerAction.Default,
            routineType: "PutObjectHandlerDefault",
            runSum: 1,
          },
          {
            id: "put-object-handler-014",
            type: cyfs.RouterHandlerCategory.PutObject ,
            chain: cyfs.RouterHandlerChain.PostForward,
            index: -1,
            filter: "obj_type == 41",
            default_action:cyfs.RouterHandlerAction.Default,
            routineType: "PutObjectHandlerDefault",
            runSum: 1,
          },
          {
            id: "put-object-handler-015",
            type: cyfs.RouterHandlerCategory.PutObject ,
            chain: cyfs.RouterHandlerChain.PreRouter,
            index: -1,
            filter: "obj_type == 41",
            default_action:cyfs.RouterHandlerAction.Default,
            routineType: "PutObjectHandlerDefault",
            runSum: 1,
          },
          {
            id: "put-object-handler-016",
            type: cyfs.RouterHandlerCategory.PutObject ,
            chain: cyfs.RouterHandlerChain.PostRouter,
            index: -1,
            filter: "obj_type == 41",
            default_action:cyfs.RouterHandlerAction.Default,
            routineType: "PutObjectHandlerDefault",
            runSum: 1,
          },
        ],
        // acl 配置文件，协议栈初始化前进行配置文件修改
        ACL: { configFile: "acceptAll.toml" },
      },
      {
        stack: "zone2_ood",
        deviceName: "zone2_ood",
        handlerList: [
          {
            id: "put-object-handler-021",
            type: cyfs.RouterHandlerCategory.PutObject ,
            chain: cyfs.RouterHandlerChain.PreNOC,
            index: -1,
            filter: "obj_type == 41",
            default_action:cyfs.RouterHandlerAction.Default,
            routineType: "PutObjectHandlerDefault",
            runSum: 1,
          },
          {
            id: "put-object-handler-022",
            type: cyfs.RouterHandlerCategory.PutObject ,
            chain: cyfs.RouterHandlerChain.PostNOC,
            index: -1,
            filter: "obj_type == 41",
            default_action:cyfs.RouterHandlerAction.Default,
            routineType: "PutObjectHandlerDefault",
            runSum: 1,
          },
          {
            id: "put-object-handler-023",
            type: cyfs.RouterHandlerCategory.PutObject ,
            chain: cyfs.RouterHandlerChain.PreForward,
            index: -1,
            filter: "obj_type == 41",
            default_action:cyfs.RouterHandlerAction.Default,
            routineType: "PutObjectHandlerDefault",
            runSum: 0,
          },
          {
            id: "put-object-handler-024",
            type: cyfs.RouterHandlerCategory.PutObject ,
            chain: cyfs.RouterHandlerChain.PostForward,
            index: -1,
            filter: "obj_type == 41",
            default_action:cyfs.RouterHandlerAction.Default,
            routineType: "PutObjectHandlerDefault",
            runSum: 0,
          },
          {
            id: "put-object-handler-025",
            type: cyfs.RouterHandlerCategory.PutObject ,
            chain: cyfs.RouterHandlerChain.PreRouter,
            index: -1,
            filter: "obj_type == 41",
            default_action:cyfs.RouterHandlerAction.Default,
            routineType: "PutObjectHandlerDefault",
            runSum: 1,
          },
          {
            id: "put-object-handler-026",
            type: cyfs.RouterHandlerCategory.PutObject ,
            chain: cyfs.RouterHandlerChain.PostRouter,
            index: -1,
            filter: "obj_type == 41",
            default_action:cyfs.RouterHandlerAction.Default,
            routineType: "PutObjectHandlerDefault",
            runSum: 1,
          },
        ],
        ACL: { configFile: "acceptAll.toml" },
      },
    ],
  };
  let expect_result: ResultInfo = { err: false };


// 添加要测试的用例配置
async function test_add() {
  let test = new TestcaseManger();
  await test.initMongo();
  await test.initStack();
  // 协议栈测试配置 demo ，详细的看InputInfo 类型的定义。要添加字段可以使用？添加非必填字段
  let save = await test.recordOne({
    testcaseId: "test_stack_001",
    system: "Demo",
    module: "Demo",
    type: "正常测试",
    priority: "高",
    level: "1",
    author: "李智鸿",
    create_time: Date.now(),
    update_time: Date.now(),
    testcase_name: "测试demo程序-put_object",
    precondition: "前置条件",
    postcondition: "后置条件",
    expect_result: JSON.stringify(expect_result),
    input_data: JSON.stringify(input_data),
  });
  let query = await test.findRecordById("test_stack_001");
  console.info("查询结果", JSON.stringify(query.datas));
}

// 修改要测试的用例配置
async function test_update(){
    let test = new TestcaseManger();
    await test.initMongo();
    await test.initStack();
  let save = await test.updateDataById("test_stack_001",{
    system: "Demo",
    module: "Demo",
    type: "正常测试",
    priority: "高",
    level: "1",
    author: "李智鸿",
    create_time: Date.now(),
    update_time: Date.now(),
    testcase_name: "测试demo程序-put_object",
    precondition: "前置条件",
    postcondition: "后置条件",
    expect_result: JSON.stringify(input_data),
    input_data: JSON.stringify(expect_result),
  })
  let query = await test.findRecordById("test_stack_001");
  console.info("查询结果", JSON.stringify(query.datas));
}

async function test_delete(){
    let test = new TestcaseManger();
    await test.initMongo();
    await test.initStack();
    let save = await test.deleteById("test_stack_001")
    let query = await test.findRecordById("test_stack_001");
   console.info("查询结果", JSON.stringify(query.datas));
}


async function main() {
  // 添加测试用例的方式。添加用例最好保证id唯一性，后面最好加上lzh yqh lx之类的，省的把别人的用例改了。
  await test_add();
  // 运行测试用例通过命令行 参照 unittest_demo下面的用法
    //(1) 运行用例执行封装在,有更新最好更新 ,cyfs_stack2\src\cyfs_stack_ts\TestSuiteTool\stack_simulator 
    //(2) 测试用例要执行的用例id在data.ts文件里面，通过id 会查询你本地mongodb 里面的数据
    //(3) 运行可以通过命令行运行，也可以通过mocha_run_ts.ts 运行
    //(4) 所有单个测试用例全部执行完成，有通过system 、 module 批量生成data.ts的工具，注意这连个字段使用。也可以自己手写data.ts 执行自己要用的用例
  // 修改测试用例的方式
  //await test_update();
  // 删除测试用例方式
  //await test_delete();
}
main().finally(async()=>{
    process.exit(0);
});
