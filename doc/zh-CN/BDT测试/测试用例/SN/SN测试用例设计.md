## SN测试用例设计

SN 是BDT实现P2P网络NAT穿透的必要组件，主要功能在其他模块已进行覆盖，针对SN server端主要进行性能测试。

### SN内部实现功能
+ SNPing : 节点通过SNPing再SN上线，SN cache Device 对象信息
+ SNCall + SNCalled : SN 辅助进行NAT 穿透

### 多SN场景测试用例
+ 选择SN的原则：就近原则，按照country，carrier，city完成排序；
```rust
pub struct Area {
    pub country: u16,
    pub carrier: u8,
    pub city: u16,
}
```
+ 获取sn的规则和时机
* client的选择，在client端存在多个sn的情况下，根据就近原则选择最近距离选择sn；
* sn-miner的选择，
  * 在ping-req处理过程中增加就近原则处理流程，
  * 在ping-resp中result，增加Redirect错误码处理，client端对于此错误进行对sn的切换，完成新的ping-req；

+ 跨sn发起call
由client发起的SnCall请求，将有sn针对就近原则转发到对应的sn上；

+ Area 范围
+ 




# sn加入和移除

* 新增：对于新的sn加入，新的sn启动后，对已知sn进行SnPing，
* 移除：按照现有knock逻辑，失去心跳之后，将sn移除；




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
