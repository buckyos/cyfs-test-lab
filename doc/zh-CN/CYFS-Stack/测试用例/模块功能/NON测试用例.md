NON 测试用例设计说明
=======
一、用例概述
--------
    场景说明：覆盖以下操作进行主要流程验证，覆盖三个不同级别（router、NON、NOC），基于模拟器提供的区域设备间操作，包含添加和更新签名的对象进行操作，覆盖handler主流程
        跨zone：
        zone1device => ood1 => ood2 => zone2 device  
        zone1device => ood1 => ood2 =sync> zone2 device
        同zone：
        ood => device
        device1 => ood =sync> device2  
        device1 => ood => device2
* put_object
* get_object
* post_object
* select_object
* delete_object   

<u>用例路径：src\cyfs-stack-test-typescript\TestSuite\unittest_stack_NON_*</u>  
该模块测试场景当前依赖模拟器环境实现并运行

二、用例场景
--------
### 1、put_object
* level is Router  （以下场景覆盖跨zone、zone内、本地）
  * put一个新对象，返回accept
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0
      2、发起请求得到返回数据进行断言
    预期结果：
      1、请求返回码数据正常，对象已接受acccept
  * 多次向同个目标put一个对象，提示已经存在
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0，target至zone1device1
      2、发起请求得到返回数据进行断言
      3、再次发起同一个请求对返回数据断言
    预期结果：
      1、第一次请求返回码数据正常已接受accept，第二次返回正常提示已经存在alreadyExist
  * put附加了签名的对象
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、对初始化NONobject调用sign_object进行签名
      2、传入初始化数据和必填参数level和flags为0以及签名后的对象
      3、发起put请求得到返回数据并进行断言
    预期结果：
      1、请求返回码数据正常，对象已接受并附加了签名acceptWithSign
  * put更新了签名的对象
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、对初始化NONobject调用sign_object进行二次签名
      2、传入初始化数据和必填参数level和flags为0以及签名后的对象
      3、发起请求得到返回数据并进行断言
    预期结果：
      1、请求返回码数据正常，返回merged为对象签名合并操作
  * 更新updatetime，替换旧对象
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、对初始化NONobject调用set_update_time操作
      2、传入初始化数据和必填参数level和flags为0以及签名后的对象
      3、发起请求得到返回数据并进行断言
    预期结果：
      1、请求返回码数据正常
 

  * 跨zone-设置target由zone1device1到zone2device1
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0，level为router，source为zone1device1，target至zone2device1
      2、发起请求得到返回数据进行断言
    预期结果：
      1、请求返回码数据正常，对象已接受acccept
  * 跨zone-设置target由zone1device1到zone2device2
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0，level为router，source为zone1device1，target至zone2device2
      2、发起请求得到返回数据进行断言
    预期结果：
      1、请求返回码数据正常，对象已接受acccept
  * 跨zone-设置target由zone1ood到zone2device1
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0，level为router，source为zone1ood，target至zone2device1
      2、发起请求得到返回数据进行断言
    预期结果：
      1、请求返回码数据正常，对象已接受acccept
  * 跨zone-设置target由zone1ood到zone2ood
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0，level为router，source为zone1ood，target至zone2ood
      2、发起请求得到返回数据进行断言
    预期结果：
      1、请求返回码数据正常，对象已接受acccept
  * sync跨zone-由zone1device到zone2的ood后同步至zone2device
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0，level为router，source为zone1device，target至zone2ood
      2、发起请求得到返回数据进行断言
      3、在zone2device上get_object刚put的对象
    预期结果：
      1、put请求返回码数据正常，在zone2device上获取对象正常该对象存在

  * 同zone-设置target由zone1ood到zone1device1
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0，level为router，source为zone1ood，target至zone1device1
      2、发起请求得到返回数据进行断言
    预期结果：
      1、请求返回码数据正常，对象已接受acccept
  * 同zone-设置target由zone1ood到zone1oodStandby
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0，level为router，source为zone1ood，target至zone1oodStandby
      2、发起请求得到返回数据进行断言
    预期结果：
      1、请求返回码数据正常，对象已接受acccept
  * 同zone-设置target由zone1device到zone1ood
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0，level为router，source为zone1device，target至zone1ood
      2、发起请求得到返回数据进行断言
    预期结果：
      1、请求返回码数据正常，对象已接受acccept
  * 同zone-设置target由zone1device1到zone1device2
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0，level为router，source为zone1device1，target至zone1device2
      2、发起请求得到返回数据进行断言
    预期结果：
      1、请求返回码数据正常，对象已接受acccept
  * sync同zone-由zone1device1经由zone1ood同步到zone1device2
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0，level为router，source为zone1device1，target至zone1ood
      2、发起请求得到返回数据进行断言
      3、在zone1device上get_object刚put的对象
    预期结果：
      1、put请求返回码数据正常，在zone1device上获取对象正常该对象存在
  * 设备本地-设置target由zone1device1到zone1device1
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0，level为router，source为zone1device1，target至zone1device1
      2、发起请求得到返回数据进行断言
    预期结果：
      1、请求返回码数据正常，对象已接受acccept
  * 设备本地-设置target由zone1ood1到zone1ood1
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0，level为router，source为zone1ood1，target至zone1ood1
      2、发起请求得到返回数据进行断言
    预期结果：
      1、请求返回码数据正常，对象已接受acccept

 




  * 不设置target或设置为undefined
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0不设置target
      2、发起请求得到返回数据进行断言
    预期结果：
      1、请求返回码数据正常，对象已接受acccept
  * 不设置dec_id或设置为undefined  
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0不设置dec_id
      2、发起请求得到返回数据进行断言
    预期结果：
      1、请求返回码数据正常，对象已接受acccept
    

