协议栈NDN 测试用例设计
=======
一、用例概述
--------
    场景说明：
        覆盖以下接口对chunk、file、dir、root_innerpath不同类型对象
    以及关联对象在current-device，current-zone，other-zone三种情况的权限
        
* get_data
* put_data
* delete_data
* query_file


二、用例场景
--------
文件大小、chunk大小、目录层数、空目录、空文件？
### 1、get_data
同zone同dec：
* getData chunk目标对象 —— —— 获取成功
* getData chunk目标对象 —— reqPath 获取成功
* getData chunk目标对象 关联file —— 有file对象权限&相应chunck 获取成功
* getData chunk目标对象 关联file —— 有file对象权限&非相应chunck 获取失败
* getData chunk目标对象 关联file —— 无file对象权限&相应chunck 获取失败
* getData chunk目标对象 关联file reqPath 有该path权限&相应chunck 获取成功
* getData chunk目标对象 关联file reqPath 无该path权限&相应chunck 获取失败
* getData chunk目标对象 关联file reqPath 有该path权限&非相应chunck 获取失败

* getData chunk目标对象 关联dir —— 有dir对象权限&相应chunck 获取成功
* getData chunk目标对象 关联dir —— 有dir对象权限&非相应chunck 获取失败
* getData chunk目标对象 关联dir —— 无dir对象权限&相应chunck 获取失败
* getData chunk目标对象 关联dir reqPath 有该path权限&相应chunck 获取成功
* getData chunk目标对象 关联dir reqPath 无该path权限&相应chunck 获取失败
* getData chunk目标对象 关联dir reqPath 有该path权限&非相应chunck 获取失败

* getData chunk目标对象 关联dir+innerPath —— 有dir对象权限&相应chunck 获取成功
* getData chunk目标对象 关联dir+innerPath —— 有dir对象权限&非相应chunck 获取失败
* getData chunk目标对象 关联dir+innerPath —— 无dir对象权限&相应chunck 获取失败
* getData chunk目标对象 关联dir+innerPath reqPath 有该path权限&相应chunck 获取成功
* getData chunk目标对象 关联dir+innerPath reqPath 无该path权限&相应chunck 获取失败
* getData chunk目标对象 关联dir+innerPath reqPath 有该path权限&非相应chunck 获取失败

* getData file目标对象 —— —— 有file对象权限 获取成功
* getData file目标对象 —— —— 无file对象权限 获取失败
* getData file目标对象 —— reqPath 有该path权限 获取成功
* getData file目标对象 —— reqPath 无该path权限 获取失败

* getData file目标对象 关联dir+innerPath —— 有dir对象权限 获取成功
* getData file目标对象 关联dir+innerPath —— 无dir对象权限 获取失败
* getData file目标对象 关联dir+innerPath reqPath 有该path权限 获取成功
* getData file目标对象 关联dir+innerPath reqPath 无该path权限 获取失败

* getData dir+innerPath目标对象 —— —— 有dir对象权限 获取成功
* getData dir+innerPath目标对象 —— —— 无dir对象权限 获取失败
* getData dir+innerPath目标对象 —— reqPath 有该path权限 获取成功
* getData dir+innerPath目标对象 —— reqPath 无该path权限 获取失败

同zone不同dec：
* getData chunk目标对象 —— —— 获取成功
* getData chunk目标对象 —— reqPath 有该path权限&validate一致 获取成功
* getData chunk目标对象 —— reqPath 无该path权限&validate一致 获取失败
* getData chunk目标对象 关联file —— 有file对象权限&相应chunck 获取成功
* getData chunk目标对象 关联file —— 有file对象权限&非相应chunck 获取失败
* getData chunk目标对象 关联file —— 无file对象权限&相应chunck 获取失败
* getData chunk目标对象 关联file reqPath 有该path权限&相应chunck 获取成功
* getData chunk目标对象 关联file reqPath 无该path权限&相应chunck 获取失败
* getData chunk目标对象 关联file reqPath 有该path权限&非相应chunck 获取失败

