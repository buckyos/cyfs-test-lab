## 初始化方式
+ (1) 安装环境
  安装 git
  https://git-scm.com/downloads
  下载对应平台安装包进行安装
  
  安装 node
  https://nodejs.org/en/
  下载对应安装包进行安装，推荐LTS版本

  
+ (2) 获取代码
```
git clone  https://github.com/buckyos/cyfs-test-lab.git
cd cyfs-test-lab
git submodule init
git submodule update
```

+ (3) 更新协议栈测试代码
```
cd src/cyfs-stack-test-typescript
npm i
```

+ (4) cyfs-ts-sdk 环境初始化
```
cd  cyfs-ts-sdk
npm i
npm run build node
// 输出cyfs_node 文件目录 cyfs-ts-sdk/out/cyfs_node.d.ts cyfs_node.js
```
+ (5)测试工具准备
```
cd CYFS
cargo build -p zone-simulator --release
// 模拟器文件
cyfs-test-lab\CYFS\src\target\release\zone-simulator.exe
//工具目录
cyfs-test-lab\src\cyfs-stack-test-typescript\cyfs_node 
//准备三个文件
zone-simulator.exe
cyfs_node.d.ts
cyfs_node.js
```
+ (6)切换依赖源码的方式
```
cd src/cyfs-stack-test-typescript 
npm run init cyfs-sdk-nightly // 切换nightly sdk
npm run init cyfs-sdk //切换 beta sdk
npm run init source //切换 cyfs-ts-sdk master 分支代码
npm run init cyfs-node //切换编译后sdk
```
