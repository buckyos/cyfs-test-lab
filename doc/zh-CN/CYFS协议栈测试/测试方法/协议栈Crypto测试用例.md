协议栈Crypto 测试用例设计说明
=======
一、用例概述
--------
    场景说明：覆盖以下操作进行主要流程验证，覆盖handler的交互场景
        
* sign_object
* verify_object

<u>用例路径：src\cyfs-stack-test-typescript\TestSuite\unittest_stack_NON_crypto</u>  
该模块测试场景当前依赖模拟器环境实现并运行

二、用例场景
--------
crypto 调用 sign_object、verify_object对对象签名并且进行校验主流程
### 1、sign_object
* sign_object handler参数测试 id 设置相同id Chain不同异常场景
* sign_object handler参数测试 id 设置相同id Chain不同异常场景
* sign_object handler参数测试 routineType 设置为自定义hnadler 
* PutObjectHandlerResponseUpdated 类型
* sign_object handler参数测试 routineType 设置为自定义hnadler 
* PutObjectHandlerResponseMerged 类型
* sign_object handler参数测试 routineType 设置为自定义hnadler 
* PutObjectHandlerResponseAlreadyExists 类型
* sign_object handler参数测试 routineType 设置为自定义hnadler 
* PutObjectHandlerResponseAcceptWithSign 类型  
* sign_object handler参数测试 routineType 设置为自定义hnadler   
* PutObjectHandlerResponseAccept 类型   
* handler参数测试 routineType 设置为自定义hnadler PutObjectHandlerResponse 类型  
* handler参数测试 routineType 设置为自定义hnadler PutObjectHandlerPass 类型   
* handler参数测试 routineType 设置为自定义hnadler PutObjectHandlerDrop 类型   
* handler参数测试 routineType 设置为自定义hnadler PutObjectHandlerReject类型  
* handler参数测试 routineType 设置为自定义hnadler CryptoHandlerDefault类型  
* handler参数测试 index index 数值小的handler生效  
* handler参数测试 index 设置相同index 先设置的hanlder 生效 Reject  
* handler参数测试 index 设置相同index 先设置的hanlder 生效 Default  
* handler参数测试 id 设置相同id Default覆盖Reject操作   
* handler参数测试 id 设置相同id Reject覆盖Default操作  
* handler参数测试 default_action 设置为Pass  
* handler参数测试 default_action 设置为Response  
* handler参数测试 default_action 设置为Drop  
* handler参数测试 default_action 设置为Reject  
* handler参数测试 default_action 设置为Default    
### 2、verify_object
* router_handlers调用add_post_object_handler正常流程  
* router_handlers调用add_select_object_handler正常流程  
* router_handlers调用add_delete_object_handler正常流程  
* router_handlers调用add_get_object_handler正常流程   
* router_handlers调用add_put_object_handler正常流程  
* verify_object handler参数测试 id 设置相同id Chain不同异常场景  
* verify_object handler参数测试 id 设置相同id Chain不同异常场景  
* verify_object handler参数测试 routineType 设置为自定义handler   
* CryptoHandlerDefault类型    
* verify_object handler参数测试 index index 数值小的handler生效     
* verify_object handler参数测试 index 设置相同index 先设置的hanlder 生效 Reject  
* verify_object handler参数测试 index 设置相同index 先设置的hanlder 生效 Default  
* verify_object handler参数测试 id 设置相同id Default覆盖Reject操作  
* verify_object handler参数测试 id 设置相同id Reject覆盖Default操作  
* verify_object handler参数测试 default_action 设置为Pass  
* verify_object handler参数测试 default_action 设置为Response  
* verify_object handler参数测试 default_action 设置为Drop  
* verify_object handler参数测试 default_action 设置为Reject  
* verify_object handler参数测试 default_action 设置为Default  