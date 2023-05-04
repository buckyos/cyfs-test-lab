## 动态ACL Handler 实现Token 检验

+ ACL Handelr Event的实现 cyfs.RouterHandlerAclRoutine : 在call中增加token校验机制

```
    class SmokeDynamicTokenHandler implements cyfs.RouterHandlerAclRoutine{

        async call(param: cyfs.RouterHandlerAclRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerAclResult>> {
            console.info(`will handle dynamic acl${param.request.req_path}: query${param.request.req_query_string}`)
            let action = cyfs.AclAction.Reject;
            let querys = param.request.req_query_string.split("&");
            for(let query of querys){
                let [key,value] = query.split("=");
                if(key === "token" && value===USER_ACCESS_TOKEN){
                    action = cyfs.AclAction.Accept;
                    break;
                }
            }
            let resp :cyfs.AclHandlerResponse = {
                action
            }
            let result : cyfs.RouterHandlerAclResult =  {
                action: cyfs.RouterHandlerAction.Response,
                response : cyfs.Ok(resp),
            }
            return cyfs.Ok(result)
        }

        
    }
```

+ 在协议栈上注册ACL Handler Event ： stack.router_handlers().add_acl_handler()

+ 设置资源数据访问权限,通过动态Handler限制
    + req_path 方式 : root_state_meta_stub().add_access() cyfs.GlobalStatePathAccessItem 支持Handler



+ 访问资源数据时，设置token相关参数
    + satck.root_state_accessor_stub()
    + cyfs://o 链接
    + cyfs://r 链接
  
## 接口参数用例

### cyfs.RouterHandlerAclRoutine 类的实现

### stack.router_handlers().add_acl_handler() 接口

### root_state_meta_stub().add_access() 接口

