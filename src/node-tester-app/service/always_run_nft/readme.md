
## 开发代码环境初始化步骤
npm i 
cd node_tester_app
npx prisma db pull 
npx prisma generate
gulp build_app
编译后的目录：deploy/node_tester_app

## 部署操作步骤
解压 node_tester_app
npm i
npx prisma db pull 
npx prisma generate


## 执行方式
```
node service\always_run_nft\start_up.js [测试节点名称]
```

## 运行逻辑
start_up.js 守护进程自动拉起运行 testcase_run.js
testcase_run.js 判断机器类型，根据机器名、和用例表配置运行用例脚本
case1\NFT1_runtime.js 用例脚本，可以运行单个，也可以写个定时器反复运行用例

## 测试数据统计
（1）agent 统计节点在线状态
（2）error_info 统计用例报错数据
（3）nft_info 统计nft相关数据

## 用例脚本执行守护进程
node service\always_run_nft\start_up.js NFT1_runtime
node service\always_run_nft\start_up.js NFT2_runtime
## 运行节点脚本

node service\always_run_nft\testcase\testcase_run.js NFT1_runtime
node service\always_run_nft\testcase\testcase_run.js NFT2_runtime
用例列表配置：
```
const testcase = [
    {
        name : "case1",
        agent : ["NFT1_runtime","NFT2_runtime"],
        time : 10*1000, //间隔时间
    },
    {
        name : "case2",
        agent : ["NFT1_runtime","NFT2_runtime"],
        time : 10*1000,//间隔时间
    }
]
```
## 运行单个用例

node  service\always_run_nft\testcase\case1\NFT1_runtime.js NFT1_runtime 6000 case1
node  service\always_run_nft\testcase\case1\NFT2_runtime.js NFT2_runtime 6000 case1
node  service\always_run_nft\testcase\case2\NFT1_runtime.js NFT1_runtime 6000 case2
node  service\always_run_nft\estcase\case2\NFT2_runtime.js NFT2_runtime 6000 case2