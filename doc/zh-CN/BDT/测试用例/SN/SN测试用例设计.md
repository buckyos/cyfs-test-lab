## SN测试用例设计

SN 是BDT实现P2P网络NAT穿透的必要组件，主要功能在其他模块已进行覆盖，针对SN server端主要进行性能测试。

### SN内部实现功能
+ SNPing : 节点通过SNPing再SN上线，SN cache SNPing包信息
+ SNCall + SNCalled : SN 辅助进行NAT 穿透


### SN 统计

### SNPing 数据统计

+ Statistic_SNPing_IPv4_1000Devcie
```
操作步骤：
（1）构造1000个全新Device 初始化BDT协议栈同时在SN上线
（2）持续维持ping 一段时间
（3）监控SN的性能
```
+ Statistic_SNPing_IPv6_1000Devcie
```
（1）构造1000个全新Device 初始化BDT协议栈同时在SN上线
（2）持续维持ping 一段时间
（3）监控SN的性能
```
+ Statistic_SNPing_IPv4_10000Devcie
```
（1）构造10000个全新Device 初始化BDT协议栈同时在SN上线
（2）持续维持ping 一段时间
（3）监控SN的性能
```
+ Statistic_SNPing_Memory
```
（1）构造10000个全新Device 初始化BDT协议栈同时在SN上线
（2）持续维持ping 一段时间，离线。
（3）持续重复1、2步骤
（3）监控SN的内存能够正常释放
```
+ Statistic_SNPing_Delay
```
(1) 单元测试构造SNPing 网络延时100ms,SN 上线情况
(2) 单元测试构造SNPing 网络延时1000ms,SN 上线情况
(3) 单元测试构造SNPing 网络延时2000ms,SN 上线情况
(4) 单元测试构造SNPing 网络延时5000ms,SN 上线情况
(5) 统计SN 客户端、服务端错误类型
```

+ Statistic_SNPing_Drop
```
(1) 单元测试构造SNPing 网络丢包5%,SN 上线情况
(2) 单元测试构造SNPing 网络丢包10%,SN 上线情况
(3) 单元测试构造SNPing 网络丢包15%,SN 上线情况
(4) 单元测试构造SNPing 网络丢包20%,SN 上线情况
(5) 统计SN 客户端、服务端错误类型
```
+ Statistic_SNPing_Duplicate
```
(1) 单元测试构造SNPing 网络重复发包率5%,SN 上线情况
(2) 单元测试构造SNPing 网络重复发包率10%,SN 上线情况
(3) 单元测试构造SNPing 网络重复发包率15%,SN 上线情况
(4) 单元测试构造SNPing 网络重复发包率20%,SN 上线情况
(5) 统计SN 客户端、服务端错误类型
```
+ Statistic_SNPing_OutOfOrder
```
(1) 单元测试构造SNPing 网络数据包乱序5%,SN 上线情况
(2) 单元测试构造SNPing 网络数据包乱序5%,SN 上线情况
(3) 单元测试构造SNPing 网络数据包乱序5%,SN 上线情况
(4) 单元测试构造SNPing 网络数据包乱序5%,SN 上线情况
(5) 统计SN 客户端、服务端错误类型
```
+ Statistic_SNPing_Tamper
```
(1) 单元测试构造SNPing 网络数据包篡改5%,SN 上线情况
(1) 单元测试构造SNPing 网络数据包篡改10%,SN 上线情况
(1) 单元测试构造SNPing 网络数据包篡改15%,SN 上线情况
(1) 单元测试构造SNPing 网络数据包篡改20%,SN 上线情况
(5) 统计SN 客户端、服务端错误类型
```

### SNCall + SNCalled 数据统计

+ Statistic_SNCall_IPv4_Normal
```
操作步骤：
（1）使用IPv4 UDP 协议栈
（2）实验室所有机器NAT可以连通的机器进行全部组合进行连接
（3）统计连接成功率和SN统计数据
```
+ Statistic_SNCall_IPv4_Abnormal
```
操作步骤：
（1）使用IPv4 UDP 协议栈
（2）实验室所有机器NAT不可以连通的机器进行全部组合进行连接
（3）统计连接成功率和SN统计数据和错误日志
```
+ Statistic_SNCall_IPv4_TCP_Rersver
```
操作步骤：
（1）使用IPv4 TCP、UDP 协议栈，开启udp_sn_only
（2）实验室所有机器NAT不可以连通的机器进行全部组合进行连接
（3）统计连接成功率和SN统计数据和错误日志
```
+ Statistic_SNCall_IPv6_Normal
```
操作步骤：
（1）使用IPv6 UDP 协议栈
（2）实验室所有机器NAT可以连通的机器进行全部组合进行连接
（3）统计连接成功率和SN统计数据
```
+ Statistic_SNCall_Perf
```
操作步骤：
    (1) 实验室所有机器排列组合继续连接统计SN性能
    (2) 目前如果cache对端Device对象，不能删除cache,两个设备只有第一次连接会触发SNCall + SNCalled,后续进行专项测试
```
+ 原有所有实验室测试用例回归


