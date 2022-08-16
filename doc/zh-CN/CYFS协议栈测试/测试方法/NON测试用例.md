NON 测试用例设计说明
=======
一、用例概述
--------
    场景说明：覆盖以下操作进行主要流程验证，覆盖三个不同级别（router、NON、NOC），基于模拟器提供的区域设备间操作，包含添加和更新签名的对象进行操作，NON的所有操作覆盖了与handler的交互
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
  * put一个新对象，提示accept
  * put附加了签名的对象
  * put更新了签名的对象
  * 更新updatetime，替换旧对象
  * 更新签名也更新对象updatetime
  * 设置请求路径req_path+handler_Acl控制


  * 多次put同一个对象，提示已经存在
  * 不设置target或设置为undefined
  * 不设置dec_id或设置为undefined  
  * handler交互
    * 移除老handler更换id
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
    

* level is NON （zone内和本地）
  * put一个新对象，提示accept
  * put附加了签名的对象
  * put更新了签名的对象
  * 更新updatetime，替换旧对象
  * 更新签名也更新对象updatetime
  * 设置请求路径req_path+handler_Acl控制


  * 多次put同一个对象，提示已经存在
  * 不设置target或设置为undefined
  * 不设置dec_id或设置为undefined  
  * handler
    * 移除老handler更换id
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

* level is NOC （只限本地）
  * put一个新对象，提示accept
  * put附加了签名的对象
  * put更新了签名的对象
  * 更新updatetime，替换旧对象
  * 更新签名也更新对象updatetime
  * 设置请求路径req_path+handler_Acl控制


  * 多次put同一个对象，提示已经存在
  * 不设置target或设置为undefined
  * 不设置dec_id或设置为undefined  
  * handler
    * 移除老handler更换id
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
### 2、get_object
* level is Router  （以下场景覆盖跨zone、zone内、本地）
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
  * handler
    * 移除老handler更换id
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
  * handler
    * 移除老handler更换id
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
  * handler
    * 移除老handler更换id
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
### 2、post_object
* level is Router  （以下场景覆盖跨zone、zone内、本地）  
说明：level==router&&handler（pre-router/post-router）不满足返回404
  * post一个新对象，提示accept
  * post附加了签名的对象
  * post更新了签名的对象
  * 更新updatetime，替换旧对象
  * 更新签名也更新对象updatetime
  * 设置请求路径req_path+handler_Acl控制


  * 多次post同一个对象，提示已经存在
  * 不设置target或设置为undefined
  * 不设置dec_id或设置为undefined  
  * post_object没有添加pre/post_router作为终点处理器
  * post_object不是router级别
  * handler
    * 移除老handler更换id
    * 注册后重启stack再请求，handler存储机制触发
    * 不同chain，index >=0 返回action为非pass
    * 不同chain，index <0 返回action为pass
    * 不同chain，index相同，按照handler注册顺序
    * 注册handler时不指定回调函数，使用defaultAction
    * 注册handler时指定了回调函数，使用defaultAction
    * 注册handler时指定了回调函数，不使用defaultAction
    
    * ${chain}$+${action}$+${filter}$ 有多个handler
      
      * pre_router + default + filter字母 resp
      * post_router + default + filter布尔值true resp

      * pre_router + response应答 + filter正则匹配 resp
      * post_router + response应答 + filter整型十进制 resp

      * pre_router + reject应答 + filter数字 
      * post_router + reject应答 + filter字母带下划线和连词符
    
      * pre_router + Drop忽略错误应答 + filter含括号及多种合法运算符
      * post_router + Drop忽略错误应答 + filter布尔值

      * pre_router + Pass继续调用下一个handler + filter带斜杠
      * post_router + Pass继续调用下一个handler + filter字符串
      

    * 逆向
        * 同一个chain上的index相同
        * 相同chain，触发次序index >=0
        * 相同chain，触发次序index <0   
        * handler_id 设置相同,Chain不同异常场景
        * handler_id 设置相同,chain也相同异常场景
    




       
### 2、select_object
* level is Router  （以下场景覆盖跨zone、zone内、本地）
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
  * handler
    * 移除老handler更换id
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
  * handler
    * 移除老handler更换id
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
  * handler
    * 移除老handler更换id
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


### 2、delete_object
* level is Router  （以下场景覆盖跨zone、zone内、本地）

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
  * handler
    * 移除老handler更换id
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
  * handler
    * 移除老handler更换id
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
  * handler
    * 移除老handler更换id
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


