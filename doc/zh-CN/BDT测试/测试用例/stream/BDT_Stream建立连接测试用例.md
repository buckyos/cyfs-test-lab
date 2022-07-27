# 连接流程

## 测试用例设计

### 外部环境影响因素 

（1）IP层协议:
+ IPv4
+ IPv6

（2）NAT 类型：
+ 公网IP
+ 公网IP + 端口映射
+ Full Cone NAT 
+ Restricted Cone NAT
+ Port Restricted Cone NAT
+ Symmetric NAT 
  
（3）运行机器操作系统
+ Win7/Win10/Win11/Windows server
+ Centos/Ubuntu/Debin
+ MacOS
+ IOS/Android

（4）P2P NAT穿透理论规则
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

### BDT 内部实现因素：

（1）Tunnel 类型：
+ TCP Tunnel
+ UDP Tunnel

（2）Tunnel 选择策略：
+ 优先使用第一个建立连接Tunnel

（3）Tunnel EP组合策略
+ EP 字段组合
    + W/L : W直接进行直连，L通过SN建立连接
    + 4/6 : IP 协议类型 IPv4 IPv6,同种协议才尝试建立连接
    + tcp/udp : 同种协议才尝试建立连接
+ EP 端口

（4）连接方式：
+ 直连：如果LN设备已知RN设备的Device 对象，如果RN的Device 对象包括有效的EP字段，可以通过直连建立连接
+ 通过SN 服务连接流程：如果LN设备已知RN设备的Device 对象，但不知道RN的有效EP,通过SN建立连接

（5）连接流程：
+ 首次连接
+ 二次连接流程
+ 反向建立连接

（6）连接迁移?
移动设备网络特性，网络的链路可能随时切换，理论上内部是能支持的

（7）连接关闭
+ LN 端关闭连接
+ RN 端关闭连接
+ LN BDT协议栈关闭
+ RN BDT协议栈关闭

（7）连接端口分配原则
+ LN 发起连接
+ RN 发起连接


（8）最大连接数限制
+ tcp
+ udp

### 连接测试用例操作流程
+ （1）LN/RN 初始化本地BDT协议栈
+ （2）LN 向 RN 发起首次连接，发送1M大小stream 数据，关闭连接
+ （3）LN 向 RN 发起二次连接，发送1M大小stream 数据，关闭连接
+ （4）RN 向 LN 发起反向连接，发送1M大小stream 数据，关闭连接
+  (5) 关闭所有连接
### Tunnel 测试用例
#### IPV4 协议
##### UDP Tunnel 建立连接流程
###### Direct

+ Connect_IPV4_UDPTunnel_direct_effectiveEP_WAN
```
前置条件：
    （1）LN/RN 设备不使用SN
    （2）LN/RN 设备UDP网络可以正常使用
操作步骤：
    连接测试用例操作流程
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
    连接测试用例操作流程
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
    连接测试用例操作流程
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
    连接测试用例操作流程
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
    连接测试用例操作流程
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
    连接测试用例操作流程
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
    连接测试用例操作流程
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
    连接测试用例操作流程
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
    连接测试用例操作流程
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
    连接测试用例操作流程
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
    连接测试用例操作流程
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
    连接测试用例操作流程
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
    连接测试用例操作流程
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
    连接测试用例操作流程
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
    连接测试用例操作流程
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
    连接测试用例操作流程
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
    连接测试用例操作流程
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
    连接测试用例操作流程
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
    连接测试用例操作流程
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
    连接测试用例操作流程
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
    连接测试用例操作流程
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
    连接测试用例操作流程
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
    连接测试用例操作流程
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

#### FristQA

+ Connect_FristQA_TCP_direct
```
前置条件：
    （1）LN/RN 同时使用TCP协议EP
     (2) LN 可以直连RN
操作步骤：
    (1) LN向RN发起连接，Sync 包question 带有50字节数据
测试节点数据限制：
    (1) LN向RN发起首次连接，LN Sync 包question 带有50字节数据 ,RN ACK包 answer带有50字节数据
    (2) LN向RN发起二次连接，LN Sync 包question 带有50字节数据 ,RN ACK包 answer带有50字节数据
    (3) RN向LN发起反向连接，RN Sync 包question 带有50字节数据 ,LN ACK包 answer带有50字节数据
预期结果：
    (1) LN 连接RN成功，连接过程中实现首次数据包发送
```
+ Connect_FristQA_TCP_SN
```
前置条件：
    （1）LN/RN 同时使用TCP协议EP
操作步骤：
    (1) LN向RN发起连接，Sync 包question 带有50字节数据
测试节点数据限制：
    (1) 节点使用TCP通过SN连接
