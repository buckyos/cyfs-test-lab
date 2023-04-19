## BDT Tunnel 测试用例设计
    Tunnel是BDT中最底层的传输单元，Tunnel可能是一个TCP或者UDP连接，BDT中Tunnel建立并没有暴露对外使用的API,通常是在Stream和NDN建立连接的过程中建立Tunnel连接，针对Tunnel的测试我们基于Stream进行
### BDT Stream内部实现功能

#### 1. Stream 功能
+ StreamListenerGuard::incoming : BDT Stack 启动监听，接收其他节点连接请求
+ StreamManager::connect BDT Stack 发起连接
+ StreamIncoming::next : BDT Stack 读取StreamListener的监听请求
+ StreamGuard::confirm : StreamListener接收到连接请求进行confirm
+ StreamGuard::write_all ： StreamGuard 发送数据 
+ StreamGuard::read ：读取StreamGuard 接收数据
+ FristQA机制 : 连接过程中question、answer数据包发送
+ BDT Stream 和 Tunnel 配置
```
tunnel: tunnel::Config {
    retain_timeout: Duration::from_secs(60),
    connect_timeout: Duration::from_secs(5),
    tcp: tunnel::tcp::Config {
        connect_timeout: Duration::from_secs(5), 
        confirm_timeout: Duration::from_secs(5), 
        accept_timeout: Duration::from_secs(5), 
        retain_connect_delay: Duration::from_secs(5), 
        ping_interval: Duration::from_secs(30), 
        ping_timeout: Duration::from_secs(60), 
        package_buffer: 100, 
        piece_buffer: 1000, 
        piece_interval: Duration::from_millis(10), 
    }, 
    udp: tunnel::udp::Config {
        holepunch_interval: Duration::from_millis(200),
        connect_timeout: Duration::from_secs(5),
        ping_interval: Duration::from_secs(30),
        ping_timeout: Duration::from_secs(60 * 3),
    },
},
stream: stream::Config {
    listener: stream::listener::Config { backlog: 100 },
    stream: stream::container::Config {
        nagle: Duration::from_millis(0),
        recv_buffer: 1024 * 256,
        recv_timeout: Duration::from_millis(200),
        drain: 0.5,
        send_buffer: 1024 * 256, // 这个值不能小于下边的max_record
        connect_timeout: Duration::from_secs(5),
        tcp: stream::tcp::Config {
            min_record: 1024,
            max_record: 2048,
        },
        package: stream::package::Config {
            connect_resend_interval: Duration::from_millis(100),
            atomic_interval: Duration::from_millis(1),
            break_overtime: Duration::from_secs(60),
            msl: Duration::from_secs(60), 
            cc: cc::Config {
                init_rto: Duration::from_secs(1),
                min_rto: Duration::from_millis(200),
                cc_impl: cc::ImplConfig::BBR(Default::default()),
            },
        },
    },
},
```
#### 2. Tunnel 类型
+ cyfs_bdt::tunnel::tcp::Tunnel
+ cyfs_bdt::tunnel::udp::Tunnel


#### 3. Tunnel 选择策略：
+ 优先使用第一个建立连接Tunnel

#### 4. Tunnel Endpoint组合
+ EP 字段组合
    + W/L : W直接进行直连，L通过SN建立连接
    + 4/6 : IP 协议类型 IPv4 IPv6,同种协议才尝试建立连接
    + tcp/udp : 同种协议才尝试建立连接
  
#### 5. 连接方式：
+ Direct：如果LN设备已知RN设备的Device 对象，如果RN的Device 对象包括有效的EP字段，可以通过直连建立连接
+ SN：如果LN设备已知RN设备的Device 对象，但不知道RN的有效EP,通过SN建立连接
+ PN 主动代理、被动代理
#### 6. 连接流程：
+ 首次连接
+ 二次连接流程
+ 反向建立连接

#### 7. 连接迁移？
QUIC HTTP3 有实现连接迁移，网络协议栈本身网络变化，可以保证连接不中断，主要在移动端设备中流量和wifi的切换是一种常态化需求
BDT 中协议栈使用的PeerId是不变的，理论上应该可以实现


#### 8. 连接关闭
+ LN 端关闭连接
+ RN 端关闭连接
+ LN BDT协议栈关闭
+ RN BDT协议栈关闭

#### 9. 连接端口分配原则
+ LN->RN 发起连接 : Connect1(LN EP(IPA:Port1) -> RN EP(IPA:Port1)) ,Connect2(LN EP(IPA:Port2) -> RN EP(IPA:Port1)) 
+ RN->LN 发起连接: Connect1(RN EP(IPA:Port1) -> LN EP(IPA:Port1)) ,Connect2(RN EP(IPA:Port2) -> LN EP(IPA:Port1)) 


#### 10. 最大连接数限制
+ tcp 65535
+ udp 65535

#### 11. StreamGuard 数据发送
+ 接口
  + StreamGuard::read
  + StreamGuard::write_all 
+ 效率
  +  发送效率 = 发送数据大小/所有包数据大小 
  +  发送速度 = 发送数据大小/发送时间
+ 数据一致性检查：发送的数据和接收的数据hash值校验
  
#### 12. StreamGuard 数据发送方向
+ LN -> RN
+ RN -> LN
+ LN -> RN 和 RN -> LN 同时进行

#### 12. StreamGuard FristQA 机制
+ Syn包无question , Ack 包无 answer
+ Syn包有question , Ack 包无 answer
+ Syn包无question , Ack 包有 answer
+ Syn包有question , Ack 包有 answer
  
#### 13. StreamGuard FristQA 案例
+ LN Syn包question包含所有发送数据，RN Ack 包 回复响应数据一个包发送完成
+ LN Syn包question包含所有发送数据，RN Ack 包 回复响应数据，响应数据大于MTU值，RN通过StreamGuard::write 发送其他响应包数据
+ LN 发送数据大于MTU值 Syn包question发送请求部分内容，Ack 包不回复answer,  LN通过StreamGuard::write 发送其他响应包数据
+ LN 发送数据大于MTU值 Syn包question发送请求部分内容, RN 未解析完整请求数据如何做响应？

