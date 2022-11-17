# 协议栈CI使用
    主要是将协议栈测试接入到CI平台中，使用CI来驱动协议栈测试自动执行
## 涉及模块
+ cyfs-test-lab\src\cyfs-stack-test-typescript\common\utils\simulator.ts 模拟器控制模块
+ cyfs-test-lab\src\cyfs-stack-test-typescript\tsconfig.json 测试项目打包配置
+ cyfs-test-lab\src\cyfs-stack-test-typescript\mocha_run_ci.ts 测试执行模块
+ cyfs-test-lab\src\cyfs-stack-test-typescript\script 报告上报模块
+ cyfs-test-lab\opt\testcase\cyfs_stack 下所有模块
  + build_stack.js 命令执行模块
  + http_ci.js http 请求和服务封装
  + route_ci.js http 服务路由模块

## 执行流程
```
在cyfs-test-lab\opt\testcase\cyfs_stack下，使用命令: "node http_ci.js client change_sdk cyfs-sdk-nightly",切换依赖SDK包版本，这里为切换为cyfs-sdk-nightly sdk

"node http_ci.js client change_sdk cyfs-node“ 切换编译后sdk

"node http_ci.js client change_sdk cyfs-sdk” 切换 beta sdk

"node http_ci.js client change_sdk source” 切换 cyfs-ts-sdk master 分支代码

"node http_ci.js client build" 打包协议栈测试项目

“node http_ci.js client run” 执行协议栈测试

"node http_ci.js server" 启动服务端，等待测试请求

ci执行顺序， 测试执行机启动服务端 ->  ci机执行切换sdk -> 测试执行机切换sdk -> ci机执行打包协议栈测试项目 ->  测试执行机执行协议栈测试项目打包 -> ci机执行协议栈测试 -> 测试机执行机执行协议栈测试脚本 -> 测试机执行机等待协议栈测试执行完毕，处理并上报测试报告

```