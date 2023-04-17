## DEC APP Project 结构

### cyfs.config.json 配置文件
``` json
{
  "config_version": 1, // 配置文件版本号
  "app_name": "cyfs-test-dec-app", // 创建项目配置的app名称，目前不支持修改，目前app_id是通过owner+app_name计算生成 
  "version": "1.0.42", // DEC APP版本号，ecyfs deploy后版本号会自动增加
  "description": "cyfs-test-dec-app is a dec app for testing", // DEC APP在应用市场的文字说明
  "icon": "cyfs://o/5r4MYfFJ7ktzBzSi1sWmU7BJLgpEEdp8ukbWemsFuQc1/7Tk94YfdUMwpQJiEYieJFpJntCgCyZ131qMdHTEu1nkf", // DEC APP应用程序图标。DEC APP图标支持配置本地文件路径。 cyfs deploy过程中，本地文件会上传到OOD，cyfs://o链接会替换cyfs.config.json中的本地文件路径
  "service": { // DEC APP服务代码配置
    "pack": [ //  DEC APP服务将发布代码
      "dist/common",
      "dist/cyfs-driver-base",
      "dist/dec-app-base",
      "dist/cyfs",
      "dist/config",
      "dist/dec-app-service",
      "dist/cyfs-driver-client"
    ],
    "type": "node", // DEC APP service 服务类型
    "dist_targets": [ // DEC APP service 支持的不同平台
      "x86_64-pc-windows-msvc",
      "x86_64-unknown-linux-gnu"
    ],
    "app_config": { // DEC APP service 的控制脚本配置，包括install/start/stop/status 等命令执行的脚本
      "default": "service_package.cfg"
    },
    "app_dependent_config": { // DEC APP service 目前支持的版本范围
      "default": "dependent.cfg"
    },
    "app_acl_config": { // DEC APP service 需要开放的权限配置
      "default": "acl.cfg"
    }
  },
  "web": { // DEC APP 要发布的网页资源
    "folder": "dist/web", // 要发布的文件夹
    "entry": "index.html" // DEC APP 默认的打开页面,目前只支持配置index.html，DEC_APP 在应用市场打开会默认跳转${folder}/index.html
  },
  "dist": "deploy", // DEC APP 发布过程中，打包生成文件的零时存放目录
  "owner_config": ".cyfs\\owner.json", // DEC APP 发布的私钥配置，发布到服务器需要owner进行签名
  "ext_info": { // DEC APP 应用市场展示的图片资源cyfs链接
    "medias": []
  },
  "app_id": "9tGpLNndR5tyui8DkYBpEz8mFHzjfqkCVmsFusa5roHd" // DEC APP app_id
}
```
### 发布后DEC APP service项目结构 

#### 服务端代码
+ 配置方式：cyfs.config.json::service::pack


OOD上运行DEC APP service 介绍

数据存储路径:
+ DEC APP service 代码存储路径：
+ DEC APP data 存放路径:
+ DEC APP log 存放路径：

DEC APP service 运行方式: 
+ DEC APP 代码下载：
+ DEC APP docker image 创建
+ docker container 运行

DEC APP service命令控制:
+ insatll
+ start
+ stop
+ status


DEC APP service docker 配置说明:

docker 网络配置：

docker container 和宿主机磁盘 mount 关系：




#### 前端网页代码

+ 配置方式：cyfs.config.json::web
  

  
#### 部署配置文件
+  cyfs.config.json::service::app_config ：DEC APP install/start/stop/status 等命令脚本,默认使用service_package.cfg
``` conf
{
	"id": "dec-app-service",
	"version": "1.0.0",
	"install": ["npm i", "node dist/dec-app-service/service.js --install"],
	"start": "node dist/dec-app-service/service.js --start",
	"stop": "node dist/dec-app-service/service.js --stop",
	"status": "node dist/dec-app-service/service.js --status",
	"executable": ["dist/test_file/perf-report-tool"]
}
```
+  package.json: nodejs项目的依赖包


+ acl.cfg




