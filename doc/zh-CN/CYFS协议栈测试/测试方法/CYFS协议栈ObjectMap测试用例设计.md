## ObjectMap测试用例设计

### 相关接口:
* SharedCyfsStack::GlobalStateStub::get_current_root
* SharedCyfsStack::GlobalStateStub::get_dec_root
* SharedCyfsStack::GlobalStateStub::create_path_op_env
* SharedCyfsStack::GlobalStateStub::create_single_op_env
* SharedCyfsStack::SingleOpEnvStub::create_new
* SharedCyfsStack::SingleOpEnvStub::load
* SharedCyfsStack::SingleOpEnvStub::load_by_path
* SharedCyfsStack::SingleOpEnvStub::get_by_key
* SharedCyfsStack::SingleOpEnvStub::insert_with_key
* SharedCyfsStack::SingleOpEnvStub::set_with_key
* SharedCyfsStack::SingleOpEnvStub::remove_with_key
* SharedCyfsStack::SingleOpEnvStub::contains
* SharedCyfsStack::SingleOpEnvStub::insert
* SharedCyfsStack::SingleOpEnvStub::remove
* SharedCyfsStack::SingleOpEnvStub::get_current_root
* SharedCyfsStack::SingleOpEnvStub::update
* SharedCyfsStack::SingleOpEnvStub::commit
* SharedCyfsStack::SingleOpEnvStub::abort
* SharedCyfsStack::SingleOpEnvStub::next
* SharedCyfsStack::SingleOpEnvStub::reset
* SharedCyfsStack::SingleOpEnvStub::list
* SharedCyfsStack::SingleOpEnvStub::metadata
* SharedCyfsStack::PathOpEnvStub::lock
* SharedCyfsStack::PathOpEnvStub::try_lock
* SharedCyfsStack::PathOpEnvStub::lock_impl
* SharedCyfsStack::PathOpEnvStub::get_by_key
* SharedCyfsStack::PathOpEnvStub::create_new
* SharedCyfsStack::PathOpEnvStub::insert_with_key
* SharedCyfsStack::PathOpEnvStub::set_with_key
* SharedCyfsStack::PathOpEnvStub::remove_with_key
* SharedCyfsStack::PathOpEnvStub::get_by_path
* SharedCyfsStack::PathOpEnvStub::create_new_with_path
* SharedCyfsStack::PathOpEnvStub::insert_with_path
* SharedCyfsStack::PathOpEnvStub::set_with_path
* SharedCyfsStack::PathOpEnvStub::remove_with_path
* SharedCyfsStack::PathOpEnvStub::contains
* SharedCyfsStack::PathOpEnvStub::insert
* SharedCyfsStack::PathOpEnvStub::remove
* SharedCyfsStack::PathOpEnvStub::get_current_root
* SharedCyfsStack::PathOpEnvStub::update
* SharedCyfsStack::PathOpEnvStub::commit
* SharedCyfsStack::PathOpEnvStub::abort
* SharedCyfsStack::PathOpEnvStub::list
* SharedCyfsStack::PathOpEnvStub::metadata

### 测试点
#### 环境类型
* dec_app真机环境
* 模拟器环境

#### 设备类型
* OOD
* Device

#### 必填项
* 必填
* 非必填

#### target
* 指定target
* 未指定target
* target等于源设备
* target不等于源设备

#### 请求路径
* 空
* 非空
* 合法
* 非法

#### 语言类别
* cn,cn_t,en,jp,french,german,hanyu,xibanyayu,eyu,eyu,putaoyayu,yidaliyu,yuelanyu,yingninyu,alaboyu,taiyu


#### 编码格式
* "ASCII","UNICODE","UTF-8","UTF-16","GBK","GB18030","GB2312","ISO-8859-1"

#### 转义字符
*   \0	Null字符（\u0000）
*   \b	退格符（\u0008）
*   \t	水平制表符（\u0009）
*   \n	换行符（\u000A）
*   \v	垂直制表符（\u000B）
*   \f	换页符（\u000C）
*   \r	回车符（\u000D）
*   \"	双引号（\u0022）
*   \'	撇号或单引号（\u0027）
*   \\	反斜杠（\u005C）
*   \xXX	由 2 位十六进制数值 XX 指定的 Latin-1 字符
*   \uXXXX	由 4 位十六进制数值 XXXX 指定的 Unicode 字符
*   \XXX	由 1~3 位八进制数值（000 到 377）指定的 Latin-1 字符，可表示 256个 字符。如 \251 表示版本符号。注意，ECMAScript 3.0 不支持，考虑到兼容性不建议使用。

