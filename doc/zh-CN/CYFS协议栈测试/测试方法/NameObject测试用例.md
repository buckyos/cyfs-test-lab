NameObject  测试用例设计说明
=======
一、用例概述
--------
    场景说明：覆盖以下对象进行主要流程编解码，修改或新增对象属性后进行编解码、以及对签名过的对象进行签名对象验证和编解码，并对编解码前后的数据进行断言，预期希望前后一致
* 基础对象
* 核心对象
* 扩展对象  
用例路径：src\cyfs-stack-test-typescript\TestSuite\unittest_NON_nameobject  
该模块测试无需依赖模拟器和真机环境    

二、用例场景
--------
### 1、基础对象
* UnionAccount （filename: test_unionAccount_run.ts）
    * 正常传入参数创建unionaccount对象-编解码
      ```
      前置条件：
        1、准备好传参数据和传参对象类型无误
      操作步骤：
        1、传入初始化数据创建unionaccount对象
        2、对创建返回的对象进行unit8array类型转换
        3、获取unionaccount_id属性值
        4、对创建对象进行解码并获取对象属性值id
        5、比较创建对象后和解码后的值是否一致
      预期结果：
        1、编码前后id属性值一致
    * 传入两个相同的account参数-编解码
      ```
      前置条件：
        1、准备好传参数据和传参对象类型无误
      操作步骤：
        1、传入两个相同的account数据创建unionaccount对象
        2、对创建返回的对象进行unit8array类型转换
        3、获取unionaccount_id属性值
        4、对创建对象进行解码并获取对象属性值id
      预期结果：
        1、比较创建对象后和解码后的属性值一致
    * service_type类型为1-编解码
      ```
      前置条件：
        1、准备好传参数据和传参对象类型无误
      操作步骤：
        1、传入service_type为1创建unionaccount对象
        2、对创建返回的对象进行unit8array类型转换
        3、获取unionaccount_id属性值
        4、对创建对象进行解码并获取对象属性值id
      预期结果：
        1、比较创建对象后和解码后的属性值一致
    * 创建unionaccount对象后设置userdata-编解码
      ```
      前置条件：
        1、准备好传参userdata数据和传参对象类型无误
      操作步骤：
        1、传入必要参数创建unionaccount对象
        2、对创建后的对象设置userdata
        3、对设置好userdata的对象进行unit8array类型转换
        4、获取userdata属性值
        5、对创建对象进行解码并获取对象属性值userdata
      预期结果：
        1、比较创建对象后和解码后的属性值一致
    * 创建unionaccount对象后增加update_time-编解码
      ```
      前置条件：
        1、准备好传参bigint数据和传参对应类型无误
      操作步骤：
        1、传入必要参数创建unionaccount对象
        2、对创建后的对象传入bigint转换的jsbi对象设置updatetime
        3、对设置好updatetime的对象进行unit8array类型转换
        4、获取updatetime属性值
        5、对创建对象进行解码并获取对象属性值
      预期结果：
        1、比较创建对象后和解码后的属性值一致
    * 创建unionaccount对象后修改update_time-编解码
      ```
      前置条件：
        1、准备好传参bigint数据和传参对应类型无误
      操作步骤：
        1、传入必要参数创建unionaccount对象
        2、对创建后的对象传入bigint转换的jsbi对象修改updatetime
        3、对设置好updatetime的对象进行unit8array类型转换
        4、获取updatetime属性值
        5、对创建对象进行解码并获取对象属性值
      预期结果：
        1、比较创建对象后和解码后的属性值一致
    * 创建unionaccount对象后设置trace_id-编解码
      ```
      前置条件：
        1、准备好传参数据和传参对应类型无误
      操作步骤：
        1、传入必要参数创建unionaccount对象
        2、对创建后的对象传入number设置traceid
        3、对设置好traceid的对象进行unit8array类型转换
        4、获取traceid属性值
        5、对创建对象进行解码并获取对象属性值
      预期结果：
        1、比较创建对象后和解码后的属性值一致
    * 使用Rust工具对ts编码对象进行解码
      ```
      前置条件：
        1、准备好传参数据，desc-tool工具正常
      操作步骤：
        1、传入有效参数调用ts方法创建Device对象
        2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
        3、获取rust工具解码后的属性值
        4、对ts创建对象进行rust解码并获取对象属性值
      预期结果：
        1、比较创建ts对象前和rust解码后的属性值一致
    * 使用Rust工具编码后用Ts进行解码，再用rust解码进行比较
      ```
      前置条件：
        1、准备好有效传参数据，desc-tool工具正常
      操作步骤：
        2、传入有效参数使用rust工具创建Device对象
        3、使用ts方法去解码rust编码对象获取属性值
        4、使用rust的desc-tool工具执行show -a 指令进行解码获取属性值
      预期结果：
        1、比较ts解码后和rust解码后的属性值一致
* Device
  * Ts编解码：有效传入owner,unique_id,endpoints,sn_list,passive_sn_list,public_key,area,category参数
    ```
    前置条件：
      1、准备好传参数据和传参对应类型无误
    操作步骤：
      1、传入所有必要有效参数创建Device对象
      2、对创建的对象进行unit8array类型转换并临时保存数据
      3、对创建对象进行解码并获取对象属性值
    预期结果：
      1、比较创建对象前和解码后的属性值一致    
  * Ts编解码：有效传入多值组成的endpoints,sn_list,passive_sn_list参数
     ```
    前置条件：
      1、准备好endpoints,sn_list,passive_sn_list数组且都不少于一个元素其他传参对应类型无误
    操作步骤：
      1、传入endpoints,sn_list,passive_sn_list含多个元素对象创建Device对象
      2、对创建的对象进行unit8array类型转换并临时保存数据
      3、对创建对象进行解码并获取对象属性值
    预期结果：
      1、比较创建对象前和解码后的属性值一致
  * Ts编解码：有效传入空值组成的endpoints,sn_list,passive_sn_list参数
    ```
    前置条件：
      1、准备好endpoints,sn_list,passive_sn_list空数组其他传参对应类型无误
    操作步骤：
      1、传入endpoints,sn_list,passive_sn_list空数组对象创建Device对象
      2、对创建的对象进行unit8array类型转换并临时保存数据
      3、对创建对象进行解码并获取对象属性值
    预期结果：
      1、比较创建对象前和解码后的属性值一致
  * Ts编解码：有效调用set_name()方法，修改name属性
    ```
    前置条件：
      1、准备好传参数据，传参对应类型无误
    操作步骤：
      1、传入有效参数创建Device对象
      2、调用set_name方法设置对象name属性
      3、对创建的对象进行unit8array类型转换并临时保存数据
      4、对创建对象进行解码并获取对象name属性值
    预期结果：
      1、比较创建对象前和解码后的属性值一致
  * Ts编解码：有效调用set_name()方法，传入name空值属性  
    ```
    前置条件：
      1、准备好传参数据，传参对应类型无误
    操作步骤：
      1、传入有效参数创建Device对象
      2、调用set_name方法设置对象name属性为空值
      3、对创建的对象进行unit8array类型转换并临时保存数据
      4、对创建对象进行解码并获取对象name属性值
    预期结果：
      1、比较创建对象前和解码后的属性值也是空值
  * 使用Rust工具对ts编码对象进行解码
    ```
    前置条件：
      1、准备好传参数据，desc-tool工具正常
    操作步骤：
      1、传入有效参数调用ts方法创建Device对象
      2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
      3、获取rust工具解码后的属性值
      4、对ts创建对象进行rust解码并获取对象属性值
    预期结果：
      1、比较创建ts对象前和rust解码后的属性值一致
  * 使用Rust工具编码后用Ts进行解码，再用rust解码进行比较
    ```
    前置条件：
      1、准备好有效传参数据，desc-tool工具正常
    操作步骤：
      2、传入有效参数使用rust工具创建Device对象
      3、使用ts方法去解码rust编码对象获取属性值
      4、使用rust的desc-tool工具执行show -a 指令进行解码获取属性值
    预期结果：
      1、比较ts解码后和rust解码后的属性值一致