### FastQA 大MTU
#### IPv4
+ FastQA_SNPing_BigPackage_IPv4
```
操作步骤：
    （1）构造大的Device对象在SN上线
    （2）SNPing包大小：2KB
    （3）SNPing包大小：10KB
    （4）SNPing包大小：25KB
    （5）SNPing包大小：35KB
     (6) 统计SN上线失败MTU包太大导致的错误类型
```
+ FastQA_SNcall_BigPackage_IPv4
```
操作步骤：
    （1）构造大的Device对象在SN上线，设备直接发起连接
    （2）SNCall包大小：2KB
    （3）SNCall包大小：10KB
    （4）SNCall包大小：25KB
    （5）SNCall包大小：35KB
     (6) 统计SN上线失败MTU包太大导致的错误类型
```

+ FastQA_SNcalled_BigPackage_IPv4
```
操作步骤：
    （1）构造大的Device对象在SN上线，设备直接发起连接
    （2）SNCall包大小：2KB
    （3）SNCall包大小：10KB
    （4）SNCall包大小：25KB
    （5）SNCall包大小：35KB
     (6) 统计SN上线失败MTU包太大导致的错误类型
```
+ FastQA_Quetion_MaxDataSize_TCP_IPv4
```
操作步骤：
    (1)Device直接建立连接，在Syn和Ack过程中完成首次数据发送，FastQA机制
    (2)使用TCP协议，设置Quetion 100Byte
    (3)使用TCP协议，设置Quetion 1000Byte
    (4)使用TCP协议，设置Quetion 5000Byte
    (5)使用TCP协议，设置Quetion 25KB
    (6)使用TCP协议，设置Quetion 25KB + 1Byte,超出最大限制出现报错
```
+ FastQA_Answer_MaxDataSize_TCP_IPv4
```
操作步骤：
    (1)Device直接建立连接，在Syn和Ack过程中完成首次数据发送，FastQA机制
    (2)使用TCP协议，设置Answer 100Byte
    (3)使用TCP协议，设置Answer 1000Byte
    (4)使用TCP协议，设置Answer 5000Byte
    (5)使用TCP协议，设置Answer 25KB
    (6)使用TCP协议，设置Answer 25KB + 1Byte,超出最大限制出现报错
```
+ FastQA_Quetion_MaxDataSize_UDP_IPv4
```
操作步骤：
    (1)Device直接建立连接，在Syn和Ack过程中完成首次数据发送，FastQA机制
    (2)使用UDP协议，设置Quetion 100Byte
    (3)使用UDP协议，设置Quetion 1000Byte
    (4)使用UDP协议，设置Quetion 5000Byte
    (5)使用UDP协议，设置Quetion 25KB
    (6)使用UDP协议，设置Quetion 25KB + 1Byte,超出最大限制出现报错
```
+ FastQA_Answer_MaxDataSize_UDP_IPv4
```
操作步骤：
    (1)Device直接建立连接，在Syn和Ack过程中完成首次数据发送，FastQA机制
    (2)使用UDP协议，设置Answer 100Byte
    (3)使用UDP协议，设置Answer 1000Byte
    (4)使用UDP协议，设置Answer 5000Byte
    (5)使用UDP协议，设置Answer 25KB
    (6)使用UDP协议，设置Answer 25KB + 1Byte,超出最大限制出现报错
```
#### IPv6
+ FastQA_SNPing_BigPackage_IPv6
```
操作步骤：
    （1）构造大的Device对象在SN上线
    （2）SNPing包大小：2KB
    （3）SNPing包大小：10KB
    （4）SNPing包大小：25KB
    （5）SNPing包大小：35KB
     (6) 统计SN上线失败MTU包太大导致的错误类型
```
+ FastQA_SNcall_BigPackage_IPv6
```
操作步骤：
    （1）构造大的Device对象在SN上线，设备直接发起连接
    （2）SNCall包大小：2KB
    （3）SNCall包大小：10KB
    （4）SNCall包大小：25KB
    （5）SNCall包大小：35KB
     (6) 统计SN上线失败MTU包太大导致的错误类型
```

