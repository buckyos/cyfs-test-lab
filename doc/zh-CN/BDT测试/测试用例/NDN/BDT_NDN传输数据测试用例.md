## NDN测试用例设计

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







### NDN内部实现功能

#### NDN接口功能
+ utils::download::track_chunk_to_path : 上传一个chunk到本地NDC中
+ utils::download::download_chunk_to_path : 下载一个chunk到本地磁盘中
+ utils::download::download_chunk_list : 下载一组chunk到本地磁盘中
+ stack.ndn().chunk_manager().store().read(&chunk_id) : 读取本地NDC中chunk状态
+ 
+ DownloadTaskControl.control_state() : 获取下载任务的下载状态
+ DownloadTaskControl.pause() : 暂停下载任务
+ DownloadTaskControl.resume() : 继续下载任务
+ DownloadTaskControl.cancel() ： 取消下载任务


#### channel 类型：
+ tcp channel tunnel
+ udp channel tunnel


#### 拥塞控制算法
+ BBR
+ Ledbat


#### 多源下载
+ 二元传输

#### task/scheduler下载控制
下载数据接口
+ chunk
+ chunk_list
+ File
+ Dir
+ FileRange

#### task 控制：
+ control_state
+ pause
+ resume
+ cancel

#### 资源占用统计
+ upstream
+ downstream

#### 资源配额

* max_connections_per_source：单个源最大连接数；
* max_connections：最大连接数；
* max_cpu_usage：最大cpu配额；
* max_memory_usage：最大内存配额；
* max_upstream_bandwidth：上传带宽配额；
* max_downstream_bandwidth：下载带宽配额；

#### chunk manager NDC
 chunk 本地缓存机制
 




### NDN 数据流向影响测试用例

覆盖测试场景：

+ 两个节点间多个连接持续单向发送数据
+ 两个节点间多个连接持续双向发送数据
+ 一个LN向多个RN建立连接持续发送数据
+ 多个LN向一个RN建立连接持续发送数据
+ 两个节点间持续发现小数据慢启动影响因素





#### 实验室NDN传输网络链路因素拥塞控制

覆盖测试场景：
+ 网络带宽：10MbPs 、100MbPs、1000MbPs
+ 网络时延：+0ms、+10ms、+50ms、+100ms、200ms、500ms
+ 丢包率：0%、5%、10%、20%、50%

模拟线路
+ 线路1：网络带宽10MbPs、网络时延+0ms、丢包率0%
+ 线路2：网络带宽100MbPs、网络时延+0ms、丢包率0%
+ 线路3：网络带宽1000MbPs、网络时延+0ms、丢包率0%
+ 线路4：网络带宽1000MbPs、网络时延+10ms、丢包率0%
+ 线路5：网络带宽1000MbPs、网络时延+50ms、丢包率0%
+ 线路6：网络带宽1000MbPs、网络时延+100ms、丢包率0%
+ 线路7：网络带宽1000MbPs、网络时延+200ms、丢包率0%
+ 线路9：网络带宽1000MbPs、网络时延+200ms、丢包率0%
+ 线路10：网络带宽1000MbPs、网络时延+500ms、丢包率0%
+ 线路11：网络带宽100MbPs、网络时延+200ms、丢包率5%
+ 线路12：网络带宽100MbPs、网络时延+200ms、丢包率10%
+ 线路13：网络带宽100MbPs、网络时延+200ms、丢包率20%
+ 线路14：网络带宽100MbPs、网络时延+200ms、丢包率50%

测试用例操作

+ Stream_UDPTunnel_NetworkSimulate

```
前置条件：
    （1）LN/RN 网络可以基于UDP建立连接
操作步骤：
    （1）LN 和 RN 建立1个BDT连接，持续发送100*10Mb 大小的字节流数据
预期结果：
    (1) 数据发送成功
```
+ Stream_TCPTunnel_NetworkSimulate
```
前置条件：
    （1）LN/RN 网络可以基于TCP建立连接
操作步骤：
    （1）LN 和 RN 建立1个BDT连接，持续发送100*10Mb 大小的字节流数据
预期结果：
    (1) 数据发送成功
```