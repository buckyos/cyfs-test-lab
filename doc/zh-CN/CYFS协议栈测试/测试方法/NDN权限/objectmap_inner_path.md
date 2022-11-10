
## NDN测试用例设计

### 相关接口
* SharedCyfsStack::NDNRequestor::put_data
* SharedCyfsStack::NDNRequestor::prepare_download_data
* SharedCyfsStack::NDNRequestor::get_data
* SharedCyfsStack::NDNRequestor::delete_data
* SharedCyfsStack::NDNRequestor::encode_query_file_request
* SharedCyfsStack::NDNRequestor::query_file

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

* get_data,chunk对象,同zone同dec,权限验证
* get_data,chunk对象,同zone不同dec,权限验证
* get_data,chunk对象,不同zone同dec,权限验证
* get_data,chunk对象,不同zone不同dec,权限验证
* get_data,chunk对象,同zone同dec,无req_path,权限验证
* get_data,chunk对象,同zone不同dec,无req_path,权限验证
* get_data,chunk对象,不同zone同dec,无req_path,权限验证
* get_data,chunk对象,不同zone不同dec,无req_path,权限验证
* get_data,chunk对象,同zone同dec,chunk,访问来源file,权限验证
* get_data,chunk对象,同zone不同dec,访问来源file,权限验证
* get_data,chunk对象,不同zone同dec,访问来源file,权限验证
* get_data,chunk对象,不同zone不同dec,访问来源file,权限验证
* get_data,chunk对象,同zone同dec,chunk,访问来源file,无req_path,传输权限验证
* get_data,chunk对象,同zone不同dec,访问来源file,无req_path,传输权限验证
* get_data,chunk对象,不同zone同dec,访问来源file,无req_path,传输权限验证
* get_data,chunk对象,不同zone不同dec,访问来源file,无req_path,传输权限验证
* get_data,chunk对象,同zone同dec,访问来源dir,权限验证
* get_data,chunk对象,同zone不同dec,访问来源dir,权限验证
* get_data,chunk对象,不同zone同dec,访问来源dir,权限验证
* get_data,chunk对象,不同zone不同dec,访问来源dir,权限验证
* get_data,chunk对象,同zone同dec,访问来源dir,无req_path,权限验证
* get_data,chunk对象,同zone不同dec,访问来源dir,无req_path,权限验证
* get_data,chunk对象,不同zone同dec,访问来源dir,无req_path,权限验证
* get_data,chunk对象,不同zone不同dec,访问来源dir,无req_path,权限验证
* get_data,chunk对象,同zone同dec,访问来源objectmap+inner_path,权限验证
* get_data,chunk对象,同zone不同dec,访问来源objectmap+inner_path,权限验证
* get_data,chunk对象,不同zone同dec,访问来源objectmap+inner_path,权限验证
* get_data,chunk对象,不同zone不同dec,访问来源objectmap+inner_path,权限验证
* get_data,chunk对象,同zone同dec,访问来源objectmap+inner_path,无req_path,传输权限验证
* get_data,chunk对象,同zone不同dec,访问来源objectmap+inner_path,无req_path,传输权限验证
* get_data,chunk对象,不同zone同dec,访问来源objectmap+inner_path,无req_path,传输权限验证
* get_data,chunk对象,不同zone不同dec,访问来源objectmap+inner_path,无req_path,传输权限验证
* get_data,file对象,同zone同dec,权限验证
* get_data,file对象,同zone不同dec,权限验证
* get_data,file对象,不同zone同dec,权限验证
* get_data,file对象,不同zone不同dec,权限验证
* get_data,file对象,同zone同dec,无req_path,权限验证
* get_data,file对象,同zone不同dec,无req_path,权限验证
* get_data,file对象,不同zone同dec,无req_path,权限验证
* get_data,file对象,不同zone不同dec,无req_path,权限验证
* get_data,同zone同dec,objectmap+inner_path,取出file，传输权限验证
* get_data,同zone不同dec,objectmap+inner_path,取出file，传输权限验证
* get_data,不同zone同dec,objectmap+inner_path,取出file，传输权限验证
* get_data,不同zone不同dec,objectmap+inner_path,取出file，传输权限验证
* * get_data,不同zone不同dec,objectmap+inner_path,取出file，无req_path,传输权限验证
* get_data,同zone同dec,objectmap+inner_path,取出dir，传输权限验证
* get_data,同zone不同dec,objectmap+inner_path,取出dir，传输权限验证
* get_data,不同zone同dec,objectmap+inner_path,取出dir，传输权限验证
* get_data,不同zone不同dec,objectmap+inner_path,取出dir，传输权限验证
* get_data,不同zone不同dec,objectmap+inner_path,取出dir，无req_path,传输权限验证