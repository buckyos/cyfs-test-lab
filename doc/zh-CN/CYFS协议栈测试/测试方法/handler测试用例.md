Handler 测试用例设计说明
=======
一、用例概述
--------
场景说明：根据以下handler特性设计场景，并覆盖了non主流操作以及acl的配合使用

* chain
    + pre_noc 在object插入noc之前触发
    + post_noc 在object插入noc之后触发
    + pre_router router层api，在进入router之前触发
    + post_router router层api，在从router出来后触发
    + pre_forward non向外(其它协议栈)转发请求之前触发
    + post_forward non向外转发请求之后触发
* filter
    + 支持的运算、数据类型、特殊、正则、合法字符集
* action
    + Default 继续默认行为
    + Response 终止路由，以返回值的BuckyResult<Response>作为应答(必须指定此字段，否则会触发错误应答)
    + Reject 终止路由，并以拒绝错误码Reject作为应答
    + Drop 终止路由，并以忽略错误码Ignored作为应答
    + Pass 观察者模式，继续调用该chain上的下一个handler
      

<u>用例路径：src\cyfs-stack-test-typescript\TestSuite\unittest_stack_NON_*</u>  
该模块测试场景当前依赖模拟器环境实现并运行

二、用例场景
--------
* 支持的NON操作对象主流程覆盖
  * 添加putObject的handler，默认action
  * 添加getObject的handler，默认action
  * 添加postObject的handler，默认action
  * 添加selectObject的handler，默认action
  * 添加deleteObject的handler，默认action


* 移除老handler更换id
  ```
  前置条件
  1.模拟器环境正常
  2.入参数据类型无误
  操作步骤
  1.先添加一个handler
  2.调用remove方法删除刚加的handler
  预期结果
  

* 注册后重启stack再请求，handler存储机制触发
* 不同chain，index >=0 返回action为非pass
* 不同chain，index <0 返回action为pass
* 不同chain，index相同，按照handler注册顺序
* 注册handler时不指定回调函数，使用defaultAction
* 注册handler时指定了回调函数，使用defaultAction
* 注册handler时指定了回调函数，不使用defaultAction

* ${chain}$+${action}$+${filter}$ 有多个handler
* pre_noc + default + filter字符串 resp
* post_noc + default + filter数字 resp
* pre_router + default + filter字母 resp
* post_router + default + filter布尔值true resp
* pre_forward + default + filter布尔值false resp
* pre_crypto + default + filter布尔值1 resp
* post_crypto + default + filter布尔值0 resp

* pre_noc + response应答 + filter特殊匹配符+ resp
* post_noc + response应答 + filter特殊匹配符* resp
* pre_router + response应答 + filter正则匹配 resp
* post_router + response应答 + filter整型十进制 resp
* pre_forward + response应答 + filter整型二进制(0b) resp
* pre_crypto + response应答 + filter整型二进制(0B) resp
* post_crypto + response应答 + filter整型八进制(0o) resp

* pre_noc + reject应答 + filter整型八进制(0O) 
* post_noc + reject应答 + filter整型十六进制(0x)
* pre_router + reject应答 + filter整型十六进制(0X)
* post_router + reject应答 + filter字母带下划线和连词符
* pre_forward + reject应答 + filter整斜杠和反斜杠
* pre_crypto + reject应答 + filter运算类型包含匹配==逻辑&&大小比较<=
* post_crypto + reject应答 + filter匹配运算类型!=逻辑||大小比较>=

* pre_noc + Drop忽略错误应答 + filter二进制位运算符^
* post_noc + Drop忽略错误应答 + filter含括号及多种合法运算符
* pre_router + Drop忽略错误应答
* post_router + Drop忽略错误应答
* pre_forward + Drop忽略错误应答
* pre_crypto + Drop忽略错误应答
* post_crypto + Drop忽略错误应答

* pre_noc + Pass继续调用下一个handler
* post_noc + Pass继续调用下一个handler
* pre_router + Pass继续调用下一个handler
* post_router + Pass继续调用下一个handler
* pre_forward + Pass继续调用下一个handler
* pre_crypto + Pass继续调用下一个handler
* post_crypto + Pass继续调用下一个handler

* 逆向
* 同一个chain上的index相同
* 相同chain，触发次序index >=0
* 相同chain，触发次序index <0   
* handler_id 设置相同,Chain不同异常场景
* handler_id 设置相同,chain也相同异常场景