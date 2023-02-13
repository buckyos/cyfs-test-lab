#  一、Stream 建立连接/数据传输压力测试
## Stream连接

### TCP Tunnel

#### 维持一个BDT Stream 连接的性能开销
    场景：BDT节点维持多个Stream连接，无数据发送，所消耗的资源。
+ perf_stream_connect_tcp_keep_100
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ (1) LN RN 之间串行建立100个连接
+ (2) 维持连接5 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_connect_tcp_keep_1000
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ (1) LN RN 之间串行建立1000个连接
+ (2) 维持连接5 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ Perf_stream_connect_tcp_keep_2000
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ (1) LN RN 之间串行建立2000个连接
+ (2) 维持连接5 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_connect_tcp_keep_5000
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ (1) LN RN 之间串行建立5000个连接
+ (2) 维持连接5 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_connect_tcp_keep_10000
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ (1) LN RN 之间串行建立10000个连接
+ (2) 维持连接5 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```

#### 持续接收Stream连接请求并发性能
    多个LN 连接一个 RN，RN confirm 性能
+ Perf_stream_connect_tcp_active_10_100
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ (1) 10个LN和RN 之间并行行建立10*100个连接
+ (2) 维持连接5 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
+ RT : connect_time 、 confirm_time
+ 并发数：10
+ QPS : 每秒confirm 连接请求次数
```
+ Perf_stream_connect_tcp_active_20_50
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ (1) 10个LN和RN 之间并行行建立20*50个连接
+ (2) 维持连接5 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
+ LN/RN 内存、CPU、网络带宽 
+ RT : connect_time 、 confirm_time
+ 并发数：20
+ QPS : 每秒confirm 连接请求次数
```
+ Perf_stream_connect_tcp_active_50_20
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ (1) 10个LN和RN 之间并行行建立50*20个连接
+ (2) 维持连接5 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
+ LN/RN 内存、CPU、网络带宽 
+ RT : connect_time 、 confirm_time
+ 并发数：50
+ QPS : 每秒confirm 连接请求次数
```
+ Perf_stream_connect_tcp_active_100_10
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ (1) 10个LN和RN 之间并行行建立100*10个连接
+ (2) 维持连接5 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
+ LN/RN 内存、CPU、网络带宽 
+ RT : connect_time 、 confirm_time
+ 并发数：100
+ QPS : 每秒confirm 连接请求次数
```


### UDP Tunnel
#### 维持一个BDT Stream 连接的性能开销
    场景：BDT节点维持多个Stream连接，无数据发送，所消耗的资源。
+ perf_stream_connect_udp_keep_100
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ (1) LN RN 之间串行建立100个连接
+ (2) 维持连接5 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_connect_udp_keep_1000
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ (1) LN RN 之间串行建立1000个连接
+ (2) 维持连接5 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ Perf_stream_connect_udp_keep_2000
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ (1) LN RN 之间串行建立2000个连接
+ (2) 维持连接5 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_connect_udp_keep_5000
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ (1) LN RN 之间串行建立5000个连接
+ (2) 维持连接5 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_connect_udp_keep_10000
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ (1) LN RN 之间串行建立10000个连接
+ (2) 维持连接5 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
#### 持续接收连接请求并发性能
    多个LN 连接一个 RN，RN confirm 性能
+ Perf_stream_connect_udp_active_10_100
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ (1) 10个LN和RN 之间并行行建立10*100个连接
+ (2) 维持连接5 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
+ LN/RN 内存、CPU、网络带宽 
+ RT : connect_time 、 confirm_time
+ 并发数：10
+ QPS : 每秒confirm 连接请求次数
```
+ Perf_stream_connect_udp_active_20_50
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ (1) 10个LN和RN 之间并行行建立20*50个连接
+ (2) 维持连接5 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
+ LN/RN 内存、CPU、网络带宽 
+ RT : connect_time 、 confirm_time
+ 并发数：20
+ QPS : 每秒confirm 连接请求次数
```
+ Perf_stream_connect_udp_active_50_20
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ (1) 10个LN和RN 之间并行行建立50*20个连接
+ (2) 维持连接5 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽
+ LN/RN 内存、CPU、网络带宽 
+ RT : connect_time 、 confirm_time
+ 并发数：50
+ QPS : 每秒confirm 连接请求次数 
```
+ Perf_stream_connect_udp_active_100_10
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ (1) 10个LN和RN 之间并行行建立100*10个连接
+ (2) 维持连接5 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
+ LN/RN 内存、CPU、网络带宽 
+ RT : connect_time 、 confirm_time
+ 并发数：100
+ QPS : 每秒confirm 连接请求次数
```

## Stream 数据发送
## 拥塞算法
 以下所有用例均覆盖BDT两种拥塞控制算法
+ BBR
+ Ledbat

## 数据发送压力测试
### TCP Stream
#### 静态维持Stream Read 性能消耗
    场景：BDT 建立连接后，需要启动Stream poll_read读取收到的数据，没有数据发送时，poll_read也是处于监听状态
+ perf_stream_read_tcp_keep_100
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ (1) LN RN 之间串行建立100个连接,连接成功后调用stream read
+ (2) 维持连接5 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_read_tcp_keep_1000
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ (1) LN RN 之间串行建立1000个连接,连接成功后调用stream read
+ (2) 维持连接5 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ Perf_stream_read_tcp_keep_2000
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ (1) LN RN 之间串行建立2000个连接,连接成功后调用stream read
+ (2) 维持连接5 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_read_tcp_keep_5000
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ (1) LN RN 之间串行建立5000个连接,连接成功后调用stream read
+ (2) 维持连接5 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_connect_tcp_keep_10000
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ (1) LN RN 之间串行建立10000个连接,连接成功后调用stream read
+ (2) 维持连接5 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```


