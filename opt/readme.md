## cyfs-test-lab 运维部署

### 依赖环境
+ nodejs: v16.18.0
+ rust: rustc 1.64.0 
### 获取代码
```
git clone https://github.com/buckyos/cyfs-test-lab.git
git submodule init
git submodule update
// 更新源码 rust
cd CYFS
git pull
git checkout master / 切换分支操作，选择执行
// 更新源码 ts
cd cyfs_ts
git pull
git checkout master // 切换分支操作，选择执行
```
### BDT 
#### 执行案例
```
cd cyfs-test-lab/opt
npm i
cd ../src
node ..\opt\script\build.js x86_64-pc-windows-msvc;x86_64-unknown-linux-gnu tools 1 nightly release
node ..\opt\testcase\cyfs_bdt\upload_task.js run_job bdt_smoke_nightly 359 cyfs_bdt_nightly 1
``` 

#### 编译测试客户端&&发布测试包
+ 发布BDT测试包脚本
```
cd src
node ..\opt\script\build.js x86_64-pc-windows-msvc;x86_64-unknown-linux-gnu tools ${buildnumber} ${channel} release
```
+ dev 测试包
```
cd src
node ..\opt\script\build.js x86_64-pc-windows-msvc;x86_64-unknown-linux-gnu tools 1 dev release
```
+ nightly包
```
cd src
node ..\opt\script\build.js x86_64-pc-windows-msvc;x86_64-unknown-linux-gnu tools 1 nightly release
```
+ beta 包
```
cd src
node ..\opt\script\build.js x86_64-pc-windows-msvc;x86_64-unknown-linux-gnu tools 1 beta release
```
#### 触发测试用例
+ dev回归测试最小集
```
cd src
node ..\opt\testcase\cyfs_bdt\upload_task.js run_job bdt_smoke 4 cyfs_bdt 1
```
+ nightly回归测试最小集
```
cd src
node ..\opt\testcase\cyfs_bdt\upload_task.js run_job bdt_smoke_nightly 359 cyfs_bdt_nightly 1
```
+ beta回归测试最小集
```
cd src
node ..\opt\testcase\cyfs_bdt\upload_task.js run_job bdt_smoke_beta 350 cyfs_bdt_beta 1
```

+ 用例执行详情 ：http://cyfs-test-lab/joblist
+ 脚本返回测试结果 zip_url(测试报告压缩包) testcase_url(在线测试报告) action_total_url(BDT操作大概性能统计)
```
{
    "err":0,
    "log":"生成测试报告成功",
    "zip_url":"http://cyfs-test-lab/testcaseReport/2022_11_04_20_57_39/2022_11_04_20_57_39.zip",
    "testcase_url":"http://cyfs-test-lab/testcaseReport/2022_11_04_20_57_39/TestcaseReport.html",
    "action_total_url":"http://cyfs-test-lab/testcaseReport/2022_11_04_20_57_39/TotalActionPerf.html"
}
```