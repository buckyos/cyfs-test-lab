
## rmeta_object_meta测试用例设计

### 相关接口
* SharedCyfsStack::add_object_meta
* SharedCyfsStack::remove_object_meta
* SharedCyfsStack::clear_object_meta

### 测试点
#### 环境类型
* dec_app真机环境
* 模拟器环境

#### 必填项
* 必填
* 非必填

#### target
* 指定target
* 未指定target
* target等于源设备
* target不等于源设备

#### 设备类型
* OOD
* Device

#### 请求路径
* 非空
* 合法

#### Zone类型
* 同zone
* 跨zone

#### dec类型
*同dec
*不同dec

#### 协议栈类型
* 同协议栈
* 跨协议栈

#### 对象类型
* File

#### 对象类型编码
* 8

#### 时间条件
* object.create_time
* object.update_time
* object.expired_time
* noc.insert_time
* noc.update_time

#### 对象条件
* object.dec_id
* object.author
* object.owner



#### 测试点
  
* get_chunk, 对象类型表达式，cyfs.AccessString权限组，权限验证
* get_chunk, 对象类型编码表达式，cyfs.AccessString权限组，权限验证
* get_chunk, 时间条件表达式，cyfs.AccessString权限组，权限验证
* get_chunk, 其它条件表达式，cyfs.AccessString权限组，权限验证

* get_file, 对象类型表达式，cyfs.AccessString权限组，权限验证
* get_file, 对象类型编码表达式，cyfs.AccessString权限组，权限验证
* get_file, 时间条件表达式，cyfs.AccessString权限组，权限验证
* get_file, 其它条件表达式，cyfs.AccessString权限组，权限验证

* get_dir, 对象类型表达式，cyfs.AccessString权限组，权限验证
* get_dir, 对象类型编码表达式，cyfs.AccessString权限组，权限验证
* get_dir, 时间条件表达式，cyfs.AccessString权限组，权限验证
* get_dir, 其它条件表达式，cyfs.AccessString权限组，权限验证

* get_file，object_meta条件表达式与rpath_meta、object acl组合，权限验证