#### 特殊字符
* "","/"," "

#### Zone类型
* 同zone
* 跨zone

#### ACL配置
* 配置ACL可以访问
* 未配置ACL禁止访问

#### ObjectMap 类型
* MAP| insert_with_key,set_with_key,remove_with_key,get_by_key,update,commit
* Set| insert,remove,contains,update,commit

#### GlobalStateStub类型
* Local_cache
* root_state

#### OpEnvStub类型
* PathOpEnvStub
* SingleOpEnvStub

#### 加锁机制
* 乐观锁
* 悲观锁

#### path层级
* 同层path
* 子层path

### 测试用例
* 语言类别-Map数据获取-get_object_by_path 接口
* 语言类别-Map数据获取-list 接口
* 语言类别-Set数据获取-接口调用正常流程
* 语言类别-Set数据获取-接口调用正常流程
* 编码格式-Map数据获取-get_object_by_path 接口
* 编码格式-Map数据获取-list 接口
* 编码格式-Set数据获取-get_object_by_path 接口
* 编码格式-Set数据获取-list 接口
* 转义字符-Map数据获取-get_object_by_path 接口
* 转义字符-Map数据获取-list 接口
* 转义字符-Set数据获取-get_object_by_path 接口
* 转义字符-Set数据获取-list 接口
* 特殊字符-Map数据获取-get_object_by_path 接口
* 特殊字符-Map数据获取-list 接口
* 特殊字符-Set数据获取-get_object_by_path 接口
* 特殊字符-Set数据获取-list 接口
* unicode 字符随机测试100次-Map数据获取-get_object_by_path 接口
* unicode 字符随机测试100次-Map数据获取-list 接口
* unicode 字符随机测试100次-Set数据获取-get_object_by_path 接口
* unicode 字符随机测试100次-Set数据获取-list 接口
* ascii 字符 随机测试100次-Map数据获取-get_object_by_path 接口
* ascii 字符 随机测试100次-Map数据获取-list 接口
* ascii 字符 随机测试100次-Set数据获取-get_object_by_path 接口
* ascii 字符 随机测试100次-Set数据获取-list 接口
* op-env access 获取object_map-access 初始化方式-root_state_access-get_category接口-get_dec_id接口-get_object_by_path接口-list接口
* op-env access 获取object_map-access 初始化方式-root_state_access_stub-get_object_by_path接口-list接口
* op-env access 获取object_map-access 初始化方式-local_cache_access-get_category接口-get_dec_id接口-get_object_by_path接口-list接口
* op-env access 获取object_map-access 初始化方式-local_cache_access_stub-get_object_by_path接口-list接口
* op-env access 获取object_map-access 获取object_数据-Map数据获取-get_object_by_path接口-list接口
* op-env access 获取object_map-access 获取object_数据-Set数据获取-get_object_by_path接口-list接口
* op-env access 获取object_map-access 获取object_数据-权限路由机制-runtime发起操作-runtime发起操作从跨zone OOD-配置ACL 可以访问-get_object_by_path接口调用正常流程-list接口调用正常流程
* op-env access 获取object_map-access 获取object_数据-权限路由机制-runtime发起操作-runtime发起操作从跨zone OOD-未配置ACL 禁止访问 - get_object_by_path接口调用正常流程-list接口调用正常流程
* op-env access 获取object_map-access 获取object_数据-权限路由机制-runtime发起操作-runtime发起操作从跨zone device-配置ACL 可以访问 -get_object_by_path接口调用正常流程-list接口调用正常流程
* op-env access 获取object_map-access 获取object_数据-权限路由机制-runtime发起操作-runtime发起操作从跨zone device-未配置ACL 禁止访问 -get_object_by_path接口调用正常流程-list接口调用正常流程
* op-env access 获取object_map-access 获取object_数据-权限路由机制-主OOD 发起操作-OOD 发起操作从跨zone OOD-配置ACL可以访问-未配置ACL 禁止访问 -get_object_by_path接口调用正常流程-list接口调用正常流程、
* op-env access 获取object_map-access 获取object_数据-权限路由机制-主OOD 发起操作-OOD 发起操作从跨zone OOD-未配置ACL禁止访问-get_object_by_path接口调用正常流程-list接口调用正常流程
* op-env access 获取object_map-access 获取object_数据-权限路由机制-主OOD 发起操作-OOD 发起操作从跨zone device-配置ACL可以访问-get_object_by_path接口调用正常流程-list接口调用正常流程
* op-env access 获取object_map-access 获取object_数据-权限路由机制-主OOD 发起操作- OOD 发起操作从跨zone device未配置ACL禁止访问 -get_object_by_path接口调用正常流程-list接口调用正常流程
* op-env access 获取object_map-access 初始化方式-root_state_access-get_category接口-get_dec_id接口-get_object_by_path接口-list接口
* op-env access 获取object_map-access 初始化方式-root_state_access_stub-get_object_by_path接口-list接口
* op-env access 获取object_map-access 初始化方式-local_cache_access-get_category接口-get_dec_id接口-get_object_by_path接口-list接口
* op-env access 获取object_map-access 初始化方式-local_cache_access_stub-get_object_by_path接口-list接口
* op-env access 获取object_map-access 获取object_数据-Map数据获取-get_object_by_path接口-list接口
* op-env access 获取object_map-access 获取object_数据-Set数据获取-get_object_by_path接口-list接口
* op-env access 获取object_map-access 获取object_数据-权限路由机制-runtime发起操作-runtime发起操作从跨zone OOD-配置ACL 可以访问-get_object_by_path接口调用正常流程-list接口调用正常流程
* op-env access 获取object_map-access 获取object_数据-权限路由机制-runtime发起操作-runtime发起操作从跨zone OOD-未配置ACL 禁止访问 - get_object_by_path接口调用正常流程-list接口调用正常流程
* op-env access 获取object_map-access 获取object_数据-权限路由机制-runtime发起操作-runtime发起操作从跨zone device-配置ACL 可以访问 -get_object_by_path接口调用正常流程-list接口调用正常流程
* op-env access 获取object_map-access 获取object_数据-权限路由机制-runtime发起操作-runtime发起操作从跨zone device-未配置ACL 禁止访问 -get_object_by_path接口调用正常流程-list接口调用正常流程
* op-env access 获取object_map-access 获取object_数据-权限路由机制-主OOD 发起操作-OOD 发起操作从跨zone OOD-配置ACL可以访问-未配置ACL 禁止访问 -get_object_by_path接口调用正常流程-list接口调用正常流程、
* op-env access 获取object_map-access 获取object_数据-权限路由机制-主OOD 发起操作-OOD 发起操作从跨zone OOD-未配置ACL禁止访问-get_object_by_path接口调用正常流程-list接口调用正常流程
* op-env access 获取object_map-access 获取object_数据-权限路由机制-主OOD 发起操作-OOD 发起操作从跨zone device-配置ACL可以访问-get_object_by_path接口调用正常流程-list接口调用正常流程
* op-env access 获取object_map-access 获取object_数据-权限路由机制-主OOD 发起操作- OOD 发起操作从跨zone device未配置ACL禁止访问 -get_object_by_path接口调用正常流程-list接口调用正常流程
* op-env 操作object_map - PathOpEnvStub - Map相关接口操作 - insert_with_key 接口 - set_with_key 接口 - remove_with_key 接口 - get_by_key 接口 -commit 操作记录 -get_by_path 检查操作结果
* op-env 操作object_map - PathOpEnvStub - Set相关接口操作 - insert 接口 - remove 接口 - contains 接口 - contains 接口 - get_by_path 检查操作结果
* op-env 操作object_map - PathOpEnvStub - 通过path操作object_map - insert_with_path 接口 - set_with_path 接口 - remove_with_path 接口 - get_by_path 接口 - commit 操作记录 
* op-env 操作object_map - SingleOpEnvStub - Map相关接口操作 - insert_with_key 接口 - set_with_key 接口 - remove_with_key 接口 - get_by_key 接口 - commit 操作记录
* op-env 操作object_map - SingleOpEnvStub - Set相关接口操作 - insert 接口 - remove 接口 - contains 接口 - commit 操作记录
* op-env 操作object_map - SingleOpEnvStub - load() 加载object_map - 正常调用流程 obj_map_root 加载 - 正常调用流程 obj_map dec_root 加载 
* op-env 操作object_map - SingleOpEnvStub - load_by_path() 加载object_map - 正常调用流程
* op-env 操作object_map - SingleOpEnvStub - next遍历object_map - next遍历object_map 正常调用流程
* op-env 操作object_map - SingleOpEnvStub - metadata 遍历object_map - metadata遍历object_map 正常调用流程
* op-env 操作object_map - Local_cache/root_state区别-Local_cache 操作runtime-创建object_map操作数据流程
* op-env 操作object_map - Local_cache/root_state区别-Local_cache 操作主OOD-创建object_map操作数据流程
* op-env 操作object_map - Local_cache/root_state区别-Local_cache 操作从OOD-创建object_map操作数据流程
* op-env 操作object_map - Local_cache/root_state区别-root_state 操作runtime-创建object_map操作数据流程
* op-env 操作object_map - Local_cache/root_state区别-root_state 操作主OOD-创建object_map操作数据流程
* op-env 操作object_map - Local_cache/root_state区别-root_state 操作从OOD-创建object_map操作数据流程
* op-env 操作object_map - targrt路由权限控制-runtime发起操作-runtime发起操作本地
* op-env 操作object_map - targrt路由权限控制-runtime发起操作-runtime发起操作主OOD
* op-env 操作object_map - targrt路由权限控制-runtime发起操作-runtime发起操作从OOD
* op-env 操作object_map - targrt路由权限控制-runtime发起操作-runtime发起操作从device
* op-env 操作object_map - targrt路由权限控制-runtime发起操作-runtime发起操作从跨zone
* op-env 操作object_map - targrt路由权限控制-主OOD 发起操作-主OOD发起操作本地
* op-env 操作object_map - targrt路由权限控制-主OOD 发起操作-主OOD发起操作主OOD
* op-env 操作object_map - targrt路由权限控制-主OOD 发起操作-主OOD发起操作从OOD
* op-env 操作object_map - targrt路由权限控制-主OOD 发起操作-主OOD发起操作从device
* op-env 操作object_map - targrt路由权限控制-主OOD 发起操作-主OOD发起操作从跨zone
* op-env 操作object_map - targrt路由权限控制-从OOD 发起操作-主OOD发起操作本地
* op-env 操作object_map - targrt路由权限控制-从OOD 发起操作-主OOD发起操作主OOD
* op-env 操作object_map - targrt路由权限控制-从OOD 发起操作-主OOD发起操作从OOD
* op-env 操作object_map - targrt路由权限控制-从OOD 发起操作-主OOD发起操作从device
* op-env 操作object_map - targrt路由权限控制-从OOD 发起操作-主OOD发起操作从跨zone
* op-env 操作object_map-事务机制-事务执行之前object_map 数据校验
* op-env 操作object_map-事务机制-commit后object_map 数据校验
* op-env 操作object_map-事务机制-abort后object_map 数据校验
* op-env 操作object_map- lock机制 -乐观锁lock机制-乐观锁lock机制功能流程 - 父path校验
* op-env 操作object_map- lock机制 -乐观锁lock机制-乐观锁lock机制功能流程 - 同path校验
* op-env 操作object_map- lock机制 -乐观锁lock机制-乐观锁lock机制功能流程 - 子path校验
* op-env 操作object_map- lock机制 -乐观锁lock机制-乐观锁lock机制功能流程 - 兄弟path校验
* op-env 操作object_map- lock机制 -悲观锁try_lock机制-悲观锁try_lock机制功能流程 - 父path校验
* op-env 操作object_map- lock机制 -悲观锁try_lock机制-悲观锁try_lock机制功能流程 - 同path校验
* op-env 操作object_map- lock机制 -悲观锁try_lock机制-悲观锁try_lock机制功能流程 - 子path校验
* op-env 操作object_map- lock机制 -悲观锁try_lock机制-悲观锁try_lock机制功能流程 - 同级path校验
* op-env 初始化方式-SharedCyfsStack.root_state() 初始化op-env-get_category 接口测试-全部参数正常流程
* op-env 初始化方式-SharedCyfsStack.root_state() 初始化op-env-get_base_requestor 接口测试-全部参数正常流程
* op-env 初始化方式-SharedCyfsStack.root_state() 初始化op-env-get_dec_id 接口测试-全部参数正常流程
* op-env 初始化方式-SharedCyfsStack.root_state() 初始化op-env-get_current_root 接口测试-全部参数正常流程 RootStateRootType.Dec
* op-env 初始化方式-SharedCyfsStack.root_state() 初始化op-env-get_current_root 接口测试-全部参数正常流程 RootStateRootType.Global
* op-env 初始化方式-SharedCyfsStack.root_state() 初始化op-env-create_op_env 接口测试-全部参数正常流程-path-target为空
* op-env 初始化方式-SharedCyfsStack.root_state() 初始化op-env-create_op_env 接口测试-全部参数正常流程-path-target指定本地
* op-env 初始化方式-SharedCyfsStack.root_state() 初始化op-env-create_op_env 接口测试-全部参数正常流程-path-target指定其他device
* op-env 初始化方式-SharedCyfsStack.root_state() 初始化op-env-create_op_env 接口测试-全部参数正常流程-path-target指定主OOD
* op-env 初始化方式-SharedCyfsStack.root_state() 初始化op-env-create_op_env 接口测试-全部参数正常流程-path-target指定从OOD
* op-env 初始化方式-SharedCyfsStack.root_state() 初始化op-env-create_op_env 接口测试-全部参数正常流程-single-target为空
* op-env 初始化方式-SharedCyfsStack.root_state() 初始化op-env-create_op_env 接口测试-全部参数正常流程-single-target指定本地
* op-env 初始化方式-SharedCyfsStack.root_state() 初始化op-env-create_op_env 接口测试-全部参数正常流程-single-target指定其他device
* op-env 初始化方式-SharedCyfsStack.root_state() 初始化op-env-create_op_env 接口测试-全部参数正常流程-全部参数正常流程-single-target指定主OOD
* op-env 初始化方式-SharedCyfsStack.root_state() 初始化op-env-create_op_env 接口测试-全部参数正常流程-全部参数正常流程-single-target指定从OOD
* op-env 初始化方式-SharedCyfsStack.root_state_stub() 初始化op-env-get_current_root 接口测试-全部参数正常流程
* op-env 初始化方式-SharedCyfsStack.root_state_stub() 初始化op-get_dec_root 接口测试-全部参数正常流程
* op-env 初始化方式-SharedCyfsStack.root_state_stub() 初始化op-create_path_op_env 接口测试-全部参数正常流程-path-target为空
* op-env 初始化方式-SharedCyfsStack.root_state_stub() 初始化op-create_path_op_env 接口测试-全部参数正常流程-path-target指定本地
* op-env 初始化方式-SharedCyfsStack.root_state_stub() 初始化op-create_path_op_env 接口测试-全部参数正常流程-path-target指定其他device
* op-env 初始化方式-SharedCyfsStack.root_state_stub() 初始化op-create_path_op_env 接口测试-全部参数正常流程-path-target指定主OOD
* op-env 初始化方式-SharedCyfsStack.root_state_stub() 初始化op-create_path_op_env 接口测试-全部参数正常流程-path-target指定从OOD
* op-env 初始化方式-SharedCyfsStack.root_state_stub() 初始化op-create_single_op_env 接口测试-全部参数正常流程-single-target为空
* op-env 初始化方式-SharedCyfsStack.root_state_stub() 初始化op-create_single_op_env 接口测试-全部参数正常流程-single-target指定本地
* op-env 初始化方式-SharedCyfsStack.root_state_stub() 初始化op-create_single_op_env 接口测试-全部参数正常流程-single-target指定其他device
* op-env 初始化方式-SharedCyfsStack.root_state_stub() 初始化op-create_single_op_env 接口测试-全部参数正常流程-single-target指定主OOD
* op-env 初始化方式-SharedCyfsStack.root_state_stub() 初始化op-create_single_op_env 接口测试-全部参数正常流程-single-target指定从OOD
* op-env 初始化方式-SharedCyfsStack.local_cache() 初始化op-env-get_category 接口测试-全部参数正常流程
* op-env 初始化方式-SharedCyfsStack.local_cache() 初始化op-env-get_base_requestor 接口测试-全部参数正常流程
* op-env 初始化方式-SharedCyfsStack.local_cache() 初始化op-env-get_base_requestor 接口测试-get_dec_id 接口测试-全部参数正常流程
* op-env 初始化方式-SharedCyfsStack.local_cache() 初始化op-env-get_base_requestor 接口测试-get_current_root 接口测试-全部参数正常流程
* op-env 初始化方式-SharedCyfsStack.local_cache() 初始化op-env-get_base_requestor 接口测试-create_op_env 接口测试-全部参数正常流程-path-target为空
* op-env 初始化方式-SharedCyfsStack.local_cache() 初始化op-env-get_base_requestor 接口测试-create_op_env 接口测试-全部参数正常流程-path-target指定本地
* op-env 初始化方式-SharedCyfsStack.local_cache() 初始化op-env-get_base_requestor 接口测试-create_op_env 接口测试-全部参数正常流程-path-target指定其他device
* op-env 初始化方式-SharedCyfsStack.local_cache() 初始化op-env-get_base_requestor 接口测试-create_op_env 接口测试-全部参数正常流程-path-target指定主OOD
* op-env 初始化方式-SharedCyfsStack.local_cache() 初始化op-env-get_base_requestor 接口测试-create_op_env 接口测试-全部参数正常流程-path-target指定从OOD
* op-env 初始化方式-SharedCyfsStack.local_cache() 初始化op-env-get_base_requestor 接口测试-create_op_env 接口测试-全部参数正常流程-single-target为空
* op-env 初始化方式-SharedCyfsStack.local_cache() 初始化op-env-get_base_requestor 接口测试-create_op_env 接口测试-全部参数正常流程-single-target指定本地
* op-env 初始化方式-SharedCyfsStack.local_cache() 初始化op-env-get_base_requestor 接口测试-create_op_env 接口测试-全部参数正常流程-single-target指定其他device
* op-env 初始化方式-SharedCyfsStack.local_cache() 初始化op-env-get_base_requestor 接口测试-create_op_env 接口测试-全部参数正常流程-single-target指定主OOD
* op-env 初始化方式-SharedCyfsStack.local_cache() 初始化op-env-get_base_requestor 接口测试-create_op_env 接口测试-全部参数正常流程-single-target指定从OOD
* op-env 初始化方式-SharedCyfsStack.local_cache_stub() 初始化op-env-get_current_root 接口测试-全部参数正常流程
* op-env 初始化方式-SharedCyfsStack.local_cache_stub() 初始化op-env-get_dec_root 接口测试-全部参数正常流程
* op-env 初始化方式-SharedCyfsStack.local_cache_stub() 初始化op-env-create_path_op_env 接口测试-全部参数正常流程-path-target为空
* op-env 初始化方式-SharedCyfsStack.local_cache_stub() 初始化op-env-create_path_op_env 接口测试-全部参数正常流程-path-target指定本地
* op-env 初始化方式-SharedCyfsStack.local_cache_stub() 初始化op-env-create_path_op_env 接口测试-全部参数正常流程-path-target指定其他device
* op-env 初始化方式-SharedCyfsStack.local_cache_stub() 初始化op-env-create_path_op_env 接口测试-全部参数正常流程-path-target指定主OOD
* op-env 初始化方式-SharedCyfsStack.local_cache_stub() 初始化op-env-create_path_op_env 接口测试-全部参数正常流程-path-target指定从OOD
* op-env 初始化方式-SharedCyfsStack.local_cache_stub() 初始化op-env-create_single_op_env 接口测试-全部参数正常流程-single-target为空
* op-env 初始化方式-SharedCyfsStack.local_cache_stub() 初始化op-env-create_single_op_env 接口测试-全部参数正常流程-single-target指定本地
* op-env 初始化方式-SharedCyfsStack.local_cache_stub() 初始化op-env-create_single_op_env 接口测试-全部参数正常流程-single-target指定其他device
* op-env 初始化方式-SharedCyfsStack.local_cache_stub() 初始化op-env-create_single_op_env 接口测试-全部参数正常流程-single-target指定主OOD
* op-env 初始化方式-SharedCyfsStack.local_cache_stub() 初始化op-env-create_single_op_env 接口测试-全部参数正常流程-single-target指定从OOD
