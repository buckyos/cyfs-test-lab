## 模拟网络测试，需要先配置好机器再进行测试

### 安装测速工具
```
yum install -y iperf3
apt install iperf3
# 启动服务端
iperf3 -s
# TCP 测速
iperf3 -c 192.168.100.156 -p 5201 -t 10 
# UDP 测速
iperf3 -c 192.168.100.156 -p 5201 --udp -b 2000M  -t 10

ping 192.168.100.156
```

### 控制网络限速、丢包、延时
```
tc qdisc add dev enp2s0 root netem loss 20% delay 150ms rate 30Mbit
tc qdisc del dev enp2s0 root netem

tc qdisc add dev enp2s0 root netem delay 150ms
```

``` sh
# 线路0：网络带宽1000MbPs、网络时延#0ms、丢包率0%
tc qdisc del dev enp2s0 root netem
# 线路1：网络带宽30MbPs、网络时延#0ms、丢包率0%
tc qdisc add dev enp2s0 root netem rate 30Mbit
# 线路2：网络带宽100MbPs、网络时延#0ms、丢包率0%
tc qdisc add dev enp2s0 root netem rate 100Mbit
# 线路3：网络带宽1000MbPs、网络时延#0ms、丢包率0%
tc qdisc add dev enp2s0 root netem rate 1000Mbit 
# 线路4：网络带宽1000MbPs、网络时延#10ms、丢包率0%
tc qdisc add dev enp2s0 root netem rate 1000Mbit delay 10ms
# 线路5：网络带宽1000MbPs、网络时延#50ms、丢包率0%
tc qdisc add dev enp2s0 root netem rate 1000Mbit delay 50ms
# 线路6：网络带宽1000MbPs、网络时延#100ms、丢包率0%
tc qdisc add dev enp2s0 root netem rate 1000Mbit delay 100ms
# 线路7：网络带宽1000MbPs、网络时延#200ms、丢包率0%
tc qdisc add dev enp2s0 root netem rate 1000Mbit delay 200ms
# 线路8：网络带宽1000MbPs、网络时延#500ms、丢包率0%
tc qdisc add dev enp2s0 root netem rate 1000Mbit delay 500ms
# 线路9：网络带宽100MbPs、网络时延#100ms、丢包率5%
tc qdisc add dev enp2s0 root netem rate 100Mbit delay 100ms loss 5%
# 线路10：网络带宽100MbPs、网络时延#100ms、丢包率10%
tc qdisc add dev enp2s0 root netem rate 100Mbit delay 100ms loss 10%
# 线路11：网络带宽100MbPs、网络时延#100ms、丢包率15%
tc qdisc add dev enp2s0 root netem rate 100Mbit delay 100ms loss 15%
# 线路12：网络带宽100MbPs、网络时延#100ms、丢包率20%
tc qdisc add dev enp2s0 root netem rate 100Mbit delay 100ms loss 20%
```

```
$ yum install epel-release -y    # 依赖第三方库
$ yum install wondershaper -y
wondershaper enp2s0 30Mbit 30Mbit
```