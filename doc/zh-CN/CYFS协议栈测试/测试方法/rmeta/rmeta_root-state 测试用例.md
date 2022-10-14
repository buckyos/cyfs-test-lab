# CYFS协议栈rmeta_root-state测试用例设计

## 测试点
### 环境类型
* dec_app真机环境
* 模拟器环境

### 必填项
* 必填
* 非必填

### dec_type
* sys
* any
* sam_dec
* dif_dec

### GlobalStateStub
* PathOpEnvStub
* SingleOpEnvStub

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
* set_group_permissions()
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
# CYFS协议栈rmeta_root-state测试用例设计

## 测试点
### 环境类型
* dec_app真机环境
* 模拟器环境

### 必填项
* 必填
* 非必填

### GlobalStateStub
* PathOpEnvStub
* SingleOpEnvStub

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
* set_group_permissions()
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
* create_path_op_env root-state同zone同dec，access，dec_default()权限组
* create_path_op_env root-state同zone同dec，access，default()权限组
* create_path_op_env root-state同zone同dec，access，full()权限组
* create_path_op_env root-state同zone同dec，access，full_except_write()权限组
* create_path_op_env root-state同zone同dec，access，set_group_permission()权限组设定
* create_path_op_env root-state同zone同dec，access，set_group_permissions()权限组设定
* create_path_op_env root-state同zone同dec，access，make()权限组设定
* create_path_op_env root-state同zone同dec，access，constructor()权限组初始化
***
* create_path_op_env root-state同zone不同dec，access，dec_default()权限组
* create_path_op_env root-state同zone不同dec，access，default()权限组
* create_path_op_env root-state同zone不同dec，access，full()权限组
* create_path_op_env root-state同zone不同dec，access，full_except_write()权限组
* create_path_op_env root-state同zone不同dec，access，set_group_permission()权限组设定
* create_path_op_env root-state同zone不同dec，access，set_group_permissions()权限组设定
* create_path_op_env root-state同zone不同dec，access，make()权限组设定
* create_path_op_env root-state同zone不同dec，access，constructor()权限组初始化
***
* create_path_op_env root-state跨zone同dec，access，dec_default()权限组
* create_path_op_env root-state跨zone同dec，access，default()权限组
* create_path_op_env root-state跨zone同dec，access，full()权限组
* create_path_op_env root-state跨zone同dec，access，full_except_write()权限组
* create_path_op_env root-state跨zone同dec，access，set_group_permission()权限组设定
* create_path_op_env root-state跨zone同dec，access，set_group_permissions()权限组设定
* create_path_op_env root-state跨zone同dec，access，make()权限组设定
* create_path_op_env root-state跨zone同dec，access，constructor()权限组初始化
***
* create_path_op_env root-state跨zone不同dec，access，dec_default()权限组
* create_path_op_env root-state跨zone不同dec，access，default()权限组
* create_path_op_env root-state跨zone不同dec，access，full()权限组
* create_path_op_env root-state跨zone不同dec，access，full_except_write()权限组
* create_path_op_env root-state跨zone不同decc，access，set_group_permission()权限组设定
* create_path_op_env root-state跨zone不同dec，access，set_group_permissions()权限组设定
* create_path_op_env root-state跨zone不同dec，access，make()权限组设定
* create_path_op_env root-state跨zone不同dec，access，constructor()权限组初始化
***
* create_path_op_env local_cache同zone同dec，access，dec_default()权限组
* create_path_op_env local_cache同zone同dec，access，default()权限组
* create_path_op_env local_cache同zone同dec，access，full()权限组
* create_path_op_env local_cache同zone同dec，access，full_except_write()权限组
* create_path_op_env local_cache同zone同dec，access，set_group_permission()权限组设定
* create_path_op_env local_cache同zone同dec，access，set_group_permissions()权限组设定
* create_path_op_env local_cache同zone同dec，access，make()权限组设定
* create_path_op_env local_cache同zone同dec，access，constructor()权限组初始化
***
* create_path_op_env local_cache同zone不同dec，access，dec_default()权限组
* create_path_op_env local_cache同zone不同dec，access，default()权限组
* create_path_op_env local_cache同zone不同dec，access，full()权限组
* create_path_op_env local_cache同zone不同dec，access，full_except_write()权限组
* create_path_op_env local_cache同zone不同dec，access，set_group_permission()权限组设定
* create_path_op_env local_cache同zone不同dec，access，set_group_permissions()权限组设定
* create_path_op_env local_cache同zone不同dec，access，make()权限组设定
* create_path_op_env local_cache同zone不同dec，access，constructor()权限组初始化
***
* create_path_op_env local_cache跨zone同dec，access，dec_default()权限组
* create_path_op_env local_cache跨zone同dec，access，default()权限组
* create_path_op_env local_cache跨zone同dec，access，full()权限组
* create_path_op_env local_cache跨zone同dec，access，full_except_write()权限组
* create_path_op_env local_cache跨zone同dec，access，set_group_permission()权限组设定
* create_path_op_env local_cache跨zone同dec，access，set_group_permissions()权限组设定
* create_path_op_env local_cache跨zone同dec，access，make()权限组设定
* create_path_op_env local_cache跨zone同dec，access，constructor()权限组初始化
***
* create_path_op_env local_cache跨zone不同dec，access，dec_default()权限组
* create_path_op_env local_cache跨zone不同dec，access，default()权限组
* create_path_op_env local_cache跨zone不同dec，access，full()权限组
* create_path_op_env local_cache跨zone不同dec，access，full_except_write()权限组
* create_path_op_env local_cache跨zone不同decc，access，set_group_permission()权限组设定
* create_path_op_env local_cache跨zone不同dec，access，set_group_permissions()权限组设定
* create_path_op_env local_cache跨zone不同dec，access，make()权限组设定
* create_path_op_env local_cache跨zone不同dec，access，constructor()权限组初始化
***
* create_single_op_env root-state同zone同dec，access，dec_default()权限组
* create_single_op_env root-state同zone同dec，access，default()权限组
* create_single_op_env root-state同zone同dec，access，full()权限组
* create_single_op_env root-state同zone同dec，access，full_except_write()权限组
* create_single_op_env root-state同zone同dec，access，set_group_permission()权限组设定
* create_single_op_env root-state同zone同dec，access，set_group_permissions()权限组设定
* create_single_op_env root-state同zone同dec，access，make()权限组设定
* create_single_op_env root-state同zone同dec，access，constructor()权限组初始化
***
* create_single_op_env root-state同zone不同dec，access，dec_default()权限组
* create_single_op_env root-state同zone不同dec，access，default()权限组
* create_single_op_env root-state同zone不同dec，access，full()权限组
* create_single_op_env root-state同zone不同dec，access，full_except_write()权限组
* create_single_op_env root-state同zone不同dec，access，set_group_permission()权限组设定
* create_single_op_env root-state同zone不同dec，access，set_group_permissions()权限组设定
* create_single_op_env root-state同zone不同dec，access，make()权限组设定
* create_single_op_env root-state同zone不同dec，access，constructor()权限组初始化
***
* create_single_op_env root-state跨zone同dec，access，dec_default()权限组
* create_single_op_env root-state跨zone同dec，access，default()权限组
* create_single_op_env root-state跨zone同dec，access，full()权限组
* create_single_op_env root-state跨zone同dec，access，full_except_write()权限组
* create_single_op_env root-state跨zone同dec，access，set_group_permission()权限组设定
* create_single_op_env root-state跨zone同dec，access，set_group_permissions()权限组设定
* create_single_op_env root-state跨zone同dec，access，make()权限组设定
* create_single_op_env root-state跨zone同dec，access，constructor()权限组初始化
***
* create_single_op_env root-state跨zone不同dec，access，dec_default()权限组
* create_single_op_env root-state跨zone不同dec，access，default()权限组
* create_single_op_env root-state跨zone不同dec，access，full()权限组
* create_single_op_env root-state跨zone不同dec，access，full_except_write()权限组
* create_single_op_env root-state跨zone不同decc，access，set_group_permission()权限组设定
* create_single_op_env root-state跨zone不同dec，access，set_group_permissions()权限组设定
* create_single_op_env root-state跨zone不同dec，access，make()权限组设定
* create_single_op_env root-state跨zone不同dec，access，constructor()权限组初始化
***
* create_single_op_env local_cache同zone同dec，access，dec_default()权限组
* create_single_op_env local_cache同zone同dec，access，default()权限组
* create_single_op_env local_cache同zone同dec，access，full()权限组
* create_single_op_env local_cache同zone同dec，access，full_except_write()权限组
* create_single_op_env local_cache同zone同dec，access，set_group_permission()权限组设定
* create_single_op_env local_cache同zone同dec，access，set_group_permissions()权限组设定
* create_single_op_env local_cache同zone同dec，access，make()权限组设定
* create_single_op_env local_cache同zone同dec，access，constructor()权限组初始化
***
* create_single_op_env local_cache同zone不同dec，access，dec_default()权限组
* create_single_op_env local_cache同zone不同dec，access，default()权限组
* create_single_op_env local_cache同zone不同dec，access，full()权限组
* create_single_op_env local_cache同zone不同dec，access，full_except_write()权限组
* create_single_op_env local_cache同zone不同dec，access，set_group_permission()权限组设定
* create_single_op_env local_cache同zone不同dec，access，set_group_permissions()权限组设定
* create_single_op_env local_cache同zone不同dec，access，make()权限组设定
* create_single_op_env local_cache同zone不同dec，access，constructor()权限组初始化
***
* create_single_op_env local_cache跨zone同dec，access，dec_default()权限组
* create_single_op_env local_cache跨zone同dec，access，default()权限组
* create_single_op_env local_cache跨zone同dec，access，full()权限组
* create_single_op_env local_cache跨zone同dec，access，full_except_write()权限组
* create_single_op_env local_cache跨zone同dec，access，set_group_permission()权限组设定
* create_single_op_env local_cache跨zone同dec，access，set_group_permissions()权限组设定
* create_single_op_env local_cache跨zone同dec，access，make()权限组设定
* create_single_op_env local_cache跨zone同dec，access，constructor()权限组初始化
***
* create_single_op_env local_cache跨zone不同dec，access，dec_default()权限组
* create_single_op_env local_cache跨zone不同dec，access，default()权限组
* create_single_op_env local_cache跨zone不同dec，access，full()权限组
* create_single_op_env local_cache跨zone不同dec，access，full_except_write()权限组
* create_single_op_env local_cache跨zone不同decc，access，set_group_permission()权限组设定
* create_single_op_env local_cache跨zone不同dec，access，set_group_permissions()权限组设定
* create_single_op_env local_cache跨zone不同dec，access，make()权限组设定
* create_single_op_env local_cache跨zone不同dec，access，constructor()权限组初始化
