
## NDN ACL测试用例设计

### 相关接口
* SharedCyfsStack::NDNRequestor::put_data
* SharedCyfsStack::TransRequestor::publish_file
* SharedCyfsStack::UtilRequestor::build_dir_from_object_map

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
* 空
* 非空
* 合法
* 非法

#### chunk对象
* 空chunk
* 非空chunk
* 已存在chunk
* 不存在chunk

#### 传输对象
* file
* chunk
* Dir

#### Zone类型
* 同zone
* 跨zone

#### 文件大小
* 0B
* 256B
* 2kB
* 2MB
* 4 Mb
* 256MB
* 1GB

#### 文件数量
* 1
* 10
* 100
* 1000
* 10000

#### chunk大小
* 1 MB
* 2 MB
* 8 MB
* 128 MB
  
#### 协议栈类型
* 同协议栈
* 跨协议栈
    
#### 测试点
* get_data,chunk目标对象,同zone同dec,权限验证
* get_data,chunk目标对象,同zone不同dec,权限验证
* get_data,chunk目标对象,不同zone同dec,权限验证
* get_data,chunk目标对象,不同zone不同dec,权限验证
* get_data,chunk目标对象，CYFS_REQUEST_FLAG_CHUNK_LEVEL_ACL开启，chunk_list权限验证

* get_data,chunk目标对象,同zone同dec,无req_path,权限验证
* get_data,chunk目标对象,同zone不同dec,无req_path,权限验证
* get_data,chunk目标对象,不同zone同dec,无req_path,权限验证
* get_data,chunk目标对象,不同zone不同dec,无req_path,权限验证

* get_data,chunk目标对象,同zone同dec,chunk,访问来源file,权限验证
* get_data,chunk目标对象,同zone不同dec,访问来源file,权限验证
* get_data,chunk目标对象,不同zone同dec,访问来源file,权限验证
* get_data,chunk目标对象,不同zone不同dec,访问来源file,权限验证
* get_data,chunk目标对象，访问来源file，CYFS_REQUEST_FLAG_CHUNK_LEVEL_ACL开启，chunk_list权限验证

* get_data,chunk目标对象,同zone同dec,chunk,访问来源file,无req_path,传输权限验证
* get_data,chunk目标对象,同zone不同dec,访问来源file,无req_path,传输权限验证
* get_data,chunk目标对象,不同zone同dec,访问来源file,无req_path,传输权限验证
* get_data,chunk目标对象,不同zone不同dec,访问来源file,无req_path,传输权限验证

* get_data,chunk目标对象,同zone同dec,访问来源dir,权限验证
* get_data,chunk目标对象,同zone不同dec,访问来源dir,权限验证
* get_data,chunk目标对象,不同zone同dec,访问来源dir,权限验证
* get_data,chunk目标对象,不同zone不同dec,访问来源dir,权限验证
* get_data,chunk目标对象，访问来源dir，CYFS_REQUEST_FLAG_CHUNK_LEVEL_ACL开启，chunk_list权限验证

* get_data,chunk目标对象,同zone同dec,访问来源dir,无req_path,权限验证
* get_data,chunk目标对象,同zone不同dec,访问来源dir,无req_path,权限验证
* get_data,chunk目标对象,不同zone同dec,访问来源dir,无req_path,权限验证
* get_data,chunk目标对象,不同zone不同dec,访问来源dir,无req_path,权限验证

* get_data,chunk目标对象,同zone同dec,访问来源objectmap+inner_path,权限验证
* get_data,chunk目标对象,同zone不同dec,访问来源objectmap+inner_path,权限验证
* get_data,chunk目标对象,不同zone同dec,访问来源objectmap+inner_path,权限验证
* get_data,chunk目标对象,不同zone不同dec,访问来源objectmap+inner_path,权限验证
* get_data,chunk目标对象，访问来源objectmap+inner_path，CYFS_REQUEST_FLAG_CHUNK_LEVEL_ACL开启，chunk_list权限验证

