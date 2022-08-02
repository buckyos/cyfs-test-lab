## NDN测试用例设计
### NDN内部实现功能

#### BDT 测试NDN接口功能
+ cyfs_bdt::download::track_chunk_to_path : 上传一个chunk到本地磁盘/内存中
+ cyfs_bdt::download::track_file_in_path ：上传一个文件到本地磁盘/内存中
+ cyfs_bdt::download::download_chunk_to_path : 下载一个chunk到本地磁盘中
+ cyfs_bdt::download::download_chunk_list : 下载一组chunk到本地磁盘中
+ cyfs_bdt::download::download_file : 下载一个文件到本地磁盘中
+ cyfs_bdt::download::download_file_with_ranges : 下载文件片段到本地磁盘中，视频在线播放下载
+ cyfs_bdt::download::DirTaskPathControl ： 文件夹下载任务调度器
+ cyfs_bdt::event_utils::RedirectHandle : BDT interest ndn_event,文件下载重定向
+ cyfs_bdt::event_utils::ForwardEventHandle  : BDT ForwardEvent ndn_event
+ cyfs_bdt::stack.ndn().chunk_manager().store().read(&chunk_id) : 读取本地NDC中chunk状态
+ cyfs_bdt::DownloadTaskControl.control_state() : 获取下载任务的下载状态
+ cyfs_bdt::DownloadTaskControl.pause() : 暂停下载任务
+ cyfs_bdt::DownloadTaskControl.resume() : 继续下载任务
+ cyfs_bdt::DownloadTaskControl.cancel() ： 取消下载任务

#### channel 类型：
+ tcp channel tunnel
+ udp channel tunnel


#### 拥塞控制算法
+ BBR
+ Ledbat

#### 多源下载
+ 二元传输
+ ndn_event

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
 + 内存
 + 磁盘
 

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



### NDN 基础测试用例操作流程

覆盖测试场景：
+ (1) LN、RN 初始化协议栈
+ (2) LN track上传一个10Mb文件，RN 进行Interest
+ (3) RN track上传一个10Mb文件，LN 进行Interest

### NDN 测试统计数据项
+ set_time : 传输文件/chunk 到本地的时间
+ send_time ：interst 文件下载的时间
+ filesize ： 文件大小
+ chunksize ：文件的chunk 大小


### NDN 测试用例设计



#### IPv4 网络
##### UDP Channel
+ NDN_IPV4_UDPChannel_InterestFile
```
前置条件：
    （1）LN/RN 使用同一个SN
    （2）LN/RN 设备UDP网络可以正常使用
操作步骤：
    NDN 基础测试用例操作流程
测试节点数据限制：
    (1) LN/RN 初始化BDT协议栈时只使用IPv4和UDP协议 EP
预期结果：
    (1)符合P2P NAT穿透理论规则,可以下载文件成功
    
```
##### TCP Channel
+ NDN_IPV4_TCPChannel_InterestFile
```
前置条件：
    （1）LN/RN 使用同一个SN
    （2）LN/RN 设备TCP网络可以正常使用
操作步骤：
    NDN 基础测试用例操作流程
测试节点数据限制：
    (1) LN/RN 初始化BDT协议栈时只使用IPv4和 TCP 协议 EP
预期结果：
    (1)符合P2P NAT穿透理论规则,可以下载文件成功
    
```

#### IPv6 网络
##### UDP Channel

+ NDN_IPV6_UDPChannel_InterestFile
```
前置条件：
    （1）LN/RN 使用同一个SN
    （2）LN/RN 设备UDP网络可以正常使用
操作步骤：
    NDN 基础测试用例操作流程
测试节点数据限制：
    (1) LN/RN 初始化BDT协议栈时只使用IPv6和UDP协议 EP
预期结果：
    (1)符合P2P NAT穿透理论规则,可以下载文件成功
    
```

##### TCP Channel
+ NDN_IPV6_TCPChannel_InterestFile
```
前置条件：
    （1）LN/RN 使用同一个SN
    （2）LN/RN 设备TCP网络可以正常使用
操作步骤：
    NDN 基础测试用例操作流程
测试节点数据限制：
    (1) LN/RN 初始化BDT协议栈时只使用IPv4和 TCP 协议 EP
预期结果：
    (1)符合P2P NAT穿透理论规则,可以下载文件成功
    
```

