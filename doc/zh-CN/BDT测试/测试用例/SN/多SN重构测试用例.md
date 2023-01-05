# 多SN 重构需求

## Device SNPing上线超时切换SN


+ 优先使用KID计算距离最近SN上线

+ 第一个SN上线5s超时后,选择第二近SN尝试上线，第二个5s超时选择第三个，直至成功在sn list中任意一个SN上线成功 

+ Device 实际上线的SN只有一个

## Device SNCall尝试使用多个SN

+ 优先使用KID计算Remote距离最近SN进行SNCall

+ SNCall 2s后未连接成功，使用其他SN并发同时进行SNCall 

+ 连接总超时时间为5s  


# 测试用例
+ (1) SN1美国 : Area[0,0,0,0] 
+ (2) SN2美国 : Area[226,0,0,1]
+ (3) SN3中国 ：Area[44,0,0,1]

### SNPing 
#### SNPing 就近原则 

+ 默认Area Device 选择SN上线
```test_sn_mut_v2_online_zero_001
操作步骤：
（1）设置Device Area [0,0,0,1]
（2）初始化BDT协议栈 SN list 设置[SN1,SN2,SN3]
预期结果：
（1）Device 在SN1 上线
```
+ 中国Area 44 Device 选择SN上线
```test_sn_mut_v2_online_cn_002
操作步骤：
（1）设置Device Area [44,0,0,1]
（2）初始化BDT协议栈 SN list 设置[SN1,SN2,SN3]
预期结果：
（1）Device 在SN2 上线
```
+ 美国Area 226 Device 选择SN上线
```test_sn_mut_v2_online_un_003
操作步骤：
（1）设置Device Area [226,0,0,1]
（2）初始化BDT协议栈 SN list 设置[SN1,SN2,SN3]
预期结果：
（1）Device 在SN3 上线
```
#### SNPing 超时切换SN
+ 默认Area Device在首个SN上线失败切换第二个SN
```test_sn_mut_v2_online_004
前置条件：
Device 和 SN1 网络不互通
操作步骤：
（1）设置Device Area [0,0,0,1]
（2）初始化BDT协议栈 SN list 设置[SN1,SN2,SN3]
预期结果：
（1）Device 在SN2 上线
```
+ 中国Area 44 Device在首个SN上线失败切换第二个SN
```test_sn_mut_v2_online_005
前置条件：
Device 和 SN2 网络不互通
操作步骤：
（1）设置Device Area [44,0,0,1]
（2）初始化BDT协议栈 SN list 设置[SN1,SN2,SN3]
预期结果：
（1）Device 在SN3 上线
```
+ 美国Area 226 Device在首个SN上线失败切换第二个SN
```test_sn_mut_v2_online_006
前置条件：
Device 和 SN3 网络不互通
操作步骤：
（1）设置Device Area [226,0,0,1]
（2）初始化BDT协议栈 SN list 设置[SN1,SN2,SN3]
预期结果：
（1）Device 在SN2 上线
```
+ 默认Area Device在首个、第二个SN上线失败，切换第三个
```test_sn_mut_v2_online_007
前置条件：
Device 和 SN1、SN2 网络不互通
操作步骤：
（1）设置Device Area [0,0,0,1]
（2）初始化BDT协议栈 SN list 设置[SN1,SN2,SN3]
预期结果：
（1）Device 在SN3 上线
```
+ 中国Area 44 Device在首个、第二个SN上线失败，切换第三个
```test_sn_mut_v2_online_008
前置条件：
Device 和 SN2、SN3 网络不互通
操作步骤：
（1）设置Device Area [44,0,0,1]
（2）初始化BDT协议栈 SN list 设置[SN1,SN2,SN3]
预期结果：
（1）Device 在SN1 上线
```
+ 美国Area 226 Device在首个、第二个SN上线失败，切换第三个
```test_sn_mut_v2_online_009
前置条件：
Device 和 SN2、SN3 网络不互通
操作步骤：
（1）设置Device Area [226,0,0,1]
（2）初始化BDT协议栈 SN list 设置[SN1,SN2,SN3]
预期结果：
（1）Device 在SN1 上线
```
### SNCall 