* level is NON （zone内和本地）
  * put一个新对象，提示accept
  * put附加了签名的对象
  * put更新了签名的对象
  * 更新updatetime，替换旧对象
  * 更新签名也更新对象updatetime
  * 设置请求路径req_path+handler_Acl控制
 
  * 同zone-设置target由zone1ood到zone1device1
  * 同zone-设置target由zone1ood到zone1ood2
  * 同zone-设置target由zone1device到zone1ood
  * 同zone-设置target由zone1device1到zone1device2
  * sync同zone-由zone1device1经由zone1ood同步到zone1device2

  * 设备本地-设置target由zone1device1到zone1device1
  * 设备本地-设置target由zone1ood1到zone1ood1

  * 多次put同一个对象，提示已经存在
  * 不设置target或设置为undefined
  * 不设置dec_id或设置为undefined  


* level is NOC （只限本地）
  * put一个新对象，提示accept
  * put附加了签名的对象
  * put更新了签名的对象
  * 更新updatetime，替换旧对象
  * 更新签名也更新对象updatetime
  * 设置请求路径req_path+handler_Acl控制

  * 设备本地-设置target由zone1device1到zone1device1
  * 设备本地-设置target由zone1ood1到zone1ood1

  * 多次put同一个对象，提示已经存在
  * 不设置target或设置为undefined
  * 不设置dec_id或设置为undefined  
   
