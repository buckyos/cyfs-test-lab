## 协议栈模块划分

### cyfs-base
- name_object
- cyfs_base_object
- cyfs_core_object
- cyfs_dec_object
- cyfs_base_funtion
- crypto
- cyfs_cip

### cyfs-lib
- ACL
- crypto
- non
- ndn
- rmeta
- root_state
- router_handler
- trans
- util
- sync
- front

### OOD-System
- OOD_Daemon
    + 服务升级
    + 本地服务进程管理
    + 服务控制命令
- AppManager
    + DecApp的安装，状态管理
    + DecApp的保活管理
    + 可通过配置文件管理的功能
    + 内置官方AppList的安装

### TS-SDK-TOOL
- DecApp相关	创建
  + 发布
  + 修改
  + 导入身份
- OOD管理相关	激活
  + 生成
  + 上传
- 对象管理相关	
  + 对象Shell
  + get
  + del

## 测试用例目录分类

+ bug_verification : 线上BUG修复验证
    + cyfs_base
    + root_state
    + ndn

+ integration-test : 集成测试
    + 例如 ts<-->rust 间编解码
    + 例如 dec_app service/client 间交互模型，完成non 和 ndn 相关操作  

+ performance-test : 性能测试
    + disk : 磁盘满了场景测试
    + 例如 non、ndn 操作的性能
    + 例如 对象编解码的性能

+ regression-test : 回归测试用例

+ smoke-test : 冒烟测试用例

+ system-test : 功能测试
  + 对sdk 接口api 的正确性进行测试
  + 对接口使用场景功能进行测试
+ unit-test : 单元测试
  + ts-sdk 中目前只有cyfs_base 需要进行单元测试



