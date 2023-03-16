## Action 操作的定义
+ 将协议栈一组Api的操作抽象未Action,模拟开发者通过应用开发在 客户端/服务端 进行的操作行为
+ 比如推送文件对象通知对端下载，比如生成对象修改权限推送给对端等等
+ 正确的实现流程 应该通过Local Action（本地操作） + handler（post object 操作对端协议栈）完成业务流程
## Action实现的注意事项
+ 标准的原子粒度的Action 只能使用local stack 
+ remote、user_list stack 应该禁止使用（使用了要放到unstandard 里面），开发实际使用流程是不能同时连接多个协议栈的。