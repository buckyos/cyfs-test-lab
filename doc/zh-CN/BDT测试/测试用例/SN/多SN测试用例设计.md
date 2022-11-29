# 多SN 需求

+ (1) 客户端选择SN的方式：通过Device 对象中的Area 和SN Device中的 Area,选择最近的SN上线

```
pub struct Area {
    pub country: u16,
    pub carrier: u8,
    pub city: u16,
    pub inner: u8, //对不同的对象来说有不同的意义，比如device这里就表示 device的设备类型。
}
```
  1. 就近规则优先级：|local_country - SN_country| > |local_carrier - SN_carrier| > |local_city - SN_city| 优先现在最近的国家，然后选择最近的州/省，然后是城市

+ (2) 客户端Device对象中包含多个SN，只会选择最近的一个SN上线

+ (3) 客户端 LN 向 客户端RN 发起连接请求，BuildTunnelParams 参数中的SN使用客户端RN Device中的SN

+ (4) 客户端 LN 向 客户端RN 发起连接请求,客户端 LN 只发起SNCall ，并不会在其他SN 上线

+ (5) 户端 LN 向 客户端RN 发起连接请求，BuildTunnelParams 参数中的SN使用客户端RN Device中的SN,且支持多个SN。RN 上线是SN 可以为SN List 中任意SN。

+ (6) 国内SN 处理，当前SN、历史Device 使用Area [0:0:0:0]，不修改Area 地区，默认使用国内SN 上线。

# 多SN用例设计

## 测试SN设计
+ (1) SN1中国 : Area[0,0,0,0] 
+ (2) SN2美国 : Area[1,4,2,2]
+ (3) SN3美国 ：Area[1,8,5,2]

## SN 上线

### SN上线Area就近原则

+ SN_Mut_Online_SelectArea_0001
```
测试用例：中国地域选择中国SN上线
测试数据：
(1) LN 设置Device 对象Area [0,3,3,3]
(2) LN 设置SN List [SN1,SN2,SN3]
(3) LN 启动BDT协议栈
预期结果：
(1) LN 在SN1 上线
```

+ SN_Mut_Online_SelectArea_0002
```
测试用例：美国地域选择美国最近SN上线
测试数据：
(1) LN 设置Device 对象Area [1,4,3,3]
(2) LN 设置SN List [SN1,SN2,SN3]
(3) LN 启动BDT协议栈
预期结果：
(1) LN 在SN2 上线
```

+ SN_Mut_Online_SelectArea_0003
```
测试用例：美国地域选择美国最近州SN上线
测试数据：
(1) LN 设置Device 对象Area [1,8,3,3]
(2) LN 设置SN List [SN1,SN2,SN3]
(3) LN 启动BDT协议栈
预期结果：
(1) LN 在SN3 上线
```

+ SN_Mut_Online_SelectArea_0004
```
测试用例：美国地域选择美国最近州SN上线
测试数据：
(1) LN 设置Device 对象Area [1,9,3,3]
(2) LN 设置SN List [SN1,SN2,SN3]
(3) LN 启动BDT协议栈
预期结果：
(1) LN 在SN3 上线
```

+ SN_Mut_Online_SelectArea_0005
```
测试用例：美国地域选择美国最近州SN上线
测试数据：
(1) LN 设置Device 对象Area [1,7,3,3]
(2) LN 设置SN List [SN1,SN2,SN3]
(3) LN 启动BDT协议栈
预期结果：
(1) LN 在SN3 上线
```

+ SN_Mut_Online_SelectArea_0006
```
测试用例：美国地域选择美国最近州SN上线
测试数据：
(1) LN 设置Device 对象Area [1,3,3,3]
(2) LN 设置SN List [SN1,SN2,SN3]
(3) LN 启动BDT协议栈
预期结果：
(1) LN 在SN2 上线
```

+ SN_Mut_Online_SelectArea_0007
```
测试用例：美国地域选择美国最近州SN上线
测试数据：
(1) LN 设置Device 对象Area [1,5,3,3]
(2) LN 设置SN List [SN1,SN2,SN3]
(3) LN 启动BDT协议栈
预期结果：
(1) LN 在SN2 上线
```

