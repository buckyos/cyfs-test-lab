## OOD Service Testing Environment

Currently, there are two testing environments for the CYFS OOD service released by the official:

+ Nightly (1.1.0.XXX): Developers perform tests in Nightly environment, usually with new builds and integration tests conducted every day, as well as to verify bug fixes.
+ Beta (1.1.1.XXX): Currently used as the production environment, CYFS's ecosystem partners develop products in this version.

You can distinguish the testing environment 1-Beta and 0-Nightly through the third digit of the version number.

## Installation Steps:
+ Download DIY-OOD for Beta environment:
  + [WIndows](https://www.cyfs.com/download/beta/ood/windows/latest)
  + [Linux](https://www.cyfs.com/download/beta/ood/linux/latest/)

+ Download DIY-OOD for Nightly environment:
  + [WIndows](http://bdttest.tinyappcloud.com/cyfs_test_package/DIY_OOD_Nightly/CYFSOOD-x86-64-1.0.0.524-nightly.exe)
  + [Linux](http://bdttest.tinyappcloud.com/cyfs_test_package/DIY_OOD_Nightly/CYFSOOD-x86-64-1.0.0.524-nightly.bin)

## Configuring OOD Testing Version
By default, the Service version installed by OOD is the stable version configured by the official for testing purposes. You can update to the specified testing version through configuration.

Configuration file path: /cyfs/etc/ood-daemon/system-config.toml
```
[device]
# Configuring the specified service version, currently only supports three-digit version numbers.
service_version = "=1.1.752"
# Whether to enable pre-release, currently mainly used for internal testing. After being enabled, the preview version OOD service can be installed.
preview = false
```

Configuration Rules:

+ service_version = "*": Will follow CYFS official to update to the latest version of OOD service, and support preview version configuration.
+ service_version = "=1.1.76": Will switch to version 1.1.76, and OOD service will not be upgraded automatically, and support preview version configuration.
+ service_version = "default": Default configuration. If the service_version is not configured, it will follow CYFS official to update to the latest version of OOD service, and do not support preview version configuration.
+ The design of the semantic versioning and cargo's versioning is consistent, you can refer to https://semver.org/

Compatibility rules for three and four-digit version numbers: The third digit represents the nighlty/beta version identifier.

+ 1.1.0.76 represents version 1.1.76 in the nightly environment.
+ 1.1.1.76 represents version 1.1.76 in the beta environment.

## How to View the Local OOD Service Version

Interface method to view the current version: 
+ GET request http://127.0.0.1:1330/service_status 
+ Configuration file method to view the current version: /cyfs/etc/ood-daemon/device-config.toml

## Configuring Custom Compilation Version

As a developer or tester, you may need to compile your own local version for testing purposes. We can configure our own compiled version through the following method (if no configuration is added, it will automatically be updated to the latest version in the configuration file during startup):

Add .lock file in ${cyfs_root}/services/gateway/current/ 

```sh
touch /cyfs/services/gateway/current/.lock
```

## Viewing the Officially Released Version of CYFS

Currently, the released versions of the CYFS OOD service are all published on the CYFS network, and you can find the latest version on the Meta Chain of the Nightly and Beta environments:

Tool Compilation for Viewing OOD Service Version:
Currently, you can use the app-tool to view the OOD Service version or call the interface directly on the Meta Chain for inquiry.

```
// For the Nightly Environment, switch to the main branch code
git checkout main
// For the Beta Environment, switch to the beta branch code
git checkout beta 

cd CYFS/src
cargo build -p app-tool --release
```

Nightly/Beta environments currently have the same official configuration ID, and the difference lies in the app-tool client. Different versions of the client will query from Meta Chain in different environments.

+ Service List Id

| Describe|AppId |
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


## Document Link

[Document Link](https://github.com/buckyos/cyfs-test-lab/tree/main/doc/en/tutorial/Test-Environment/ood_sevice_config_version.md)
[Chiness](https://github.com/buckyos/cyfs-test-lab/tree/main/doc/zh-CN/使用教程/环境配置/ood_sevice配置测试版本.md)