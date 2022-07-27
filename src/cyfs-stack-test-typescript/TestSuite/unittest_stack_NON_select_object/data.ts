import {testSuiteJson} from '../../common' 
export const datas :testSuiteJson = {
system:"cyfs-stack",
module : "select_object",
testcaseList : [
{id:"select_object_Param_0021",name:"#select_object handler参数测试 id 设置相同id Chain不同异常场景"},
{id:"select_object_Param_0020",name:"#select_object handler参数测试 id 设置相同id Chain不同异常场景"},
{id:"select_object_Param_0013",name:"#select_object handler参数测试 routineType 设置为自定义hnadler SelectObjectHandlerPass 类型"},
{id:"select_object_Param_0012",name:"#select_object handler参数测试 routineType 设置为自定义hnadler SelectObjectHandlerDrop 类型"},
{id:"select_object_Param_0011",name:"#select_object handler参数测试 routineType 设置为自定义hnadler SelectObjectHandlerReject类型"},
{id:"select_object_Param_0010",name:"#select_object handler参数测试 routineType 设置为自定义hnadler SelectObjectHandlerDefault类型"},
{id:"select_object_Param_0009",name:"#select_object handler参数测试 index index 数值小的handler生效"},
{id:"select_object_Param_0008",name:"#select_object handler参数测试 index 设置相同index 先设置的hanlder 生效 Reject"},
{id:"select_object_Param_0008_01",name:"#select_object handler参数测试 index 设置相同index 先设置的hanlder 生效 Default"},
{id:"select_object_Param_0007",name:"#select_object handler参数测试 id 设置相同id Default覆盖Reject操作"},
{id:"select_object_Param_0006",name:"#select_object handler参数测试 id 设置相同id Reject覆盖Default操作"},
{id:"select_object_Param_0005",name:"#select_object handler参数测试 default_action 设置为Pass"},
{id:"select_object_Param_0004",name:"#select_object handler参数测试 default_action 设置为Response"},
{id:"select_object_Param_0003",name:"#select_object handler参数测试 default_action 设置为Drop"},
{id:"select_object_Param_0002",name:"#select_object handler参数测试 default_action 设置为Reject"},
{id:"select_object_Param_0001",name:"#select_object handler参数测试 default_action 设置为Default"},
{id:"select_object_router_0023_b",name:"#select_object-Router target 为跨zone device2 设置handler-ACL 全部为default, select 不支持跨zone"},
{id:"select_object_router_0022_b",name:"#select_object-Router target 为跨zone device2 未设置handler-ACL"},
{id:"select_object_router_0023_a",name:"#select_object-Router target 为跨zone ood 设置handler-ACL 全部为default,select 不支持跨zone"},
{id:"select_object_router_0022_a",name:"#select_object-Router target 为跨zone ood 未设置handler-ACL"},
{id:"select_object_router_0042",name:"#select_object-Router target 为同zone device2 设置device2 handler PostNOC 为reject"},
{id:"select_object_router_0041",name:"#select_object-Router target 为同zone device2 设置device2 handler PreNOC 为reject"},
{id:"select_object_router_0040",name:"#select_object-Router target 为同zone device2 设置device2 handler PostRouter 为reject"},
{id:"select_object_router_0039",name:"#select_object-Router target 为同zone device2 设置device2 handler PreRouter 为reject"},
{id:"select_object_router_0038",name:"#select_object-Router target 为同zone device2 设置device2 ACL-in 为reject"},
{id:"select_object_router_0029",name:"#select_object-Router target 为同zone device2 设置device1 ACL-out 为 reject,ACL 不触发"},
{id:"select_object_router_0028_a",name:"#select_object-Router target 为同zone device2 设置device1 PostForward 为 reject"},
{id:"select_object_router_0028",name:"#select_object-Router target 为同zone device2 设置device1 PreForward 为 reject"},
{id:"select_object_router_0027",name:"#select_object-Router target 为同zone device2 设置device1 PostNOC为 reject"},
{id:"select_object_router_0026",name:"#select_object-Router target 为同zone device2 设置device1 PreNOC为 reject,可以正常select"},
{id:"select_object_router_0025",name:"#select_object-Router target 为同zone device2 设置device1 PostRouter为 reject"},
{id:"select_object_router_0024",name:"#select_object-Router target 为同zone device2 设置device1 PreRouter为 reject"},
{id:"select_object_router_0023",name:"#select_object-Router target 为同zone device2 设置handler-ACL 全部为default"},
{id:"select_object_router_0022",name:"#select_object-Router target 为同zone device2 未设置handler-ACL"},
{id:"select_object_router_0021",name:"#select_object-Router target 为同zone OOD  OOD1 设置 PostNOC reject"},
{id:"select_object_router_0020",name:"#select_object-Router target 为同zone OOD  OOD1 设置 PreNOC reject"},
{id:"select_object_router_0019",name:"#select_object-Router target 为同zone OOD  OOD1 设置 PostRouter reject"},
{id:"select_object_router_0018",name:"#select_object-Router target 为同zone OOD  OOD1 设置 PreRouter reject"},
{id:"select_object_router_0017_02",name:"#select_object-Router target 为同zone OOD   设置 target 设备 ACL-OUT reject（机制待确认）"},
{id:"select_object_router_0017",name:"#select_object-Router target 为同zone OOD  OOD1 设置 ACL-IN reject（机制待确认）"},
{id:"select_object_router_0016",name:"#select_object-Router target 为同zone OOD  source设备 设置 PostForward reject"},
{id:"select_object_router_0015",name:"#select_object-Router target 为同zone OOD  source设备 设置 PreForward reject"},
{id:"select_object_router_0014",name:"#select_object-Router target 为同zone OOD  source设备 设置 PostNOC reject"},
{id:"select_object_router_0013",name:"#select_object-Router target 为同zone OOD  source设备 设置 PreNOC reject，只从target 查询"},
{id:"select_object_router_0012",name:"#select_object-Router target 为同zone OOD  source设备 设置 PostRouter reject"},
{id:"select_object_router_0011",name:"#select_object-Router target 为同zone OOD  source设备 设置 PreRouter reject"},
{id:"select_object_router_0010",name:"#select_object-Router target 为同zone OOD  source设备 设置 OUT ACL reject,select 不触发ACL"},
{id:"select_object_router_0009",name:"#select_object-Router target 为同zone OOD  设置handler-ACL 为default"},
{id:"select_object_router_0008",name:"#select_object-Router target 为同zone OOD  未设置handler-ACL"},
{id:"select_object_router_0007",name:"#select_object-Router target 为本地设备  设置handler PostRouter reject"},
{id:"select_object_router_0006",name:"#select_object-Router target 为本地设备  设置handler PostRouter reject"},
{id:"select_object_router_0005",name:"#select_object-Router target 为本地设备  设置handler PostNOC reject"},
{id:"select_object_router_0004",name:"#select_object-Router target 为本地设备  设置handler PreNOC reject"},
{id:"select_object_router_0003",name:"#select_object-Router target 为本地设备  设置handler PreRouter reject"},
{id:"select_object_router_0002",name:"#select_object-Router target 为本地设备  设置handler-ACL为默认"},
{id:"select_object_router_0001",name:"#select_object-Router target 为本地设备  未设置handler-ACL"},
{id:"select_object_non_0017",name:"#select_object-NON target 为同zone device2  设置target设备 handler PostNOC reject"},
{id:"select_object_non_0016",name:"#select_object-NON target 为同zone device2  设置target设备 handler PreNOC reject"},
{id:"select_object_non_0015_a",name:"#select_object-NON target 为同zone device2  设置source设备 handler PostForward reject"},
{id:"select_object_non_0015",name:"#select_object-NON target 为同zone device2  设置source设备 handler PreForward reject"},
{id:"select_object_non_0014",name:"#select_object-NON target 为同zone device2  设置handler-acl 为默认 default"},
{id:"select_object_non_0013",name:"#select_object-NON target 为同zone device2  未设置handler-acl 流程 "},
{id:"select_object_non_0012",name:"#select_object-NON target 为同zone OOD  设置handler OOD PostNOC reject"},
{id:"select_object_non_0011",name:"#select_object-NON target 为同zone OOD  设置handler OOD PreNOC reject"},
{id:"select_object_non_0010",name:"#select_object-NON target 为同zone OOD  设置handler OOD ACL reject，NON ACL不触发"},
{id:"select_object_non_0009",name:"#select_object-NON target 为同zone OOD  设置handler device1 ACL reject ,NON不触发ACL"},
{id:"select_object_non_0008",name:"#select_object-NON target 为同zone OOD  设置handler device1 PostForward reject "},
{id:"select_object_non_0007",name:"#select_object-NON target 为同zone OOD  设置handler device1 PreForward reject "},
{id:"select_object_non_0006",name:"#select_object-NON target 为同zone OOD  设置handlerACL default-正常流程"},
{id:"select_object_non_0005",name:"#select_object-NON target 为同zone OOD  无handlerACL流程-正常流程"},
{id:"select_object_non_0004",name:"#select_object-NON target 本地设备 设置所有handler PostNOC reject"},
{id:"select_object_non_0003",name:"#select_object-NON target 本地设备 设置所有handler PreNOC reject"},
{id:"select_object_non_0002",name:"#select_object-NON target 本地设备 设置所有handlerACL default"},
{id:"select_object_non_0001",name:"#select_object-NON target 本地设备 无handlerACL流程-正常流程"},
{id:"select_object_noc_0004",name:"#select_object-NOC流程-设置 handler PostNOC reject"},
{id:"select_object_noc_0003",name:"#select_object-NOC流程-设置 handler PreNOC reject"},
{id:"select_object_noc_0002",name:"#select_object-NOC流程-设置所有handlerACL default"},
{id:"select_object_noc_0001",name:"#select_object-NOC 无handlerACL流程-正常流程"},
]
}