* getData chunk目标对象 关联dir —— 有dir对象权限&相应chunck 获取成功
* getData chunk目标对象 关联dir —— 有dir对象权限&非相应chunck 获取失败
* getData chunk目标对象 关联dir —— 无dir对象权限&相应chunck 获取失败
* getData chunk目标对象 关联dir reqPath 有该path权限&相应chunck 获取成功
* getData chunk目标对象 关联dir reqPath 无该path权限&相应chunck 获取失败
* getData chunk目标对象 关联dir reqPath 有该path权限&非相应chunck 获取失败

* getData chunk目标对象 关联dir+innerPath —— 有dir对象权限&相应chunck 获取成功
* getData chunk目标对象 关联dir+innerPath —— 有dir对象权限&非相应chunck 获取失败
* getData chunk目标对象 关联dir+innerPath —— 无dir对象权限&相应chunck 获取失败
* getData chunk目标对象 关联dir+innerPath reqPath 有该path权限&相应chunck 获取成功
* getData chunk目标对象 关联dir+innerPath reqPath 无该path权限&相应chunck 获取失败
* getData chunk目标对象 关联dir+innerPath reqPath 有该path权限&非相应chunck 获取失败

* getData file目标对象 —— —— 有file对象权限 获取成功
* getData file目标对象 —— —— 无file对象权限 获取失败
* getData file目标对象 —— reqPath 有该path权限 获取成功
* getData file目标对象 —— reqPath 无该path权限 获取失败

* getData file目标对象 关联dir+innerPath —— 有dir对象权限 获取成功
* getData file目标对象 关联dir+innerPath —— 无dir对象权限 获取失败
* getData file目标对象 关联dir+innerPath reqPath 有该path权限 获取成功
* getData file目标对象 关联dir+innerPath reqPath 无该path权限 获取失败

* getData dir+innerPath目标对象 —— —— 有dir对象权限 获取成功
* getData dir+innerPath目标对象 —— —— 无dir对象权限 获取失败
* getData dir+innerPath目标对象 —— reqPath 有该path权限 获取成功
* getData dir+innerPath目标对象 —— reqPath 无该path权限 获取失败

跨zone同dec：
* getData chunk目标对象 无关联无req_path不支持
* getData chunk目标对象 —— reqPath 有该path权限&validate一致 获取成功
* getData chunk目标对象 —— reqPath 无该path权限&validate一致 获取失败
* getData chunk目标对象 关联file —— 有file对象权限&相应chunck 获取成功
* getData chunk目标对象 关联file —— 有file对象权限&非相应chunck 获取失败
* getData chunk目标对象 关联file —— 无file对象权限&相应chunck 获取失败
* getData chunk目标对象 关联file reqPath 有该path权限&相应chunck 获取成功
* getData chunk目标对象 关联file reqPath 无该path权限&相应chunck 获取失败
* getData chunk目标对象 关联file reqPath 有该path权限&非相应chunck 获取失败

* getData chunk目标对象 关联dir —— 有dir对象权限&相应chunck 获取成功
* getData chunk目标对象 关联dir —— 有dir对象权限&非相应chunck 获取失败
* getData chunk目标对象 关联dir —— 无dir对象权限&相应chunck 获取失败
* getData chunk目标对象 关联dir reqPath 有该path权限&相应chunck 获取成功
* getData chunk目标对象 关联dir reqPath 无该path权限&相应chunck 获取失败
* getData chunk目标对象 关联dir reqPath 有该path权限&非相应chunck 获取失败

* getData chunk目标对象 关联dir+innerPath —— 有dir对象权限&相应chunck 获取成功
* getData chunk目标对象 关联dir+innerPath —— 有dir对象权限&非相应chunck 获取失败
* getData chunk目标对象 关联dir+innerPath —— 无dir对象权限&相应chunck 获取失败
* getData chunk目标对象 关联dir+innerPath reqPath 有该path权限&相应chunck 获取成功
* getData chunk目标对象 关联dir+innerPath reqPath 无该path权限&相应chunck 获取失败
* getData chunk目标对象 关联dir+innerPath reqPath 有该path权限&非相应chunck 获取失败