* get_data,chunk目标对象,同zone同dec,访问来源objectmap+inner_path,无req_path,传输权限验证
* get_data,chunk目标对象,同zone不同dec,访问来源objectmap+inner_path,无req_path,传输权限验证
* get_data,chunk目标对象,不同zone同dec,访问来源objectmap+inner_path,无req_path,传输权限验证
* get_data,chunk目标对象,不同zone不同dec,访问来源objectmap+inner_path,无req_path,传输权限验证

* get_data,file目标对象,同zone同dec,权限验证
* get_data,file目标对象,同zone不同dec,权限验证
* get_data,file目标对象不同zone同dec,权限验证
* get_data,file目标对象,不同zone不同dec,权限验证

* get_data,file目标对象,同zone同dec,无req_path,权限验证
* get_data,file目标对象,同zone不同dec,无req_path,权限验证
* get_data,file目标对象,不同zone同dec,无req_path,权限验证
* get_data,file目标对象,不同zone不同dec,无req_path,权限验证

* get_data,file目标对象,同zone同dec,访问来源objectmap+inner_path,权限验证
* get_data,file目标对象,同zone不同dec,访问来源objectmap+inner_path,权限验证
* get_data,file目标对象,不同zone同dec,访问来源objectmap+inner_path,权限验证
* get_data,file目标对象,不同zone不同dec,访问来源objectmap+inner_path,权限验证

* get_data,file目标对象,同zone同dec,访问来源objectmap+inner_path,无req_path,权限验证
* get_data,file目标对象,同zone不同dec,访问来源objectmap+inner_path,无req_path,权限验证
* get_data,file目标对象,不同zone同dec,访问来源objectmap+inner_path,无req_path,权限验证
* get_data,file目标对象,不同zone不同dec,访问来源objectmap+inner_path,无req_path,权限验证

* get_data,同zone同dec,objectmap+inner_path目标对象,传输权限验证
* get_data,同zone不同dec,objectmap+inner_path目标对象,传输权限验证
* get_data,不同zone同dec,objectmap+inner_path目标对象,传输权限验证
* get_data,不同zone不同dec,objectmap+inner_path目标对象,传输权限验证

* get_data,同zone同dec,objectmap+inner_path目标对象,无req_path,传输权限验证
* get_data,同zone不同dec,objectmap+inner_path目标对象,无req_path,传输权限验证
* get_data,不同zone同dec,objectmap+inner_path目标对象,无req_path,传输权限验证
* get_data,不同zone不同dec,objectmap+inner_path目标对象,无req_path,传输权限验证

* trans,chunk目标对象,同zone同dec,权限验证
* trans,chunk目标对象,同zone不同dec,权限验证
* trans,chunk目标对象,不同zone同dec,权限验证
* trans,chunk目标对象,不同zone不同dec,权限验证
* trans,chunk目标对象，CYFS_REQUEST_FLAG_CHUNK_LEVEL_ACL开启，chunk_list权限验证

* trans,chunk目标对象,同zone同dec,无req_path,权限验证
* trans,chunk目标对象,同zone不同dec,无req_path,权限验证
* trans,chunk目标对象,不同zone同dec,无req_path,权限验证
* trans,chunk目标对象,不同zone不同dec,无req_path,权限验证

* trans,chunk目标对象,同zone同dec,chunk,访问来源file,权限验证
* trans,chunk目标对象,同zone不同dec,访问来源file,权限验证
* trans,chunk目标对象,不同zone同dec,访问来源file,权限验证
* trans,chunk目标对象,不同zone不同dec,访问来源file,权限验证
* trans,chunk目标对象，访问来源file，CYFS_REQUEST_FLAG_CHUNK_LEVEL_ACL开启，chunk_list权限验证

* trans,chunk目标对象,同zone同dec,chunk,访问来源file,无req_path,传输权限验证
* trans,chunk目标对象,同zone不同dec,访问来源file,无req_path,传输权限验证
* trans,chunk目标对象,不同zone同dec,访问来源file,无req_path,传输权限验证
* trans,chunk目标对象,不同zone不同dec,访问来源file,无req_path,传输权限验证