#### 14. StreamGuard FristQA 发送方式
+ 首次连接 通过SN
+ 首次连接 直连
+ 首次连接 通过PN
+ 二次连接 直连
+ 二次连接 通过PN
+ 二次连接 反向建立连接

#### 15. StreamGuard FristQA 发送数据大小限制
+ question最大值 = MTU - BDT SYN 包头部大小
+ answer最大值 = MTU - BDT ACK 包头部大小

#### 16. StreamGuard 数据发送的拥塞控制
+ 慢启动算法性能
+ 拥塞避免算法性能
+ 快重传算法性能
+ 快恢复算法性能
#### 17. StreamGuard 数据拥塞场景构造
+ 1-1 单个LN - 单个RN 建立多个连接，每个连接并发双向发送数据 
+ 1-n 单个LN - 多个RN 建立多个连接，每个连接并发双向发送数据 
+ n-1 多个LN - 单个RN 建立多个连接，每个连接并发双向发送数据 
+ n-n 多个LN - 多个RN 建立多个连接，每个连接并发双向发送数据 


### 协议栈运行环境影响因素 

#### 1. IP层协议:
+ IPv4
+ IPv6

#### 2. NAT 类型：
+ 公网IP
+ 公网IP + 端口映射
+ Full Cone NAT 
+ Restricted Cone NAT
+ Port Restricted Cone NAT
+ Symmetric NAT 

通过SN服务BDT协议理论上，不同NAT环境机器间建立UDP Tunnel的连通性

| LN NAT/RN NAT            | Public IP | Full Cone NAT | Restricted Cone NAT | Port Restricted Cone NAT | Symmetric NAT |
| ------------------------ | --------- | ------------- | ------------------- | ------------------------ | ------------- |
| Public IP                | 成功      | 成功        | 成功              | 成功                   | 成功        |
| Full Cone NAT            | 成功      | 成功        | 成功              | 成功                   | 成功        |
| Restricted Cone NAT      | 成功      | 成功        | 成功              | 成功                   | 成功        |
| Port Restricted Cone NAT | 成功      | 成功        | 成功              | 成功                   | 失败        |
| Symmetric NAT            | 成功      | 成功        | 成功              | 失败                   | 失败        |


通过SN服务BDT协议理论上，不同NAT环境机器间建立TCP Tunnel的连通性
| LN NAT/RN NAT            | Public IP | Full Cone NAT | Restricted Cone NAT | Port Restricted Cone NAT | Symmetric NAT |
| ------------------------ | --------- | ------------- | ------------------- | ------------------------ | ------------- |
| Public IP                | 成功      | 成功        | 成功              | 成功                   | 成功        |
| Full Cone NAT            | 成功      | 失败        | 失败              | 失败                   | 失败        |
| Restricted Cone NAT      | 成功      | 失败        | 失败              | 失败                   | 失败        |
| Port Restricted Cone NAT | 成功      | 失败        | 失败              | 失败                   | 失败        |
| Symmetric NAT            | 成功      | 失败        | 失败              | 失败                   | 失败        |



#### 3. 运行机器操作系统
+ Win7/Win10/Win11/Windows server
+ Centos/Ubuntu/Debin
+ MacOS
+ IOS/Android

#### 4. CPU 类型
+ 不同CPU 指令集对协议兼容性

#### 5. 网络类型
+ 有线信号 : 宽带
+ 无线信号-Wi-Fi : WIFI wifi4/wifi5/wifi6 
+ 无线信号-LTE协议:  4G/5G

#### 6. MTU 值
+ LN MTU = RN MTU
+ LN MTU > RN MTU
+ LN MTU < RN MTU

### Stream基础测试用例操作流程
+ （1）LN/RN 初始化本地BDT协议栈
+ （2）LN 向 RN 发起首次连接，LN->RN发送1M大小stream 数据，RN->LN发送1M大小stream 数据,关闭连接
+ （3）LN 向 RN 发起二次连接，LN->RN发送1M大小stream 数据，RN->LN发送1M大小stream 数据,关闭连接
+ （4）RN 向 LN 发起反向连接，LN->RN发送1M大小stream 数据，RN->LN发送1M大小stream 数据,关闭连接
+  (5) 关闭所有连接

### 统计测试数据项
+ connect_time : 连接时间
+ file_size : stream 发送的数据大小
+ send_time : stream 发送数据耗时
+ LN_hash : stream 发送数据原始数据的hash
+ RN_hash : stream 接收数据的hash

### Tunnel 连接测试用例
#### IPV4 协议
##### UDP Tunnel 建立连接流程
###### Direct

+ Connect_IPV4_UDPTunnel_direct_effectiveEP_WAN
```
前置条件：
    （1）LN/RN 设备不使用SN
    （2）LN/RN 设备UDP网络可以正常使用
操作步骤：
    连接Stream基础测试用例操作流程
测试节点数据限制：
    (1) RN 有公网IP
    (2) LN/RN 初始化BDT协议栈时只使用IPv4和UDP协议 EP
    (2) LN 节点知道 RN Device 中的 公网IP EP
预期结果：
    所有满足条件节点组合连接成功
```

+ Connect_IPV4_UDPTunnel_direct_effectiveEP_LAN
 
```
前置条件：
    （1）LN/RN 设备不使用SN
    （2）LN/RN 设备UDP网络可以正常使用
     (3) LN/RN 设备在同一局域网中
操作步骤：
    连接Stream基础测试用例操作流程
测试节点数据限制：
    (1) LN/RN 初始化BDT协议栈时只使用IPv4和UDP协议 EP
    (2) LN 节点知道 RN Device 中的 局域网IP EP
预期结果：
    所有满足条件节点组合连接成功
```


+ Connect_IPV4_UDPTunnel_direct_effectiveEP_AbnormalNAT 