+ FastQA_SNcalled_BigPackage_IPv6
```
操作步骤：
    （1）构造大的Device对象在SN上线，设备直接发起连接
    （2）SNCall包大小：2KB
    （3）SNCall包大小：10KB
    （4）SNCall包大小：25KB
    （5）SNCall包大小：35KB
     (6) 统计SN上线失败MTU包太大导致的错误类型
```
+ FastQA_Quetion_MaxDataSize_TCP_IPv6
```
操作步骤：
    (1)Device直接建立连接，在Syn和Ack过程中完成首次数据发送，FastQA机制
    (2)使用TCP协议，设置Quetion 100Byte
    (3)使用TCP协议，设置Quetion 1000Byte
    (4)使用TCP协议，设置Quetion 5000Byte
    (5)使用TCP协议，设置Quetion 25KB
    (6)使用TCP协议，设置Quetion 25KB + 1Byte,超出最大限制出现报错
```
+ FastQA_Answer_MaxDataSize_TCP_IPv6
```
操作步骤：
    (1)Device直接建立连接，在Syn和Ack过程中完成首次数据发送，FastQA机制
    (2)使用TCP协议，设置Answer 100Byte
    (3)使用TCP协议，设置Answer 1000Byte
    (4)使用TCP协议，设置Answer 5000Byte
    (5)使用TCP协议，设置Answer 25KB
    (6)使用TCP协议，设置Answer 25KB + 1Byte,超出最大限制出现报错
```
+ FastQA_Quetion_MaxDataSize_UDP_IPv6
```
操作步骤：
    (1)Device直接建立连接，在Syn和Ack过程中完成首次数据发送，FastQA机制
    (2)使用UDP协议，设置Quetion 100Byte
    (3)使用UDP协议，设置Quetion 1000Byte
    (4)使用UDP协议，设置Quetion 5000Byte
    (5)使用UDP协议，设置Quetion 25KB
    (6)使用UDP协议，设置Quetion 25KB + 1Byte,超出最大限制出现报错
```
+ FastQA_Answer_MaxDataSize_UDP_IPv6
```
操作步骤：
    (1)Device直接建立连接，在Syn和Ack过程中完成首次数据发送，FastQA机制
    (2)使用UDP协议，设置Answer 100Byte
    (3)使用UDP协议，设置Answer 1000Byte
    (4)使用UDP协议，设置Answer 5000Byte
    (5)使用UDP协议，设置Answer 25KB
    (6)使用UDP协议，设置Answer 25KB + 1Byte,超出最大限制出现报错
```

#### 大MTU丢包场景劣化验证
+ 问题原因
```
网络协议IP层最大MTU 一般为1500Bytes
如果BDT数据包为14700Bytes(假设10个IP包发送)，网络丢包率为10%
那么BDT时间成功率为90% 的10次方=34.9%，丢包率为65.1%
主要验证在低丢包率，BDT的大MTU机制下能正常运行，但不保证丢包率超过一定概率后能成功
```
+ FastQA_Package20KB_TCP_Drop2
```
测试环境：
    TCP丢包率2%
操作步骤:
    (1)Device 使用TCP建立连接，完成FastQA，且Question和Answer数据大小为20KB
    (2)统计完成的时间，和出错的日志
```
+ FastQA_Package20KB_TCP_Drop5
```
测试环境：
    TCP丢包率5%
操作步骤:
    (1)Device 使用TCP建立连接，完成FastQA，且Question和Answer数据大小为20KB
    (2)统计完成的时间，和出错的日志
```
+ FastQA_Package20KB_TCP_Drop10
```
测试环境：
    TCP丢包率10%
操作步骤:
    (1)Device 使用TCP建立连接，完成FastQA，且Question和Answer数据大小为20KB
    (2)统计完成的时间，和出错的日志
```
+ FastQA_Package20KB_UDP_Drop2
```
测试环境：
    UDP丢包率2%
操作步骤:
    (1)Device 使用UDP建立连接，完成FastQA，且Question和Answer数据大小为20KB
    (2)统计完成的时间，和出错的日志
```
+ FastQA_Package20KB_UDP_Drop5
```
测试环境：
    UDP丢包率5%
操作步骤:
    (1)Device 使用UDP建立连接，完成FastQA，且Question和Answer数据大小为20KB
    (2)统计完成的时间，和出错的日志
```
+ FastQA_Package20KB_UDP_Drop10
```
测试环境：
    UDP丢包率10%
操作步骤:
    (1)Device 使用UDP建立连接，完成FastQA，且Question和Answer数据大小为20KB
    (2)统计完成的时间，和出错的日志
```
### SN压力测试

#### SNPing 性能测试
```
机器性能：
SN 2核4线程 4G内存 带宽1000Mbps
操作步骤：
(1) 实验室测试节点启动多个BDT协议栈，自动在SN上线。
(2) 统计sn online 成功率和耗时。
观测数据：
(1) 在线节点数增加时，节点 sn online 能否成功。
(2) 在线节点数增加时，节点 sn online 时间是否正常。
(3) 在线节点数增加时，SN 服务器 内存增长，cpu利用率。
(4) 在线节点数量稳定时，长期维持ping时，SN 服务器 内存增长，cpu利用率。
(5) 统计SN能承载最大的在线节点数。
```

#### SNCall + SNCalled 性能测试

```
机器性能：
SN 2核4线程 4G内存 带宽1000Mbps
操作步骤：
(1) 实验室测试节点启动多个BDT协议栈，自动在SN上线。
(2) BDT 协议栈节点通过SN发起连接,对SNCall + SNCalled打洞流程，测试SN性能。
观测数据：
(1) 节点间的连接成功率，连接耗时。
(2) SN 服务器 内存增长，cpu利用率。
(3) 统计SN 支持SNCall + SNCalled 进行NAT穿透的最大并发数
```