#### Stream Write/Read 对上层Cache Buffer 内存使用正确性
    场景：上传使用BDT Stream,发送和接收的buffer在内存中是否正常引用使用cache，和释放内存中cache，保证无内存溢出问题 

+ perf_stream_send_tcp_data_size_1KB_10000
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ (1) LN RN 之间建立一个连接，LN <-> RN 之间持续 request 1KB 大小数据，response 1KB 10000次
+ (2) 维持连接1 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_send_tcp_data_size_1MB_1000
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ (1) LN RN 之间建立一个连接，LN <-> RN 之间持续 request 1MB 大小数据，response 1MB 1000次
+ (2) 维持连接1 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_send_tcp_data_size_10MB_100
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ (1) LN RN 之间建立一个连接，LN <-> RN 之间持续 request 10MB 大小数据，response 10MB 100次
+ (2) 维持连接1 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_send_tcp_data_size_100MB_10
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ (1) LN RN 之间建立一个连接，LN <-> RN 之间持续 request 100MB 大小数据，response 100MB 10次
+ (2) 维持连接1 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
#### Stream 并发Write 流量平均分配
    场景：BDT 节点并发向多个节点发送数据 
+ perf_stream_send_tcp_1LN_10RN_1MB_100
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ (1) LN 和10个RN 之间建立一个连接，LN -> RN 发送数据，串行发送100*1MB数据
+ (2) 维持连接1 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_send_tcp_1LN_20RN_1MB_100
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ (1) LN 和20个RN 之间建立一个连接，LN -> RN 发送数据，串行发送100*1MB数据
+ (2) 维持连接1 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_send_tcp_1LN_50RN_1MB_100
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ (1) LN 和50个RN 之间建立一个连接，LN -> RN 发送数据，串行发送100*1MB数据
+ (2) 维持连接1 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_send_tcp_1LN_100RN_1MB_100
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ (1) LN 和100个RN 之间建立一个连接，LN -> RN 发送数据，串行发送100*1MB数据
+ (2) 维持连接1 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
#### Stream 并发Read 流量平均分配
    场景：BDT 节点并发接收多个节点数据 
+ perf_stream_send_tcp_1LN_10RN_1MB_100
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ (1) LN 和10个RN 之间建立一个连接，LN -> RN 发送数据，串行发送100*1MB数据
+ (2) 维持连接1 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_send_tcp_1LN_20RN_1MB_100
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ (1) LN 和20个RN 之间建立一个连接，LN -> RN 发送数据，串行发送100*1MB数据
+ (2) 维持连接1 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_send_tcp_1LN_50RN_1MB_100
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ (1) LN 和50个RN 之间建立一个连接，LN -> RN 发送数据，串行发送100*1MB数据
+ (2) 维持连接1 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_send_tcp_1LN_100RN_1MB_100
```
```



#### Stream 半闭连接释放资源