```
前置条件：
    （1）LN/RN 设备不使用SN
    （2）LN/RN 设备UDP网络可以正常使用
     (3) RN 设备在NAT下，LN无法直连 
操作步骤：
    连接Stream基础测试用例操作流程
测试节点数据限制：
    (1) LN/RN 初始化BDT协议栈时只使用IPv4和UDP协议 EP
    (2) LN 节点知道 RN Device 中的 局域网IP EP
预期结果：
    连接失败，返回错误码：
```  



###### Connect By SN:
+ Connect_IPV4_UDPTunnel_SN_invalidEP
```
前置条件：
    （1）LN/RN 使用同一个SN
    （2）LN/RN 设备UDP网络可以正常使用
操作步骤：
    连接Stream基础测试用例操作流程
测试节点数据限制：
    (1) LN/RN 初始化BDT协议栈时只使用IPv4和UDP协议 EP
    (2) LN 节点知道 RN Device 中的EP 已失效
预期结果：
    (1)符合P2P NAT穿透理论规则
    
```
+ Connect_IPV4_UDPTunnel_SN_EmptyEP
```
前置条件：
    （1）LN/RN 使用同一个SN
    （2）LN/RN 设备UDP网络可以正常使用
操作步骤：
    连接Stream基础测试用例操作流程
测试节点数据限制：
    (1) LN/RN 初始化BDT协议栈时只使用IPv4和UDP协议 EP
    (2) LN 节点知道 RN Device 中的EP 为空
预期结果：
    (1)符合P2P NAT穿透理论规则
    
```

##### TCP Tunnel 建立连接流程

###### Direct

+ Connect_IPV4_TCPTunnel_direct_effectiveEP_WAN
```
前置条件：
    （1）LN/RN 设备不使用SN
    （2）LN/RN 设备TCP网络可以正常使用
操作步骤：
    连接Stream基础测试用例操作流程
测试节点数据限制：
    (1) RN 有公网IP
    (2) LN/RN 初始化BDT协议栈时只使用IPv4和TCP协议 EP
    (2) LN 节点知道 RN Device 中的 公网IP EP
预期结果：
    (1) 所有满足条件节点组合连接成功
```

+ Connect_IPV4_TCPTunnel_direct_effectiveEP_LAN
 
```
前置条件：
    （1）LN/RN 设备不使用SN
    （2）LN/RN 设备TCP网络可以正常使用
     (3) LN/RN 设备在同一局域网中
操作步骤：
    连接Stream基础测试用例操作流程
测试节点数据限制：
    (1) LN/RN 初始化BDT协议栈时只使用IPv4和TCP协议 EP
    (2) LN 节点知道 RN Device 中的 局域网IP EP
预期结果：
    (1) 所有满足条件节点组合连接成功
```

+ Connect_IPV4_TCPTunnel_direct_effectiveEP_AbnormalNAT 

```
前置条件：
    （1）LN/RN 设备不使用SN
    （2）LN/RN 设备TCP网络可以正常使用
     (3) RN 设备在NAT下，LN无法直连 
操作步骤：
    连接Stream基础测试用例操作流程
测试节点数据限制：
    (1) LN/RN 初始化BDT协议栈时只使用IPv4和TCP协议 EP
    (2) LN 节点知道 RN Device 中的 局域网IP EP
预期结果：
    (1) 连接失败，返回错误码：
```  

###### Connect By SN:
+ Connect_IPV4_TCPTunnel_SN_invalidEP
```
前置条件：
    （1）LN/RN 使用同一个SN
    （2）LN/RN 设备TCP网络可以正常使用
操作步骤：
    连接Stream基础测试用例操作流程
测试节点数据限制：
    (1) LN/RN 初始化BDT协议栈时只使用IPv4和TCP协议 EP
    (2) LN 节点知道 RN Device 中的EP 已失效
预期结果：
    (1)符合P2P NAT穿透理论规则
    
```
+ Connect_IPV4_TCPTunnel_SN_EmptyEP
```
前置条件：
    （1）LN/RN 使用同一个SN
    （2）LN/RN 设备TCP网络可以正常使用
操作步骤：
    连接Stream基础测试用例操作流程
测试节点数据限制：
    (1) LN/RN 初始化BDT协议栈时只使用IPv4和TCP协议 EP
    (2) LN 节点知道 RN Device 中的EP 为空
预期结果：
    (1)符合P2P NAT穿透理论规则
    
```

+ Connect_IPV4_TCPTunnel_SN_TCPReverse
```
前置条件：
    （1）LN/RN 使用同一个SN
    （2）LN/RN 设备TCP网络可以正常使用
     (3) RN 设备使用UDP协议在SN上线
操作步骤：
    连接Stream基础测试用例操作流程
测试节点数据限制：
    (1) LN/RN 初始化BDT协议栈时只使用IPv4和TCP协议 EP
    (2) LN 节点知道 RN Device 中的EP 为空
预期结果：
    (1)符合P2P NAT穿透理论规则
    
```

#### IPV6 协议测试用例
##### UDP Tunnel 建立连接流程

###### Direct:
+ Connect_IPV6_UDPTunnel_direct_effectiveEP
```
前置条件：
    （1）LN/RN 未使用SN
    （2）LN/RN 设备UDP网络可以正常使用
     (3) LN/RN 拥有可用IPV6网络
操作步骤：
    连接Stream基础测试用例操作流程
测试节点数据限制：
    (1) LN/RN 初始化BDT协议栈时只使用IPv6和UDP协议 EP
    (2) LN 节点知道 RN Device 中的EP 
预期结果：
    (1) 连接成功
    
```

######  Connect By SN:

+ Connect_IPV6_UDPTunnel_SN_invalidEP

```
前置条件：
    （1）LN/RN 使用相同SN
    （2）LN/RN 设备UDP网络可以正常使用
     (3) LN/RN 拥有可用IPV6网络
操作步骤：
    连接Stream基础测试用例操作流程
测试节点数据限制：
    (1) LN/RN 初始化BDT协议栈时只使用IPv6和UDP协议 EP
    (2) LN 节点知道 RN Device 中的EP 无效
预期结果：
    (1) 连接成功
    
```

