# cyfs_test_lab 服务端部署流程
cyfs_test_lab 服务端主要使用nodejs开发，可能涉及部分rust、python服务，我们对测试开发环境有以下版本要求。
+ nodejs 14.x 以上版本
+ python 3.7 以上版本
+ rust 1.61.0 以上版本

cyfs_test_lab 服务端主要包括以下服务：
+ node-tester-server : 
    + HTTP_FILE_SERVER ：测试节点软件包service更新、日志上报的文件系统服务，用于测试节点软件包更新，日志上传。
    + agent_master_AgentServer : 实现tcp websocket 代理服务，为测试节点之间命令下发提供网络代理服务。
    + agent_master_AgentControl ：实现的测试框架后台管理系统，实现测试节点、测试用例、测试软件包、测试任务创建执行、测试结果查看、日志下载功能 
+ node-tester-web : 测试框架后台管理系统前端页面
+ node-tester-data ：测试数据收集统计服务
+ sn-miner : BDT网络协议实现NAT穿透SN服务器
+ pn-miner : BDT网络协议进行流量代理PN服务器


## 基础软件安装

+ 安装nodejs，使用的是nodejs version 14
```sh
curl -fsSL https://deb.nodesource.com/setup_14.x | bash - && apt install -y nodejs
```
+ 安装python, 使用的是python 3.7.9
```sh
// 安装依赖的包，否则可能出现报错
sudo apt install libssl-dev libncurses5-dev libsqlite3-dev libreadline-dev libtk8.6 libgdm-dev libdb4o-cil-dev libpcap-dev
sudo wget https://www.python.org/ftp/python/3.7.9/Python-3.7.9.tgz
sudo tar xzf Python-3.7.9.tgz
cd Python-3.7.9/
sudo ./configure --enable-optimizations
make
make install
// 安装pip
wget https://bootstrap.pypa.io/get-pip.py
python get-pip.py
```
+ rust 安装
```
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

+ 安装其他软件依赖
```sh
apt-get install zip 
apt-get install git 
apt-get install redis 
```

## 拉取测试代码仓库
+ 拉取测试仓库cyfs-test-lab
```
git clone  https://github.com/buckyos/cyfs-test-lab.git
```
+ 更新依赖CYFS源码
```
// 更新测试仓库submodule 方式
cd cyfs-test-lab
git submodule init
git submodule update
// 更新源码 rust
cd CYFS
git pull
git checkout master / 切换分支操作，选择执行
// 更新源码 ts
cd cyfs_ts
git pull
git checkout master // 切换分支操作，选择执行
```

## node-tester-server服务部署

### HTTP_FILE_SERVER 
HTTP_FILE_SERVER 使用python + Flask + redis实现。

部署步骤：

+ 安装python依赖包
```
cd node_tester_server
pip install -r requirements.txt -i https://pypi.mirrors.ustc.edu.cn/simple/ 
```
+ 启动服务 gunicorn
```
cd /opt/bdt_test_server/node_tester/server
// 直接启动
gunicorn -b 127.0.0.1:11000 api:app  >> server.log &
// 后台启动
nohup gunicorn -b 127.0.0.1:11000 api:app  >> server.log 2>&1&
```
### agent_master
nodejs + sqlite3 + socket + koa ： 测试框架后台接口、sokect请求转发

部署步骤：
```sh
cd node_tester_server
npm i  //安装nodejs 依赖包
nohup node ./agent_master/main.js >> server_nodejs.log 2>&1&
```

运行后会在本地启动两个服务
+ AgentServer   port: 11080,转发测试节点的tcp socket请求，为测试框架命令下发提供代理服务
+ AgentControl  port: 11081,测试框架的后端接口

## node-tester-web 前端页面部署
测试框架前端页面： vue
修改后端服务的配置文件
```
vim node_tester_web\src\data\config.ts
```
```
public static apiServer = 'http://192.168.100.254:11081';
public static uploadServer = 'http://192.168.100.254:12000/uploadFile/';
```
编译部署
```
cd node_tester_web
npm i 
// 编译静态页面
npm run build
// 生成静态页面在 /node_test/cyfs_stack2/src/node_tester_web/dist
```

## node-tester-data部署
node-tester-data 测试数据收集统计服务使用typescript + mysql + prisma + express实现，统计BDT网络协议和CYFS协议栈真实环境运行的测试数据
```
cd node_tester_service
npm i 
npx tsc
nohup node server.js >> server.log 2>&1&
```

## 配置nginx 代理
```
server {
    listen       192.168.100.254:12000;
    server_name  192.168.100.254;
	location  / {
        proxy_pass http://127.0.0.1:12000/;
		client_max_body_size 1000m;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
server {
    listen       192.168.100.254:11080;
    server_name  192.168.100.254;
	location  / {
        proxy_pass http://127.0.0.1:11080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
server {
    listen       192.168.100.254:11081;
    server_name  192.168.100.254;
	location  / {
        proxy_pass http://127.0.0.1:11081/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
server {
    listen       192.168.100.254:5000;
    server_name  192.168.100.254;
	location  / {
        proxy_pass http://127.0.0.1:5000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
server {
    listen       192.168.100.254:80;
    server_name  192.168.100.254;
    access_log   logs/ui.access.log  main;
    error_log    logs/ui.error.log debug;
    root /node_test/cyfs_stack2/src/node_tester_web/dist;
    location / {
        try_files $uri $uri/ /index.html =404;
    }
}
```

## SN-Miner 编译部署    
    SN-Miner
+ 更新CYFS仓库代码
```
cd CYFS
git pull
git checkout master / 切换分支操作，选择指定分支进行编译
```
+ 进行编译操作
```
cd src
cargo build -p sn-miner-rust --release
```
+ 部署sn-miner 服务
```
// 复制编译后二进制文件到指定目录
cp /node_test/cyfs-test-lab/CYFS/src/target/release/sn-miner-rust /cyfs_server
cp /node_test/cyfs-test-lab/doc/zh-CN/实验室测试框架/cmd/* /cyfs_server
```
+ 修改sn-miner desc endpoint 配置：desc文件生成在/cyfs/data/app/sn-miner/sn-miner.desc
```
// 编译修改工具desc-tool
cargo build -p desc-tool --release
// 进行修改
./desc-tool modify ./sn-miner.desc -e "W4udp192.168.100.22:8060;W4tcp192.168.100.22:8060;W6udp[240e:3b3:30ca:b990:62d9:2736:9e88:2c48]:8061;W6tcp[240e:3b3:30ca:b990:62d9:2736:9e88:2c48]:8061"
```
+ 配置sn-miner 服务systemctl
```
cp /cyfs_server/sn_miner.service /etc/systemd/system
systemctl enable sn_miner.service
systemctl start sn_miner.service
systemctl status sn_miner.service
```
## PN-Miner 编译部署
+ 更新CYFS仓库代码
```
cd CYFS
git pull
git checkout master / 切换分支操作，选择指定分支进行编译
```
+ 进行编译操作
```
cd src
cargo build -p pn-miner --release
```
+ 创建pn-miner 公私钥
```
./desc-tool create device -c server -e "W4udp192.168.100.151:8060;W4tcp192.168.100.151:8060;W6udp[240e:3b3:30ca:b990:2e0:4cff:fe6f:269d]:8061;W6tcp[240e:3b3:30ca:b990:2e0:4cff:fe6f:269d]:8061" -d pn-miner
// 将生成的desc/sec 文件保存到 /cyfs/data/app/pn-miner ,重命名为pn-miner.desc/pn-miner.sec
```

+ 部署pn-miner 服务
```
// 复制编译后二进制文件到指定目录
cp /node_test/cyfs-test-lab/CYFS/src/target/release/pn-miner /cyfs_server
cp /node_test/cyfs-test-lab/doc/zh-CN/实验室测试框架/cmd/* /cyfs_server
```

```
// 复制编译后二进制文件到指定目录
cp /node_test/cyfs-test-lab/CYFS/src/target/release/pn-miner /cyfs_server
cp /node_test/cyfs-test-lab/doc/zh-CN/实验室测试框架/cmd/* /cyfs_server
```
+ 配置pn-miner 服务systemctl
```
cp /cyfs_server/pn_miner.service /etc/systemd/system
systemctl enable pn_miner.service
systemctl start pn_miner.service
systemctl status pn_miner.service
```