+ perf_stream_tcp_shutdown_write_100_connection
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ 10个LN 设备 连接一个 RN 设备，建立100连接，每个连接LN->RN 发送10MB数据，在发送完成1MB后，LN shutdown连接
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_tcp_shutdown_write_1000_connection
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ 10个LN 设备 连接一个 RN 设备，建立1000连接，每个连接LN->RN 发送10MB数据，在发送完成1MB后，LN shutdown连接
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_tcp_shutdown_write_5000_connection
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ 10个LN 设备 连接一个 RN 设备，建立5000连接，每个连接LN->RN 发送10MB数据，在发送完成1MB后，LN shutdown连接
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_tcp_shutdown_read_100_connection
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ 1个LN 设备 连接10个 RN 设备，建立100连接，每个连接LN->RN 发送10MB数据，在发送完成1MB后，RN shutdown连接
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_tcp_shutdown_read_1000_connection
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ 1个LN 设备 连接10个 RN 设备，建立1000连接，每个连接LN->RN 发送10MB数据，在发送完成1MB后，RN shutdown连接
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_tcp_shutdown_read_5000_connection
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ 1个LN 设备 连接10个 RN 设备，建立5000连接，每个连接LN->RN 发送10MB数据，在发送完成1MB后，RN shutdown连接
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_tcp_shutdown_both_100_connection
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ 1个LN 设备 连接10个 RN 设备，建立100连接，每个连接LN->RN 发送1MB数据，在发送完成1MB后，LN 和 RN都 shutdown连接
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_tcp_shutdown_both_1000_connection
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ 1个LN 设备 连接10个 RN 设备，建立1000连接，每个连接LN->RN 发送1MB数据，在发送完成1MB后，LN 和 RN都 shutdown连接
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_tcp_shutdown_both_5000_connection
```
## 测试环境
+ LN RN 只使用TCP连接 
## 操作步骤
+ 1个LN 设备 连接10个 RN 设备，建立5000连接，每个连接LN->RN 发送1MB数据，在发送完成1MB后，LN 和 RN都 shutdown连接
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```



### UDP Stream
#### 静态维持Stream Read 性能消耗
    场景：BDT 建立连接后，需要启动Stream poll_read读取收到的数据，没有数据发送时，poll_read也是处于监听状态
