## OOD Service 测试环境

目前官方发布的CYFS OOD service有两个环境

+ Nightly（1.1.0.XXX） : 开发者在Nighlty环境进行测试，通常每天会进行新的构建和集成测试，以及用来验证BUG的修复。
+ Beta（1.1.1.XXX） : 当前用作生产环境，CYFS 的生态合作伙伴在该版本进行产品开发。

可以通过版本号第三位区分测试环境1-Beta、0-Nightly

## 安装方法:

+ Beta 环境 DIY-OOD 下载：
  + [WIndows](https://www.cyfs.com/download/beta/ood/windows/latest)
  + [Linux](https://www.cyfs.com/download/beta/ood/linux/latest/)

+ Nighlty 环境 DIY-OOD 下载：
  + [WIndows](https://www.cyfs.com/download/beta/ood/windows/latest)
  + [Linux](https://www.cyfs.com/download/beta/ood/linux/latest/)

## 配置OOD测试版本方法
OOD 默认安装的Service版本是官方配置的稳定版本，通常我们用来测试，可以通过配置更新到指定的测试版本

配置文件路径: /cyfs/etc/ood-daemon/system-config.toml
```
[device]
# 配置指定service版本 当前只支持三位数字版本号
service_version = "=1.1.752"
# 是否启用预发布，目前主要用于内部测试，开启后可以安装preview版本OOD service
preview = false
```

配置规则: 
+ ser vice_version = "*" : 会跟随CYFS官方更新到最新版本OOD service，支持preview版本配置。
+ service_version = "=1.1.76" : 会切换1.1.76版本,且OOD service 不会自动升级，支持preview版本配置
+ service_version = "default" : 默认配置，如果没有配置service_version，默认为default,会跟随CYFS官方更新到最新版本OOD service,不支持preview版本配置。
+ 有效的语义版本的设计和cargo的version一致，可以参考https://semver.org/

三位版本号和四位版本号兼容规则: 第三位数字为nighlty/beta版本标识
+ 1.1.0.76 代表nightly环境1.1.76 版本
+ 1.1.1.76 代表beta环境1.1.76 版本


## 查看本地 OOD service 版本的方式
	
接口方式查看当前版本：GET请求 http://127.0.0.1:1330/service_status
配置文件查看当前版本：/cyfs/etc/ood-daemon/device-config.toml


## 配置自定义编译版本方法

作为开发和测试人员通常有编译自己本地版本，进行测试的需求，我们可以通过以下方式配置自己编译的版本（如果不增加配置，启动时会自动更新为配置文件中最新版本）：

在 ${cyfs_root}/services/gateway/current/ 下增加.lock文件，启动是则不会触发版本校验，使用自己编译的版本。OOD 所有service均支持该配置方式
```
touch /cyfs/services/gateway/current/.lock
```

## 查看CYFS官方已发布版本

目前CYFS OOD service发布的版本，均发布在CYFS 网络中，可以在Nightly 和 Beta 环境的Meta Chain 查找到最新的版本：

### 查看 OOD service 版本的工具编译：
目前 可以通过工具app-tool查看OOD Service版本，或者直接在Meta Chain 上调用接口查询
```
// Nightly 环境需要切换 main 分支代码
git checkout main
// Beta环境需要切换 beta 分支代码
git checkout beta 

cd CYFS/src
cargo build -p app-tool --release
```
Nightly/Beta 环境目前官方配置的ID是相同，区别在于app-tool客户端，不同版本的客户端会从不同环境的Meta chain 进行查询


+ Service List Id

| 描述|AppId |
| ---------- | ---------------------------   |
| OOD Service List | 9tGpLNnakyVtkriXdL6QvAt4Y9nGcW4SPbxkeNHLYDNJ |
| System App List | 9tGpLNnPYrQBpwV6LAksdUptxBNFzRFtts1Acrh9DBij |


+ Service App Id

|  name   | AppId  |
| ---------- | ---------------------------   |
| gateway	|9tGpLNnQnReSYJhrgrLMjz2bFoRDVKP9Dp8Crqy1bjzY |
| chunk-manager	|9tGpLNnabHoTxFbodTHGPZoZrS9yeEZVu83ZVeXL9uVr |
| file-manager	|9tGpLNnDpa8deXEk2NaWGccEu4yFQ2DrTZJPLYLT7gj4 |
| ood-daemon	|9tGpLNnTdsycFPRcpBNgK1qncX6Mh8chRLK28mhNb6fU |
| app-manager	|9tGpLNnDwJ1nReZqJgWev5eoe23ygViGDC4idnCK1Dy5 |

### View OOD service command

+ Query the default version released by the current environment OOD Service:

```
app-tool.exe list show 9tGpLNnakyVtkriXdL6QvAt4Y9nGcW4SPbxkeNHLYDNJ
```

+ Query the default dec app released by OOD in the current environment

```
app-tool.exe list show 9tGpLNnPYrQBpwV6LAksdUptxBNFzRFtts1Acrh9DBij
```

+ Query the gateway list of the current environment version:

```
app-tool.exe app show 9tGpLNnQnReSYJhrgrLMjz2bFoRDVKP9Dp8Crqy1bjzY
```

[Document Link]()
[Chiness]()