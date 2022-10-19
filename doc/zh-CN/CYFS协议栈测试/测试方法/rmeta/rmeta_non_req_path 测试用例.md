# CYFS协议栈non+rmeta+handler+crypto+util测试用例设计

## 测试点
### 环境类型
* dec_app真机环境
* 模拟器环境

### 必填项
* 必填
* 非必填

### non_service
* put_object()
* post_object()
* get_object()
* delete_object()

### AccessPermissions
* None
* CallOnly
* WriteOnly
* WirteAndCall
* ReadOnly
* ReadAndCall
* ReadAndWrite
* Full

### AccessPermission
* Call
* Write
* Read

### AccessString
* dec_default()
* default()
* full()
* full_except_write()
* set_group_permission()
* full_except_write()
* make()
* constructor()

### AccessGroup
* CurrentDevice
* CurrentZone
* FriendZone
* OthersZone
* OwnerDec
* OthersDec

## 测试用例
* non_同zone多节点多dec,default权限-当前设备的put、get、delete
* non_同zone多节点多dec,default权限-zone内其他设备的put、get、delete
* non_同zone多节点多dec,default权限-zone2device从zone1device的get失败
* non_同zone多节点多dec,default权限-zone1device从不填默认target的put、get、delete
* non_同zone多节点多dec,default权限-zone1device从不填target和decid的get、delete
* non_同zone多节点多dec,Full权限-zone内put、get、delete都成功
* non_同zone多节点多dec,Full_except_write权限-zone内二次put、get、delete正常
* non_同zone多节点多dec,设置组合权限-当前设备由full到none
* non_同zone多节点多dec,设置组合权限-当前设备由full到callonly
* non_同zone多节点多dec,设置组合权限-当前设备由full到writeonly
* non_同zone多节点多dec,设置组合权限-当前设备由full到writeAndCall
* non_同zone多节点多dec,设置组合权限-当前设备由full到readOnly
* non_同zone多节点多dec,设置组合权限-当前设备由full到readAndCall
* non_同zone多节点多dec,设置组合权限-当前设备由full到readAndWrite
* non_同zone多节点多dec,设置组合权限-当前设备重复设置为full
* non_同zone多节点多dec,设置组合权限-当前设备none权限设置为full
* non_同zone多节点多dec,设置组合权限-当前zone权限为full
* non_同zone多节点多dec,多个分组设置组合权限-当前zone和OwnerDec权限为full
***
* non_跨zone多节点多dec,default权限-zone1device从zone2ood的get失败
* non_跨zone多节点多dec,default权限-zone1ood从zone2ood的get失败
* non_跨zone多节点多dec,default权限-putObject目标不同zone，请求失败
* non_跨zone多节点多dec,default权限-deleteObject目标不同zone，请求失败
* non_跨zone多节点多dec,default权限-access不填权限为默认值跨zone-ood访问失败
* non_跨zone多节点多dec,access不填权限为默认值跨zone-device访问失败
* non_跨zone多节点多dec,access不填权限为默认值zone内访问成功put、get、delete
* non_跨zone多节点多dec,Full权限-跨zone访问正常，zone2device从zone1device
* non_跨zone多节点多dec,Full权限-跨zone访问正常，zone2device从zone1ood
* non_跨zone多节点多dec,Full权限-跨zone访问正常，zone2ood从zone1从ood
* non_跨zone多节点多dec,Full权限-跨zone操作delete失败，zone2ood从zone1device
* non_跨zone多节点多dec,Full权限-跨zone二次操作put失败，zone2device从zone1device
* non_跨zone多节点多dec,Full_except_write权限-zone外不能写入，可以get操作

