

# BDT网络协议测试用例

## 单元测试

+  [BDT使用案例](../../../../CYFS/src/component/cyfs-bdt/examples)
+  [BDT单元测试用例脚本](../../../../CYFS/src/component/cyfs-bdt/tests)


## 集成测试

+ [BDT Stream模块](./stream/BDT_Stream测试用例设计.md) ：Tunnel连接建立、Stream数据发送、FastQA流程。
+ [BDT NDN模块](./NDN/BDT_NDN传输数据测试用例.md)：Chunk/Chunk List/File/File Range/Dir 文件传输、ndn_event、双源传输、group、context、拥塞控制。 
+ [BDT Datagram 模块](./Datagram/BDT_Datagram传输数据测试用例.md)：Datagram 数据包收发、加解密
+ [BDT SN Server ](./SN/SN测试用例设计.md): SN Server 功能测试用例、性能测试用例
+ [BDT PN Server ]() : PN Server 功能测试用例、性能测试用例


## 版本发布回归测试

+ [版本发布回归测试用例](../../../../src/node-tester-app/testcase/)

## 发布版本计划

+ [0.7.3]()
+ [0.7.2]()
+ [历史版本功能]()


测试用例代码实现：
+ [BDT 测试客户端](../../../../src/bdt-cli)
+ [测试用例实现](../../../../src/node-tester-app/testcase/)