### 2、get_object
* level is Router  （以下场景覆盖跨zone、zone内、本地）
  * get一个新对象
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数先put一个对象
      2、然后调用get_object获取对象信息
    预期结果：
      1、请求返回码对象信息正常
  * get附加了签名的对象
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数先put一个对象
      2、然后调用get_object获取对象信息
    预期结果：
      1、请求返回码对象信息正常
  * get更新了签名的对象
  * get更新了updatetime新对象
  * get更新签名也更新对象updatetime


  * 跨zone-设置target由zone1device1到zone2device1
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0，level为router，source为zone1device1，target至zone2device1
      2、发起请求得到返回数据进行断言
      3、从zone2device1调用get_object请求获取对象信息
    预期结果：
      1、请求返回码数据正常
  * 跨zone-设置target由zone1device1到zone2device2
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0，level为router，source为zone1device1，target至zone2device2
      2、发起请求得到返回数据进行断言
      3、从zone2device2调用get_object请求获取对象信息
    预期结果：
      1、请求返回码数据正常
  * 跨zone-设置target由zone1ood到zone2device1
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0，level为router，source为zone1ood，target至zone2device1
      2、发起请求得到返回数据进行断言
      3、从zone2device1调用get_object请求获取对象信息
    预期结果：
      1、请求返回码数据正常
  * 跨zone-设置target由zone1ood到zone2ood
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0，level为router，source为zone1ood，target至zone2
      2、发起请求得到返回数据进行断言
      3、从zone2device1调用get_object请求获取对象信息
    预期结果：
      1、请求返回码数据正常
  * sync跨zone-由zone1device到zone2的ood后同步至zone2device
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0，level为router，source为zone1device，target至zone2ood
      2、发起请求得到返回数据进行断言
      3、在zone2device上get_object刚put的对象
    预期结果：
      1、put请求返回码数据正常，在zone2device上获取对象正常该对象存在

  * 同zone-设置target由zone1ood到zone1device1
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0，level为router，source为zone1ood，target至zone1device1
      2、发起请求得到返回数据进行断言
      3、从zone1device1调用get_object请求获取对象信息
    预期结果：
      1、请求返回码数据正常
  * 同zone-设置target由zone1ood到zone1oodStandby
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0，level为router，source为zone1ood，target至zone1oodStandby
      2、发起请求得到返回数据进行断言
      3、从zone1oodStandby调用get_object请求获取对象信息
    预期结果：
      1、请求返回码数据正常
  * 同zone-设置target由zone1device到zone1ood
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0，level为router，source为zone1device，target至zone1ood
      2、发起请求得到返回数据进行断言
      3、从zone1ood调用get_object请求获取对象信息
    预期结果：
      1、请求返回码数据正常
  * 同zone-设置target由zone1device1到zone1device2
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0，level为router，source为zone1device1，target至zone1device2
      2、发起请求得到返回数据进行断言
      3、从zone1device2调用get_object请求获取对象信息
    预期结果：
      1、请求返回码数据正常
  * sync同zone-由zone1device1经由zone1ood同步到zone1device
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0，level为router，source为zone1device1，target至zone1ood
      2、发起请求得到返回数据进行断言
      3、在zone1device上get_object刚put的对象
    预期结果：
      1、put请求返回码数据正常，在zone1device上获取对象正常该对象存在
  * 设备本地-设置target由zone1device1到zone1device1
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0，level为router，source为zone1device1，target至zone1device1
      2、发起请求得到返回数据进行断言
      3、从zone1device1调用get_object请求获取对象信息
    预期结果：
      1、请求返回码数据正常
  * 设备本地-设置target由zone1ood1到zone1ood1
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0，level为router，source为zone1ood1，target至zone1ood1
      2、发起请求得到返回数据进行断言
      3、从zone1ood1调用get_object请求获取对象信息
    预期结果：
      1、请求返回码数据正常

 




  * 不设置target或设置为undefined
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数先put一个对象
      2、然后不带target参数调用get_object获取对象信息
    预期结果：
      1、请求返回码对象信息正常
  * 不设置dec_id或设置为undefined  
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数先put一个对象
      2、然后不带dec_id参数调用get_object获取对象信息
    预期结果：
      1、请求返回码对象信息正常

* level is NON （zone内和本地）
  * 设置inner_path,object_id为单层目录时 
  * 设置inner_path取子文件,object_id为嵌套目录时 
  * get一个新对象
  * get附加了签名的对象
  * get更新了签名的对象
  * get更新了updatetime新对象
  * get更新签名也更新对象updatetime
  * 设置请求路径req_path+handler_Acl控制

  * 多次get同一个对象
  * 不设置target或设置为undefined
  * 不设置dec_id或设置为undefined  


* level is NOC （只限本地）
  * 设置inner_path,object_id为单层目录时 
  * 设置inner_path取子文件,object_id为嵌套目录时 
  * get一个新对象
  * get附加了签名的对象
  * get更新了签名的对象
  * get更新了updatetime新对象
  * get更新签名也更新对象updatetime
  * 设置请求路径req_path+handler_Acl控制

  * 多次get同一个对象
  * 不设置target或设置为undefined
  * 不设置dec_id或设置为undefined  
 
