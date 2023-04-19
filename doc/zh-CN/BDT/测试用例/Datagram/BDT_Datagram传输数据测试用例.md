## Datagram测试用例设计
### Datagram内部实现功能

#### BDT Datagram接口功能
+ DatagramManager::send_to()
+ DatagramManager::recv_v() 
+ DatagramOptions 传输接口参数设置
``` rust
pub struct DatagramOptions {
    pub sequence: Option<TempSeq>, //序列号
    pub author_id: Option<DeviceId>, //内容id
    pub create_time: Option<Timestamp>, //创建时间
    pub send_time: Option<Timestamp>, // 发送时间
    pub plaintext: bool, // 是否加密
}
```
+ BDT协议栈关于Datagram配置
``` rust
datagram: datagram::Config {
    min_random_vport: 32767,
    max_random_vport: 65535,
    max_try_random_vport_times: 5,
    piece_cache_duration: Duration::from_millis(1000),
    recv_cache_count: 16,
    expired_tick_sec: 10,
    fragment_cache_size: 100 *1024*1024,
    fragment_expired_us: 30 *1000*1000,
},
```

#### tunnel 类型：
+ tcp tunnel
+ udp tunnel

#### 是否加解密
+ plaintext

#### 丢包
若产生丢包发送失败

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

#### 6. MTU 值（<1500）
+ LN MTU = RN MTU
+ LN MTU > RN MTU
+ LN MTU < RN MTU

### 统计测试数据项
+ connect_time : 连接时间
+ size : Datagram 发送的数据大小
+ send_time : Datagram 发送数据耗时
+ LN_hash : Datagram 发送数据原始数据的hash
+ RN_hash : Datagram 接收数据的hash


### Datagram测试用

+ Datagram_IPV4_UDPTunnel_sendDatagram_plaintextTrue
```
前置条件：
    （1）LN/RN 使用同一个SN
    （2）LN/RN 设备 只使用 IPv4 UDP网络
操作步骤：
    (1) RN 启动 Datagram  监听接口
    (2) LN 向 RN 发送 一段1Mb 大小Datagram数据，设置plaintext True
    (3) 检查 RN接收结果
预期结果：
    (1)符合P2P NAT穿透理论规则,可以下载文件成功
```    

+ Datagram_IPV4_UDPTunnel_sendDatagram_plaintextFalse

```
前置条件：
    （1）LN/RN 使用同一个SN
    （2）LN/RN 设备 只使用 IPv4 UDP网络
操作步骤：
    (1) RN 启动 Datagram  监听接口
    (2) LN 向 RN 发送 一段1Mb 大小Datagram数据，设置plaintext False
    (3) 检查 RN接收结果
预期结果：
    (1)符合P2P NAT穿透理论规则,可以下载文件成功
```   

+ Datagram_IPV4_UDPTunnel_sendDatagram_packageSize
```
前置条件：
    （1）LN/RN 使用同一个SN
    （2）LN/RN 设备 只使用 IPv4 UDP网络
操作步骤：
    (1) RN 启动 Datagram  监听接口
    (2) LN 向 RN 发送 一段0 bytes 大小Datagram数据，设置plaintext False
    (3) LN 向 RN 发送 一段1 bytes 大小Datagram数据，设置plaintext False
    (4) LN 向 RN 发送 一段1600 bytes 大小Datagram数据，设置plaintext False
    (5) LN 向 RN 发送 一段10Mb 大小Datagram数据，设置plaintext False
    (6) RN 检查接收的数据
预期结果：
    (1)符合P2P NAT穿透理论规则,可以下载文件成功
```    
  
+ Datagram_IPV4_TCPTunnel_sendDatagram_plaintextTrue

```
前置条件：
    （1）LN/RN 使用同一个SN
    （2）LN/RN 设备 只使用 IPv4 TCP 网络
操作步骤：
    (1) RN 启动 Datagram  监听接口
    (2) LN 向 RN 发送 一段1Mb 大小Datagram数据，设置plaintext True
    (3) 检查 RN接收结果
预期结果：
    (1)符合P2P NAT穿透理论规则,可以下载文件成功
```    

