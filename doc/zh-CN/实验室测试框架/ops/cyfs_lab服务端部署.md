# cyfs_lab 服务端部署流程
+ node_tester_web ： 测试前端页面
+ node_tester_server ：测试框架的后端接口，测试节点软件更新和日志上报服务，测试节点socket请求的代理服务
+ node_tester_service : 测试用例操作数据上报服务

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
+ 安装其他软件依赖
```sh
apt-get install zip 
apt-get install git 
apt-get install redis 
```

## 拉取测试代码仓库
```
git clone  https://git.buckycloud.com/lizhihong/cyfs_stack2.git
```

## node_tester_server

### Python 
python + Flask + redis : 测试框架客户端服务更新、测试日志保存服务、bdt2_echo测试接口服务

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
gunicorn -b 127.0.0.1:12000 api:app  >> server.log &
// 后台启动
nohup gunicorn -b 127.0.0.1:12000 api:app  >> server.log 2>&1&
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

## node_tester_web
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

## node_tester_service
测试数据执行结果保存 nodejs + mysql + prisma + express
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