### 2、post_object
* level is Router  （以下场景覆盖跨zone、zone内、本地）  
说明：level==router&&handler（pre-router/post-router）不满足返回404
  * post一个新对象，提示accept
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0
      2、发起请求得到返回数据进行断言
    预期结果：
      1、请求返回码数据正常，对象已接受acccept
  * 多次post同一个对象，提示已经存在
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0，target至zone1device1
      2、发起请求得到返回数据进行断言
      3、再次发起同一个请求对返回数据断言
    预期结果：
      1、第一次请求返回码数据正常已接受accept，第二次返回正常提示已经存在alreadyExist
  * post附加了签名的对象
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、对初始化NONobject调用sign_object进行签名
      2、传入初始化数据和必填参数level和flags为0以及签名后的对象
      3、发起put请求得到返回数据并进行断言
    预期结果：
      1、请求返回码数据正常，对象已接受并附加了签名acceptWithSign
  * post更新了签名的对象
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、对初始化NONobject调用sign_object进行二次签名
      2、传入初始化数据和必填参数level和flags为0以及签名后的对象
      3、发起请求得到返回数据并进行断言
    预期结果：
      1、请求返回码数据正常，返回merged为对象签名合并操作
  * 更新updatetime，替换旧对象
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、对初始化NONobject调用set_update_time操作
      2、传入初始化数据和必填参数level和flags为0以及签名后的对象
      3、发起请求得到返回数据并进行断言
    预期结果：
      1、请求返回码数据正常
 
 


 
  * 不设置target或设置为undefined
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0不设置target
      2、发起请求得到返回数据进行断言
    预期结果：
      1、请求返回码数据正常，对象已接受acccept
  * 不设置dec_id或设置为undefined 
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0不设置dec_id
      2、发起请求得到返回数据进行断言
    预期结果：
      1、请求返回码数据正常，对象已接受acccept 
  * post_object没有添加pre/post_router作为终点处理器
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level和flags为0
      2、handler非pre-router/post-router发起请求得到返回数据进行断言
    预期结果：
      1、请求返回码错误404
  * post_object不是router级别
      ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、传入初始化数据和必填参数level为NON和flags为0
      2、发起请求得到返回数据进行断言
    预期结果：
      1、请求返回码错误404
 




       
