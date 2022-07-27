# cyfs_lab客户端编译
## 基础软件安装
+ nodejs 14.x 以上版本
+ python 3.7 以上版本
+ rust 1.61.0 以上版本
## 拉取测试代码仓库
```
git clone  https://git.buckycloud.com/lizhihong/cyfs_stack2.git
```

## 实验室测试节点客户端
### 客户端编译部署
```
cd src/node_tester_app
npm i 
gulp build_app
// 输出的目录 cd ../../deploy/node_tester_app
// 运行客户端方式
node script/dameon.js win32 testAgent 
```
### 客户端本地运行测试用例
```
cd deploy/node_tester_app
// 通过io输入运行用例方式
node host/tool.js
>runTask("${service_id}","${task_id}")
// 通过脚本批量运行用例方式,需要修改tool_run.js中要运行的service和用例列表
node host/tool_run.js
```
### 客户端批量上传测试用例到测试框架
```
cd deploy/node_tester_app/tools
// zipTask.js 打包测试用例脚本
// upload_task.js //上传测试用例到测试框架，创建测试任务
```

## 常用测试工具编译

### 更新CYFS源码
```
// 更新测试仓库submodule 方式
git submodule init
git submodule update
// 更新源码 rust
cd CYFS
git pull
git checkout master
// 更新源码 ts
cd cyfs_ts
git pull
git checkout master
```

### zone-simulator 编译
```
// 准备环境
安装 rust 开发环境
//切换到项目CYFS
cd CYFS\src
cargo update
cargo build -p zone-simulator --release
生成在 CYFS\src\target\release 目录下
```
### cyfs_sdk TS 版本编译
```
// 准备环境
安装 nodejs 开发环境
//切换到项目cyfs_ts
cd cyfs_ts
npm i 
npm run build:node //其他版本看package.json 命令
```