ACL 测试用例设计说明
=======
一、用例概述
--------
    场景说明：覆盖以下操作传入必带参数的主流程以及可选参数的验证
    * access
    * access+action
    * access+action+res
    * access+action+group
    * 动态ACL-acces="handler"


用例路径：src\cyfs-stack-test-typescript\TestSuite\unitest_NON_ACL
该模块测试场景当前依赖模拟器环境实现并运行


### 1、access
* access 参数设置为accept
* access 参数设置为reject
* access 参数设置为drop
* access 参数设置为pass , 第二个符合规则ACL为Accept
### 2、access+action
* in-${operation} 指定某操作类型的入栈
	* put-object
	* get-object
	* post-object
	* delete-object
	* select-object
	* put-data
	* get-data
	* delete-data
	* sign
	* verify 其中又定义了一些基础的类别
	* get，包括get-data和get-object
	* put，包括了put-data和put-object
	* delete，包括了delete-data和delete-object
	* read，包括了所有的读操作: get, select, verify
	* write，包括了所有的写操作：put，post，sign，delete
* in-* 所有的入栈操作
* out-${operation}  指定某操作类型的出栈
* out-* 所有的出栈操作
* “*”所有的action操作
* *-${operation}    指定某操作类型的包括入栈和出栈

### 3、access+action+res
* 路径树 出栈 target_device_id 参数正则匹配 设置accept
* 路径树 出栈 target_device_id 参数正则匹配 设置reject
* 路径树 出栈 dec_id 参数正则匹配 设置accept
* 路径树 出栈 dec_id 参数正则匹配 设置reject
* 路径树 出栈 req_path 参数正则匹配 设置accept
* 路径树 出栈 req_path 参数正则匹配 设置reject
* 路径树 出栈 object_id 参数正则匹配 设置accept
* 路径树 出栈 object_id 参数正则匹配 设置reject
* 路径树 入栈 dec_id 参数正则匹配 设置accept
* 路径树 入栈 dec_id 参数正则匹配 设置reject
* 路径树 入栈 req_path 参数正则匹配 设置accept
* 路径树 入栈 req_path 参数正则匹配 设置reject
* 路径树 入栈 object_id 参数正则匹配 设置accept
* 路径树 入栈 object_id 参数正则匹配 设置reject
* standard类型对象匹配 设置accept
* standard类型对象匹配 设置reject
* core类型对象匹配 设置accept
* 类型树 core类型对象匹配 设置reject
* 类型树 dec_app类型对象匹配 设置accept
* 类型树 dec_app类型对象匹配 设置reject

### 4、access+action+group
* location 请求的来源 inner 设置accept 在同zone 内进行操作
* location 请求的来源 inner 设置accept 跨zone进行操作
* location 请求的来源 inner 设置reject 在同zone 内进行操作
* location 请求的来源 outer  设置accept 跨zone进行操作
* location 请求的来源 outer  设置accept 同zone进行操作
* location 请求的来源 outer  设置reject 跨zone进行操作
* location为*匹配任意请求
* protocol的过滤- native 同进程本地接口直接发起的调用
* protocol的过滤- meta 和meta链交互发起的调用   
* protocol的过滤- sync 内置的sync机制发起的调用
* protocol的过滤- http-bdt 基于bdt-stream协议的跨协议栈NON调用
* protocol的过滤- http-local 本地同协议栈RCP调用
* protocol的过滤- data-bdt 基于bdt-chunk协议的跨协议栈NDN调用
* protocol的过滤- remote 远程调用，包括meta,http-bdt,data-bdt
* protocol的过滤- local 本地调用，包括http-local
* protocol的过滤- *  任意请求
* zone内请求location为inner+${protocol}+decid
* zone外请求location为outer+${protocol}+decid


### 5、其他
* 无配置文件，使用内置默认配置，将禁止跨zone操作
* 配置文件中没有一条匹配成功则默认access为reject
* 配置文件中多条可匹配按顺序有一条匹配成功即返回
* 匹配文件中有多条规则，能匹配成功的不在第一条，失败的不会返回错误