* trans,chunk目标对象,同zone同dec,访问来源dir,权限验证
* trans,chunk目标对象,同zone不同dec,访问来源dir,权限验证
* trans,chunk目标对象,不同zone同dec,访问来源dir,权限验证
* trans,chunk目标对象,不同zone不同dec,访问来源dir,权限验证
* trans,chunk目标对象，访问来源dir，CYFS_REQUEST_FLAG_CHUNK_LEVEL_ACL开启，chunk_list权限验证

* trans,chunk目标对象,同zone同dec,访问来源dir,无req_path,权限验证
* trans,chunk目标对象,同zone不同dec,访问来源dir,无req_path,权限验证
* trans,chunk目标对象,不同zone同dec,访问来源dir,无req_path,权限验证
* trans,chunk目标对象,不同zone不同dec,访问来源dir,无req_path,权限验证

* trans,chunk目标对象,同zone同dec,访问来源objectmap+inner_path,权限验证
* trans,chunk目标对象,同zone不同dec,访问来源objectmap+inner_path,权限验证
* trans,chunk目标对象,不同zone同dec,访问来源objectmap+inner_path,权限验证
* trans,chunk目标对象,不同zone不同dec,访问来源objectmap+inner_path,权限验证
* trans,chunk目标对象，访问来源objectmap+inner_path，CYFS_REQUEST_FLAG_CHUNK_LEVEL_ACL开启，chunk_list权限验证

* trans,chunk目标对象,同zone同dec,访问来源objectmap+inner_path,无req_path,传输权限验证
* trans,chunk目标对象,同zone不同dec,访问来源objectmap+inner_path,无req_path,传输权限验证
* trans,chunk目标对象,不同zone同dec,访问来源objectmap+inner_path,无req_path,传输权限验证
* trans,chunk目标对象,不同zone不同dec,访问来源objectmap+inner_path,无req_path,传输权限验证

* trans,file目标对象,同zone同dec,权限验证
* trans,file目标对象,同zone不同dec,权限验证
* trans,file目标对象不同zone同dec,权限验证
* trans,file目标对象,不同zone不同dec,权限验证

* trans,file目标对象,同zone同dec,无req_path,权限验证
* trans,file目标对象,同zone不同dec,无req_path,权限验证
* trans,file目标对象,不同zone同dec,无req_path,权限验证
* trans,file目标对象,不同zone不同dec,无req_path,权限验证

* trans,file目标对象,同zone同dec,访问来源objectmap+inner_path,权限验证
* trans,file目标对象,同zone不同dec,访问来源objectmap+inner_path,权限验证
* trans,file目标对象,不同zone同dec,访问来源objectmap+inner_path,权限验证
* trans,file目标对象,不同zone不同dec,访问来源objectmap+inner_path,权限验证

* trans,file目标对象,同zone同dec,访问来源objectmap+inner_path,无req_path,权限验证
* trans,file目标对象,同zone不同dec,访问来源objectmap+inner_path,无req_path,权限验证
* trans,file目标对象,不同zone同dec,访问来源objectmap+inner_path,无req_path,权限验证
* trans,file目标对象,不同zone不同dec,访问来源objectmap+inner_path,无req_path,权限验证

* trans,同zone同dec,objectmap+inner_path目标对象,传输权限验证
* trans,同zone不同dec,objectmap+inner_path目标对象,传输权限验证
* trans,不同zone同dec,objectmap+inner_path目标对象,传输权限验证
* trans,不同zone不同dec,objectmap+inner_path目标对象,传输权限验证

* trans,同zone同dec,objectmap+inner_path目标对象,无req_path,传输权限验证
* trans,同zone不同dec,objectmap+inner_path目标对象,无req_path,传输权限验证
* trans,不同zone同dec,objectmap+inner_path目标对象,无req_path,传输权限验证
* trans,不同zone不同dec,objectmap+inner_path目标对象,无req_path,传输权限验证

* get_data，inner_path及referrer_object inner_path 增加非英文字符路径
* trans，inner_path及referrer_object inner_path 增加非英文字符路径

* PublishFile,common无dec_id，配置req_path与rmeta后，验证当前设备dec_id权限
* PublishDir,common无dec_id，配置req_path与rmeta后，验证当前设备dec_id权限
* build_dir_from_object_map,配置req_path与rmeta后，验证当前设备dec_id权限