+ perf_stream_read_udp_keep_100
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ (1) LN RN 之间串行建立100个连接,连接成功后调用stream read
+ (2) 维持连接5 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_read_udp_keep_1000
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ (1) LN RN 之间串行建立1000个连接,连接成功后调用stream read
+ (2) 维持连接5 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ Perf_stream_read_udp_keep_2000
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ (1) LN RN 之间串行建立2000个连接,连接成功后调用stream read
+ (2) 维持连接5 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_read_udp_keep_5000
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ (1) LN RN 之间串行建立5000个连接,连接成功后调用stream read
+ (2) 维持连接5 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_connect_udp_keep_10000
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ (1) LN RN 之间串行建立10000个连接,连接成功后调用stream read
+ (2) 维持连接5 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```


#### Stream Write/Read 对上层Cache Buffer 内存使用正确性
    场景：上传使用BDT Stream,发送和接收的buffer在内存中是否正常引用使用cache，和释放内存中cache，保证无内存溢出问题 

+ perf_stream_send_udp_data_size_1KB_10000
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ (1) LN RN 之间建立一个连接，LN <-> RN 之间持续 request 1KB 大小数据，response 1KB 10000次
+ (2) 维持连接1 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_send_udp_data_size_1MB_1000
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ (1) LN RN 之间建立一个连接，LN <-> RN 之间持续 request 1MB 大小数据，response 1MB 1000次
+ (2) 维持连接1 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_send_udp_data_size_10MB_100
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ (1) LN RN 之间建立一个连接，LN <-> RN 之间持续 request 10MB 大小数据，response 10MB 100次
+ (2) 维持连接1 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_send_udp_data_size_100MB_10
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ (1) LN RN 之间建立一个连接，LN <-> RN 之间持续 request 100MB 大小数据，response 100MB 10次
+ (2) 维持连接1 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
#### Stream 并发Write 流量平均分配
    场景：BDT 节点并发向多个节点发送数据 
+ perf_stream_send_udp_1LN_10RN_1MB_100
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ (1) LN 和10个RN 之间建立一个连接，LN -> RN 发送数据，串行发送100*1MB数据
+ (2) 维持连接1 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_send_udp_1LN_20RN_1MB_100
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ (1) LN 和20个RN 之间建立一个连接，LN -> RN 发送数据，串行发送100*1MB数据
+ (2) 维持连接1 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_send_udp_1LN_50RN_1MB_100
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ (1) LN 和50个RN 之间建立一个连接，LN -> RN 发送数据，串行发送100*1MB数据
+ (2) 维持连接1 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_send_udp_1LN_100RN_1MB_100
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ (1) LN 和100个RN 之间建立一个连接，LN -> RN 发送数据，串行发送100*1MB数据
+ (2) 维持连接1 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
#### Stream 并发Read 流量平均分配
    场景：BDT 节点并发接收多个节点数据 
+ perf_stream_send_udp_1LN_10RN_1MB_100
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ (1) LN 和10个RN 之间建立一个连接，LN -> RN 发送数据，串行发送100*1MB数据
+ (2) 维持连接1 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_send_udp_1LN_20RN_1MB_100
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ (1) LN 和20个RN 之间建立一个连接，LN -> RN 发送数据，串行发送100*1MB数据
+ (2) 维持连接1 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_send_udp_1LN_50RN_1MB_100
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ (1) LN 和50个RN 之间建立一个连接，LN -> RN 发送数据，串行发送100*1MB数据
+ (2) 维持连接1 min
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_send_udp_1LN_100RN_1MB_100
```
```



#### Stream 半闭连接释放资源

+ perf_stream_udp_shutdown_write_100_connection
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ 10个LN 设备 连接一个 RN 设备，建立100连接，每个连接LN->RN 发送10MB数据，在发送完成1MB后，LN shutdown连接
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_udp_shutdown_write_1000_connection
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ 10个LN 设备 连接一个 RN 设备，建立1000连接，每个连接LN->RN 发送10MB数据，在发送完成1MB后，LN shutdown连接
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_udp_shutdown_write_5000_connection
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ 10个LN 设备 连接一个 RN 设备，建立5000连接，每个连接LN->RN 发送10MB数据，在发送完成1MB后，LN shutdown连接
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_udp_shutdown_read_100_connection
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ 1个LN 设备 连接10个 RN 设备，建立100连接，每个连接LN->RN 发送10MB数据，在发送完成1MB后，RN shutdown连接
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_udp_shutdown_read_1000_connection
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ 1个LN 设备 连接10个 RN 设备，建立1000连接，每个连接LN->RN 发送10MB数据，在发送完成1MB后，RN shutdown连接
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_udp_shutdown_read_5000_connection
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ 1个LN 设备 连接10个 RN 设备，建立5000连接，每个连接LN->RN 发送10MB数据，在发送完成1MB后，RN shutdown连接
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_udp_shutdown_both_100_connection
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ 1个LN 设备 连接10个 RN 设备，建立100连接，每个连接LN->RN 发送1MB数据，在发送完成1MB后，LN 和 RN都 shutdown连接
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_udp_shutdown_both_1000_connection
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ 1个LN 设备 连接10个 RN 设备，建立1000连接，每个连接LN->RN 发送1MB数据，在发送完成1MB后，LN 和 RN都 shutdown连接
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```
+ perf_stream_udp_shutdown_both_5000_connection
```
## 测试环境
+ LN RN 只使用UDP连接 
## 操作步骤
+ 1个LN 设备 连接10个 RN 设备，建立5000连接，每个连接LN->RN 发送1MB数据，在发送完成1MB后，LN 和 RN都 shutdown连接
## 性能监控
+ LN/RN 内存、CPU、网络带宽 
```



# 二、网络模拟时延/带宽/丢包测试
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


# 三、数据报文分析

### 首次连接发送报文分析
+ TCP SNcall
+ TCP SNcall 反连机制
+ UDP SNcall
+ TCP 直接
+ UDP 直连
```
操作流程
+ 使用tcpdump分析两个节点间，和SN直接的数据报文，分析整体实现正确性和效率
+ LN->SN->RN 一次标准通过SNCall 建立连接发送数据报文分析
```
### 二次连接发送报文分析
+ TCP 二次连接
+ UDP 二次连接
```
操作流程
+ 使用tcpdump分析两个节点间，和SN直接的数据报文，分析整体实现正确性和效率
+ LN-->RN 一次标准直连或二次连接标准流程发送报文分析
```
### Stream数据传输发送报文分析
+ TCP 数据发送
+ UDP 数据发送
```
操作流程
+ 使用tcpdump分析两个节点间，和SN直接的数据报文，分析整体实现正确性和效率
+ LN-->RN 发送1MB 数据，整体发送报文分析，统计传输效率
```
# 四、拥塞控制/算法控制参数测试
+ BBR
+ Ledbat
#### 慢启动数据报文分析
#### 拥塞避免数据报文分析
#### 快重传数据报文分析
#### 快恢复数据报文分析


