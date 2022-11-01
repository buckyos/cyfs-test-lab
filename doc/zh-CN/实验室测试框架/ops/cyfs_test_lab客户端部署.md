# cyfs-test-lab 测试客户端
cyfs_test_lab 客户端主要使用typesript开发，可能涉及部分rust脚本
+ nodejs 14.x 以上版本
+ rust 1.61.0 以上版本

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

## node_tester_app客户端编译
```
cd src/node_tester_app
npm i 
gulp build_app
// 输出的目录 cd ../../deploy/node_tester_app
// 压缩文件成node_tester_app.zip
// 上传到文件共享服务器 \\192.168.100.2\share\lizhihong\BDT\\node_tester_app.zip 
```
### node_tester_app客户端部署

#### windows 客户端部署 
+ 使用anydesk 操作远程windows机器
+ 安装nodejs 14.X
+ 解压压缩包node_tester_app.zip 
+ 可通过node_tester_app\script\start_win.bat 启动客户端
+ node_tester_app\script\start_win.bat 创建运行快捷方式
+ 复制快捷方式到开机启动目录 %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup

#### linux 
+ 远程连接方式，使用反向ssh代理隧道操作不同网段机器
```
ssh -p 6667 root@192.168.200.175
```
+ 安装依赖包
```
//centos
yum install wget
yum install tar
yum install zip
yum install cifs-utils
//ubuntu、debain
apt update
apt install wget
apt install tar
apt install zip
apt install cifs-utils
```
+ 安装node-v14.15.0
```
cd /opt
wget https://npm.taobao.org/mirrors/node/v14.15.0/node-v14.15.0-linux-x64.tar.xz
tar -xvf  node-v14.15.0-linux-x64.tar.xz
cd  node-v14.15.0-linux-x64/bin && ls
./node -v
ln -s /opt/node-v14.15.0-linux-x64/bin/node /usr/local/bin/node
ln -s /opt/node-v14.15.0-linux-x64/bin/npm /usr/local/bin/npm
node -v
```
+ 下载客户端程序，通过远程共享文件夹下载（或者可部署ftp下载服务实现）
```
mkdir -p /media/share
vim /etc/fstab
// 增加远程共享目录挂载 //192.168.100.2/share  /media/share    cifs  guest,uid=0,iocharset=utf8  0  0
mount -a
mkdir -p /node_tester_app
cp /media/share/lizhihong/BDT/node_tester_app.zip  /node_tester_app
cd /node_tester_app
unzip ./node_tester_app.zip
```

+ 将 /node_tester_app/script/node_tester_app.service复制到 /etc/systemd/system
    + 配置文件说明
    ``` node_tester_app.service
    [Unit]
    Description=node tester app

    [Service]
    ExecStart=/bin/bash /node_tester_app/script/start_linux.sh
    ExecStop=/bin/bash /node_tester_app/script/stop.sh
    Restart = always
    Type=forking
    PrivateTmp=true

    [Install]
    WantedBy=multi-user.target
    ```
    + 配置systemctl
    ``` ssh
    cp /node_tester_app/script/node_tester_app.service /etc/systemd/system
    chmod +x /node_tester_app/script/*.sh
    ```
+ 配置开机启动

```
systemctl enable node_tester_app.service
systemctl start node_tester_app
systemctl status node_tester_app
systemctl stop node_tester_app
```

+ 运行成功后会启动三个nodejs 进程
```
ps -ef | grep -E node
root        3413       1  0 03:25 ?        00:00:00 /opt/node-v14.15.0-linux-x64/bin/node /node_tester_app/script/daemon.js linux Agnet
root        3420    3413  0 03:25 ?        00:00:00 /opt/node-v14.15.0-linux-x64/bin/node /node_tester_app/script/startup.js 123 linux
root        3431    3420  0 03:25 ?        00:00:00 /opt/node-v14.15.0-linux-x64/bin/node /node_tester_app/script/master_main.js /node_tester_app tQh6Z46Q6mKrD4SEEsyFx8HfTY7nMcez4cW6PKxyN4hzZHc6c4kdiDFmENE5Pazr linux

```
### node_tester_app客户端本地运行测试用例
```
cd deploy/node_tester_app
// 通过io输入运行用例方式
node host/tool.js
>runTask("${service_id}","${task_id}")
// 通过脚本批量运行用例方式,需要修改tool_run.js中要运行的service和用例列表
node host/tool_run.js
```
### 客户端批量上传测试用例到测试框架
```
cd deploy/node_tester_app/tools
// zipTask.js 打包测试用例脚本
// upload_task.js //上传测试用例到测试框架，创建测试任务
```

## 常用测试工具编译

### zone-simulator 编译
```
// 准备环境
安装 rust 开发环境
//切换到项目CYFS
cd CYFS\src
cargo update
cargo build -p zone-simulator --release
生成在 CYFS\src\target\release 目录下
```
### cyfs_sdk TS 版本编译
```
// 准备环境
安装 nodejs 开发环境
//切换到项目cyfs_ts
cd cyfs_ts
npm i 
npm run build:node //其他版本看package.json 命令
```

### bdt-tools
bdt-tools 是使用rust 实现的BDT客户端，用来测试BDT网络协议在cyfs-test-lab环境中运行的性能
```
cd cyfs-test-lab/src/bdt-tools
cargo build -p bdt-tools --release
```