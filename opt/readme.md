## cyfs-test-lab 运维部署

### 依赖环境
+ nodejs: v16.18.0
+ rust: rustc 1.64.0 
### 获取代码
```
git clone https://github.com/buckyos/cyfs-test-lab.git
```
### BDT 
#### 触发测试用例
+ 运行冒烟测试用例
```
cd cyfs-test-lab/opt
npm i
node testcase\cyfs_bdt\testcase_run_smoke.js
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
#### 编译测试客户端
TODO
#### 发布测试包
TODO