* getData file目标对象 —— —— 有file对象权限 获取成功
* getData file目标对象 —— —— 无file对象权限 获取失败
* getData file目标对象 —— reqPath 有该path权限 获取成功
* getData file目标对象 —— reqPath 无该path权限 获取失败

* getData file目标对象 关联dir+innerPath —— 有dir对象权限 获取成功
* getData file目标对象 关联dir+innerPath —— 无dir对象权限 获取失败
* getData file目标对象 关联dir+innerPath reqPath 有该path权限 获取成功
* getData file目标对象 关联dir+innerPath reqPath 无该path权限 获取失败

* getData dir+innerPath目标对象 —— —— 有dir对象权限 获取成功
* getData dir+innerPath目标对象 —— —— 无dir对象权限 获取失败
* getData dir+innerPath目标对象 —— reqPath 有该path权限 获取成功
* getData dir+innerPath目标对象 —— reqPath 无该path权限 获取失败

跨zone不同dec：
* getData chunk目标对象 无关联无req_path不支持
* getData chunk目标对象 —— reqPath 有该path权限&validate一致 获取成功
* getData chunk目标对象 —— reqPath 无该path权限&validate一致 获取失败
* getData chunk目标对象 关联file —— 有file对象权限&相应chunck 获取成功
* getData chunk目标对象 关联file —— 有file对象权限&非相应chunck 获取失败
* getData chunk目标对象 关联file —— 无file对象权限&相应chunck 获取失败
* getData chunk目标对象 关联file reqPath 有该path权限&相应chunck 获取成功
* getData chunk目标对象 关联file reqPath 无该path权限&相应chunck 获取失败
* getData chunk目标对象 关联file reqPath 有该path权限&非相应chunck 获取失败

* getData chunk目标对象 关联dir —— 有dir对象权限&相应chunck 获取成功
* getData chunk目标对象 关联dir —— 有dir对象权限&非相应chunck 获取失败
* getData chunk目标对象 关联dir —— 无dir对象权限&相应chunck 获取失败
* getData chunk目标对象 关联dir reqPath 有该path权限&相应chunck 获取成功
* getData chunk目标对象 关联dir reqPath 无该path权限&相应chunck 获取失败
* getData chunk目标对象 关联dir reqPath 有该path权限&非相应chunck 获取失败

* getData chunk目标对象 关联dir+innerPath —— 有dir对象权限&相应chunck 获取成功
* getData chunk目标对象 关联dir+innerPath —— 有dir对象权限&非相应chunck 获取失败
* getData chunk目标对象 关联dir+innerPath —— 无dir对象权限&相应chunck 获取失败
* getData chunk目标对象 关联dir+innerPath reqPath 有该path权限&相应chunck 获取成功
* getData chunk目标对象 关联dir+innerPath reqPath 无该path权限&相应chunck 获取失败
* getData chunk目标对象 关联dir+innerPath reqPath 有该path权限&非相应chunck 获取失败

* getData file目标对象 —— —— 有file对象权限 获取成功
* getData file目标对象 —— —— 无file对象权限 获取失败
* getData file目标对象 —— reqPath 有该path权限 获取成功
* getData file目标对象 —— reqPath 无该path权限 获取失败

* getData file目标对象 关联dir+innerPath —— 有dir对象权限 获取成功
* getData file目标对象 关联dir+innerPath —— 无dir对象权限 获取失败
* getData file目标对象 关联dir+innerPath reqPath 有该path权限 获取成功
* getData file目标对象 关联dir+innerPath reqPath 无该path权限 获取失败

* getData dir+innerPath目标对象 —— —— 有dir对象权限 获取成功
* getData dir+innerPath目标对象 —— —— 无dir对象权限 获取失败
* getData dir+innerPath目标对象 —— reqPath 有该path权限 获取成功
* getData dir+innerPath目标对象 —— reqPath 无该path权限 获取失败


### 2、put_data

同zone同设备：
* put_data chunk目标对象 —— —— 推送数据成功

### 3、delete_data 
暂不支持

### 4、query_file

同zone同dec：
* query_file —— —— —— 请求成功

同zone跨dec：
* query_file —— —— —— 请求成功