+ Connect_IPV6_UDPTunnel_SN_EmptyEP

```
前置条件：
    （1）LN/RN 使用相同SN
    （2）LN/RN 设备UDP网络可以正常使用
     (3) LN/RN 拥有可用IPV6网络
操作步骤：
    连接Stream基础测试用例操作流程
测试节点数据限制：
    (1) LN/RN 初始化BDT协议栈时只使用IPv6和UDP协议 EP
    (2) LN 节点知道 RN Device 中的EP 为空
预期结果：
    (1) 连接成功    
```

##### TCP Tunnel 建立连接流程

###### Direct:
+ Connect_IPV6_TCPTunnel_direct_effectiveEP
```
前置条件：
    （1）LN/RN 不使用SN
    （2）LN/RN 设备TCP网络可以正常使用
     (3) LN/RN 拥有可用IPV6网络
操作步骤：
    连接Stream基础测试用例操作流程
测试节点数据限制：
    (1) LN/RN 初始化BDT协议栈时只使用IPv6和TCP协议 EP
    (2) LN 节点知道 RN Device 中有效的EP
预期结果：
    (1) 连接成功    
```

###### Connect By SN:

+ Connect_IPV6_TCPTunnel_SN_invalidEP
```
前置条件：
    （1）LN/RN 使用相同SN
    （2）LN/RN 设备TCP网络可以正常使用
     (3) LN/RN 拥有可用IPV6网络
操作步骤：
    连接Stream基础测试用例操作流程
测试节点数据限制：
    (1) LN/RN 初始化BDT协议栈时只使用IPv6和TCP协议 EP
    (2) LN 节点知道 RN Device 中无效的EP
预期结果：
    (1) 连接成功    
```
+ Connect_IPV6_TCPTunnel_SN_EmptyEP

```
前置条件：
    （1）LN/RN 使用相同SN
    （2）LN/RN 设备TCP网络可以正常使用
     (3) LN/RN 拥有可用IPV6网络
操作步骤：
    连接Stream基础测试用例操作流程
测试节点数据限制：
    (1) LN/RN 初始化BDT协议栈时只使用IPv6和TCP协议 EP
    (2) LN 节点知道 RN Device 中的EP为空
预期结果：
    (1) 连接成功    
```

#### 端口映射

+ Connect_IPV4_UDPTunnel_PortMap_direct
```
前置条件：
    （1）LN/RN 设备不使用SN
    （2）LN/RN 设备UDP网络可以正常使用
     (3) RN 设备路由器有公网IP，且配置端口映射
操作步骤：
    连接Stream基础测试用例操作流程
测试节点数据限制：
    (1) RN 有公网IP
    (2) LN/RN 初始化BDT协议栈时只使用IPv4和UDP协议 EP
    (2) LN 节点知道 RN Device 中的 公网IP EP
预期结果：
    所有满足条件节点组合连接成功
```

+ Connect_IPV4_UDPTunnel_PortMap_SN
```
前置条件：
    （1）LN/RN 设备使用相同SN
    （2）LN/RN 设备UDP网络可以正常使用
     (3) LN/RN 设备其中一个路由器有公网IP，且配置端口映射
操作步骤：
    连接Stream基础测试用例操作流程
测试节点数据限制：
    (1) LN/RN 初始化BDT协议栈时只使用IPv4和UDP协议
预期结果：
    所有满足条件节点组合连接成功
```

+ Connect_IPV4_TCPTunnel_PortMap_direct
```
前置条件：
    （1）LN/RN 设备不使用SN
    （2）LN/RN 设备TCP网络可以正常使用
     (3) RN 设备路由器有公网IP，且配置端口映射
操作步骤：
    连接Stream基础测试用例操作流程
测试节点数据限制：
    (1) RN 有公网IP
    (2) LN/RN 初始化BDT协议栈时只使用IPv4和TCP协议 EP
    (2) LN 节点知道 RN Device 中的 公网IP EP
预期结果：
    所有满足条件节点组合连接成功
```

+ Connect_IPV4_TCPTunnel_PortMap_SN
```
前置条件：
    （1）LN/RN 设备使用相同SN
    （2）LN/RN 设备TCP网络可以正常使用
     (3) LN/RN 设备其中一个路由器有公网IP，且配置端口映射
操作步骤：
    连接Stream基础测试用例操作流程
测试节点数据限制：
    (1) LN/RN 初始化BDT协议栈时只使用IPv4和TCP协议
预期结果：
    所有满足条件节点组合连接成功
```



#### 多链路选择
    当前使用优先建立连接的Tunnel作为连接，TCP优先

###### 整体连通性测试

+ Connect_AllEP_TunnelSelect
 ```
前置条件：
    （1）LN/RN 同时使用IPv4/IPv6、TCP/UDP 协议EP
操作步骤：
    连接Stream基础测试用例操作流程
测试节点数据限制：
    (1) 所有机器组合
预期结果：
    (1) 符合P2P NAT穿透
```

+ Connect_AllEP_TunnelSelect_PN
 ```
前置条件：
    （1）LN/RN 同时使用IPv4/IPv6、TCP/UDP 协议EP
    （2）NAT3 设备使用PN
操作步骤：
    连接Stream基础测试用例操作流程
测试节点数据限制：
    (1) 所有机器组合
预期结果：
    (1) 全部连接成功
```

###### 端口分配规则测试
+ Connect_Endpoint_Port_TCP_direct
 ```
前置条件：
    （1）LN/RN 同时使用TCP 协议EP
操作步骤：
    (1) LN向RN发起10次连接
    (2) RN向LN发起10次连接
    (3) 检查连接的EP端口分配
测试节点数据限制：
    (1) 节点使用TCP直连
预期结果：
    (1) 全部连接成功
    (2) 每个连接LN和RN的EP符合预期
```
+ Connect_Endpoint_Port_TCP_SN
 ```
前置条件：
    （1）LN/RN 同时使用TCP 协议EP
操作步骤：
    (1) LN向RN发起10次连接
    (2) RN向LN发起10次连接
    (3) 检查连接的EP端口分配
测试节点数据限制：
    (1) 节点使用TCP 通过SN建立连接
预期结果：
    (1) 全部连接成功
    (2) 每个连接LN和RN的EP符合预期
```