### 2、select_object
* level is Router  （以下场景覆盖跨zone、zone内、本地）
    * 筛选filter
        * 根据obj_type参数筛选zone对象32
            ```
            前置条件：
              1、模拟器环境正常
              2、初始化一个NONobject为zone类型对象
            操作步骤：
              1、先put一个对象
              2、传入初始化数据和必填参数level和flags为0，filter设置objtype为32
              3、发起请求得到返回数据进行断言
            预期结果：
              1、请求返回码数据正常
        * 根据obj_type参数筛选text对象41
            ```
            前置条件：
              1、模拟器环境正常
              2、初始化一个NONobject为text类型对象
            操作步骤：
              1、先put一个对象
              2、传入初始化数据和必填参数level和flags为0，filter设置objtype为41
              3、发起请求得到返回数据进行断言
            预期结果：
              1、请求返回码数据正常
        * 根据obj_type_code参数筛选自定义16
            ```
            前置条件：
              1、模拟器环境正常
              2、初始化一个NONobject
            操作步骤：
              1、传入初始化数据和必填参数level和flags为0，filter设置objtypecode为自定义类型16
              2、发起请求得到返回数据进行断言
            预期结果：
              1、请求返回码数据正常
        * 根据obj_type_code自定义和自定义对象obj_type筛查
            ```
            前置条件：
              1、模拟器环境正常
              2、初始化一个NONobject
            操作步骤：
              1、先put一个自定义对象
              2、传入初始化数据和必填参数level和flags为0，filter设置objtypecode为自定义类型16以及obj_type为自定义对象类型
              3、发起请求得到返回数据进行断言
            预期结果：
              1、请求返回码数据正常
        * 根据obj_type_code参数筛选device为1
            ```
            前置条件：
              1、模拟器环境正常
              2、初始化一个NONobject
            操作步骤：
              1、传入初始化数据和必填参数level和flags为0，filter设置objtypecode为设备类型1
              2、发起请求得到返回数据进行断言
            预期结果：
              1、请求返回码数据正常
        * 根据dec_id参数筛选
            ```
            前置条件：
              1、模拟器环境正常
              2、初始化一个NONobject
            操作步骤：
              1、先put对象
              2、传入初始化数据和必填参数level和flags为0，filter设置合规的dec_id
              3、发起请求得到返回数据进行断言
            预期结果：
              1、请求返回码数据正常
        * 根据owner_id参数筛选
            ```
            前置条件：
              1、模拟器环境正常
              2、初始化一个NONobject
            操作步骤：
              1、先put对象
              2、传入初始化数据和必填参数level和flags为0，filter设置合规的owner_id
              3、发起请求得到返回数据进行断言
            预期结果：
              1、请求返回码数据正常
        * 根据owner_id和obj_type筛选
            ```
            前置条件：
              1、模拟器环境正常
              2、初始化一个NONobject
            操作步骤：
              1、先put对象
              2、传入初始化数据和必填参数level和flags为0，filter设置合规的owner_id和obj_type为text
              3、发起请求得到返回数据进行断言
            预期结果：
              1、请求返回码数据正常
        * 根据author_id参数筛选
            ```
            前置条件：
              1、模拟器环境正常
              2、初始化一个NONobject
            操作步骤：
              1、先put对象
              2、传入初始化数据和必填参数level和flags为0，filter设置合规的author_id
              3、发起请求得到返回数据进行断言
            预期结果：
              1、请求返回码数据正常
        * 根据create_time和owner_id参数筛选请求在范围内时间
            ```
            前置条件：
              1、模拟器环境正常
              2、初始化一个NONobject
            操作步骤：
              1、先put对象
              2、传入初始化数据和必填参数level和flags为0，filter设置timerange覆盖方才请求的时间
              3、发起请求得到返回数据进行断言
            预期结果：
              1、请求返回码数据正常
        * 根据create_time和owner_id参数筛选请求不在范围的时间
            ```
            前置条件：
              1、模拟器环境正常
              2、初始化一个NONobject
            操作步骤：
              1、先put对象
              2、传入初始化数据和必填参数level和flags为0，filter设置owner_id和timerange超过方才请求的时间
              3、发起请求得到返回数据进行断言
            预期结果：
              1、请求返回码错误条件范围内数据不存在
        * 根据update_time和author_id参数筛选请求在时间范围内
            ```
            前置条件：
              1、模拟器环境正常
              2、初始化一个NONobject
            操作步骤：
              1、先put对象
              2、传入初始化数据和必填参数level和flags为0，filter设置author_id和timerange覆盖方才请求的时间
              3、发起请求得到返回数据进行断言
            预期结果：
              1、请求返回码数据正常
        * 根据update_time和author_id参数筛选请求不在时间范围内
            ```
            前置条件：
              1、模拟器环境正常
              2、初始化一个NONobject
            操作步骤：
              1、先put对象
              2、传入初始化数据和必填参数level和flags为0，filter设置owner_id和timerange超过方才请求的时间
              3、发起请求得到返回数据进行断言
            预期结果：
              1、请求返回码错误条件范围内数据不存在


    * opt分页设置
      * 默认selectOption，index为0，size为32
          ```
          前置条件：
            1、模拟器环境正常
            2、初始化一个NONobject
          操作步骤：
            1、先put一个对象
            2、传入初始化数据和必填参数level和flags为0，opt设置为默认selectOption
            3、发起请求得到返回数据进行断言
          预期结果：
            1、请求返回码数据正常
      * index为0，size为5
          ```
          前置条件：  
            1、模拟器环境正常
            2、初始化一个NONobject为zone类型对象
          操作步骤：
            1、先put一个对象
            2、传入初始化数据和必填参数level和flags为0，opt设置为index=0，size=5
            3、发起请求得到返回数据进行断言
          预期结果：
            1、请求返回码数据正常
    * opt + filter
      * 默认selectOption，filter对象类型、所有者、创建时间
          ```
          前置条件：
            1、模拟器环境正常
            2、初始化一个NONobject
          操作步骤：
            1、先put一个对象
            2、传入初始化数据和必填参数level和flags为0，opt设置为默认selectOption、filter设置对象类型text、ownerid、创建时的timerange
            3、发起请求得到返回数据进行断言
          预期结果：
            1、请求返回码数据正常
      * index为0，size为5，filter自定义对象类型、所有者、创建时间
        ```
        前置条件：
          1、模拟器环境正常
          2、初始化一个NONobject
        操作步骤：
          1、先put一个对象
          2、传入初始化数据和必填参数level和flags为0，opt设置为index=0、size=5，filter设置自定义对象类型、ownerid、创建时的timerange
          3、发起请求得到返回数据进行断言
        预期结果：
          1、请求返回码数据正常




  * 不设置target或设置为undefined
  * 不设置dec_id或设置为undefined  


* level is NON （zone内和本地）
    * 以下筛选filter参数可排列组合
        * 根据obj_type参数筛选
        * 根据obj_type_code参数筛选
        * 根据dec_id参数筛选
        * 根据owner_id参数筛选
        * 根据author_id参数筛选
        * 根据create_time参数筛选
        * 根据update_time参数筛选
        * 根据insert_time参数筛选

    * opt分页显示设置
        * 第1页index为0显示size为1
        * 第1页index为0显示size为0
        * 第1页index为0显示size为10
        * 第10页index为10显示size为1
        * 第10页index为10显示size为0
        * 第10页index为10显示size为10
        * 根据author_id和分页参数进行筛选

    * 设置请求路径req_path+handler_Acl控制


  * 多次select同一个对象
  * 不设置target或设置为undefined
  * 不设置dec_id或设置为undefined   
 

* level is NOC （只限本地）
    * 以下筛选filter参数可排列组合
        * 根据obj_type参数筛选
        * 根据obj_type_code参数筛选
        * 根据dec_id参数筛选
        * 根据owner_id参数筛选
        * 根据author_id参数筛选
        * 根据create_time参数筛选
        * 根据update_time参数筛选
        * 根据insert_time参数筛选

    * opt分页显示设置
        * 第1页index为0显示size为1
        * 第1页index为0显示size为0
        * 第1页index为0显示size为10
        * 第10页index为10显示size为1
        * 第10页index为10显示size为0
        * 第10页index为10显示size为10
        * 根据author_id和分页参数进行筛选

    * 设置请求路径req_path+handler_Acl控制


  * 多次select同一个对象
  * 不设置target或设置为undefined
  * 不设置dec_id或设置为undefined  


### 2、delete_object
* level is Router  （以下场景覆盖跨zone、zone内、本地）
  * delete一个text对象
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、先put一个对象到目标协议栈
      2、传入初始化数据和必填参数调用delete
      3、得到返回数据进行断言
    预期结果：
      1、请求返回码数据正常，删除成功，返回删除的对象信息
  * delete一个people对象
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、先put一个people对象到目标协议栈
      2、传入初始化数据和必填参数调用delete
      3、得到返回数据进行断言
    预期结果：
      1、请求返回码数据正常，删除成功，返回删除的对象信息
  * 再次delete同一个对象
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、先put一个text对象到目标协议栈
      2、传入初始化数据和必填参数调用delete
      3、得到返回数据进行断言
      4、二次从相同目标协议栈调用delete同一个对象
    预期结果：
      1、第一次请求返回码数据正常，删除成功，返回删除的对象信息，第二次返回已不存在
  * delete附加了签名的对象
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、先put一个附加了签名的对象到目标协议栈
      2、传入初始化数据和必填参数调用delete
      3、得到返回数据进行断言
    预期结果：
      1、请求返回码数据正常，删除成功，返回删除的对象信息
  * delete更新了签名的对象
    ```
    前置条件：
      1、模拟器环境正常
      2、初始化一个NONobject
    操作步骤：
      1、先put一个更新了签名的对象到目标协议栈
      2、传入初始化数据和必填参数调用delete
      3、得到返回数据进行断言
    预期结果：
      1、请求返回码数据正常，删除成功，返回删除的对象信息
  * 不设置target或设置为undefined
  * 不设置dec_id或设置为undefined


* level is NON （zone内和本地）
  * delete一个text对象
  * delete一个people对象
  * delete其他对象？
  * 再次delete同一个对象
  * delete附加了签名的对象
  * delete更新了签名的对象
  * delete更新签名也更新updatetime的对象
  * 设置请求路径req_path+handler_Acl控制
  * 不设置target或设置为undefined
  * 不设置dec_id或设置为undefined
  
* level is NOC （只限本地）
  * delete一个text对象
  * delete一个people对象
  * delete其他对象？
  * 再次delete同一个对象
  * delete附加了签名的对象
  * delete更新了签名的对象
  * delete更新签名也更新updatetime的对象
  * 设置请求路径req_path+handler_Acl控制
  * 不设置target或设置为undefined
  * 不设置dec_id或设置为undefined  