预期结果：
    (1) LN向RN发起首次连接，LN Sync 包question 带有50字节数据 ,RN ACK包 answer带有50字节数据
    (2) LN向RN发起二次连接，LN Sync 包question 带有50字节数据 ,RN ACK包 answer带有50字节数据
    (3) RN向LN发起反向连接，RN Sync 包question 带有50字节数据 ,LN ACK包 answer带有50字节数据
```
+ Connect_FristQA_UDP_direct
 ```
前置条件：
    （1）LN/RN 同时使用UDP协议EP
     (2) LN 可以直连RN
操作步骤：
    (1) LN向RN发起首次连接，LN Sync 包question 带有50字节数据 ,RN ACK包 answer带有50字节数据
    (2) LN向RN发起二次连接，LN Sync 包question 带有50字节数据 ,RN ACK包 answer带有50字节数据
    (3) RN向LN发起反向连接，RN Sync 包question 带有50字节数据 ,LN ACK包 answer带有50字节数据
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
    (1) LN向RN发起首次连接，LN Sync 包question 带有50字节数据 ,RN ACK包 answer带有50字节数据
    (2) LN向RN发起二次连接，LN Sync 包question 带有50字节数据 ,RN ACK包 answer带有50字节数据
    (3) RN向LN发起反向连接，RN Sync 包question 带有50字节数据 ,LN ACK包 answer带有50字节数据
测试节点数据限制：
    (1) 节点使用UDP通过SN连接
预期结果：
    (1) LN 连接RN成功，连接过程中实现首次数据包发送
```

+ Connect_FristQA_TCP_PackageSize
 ```
前置条件：
    （1）LN/RN 同时使用TCP协议EP
     (2) LN 可以直连RN
操作步骤：
    (1) LN向RN发起首次连接，LN Sync 包question 带有50字节数据 ,RN ACK包 answer带有50字节数据
    (2) LN向RN发起二次连接，LN Sync 包question 带有MTU-BDT_head_szie-1字节数据 ,RN ACK包 answer带有MTU-BDT_head_szie-1字节数据
    (3) LN向RN发起二次连接，LN Sync 包question 带有MTU-BDT_head_szie字节数据 ,RN ACK包 answer带有MTU-BDT_head_szie字节数据
    (4) LN向RN发起二次连接，LN Sync 包question 带有MTU-BDT_head_szie+1字节数据 ,RN ACK包 answer带有MTU-BDT_head_szie字节数据
    (5) LN向RN发起二次连接，LN Sync 包question 带有MTU-BDT_head_szie字节数据 ,RN ACK包 answer带有MTU-BDT_head_szie+1字节数据
测试节点数据限制：
    (1) 节点使用TCP直连
预期结果：
    (1) LN 连接RN成功，连接过程中实现首次数据包发送
```
+ Connect_FristQA_UDP_PackageSize
 ```
前置条件：
    （1）LN/RN 同时使用UDP协议EP
     (2) LN 可以直连RN
操作步骤：
    (1) LN向RN发起首次连接，LN Sync 包question 带有50字节数据 ,RN ACK包 answer带有50字节数据
    (2) LN向RN发起二次连接，LN Sync 包question 带有MTU-BDT_head_szie-1字节数据 ,RN ACK包 answer带有MTU-BDT_head_szie-1字节数据
    (3) LN向RN发起二次连接，LN Sync 包question 带有MTU-BDT_head_szie字节数据 ,RN ACK包 answer带有MTU-BDT_head_szie字节数据
    (4) LN向RN发起二次连接，LN Sync 包question 带有MTU-BDT_head_szie+1字节数据 ,RN ACK包 answer带有MTU-BDT_head_szie字节数据
    (5) LN向RN发起二次连接，LN Sync 包question 带有MTU-BDT_head_szie字节数据 ,RN ACK包 answer带有MTU-BDT_head_szie+1字节数据
测试节点数据限制：
    (1) 节点使用UDP直连
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
#### 网络异常模拟

网络异常类型：

+ 网络延迟：当网络信息流过大时，可能导致设备反应缓慢，造成数据传输延迟；

+ 网路掉包：网路掉包是在数据传输的过程中，数据包由于各种原因在信道中丢失的现象；

+ 网络节流：当数据传输量达到网络带宽上限时，数据包可能会被设备拦截下来在之后发出；

+ 网络重发：当网络不稳定是可能会导致发送端判断数据包丢失导致部分数据包重发；

+ 数据乱序：当数据传输有可能出现数据包到达接收端时间不一致，导致数据包乱序问题；

+ 数据篡改：数据传输的过程中可能出现数据被连接篡改的情况。