#### UDP SNCall流程
+ 相同上线SN SNCall流程
```test_sn_mut_v2_call_001
操作步骤：
（1）LN设置Device Area [226,0,0,1]，RN设置Device Area [226,0,0,1]，
（2）LN、RN初始化BDT协议栈 SN list 设置[SN1,SN2,SN3]
（3）LN->RN 发起连接
预期结果：
（1）LN 连接RN成功
```
+ 不同上线SN SNCall流程
```test_sn_mut_v2_call_002
操作步骤：
（1）LN设置Device Area [226,0,0,1]，RN设置Device Area [44,0,0,1]，
（2）LN、RN初始化BDT协议栈 SN list 设置[SN1,SN2,SN3]
（3）LN->RN 发起连接
预期结果：
（1）LN 连接RN成功
```
+ remote上线SN非KID计算距离最近SN
```test_sn_mut_v2_call_003
前置条件
RN 与SN2网络不通，在SN3上线
操作步骤：
（1）LN设置Device Area [226,0,0,1]，RN设置Device Area [44,0,0,1]，
（2）LN、RN初始化BDT协议栈 SN list 设置[SN1,SN2,SN3]
（3）LN->RN 发起连接
预期结果：
（1）LN 连接RN成功
```
#### TCP 反连 SNCall流程
+ 相同上线SN SNCall流程
```test_sn_mut_v2_call_004
前置条件
(1) LN 、RN 同时使用TCP、UDP,且配置udp sn only
操作步骤：
（1）LN设置Device Area [226,0,0,1]，RN设置Device Area [226,0,0,1]，
（2）LN、RN初始化BDT协议栈 SN list 设置[SN1,SN2,SN3]
（3）LN->RN 发起连接
预期结果：
（1）LN 连接RN成功
```
+ 不同上线SN SNCall流程
```test_sn_mut_v2_call_005
前置条件
(1) LN 、RN 同时使用TCP、UDP,且配置udp sn only
操作步骤：
（1）LN设置Device Area [226,0,0,1]，RN设置Device Area [44,0,0,1]，
（2）LN、RN初始化BDT协议栈 SN list 设置[SN1,SN2,SN3]
（3）LN->RN 发起连接
预期结果：
（1）LN 连接RN成功
```
+ remote上线SN非KID计算距离最近SN
```test_sn_mut_v2_call_006
前置条件
(1) LN 、RN 同时使用TCP、UDP,且配置udp sn only
(2) RN 与SN2网络不通，在SN3上线
操作步骤：
（1）LN设置Device Area [226,0,0,1]，RN设置Device Area [44,0,0,1]，
（2）LN、RN初始化BDT协议栈 SN list 设置[SN1,SN2,SN3]
（3）LN->RN 发起连接
预期结果：
（1）LN 连接RN成功
```
#### BuildTunnelParams SN参数

+ BuildTunnelParams参数中remote_sn参数配置
```test_sn_mut_v2_BuildTunnelParams_001
操作步骤：
（1）LN设置Device Area [226,0,0,1]，RN设置Device Area [44,0,0,1]，
（2）LN、RN初始化BDT协议栈 SN list 设置[SN1,SN2,SN3]
（3）LN->RN 发起连接,BuildTunnelParams 设置remote_sn为Some([SN1,SN2,SN3])
预期结果：
（1）LN 连接RN成功
```
+ BuildTunnelParams参数中remote（Device）中sn list
```test_sn_mut_v2_BuildTunnelParams_002
操作步骤：
（1）LN设置Device Area [226,0,0,1]，RN设置Device Area [44,0,0,1]，
（2）LN、RN初始化BDT协议栈 SN list 设置[SN1,SN2,SN3]
（3）LN->RN 发起连接,BuildTunnelParams 设置remote_sn为None ，remote（Device）中sn list为[SN1,SN2,SN3]
预期结果：
（1）LN 连接RN成功
```
+ LN 本地SN List
```test_sn_mut_v2_BuildTunnelParams_002
操作步骤：
（1）LN设置Device Area [226,0,0,1]，RN设置Device Area [44,0,0,1]，
（2）LN、RN初始化BDT协议栈 SN list 设置[SN1,SN2,SN3]
（3）LN->RN 发起连接,BuildTunnelParams 设置remote_sn为None ，remote（Device）中sn list为空
预期结果：
（1）LN 连接RN成功
```
#### reset_sn_list
+ reset_sn_list后在新SN上线
```
操作步骤
(1)设置Device Area[44,0,0,1]
(2)初始化SN List 设置SN1,协议栈在SN1上线
(3)BDT协议栈调用reset_sn_list [SN1,SN2,SN3],协议栈重新在SN2上线
```
+ reset_sn_list后发起SNCall
```
操作步骤
(1)设置Device1 Area[44,0,0,1] Device2 Area[226,0,0,1]
(2)Device1、Device2初始化SN List 设置SN1,协议栈在SN1上线
(3)Device1、Device2 调用reset_sn_list [SN1,SN2,SN3],协议栈重新上线
(4)Device1->Device2发起连接
```