+ Datagram_IPV4_TCPTunnel_sendDatagram_plaintextFalse
```
前置条件：
    （1）LN/RN 使用同一个SN
    （2）LN/RN 设备 只使用 IPv4 TCP 网络
操作步骤：
    (1) RN 启动 Datagram  监听接口
    (2) LN 向 RN 发送 一段1Mb 大小Datagram数据，设置plaintext False
    (3) 检查 RN接收结果
预期结果：
    (1)符合P2P NAT穿透理论规则,可以下载文件成功
``` 
+ Datagram_IPV4_TCPTunnel_sendDatagram_packageSize
```
前置条件：
    （1）LN/RN 使用同一个SN
    （2）LN/RN 设备 只使用 IPv4 TCP网络
操作步骤：
    (1) RN 启动 Datagram  监听接口
    (2) LN 向 RN 发送 一段0 bytes 大小Datagram数据，设置plaintext False
    (3) LN 向 RN 发送 一段1 bytes 大小Datagram数据，设置plaintext False
    (4) LN 向 RN 发送 一段1600 bytes 大小Datagram数据，设置plaintext False
    (5) LN 向 RN 发送 一段10Mb 大小Datagram数据，设置plaintext False
    (6) RN 检查接收的数据
预期结果：
    (1)符合P2P NAT穿透理论规则,可以下载文件成功
```  
+ Datagram_IPV6_UDPTunnel_sendDatagram_plaintextTrue
```
前置条件：
    （1）LN/RN 使用同一个SN
    （2）LN/RN 设备 只使用 IPv6 UDP 网络
操作步骤：
    (1) RN 启动 Datagram  监听接口
    (2) LN 向 RN 发送 一段1Mb 大小Datagram数据，设置plaintext True
    (3) 检查 RN接收结果
预期结果：
    (1)符合P2P NAT穿透理论规则,可以下载文件成功
``` 
+ Datagram_IPV6_UDPTunnel_sendDatagram_plaintextFalse
```
前置条件：
    （1）LN/RN 使用同一个SN
    （2）LN/RN 设备 只使用 IPv6 UDP网络
操作步骤：
    (1) RN 启动 Datagram  监听接口
    (2) LN 向 RN 发送 一段1Mb 大小Datagram数据，设置plaintext False
    (3) 检查 RN接收结果
预期结果：
    (1)符合P2P NAT穿透理论规则,可以下载文件成功
```  
+ Datagram_IPV6_UDPTunnel_sendDatagram_packageSize
```
前置条件：
    （1）LN/RN 使用同一个SN
    （2）LN/RN 设备 只使用 IPv6 UDP网络
操作步骤：
    (1) RN 启动 Datagram  监听接口
    (2) LN 向 RN 发送 一段0 bytes 大小Datagram数据，设置plaintext False
    (3) LN 向 RN 发送 一段1 bytes 大小Datagram数据，设置plaintext False
    (4) LN 向 RN 发送 一段1600 bytes 大小Datagram数据，设置plaintext False
    (5) LN 向 RN 发送 一段10Mb 大小Datagram数据，设置plaintext False
    (6) RN 检查接收的数据
预期结果：
    (1)符合P2P NAT穿透理论规则,可以下载文件成功
```  
+ Datagram_IPV6_TCPTunnel_sendDatagram_plaintextTrue
```
前置条件：
    （1）LN/RN 使用同一个SN
    （2）LN/RN 设备 只使用 IPv6 TCP 网络
操作步骤：
    (1) RN 启动 Datagram  监听接口
    (2) LN 向 RN 发送 一段1Mb 大小Datagram数据，设置plaintext True
    (3) 检查 RN接收结果
预期结果：
    (1)符合P2P NAT穿透理论规则,可以下载文件成功
``` 
+ Datagram_IPV6_TCPTunnel_sendDatagram_plaintextFalse
```
前置条件：
    （1）LN/RN 使用同一个SN
    （2）LN/RN 设备 只使用 IPv6 TCP网络
操作步骤：
    (1) RN 启动 Datagram  监听接口
    (2) LN 向 RN 发送 一段1Mb 大小Datagram数据，设置plaintext False
    (3) 检查 RN接收结果
预期结果：
    (1)符合P2P NAT穿透理论规则,可以下载文件成功
```  
+ Datagram_IPV6_TCPTunnel_sendDatagram_packageSize
```
前置条件：
    （1）LN/RN 使用同一个SN
    （2）LN/RN 设备 只使用 IPv6 TCP网络
操作步骤：
    (1) RN 启动 Datagram  监听接口
    (2) LN 向 RN 发送 一段0 bytes 大小Datagram数据，设置plaintext False
    (3) LN 向 RN 发送 一段1 bytes 大小Datagram数据，设置plaintext False
    (4) LN 向 RN 发送 一段1600 bytes 大小Datagram数据，设置plaintext False
    (5) LN 向 RN 发送 一段10Mb 大小Datagram数据，设置plaintext False
    (6) RN 检查接收的数据
预期结果：
    (1)符合P2P NAT穿透理论规则,可以下载文件成功
```  