* People
  * Ts编解码：有效传入owner,ood_list,public,area,name,icon参数
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入必选有效参数创建people对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后owner、peopleid、icon属性值一致   
  * Ts编解码：有效传入多个DeviceId组成的ood_list参数
    ```
    前置条件：
    1、准备好传参数据oodlist含多个deviceid元素和传参对象类型无误
    操作步骤：
    1、正常传入必选和oodlist参数创建people对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取oodlist对象属性值
    预期结果：
    1、编码前和解码后oodlist属性值一致  
  * Ts编解码：有效传入空值的ood_list参数
    ```
    前置条件：
    1、准备好传参数据空数组oodlist其他传参对象类型无误
    操作步骤：
    1、正常传入必选和空oodlist参数创建people对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取oodlist对象属性值
    预期结果：
    1、编码前和解码后oodlist属性值也为空
  * Ts编解码：有效传入空值的owner,name参数
    ```
    前置条件：
    1、准备好空值的owner，name参数和传参对象类型无误
    操作步骤：
    1、正常传入必选和空值参数创建people对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取owner、name对象属性值
    预期结果：
    1、编码前和解码后属性值一致 
  * Ts编解码：有效不传入name,icon参数
    ```
    前置条件：
    1、准备有效传参数据和传参对象类型无误
    操作步骤：
    1、只传必选参数创建people对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取属性值
    预期结果：
    1、编码前和解码后属性值一致
  * Ts编解码：有效调用set_name()方法，修改name属性
    ```
    前置条件：
    1、准备有效传参数据和传参对象类型无误
    操作步骤：
    1、传入必选参数创建people对象
    2、调用set_name方法修改name属性
    2、对修改后的对象进行unit8array类型转换
    3、对修改后对象进行解码并获取属性值
    预期结果：
    1、修改后和解码后属性值一致
  * Ts编解码：有效调用set_icon()方法，修改icon属性  
    ```
    前置条件：
    1、准备有效传参数据和传参对象类型无误
    操作步骤：
    1、传入必选参数创建people对象
    2、调用set_icon方法修改icon属性
    3、对修改后的对象进行unit8array类型转换
    4、对修改后对象进行解码并获取属性值
    预期结果：
    1、修改后和解码后属性值一致
  * 使用Rust工具对ts编码对象进行解码
    ```
    前置条件：
      1、准备好传参数据，desc-tool工具正常
    操作步骤：
      1、传入有效参数调用ts方法创建Device对象
      2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
      3、获取rust工具解码后的属性值
      4、对ts创建对象进行rust解码并获取对象属性值
    预期结果：
      1、比较创建ts对象前和rust解码后的属性值一致
  * 使用Rust工具编码后用Ts进行解码，再用rust解码进行比较
    ```
    前置条件：
      1、准备好有效传参数据，desc-tool工具正常
    操作步骤：
      2、传入有效参数使用rust工具创建Device对象
      3、使用ts方法去解码rust编码对象获取属性值
      4、使用rust的desc-tool工具执行show -a 指令进行解码获取属性值
    预期结果：
      1、比较ts解码后和rust解码后的属性值一致
* Dir
  * Ts编解码：有效传入owner,attributes,body,NDNObjectInfo参数-编码  
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入必选有效参数创建Dir对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后owner、attributes等属性值一致
  * 使用Rust工具对ts编码对象进行解码
    ```
    前置条件：
      1、准备好传参数据，desc-tool工具正常
    操作步骤：
      1、传入有效参数调用ts方法创建Device对象
      2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
      3、获取rust工具解码后的属性值
      4、对ts创建对象进行rust解码并获取对象属性值
    预期结果：
      1、比较创建ts对象前和rust解码后的属性值一致
  * 使用Rust工具编码后用Ts进行解码，再用rust解码进行比较
    ```
    前置条件：
      1、准备好有效传参数据，desc-tool工具正常
    操作步骤：
      2、传入有效参数使用rust工具创建Device对象
      3、使用ts方法去解码rust编码对象获取属性值
      4、使用rust的desc-tool工具执行show -a 指令进行解码获取属性值
    预期结果：
      1、比较ts解码后和rust解码后的属性值一致