#### 整体连通性测试

+ NDN_AllEP_ChannelSelect
 ```
前置条件：
    （1）LN/RN 同时使用IPv4/IPv6、TCP/UDP 协议EP
操作步骤：
    NDN 基础测试用例操作流程
测试节点数据限制：
    (1) 所有机器组合
预期结果：
    (1) 符合P2P NAT穿透
```

+ NDN_AllEP_ChannelSelect_PN
 ```
前置条件：
    （1）LN/RN 同时使用IPv4/IPv6、TCP/UDP 协议EP
    （2）NAT3 设备使用PN
操作步骤：
    NDN 基础测试用例操作流程
测试节点数据限制：
    (1) 所有机器组合
预期结果：
    (1) 全部连接成功
```


#### Chunk 传输任务调度
+ NDN_ChunkTask_ChunkSize
+ NDN_ChunkTask_DownloadTaskControl
#### ChunkList 传输任务调度
+ NDN_ChunkListTask_ChunkSize
+ NDN_ChunkListTask_DownloadTaskControl
#### File 传输任务调度
+ NDN_FileTask_ChunkSize
+ NDN_FileTask_FileSize
+ NDN_FIleTask_DownloadTaskControl
#### FileRange 传输任务调度
+ NDN_FIleRange_RangeValue
+ NDN_FIleRange_DownloadTaskControl
#### Dir 传输任务调度
+ NDN_DirTask_FileNum
+ NDN_DirTask_DirDeepth
+ NDN_FIleTask_DownloadTaskControl

#### 任务分发调度
+ NDN_BBR_chunk_Concurrent10_download100
+ NDN_BBR_chunk_Concurrent10_upload100
+ NDN_BBR_File_Concurrent10_download100
+ NDN_BBR_File_Concurrent10_upload100
+ NDN_BBR_FileRange_Concurrent10_download100
+ NDN_BBR_FileRange_Concurrent10_upload100
+ NDN_BBR_Dir_Concurrent10_download100
+ NDN_BBR_Dir_Concurrent10_upload100

#### 双源传输
+ NDN_DualSource_InterestChunk
+ NDN_SingleSource_InterestChunk
+ NDN_DualSource_InterestFile
+ NDN_SingleSource_InterestFile
+ NDN_DualSource_InterestFileRange
+ NDN_SingleSource_InterestFileRange
+ NDN_DualSource_InterestDir
+ NDN_SingleSource_InterestDir

#### NDN Event 重定向Interst 请求
+ NDN_Event_Redirect_Cache
+ NDN_Event_Redirect_WaitCache
+ NDN_Event_Forward_NotChache_notConnect
+ NDN_Event_Forward_NotChache_Connect
+ NDN_Event_Forward_Chache_notConnect
+ NDN_Event_Forward_Chache_Connect
// 以下部分暂时未实现
+ NDN_Event_Redirect_ListTarget
+ NDN_Event_Redirect_RepeatRedirect
+ NDN_Event_Redirect_RepeatForward
+ NDN_Event_Forward_ListTarget
+ NDN_Event_Forward_RepeatForward
+ NDN_Event_Forward_RepeatRedirect
+ NDN_Event_Redirect_loopAvoid
+ NDN_Event_Forward_loopAvoid


#### 实验室NDN传输网络链路因素拥塞控制

覆盖测试场景：
+ 网络带宽：10MbPs 、100MbPs、1000MbPs
+ 网络时延：+0ms、+10ms、+50ms、+100ms、200ms、500ms
+ 丢包率：0%、5%、10%、20%、50%
+ MTU值设置：BDT_头部最小值、1100、1300、1499、1500
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

+ NDN_UDPChannel_NetworkSimulate

```
前置条件：
    （1）LN/RN 网络可以基于UDP建立连接
操作步骤：
    （1）LN 和 RN 建立1个BDT连接，发送100*10Mb 大小文件数据
预期结果：
    (1) 数据发送成功
```
+ NDN_TCPChannel_NetworkSimulate
```
前置条件：
   （1）LN/RN 网络可以基于TCP建立连接
操作步骤：
   （1）LN 和 RN 建立1个BDT连接，发送100*10Mb 大小文件数据
预期结果：
    (1) 数据发送成功
```