+ Connect_Endpoint_Port_UDP_direct
 ```
前置条件：
    （1）LN/RN 同时使用UDP 协议EP
操作步骤：
    (1) LN向RN发起10次连接
    (2) RN向LN发起10次连接
    (3) 检查连接的EP端口分配
测试节点数据限制：
    (1) 节点使用UDP直连
预期结果：
    (1) 全部连接成功
    (2) 每个连接LN和RN的EP符合预期
```

+ Connect_Endpoint_Port_UDP_SN
 ```
前置条件：
    （1）LN/RN 同时使用UDP 协议EP
操作步骤：
    (1) LN向RN发起10次连接
    (2) RN向LN发起10次连接
    (3) 检查连接的EP端口分配
测试节点数据限制：
    (1) 节点使用UDP通过SN连接
预期结果：
    (1) 全部连接成功
    (2) 每个连接LN和RN的EP符合预期
```
###### 最大连接数测试

+ Connect_Max_TCPConnection
 ```
前置条件：
    （1）LN/RN 同时使用TCP 协议EP
操作步骤：
    (1) LN向RN发起65535次连接
测试节点数据限制：
    (1) 节点使用TCP直连
预期结果：
    (1) 理论最大连接数 65535
```
+ Connect_Max_UDPConnection
 ```
前置条件：
    （1）LN/RN 同时使用UDP协议EP
操作步骤：
    (1) LN向RN发起65535次连接
测试节点数据限制：
    (1) 节点使用UDP直连
预期结果：
    (1) 理论最大连接数 65535
```

### FristQA

