
# 用例两种环境

+ 模拟器环境 ：主要测试接口功能
+ 实验室环境 ：测试核心流程稳定性、性能，实际使用场景模拟

# 协议栈功能模块

## NameObject
对象类型：标准对象、核心对象、扩展对象

标准对象、核心对象
操作：
    对象实例化、对象编码、对象解码
语言类型：TS/Rust(Rust部分可以先设计测试用例，开始提供工具实现)

扩展对象：
CYFS 自定义数据类型 BuckyString 、BuckyNumber之类的

## util
 协议栈的工具类接口

## NON
    put_object/get_object/select_object/delete_object/post_object 的数据操作
    handler/ACl 的权限控制/动态ACL机器 filter表达式
    Zone 权限隔离
## NDN
    put_data / get_data
    ACL权限
## Trans
    publish file ,传输文件/文件夹流程
    Zone 权限隔离
    ACL权限

## ObjectMap
    ObjectMap 数据操作

## 主从OOD
    主从OOD的数据同步
    主从OOD切换流程

# 工具链的功能模块
## OOD Service 
    ood 安装、ood 开发者自己build、ood service 更新流程、OOD的各项配置
## app-manger
    app-manger 安装 卸载 更新 启动 停止 app,dec_app 运行两种模式，容器docker和windows
## ts-sdk
    cyfs dec_app项目创建、开发、发布部署 
