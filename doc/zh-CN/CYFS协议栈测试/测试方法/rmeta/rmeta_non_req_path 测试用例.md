# CYFS协议栈Cip测试用例设计

## 测试点
### 环境类型
* dec_app真机环境
* 模拟器环境

### 必填项
* 必填
* 非必填

### non_service
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
