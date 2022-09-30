## Meta测试用例设计

### 测试点

#### 环境类型
* dec_app真机环境
* 模拟器环境

#### 必填项
* 必填
* 非必填

#### target
* 指定target
* 未指定target
* target等于源设备
* target不等于源设备

#### 设备类型
* OOD
* Device

#### 请求路径
* 空
* 非空
* 合法
* 非法

#### chunk对象
* 空chunk
* 非空chunk
* 已存在chunk
* 不存在chunk

#### 关联对象
* 结构化关联对象
* 非结构化关联对象

#### 传输对象
* file
* chunk

#### Zone类型
* 同zone
* 跨zone

#### 文件大小
* 0 byte
* 1 byte
* 1 Kb
* 1 Mb
* 4 Mb
* 8 Mb
* 16 Mb
* 32 Mb
* 64 Mb
* 128 Mb

#### 文件数量
* 1
* 10
* 100
* 1000
* 10000

#### chunk大小
* 1 Mb
* 4 Mb
* 8 Mb
* 16 Mb
* 32 Mb
* 64 Mb
* 128 Mb

### 测试用例
* SharedCyfsStack Meta相关接口测试，TS meta_client 接口测试,meta接口测试, get_meta_miner_host 接口,target 为Dev 链
* SharedCyfsStack Meta相关接口测试，TS meta_client 接口测试,meta接口测试,get_meta_miner_host 接口,target Test 链
* SharedCyfsStack Meta相关接口测试，TS meta_client 接口测试,meta接口测试,get_meta_spv_host 接口,target 为Dev 链
* SharedCyfsStack Meta相关接口测试，TS meta_client 接口测试,meta接口测试,get_meta_spv_host 接口,target 为Test 链
* SharedCyfsStack Meta相关接口测试，TS meta_client 接口测试,meta接口测试,meta_target_from_str 接口，target 为Dev 链
* SharedCyfsStack Meta相关接口测试，TS meta_client 接口测试,meta接口测试,meta_target_from_str 接口，target 为Test 链
* SharedCyfsStack Meta相关接口测试，TS meta_client 接口测试,meta接口测试,meta_target_from_str 接口，target 为foemal 链
* SharedCyfsStack Meta相关接口测试，TS meta_client 接口测试,meta接口测试,get_meta_client 接口，target 为Dev 链
* SharedCyfsStack Meta相关接口测试，TS meta_client 接口测试,meta接口测试,get_meta_client 接口，target 为Test 链
* SharedCyfsStack Meta相关接口测试，TS meta_client 接口测试,meta接口测试,create_meta_client 接口，target_str 为Dev 链
* SharedCyfsStack Meta相关接口测试，TS meta_client 接口测试,meta接口测试,create_meta_client 接口，target_str 为Test 链
* SharedCyfsStack Meta相关接口测试，TS meta_client 接口测试,meta接口测试,create_meta_client 接口，参数 target_str、spv_str均为undefine
* SharedCyfsStack Meta相关接口测试，TS meta_client 接口测试,meta接口测试,create_meta_client 接口，参数 spv_str为undefine

* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 getSpvStatus 接口，getSpvStatus 接口
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 getPaymentTxList 接口，getPaymentTxList 接口
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 getCollectTxList 接口，getCollectTxList 接口
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 getTxList 接口，getTxList 接口
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 getBlocksByRange 接口，getBlocksByRange 接口
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 getFileRewardAmount 接口，getFileRewardAmount 接口
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 getErc20TransferList 接口,getErc20TransferList 接口
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 getTx 接口,getTx 接口
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 getBalance 接口,getBalance 接口
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 getBalances 接口,getBalances 接口
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 getChainStatus 接口,getChainStatus 接口
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 view_request 接口,view_request 接口
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 getDesc 接口,getDesc 接口
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 getBalance2 接口,getBalance2 接口
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 getRawData 接口,getRawData 接口
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 getChainViewStatus 接口,getChainViewStatus 接口
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 getBlock 接口
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 getName 接口,getName 接口 name被使用
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,getName 接口 name未被使用
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 getReceipt 接口,getReceipt 接口
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 get_nonce 接口,get_nonce 接口
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 create_desc 接口,create_desc 接口 上链 People对象
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 create_desc 接口,create_desc 接口 上链 Device对象
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 create_desc 接口,create_desc 接口 上链 SimpleGroup对象
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 create_desc 接口,create_desc 接口 上链 UnionAccount对象
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 create_desc 接口,create_desc 接口 上链 org对象
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 create_desc 接口,create_desc 接口 上链 minergroup 对象
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 create_desc 接口,create_desc 接口 上链 snservice 对象
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 create_desc 接口,create_desc 接口 上链 contract 对象
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 create_desc 接口,create_desc 接口 上链 data对象
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 create_desc 接口,create_desc 接口 上链 File对象
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 update_desc 接口,update_desc 接口
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 update_desc 接口,create_desc 接口 上链 People对象 update_desc 更新people ood list
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 trans_balance 接口,trans_balance 接口转账
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 trans_balance 接口,trans_balance 接口循环充钱
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 withdraw_from_file 接口
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 create_contract 接口
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 call_contract 接口
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 view_contract 接口
* SharedCyfsStack Meta相关接口测试，MetaClient 类接口 Nightly 环境,MetaClient 类 get_logs 接口


* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 getSpvStatus 接口，getSpvStatus 接口
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 getPaymentTxList 接口，getPaymentTxList 接口
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 getCollectTxList 接口，getCollectTxList 接口
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 getTxList 接口，getTxList 接口
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 getBlocksByRange 接口，getBlocksByRange 接口
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 getFileRewardAmount 接口，getFileRewardAmount 接口
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 getErc20TransferList 接口,getErc20TransferList 接口
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 getTx 接口,getTx 接口
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 getBalance 接口,getBalance 接口
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 getBalances 接口,getBalances 接口
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 getChainStatus 接口,getChainStatus 接口
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 view_request 接口,view_request 接口
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 getDesc 接口,getDesc 接口
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 getBalance2 接口,getBalance2 接口
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 getRawData 接口,getRawData 接口
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 getChainViewStatus 接口,getChainViewStatus 接口
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 getBlock 接口
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 getName 接口,getName 接口 name被使用
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,getName 接口 name未被使用
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 getReceipt 接口,getReceipt 接口
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 get_nonce 接口,get_nonce 接口
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 create_desc 接口,create_desc 接口 上链 People对象
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 create_desc 接口,create_desc 接口 上链 Device对象
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 create_desc 接口,create_desc 接口 上链 SimpleGroup对象
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 create_desc 接口,create_desc 接口 上链 UnionAccount对象
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 create_desc 接口,create_desc 接口 上链 org对象
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 create_desc 接口,create_desc 接口 上链 minergroup 对象
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 create_desc 接口,create_desc 接口 上链 snservice 对象
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 create_desc 接口,create_desc 接口 上链 contract 对象
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 create_desc 接口,create_desc 接口 上链 data对象
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 create_desc 接口,create_desc 接口 上链 File对象
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 update_desc 接口,update_desc 接口
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 update_desc 接口,create_desc 接口 上链 People对象 update_desc 更新people ood list
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 trans_balance 接口,trans_balance 接口转账
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 trans_balance 接口,trans_balance 接口循环充钱
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 withdraw_from_file 接口
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 create_contract 接口
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 call_contract 接口
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 view_contract 接口
* SharedCyfsStack Meta相关接口测试，MetaClient  类接口 Beta 环境,MetaClient 类 get_logs 接口