+ SN_Mut_Online_SelectArea_0008
```
测试用例：美国地域选择美国最近州SN上线
测试数据：
(1) LN 设置Device 对象Area [1,6,3,3]
(2) LN 设置SN List [SN1,SN2,SN3]
(3) LN 启动BDT协议栈
预期结果：
(1) LN 在SN2/SN3 上线
```

### SN 上线失败自动切换

+ SN_Mut_Online_check_0001
```
测试用例：客户端设置地域距离中国近，连接不上中国SN，自动切换美国SN
场景: 美国用户错误使用了国内SN
测试数据：
(0) SN1 拦截 LN 请求
(1) LN 设置Device 对象Area [86,3,3,3]
(2) LN 设置SN List [SN1,SN2,SN3]
(3) LN 启动BDT协议栈
预期结果：
(1) LN 在SN2 上线
```

+ SN_Mut_Online_check_0002
```
测试用例：客户端设置地域距离美国SN2近，连接不上SN2，自动切换美国SN3
场景: 同一国家不同运营商可能UDP丢包，SN不能上线
测试数据：
(1) LN 设置Device 对象Area [1,4,2,2]
(2) LN 设置SN List [SN1,SN2,SN3]
(3) LN 启动BDT协议栈
预期结果：
(1)LN 在SN3 上线
```

+ SN_Mut_Online_check_0002
```
测试用例：客户端设置地域距离美国SN2近，连接不上SN2、SN3，自动切换中国SN1
场景: 中国用户错误设置了美国SN，由于墙UDP不能使用
测试数据：
(1) LN 设置Device 对象Area [1,4,2,2]
(2) LN 设置SN List [SN1,SN2,SN3]
(3) LN 启动BDT协议栈
预期结果：
(1)LN 在SN1 上线
```

## SNCall 流程

### LN 和 RN 在相同SN上线

+ SN_Mut_SNCall_SameSN_UDP
```
前置条件：
（1）客户端使用UDP协议
测试数据：
（1）实验室中 LN 、RN 在同一个SN上线，实验室所有机器排列组合(LN NAT + RN NAT < 5)
操作步骤：
（1）LN 向 RN 发起连接
预期结果:
（1）连接成功
```

+ SN_Mut_SNCall_SameSN_TCP_reserve
```
前置条件：
（1）客户端使用TCP、UDP协议，同时开启udp_sn_only
测试数据：
（1）实验室中 LN 、RN 在同一个SN上线，实验室所有机器排列组合(LN 为外网，RN为内网)
操作步骤：
（1）LN 向 RN 发起连接
预期结果:
（1）连接成功
```
### LN 和 RN 在不同SN上线
+ SN_Mut_SNCall_DiffSN_UDP

```
前置条件：
（1）客户端使用UDP协议
测试数据：
（1）实验室中 LN 、RN 在不同SN上线，实验室所有机器排列组合(LN NAT + RN NAT < 5)
操作步骤：
（1）LN 向 RN 发起连接
预期结果:
（1）连接成功
```

+ SN_Mut_SNCall_DiffSN_TCP_reserve
```
前置条件：
（1）客户端使用TCP、UDP协议，同时开启udp_sn_only
测试数据：
（1）实验室中 LN 、RN 在不同SN上线，实验室所有机器排列组合(LN 为外网，RN为内网)
操作步骤：
（1）LN 向 RN 发起连接
预期结果:
（1）连接成功
```

### RN 由于网络原因未在默认SN上线
+ SN_Mut_SNCall_DiffSN_UDP_OnlineError
```
前置条件：
（1）客户端使用UDP协议
测试数据：
（1）实验室中 LN 、RN 在不同SN上线，实验室所有机器排列组合(LN NAT + RN NAT < 5)
（2）RN 由于网络原因未在最近SN上线，自动切换了其他SN
操作步骤：
（1）LN 向 RN 发起连接
预期结果:
（1）连接成功
```

+ SN_Mut_SNCall_SameSN_TCP_reserve_OnlineError
```
前置条件：
（1）客户端使用TCP、UDP协议，同时开启udp_sn_only
测试数据：
（1）实验室中 LN 、RN 在不同SN上线，实验室所有机器排列组合(LN 为外网，RN为内网)
（2）RN 由于网络原因未在最近SN上线，自动切换了其他SN
操作步骤：
（1）LN 向 RN 发起连接
预期结果:
（1）连接成功
```