***
* path已授权默认权限zone内不同dec，put、get、delete成功
* path已授权默认权限跨zone请求get失败
* path已授权默认权限跨zone请求delete失败
* 没授权zone内不同dec，put失败
* zone内不同dec，put后不授权、get失败
* zone内不同dec，put后不授权、delete失败
* NONRequestor调用put_object正常流程
* NONRequestor调用get_object正常流程
* NONRequestor调用post_object默认同dec同设备
* NONRequestor调用post_object同zone不同dec设备没授权请求失败
* NONRequestor调用post_object同zone不同dec设备授权后请求成功
* NONRequestor调用post_object同zone不同dec相同设备授权后请求成功
* NONRequestor调用post_object跨zone同Dec不同设备不授权请求失败
* NONRequestor调用post_object跨zone同Dec不同设备授权后请求成功
* NONRequestor调用post_object跨zone不同Dec设备不授权请求失败
* NONRequestor调用post_object跨zone不同Dec设备授权后请求成功
* req_path put_object zone内不同设备跨dec level=non
* req_path get_object zone内不同设备跨dec level=non
* req_path post_object zone内不同设备跨dec level=non
* req_path delete_object zone内不同设备跨dec level=non
* req_path put_object zone内不同设备跨dec level=noc
* req_path get_object zone内不同设备跨dec level=noc
* req_path post_object zone内不同设备跨dec level=noc
* req_path delete_object zone内不同设备跨dec level=noc
* 
* 
* crypto调用 sign_object系统已授权、verify_object无需授权验证成功
* crypto 调用 系统已授权sign_object，zone内不同设备
* crypto 调用verify_object校验未被签名的对象
* crypto 调用 sign_object系统未授权
* crypto 调用 sign_object添加handler同dec授权触发成功
* crypto 调用 sign_object添加handler不同dec授权触发成功
* crypto 调用 sign_object添加precryptohandler不同dec授权触发成功
* 普通handler同zone同dec设备未授权请求成功
* 普通handler同zone不同dec授权后请求成功
* 普通handler同zone不同dec设备未授权请求失败
* 添加普通handler、put_object default
* 添加普通handler、put_object pass
* 添加普通handler、put_object drop
* 添加普通handler、put_object response
* 添加普通handler、put_object reject
* 添加普通 handler、post_object default
* 添加普通 handler、post_object reject
* 添加普通 handler、get_object default
* 添加普通 handler、get_object pass
* 添加普通 handler、get_object reject
* 添加普通 handler、get_object drop
* 添加普通 handler、delete_object default
* 添加普通 handler、delete_object pass
* 添加普通 handler、delete_object response
* 添加普通 handler、delete_object drop
* 添加普通 handler、delete_object reject
* 添加普通 handler、sign_object default
* 添加普通 handler、verify_object default
* 添加hook handler prerouter、put_object default
* 添加hook handler prerouter、put_object pass
* 添加hook handler prerouter、put_object response
* 添加hook handler prerouter、put_object reject
* 添加hook handler prerouter、put_object drop
* 添加hook handler prerouter、post_object default
* 添加hook handler prerouter、post_object reject
* 添加hook handler prerouter、get_object default
* 添加hook handler prerouter、get_object pass
* 添加hook handler prerouter、get_object drop
* 添加hook handler prerouter、get_object reject
* 添加hook handler prerouter、delete_object default
* 添加hook handler prerouter、delete_object pass
* 添加hook handler prerouter、delete_object response
* 添加hook handler prerouter、delete_object reject
* 添加hook handler prerouter、delete_object drop
* 添加hook handler、prerouter sign_object default
* 添加hook handler、prerouter verify_object default