##### FristQA发送机制
+ Connect_FristQA_TCP_direct
```
前置条件：
    （1）LN/RN 同时使用TCP协议EP
     (2) LN 可以直连RN
操作步骤：
    (1) LN向RN发起连接，Sync 包question 带有100字节数据
测试节点数据限制：
    (1) LN向RN发起首次连接，LN Sync 包question 带有100字节数据 ,RN ACK包 answer带有100字节数据
    (2) LN向RN发起二次连接，LN Sync 包question 带有100字节数据 ,RN ACK包 answer带有100字节数据
    (3) RN向LN发起反向连接，RN Sync 包question 带有100字节数据 ,LN ACK包 answer带有100字节数据
预期结果：
    (1) LN 连接RN成功，连接过程中实现首次数据包发送
```
+ Connect_FristQA_TCP_SN
```
前置条件：
    （1）LN/RN 同时使用TCP协议EP
操作步骤：
    (1) LN向RN发起连接，Sync 包question 带有100字节数据
测试节点数据限制：
    (1) 节点使用TCP通过SN连接
预期结果：
    (1) LN向RN发起首次连接，LN Sync 包question 带有100字节数据 ,RN ACK包 answer带有100字节数据
    (2) LN向RN发起二次连接，LN Sync 包question 带有100字节数据 ,RN ACK包 answer带有100字节数据
    (3) RN向LN发起反向连接，RN Sync 包question 带有100字节数据 ,LN ACK包 answer带有100字节数据
```
+ Connect_FristQA_UDP_direct
 ```
前置条件：
    （1）LN/RN 同时使用UDP协议EP
     (2) LN 可以直连RN
操作步骤：
    (1) LN向RN发起首次连接，LN Sync 包question 带有100字节数据 ,RN ACK包 answer带有100字节数据
    (2) LN向RN发起二次连接，LN Sync 包question 带有100字节数据 ,RN ACK包 answer带有100字节数据
    (3) RN向LN发起反向连接，RN Sync 包question 带有100字节数据 ,LN ACK包 answer带有100字节数据
测试节点数据限制：
    (1) 节点使用UDP直连
预期结果：
    (1) LN 连接RN成功，连接过程中实现首次数据包发送
```
+ Connect_FristQA_UDP_SN
```
前置条件：
    （1）LN/RN 同时使用UDP协议EP
操作步骤：
    (1) LN向RN发起首次连接，LN Sync 包question 带有100字节数据 ,RN ACK包 answer带有100字节数据
    (2) LN向RN发起二次连接，LN Sync 包question 带有100字节数据 ,RN ACK包 answer带有100字节数据
    (3) RN向LN发起反向连接，RN Sync 包question 带有100字节数据 ,LN ACK包 answer带有100字节数据
测试节点数据限制：
    (1) 节点使用UDP通过SN连接
预期结果：
    (1) LN 连接RN成功，连接过程中实现首次数据包发送
```
##### FristQA数据包大小
+ Connect_FristQA_TCP_PackageSize_question
 ```
前置条件：
    （1）LN/RN 同时使用TCP协议EP
     (2) LN 可以直连RN
操作步骤：
    (1) LN向RN发起首次连接，LN Sync 包question 带有100字节数据 ,RN ACK包 answer带有100字节数据
    (2) LN向RN发起二次连接，LN Sync 包question 带有MTU-BDT_head_szie-1字节数据 ,RN ACK包 answer带有MTU-BDT_head_szie-1字节数据
    (3) LN向RN发起二次连接，LN Sync 包question 带有MTU-BDT_head_szie字节数据 ,RN ACK包 answer带有MTU-BDT_head_szie字节数据
    (4) LN向RN发起二次连接，LN Sync 包question 带有MTU-BDT_head_szie+1字节数据 ,RN ACK包 answer带有MTU-BDT_head_szie字节数据
    (5) LN向RN发起二次连接，LN Sync 包question 带有MTU-BDT_head_szie字节数据 ,RN ACK包 answer带有MTU-BDT_head_szie+1字节数据
测试节点数据限制：
    (1) 节点使用TCP直连
预期结果：
    (1) LN 连接RN成功，连接过程中实现首次数据包发送
```
+ Connect_FristQA_TCP_PackageSize_answer
 ```
前置条件：
    （1）LN/RN 同时使用TCP协议EP
     (2) LN 可以直连RN
操作步骤：
    (1) LN向RN发起首次连接，LN Sync 包question 带有100字节数据 ,RN ACK包 answer带有100字节数据
    (2) LN向RN发起二次连接，LN Sync 包question 带有MTU-BDT_head_szie-1字节数据 ,RN ACK包 answer带有MTU-BDT_head_szie-1字节数据
    (3) LN向RN发起二次连接，LN Sync 包question 带有MTU-BDT_head_szie字节数据 ,RN ACK包 answer带有MTU-BDT_head_szie字节数据
    (4) LN向RN发起二次连接，LN Sync 包question 带有MTU-BDT_head_szie+1字节数据 ,RN ACK包 answer带有MTU-BDT_head_szie字节数据
    (5) LN向RN发起二次连接，LN Sync 包question 带有MTU-BDT_head_szie字节数据 ,RN ACK包 answer带有MTU-BDT_head_szie+1字节数据
测试节点数据限制：
    (1) 节点使用TCP直连
预期结果：
    (1) LN 连接RN成功，连接过程中实现首次数据包发送
```
+ Connect_FristQA_UDP_PackageSize_question
 ```
前置条件：
    （1）LN/RN 同时使用UDP协议EP
     (2) LN 可以直连RN
操作步骤：
    (1) LN向RN发起首次连接，LN Sync 包question 带有100字节数据 ,RN ACK包 answer带有100字节数据
    (2) LN向RN发起二次连接，LN Sync 包question 带有MTU-BDT_head_szie-1字节数据 ,RN ACK包 answer带有MTU-BDT_head_szie-1字节数据
    (3) LN向RN发起二次连接，LN Sync 包question 带有MTU-BDT_head_szie字节数据 ,RN ACK包 answer带有MTU-BDT_head_szie字节数据
    (4) LN向RN发起二次连接，LN Sync 包question 带有MTU-BDT_head_szie+1字节数据 ,RN ACK包 answer带有MTU-BDT_head_szie字节数据
    (5) LN向RN发起二次连接，LN Sync 包question 带有MTU-BDT_head_szie字节数据 ,RN ACK包 answer带有MTU-BDT_head_szie+1字节数据
测试节点数据限制：
    (1) 节点使用UDP直连
预期结果：
    (1) LN 连接RN成功，连接过程中实现首次数据包发送
```
+ Connect_FristQA_UDP_PackageSize_answer
 ```
前置条件：
    （1）LN/RN 同时使用UDP协议EP
     (2) LN 可以直连RN
操作步骤：
    (1) LN向RN发起首次连接，LN Sync 包question 带有100字节数据 ,RN ACK包 answer带有100字节数据
    (2) LN向RN发起二次连接，LN Sync 包question 带有MTU-BDT_head_szie-1字节数据 ,RN ACK包 answer带有MTU-BDT_head_szie-1字节数据
    (3) LN向RN发起二次连接，LN Sync 包question 带有MTU-BDT_head_szie字节数据 ,RN ACK包 answer带有MTU-BDT_head_szie字节数据
    (4) LN向RN发起二次连接，LN Sync 包question 带有MTU-BDT_head_szie+1字节数据 ,RN ACK包 answer带有MTU-BDT_head_szie字节数据
    (5) LN向RN发起二次连接，LN Sync 包question 带有MTU-BDT_head_szie字节数据 ,RN ACK包 answer带有MTU-BDT_head_szie+1字节数据
测试节点数据限制：
    (1) 节点使用UDP直连
预期结果：
    (1) LN 连接RN成功，连接过程中实现首次数据包发送
```
##### FristQA数据实际使用模式
+ Stream_FristQA_QuestionAllData_AnswerAllData
```
前置条件：
    （1）LN/RN 同时使用UDP、TCP协议EP
操作步骤：
    (1) LN向RN发起首次连接，LN Sync 包question 带有len=100 100字节数据 ,
    (2) RN 监听器收到连接请求，RN解析成功后 len = question长度  进行响应 ACK包 answer带有len=100 100字节数据
测试节点数据限制：
    (1) 节点能够通过BDT建立连接
预期结果：
    (1) LN 连接RN成功，连接过程中实现首次数据包发送
```
+ Stream_FristQA_QuestionPartData
```
前置条件：
    （1）LN/RN 同时使用UDP、TCP协议EP
操作步骤：
    (1) LN向RN发起首次连接，LN Sync 包question 带有len=1024*1024 800字节数据 ,
    (2) RN 监听器收到连接请求，RN解析成功后 len > question长度 ,进行响应 ACK包 不带answer,等待继续接收数据
    (3) LN 连接成功后，继续发送剩余1024*1024-800字节数据内容
    (4) RN 接收数据全部成功
测试节点数据限制：
    (1) 节点能够通过BDT建立连接
预期结果：
    (1) LN 连接RN成功，连接过程中实现首次数据包发送
```

+ Stream_FristQA_QuestionAllData_AnswerPartData
```
前置条件：
    （1）LN/RN 同时使用UDP、TCP协议EP
操作步骤：
    (1) LN向RN发起首次连接，LN Sync 包question 带有len=100,100字节数据 
    (2) RN 监听器收到连接请求，RN解析成功后 len = question长度  进行响应 ACK包 answer带len=1024*1024 800字节数据
    (3) LN 接收剩余1024*1024-800字节数据内容 
测试节点数据限制：
    (1) 节点能够通过BDT建立连接
预期结果：
    (1) LN 连接RN成功，连接过程中实现首次数据包发送
```
#### 连接关闭

##### 连接主动关闭