+ Datagram_DatagramOptions_Default
```
前置条件：
    （1）LN/RN 使用同一个SN
操作步骤：
    (1) RN 启动 Datagram  监听接口
    (2) LN 向 RN 发送 一段1Mb 大小Datagram数据，设置plaintext True,其他DatagramOptions为空
    (3) 检查 RN接收结果，读取LN RN DatagramOptions参数
预期结果：
    (1)符合P2P NAT穿透理论规则,可以下载文件成功
``` 
+ Datagram_DatagramOptions_sequence
```
前置条件：
    （1）LN/RN 使用同一个SN
操作步骤：
    (1) RN 启动 Datagram  监听接口
    (2) LN 向 RN 发送 一段1Mb 大小Datagram数据，设置plaintext True,sequence为当前时间，其他DatagramOptions为空
    (3) 检查 RN接收结果，读取LN RN DatagramOptions参数
预期结果：
    (1)符合P2P NAT穿透理论规则,可以下载文件成功
``` 
+ Datagram_DatagramOptions_author_id
```
前置条件：
    （1）LN/RN 使用同一个SN
操作步骤：
    (1) RN 启动 Datagram  监听接口
    (2) LN 向 RN 发送 一段1Mb 大小Datagram数据，设置plaintext True,author_id为LN，其他DatagramOptions为空
    (3) 检查 RN接收结果，读取LN RN DatagramOptions参数
预期结果：
    (1)符合P2P NAT穿透理论规则,可以下载文件成功
``` 
+ Datagram_DatagramOptions_create_time
```
前置条件：
    （1）LN/RN 使用同一个SN
操作步骤：
    (1) RN 启动 Datagram  监听接口
    (2) LN 向 RN 发送 一段1Mb 大小Datagram数据，设置plaintext True,create_time为当前时间，其他DatagramOptions为空
    (3) 检查 RN接收结果，读取LN RN DatagramOptions参数
预期结果：
    (1)符合P2P NAT穿透理论规则,可以下载文件成功
``` 
+ Datagram_DatagramOptions_send_time
```
前置条件：
    （1）LN/RN 使用同一个SN
操作步骤：
    (1) RN 启动 Datagram  监听接口
    (2) LN 向 RN 发送 一段1Mb 大小Datagram数据，设置plaintext True,send_time为20s，其他DatagramOptions为空
    (3) 检查 RN接收结果，读取LN RN DatagramOptions参数
预期结果：
    (1)符合P2P NAT穿透理论规则,可以下载文件成功
``` 
+ Datagram_MTU_LN1500_RN1400
```
前置条件：
    (1) LN/RN 使用同一个SN
    (2) LN 设置MTU 1500 ,RN 设置MTU 1400
操作步骤：
    (1) RN 启动 Datagram  监听接口
    (2) LN 向 RN 发送 一段1Mb 大小Datagram数据，设置plaintext True
    (3) 检查 RN接收结果，读取LN RN DatagramOptions参数
预期结果：
    (1)符合P2P NAT穿透理论规则,可以下载文件成功
``` 
+ Datagram_MTU_LN1500_RN1400
```
前置条件：
    (1) LN/RN 使用同一个SN
    (2) LN 设置MTU 1500 ,RN 设置MTU 1400
操作步骤：
    (1) RN 启动 Datagram  监听接口
    (2) LN 向 RN 发送 一段1Mb 大小Datagram数据，设置plaintext True
    (3) 检查 RN接收结果，读取LN RN DatagramOptions参数
预期结果：
    (1)符合P2P NAT穿透理论规则,可以下载文件成功
``` 
+ Datagram_MTU_LN1500_RN1500
```
前置条件：
    (1) LN/RN 使用同一个SN
    (2) LN 设置MTU 1500 ,RN 设置MTU 1500
操作步骤：
    (1) RN 启动 Datagram  监听接口
    (2) LN 向 RN 发送 一段1Mb 大小Datagram数据，设置plaintext True
    (3) 检查 RN接收结果，读取LN RN DatagramOptions参数
预期结果：
    (1)符合P2P NAT穿透理论规则,可以下载文件成功
``` 
+ Datagram_MTU_LN1400_RN1400
```
前置条件：
    (1) LN/RN 使用同一个SN
    (2) LN 设置MTU 1400 ,RN 设置MTU 1400
操作步骤：
    (1) RN 启动 Datagram  监听接口
    (2) LN 向 RN 发送 一段1Mb 大小Datagram数据，设置plaintext True
    (3) 检查 RN接收结果，读取LN RN DatagramOptions参数
预期结果：
    (1)符合P2P NAT穿透理论规则,可以下载文件成功
``` 

+ Datagram_Config_fragment_expired_us
```
前置条件：
    (1) LN/RN 使用同一个SN
    (2) LN BDT 协议栈fragment_expired_us 设置为60s
    (3) LN 设置丢包10%
操作步骤：
    (1) RN 启动 Datagram  监听接口
    (2) LN 向 RN 发送 一段50Mb 大小Datagram数据，设置plaintext True
    (3) LN 发送超时退出。
预期结果：
    (1)符合P2P NAT穿透理论规则,可以下载文件成功
``` 
+ Datagram_Config_fragment_cache_size
```
前置条件：
    (1) LN/RN 使用同一个SN
操作步骤：
    (1) RN 启动 Datagram  监听接口
    (2) LN 向 RN 发送 一段101Mb 大小Datagram数据，设置plaintext True
    (3) 超过Config_fragment_cache_size大小数据BDT直接报错，禁止传输
预期结果：
    (1)符合P2P NAT穿透理论规则,可以下载文件成功
``` 