***
* unit之get_device，runtime接口正常调用
* unit之get_device，runtime接口zone内不同设备间调用
* unit之get_device，runtime接口zone内同dec间调用
* unit之get_device，runtime接口zone内不同dec间调用
* unit之get_device，ood接口正常调用
* unit之get_device，ood接口不同设备间调用
* unit之get_device，runtime接口跨zone调用
* unit之get_device，ood接口跨zone调用
* unit之get_zone，runtime接口正常调用
* unit之get_zone，runtime接口zone内不同设备间调用
* unit之get_zone，runtime接口zone内同dec间调用
* unit之get_zone，runtime接口zone内不同dec间调用
* unit之get_zone，ood接口正常调用
* unit之get_zone，ood接口不同设备间调用
* unit之get_zone，runtime接口跨zone调用
* unit之get_zone，ood接口跨zone调用
* unit之resolve_ood，runtime接口正常调用
* unit之resolve_ood，runtime接口zone内不同设备间调用
* unit之resolve_ood，runtime接口zone内同dec间调用
* unit之resolve_ood，runtime接口zone内不同dec间调用
* unit之resolve_ood，ood接口正常调用
* unit之resolve_ood，ood接口不同设备间调用
* unit之resolve_ood，runtime接口跨zone调用
* unit之resolve_ood，ood接口跨zone调用
* unit之get_ood_status，runtime接口正常调用
* unit之get_ood_status，runtime接口zone内不同设备间调用
* unit之get_ood_status，runtime接口zone内同dec间调用
* unit之get_ood_status，runtime接口zone内不同dec间调用
* unit之get_ood_status，ood上调用指定其他设备获取所在ood状态
* unit之get_ood_status，ood上调用自己的状态
* unit之get_ood_status，ood接口正常调用
* unit之get_ood_status，ood接口不同设备间调用
* unit之get_ood_status，runtime接口跨zone调用
* unit之get_ood_status，ood接口跨zone调用
* unit之get_noc_info，runtime接口正常调用
* unit之get_noc_info，runtime接口zone内不同设备间调用
* unit之get_noc_info，runtime接口zone内同dec间调用
* unit之get_noc_info，runtime接口zone内不同dec间调用
* unit之get_noc_info，ood接口正常调用
* unit之get_noc_info，ood接口不同设备间调用
* unit之get_noc_info，runtime接口跨zone调用
* unit之get_noc_info，ood接口跨zone调用
* unit之get_network_access_info，runtime接口正常调用
* unit之get_network_access_info，runtime接口zone内不同设备间调用
* unit之get_network_access_info，runtime接口zone内同dec间调用
* unit之get_network_access_info，runtime接口zone内不同dec间调用
* unit之get_network_access_info，ood接口正常调用
* unit之get_network_access_info，ood接口不同设备间调用
* unit之get_network_access_info，runtime接口跨zone调用
* unit之get_network_access_info，ood接口跨zone调用
* unit之get_device_static_info，runtime接口正常调用
* unit之get_device_static_info，runtime接口zone内不同设备间调用
* unit之get_device_static_info，runtime接口zone内同dec间调用
* unit之get_device_static_info，runtime接口zone内不同dec间调用
* unit之get_device_static_info，ood接口正常调用
* unit之get_device_static_info，ood接口不同设备间调用
* unit之get_device_static_info，runtime接口跨zone调用
* unit之get_device_static_info，ood接口跨zone调用
* unit之get_system_info，runtime接口正常调用
* unit之get_system_info，runtime接口zone内不同设备间调用
* unit之get_system_info，runtime接口zone内同dec间调用
* unit之get_system_info，runtime接口zone内不同dec间调用
* unit之get_system_info，ood接口正常调用
* unit之get_system_info，ood接口不同设备间调用
* unit之get_system_info，runtime接口跨zone调用
* unit之get_system_info，ood接口跨zone调用
* unit之get_version_info，runtime接口正常调用
* unit之get_version_info，runtime接口zone内不同设备间调用
* unit之get_version_info，runtime接口zone内同dec间调用
* unit之get_version_info，runtime接口zone内不同dec间调用
* unit之get_version_info，ood接口正常调用
* unit之get_version_info，ood接口不同设备间调用
* unit之get_version_info，runtime接口跨zone调用
* unit之get_version_info，ood接口跨zone调用