+ Connect_Close_TCP_RNClose
```
前置条件：
    (1) LN 和 RN使用TCP EP建立连接成功
操作步骤：
    (1) LN向RN发起连接
    (2) LN向RN发送1M大小数据
    (3) RN发起关闭连接操作
    (4) LN向RN发送1M大小数据 
预期结果：
    (1) 连接关闭后，LN发送数据失败，返回对应错误码
```
+ Connect_Close_TCP_LNClose
```
前置条件：
    (1) LN 和 RN使用TCP EP建立连接成功
操作步骤：
    (1) LN向RN发起连接
    (2) LN向RN发送1M大小数据
    (3) LN发起关闭连接操作
    (4) RN向LN发送1M大小数据 
预期结果：
    (1) 连接关闭后，RN发送数据失败，返回对应错误码
```
+ Connect_Close_UDP_RNClose
```
前置条件：
    (1) LN 和 RN使用UDP EP建立连接成功
操作步骤：
    (1) LN向RN发起连接
    (2) LN向RN发送1M大小数据
    (3) RN发起关闭连接操作
    (4) LN向RN发送1M大小数据 
预期结果：
    (1) 连接关闭后，LN发送数据失败，返回对应错误码
```
+ Connect_Close_UDP_LNClose
```
前置条件：
    (1) LN 和 RN使用UDP EP建立连接成功
操作步骤：
    (1) LN向RN发起连接
    (2) LN向RN发送1M大小数据
    (3) LN发起关闭连接操作
    (4) RN向LN发送1M大小数据 
预期结果：
    (1) 连接关闭后，RN发送数据失败，返回对应错误码
```
##### BDT协议栈离线
+ Connect_Close_TCP_RNUnlive
```
前置条件：
    (1) LN 和 RN使用TCP EP建立连接成功
操作步骤：
    (1) LN向RN发起连接
    (2) LN向RN发送1M大小数据
    (3) RN BDT协议栈离线
    (4) LN向RN发送1M大小数据 
预期结果：
    (1) 连接关闭后，LN发送数据失败，返回对应错误码
```
+ Connect_Close_TCP_LNUnlive
```
前置条件：
    (1) LN 和 RN使用TCP EP建立连接成功
操作步骤：
    (1) LN向RN发起连接
    (2) LN向RN发送1M大小数据
    (3) LN BDT协议栈离线
    (4) RN向LN发送1M大小数据 
预期结果：
    (1) 连接关闭后，RN发送数据失败，返回对应错误码
```
+ Connect_Close_UDP_RNUnlive
```
前置条件：
    (1) LN 和 RN使用UDP EP建立连接成功
操作步骤：
    (1) LN向RN发起连接
    (2) LN向RN发送1M大小数据
    (3) RN BDT协议栈离线
    (4) LN向RN发送1M大小数据 
预期结果：
    (1) 连接关闭后，LN发送数据失败，返回对应错误码
```
+ Connect_Close_UDP_LNUnlive
```
前置条件：
    (1) LN 和 RN使用UDP EP建立连接成功
操作步骤：
    (1) LN向RN发起连接
    (2) LN向RN发送1M大小数据
    (3) LN BDT协议栈离线
    (4) RN向LN发送1M大小数据 
预期结果：
    (1) 连接关闭后，RN发送数据失败，返回对应错误码
```






### Stream
+ Stream_TCPTunnel_dataSize
```
前置条件：
    （1）LN/RN 网络可以基于TCP建立连接
操作步骤：
     (1) LN 和 RN 建立T连接
     (2) 发送1字节有效数据
     (3) 发送500字节有效数据
     (4) 发送1500字节有效数据
     (4) 发送10MB有效数据
预期结果：
    (1) 数据发送成功
```
+ Stream_TCPTunnel_dataMaxSize
```
前置条件：
    （1）LN/RN 网络可以基于TCP建立连接
操作步骤：
     (1) LN 和 RN 建立T连接
     (2) 发送2GB有效数据
预期结果：
    (1) 数据发送成功
```
+ Stream_UDPTunnel_dataSize
```
前置条件：
    （1）LN/RN 网络可以基于UDP建立连接
操作步骤：
     (1) LN 和 RN 建立T连接
     (2) 发送1字节有效数据
     (3) 发送500字节有效数据
     (4) 发送1500字节有效数据
     (4) 发送10MB有效数据
预期结果：
    (1) 数据发送成功
```
+ Stream_UDPTunnel_dataMaxSize
```
前置条件：
    （1）LN/RN 网络可以基于UDP建立连接
操作步骤：
     (1) LN 和 RN 建立T连接
     (2) 发送2GB有效数据
预期结果：
    (1) 数据发送成功
```

#### 实验室Stream传输数据拥塞控制
+ Stream_TCPTunnel_10con_single_1MBData_10
```
前置条件：
    （1）LN/RN 网络可以基于TCP建立连接
操作步骤：
    （1）LN 和 RN 建立10个BDT连接，每个连接LN持续发送10*1MB 大小的字节流数据
预期结果：
    (1) 数据发送成功，Stream数据发送未产生拥塞
```

+ Stream_TCPTunnel_10con_both_10MBData
```
前置条件：
    （1）LN/RN 网络可以基于TCP建立连接
操作步骤：
    （1）LN 和 RN 建立10个BDT连接，每个连接LN/RN双向持续发送10*10MB 大小的字节流数据
预期结果：
    (1) 数据发送成功，Stream数据发送未产生拥塞
```


+ Stream_TCPTunnel_5RN_10con_1MBData
```
前置条件：
    （1）LN/RN 网络可以基于TCP建立连接
操作步骤：
    （1）LN 和 5个RN 建立10个BDT连接，每个连接LN/RN双向持续发送10*1MB 大小的字节流数据
预期结果：
    (1) 数据发送成功，LN Stream数据发送未产生拥塞
```

+ Stream_TCPTunnel_5LN_10con_1MBData
```
前置条件：
    （1）LN/RN 网络可以基于TCP建立连接
操作步骤：
    （1）5个LN 和 RN 建立10个BDT连接，每个连接LN/RN双向持续发送10*1MB 大小的字节流数据
预期结果：
    (1) 数据发送成功，RN Stream数据接收未产生拥塞

```

