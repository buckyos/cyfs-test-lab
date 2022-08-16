Util 测试用例设计说明
=======
一、用例概述
--------
    场景说明：覆盖以下操作传入必带参数的主流程以及可选参数的验证
    * get_device
    * get_zone
    * resolve_ood
    * get_ood_status
    * get_noc_info
    * get_network_access_info
    * get_device_static_info
    * get_system_info
    * get_version_info
    * build_dir_from_object_map
<u>用例路径：src\cyfs-stack-test-typescript\TestSuite\unittest_stack_NON_*</u>  
该模块测试场景当前依赖模拟器环境实现并运行

二、用例场景
--------

### 1、get_device
* get_device-正常调用runtime接口   
    ```
    前置条件：
    操作步骤：
    预期结果：
* get_device-正常调用ood接口
* 传入target对象，正常获取设备信息
* 传入dec_id对象，正常获取设备信息
* 传入target和dec_id对象，正常获取设备信息
### 2、get_zone
* get_zone-正常调用runtime接口 
* get_zone-正常调用ood接口
* 传入target对象，正常获取设备信息
* 传入dec_id对象，正常获取设备信息
* 传入target和dec_id对象，正常获取设备信息
* 传入object_id对象，正常获取设备信息
* 传入object_raw对象，正常获取设备信息
### 3、resolve_ood
* resolve_ood-正常调用runtime接口 
* resolve_ood-正常调用ood接口
* 传入target对象，正常获取设备信息
* 传入dec_id对象，正常获取设备信息
* 传入owner_id对象，正常获取设备信息
* 传入target和dec_id对象，正常获取设备信息
### 4、get_ood_status
* get_ood_status-正常调用runtime接口 
* 传入target对象，正常获取设备信息
* 传入dec_id对象，正常获取设备信息
* 传入target和dec_id对象，正常获取设备信息
### 5、get_noc_info
* get_noc_info-正常调用runtime接口 
* get_noc_info-正常调用ood接口
* 传入target对象，正常获取设备信息
* 传入dec_id对象，正常获取设备信息
* 传入target和dec_id对象，正常获取设备信息
### 6、get_network_access_info
* get_network_access_info-正常调用runtime接口 
* get_network_access_info-正常调用ood接口
* 传入target对象，正常获取设备信息
* 传入dec_id对象，正常获取设备信息
* 传入target和dec_id对象，正常获取设备信息
### 7、get_device_static_info
* get_device_static_info-正常调用runtime接口 
* get_device_static_info-正常调用ood接口
* 传入target对象，正常获取设备信息
* 传入dec_id对象，正常获取设备信息
* 传入target和dec_id对象，正常获取设备信息
### 8、get_system_info
* get_system_info-正常调用runtime接口 
* get_system_info-正常调用ood接口
* 传入target对象，正常获取设备信息
* 传入dec_id对象，正常获取设备信息
* 传入target和dec_id对象，正常获取设备信息
### 9、get_version_info
* get_version_info-正常调用runtime接口 
* get_version_info-正常调用ood接口
* 传入target对象，正常获取设备信息
* 传入dec_id对象，正常获取设备信息
* 传入target和dec_id对象，正常获取设备信息
### 10、build_dir_from_object_map
* 传入必带参数flags为0,正常获取设备信息
* 传入target对象，正常获取设备信息
* 传入dec_id对象，正常获取设备信息
* 传入target和dec_id对象，正常获取设备信息
* 传入object_map_id对象，正常获取设备信息
* 传入dir_type对象，正常获取设备信息















