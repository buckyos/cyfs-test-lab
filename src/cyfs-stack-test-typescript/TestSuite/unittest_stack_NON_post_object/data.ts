import {StackType, testSuiteJson} from '../../common' 
export const datas :testSuiteJson = {
    system: "cyfs-stack",
    module: "NON_post_object",
    testcaseList: [
        { id: "post_object_Param_0021", name: "#post_object handler参数测试 id 设置相同id ,Chain不同场景" },
        { id: "post_object_Param_0020", name: "#post_object handler参数测试id 设置相同id Chain相同进行覆盖操作" },
        { id: "post_object_Param_0011", name: "#post_object handler参数测试 routineType 设置为自定义hnadler PostObjectHandlerReject类型" },
        { id: "post_object_Param_0010", name: "#post_object handler参数测试 routineType 设置为自定义hnadler PostObjectHandlerDefault类型" },
        { id: "post_object_Param_0009", name: "#post_object handler参数测试 index index 数值小的handler生效" },
        { id: "post_object_Param_0008", name: "#post_object handler参数测试 index 设置相同index 先设置的hanlder 生效 Reject" },
        { id: "post_object_Param_0008_01", name: "#post_object handler参数测试 index 设置相同index 先设置的hanlder 生效 Default" },
        { id: "post_object_Param_0007", name: "#post_object handler参数测试 id 设置相同id Default覆盖Reject操作" },
        { id: "post_object_Param_0006", name: "#post_object handler参数测试 id 设置相同id Reject覆盖Default操作" },
        { id: "post_object_Param_0005", name: "#post_object handler参数测试 default_action 设置为Pass" },
        { id: "post_object_Param_0004", name: "#post_object handler参数测试 default_action 设置为Response" },
        { id: "post_object_Param_0003", name: "#post_object handler参数测试 default_action 设置为Drop" },
        { id: "post_object_Param_0002", name: "#post_object handler参数测试 default_action 设置为Reject" },
        { id: "post_object_Param_0001", name: "#post_object handler参数测试 default_action 设置为Default" },
        { id: "post_object_router_0094", name: "#post_object-Router target 为跨zone device2 设置device2 handler PostNOC 为reject" },
        { id: "post_object_router_0093", name: "#post_object-Router target 为跨zone device2 设置device2 handler PreNOC 为reject" },
        { id: "post_object_router_0092", name: "#post_object-Router target 为跨zone device2 设置device2 handler PostRouter 为reject" },
        { id: "post_object_router_0091", name: "#post_object-Router target 为跨zone device2 设置device2 handler PreRouter 为reject" },
        { id: "post_object_router_0090", name: "#post_object-Router target 为跨zone device2 设置device2 ACL in 为reject" },
        { id: "post_object_router_0089", name: "#post_object-Router target 为跨zone device2 设置ood2 ACL OUT 为reject" },
        { id: "post_object_router_0088", name: "#post_object-Router target 为跨zone device2 设置ood2 handler PostForward 为reject" },
        { id: "post_object_router_0087", name: "#post_object-Router target 为跨zone device2 设置ood2 handler PreForward 为reject" },
        { id: "post_object_router_0086", name: "#post_object-Router target 为跨zone device2 设置ood2 handler PostNOC 为reject" },
        { id: "post_object_router_0085", name: "#post_object-Router target 为跨zone device2 设置ood2 handler PreNOC 为reject" },
        { id: "post_object_router_0084", name: "#post_object-Router target 为跨zone device2 设置ood2 handler PostRouter 为reject" },
        { id: "post_object_router_0083", name: "#post_object-Router target 为跨zone device2 设置ood2 handler PreRouter 为reject" },
        { id: "post_object_router_0082", name: "#post_object-Router target 为跨zone device2 设置ood2 ACL-in 为reject" },
        { id: "post_object_router_0081", name: "#post_object-Router target 为跨zone device2 设置ood1 ACL-out 为reject" },
        { id: "post_object_router_0080", name: "#post_object-Router target 为跨zone device2 设置ood1 ACL-in 为reject" },
        { id: "post_object_router_0079", name: "#post_object-Router target 为跨zone device2 设置ood1 PostForward 为reject" },
        { id: "post_object_router_0078", name: "#post_object-Router target 为跨zone device2 设置ood1 PreForward 为reject" },
        { id: "post_object_router_0077", name: "#post_object-Router target 为跨zone device2 设置ood1 PostNOC 为reject" },
        { id: "post_object_router_0076", name: "#post_object-Router target 为跨zone device2 设置ood1 PreNOC 为reject" },
        { id: "post_object_router_0075", name: "#post_object-Router target 为跨zone device2 设置ood1 PostRouter 为reject" },
        { id: "post_object_router_0074", name: "#post_object-Router target 为跨zone device2 设置ood1 PreRouter 为reject" },
        { id: "post_object_router_0073", name: "#post_object-Router target 为跨zone device2 设置device1 ACL-out 为 reject" },
        { id: "post_object_router_0072", name: "#post_object-Router target 为跨zone device2 设置device1 PostForward 为 reject" },
        { id: "post_object_router_0071", name: "#post_object-Router target 为跨zone device2 设置device1 PreForward 为 reject" },
        { id: "post_object_router_0070", name: "#post_object-Router target 为跨zone device2 设置device1 PostNOC为 reject" },
        { id: "post_object_router_0069", name: "#post_object-Router target 为跨zone device2 设置device1 PreNOC为 reject" },
        { id: "post_object_router_0068", name: "#post_object-Router target 为跨zone device2 设置device1 PostRouter为 reject" },
        { id: "post_object_router_0067", name: "#post_object-Router target 为跨zone device2 设置device1 PreRouter为 reject" },
        { id: "post_object_router_0066", name: "#post_object-Router target 为跨zone device2 设置handler-ACL 全部为default" },
        { id: "post_object_router_0065", name: "#post_object-Router target 为跨zone device2 未设置handler-ACL" },
        { id: "post_object_router_0064", name: "#post_object-Router target 为跨zone ood 设置 ood2 handler PostNOC 为reject" },
        { id: "post_object_router_0063", name: "#post_object-Router target 为跨zone ood 设置ood2 handler PreNOC 为reject" },
        { id: "post_object_router_0062", name: "#post_object-Router target 为跨zone ood 设置ood2 handler PostRouter 为reject" },
        { id: "post_object_router_0061", name: "#post_object-Router target 为跨zone ood 设置ood2 handler PreRouter 为reject" },
        { id: "post_object_router_0060", name: "#post_object-Router target 为跨zone ood 设置ood2 ACL-in 为reject" },
        { id: "post_object_router_0059", name: "#post_object-Router target 为跨zone ood 设置ood1 ACL-out 为reject" },
        { id: "post_object_router_0058", name: "#post_object-Router target 为跨zone ood 设置ood1 ACL-in 为reject" },
        { id: "post_object_router_0057", name: "#post_object-Router target 为跨zone ood 设置ood1 PostForward 为reject" },
        { id: "post_object_router_0056", name: "#post_object-Router target 为跨zone ood 设置ood1 PreForward 为reject" },
        { id: "post_object_router_0055", name: "#post_object-Router target 为跨zone ood 设置ood1 PostNOC 为reject" },
        { id: "post_object_router_0054", name: "#post_object-Router target 为跨zone ood 设置ood1 PreNOC 为reject" },
        { id: "post_object_router_0053", name: "#post_object-Router target 为跨zone ood 设置ood1 PostRouter 为reject" },
        { id: "post_object_router_0052", name: "#post_object-Router target 为跨zone ood 设置ood1 PreRouter 为reject" },
        { id: "post_object_router_0051", name: "#post_object-Router target 为跨zone ood 设置device1 ACL-out 为 reject" },
        { id: "post_object_router_0050", name: "#post_object-Router target 为跨zone ood 设置device1 PostForward 为 reject" },
        { id: "post_object_router_0049", name: "#post_object-Router target 为跨zone ood 设置device1 PreForward 为 reject" },
        { id: "post_object_router_0048", name: "#post_object-Router target 为跨zone ood 设置device1 PostNOC为 reject" },
        { id: "post_object_router_0047", name: "#post_object-Router target 为跨zone ood 设置device1 PreNOC为 reject" },
        { id: "post_object_router_0046", name: "#post_object-Router target 为跨zone ood 设置device1 PostRouter为 reject" },
        { id: "post_object_router_0045", name: "#post_object-Router target 为跨zone ood 设置device1 PreRouter为 reject" },
        { id: "post_object_router_0044", name: "#post_object-Router target 为跨zone ood 设置handler-ACL 全部为default" },
        { id: "post_object_router_0043", name: "#post_object-Router target 为跨zone ood 未设置handler-ACL" },
        { id: "post_object_router_0042", name: "#post_object-Router target 为同zone device2 设置device2 handler PostNOC 为reject" },
        { id: "post_object_router_0041", name: "#post_object-Router target 为同zone device2 设置device2 handler PreNOC 为reject" },
        { id: "post_object_router_0040", name: "#post_object-Router target 为同zone device2 设置device2 handler PostRouter 为reject" },
        { id: "post_object_router_0039", name: "#post_object-Router target 为同zone device2 设置device2 handler PreRouter 为reject" },
        { id: "post_object_router_0038", name: "#post_object-Router target 为同zone device2 设置device2 ACL-in 为reject" },
        { id: "post_object_router_0037", name: "#post_object-Router target 为同zone device2 设置ood1 ACL-out 为reject" },
        { id: "post_object_router_0036", name: "#post_object-Router target 为同zone device2 设置ood1 ACL-in 为reject" },
        { id: "post_object_router_0035", name: "#post_object-Router target 为同zone device2 设置ood1 PostForward 为reject" },
        { id: "post_object_router_0034", name: "#post_object-Router target 为同zone device2 设置ood1 PreForward 为reject" },
        { id: "post_object_router_0033", name: "#post_object-Router target 为同zone device2 设置ood1 PostNOC 为reject" },
        { id: "post_object_router_0032", name: "#post_object-Router target 为同zone device2 设置ood1 PreNOC 为reject" },
        { id: "post_object_router_0031", name: "#post_object-Router target 为同zone device2 设置ood1 PostRouter 为reject" },
        { id: "post_object_router_0030", name: "#post_object-Router target 为同zone device2 设置ood1 PreRouter 为reject" },
        { id: "post_object_router_0029", name: "#post_object-Router target 为同zone device2 设置device1 ACL-out 为 reject" },
        { id: "post_object_router_0028_a", name: "#post_object-Router target 为同zone device2 设置device1 PostForward 为 reject" },
        { id: "post_object_router_0028", name: "#post_object-Router target 为同zone device2 设置device1 PreForward 为 reject" },
        { id: "post_object_router_0027", name: "#post_object-Router target 为同zone device2 设置device1 PostNOC为 reject" },
        { id: "post_object_router_0026", name: "#post_object-Router target 为同zone device2 设置device1 PreNOC为 reject" },
        { id: "post_object_router_0025", name: "#post_object-Router target 为同zone device2 设置device1 PostRouter为 reject" },
        { id: "post_object_router_0024", name: "#post_object-Router target 为同zone device2 设置device1 PreRouter为 reject" },
        { id: "post_object_router_0023", name: "#post_object-Router target 为同zone device2 设置handler-ACL 全部为default" },
        { id: "post_object_router_0022", name: "#post_object-Router target 为同zone device2 未设置handler-ACL" },
        { id: "post_object_router_0021", name: "#post_object-Router target 为同zone OOD  OOD1 设置 PostNOC reject" },
        { id: "post_object_router_0020", name: "#post_object-Router target 为同zone OOD  OOD1 设置 PreNOC reject" },
        { id: "post_object_router_0019", name: "#post_object-Router target 为同zone OOD  OOD1 设置 PostRouter reject" },
        { id: "post_object_router_0018", name: "#post_object-Router target 为同zone OOD  OOD1 设置 PreRouter reject" },
        { id: "post_object_router_0017", name: "#post_object-Router target 为同zone OOD  OOD1 设置 ACL-IN reject" },
        { id: "post_object_router_0016", name: "#post_object-Router target 为同zone OOD  source设备 设置 PostForward reject" },
        { id: "post_object_router_0015", name: "#post_object-Router target 为同zone OOD  source设备 设置 PreForward reject" },
        { id: "post_object_router_0014", name: "#post_object-Router target 为同zone OOD  source设备 设置 PostNOC reject" },
        { id: "post_object_router_0013", name: "#post_object-Router target 为同zone OOD  source设备 设置 PreNOC reject" },
        { id: "post_object_router_0012", name: "#post_object-Router target 为同zone OOD  source设备 设置 PostRouter reject" },
        { id: "post_object_router_0011", name: "#post_object-Router target 为同zone OOD  source设备 设置 PreRouter reject" },
        { id: "post_object_router_0010", name: "#post_object-Router target 为同zone OOD  source设备 设置 OUT ACL reject" },
        { id: "post_object_router_0009", name: "#post_object-Router target 为同zone OOD  设置handler-ACL 为default" },
        { id: "post_object_router_0008", name: "#post_object-Router target 为同zone OOD  未设置handler-ACL" },
        { id: "post_object_router_0007", name: "#post_object-Router target 为本地设备  设置handler PostRouter reject" },
        { id: "post_object_router_0006", name: "#post_object-Router target 为本地设备  设置handler PostRouter reject" },
        { id: "post_object_router_0005", name: "#post_object-Router target 为本地设备  设置handler PostNOC reject" },
        { id: "post_object_router_0004", name: "#post_object-Router target 为本地设备  设置handler PreNOC reject" },
        { id: "post_object_router_0003", name: "#post_object-Router target 为本地设备  设置handler PreRouter reject" },
        { id: "post_object_router_0002", name: "#post_object-Router target 为本地设备  设置handler-ACL为默认" },
        { id: "post_object_router_0001", name: "#post_object-Router target 为本地设备  未设置handler-ACL" },
    ],
    stack_type: StackType.Sim
}