* File
  * Ts编解码：有效传入owner,len,filehash,chunk_list1{[chunkid],undefined}参数-编码
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入必选有效参数创建File对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后owner,len,filehash等属性值一致
  * Ts编解码：有效传入{undedefind,fileid}组成的chunk_list参数
    ```
    前置条件：
    1、准备好参数chunk_list ={undedefind,fileid}和其他传参对象类型无误
    操作步骤：
    1、正常传入有效参数创建File对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后chunk_list属性值一致
  * Ts编解码：有效传入{[chunkid],fileid}组成的chunk_list参数  
    ```
    前置条件：
    1、准备好参数chunk_list ={[chunkid],fileid}和其他传参对象类型无误
    操作步骤：
    1、正常传入有效参数创建File对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后chunk_list属性值一致
  * 使用Rust工具对ts编码对象进行解码
    ```
    前置条件：
      1、准备好传参数据，desc-tool工具正常
    操作步骤：
      1、传入有效参数调用ts方法创建Device对象
      2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
      3、获取rust工具解码后的属性值
      4、对ts创建对象进行rust解码并获取对象属性值
    预期结果：
      1、比较创建ts对象前和rust解码后的属性值一致
  * 使用Rust工具编码后用Ts进行解码，再用rust解码进行比较
    ```
    前置条件：
      1、准备好有效传参数据，desc-tool工具正常
    操作步骤：
      2、传入有效参数使用rust工具创建Device对象
      3、使用ts方法去解码rust编码对象获取属性值
      4、使用rust的desc-tool工具执行show -a 指令进行解码获取属性值
    预期结果：
      1、比较ts解码后和rust解码后的属性值一致
  * 有效对chunk_list参数传{undedefind,fileid}的ts对象进行Rust工具解码
    ```
      前置条件：
        1、准备好传参数据，desc-tool工具正常
      操作步骤：
        1、传入有效参数调用ts方法创建Device对象
        2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
        3、获取rust工具解码后的属性值
        4、对ts创建对象进行rust解码并获取对象属性值
      预期结果：
        1、比较创建ts对象前和rust解码后的属性值一致
* SimpleGroup
  * Ts编解码：正常传入有效参数创建SimpleGroup对象
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入必选有效参数创建SimpleGroup对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后属性值一致
  * Ts编解码：publicKey为rsa[]类型创建SimpleGroup对象
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入必选有效参数且publicKey为rsa[]类型创建SimpleGroup对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后publickey属性值一致
  * Ts编解码：publicKey为secp[]类型创建SimpleGroup对象
     ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入必选有效参数且publicKey为secp[]类型创建SimpleGroup对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后publickey属性值一致
  * Ts编解码：publicKey为sm2[]类型创建SimpleGroup对象
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入必选有效参数且publicKey为sm2[]类型创建SimpleGroup对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后publickey属性值一致
  * Ts编解码：publicKey为空[]类型创建SimpleGroup对象
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入必选有效参数且publicKey为[]类型创建SimpleGroup对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后publickey属性值也为空
  * Ts编解码：members有一个成员对象创建SimpleGroup对象
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入必选有效参数且members只有一个元素创建SimpleGroup对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后members属性值一致
  * Ts编解码：members为空创建SimpleGroup对象
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入必选有效参数且members为空创建SimpleGroup对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后members属性值也为空
  * Ts编解码：创建SimpleGroup对象后OOD模式从独立设置为主备
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入必选有效参数ood模式为独立模式创建SimpleGroup对象
    2、调用ood_work_mode方法修改ood模式为主备模式
    3、对创建返回的对象进行unit8array类型转换
    4、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后其他属性值一致，ood模式为主备模式
  * Ts编解码：创建SimpleGroup对象后OOD模式从主备设置为独立
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入必选有效参数ood模式为主备模式创建SimpleGroup对象
    2、调用ood_work_mode方法修改ood模式为独立模式
    3、对创建返回的对象进行unit8array类型转换
    4、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后其他属性值一致，ood模式为独立模式
  * Ts编解码：创建SimpleGroup对象单个设备
    ```
    前置条件：
    1、准备好传参数据oodlist只有一个设备其他传参对象类型无误
    操作步骤：
    1、正常传入必选有效参数单设备oodlist创建SimpleGroup对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后属性值一致
  * Ts编解码：创建SimpleGroup对象设备列表为空[]
    ```
    前置条件：
    1、准备好传参数据oodlist没有设备为空[]其他传参对象类型无误
    操作步骤：
    1、正常传入必选有效参数和空数组oodlist创建SimpleGroup对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后属性值一致，oodlist也为空
  * 使用Rust工具对ts编码对象进行解码
    ```
    前置条件：
      1、准备好传参数据，desc-tool工具正常
    操作步骤：
      1、传入有效参数调用ts方法创建Device对象
      2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
      3、获取rust工具解码后的属性值
      4、对ts创建对象进行rust解码并获取对象属性值
    预期结果：
      1、比较创建ts对象前和rust解码后的属性值一致
  * 使用Rust工具编码后用Ts进行解码，再用rust解码进行比较
    ```
    前置条件：
      1、准备好有效传参数据，desc-tool工具正常
    操作步骤：
      2、传入有效参数使用rust工具创建Device对象
      3、使用ts方法去解码rust编码对象获取属性值
      4、使用rust的desc-tool工具执行show -a 指令进行解码获取属性值
    预期结果：
      1、比较ts解码后和rust解码后的属性值一致
* SNService
    * 使用Rust工具对ts编码对象进行解码
      ```
      前置条件：
        1、准备好传参数据，desc-tool工具正常
      操作步骤：
        1、传入有效参数调用ts方法创建Device对象
        2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
        3、获取rust工具解码后的属性值
        4、对ts创建对象进行rust解码并获取对象属性值
      预期结果：
        1、比较创建ts对象前和rust解码后的属性值一致
    * 使用Rust工具编码后用Ts进行解码，再用rust解码进行比较
      ```
      前置条件：
        1、准备好有效传参数据，desc-tool工具正常
      操作步骤：
        2、传入有效参数使用rust工具创建Device对象
        3、使用ts方法去解码rust编码对象获取属性值
        4、使用rust的desc-tool工具执行show -a 指令进行解码获取属性值
      预期结果：
        1、比较ts解码后和rust解码后的属性值一致
* FlowService
  * 使用Rust工具对ts编码对象进行解码
    ```
    前置条件：
      1、准备好传参数据，desc-tool工具正常
    操作步骤：
      1、传入有效参数调用ts方法创建Device对象
      2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
      3、获取rust工具解码后的属性值
      4、对ts创建对象进行rust解码并获取对象属性值
    预期结果：
      1、比较创建ts对象前和rust解码后的属性值一致
  * 使用Rust工具编码后用Ts进行解码，再用rust解码进行比较
    ```
    前置条件：
      1、准备好有效传参数据，desc-tool工具正常
    操作步骤：
      2、传入有效参数使用rust工具创建Device对象
      3、使用ts方法去解码rust编码对象获取属性值
      4、使用rust的desc-tool工具执行show -a 指令进行解码获取属性值
    预期结果：
      1、比较ts解码后和rust解码后的属性值一致
* MetaTx
  * 使用Rust工具对ts编码对象进行解码
    ```
    前置条件：
      1、准备好传参数据，desc-tool工具正常
    操作步骤：
      1、传入有效参数调用ts方法创建Device对象
      2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
      3、获取rust工具解码后的属性值
      4、对ts创建对象进行rust解码并获取对象属性值
    预期结果：
      1、比较创建ts对象前和rust解码后的属性值一致
  * 使用Rust工具编码后用Ts进行解码，再用rust解码进行比较
    ```
    前置条件：
      1、准备好有效传参数据，desc-tool工具正常
    操作步骤：
      2、传入有效参数使用rust工具创建Device对象
      3、使用ts方法去解码rust编码对象获取属性值
      4、使用rust的desc-tool工具执行show -a 指令进行解码获取属性值
    预期结果：
      1、比较ts解码后和rust解码后的属性值一致
* MinerGroup
  * 使用Rust工具对ts编码对象进行解码
    ```
    前置条件：
      1、准备好传参数据，desc-tool工具正常
    操作步骤：
      1、传入有效参数调用ts方法创建Device对象
      2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
      3、获取rust工具解码后的属性值
      4、对ts创建对象进行rust解码并获取对象属性值
    预期结果：
      1、比较创建ts对象前和rust解码后的属性值一致
  * 使用Rust工具编码后用Ts进行解码，再用rust解码进行比较
    ```
    前置条件：
      1、准备好有效传参数据，desc-tool工具正常
    操作步骤：
      2、传入有效参数使用rust工具创建Device对象
      3、使用ts方法去解码rust编码对象获取属性值
      4、使用rust的desc-tool工具执行show -a 指令进行解码获取属性值
    预期结果：
      1、比较ts解码后和rust解码后的属性值一致
* Tx
  * 使用Rust工具对ts编码对象进行解码
    ```
    前置条件：
      1、准备好传参数据，desc-tool工具正常
    操作步骤：
      1、传入有效参数调用ts方法创建Device对象
      2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
      3、获取rust工具解码后的属性值
      4、对ts创建对象进行rust解码并获取对象属性值
    预期结果：
      1、比较创建ts对象前和rust解码后的属性值一致
  * 使用Rust工具编码后用Ts进行解码，再用rust解码进行比较
    ```
    前置条件：
      1、准备好有效传参数据，desc-tool工具正常
    操作步骤：
      2、传入有效参数使用rust工具创建Device对象
      3、使用ts方法去解码rust编码对象获取属性值
      4、使用rust的desc-tool工具执行show -a 指令进行解码获取属性值
    预期结果：
      1、比较ts解码后和rust解码后的属性值一致
* Test
  * Ts编解码：有效传入所有数据类型参数
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入必选有效参数创建Test对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后属性值一致 
  * 使用Rust工具对ts编码对象进行解码
    ```
    前置条件：
      1、准备好传参数据，desc-tool工具正常
    操作步骤：
      1、传入有效参数调用ts方法创建Device对象
      2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
      3、获取rust工具解码后的属性值
      4、对ts创建对象进行rust解码并获取对象属性值
    预期结果：
      1、比较创建ts对象前和rust解码后的属性值一致
  * 使用Rust工具编码后用Ts进行解码，再用rust解码进行比较
    ```
    前置条件：
      1、准备好有效传参数据，desc-tool工具正常
    操作步骤：
      2、传入有效参数使用rust工具创建Device对象
      3、使用ts方法去解码rust编码对象获取属性值
      4、使用rust的desc-tool工具执行show -a 指令进行解码获取属性值
    预期结果：
      1、比较ts解码后和rust解码后的属性值一致
* Block  
  * 使用Rust工具对ts编码对象进行解码
    ```
    前置条件：
      1、准备好传参数据，desc-tool工具正常
    操作步骤：
      1、传入有效参数调用ts方法创建Device对象
      2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
      3、获取rust工具解码后的属性值
      4、对ts创建对象进行rust解码并获取对象属性值
    预期结果：
      1、比较创建ts对象前和rust解码后的属性值一致
  * 使用Rust工具编码后用Ts进行解码，再用rust解码进行比较
    ```
    前置条件：
      1、准备好有效传参数据，desc-tool工具正常
    操作步骤：
      2、传入有效参数使用rust工具创建Device对象
      3、使用ts方法去解码rust编码对象获取属性值
      4、使用rust的desc-tool工具执行show -a 指令进行解码获取属性值
    预期结果：
      1、比较ts解码后和rust解码后的属性值一致

### 2、核心对象
* Zone
  * Ts编码：有效传入owner,ood_list,known_device_list参数
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入必选有效参数创建Zone对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后owner,ood_list,known_device_list属性值一致 
  * Ts编码：有效传入多值的ood_list,known_device_list参数
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入必选有效参数且ood_list,known_device_list参数有多个值创建Zone对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后owner,ood_list,known_device_list属性值一致 
  * Ts编码：有效传入空值的ood_list,known_device_list参数
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入必选有效参数且ood_list,known_device_list参数为空[]创建Zone对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后owner,ood_list,known_device_list属性值一致 
  * 使用Rust工具对ts编码对象进行解码
    ```
    前置条件：
      1、准备好传参数据，desc-tool工具正常
    操作步骤：
      1、传入有效参数调用ts方法创建Device对象
      2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
      3、获取rust工具解码后的属性值
      4、对ts创建对象进行rust解码并获取对象属性值
    预期结果：
      1、比较创建ts对象前和rust解码后的属性值一致
  * 使用Rust工具编码后用Ts进行解码，再用rust解码进行比较
    ```
    前置条件：
      1、准备好有效传参数据，desc-tool工具正常
    操作步骤：
      2、传入有效参数使用rust工具创建Device对象
      3、使用ts方法去解码rust编码对象获取属性值
      4、使用rust的desc-tool工具执行show -a 指令进行解码获取属性值
    预期结果：
      1、比较ts解码后和rust解码后的属性值一致
* DecApp
  * Ts编解码：有效传入owner,id参数
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入必选有效参数创建DecApp对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后owner,id属性值一致 
  * Ts编解码：有效修改icon,desc属性
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入必选有效参数和icon,desc参数创建DecApp对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后icon,desc属性值一致 
  * Ts编解码：有效调用set_source()方法，修改source,source_desc属性
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入必选有效参数创建DecApp对象
    2、调用set_source方法修改source和sorce_desc属性值
    2、对创建返回的对象进行unit8array类型转换
    3、对修改的对象进行解码并获取对象属性值
    预期结果：
    1、编码前后其他属性一致，解码后source和sorce_desc属性值和修改一致 
  * Ts编解码：remove_source()方法调用
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入必选有效参数创建DecApp对象
    2、调用set_source方法新增两组source分别为source1和source2
    3、调用remove_source方法删除source1的属性
    4、对修改返回的对象进行unit8array类型转换
    3、对修改的对象进行解码并获取source1和source2对象属性值
    预期结果：
    1、remove后source2的属性值正常一致，source1的值不存在
  * Ts编解码：有效传入id传入空值参数
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入必选有效参数且id为空字符串创建DecApp对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后owner,属性值一致 ，id为空字符串
  * 使用Rust工具对ts编码对象进行解码
    ```
    前置条件：
      1、准备好传参数据，desc-tool工具正常
    操作步骤：
      1、传入有效参数调用ts方法创建Device对象
      2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
      3、获取rust工具解码后的属性值
      4、对ts创建对象进行rust解码并获取对象属性值
    预期结果：
      1、比较创建ts对象前和rust解码后的属性值一致
  * 使用Rust工具编码后用Ts进行解码，再用rust解码进行比较
    ```
    前置条件：
      1、准备好有效传参数据，desc-tool工具正常
    操作步骤：
      2、传入有效参数使用rust工具创建Device对象
      3、使用ts方法去解码rust编码对象获取属性值
      4、使用rust的desc-tool工具执行show -a 指令进行解码获取属性值
    预期结果：
      1、比较ts解码后和rust解码后的属性值一致
* NFTList
  * Ts编解码：有效传入owner参数  
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入owner有效参数创建NFTList对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后owner属性值一致 
  * Ts编码：有效obj_list()调用,查看obj_list的值
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入owner有效参数创建NFTList对象
    2、调用obj_list方法查看其值
    预期结果：
    1、odj_list大小应为0
  * Ts编解码：有效put()调用，修改obj_list的值
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入owner有效参数创建NFTList对象
    2、调用put方法修改obj_list值
    3、对创建返回的对象进行unit8array类型转换
    4、对创建对象进行解码并调用obj_list方法获取对象属性值
    预期结果：
    1、编码前和解码后属性值一致
  * Ts编解码：有效remove()调用，删除obj_list的值
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入owner有效参数创建NFTList对象
    2、调用remove方法删除obj_list值
    3、对创建返回的对象进行unit8array类型转换
    4、对创建对象进行解码并调用obj_list方法获取对象属性值
    预期结果：
    1、解码后obj_list属性值size为0
  * Ts编解码：有效clear()调用，清空obj_list的值  
      ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入owner有效参数创建NFTList对象
    2、调用put方法新增obj_list值
    3、调用clear方法删除obj_list值
    4、对创建返回的对象进行unit8array类型转换
    5、对创建对象进行解码并调用obj_list方法获取对象属性值
    预期结果：
    1、解码后obj_list属性值size为0
  * 使用Rust工具对ts编码对象进行解码
    ```
    前置条件：
      1、准备好传参数据，desc-tool工具正常
    操作步骤：
      1、传入有效参数调用ts方法创建Device对象
      2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
      3、获取rust工具解码后的属性值
      4、对ts创建对象进行rust解码并获取对象属性值
    预期结果：
      1、比较创建ts对象前和rust解码后的属性值一致
  * 使用Rust工具编码后用Ts进行解码，再用rust解码进行比较
    ```
    前置条件：
      1、准备好有效传参数据，desc-tool工具正常
    操作步骤：
      2、传入有效参数使用rust工具创建Device对象
      3、使用ts方法去解码rust编码对象获取属性值
      4、使用rust的desc-tool工具执行show -a 指令进行解码获取属性值
    预期结果：
      1、比较ts解码后和rust解码后的属性值一致
* FriendList
  * Ts编解码：有效传入peopleid,auto_confirm参数
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入peopleid,auto_confirm有效参数创建FriendList对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后属性值一致
  * Ts编解码：有效修改auto_confirm参数
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入有效参数创建FriendList对象
    2、调用set方法修改auto_confirm数据
    3、对创建返回的对象进行unit8array类型转换
    4、对创建对象进行解码并获取auto_confirm对象属性值
    预期结果：
    1、编码前和解码后属性值不一致，与修改后一致，修改成功
  * Ts编解码：有效修改auto_msg参数
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入有效参数创建FriendList对象
    2、调用set方法修改auto_msg数据
    3、对创建返回的对象进行unit8array类型转换
    4、对创建对象进行解码并获取auto_msg对象属性值
    预期结果：
    1、编码前和解码后属性值不一致，与修改后一致，修改成功
  * Ts编解码：有效修改auto_msg为空参数  
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入有效参数创建FriendList对象
    2、调用set方法修改auto_msg数据为空值
    3、对创建返回的对象进行unit8array类型转换
    4、对创建对象进行解码并获取auto_msg对象属性值
    预期结果：
    1、编码前和解码后属性值不一致，修改后为空，修改成功
  * Ts解码：有效friend_list()调用,查看friend_list的值
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入有效参数创建FriendList对象
    2、调用friend_list方法查看数据
    预期结果：
    1、查看friend_list值正常，与创建时一致
  * 使用Rust工具对ts编码对象进行解码
    ```
    前置条件：
      1、准备好传参数据，desc-tool工具正常
    操作步骤：
      1、传入有效参数调用ts方法创建Device对象
      2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
      3、获取rust工具解码后的属性值
      4、对ts创建对象进行rust解码并获取对象属性值
    预期结果：
      1、比较创建ts对象前和rust解码后的属性值一致
  * 使用Rust工具编码后用Ts进行解码，再用rust解码进行比较
    ```
    前置条件：
      1、准备好有效传参数据，desc-tool工具正常
    操作步骤：
      2、传入有效参数使用rust工具创建Device对象
      3、使用ts方法去解码rust编码对象获取属性值
      4、使用rust的desc-tool工具执行show -a 指令进行解码获取属性值
    预期结果：
      1、比较ts解码后和rust解码后的属性值一致
* Storage
  * Ts编解码：有效传入id,value参数
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入id,value有效参数创建Storage对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后属性值一致
  * Ts编解码：有效传入id为空值参数  
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、传入id为空值创建Storage对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后属性值一致也为空
  * 使用Rust工具对ts编码对象进行解码
    ```
    前置条件：
      1、准备好传参数据，desc-tool工具正常
    操作步骤：
      1、传入有效参数调用ts方法创建Device对象
      2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
      3、获取rust工具解码后的属性值
      4、对ts创建对象进行rust解码并获取对象属性值
    预期结果：
      1、比较创建ts对象前和rust解码后的属性值一致
  * 使用Rust工具编码后用Ts进行解码，再用rust解码进行比较
    ```
    前置条件：
      1、准备好有效传参数据，desc-tool工具正常
    操作步骤：
      2、传入有效参数使用rust工具创建Device对象
      3、使用ts方法去解码rust编码对象获取属性值
      4、使用rust的desc-tool工具执行show -a 指令进行解码获取属性值
    预期结果：
      1、比较ts解码后和rust解码后的属性值一致
* Msg
  * 使用Rust工具对ts编码对象进行解码
      ```
      前置条件：
        1、准备好传参数据，desc-tool工具正常
      操作步骤：
        1、传入有效参数调用ts方法创建Device对象
        2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
        3、获取rust工具解码后的属性值
        4、对ts创建对象进行rust解码并获取对象属性值
      预期结果：
        1、比较创建ts对象前和rust解码后的属性值一致
  * 使用Rust工具编码后用Ts进行解码，再用rust解码进行比较
    ```
    前置条件：
      1、准备好有效传参数据，desc-tool工具正常
    操作步骤：
      2、传入有效参数使用rust工具创建Device对象
      3、使用ts方法去解码rust编码对象获取属性值
      4、使用rust的desc-tool工具执行show -a 指令进行解码获取属性值
    预期结果：
      1、比较ts解码后和rust解码后的属性值一致
* AddFriend
  * 使用Rust工具对ts编码对象进行解码
    ```
    前置条件：
      1、准备好传参数据，desc-tool工具正常
    操作步骤：
      1、传入有效参数调用ts方法创建Device对象
      2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
      3、获取rust工具解码后的属性值
      4、对ts创建对象进行rust解码并获取对象属性值
    预期结果：
      1、比较创建ts对象前和rust解码后的属性值一致
  * 使用Rust工具编码后用Ts进行解码，再用rust解码进行比较
    ```
    前置条件：
      1、准备好有效传参数据，desc-tool工具正常
    操作步骤：
      2、传入有效参数使用rust工具创建Device对象
      3、使用ts方法去解码rust编码对象获取属性值
      4、使用rust的desc-tool工具执行show -a 指令进行解码获取属性值
    预期结果：
      1、比较ts解码后和rust解码后的属性值一致
* RemoveFriend
  * 使用Rust工具对ts编码对象进行解码
    ```
    前置条件：
      1、准备好传参数据，desc-tool工具正常
    操作步骤：
      1、传入有效参数调用ts方法创建Device对象
      2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
      3、获取rust工具解码后的属性值
      4、对ts创建对象进行rust解码并获取对象属性值
    预期结果：
      1、比较创建ts对象前和rust解码后的属性值一致
  * 使用Rust工具编码后用Ts进行解码，再用rust解码进行比较
    ```
    前置条件：
      1、准备好有效传参数据，desc-tool工具正常
    操作步骤：
      2、传入有效参数使用rust工具创建Device对象
      3、使用ts方法去解码rust编码对象获取属性值
      4、使用rust的desc-tool工具执行show -a 指令进行解码获取属性值
    预期结果：
      1、比较ts解码后和rust解码后的属性值一致
* FriendOption
  * 使用Rust工具对ts编码对象进行解码
    ```
    前置条件：
      1、准备好传参数据，desc-tool工具正常
    操作步骤：
      1、传入有效参数调用ts方法创建Device对象
      2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
      3、获取rust工具解码后的属性值
      4、对ts创建对象进行rust解码并获取对象属性值
    预期结果：
      1、比较创建ts对象前和rust解码后的属性值一致
  * 使用Rust工具编码后用Ts进行解码，再用rust解码进行比较
    ```
    前置条件：
      1、准备好有效传参数据，desc-tool工具正常
    操作步骤：
      2、传入有效参数使用rust工具创建Device对象
      3、使用ts方法去解码rust编码对象获取属性值
      4、使用rust的desc-tool工具执行show -a 指令进行解码获取属性值
    预期结果：
      1、比较ts解码后和rust解码后的属性值一致
* AppCmd
  * 使用Rust工具对ts编码对象进行解码
    ```
    前置条件：
      1、准备好传参数据，desc-tool工具正常
    操作步骤：
      1、传入有效参数调用ts方法创建Device对象
      2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
      3、获取rust工具解码后的属性值
      4、对ts创建对象进行rust解码并获取对象属性值
    预期结果：
      1、比较创建ts对象前和rust解码后的属性值一致
  * 使用Rust工具编码后用Ts进行解码，再用rust解码进行比较
    ```
    前置条件：
      1、准备好有效传参数据，desc-tool工具正常
    操作步骤：
      2、传入有效参数使用rust工具创建Device对象
      3、使用ts方法去解码rust编码对象获取属性值
      4、使用rust的desc-tool工具执行show -a 指令进行解码获取属性值
    预期结果：
      1、比较ts解码后和rust解码后的属性值一致
* AppLocalStatus
  * 使用Rust工具对ts编码对象进行解码
    ```
    前置条件：
      1、准备好传参数据，desc-tool工具正常
    操作步骤：
      1、传入有效参数调用ts方法创建Device对象
      2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
      3、获取rust工具解码后的属性值
      4、对ts创建对象进行rust解码并获取对象属性值
    预期结果：
      1、比较创建ts对象前和rust解码后的属性值一致
  * 使用Rust工具编码后用Ts进行解码，再用rust解码进行比较
    ```
    前置条件：
      1、准备好有效传参数据，desc-tool工具正常
    操作步骤：
      2、传入有效参数使用rust工具创建Device对象
      3、使用ts方法去解码rust编码对象获取属性值
      4、使用rust的desc-tool工具执行show -a 指令进行解码获取属性值
    预期结果：
      1、比较ts解码后和rust解码后的属性值一致
* AppLocalList
  * 使用Rust工具对ts编码对象进行解码
    ```
    前置条件：
      1、准备好传参数据，desc-tool工具正常
    操作步骤：
      1、传入有效参数调用ts方法创建Device对象
      2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
      3、获取rust工具解码后的属性值
      4、对ts创建对象进行rust解码并获取对象属性值
    预期结果：
      1、比较创建ts对象前和rust解码后的属性值一致
  * 使用Rust工具编码后用Ts进行解码，再用rust解码进行比较
    ```
    前置条件：
      1、准备好有效传参数据，desc-tool工具正常
    操作步骤：
      2、传入有效参数使用rust工具创建Device对象
      3、使用ts方法去解码rust编码对象获取属性值
      4、使用rust的desc-tool工具执行show -a 指令进行解码获取属性值
    预期结果：
      1、比较ts解码后和rust解码后的属性值一致
* AppSetting
  * 使用Rust工具对ts编码对象进行解码
    ```
    前置条件：
      1、准备好传参数据，desc-tool工具正常
    操作步骤：
      1、传入有效参数调用ts方法创建Device对象
      2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
      3、获取rust工具解码后的属性值
      4、对ts创建对象进行rust解码并获取对象属性值
    预期结果：
      1、比较创建ts对象前和rust解码后的属性值一致
  * 使用Rust工具编码后用Ts进行解码，再用rust解码进行比较
    ```
    前置条件：
      1、准备好有效传参数据，desc-tool工具正常
    操作步骤：
      2、传入有效参数使用rust工具创建Device对象
      3、使用ts方法去解码rust编码对象获取属性值
      4、使用rust的desc-tool工具执行show -a 指令进行解码获取属性值
    预期结果：
      1、比较ts解码后和rust解码后的属性值一致
* AppList
  * Ts编解码：有效传入owner,id,category参数
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入owner,id,category有效参数创建AppList对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后属性值一致
  * Ts编解码：有效传入id,category传入空值  
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、传入id,category为空值创建AppList对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后属性值一致也为空
  * Ts编码：有效app_list()调用,查看app_list的值
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、正常传入owner,id,category有效参数创建AppList对象
    2、对创建对象调用方法app_list获取对象属性值
    预期结果：
    1、能正常获取到app_list属性值
  * Ts编解码：有效put()调用，修改app_list的值
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、传入有效参数创建AppList对象
    2、调用put方法修改app_list值
    3、对创建返回的对象进行unit8array类型转换
    4、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后属性值不一致，与修改一致，修改成功
  * Ts编解码：有效remove()调用，删除app_list的值
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、传入有效参数创建AppList对象
    2、调用remove方法删除app_list值
    3、对创建返回的对象进行unit8array类型转换
    4、对创建对象进行解码并获取对象属性值
    预期结果：
    1、app_list值为空，删除成功
  * Ts编解码  ：有效clear()调用，清空app_list的值  
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、传入有效参数创建AppList对象
    2、调用clear方法删除app_list值
    3、对创建返回的对象进行unit8array类型转换
    4、对创建对象进行解码并获取对象属性值
    预期结果：
    1、app_list值为空，删除成功
  * 使用Rust工具对ts编码对象进行解码
      ```
      前置条件：
        1、准备好传参数据，desc-tool工具正常
      操作步骤：
        1、传入有效参数调用ts方法创建Device对象
        2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
        3、获取rust工具解码后的属性值
        4、对ts创建对象进行rust解码并获取对象属性值
      预期结果：
        1、比较创建ts对象前和rust解码后的属性值一致
  * 使用Rust工具编码后用Ts进行解码，再用rust解码进行比较
    ```
    前置条件：
      1、准备好有效传参数据，desc-tool工具正常
    操作步骤：
      2、传入有效参数使用rust工具创建Device对象
      3、使用ts方法去解码rust编码对象获取属性值
      4、使用rust的desc-tool工具执行show -a 指令进行解码获取属性值
    预期结果：
      1、比较ts解码后和rust解码后的属性值一致
* AppStatus
  * Ts编码：有效传入owner,id,version,status参数
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、传入有效参数owner,id,version,status创建AppStatus对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后属性值一致
  * Ts编码：有效传入false值的status,version为空值的参数 
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、传入参数version为空,status为false创建AppStatus对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后属性值一致 
  * Ts编码：有效传入true值的status,version为空值的参数  
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、传入参数version为空,status为true创建AppStatus对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后属性值一致 
  * 使用Rust工具对ts编码对象进行解码
    ```
    前置条件：
      1、准备好传参数据，desc-tool工具正常
    操作步骤：
      1、传入有效参数调用ts方法创建Device对象
      2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
      3、获取rust工具解码后的属性值
      4、对ts创建对象进行rust解码并获取对象属性值
    预期结果：
      1、比较创建ts对象前和rust解码后的属性值一致
  * 使用Rust工具编码后用Ts进行解码，再用rust解码进行比较
    ```
    前置条件：
      1、准备好有效传参数据，desc-tool工具正常
    操作步骤：
      2、传入有效参数使用rust工具创建Device对象
      3、使用ts方法去解码rust编码对象获取属性值
      4、使用rust的desc-tool工具执行show -a 指令进行解码获取属性值
    预期结果：
      1、比较ts解码后和rust解码后的属性值一致
* TextObject
  * Ts编解码：有效传入owner,id,header,value参数
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、传入有效参数owner,id,header,value创建TextObject对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后属性值一致 
  * Ts编解码：有效传入owner,id,header,value为空值 
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、传入参数owner,id,header,value为空值创建TextObject对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后属性值一致也为空
  * Ts编解码：有效set_value()调用，修改value的值
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、传入有效参数owner,id,header,value创建TextObject对象
    2、调用set_value方法修改value值
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、解码后vlaue属性值与修改一致，修改成功 
  * Ts编解码：有效set_id()调用，修改id的值
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、传入有效参数owner,id,header,value创建TextObject对象
    2、调用set_id方法修改id值
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、解码后id属性值与修改一致，修改成功 
  * Ts编解码：有效set_header()调用，修改header的值
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、传入有效参数owner,id,header,value创建TextObject对象
    2、调用set_header方法修改header值
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、解码后header属性值与修改一致，修改成功 
  * Ts编解码：有效修改id,value,header为空值  
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、传入有效参数owner,id,header,value创建TextObject对象
    2、调用set方法修改id,value,header值为空
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、解码后属性值与修改一致都为空
  * 使用Rust工具对ts编码对象进行解码
    ```
    前置条件：
      1、准备好传参数据，desc-tool工具正常
    操作步骤：
      1、传入有效参数调用ts方法创建Device对象
      2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
      3、获取rust工具解码后的属性值
      4、对ts创建对象进行rust解码并获取对象属性值
    预期结果：
      1、比较创建ts对象前和rust解码后的属性值一致
  * 使用Rust工具编码后用Ts进行解码，再用rust解码进行比较
    ```
    前置条件：
      1、准备好有效传参数据，desc-tool工具正常
    操作步骤：
      2、传入有效参数使用rust工具创建Device对象
      3、使用ts方法去解码rust编码对象获取属性值
      4、使用rust的desc-tool工具执行show -a 指令进行解码获取属性值
    预期结果：
      1、比较ts解码后和rust解码后的属性值一致
* AppStoreList
  * Ts编解码：有效传入owner参数  
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、传入有效参数owner创建AppStoreList对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前和解码后属性值一致   
  * Ts编码：有效app_list()调用,查看app_list的值 
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、传入有效参数owner创建AppStoreList对象
    2、对创建对象调用app_list获取对象属性值
    预期结果：
    1、获取app_list属性值正常   
  * Ts编解码：有效remove()调用，删除app_list的值
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、传入有效参数owner创建AppStoreList对象
    2、调用remove方法删除applist
    3、对创建返回的对象进行unit8array类型转换
    4、对创建对象进行解码并获取对象属性值
    预期结果：
    1、解码后applist属性值为空 
  * Ts编解码：有效clear()调用，清空app_list的值  
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、传入有效参数owner创建AppStoreList对象
    2、调用clear方法删除applist
    3、对创建返回的对象进行unit8array类型转换
    4、对创建对象进行解码并获取对象属性值
    预期结果：
    1、解码后applist属性值为空 
  * 使用Rust工具对ts编码对象进行解码
    ```
    前置条件：
      1、准备好传参数据，desc-tool工具正常
    操作步骤：
      1、传入有效参数调用ts方法创建Device对象
      2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
      3、获取rust工具解码后的属性值
      4、对ts创建对象进行rust解码并获取对象属性值
    预期结果：
      1、比较创建ts对象前和rust解码后的属性值一致
  * 使用Rust工具编码后用Ts进行解码，再用rust解码进行比较
    ```
    前置条件：
      1、准备好有效传参数据，desc-tool工具正常
    操作步骤：
      2、传入有效参数使用rust工具创建Device对象
      3、使用ts方法去解码rust编码对象获取属性值
      4、使用rust的desc-tool工具执行show -a 指令进行解码获取属性值
    预期结果：
      1、比较ts解码后和rust解码后的属性值一致
* AppExtInfo
  * Ts编解码：有效传入owner，id参数
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、传入有效参数owner，id创建AppExtInfo对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码前后和解码后属性值一致
  * Ts编解码：有效传入id空值参数
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、传入参数id为空值创建AppExtInfo对象
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、编码后和解码后id属性为空值
  * Ts编解码：set_info()调用
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、传入参数id为空值创建AppExtInfo对象
    2、调用set_info方法设置info数据
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、解码后info属性与设置一致
  * Ts编解码：set_info(),传入空值调用
    ```
    前置条件：
    1、准备好传参数据和传参对象类型无误
    操作步骤：
    1、传入参数id为空值创建AppExtInfo对象
    2、调用set_info方法设置info数据为空字符串
    2、对创建返回的对象进行unit8array类型转换
    3、对创建对象进行解码并获取对象属性值
    预期结果：
    1、解码后info属性与设置一致也为空
  * 使用Rust工具对ts编码对象进行解码
    ```
    前置条件：
      1、准备好传参数据，desc-tool工具正常
    操作步骤：
      1、传入有效参数调用ts方法创建Device对象
      2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
      3、获取rust工具解码后的属性值
      4、对ts创建对象进行rust解码并获取对象属性值
    预期结果：
      1、比较创建ts对象前和rust解码后的属性值一致
  * 使用Rust工具编码后用Ts进行解码，再用rust解码进行比较
    ```
    前置条件：
      1、准备好有效传参数据，desc-tool工具正常
    操作步骤：
      2、传入有效参数使用rust工具创建Device对象
      3、使用ts方法去解码rust编码对象获取属性值
      4、使用rust的desc-tool工具执行show -a 指令进行解码获取属性值
    预期结果：
      1、比较ts解码后和rust解码后的属性值一致
* TransContext
  * 使用Rust工具对ts编码对象进行解码
    ```
    前置条件：
      1、准备好传参数据，desc-tool工具正常
    操作步骤：
      1、传入有效参数调用ts方法创建Device对象
      2、使用rust的desc-tool工具传入ts编码对象执行show -a 指令进行解码
      3、获取rust工具解码后的属性值
      4、对ts创建对象进行rust解码并获取对象属性值
    预期结果：
      1、比较创建ts对象前和rust解码后的属性值一致
  * 使用Rust工具编码后用Ts进行解码，再用rust解码进行比较
    ```
    前置条件：
      1、准备好有效传参数据，desc-tool工具正常
    操作步骤：
      2、传入有效参数使用rust工具创建Device对象
      3、使用ts方法去解码rust编码对象获取属性值
      4、使用rust的desc-tool工具执行show -a 指令进行解码获取属性值
    预期结果：
      1、比较ts解码后和rust解码后的属性值一致
  
### 3、扩展对象
* GitTextObject
* 
    * 对常用对象使用Protobuf重新实现进行编解码