+ Stream_TCPTunnel_1000_1KBData
```
前置条件：
    （1）LN/RN 网络可以基于TCP建立连接
操作步骤：
    （1）LN 和 RN 建立BDT连接，连续发送1000个1kb数据
预期结果：
    (1) 数据发送成功，RN Stream数据接收未产生拥塞
```

+ Stream_UDPTunnel_10con_single_10MBData_10
```
前置条件：
    （1）LN/RN 网络可以基于UDP建立连接
操作步骤：
    （1）LN 和 RN 建立10个BDT连接，每个连接LN持续发送10*1MB 大小的字节流数据
预期结果：
    (1) 数据发送成功，Stream数据发送未产生拥塞
```

+ Stream_UDPTunnel_10con_both_1MBData
```
前置条件：
    （1）LN/RN 网络可以基于UDP建立连接
操作步骤：
    （1）LN 和 RN 建立10个BDT连接，每个连接LN/RN双向持续发送10*1MB 大小的字节流数据
预期结果：
    (1) 数据发送成功，Stream数据发送未产生拥塞
```

+ Stream_UDPTunnel_5RN_10con_1MBData
```
前置条件：
    （1）LN/RN 网络可以基于UDP建立连接
操作步骤：
    （1）LN 和 5个RN 建立10个BDT连接，每个连接LN/RN双向持续发送10*1MB 大小的字节流数据
预期结果：
    (1) 数据发送成功，LN Stream数据发送未产生拥塞
```

+ Stream_UDPTunnel_5LN_10con_1MBData
```
前置条件：
    （1）LN/RN 网络可以基于UDP建立连接
操作步骤：
    （1）5个LN 和 RN 建立10个BDT连接，每个连接LN/RN双向持续发送10*1MB 大小的字节流数据
预期结果：
    (1) 数据发送成功，RN Stream数据接收未产生拥塞

```

+ Stream_UDPTunnel_1000_1KBData
```
前置条件：
    （1）LN/RN 网络可以基于UDP建立连接
操作步骤：
    （1）LN 和 RN 建立BDT连接，连续发送1000个1kb数据
预期结果：
    (1) 数据发送成功，RN Stream数据接收未产生拥塞
```

#### MTU值

+ Stream_LNMTU1500_RNMTU1500
 ```
前置条件：
    （1）LN/RN 同时使用IPv4/IPv6、TCP/UDP 协议EP
     (2) LN 设置MTU 1500,RN设置MTU 1500
操作步骤：
    连接Stream基础测试用例操作流程
预期结果：
    (1) 能够正常发送数据
```
+ Stream_LNMTU1400_RNMTU1500
 ```
前置条件：
    （1）LN/RN 同时使用IPv4/IPv6、TCP/UDP 协议EP
     (2) LN 设置MTU 1400,RN设置MTU 1500
操作步骤：
    连接Stream基础测试用例操作流程
预期结果：
    (1) 能够正常发送数据
```
+ Stream_LNMTU1500_RNMTU1400
 ```
前置条件：
    （1）LN/RN 同时使用IPv4/IPv6、TCP/UDP 协议EP
     (2) LN 设置MTU 1500,RN设置MTU 1400
操作步骤：
    连接Stream基础测试用例操作流程
预期结果：
    (1) 能够正常发送数据
```

### 网络异常模拟

网络异常类型：

+ 网络延迟：当网络信息流过大时，可能导致设备反应缓慢，造成数据传输延迟；

+ 网路掉包：网路掉包是在数据传输的过程中，数据包由于各种原因在信道中丢失的现象；

+ 网络节流：当数据传输量达到网络带宽上限时，数据包可能会被设备拦截下来在之后发出；

+ 网络重发：当网络不稳定是可能会导致发送端判断数据包丢失导致部分数据包重发；

+ 数据乱序：当数据传输有可能出现数据包到达接收端时间不一致，导致数据包乱序问题；

+ 数据篡改：数据传输的过程中可能出现数据被连接篡改的情况。


覆盖测试场景：
+ 网络带宽：10MBPs 、100MBPs、1000MBPs
+ 网络时延：+0ms、+10ms、+50ms、+100ms、200ms、500ms
+ 丢包率：0%、5%、10%、20%、50%
+ MTU值设置：BDT_头部最小值、1100、1300、1499、1500

模拟线路
+ 线路1：网络带宽10MBPs、网络时延+0ms、丢包率0%
+ 线路2：网络带宽100MBPs、网络时延+0ms、丢包率0%
+ 线路3：网络带宽1000MBPs、网络时延+0ms、丢包率0%
+ 线路4：网络带宽1000MBPs、网络时延+10ms、丢包率0%
+ 线路5：网络带宽1000MBPs、网络时延+50ms、丢包率0%
+ 线路6：网络带宽1000MBPs、网络时延+100ms、丢包率0%
+ 线路7：网络带宽1000MBPs、网络时延+200ms、丢包率0%
+ 线路9：网络带宽1000MBPs、网络时延+200ms、丢包率0%
+ 线路10：网络带宽1000MBPs、网络时延+500ms、丢包率0%
+ 线路11：网络带宽100MBPs、网络时延+200ms、丢包率5%
+ 线路12：网络带宽100MBPs、网络时延+200ms、丢包率10%
+ 线路13：网络带宽100MBPs、网络时延+200ms、丢包率20%
+ 线路14：网络带宽100MBPs、网络时延+200ms、丢包率50%

测试用例操作

+ Stream_UDPTunnel_NetworkSimulate

```
前置条件：
    （1）LN/RN 网络可以基于UDP建立连接
操作步骤：
    （1）LN 和 RN 建立1个BDT连接，每个连接LN/RN双向持续发送100*10MB 大小的字节流数据
预期结果：
    (1) 数据发送成功
```
+ Stream_TCPTunnel_NetworkSimulate
```
前置条件：
    （1）LN/RN 网络可以基于TCP建立连接
操作步骤：
    （1）LN 和 RN 建立1个BDT连接，每个连接LN/RN双向持续发送100*10MB 大小的字节流数据
预期结果：
    (1) 数据发送成功
```


### 测试接口工具封装
```rust

```