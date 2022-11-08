import assert = require('assert'); 
import {cyfs} from '../../cyfs_node';
import * as myHandler from '../../common/utils/handler'
import {simulator} from '../../config/zoneData'
import {ZoneSimulator} from '../../common/utils/simulator'
import {AclManager,} from '../../common/utils/acl_manager'
import {Test} from './dec_object_Test'
import { sleep } from '../../cyfs_node';
import {addFriend,deleteFriend} from './relation'
const aclManager =  new AclManager();
let handlerManager = new myHandler.handlerManager(); //用来回收handler 和监听校验handler触发
let Simulator = ZoneSimulator



export const ACLTestCaseList = [
    //NON - ACL 规则测试
    { id :"NON_ACL_testcase_0001" ,opt:"put-object",testcaseName:"【ACL】设置默认ACL规则",source:"acceptAll.toml",target:"acceptAll.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0002" ,opt:"put-object",testcaseName:"【ACL/access】access 参数设置为accept",source:"acceptAll.toml",target:"acceptAll.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0003" ,opt:"put-object",testcaseName:"【ACL/access】access 参数设置为reject",source:"NON_ACL_testcase_0003.toml",target:"acceptAll.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0004" ,opt:"put-object",testcaseName:"【ACL/access】access 参数设置为drop",source:"NON_ACL_testcase_0004.toml",target:"acceptAll.toml",expect:{err: true,code:31}},
    { id :"NON_ACL_testcase_0005" ,opt:"put-object",testcaseName:"【ACL/access】access 参数设置为pass , 第二个符合规则ACL为Accept",source:"NON_ACL_testcase_0005.toml",target:"acceptAll.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0006" ,opt:"put-object",testcaseName:"【ACL/action】direction-operation 参数 out-put-object 设置为 accept",source:"NON_ACL_testcase_0006.toml",target:"acceptAll.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0007" ,opt:"put-object",testcaseName:"【ACL/action】direction-operation 参数 out-put-object 设置为 reject",source:"NON_ACL_testcase_0007.toml",target:"acceptAll.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0008" ,opt:"put-object",testcaseName:"【ACL/action】direction-operation 参数 in-put-object 设置为 accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0008.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0009" ,opt:"put-object",testcaseName:"【ACL/action】direction-operation 参数 in-put-object 设置为 reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0009.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0010" ,opt:"get-object",testcaseName:"【ACL/action】direction-operation 参数 out-get-object 设置为 accept",source:"NON_ACL_testcase_0010.toml",target:"acceptAll.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0011" ,opt:"get-object",testcaseName:"【ACL/action】direction-operation 参数 out-get-object 设置为 reject",source:"NON_ACL_testcase_0011.toml",target:"acceptAll.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0012" ,opt:"get-object",testcaseName:"【ACL/action】direction-operation 参数 in-get-object 设置为 accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0012.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0013" ,opt:"get-object",testcaseName:"【ACL/action】direction-operation 参数 in-get-object 设置为 reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0013.toml",expect:{err: true,code:30}},
    // select 只支持zone 内操作，没有触发ACL
    { id :"NON_ACL_testcase_0014" ,opt:"select-object",testcaseName:"【ACL/action】direction-operation 参数 out-select-object 设置为 accept",source:"NON_ACL_testcase_0014.toml",target:"acceptAll.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0015" ,opt:"select-object",testcaseName:"【ACL/action】direction-operation 参数 out-select-object 设置为 reject",source:"NON_ACL_testcase_0015.toml",target:"acceptAll.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0016" ,opt:"select-object",testcaseName:"【ACL/action】direction-operation 参数 in-select-object 设置为 accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0016.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0017" ,opt:"select-object",testcaseName:"【ACL/action】direction-operation 参数 in-select-object 设置为 reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0017.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0018" ,opt:"delete-object",testcaseName:"【ACL/action】direction-operation 参数 out-delete-object 设置为 accept",source:"NON_ACL_testcase_0018.toml",target:"acceptAll.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0019" ,opt:"delete-object",testcaseName:"【ACL/action】direction-operation 参数 out-delete-object 设置为 reject",source:"NON_ACL_testcase_0019.toml",target:"acceptAll.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0020" ,opt:"delete-object",testcaseName:"【ACL/action】direction-operation 参数 in-delete-object 设置为 accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0020.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0021" ,opt:"delete-object",testcaseName:"【ACL/action】direction-operation 参数 in-delete-object 设置为 reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0021.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0022" ,opt:"post-object",testcaseName:"【ACL/action】direction-operation 参数 out-post-object 设置为 accept",source:"NON_ACL_testcase_0022.toml",target:"acceptAll.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0023" ,opt:"post-object",testcaseName:"【ACL/action】direction-operation 参数 out-post-object 设置为 reject",source:"NON_ACL_testcase_0023.toml",target:"acceptAll.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0024" ,opt:"post-object",testcaseName:"【ACL/action】direction-operation 参数 in-post-object 设置为 accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0024.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0025" ,opt:"post-object",testcaseName:"【ACL/action】direction-operation 参数 in-post-object 设置为 reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0025.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0026" ,opt:"put-object",testcaseName:"【ACL/action】direction-operation 参数 out-put设置为 accept",source:"NON_ACL_testcase_0026.toml",target:"acceptAll.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0027" ,opt:"put-object",testcaseName:"【ACL/action】direction-operation 参数 out-put设置为 reject",source:"NON_ACL_testcase_0027.toml",target:"acceptAll.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0028" ,opt:"put-object",testcaseName:"【ACL/action】direction-operation 参数 in-put设置为 accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0028.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0029" ,opt:"put-object",testcaseName:"【ACL/action】direction-operation 参数 in-put设置为 reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0029.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0030" ,opt:"get-object",testcaseName:"【ACL/action】direction-operation 参数 out-get设置为 accept",source:"NON_ACL_testcase_0030.toml",target:"acceptAll.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0031" ,opt:"get-object",testcaseName:"【ACL/action】direction-operation 参数 out-get设置为 reject",source:"NON_ACL_testcase_0031.toml",target:"acceptAll.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0032" ,opt:"get-object",testcaseName:"【ACL/action】direction-operation 参数 in-get设置为 accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0032.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0033" ,opt:"get-object",testcaseName:"【ACL/action】direction-operation 参数 in-get设置为 reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0033.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0034" ,opt:"delete-object",testcaseName:"【ACL/action】direction-operation 参数 out-delete accept",source:"NON_ACL_testcase_0034.toml",target:"acceptAll.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0035" ,opt:"delete-object",testcaseName:"【ACL/action】direction-operation 参数 out-delete reject",source:"NON_ACL_testcase_0035.toml",target:"acceptAll.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0036" ,opt:"delete-object",testcaseName:"【ACL/action】direction-operation 参数 in-delete accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0036.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0037" ,opt:"delete-object",testcaseName:"【ACL/action】direction-operation 参数 in-delete reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0037.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0038" ,opt:"put-object",testcaseName:"【ACL/res 资源路径】路径树 出栈 target_device_id 参数正则匹配 设置accept",source:"NON_ACL_testcase_0038.toml",target:"acceptAll.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0039" ,opt:"put-object",testcaseName:"【ACL/res 资源路径】路径树 出栈 target_device_id 参数正则匹配 设置reject",source:"NON_ACL_testcase_0039.toml",target:"acceptAll.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0040" ,opt:"put-object",testcaseName:"【ACL/res 资源路径】路径树 出栈 dec_id 参数正则匹配 设置accept",source:"NON_ACL_testcase_0040.toml",target:"acceptAll.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0041" ,opt:"put-object",testcaseName:"【ACL/res 资源路径】路径树 出栈 dec_id 参数正则匹配 设置reject",source:"NON_ACL_testcase_0041.toml",target:"acceptAll.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0042" ,opt:"put-object",testcaseName:"【ACL/res 资源路径】路径树 出栈 req_path 参数正则匹配 设置accept",source:"NON_ACL_testcase_0042.toml",target:"acceptAll.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0043" ,opt:"put-object",testcaseName:"【ACL/res 资源路径】路径树 出栈 req_path 参数正则匹配 设置reject",source:"NON_ACL_testcase_0043.toml",target:"acceptAll.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0044" ,opt:"put-object",testcaseName:"【ACL/res 资源路径】路径树 出栈 object_id 参数正则匹配 设置accept",source:"NON_ACL_testcase_0044.toml",target:"acceptAll.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0045" ,opt:"put-object",testcaseName:"【ACL/res 资源路径】路径树 出栈 object_id 参数正则匹配 设置reject",source:"NON_ACL_testcase_0045.toml",target:"acceptAll.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0048" ,opt:"put-object",testcaseName:"【ACL/res 资源路径】路径树 入栈 dec_id 参数正则匹配 设置accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0048.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0049" ,opt:"put-object",testcaseName:"【ACL/res 资源路径】路径树 入栈 dec_id 参数正则匹配 设置reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0049.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0050" ,opt:"put-object",testcaseName:"【ACL/res 资源路径】路径树 入栈 req_path 参数正则匹配 设置accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0050.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0051" ,opt:"put-object",testcaseName:"【ACL/res 资源路径】路径树 入栈 req_path 参数正则匹配 设置reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0051.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0052" ,opt:"put-object",testcaseName:"【ACL/res 资源路径】路径树 入栈 object_id 参数正则匹配 设置accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0052.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0053" ,opt:"put-object",testcaseName:"【ACL/res 资源路径】路径树 入栈 object_id 参数正则匹配 设置reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0053.toml",expect:{err: true,code:30}},
    
    { id :"NON_ACL_testcase_0054" ,opt:"put-object-standard",testcaseName:"【ACL/res 资源路径】类型树 standard类型对象匹配 设置accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0054.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0055" ,opt:"put-object-standard",testcaseName:"【ACL/res 资源路径】类型树 standard类型对象匹配 设置reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0055.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0056" ,opt:"put-object",testcaseName:"【ACL/res 资源路径】类型树 core类型对象匹配 设置accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0056.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0057" ,opt:"put-object",testcaseName:"【ACL/res 资源路径】类型树 core类型对象匹配 设置reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0057.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0058" ,opt:"put-object-dec_app",testcaseName:"【ACL/res 资源路径】类型树 dec_app类型对象匹配 设置accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0058.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0059" ,opt:"put-object-dec_app",testcaseName:"【ACL/res 资源路径】类型树 dec_app类型对象匹配 设置reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0059.toml",expect:{err: true,code:30}},
    
    
    { id :"NON_ACL_testcase_0060" ,opt:"put-object-zone",testcaseName:"【ACL/group 分组】 location 请求的来源 inner 设置accept 在同zone 内进行操作",source:"acceptAll.toml",target:"NON_ACL_testcase_0060.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0061" ,opt:"put-object",testcaseName:"【ACL/group 分组】 location 请求的来源 inner 设置accept 跨zone进行操作",source:"acceptAll.toml",target:"NON_ACL_testcase_0060.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0062" ,opt:"put-object-zone",testcaseName:"【ACL/group 分组】 location 请求的来源 inner 设置reject 在同zone 内进行操作",source:"acceptAll.toml",target:"NON_ACL_testcase_0062.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0063" ,opt:"put-object",testcaseName:"【ACL/group 分组】 location 请求的来源 outer  设置accept 跨zone进行操作",source:"acceptAll.toml",target:"NON_ACL_testcase_0063.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0064" ,opt:"put-object-zone",testcaseName:"【ACL/group 分组】 location 请求的来源 outer  设置accept 同zone进行操作",source:"acceptAll.toml",target:"NON_ACL_testcase_0063.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0065" ,opt:"put-object",testcaseName:"【ACL/group 分组】 location 请求的来源 outer  设置reject 跨zone进行操作",source:"acceptAll.toml",target:"NON_ACL_testcase_0065.toml",expect:{err: true,code:30}},
    // 目前只有http-bdt - sync 可以实际场景使用，其他配置为预留设计  sync 代码判断逻辑比较复杂需要单独测试
    { id :"NON_ACL_testcase_0066" ,opt:"put-object",testcaseName:"【ACL/group 分组】protocol http-bdt 设置accept  ",source:"acceptAll.toml",target:"NON_ACL_testcase_0066.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0067" ,opt:"put-object",testcaseName:"【ACL/group 分组】protocol http-bdt 设置reject ",source:"acceptAll.toml",target:"NON_ACL_testcase_0067.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0068" ,opt:"put-object",testcaseName:"【ACL/group 分组】dec dec_id 严格匹配 设置accept  ",source:"acceptAll.toml",target:"NON_ACL_testcase_0068.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0069" ,opt:"put-object",testcaseName:"【ACL/group 分组】dec dec_id 严格匹配 设置reject ",source:"acceptAll.toml",target:"NON_ACL_testcase_0069.toml",expect:{err: true,code:30}},
    
    // my-device-device : 目标设备为本地设备 不走ACL流程 
    { id :"NON_ACL_testcase_0070" ,opt:"put-object-local",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 my-device-device 不触发ACL，设置reject 可操作成功  ",source:"NON_ACL_testcase_0070.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0071" ,opt:"put-object-local",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 my-device-device 不触发ACL，设置accept 可操作成功  ",source:"NON_ACL_testcase_0071.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0072" ,opt:"put-object-local",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 my-device-device 不触发ACL，设置reject 可操作成功  ",source:"NON_ACL_testcase_0072.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0073" ,opt:"put-object-local",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 my-device-device 不触发ACL，设置accept 可操作成功  ",source:"NON_ACL_testcase_0073.toml",expect:{err: false}},

    //my-device-object : my-zone-object object 的owner 是people 不会是device
    { id :"NON_ACL_testcase_0074" ,opt:"put-object",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 my-device-object 不触发ACL，设置reject 可操作成功  ",source:"NON_ACL_testcase_0074.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0075" ,opt:"put-object",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 my-device-object 不触发ACL，设置accept 可操作成功  ",source:"NON_ACL_testcase_0075.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0076" ,opt:"put-object",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 my-device-object 不触发ACL，设置reject 可操作成功  ",source:"NON_ACL_testcase_0076.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0077" ,opt:"put-object",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 my-device-object 不触发ACL，设置accept 可操作成功  ",source:"NON_ACL_testcase_0077.toml",expect:{err: true,code:30}},

    //my-ood-device : 操作的设备 属于ood，触发ACL
    { id :"NON_ACL_testcase_0078" ,opt:"put-object-zone",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 my-ood-device 设置reject",source:"NON_ACL_testcase_0078.toml",target:"acceptAll.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0079" ,opt:"put-object-zone",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 my-ood-device 设置accept",source:"NON_ACL_testcase_0079.toml",target:"acceptAll.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0080" ,opt:"put-object-zone2",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 my-ood-device 设置reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0080.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0081" ,opt:"put-object-zone2",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 my-ood-device 设置accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0081.toml",expect:{err: false}},

    //my-ood-object : 操作的object 属于ood，触发ACL
    { id :"NON_ACL_testcase_0082" ,opt:"put-object-zone",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 my-ood-object 设置reject",source:"NON_ACL_testcase_0082.toml",target:"acceptAll.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0083" ,opt:"put-object-zone",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 my-ood-object 设置accept",source:"NON_ACL_testcase_0083.toml",target:"acceptAll.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0084" ,opt:"put-object-zone2",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 my-ood-object 设置reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0084.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0085" ,opt:"put-object-zone2",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 my-ood-object 设置accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0085.toml",expect:{err: false}},

    //my-zone-device : 操作的设备 属于ood，触发ACL
    { id :"NON_ACL_testcase_0086" ,opt:"put-object-zone",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 my-zone-device 设置reject",source:"NON_ACL_testcase_0086.toml",target:"acceptAll.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0087" ,opt:"put-object-zone",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 my-zone-device 设置accept",source:"NON_ACL_testcase_0087.toml",target:"acceptAll.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0088" ,opt:"put-object-zone2",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 my-zone-device 设置reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0088.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0089" ,opt:"put-object-zone2",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 my-zone-device 设置accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0089.toml",expect:{err: false}},

    //my-zone-object : 操作的object 属于ood，触发ACL
    { id :"NON_ACL_testcase_0090" ,opt:"put-object-zone",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 my-zone-object 设置reject",source:"NON_ACL_testcase_0090.toml",target:"acceptAll.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0091" ,opt:"put-object-zone",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 my-zone-object 设置accept",source:"NON_ACL_testcase_0091.toml",target:"acceptAll.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0092" ,opt:"put-object-zone2",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 my-zone-object 设置reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0092.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0093" ,opt:"put-object-zone2",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 my-zone-object 设置accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0093.toml",expect:{err: false}},

    //my-friend-device : 操作的设备 属于ood，触发ACL
    { id :"NON_ACL_testcase_0094" ,opt:"put-object",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 my-friend-device 设置reject",source:"NON_ACL_testcase_0094.toml",target:"acceptAll.toml",expect:{err: true,code:30},relation:[{stack1:simulator.zone1.ood.name,stack2:simulator.zone2.ood.name,isFriend:true}]},
    { id :"NON_ACL_testcase_0095" ,opt:"put-object",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 my-friend-device 设置accept",source:"NON_ACL_testcase_0095.toml",target:"acceptAll.toml",expect:{err: false},relation:[{stack1:simulator.zone1.ood.name,stack2:simulator.zone2.ood.name,isFriend:true}]},
    { id :"NON_ACL_testcase_0096" ,opt:"put-object",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 my-friend-device 设置reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0096.toml",expect:{err: true,code:30},relation:[{stack1:simulator.zone1.ood.name,stack2:simulator.zone2.ood.name,isFriend:true}]},
    { id :"NON_ACL_testcase_0097" ,opt:"put-object",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 my-friend-device 设置accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0097.toml",expect:{err: false},relation:[{stack1:simulator.zone1.ood.name,stack2:simulator.zone2.ood.name,isFriend:true}]},

    //my-friend-object : 操作的object 属于ood，触发ACL
    { id :"NON_ACL_testcase_0098" ,opt:"put-object",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 my-friend-object 设置reject",source:"NON_ACL_testcase_0098.toml",target:"acceptAll.toml",expect:{err: true,code:30},relation:[{stack1:simulator.zone1.ood.name,stack2:simulator.zone2.ood.name,isFriend:true}]},
    { id :"NON_ACL_testcase_0099" ,opt:"put-object",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 my-friend-object 设置accept",source:"NON_ACL_testcase_0099.toml",target:"acceptAll.toml",expect:{err: false},relation:[{stack1:simulator.zone1.ood.name,stack2:simulator.zone2.ood.name,isFriend:true}]},
    { id :"NON_ACL_testcase_0100" ,opt:"put-object",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 my-friend-object 设置reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0100.toml",expect:{err: true,code:30},relation:[{stack1:simulator.zone1.ood.name,stack2:simulator.zone2.ood.name,isFriend:true}]},
    { id :"NON_ACL_testcase_0101" ,opt:"put-object",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 my-friend-object 设置accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0101.toml",expect:{err: false},relation:[{stack1:simulator.zone1.ood.name,stack2:simulator.zone2.ood.name,isFriend:true}]},


    // source-device-device : 目标设备为本地设备 不走ACL流程 
    // { id :"NON_ACL_testcase_0102" ,opt:"put-object-local",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 source-device-device 不触发ACL，设置reject 可操作成功  ",source:"NON_ACL_testcase_0102.toml",expect:{err: false}},
    // { id :"NON_ACL_testcase_0103" ,opt:"put-object-local",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 source-device-device 不触发ACL，设置accept 可操作成功  ",source:"NON_ACL_testcase_0103.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0104" ,opt:"put-object-local",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 source-device-device 不触发ACL，设置reject 可操作成功  ",source:"NON_ACL_testcase_0104.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0105" ,opt:"put-object-local",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 source-device-device 不触发ACL，设置accept 可操作成功  ",source:"NON_ACL_testcase_0105.toml",expect:{err: false}},

    //source-device-object :  object 的owner 是people 不会是device
    // { id :"NON_ACL_testcase_0106" ,opt:"put-object",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 source-device-object 不触发ACL，object 的owner 是people 匹配失败",source:"NON_ACL_testcase_0106.toml",expect:{err: true,code:30}},
    // { id :"NON_ACL_testcase_0107" ,opt:"put-object",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 source-device-object 不触发ACL，object 的owner 是people 匹配失败",source:"NON_ACL_testcase_0107.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0108" ,opt:"put-object",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 source-device-object 不触发ACL，object 的owner 是people 匹配失败",source:"NON_ACL_testcase_0108.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0109" ,opt:"put-object",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 source-device-object 不触发ACL，object 的owner 是people 匹配失败",source:"NON_ACL_testcase_0109.toml",expect:{err: true,code:30}},

    //source-ood-device : 操作的设备 属于ood，触发ACL

    // { id :"NON_ACL_testcase_0110" ,opt:"put-object-zone",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 source-ood-device 设置reject",source:"NON_ACL_testcase_0110.toml",target:"acceptAll.toml",expect:{err: true,code:30}},
    // { id :"NON_ACL_testcase_0111" ,opt:"put-object-zone",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 source-ood-device 设置accept",source:"NON_ACL_testcase_0111.toml",target:"acceptAll.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0112" ,opt:"put-object-zone2",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 source-ood-device 设置reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0112.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0113" ,opt:"put-object-zone2",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 source-ood-device 设置accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0113.toml",expect:{err: false}},

    //source-ood-object : 操作的object 属于ood，触发ACL
    // { id :"NON_ACL_testcase_0114" ,opt:"put-object-zone",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 source-ood-object 设置reject",source:"NON_ACL_testcase_0114.toml",target:"acceptAll.toml",expect:{err: true,code:30}},
    // { id :"NON_ACL_testcase_0115" ,opt:"put-object-zone",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 source-ood-object 设置accept",source:"NON_ACL_testcase_0115.toml",target:"acceptAll.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0116" ,opt:"put-object-zone2",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 source-ood-object 设置reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0116.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0117" ,opt:"put-object-zone2",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 source-ood-object 设置accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0117.toml",expect:{err: false}},

    //source-zone-device : 操作的设备 属于ood，触发ACL
    // { id :"NON_ACL_testcase_0118" ,opt:"put-object-zone",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 source-zone-device 设置reject",source:"NON_ACL_testcase_0118.toml",target:"acceptAll.toml",expect:{err: true,code:30}},
    // { id :"NON_ACL_testcase_0119" ,opt:"put-object-zone",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 source-zone-device 设置accept",source:"NON_ACL_testcase_0119.toml",target:"acceptAll.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0120" ,opt:"put-object-zone2",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 source-zone-device 设置reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0120.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0121" ,opt:"put-object-zone2",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 source-zone-device 设置accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0121.toml",expect:{err: false}},

    //source-zone-object : 操作的object 属于ood，触发ACL
    // { id :"NON_ACL_testcase_0122" ,opt:"put-object-zone",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 source-zone-object 设置reject",source:"NON_ACL_testcase_0122.toml",target:"acceptAll.toml",expect:{err: true,code:30}},
    // { id :"NON_ACL_testcase_0123" ,opt:"put-object-zone",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 source-zone-object 设置accept",source:"NON_ACL_testcase_0123.toml",target:"acceptAll.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0124" ,opt:"put-object-zone",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 source-zone-object 设置reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0124.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0125" ,opt:"put-object-zone",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 source-zone-object 设置accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0125.toml",expect:{err: false}},

    //source-friend-device :
    // out 禁止配置 source-friend-device
    // { id :"NON_ACL_testcase_0126" ,opt:"put-object",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 source-friend-device 设置reject",source:"NON_ACL_testcase_0126.toml",target:"acceptAll.toml",expect:{err: true,code:30},relation:[{stack1:simulator.zone1.ood.name,stack2:simulator.zone2.ood.name,isFriend:true}]},
    // { id :"NON_ACL_testcase_0127" ,opt:"put-object",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 source-friend-device 设置accept",source:"NON_ACL_testcase_0127.toml",target:"acceptAll.toml",expect:{err: true,code:30},relation:[{stack1:simulator.zone1.ood.name,stack2:simulator.zone2.ood.name,isFriend:true}]},
    
    { id :"NON_ACL_testcase_0128" ,opt:"put-object",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 source-friend-device 设置reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0128.toml",expect:{err: true,code:30},relation:[{stack1:simulator.zone1.ood.name,stack2:simulator.zone2.ood.name,isFriend:true}]},
    { id :"NON_ACL_testcase_0129" ,opt:"put-object",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 source-friend-device 设置accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0129.toml",expect:{err: false},relation:[{stack1:simulator.zone1.ood.name,stack2:simulator.zone2.ood.name,isFriend:true}]},

    //source-friend-object : 自己是自己好友永为true 否则为false
    // { id :"NON_ACL_testcase_0130" ,opt:"put-object",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 source-friend-object 设置reject",source:"NON_ACL_testcase_0130.toml",target:"acceptAll.toml",expect:{err: false},relation:[{stack1:simulator.zone1.ood.name,stack2:simulator.zone2.ood.name,isFriend:true}]},
    // { id :"NON_ACL_testcase_0131" ,opt:"put-object",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 source-friend-object 设置accept",source:"NON_ACL_testcase_0131.toml",target:"acceptAll.toml",expect:{err: false},relation:[{stack1:simulator.zone1.ood.name,stack2:simulator.zone2.ood.name,isFriend:true}]},
    { id :"NON_ACL_testcase_0132" ,opt:"put-object",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 source-friend-object 设置reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0132.toml",expect:{err: true,code:30},relation:[{stack1:simulator.zone1.ood.name,stack2:simulator.zone2.ood.name,isFriend:true}]},
    { id :"NON_ACL_testcase_0133" ,opt:"put-object",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 source-friend-object 设置accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0133.toml",expect:{err: false},relation:[{stack1:simulator.zone1.ood.name,stack2:simulator.zone2.ood.name,isFriend:true}]},


    // target-device-device : 目标设备为本地设备 不走ACL流程
    
    { id :"NON_ACL_testcase_0134" ,opt:"put-object-local",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 target-device-device 不触发ACL，设置reject 可操作成功  ",source:"NON_ACL_testcase_0134.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0135" ,opt:"put-object-local",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 target-device-device 不触发ACL，设置accept 可操作成功  ",source:"NON_ACL_testcase_0135.toml",expect:{err: false}},
    // { id :"NON_ACL_testcase_0136" ,opt:"put-object-local",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 target-device-device 不触发ACL，设置reject 可操作成功  ",source:"NON_ACL_testcase_0136.toml",expect:{err: false}},
    // { id :"NON_ACL_testcase_0137" ,opt:"put-object-local",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 target-device-device 不触发ACL，设置accept 可操作成功  ",source:"NON_ACL_testcase_0137.toml",expect:{err: false}},

    //target-device-object : 操作的object 属于该本地设备 不走ACL流程
    { id :"NON_ACL_testcase_0138" ,opt:"put-object-local",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 target-device-object 不触发ACL，设置reject 可操作成功  ",source:"NON_ACL_testcase_0138.toml",expect:{err: false}},
    { id :"NON_ACL_testcase_0139" ,opt:"put-object-local",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 target-device-object 不触发ACL，设置accept 可操作成功  ",source:"NON_ACL_testcase_0139.toml",expect:{err: false}},
    // { id :"NON_ACL_testcase_0140" ,opt:"put-object-local",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 target-device-object 不触发ACL，设置reject 可操作成功  ",source:"NON_ACL_testcase_0140.toml",expect:{err: false}},
    // { id :"NON_ACL_testcase_0141" ,opt:"put-object-local",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 target-device-object 不触发ACL，设置accept 可操作成功  ",source:"NON_ACL_testcase_0141.toml",expect:{err: false}},

    //target-ood-device : 操作的设备 属于ood，触发ACL
    { id :"NON_ACL_testcase_0142" ,opt:"put-object-zone",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 target-ood-device 设置reject",source:"NON_ACL_testcase_0142.toml",target:"acceptAll.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0143" ,opt:"put-object-zone",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 target-ood-device 设置accept",source:"NON_ACL_testcase_0143.toml",target:"acceptAll.toml",expect:{err: false}},
    // { id :"NON_ACL_testcase_0144" ,opt:"put-object-zone2",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 target-ood-device 设置reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0144.toml",expect:{err: true,code:30}},
    // { id :"NON_ACL_testcase_0145" ,opt:"put-object-zone2",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 target-ood-device 设置accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0145.toml",expect:{err: false}},

    //target-ood-object : 操作的object 属于ood，触发ACL
    { id :"NON_ACL_testcase_0146" ,opt:"put-object-zone",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 target-ood-object 设置reject",source:"NON_ACL_testcase_0146.toml",target:"acceptAll.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0147" ,opt:"put-object-zone",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 target-ood-object 设置accept",source:"NON_ACL_testcase_0147.toml",target:"acceptAll.toml",expect:{err: false}},
    // { id :"NON_ACL_testcase_0148" ,opt:"put-object-zone2",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 target-ood-object 设置reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0148.toml",expect:{err: true,code:30}},
    // { id :"NON_ACL_testcase_0149" ,opt:"put-object-zone2",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 target-ood-object 设置accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0149.toml",expect:{err: false}},

    //target-zone-device : 操作的设备 属于ood，触发ACL
    { id :"NON_ACL_testcase_0150" ,opt:"put-object-zone",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 target-zone-device 设置reject",source:"NON_ACL_testcase_0150.toml",target:"acceptAll.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0151" ,opt:"put-object-zone",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 target-zone-device 设置accept",source:"NON_ACL_testcase_0151.toml",target:"acceptAll.toml",expect:{err: false}},
    // { id :"NON_ACL_testcase_0152" ,opt:"put-object-zone2",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 target-zone-device 设置reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0152.toml",expect:{err: true,code:30}},
    // { id :"NON_ACL_testcase_0153" ,opt:"put-object-zone2",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 target-zone-device 设置accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0153.toml",expect:{err: false}},

    //target-zone-object : 操作的object 属于ood，触发ACL
    { id :"NON_ACL_testcase_0154" ,opt:"put-object-zone",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 target-zone-object 设置reject",source:"NON_ACL_testcase_0154.toml",target:"acceptAll.toml",expect:{err: true,code:30}},
    { id :"NON_ACL_testcase_0155" ,opt:"put-object-zone",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 target-zone-object 设置accept",source:"NON_ACL_testcase_0155.toml",target:"acceptAll.toml",expect:{err: false}},
    //{ id :"NON_ACL_testcase_0156" ,opt:"put-object-zone2",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 target-zone-object 设置reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0156.toml",expect:{err: true,code:30}},
    //{ id :"NON_ACL_testcase_0157" ,opt:"put-object-zone2",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 target-zone-object 设置accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0157.toml",expect:{err: false}},

    //target-friend-device : 自己是自己好友永为true 否则为false
    // source 设备 没有target 设备 friend list 
    { id :"NON_ACL_testcase_0158" ,opt:"put-object",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 target-friend-device 设置reject",source:"NON_ACL_testcase_0158.toml",target:"acceptAll.toml",expect:{err: true,code:30},relation:[{stack1:simulator.zone1.ood.name,stack2:simulator.zone2.ood.name,isFriend:true}]},
    { id :"NON_ACL_testcase_0159" ,opt:"put-object",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 target-friend-device 设置accept",source:"NON_ACL_testcase_0159.toml",target:"acceptAll.toml",expect:{err: false},relation:[{stack1:simulator.zone1.ood.name,stack2:simulator.zone2.ood.name,isFriend:true}]},
    // { id :"NON_ACL_testcase_0160" ,opt:"put-object",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 target-friend-device 设置reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0160.toml",expect:{err: false},relation:[{stack1:simulator.zone1.ood.name,stack2:simulator.zone2.ood.name,isFriend:true}]},
    // { id :"NON_ACL_testcase_0161" ,opt:"put-object",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 target-friend-device 设置accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0161.toml",expect:{err: false},relation:[{stack1:simulator.zone1.ood.name,stack2:simulator.zone2.ood.name,isFriend:true}]},

    //target-friend-object : 自己是自己好友永为true 否则为false
    // source 设备 没有target 设备 friend list 
    { id :"NON_ACL_testcase_0162" ,opt:"put-object",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 target-friend-object 设置reject",source:"NON_ACL_testcase_0162.toml",target:"acceptAll.toml",expect:{err: true,code:30},relation:[{stack1:simulator.zone1.ood.name,stack2:simulator.zone2.ood.name,isFriend:true}]},
    { id :"NON_ACL_testcase_0163" ,opt:"put-object",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 target-friend-object 设置accept",source:"NON_ACL_testcase_0163.toml",target:"acceptAll.toml",expect:{err: false},relation:[{stack1:simulator.zone1.ood.name,stack2:simulator.zone2.ood.name,isFriend:true}]},
    // { id :"NON_ACL_testcase_0164" ,opt:"put-object",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 target-friend-object 设置reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0164.toml",expect:{err: false},relation:[{stack1:simulator.zone1.ood.name,stack2:simulator.zone2.ood.name,isFriend:true}]},
    // { id :"NON_ACL_testcase_0165" ,opt:"put-object",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 target-friend-object 设置accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0165.toml",expect:{err: false},relation:[{stack1:simulator.zone1.ood.name,stack2:simulator.zone2.ood.name,isFriend:true}]},


    //your-device-device
    { id :"NON_ACL_testcase_0166" ,opt:"put-object",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 your-device-device 设置reject",source:"NON_ACL_testcase_0166.toml",target:"acceptAll.toml",expect:{err: true,code:30},owner:"target"},
    { id :"NON_ACL_testcase_0167" ,opt:"put-object",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 your-device-device 设置accept",source:"NON_ACL_testcase_0167.toml",target:"acceptAll.toml",expect:{err: false},owner:"target"},
    { id :"NON_ACL_testcase_0168" ,opt:"put-object",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 your-device-device 设置reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0168.toml",expect:{err: true,code:30},owner:"source"},
    { id :"NON_ACL_testcase_0169" ,opt:"put-object",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 your-device-device 设置accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0169.toml",expect:{err: false},owner:"source"},

    //your-device-object
    // owner 会匹配失败
    { id :"NON_ACL_testcase_0170" ,opt:"put-object",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 your-device-object 设置reject",source:"NON_ACL_testcase_0170.toml",target:"acceptAll.toml",expect:{err: true,code:30},owner:"target"},
    { id :"NON_ACL_testcase_0171" ,opt:"put-object",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 your-device-object 设置accept",source:"NON_ACL_testcase_0171.toml",target:"acceptAll.toml",expect:{err: true,code:30},owner:"target"},
    { id :"NON_ACL_testcase_0172" ,opt:"put-object",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 your-device-object 设置reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0172.toml",expect:{err: true,code:30},owner:"source"},
    { id :"NON_ACL_testcase_0173" ,opt:"put-object",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 your-device-object 设置accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0173.toml",expect:{err: true,code:30},owner:"source"},

    //your-ood-device
    { id :"NON_ACL_testcase_0174" ,opt:"put-object",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 your-ood-device 设置reject",source:"NON_ACL_testcase_0174.toml",target:"acceptAll.toml",expect:{err: true,code:30},owner:"target"},
    { id :"NON_ACL_testcase_0175" ,opt:"put-object",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 your-ood-device 设置accept",source:"NON_ACL_testcase_0175.toml",target:"acceptAll.toml",expect:{err: false},owner:"target"},
    { id :"NON_ACL_testcase_0176" ,opt:"put-object",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 your-ood-device 设置reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0176.toml",expect:{err: true,code:30},owner:"source"},
    { id :"NON_ACL_testcase_0177" ,opt:"put-object",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 your-ood-device 设置accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0177.toml",expect:{err: false},owner:"source"},

    //your-ood-object
    { id :"NON_ACL_testcase_0178" ,opt:"put-object",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 your-ood-object 设置reject",source:"NON_ACL_testcase_0178.toml",target:"acceptAll.toml",expect:{err: true,code:30},owner:"target"},
    { id :"NON_ACL_testcase_0179" ,opt:"put-object",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 your-ood-object 设置accept",source:"NON_ACL_testcase_0179.toml",target:"acceptAll.toml",expect:{err: false},owner:"target"},
    { id :"NON_ACL_testcase_0180" ,opt:"put-object",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 your-ood-object 设置reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0180.toml",expect:{err: true,code:30},owner:"source"},
    { id :"NON_ACL_testcase_0181" ,opt:"put-object",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 your-ood-object 设置accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0181.toml",expect:{err: false},owner:"source"},

    //your-zone-device
    { id :"NON_ACL_testcase_0182" ,opt:"put-object",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 your-zone-device 设置reject",source:"NON_ACL_testcase_0182.toml",target:"acceptAll.toml",expect:{err: true,code:30},owner:"target"},
    { id :"NON_ACL_testcase_0183" ,opt:"put-object",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 your-zone-device 设置accept",source:"NON_ACL_testcase_0183.toml",target:"acceptAll.toml",expect:{err: false},owner:"target"},
    { id :"NON_ACL_testcase_0184" ,opt:"put-object",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 your-zone-device 设置reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0184.toml",expect:{err: true,code:30},owner:"source"},
    { id :"NON_ACL_testcase_0185" ,opt:"put-object",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 your-zone-device 设置accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0185.toml",expect:{err: false},owner:"source"},

    //your-zone-object
    { id :"NON_ACL_testcase_0186" ,opt:"put-object",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 your-zone-object 设置reject",source:"NON_ACL_testcase_0186.toml",target:"acceptAll.toml",expect:{err: true,code:30},owner:"target"},
    { id :"NON_ACL_testcase_0187" ,opt:"put-object",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 your-zone-object 设置accept",source:"NON_ACL_testcase_0187.toml",target:"acceptAll.toml",expect:{err: false},owner:"source"},
    { id :"NON_ACL_testcase_0188" ,opt:"put-object",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 your-zone-object 设置reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0188.toml",expect:{err: true,code:30},owner:"source"},
    { id :"NON_ACL_testcase_0189" ,opt:"put-object",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 your-zone-object 设置accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0189.toml",expect:{err: false},owner:"source"},

    //your-friend-device
    { id :"NON_ACL_testcase_0190" ,opt:"put-object",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 your-friend-device 设置reject",source:"NON_ACL_testcase_0190.toml",target:"acceptAll.toml",expect:{err: true,code:30},owner:"target",relation:[{stack1:simulator.zone1.ood.name,stack2:simulator.zone2.ood.name,isFriend:true}]},
    { id :"NON_ACL_testcase_0191" ,opt:"put-object",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 your-friend-device 设置accept",source:"NON_ACL_testcase_0191.toml",target:"acceptAll.toml",expect:{err: false},owner:"target",relation:[{stack1:simulator.zone1.ood.name,stack2:simulator.zone2.ood.name,isFriend:true}]},
    { id :"NON_ACL_testcase_0192" ,opt:"put-object",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 your-friend-device 设置reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0192.toml",expect:{err: true,code:30},owner:"source",relation:[{stack1:simulator.zone1.ood.name,stack2:simulator.zone2.ood.name,isFriend:true}]},
    { id :"NON_ACL_testcase_0193" ,opt:"put-object",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 your-friend-device 设置accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0193.toml",expect:{err: false},owner:"source",relation:[{stack1:simulator.zone1.ood.name,stack2:simulator.zone2.ood.name,isFriend:true}]},

    //your-friend-object
    { id :"NON_ACL_testcase_0194" ,opt:"put-object",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 your-friend-object 设置reject",source:"NON_ACL_testcase_0194.toml",target:"acceptAll.toml",expect:{err: true,code:30},owner:"target",relation:[{stack1:simulator.zone1.ood.name,stack2:simulator.zone2.ood.name,isFriend:true}]},
    { id :"NON_ACL_testcase_0195" ,opt:"put-object",testcaseName:"【ACL/relation 】 出栈目标设备 relation为 your-friend-object 设置accept",source:"NON_ACL_testcase_0195.toml",target:"acceptAll.toml",expect:{err: false},owner:"target",relation:[{stack1:simulator.zone1.ood.name,stack2:simulator.zone2.ood.name,isFriend:true}]},
    { id :"NON_ACL_testcase_0196" ,opt:"put-object",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 your-friend-object 设置reject",source:"acceptAll.toml",target:"NON_ACL_testcase_0196.toml",expect:{err: true,code:30},owner:"source",relation:[{stack1:simulator.zone1.ood.name,stack2:simulator.zone2.ood.name,isFriend:true}]},
    { id :"NON_ACL_testcase_0197" ,opt:"put-object",testcaseName:"【ACL/relation 】 入栈目标设备 relation为 your-friend-object 设置accept",source:"acceptAll.toml",target:"NON_ACL_testcase_0197.toml",expect:{err: false},owner:"source",relation:[{stack1:simulator.zone1.ood.name,stack2:simulator.zone2.ood.name,isFriend:true}]},

]



// export let testcaseList :Array<TestCaseInfo> = [
// ]
// for(let i in ACLTestCaseList){
//     if(ACLTestCaseList[i].opt == "put-object" || ACLTestCaseList[i].opt == "put-object-standard" || ACLTestCaseList[i].opt == "put-object-dec_app" ){
//         let owner;

//         if(ACLTestCaseList[i].owner == "target"){
//             owner = ZoneSimulator.zone2_ood.peerId
//         }else{
//             owner = ZoneSimulator.zone1_ood.peerId
//         }
//         testcaseList.push({
//             id : ACLTestCaseList[i].id,
//             testcaseName:ACLTestCaseList[i].testcaseName,
//             opt:{optType:ACLTestCaseList[i].opt,level: cyfs.NONAPILevel.Router,source:ZoneSimulator.zone1_ood,target:ZoneSimulator.zone2_ood,dec_id:"9tGpLNnGfMgXZ2xqmVmqFhh91PQXLkaXbccyw2nkdDMM"},
//             expect:ACLTestCaseList[i].expect,
//             relation : ACLTestCaseList[i].relation,
//             stackCfgList:[
//                 {      
//                     stack : ZoneSimulator.zone1_ood.stack,
//                     deviceName : ZoneSimulator.zone1_ood.name,
//                     handlerList : [    
//                     ],
//                     ACL : {
//                         configFile : ACLTestCaseList[i].source
//                     }
//                 },
//                 {      
//                     stack : ZoneSimulator.zone2_ood.stack,
//                     deviceName : ZoneSimulator.zone2_ood.name,
//                     handlerList : [
//                     ],
//                     ACL : {
//                         configFile : ACLTestCaseList[i].target
//                     }
//                 }
//             ]
//         })
//     }else if(ACLTestCaseList[i].opt == "put-object-zone"){
//         testcaseList.push({
//             id : ACLTestCaseList[i].id,
//             testcaseName:ACLTestCaseList[i].testcaseName,
//             opt:{optType:'put-object',level: cyfs.NONAPILevel.Router,source:ZoneSimulator.zone1_device1,target:ZoneSimulator.zone1_ood},
//             expect:ACLTestCaseList[i].expect,
//             stackCfgList:[
//                 {      
//                     stack : ZoneSimulator.zone1_device1_stack,
//                     deviceName : ZoneSimulator.zone1_device1_name,
//                     handlerList : [    
//                     ],
//                     ACL : {
//                         configFile : ACLTestCaseList[i].source
//                     }
//                 },
//                 {      
//                     stack : ZoneSimulator.zone1_ood.stack,
//                     deviceName : ZoneSimulator.zone1_ood.name,
//                     handlerList : [
//                     ],
//                     ACL : {
//                         configFile : ACLTestCaseList[i].target
//                     }
//                 }
//             ]
//         })
//     }else if(ACLTestCaseList[i].opt == "put-object-zone2"){
//         testcaseList.push({
//             id : ACLTestCaseList[i].id,
//             testcaseName:ACLTestCaseList[i].testcaseName,
//             opt:{optType:'put-object',level: cyfs.NONAPILevel.Router,source:ZoneSimulator.zone1_ood,target:ZoneSimulator.zone1_device1},
//             expect:ACLTestCaseList[i].expect,
//             stackCfgList:[
//                 {      
//                     stack : ZoneSimulator.zone1_ood.stack,
//                     deviceName : ZoneSimulator.zone1_ood.name,
//                     handlerList : [    
//                     ],
//                     ACL : {
//                         configFile : ACLTestCaseList[i].source
//                     }
//                 },
//                 {      
//                     stack : ZoneSimulator.zone1_device1_stack,
//                     deviceName : ZoneSimulator.zone1_device1_peerId,
//                     handlerList : [
//                     ],
//                     ACL : {
//                         configFile : ACLTestCaseList[i].target
//                     }
//                 }
//             ]
//         })
//     }else if(ACLTestCaseList[i].opt == "put-object-local"){
//         testcaseList.push({
//             id : ACLTestCaseList[i].id,
//             testcaseName:ACLTestCaseList[i].testcaseName,
//             opt:{optType:'put-object',level: cyfs.NONAPILevel.Router,source:ZoneSimulator.zone1_device1,target:ZoneSimulator.zone1_device1},
//             expect:ACLTestCaseList[i].expect,
//             stackCfgList:[
//                 {      
//                     stack : ZoneSimulator.zone1_device1_stack,
//                     deviceName : ZoneSimulator.zone1_device1_name,
//                     handlerList : [    
//                     ],
//                     ACL : {
//                         configFile : ACLTestCaseList[i].source
//                     }
//                 },
//             ]
//         })
//     }
//     else if (ACLTestCaseList[i].opt == "get-object"){
//         testcaseList.push({
//             id : ACLTestCaseList[i].id,
//             testcaseName:ACLTestCaseList[i].testcaseName,
//             opt:{optType:"get-object",level: cyfs.NONAPILevel.Router,source:ZoneSimulator.zone1_ood,target:ZoneSimulator.zone2_ood},
//             expect:ACLTestCaseList[i].expect,
//             stackCfgList:[
//                 {      
//                     stack : ZoneSimulator.zone1_ood.stack,
//                     deviceName : ZoneSimulator.zone1_ood.name,
//                     handlerList : [    
//                     ],
//                     ACL : {
//                         configFile : ACLTestCaseList[i].source
//                     }
//                 },
//                 {      
//                     stack : ZoneSimulator.zone2_ood.stack,
//                     deviceName : ZoneSimulator.zone2_ood.name,
//                     handlerList : [
//                     ],
//                     ACL : {
//                         configFile : ACLTestCaseList[i].target
//                     }
//                 }
//             ]
//         })
//     }else if (ACLTestCaseList[i].opt == "select-object"){
//         testcaseList.push({
//             id : ACLTestCaseList[i].id,
//             testcaseName:ACLTestCaseList[i].testcaseName,
//             opt:{optType:"select-object",level: cyfs.NONAPILevel.Router,source:ZoneSimulator.zone1_device1,target:ZoneSimulator.zone1_device2},
//             expect:ACLTestCaseList[i].expect,
//             stackCfgList:[
//                 {      
//                     stack : ZoneSimulator.zone1_device1_stack,
//                     deviceName : ZoneSimulator.zone1_device1_name,
//                     handlerList : [    
//                     ],
//                     ACL : {
//                         configFile : ACLTestCaseList[i].source
//                     }
//                 },
//                 {      
//                     stack : ZoneSimulator.zone1_device2.stack,
//                     deviceName : ZoneSimulator.zone1_device2.name,
//                     handlerList : [
//                     ],
//                     ACL : {
//                         configFile : ACLTestCaseList[i].target
//                     }
//                 }
//             ]
//         })
//     }else if (ACLTestCaseList[i].opt == "delete-object"){
//         testcaseList.push({
//             id : ACLTestCaseList[i].id,
//             testcaseName:ACLTestCaseList[i].testcaseName,
//             opt:{optType:"delete-object",level: cyfs.NONAPILevel.Router,source:ZoneSimulator.zone1_ood,target:ZoneSimulator.zone2_ood},
//             expect:ACLTestCaseList[i].expect,
//             stackCfgList:[
//                 {      
//                     stack : ZoneSimulator.zone1_ood.stack,
//                     deviceName : ZoneSimulator.zone1_ood.name,
//                     handlerList : [    
//                     ],
//                     ACL : {
//                         configFile : ACLTestCaseList[i].source
//                     }
//                 },
//                 {      
//                     stack : ZoneSimulator.zone2_ood.stack,
//                     deviceName : ZoneSimulator.zone2_ood.name,
//                     handlerList : [
//                     ],
//                     ACL : {
//                         configFile : ACLTestCaseList[i].target
//                     }
//                 }
//             ]
//         })
//     }else if (ACLTestCaseList[i].opt == "post-object"){
//         testcaseList.push({
//             id : ACLTestCaseList[i].id,
//             testcaseName:ACLTestCaseList[i].testcaseName,
//             opt:{optType:"post-object",level: cyfs.NONAPILevel.Router,source:ZoneSimulator.zone1_ood,target:ZoneSimulator.zone2_ood},
//             expect:ACLTestCaseList[i].expect,
//             stackCfgList:[
//                 {      
//                     stack : ZoneSimulator.zone1_ood.stack,
//                     deviceName : ZoneSimulator.zone1_ood.name,
//                     handlerList : [    
//                     ],
//                     ACL : {
//                         configFile : ACLTestCaseList[i].source
//                     }
//                 },
//                 {      
//                     stack : ZoneSimulator.zone2_ood.stack,
//                     deviceName : ZoneSimulator.zone2_ood.name,
//                     handlerList : [
//                     ],
//                     ACL : {
//                         configFile : ACLTestCaseList[i].target
//                     }
//                 }
//             ]
//         })
//     }
    
    
// }







// async function createTestObject(stack:cyfs.SharedCyfsStack,peerId:string) {
//     const saveobjectOwner = cyfs.ObjectId.from_base_58(peerId).unwrap()
//     const saveobject = cyfs.TextObject.create(cyfs.Some(saveobjectOwner), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
//     const saveObjectId = saveobject.desc().calculate_id();
//     console.info(`will put_object: id=${saveObjectId},object value = ${saveobject.value} `);
//     const object_raw = saveobject.to_vec().unwrap();
//     const req: cyfs.NONPutObjectOutputRequest = {
//         common: {
//             dec_id:saveobjectOwner,
//             flags: 0,
//             target: cyfs.ObjectId.from_base_58(Simulator.zone1_device1_peerId ).unwrap(),
//             level: cyfs.NONAPILevel.NOC //设置路由类型
//         },
//         object: new cyfs.NONObjectInfo(saveObjectId, object_raw)
//     };
//     const put_ret = await stack.non_service().put_object(req);
//     //校验结果
//     console.info('put_object result:', put_ret);
//     assert(!put_ret.err);
//     return {saveobject,saveObjectId,saveobjectOwner,object_raw}  
// }

// /**
//  * get object 检查object 的状态
//  */
// async function getTestObject(stack:cyfs.SharedCyfsStack,peerId:string,objectId:cyfs.ObjectId) {

//     const dec_id = cyfs.ObjectId.from_base_58(Simulator.zone1_device1_peerId).unwrap();
//     const req1: cyfs.NONGetObjectOutputRequest = {
//         object_id: objectId,
//         common: {
//             req_path: "/qa/put_object",
//             level: cyfs.NONAPILevel.NOC,
//             dec_id,
//             flags: 0,
//         }
//     };
//     const get_ret = await stack.non_service().get_object(req1);
//     console.info('get object result:', get_ret);
//     //校验结果
//     if(!get_ret.err){
//         const resp_get = get_ret.unwrap();
//         const [text, buf] = new cyfs.TextObjectDecoder().raw_decode(resp_get.object.object_raw).unwrap();
//         return {err:get_ret.err,text:text}
//     }else{
//         return {err:get_ret.err,log:get_ret.val}
//     }
// }


// async function initFriendRelation(relation?: Array<{stack1:string,stack2:string,isFriend:boolean}>) {
//     if(relation == undefined || relation.length == 0){
//         console.info(`不需要初始化friend 关系`)
//         return {err:false}
//     }else{
//         for(let i in relation){
            
           
//             if(relation[i].isFriend){
//                 console.info("开始添加好友流程：")
//                 //初始化ACL配置文件
//                 await handlerManager.clearAllHandler();
//                 await Simulator.removeAllConfig();
//                 await aclManager.getdevice(simulator.zone1.ood.name)!.initAcl({configFile:'acceptAll.toml'})
//                 await aclManager.getdevice(simulator.zone1.device1.name)!.initAcl({configFile:'acceptAll.toml'})
//                 await aclManager.getdevice(simulator.zone1.device2.name)!.initAcl({configFile:'acceptAll.toml'})
//                 await aclManager.getdevice(simulator.zone2.ood.name)!.initAcl({configFile:'acceptAll.toml'})
//                 await aclManager.getdevice(simulator.zone2.device1.name)!.initAcl({configFile:'acceptAll.toml'})
//                 await aclManager.getdevice(simulator.zone2.device2.name)!.initAcl({configFile:'acceptAll.toml'})

//                 //启动模拟器
//                 Simulator.startZoneSimulator();
//                 await sleep(10*1000)
//                 //连接模拟器初始化协议栈
//                 await connecStimulator()
//                 console.info(`## 添加好友的协议栈： ${relation[i].stack1} , ${relation[i].stack2}`)
//                 await addFriend(getStack(relation[i].stack1),getStack(relation[i].stack2))
//                 await handlerManager.clearAllHandler();
//                 await Simulator.removeAllConfig();
//                 //清除所有配置
//             }else{
//                 //启动模拟器
//                 Simulator.startZoneSimulator();
//                 await sleep(10*1000)
//                 //连接模拟器初始化协议栈
//                 await connecStimulator()
//                 await deleteFriend(getStack(relation[i].stack1),getStack(relation[i].stack2))
//             }
//             Simulator.stopZoneSimulator();
//             await sleep(10*1000);
//         }
//     }
    
    
// }





// /**
//  * 
//  * (1) protocol sync 
//  * (2) dec  system
//  */

// //执行器 执行所有

// describe('cyfs-sdk ACL 规则  功能测试',function(){
//    this.timeout(0);
//     for(let i in testcaseList){
//         if(testcaseList[i].opt.optType == "put-object"){
//             describe(`${testcaseList[i].id}--${testcaseList[i].testcaseName}`,async()=>{
//                 beforeEach(async function(){
//                     //初始化relation关系
//                     // if(testcaseList[i].relation){
//                     //     console.info(`relation:${JSON.stringify(testcaseList[i].relation)}`)
//                     //     await initFriendRelation(testcaseList[i].relation!)
//                     // }
//                     //测试前置条件，连接测试模拟器设备
//                     console.info(`##########用例执开始执行`)
//                     //初始化ACL配置文件
//                     await Simulator.removeAllConfig();
//                     for(let j in testcaseList[i].stackCfgList){
//                         await aclManager.getdevice(testcaseList[i].stackCfgList[j].deviceName)!.initAcl(testcaseList[i].stackCfgList[j].ACL)
//                     }
//                     //启动模拟器
//                     Simulator.startZoneSimulator();
//                     await sleep(10*1000)
//                     //连接模拟器初始化协议栈
//                     await connecStimulator()
                    
//                 })
//                 afterEach(async ()=>{
//                     //每个函数执行前，清除所有handler
//                     await handlerManager.clearAllHandler();
//                     await sleep(10*1000);
//                     await Simulator.stopZoneSimulator();
//                     await sleep(10*1000);
//                     //清除ACL配置文件
//                     await aclManager.removeAllAcl();
//                     console.info(`#########用例执行完成`);
//                 })
    
//                 it(`${testcaseList[i].testcaseName} 运行:`,async()=>{
//                     //(1) put object
//                     // 创建一个测试对象 
//                     //const owner_id = cyfs.ObjectId.from_base_58("5r6LxrnEmFKGwWAxtqFpJePyPpoY35bBSbsjXiDdR1HU").unwrap();
//                     let owner_id = cyfs.ObjectId.from_base_58(testcaseList[i].opt.source.peerId).unwrap();
//                     if(testcaseList[i].owner){
//                         owner_id = cyfs.ObjectId.from_base_58(testcaseList[i].owner!).unwrap();
//                     }
                    
//                     let  dec_id = cyfs.ObjectId.from_base_58(testcaseList[i].opt.source.peerId).unwrap();
//                     if(testcaseList[i].opt.dec_id){
//                         dec_id = cyfs.ObjectId.from_base_58(testcaseList[i].opt.dec_id!).unwrap();
//                     }else{
//                         const app = cyfs.DecApp.create(owner_id, 'test_put');
//                         dec_id = app.desc().calculate_id();
//                         console.log(`new app id: ${dec_id}`);
//                     }
//                     console.log(`app id: ${dec_id}`);
//                     const obj = cyfs.TextObject.create(cyfs.Some(owner_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
//                     const object_id = obj.desc().calculate_id();
//                     //(2) 添加测试handler 设置的 handler
//                     for(let j in testcaseList[i].stackCfgList){
//                         for(let m in testcaseList[i].stackCfgList[j].handlerList){
//                             console.info(`##### ${j} ${m}`)
//                             const ret = await handlerManager.addHandler(
//                                 testcaseList[i].stackCfgList[j].deviceName,
//                                 getStack(testcaseList[i].stackCfgList[j].stack),
//                                 testcaseList[i].stackCfgList[j].handlerList[m].type,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].chain,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].id ,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].index,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].filter,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].default_action,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].myHandler,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].routineType,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].runSum,
//                             )
//                             assert(!ret.err,`${testcaseList[i].stackCfgList[j].deviceName} 添加 ${testcaseList[i].stackCfgList[j].handlerList[m].id } 失败`)
//                         }
                        
//                     }
//                     //开始监听是否运行handler 
//                     let check =  handlerManager.startHandlerCheck(10*1000);
//                     console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
//                     const object_raw = obj.to_vec().unwrap();
//                     const req: cyfs.NONPutObjectOutputRequest = {
//                         common: {
//                             req_path: "/qa_test",
//                             dec_id,
//                             flags: 0,
//                             target: cyfs.ObjectId.from_base_58(testcaseList[i].opt.target.peerId).unwrap(),
//                             level: testcaseList[i].opt.level //设置路由类型
//                         },
//                         object: new cyfs.NONObjectInfo(object_id, object_raw)
//                     };
    
             
//                     const put_ret = await (getStack(testcaseList[i].opt.source.stack).non_service().put_object(req));
//                     //校验结果
//                     //cyfs.BuckyError
//                     console.info('put_object result:', put_ret);
//                     assert.equal(put_ret.err,testcaseList[i].expect.err);
//                     if(put_ret.err){
//                         assert.equal(put_ret.val.code,testcaseList[i].expect.code)
//                     }
                    
                    
//                     //assert.equal(put_ret.val,testcaseList[i].expect.err);
//                     //检查监听事件是否触发
//                     let handlerResult = await check
//                     console.info(`put_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
//                     assert(!handlerResult.err)
//                 })
//             })
//         }else if(testcaseList[i].opt.optType == "put-object-standard"){
//             describe(`${testcaseList[i].id}--${testcaseList[i].testcaseName}`,async()=>{
//                 beforeEach(async function(){
//                     //测试前置条件，连接测试模拟器设备
//                     console.info(`##########用例执开始执行`)
//                     //初始化ACL配置文件
//                     await Simulator.removeAllConfig();
//                     for(let j in testcaseList[i].stackCfgList){
//                         await aclManager.getdevice(testcaseList[i].stackCfgList[j].deviceName)!.initAcl(testcaseList[i].stackCfgList[j].ACL)
//                     }
//                     //启动模拟器
//                     Simulator.startZoneSimulator();
//                     await sleep(10*1000)
//                     //连接模拟器初始化协议栈
//                     await connecStimulator()
//                 })
//                 afterEach(async ()=>{
//                     //每个函数执行前，清除所有handler
//                     //await handlerManager.clearAllHandler();
//                     await sleep(10*1000);
//                     await Simulator.stopZoneSimulator();
//                     await sleep(10*1000);
//                     //清除ACL配置文件
//                     //await aclManager.removeAllAcl();
//                     console.info(`#########用例执行完成`);
//                 })
    
//                 it(`${testcaseList[i].testcaseName} 运行:`,async()=>{
//                     //(1) put object
//                     // 创建一个测试对象 
//                     const owner_id = cyfs.ObjectId.from_base_58(testcaseList[i].opt.source.peerId).unwrap();
//                     const dec_id = cyfs.ObjectId.from_base_58(testcaseList[i].opt.source.peerId).unwrap();
//                     //const obj = cyfs.TextObject.create(cyfs.Some(owner_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
//                     const obj = cyfs.Device.create(cyfs.Some(dec_id),cyfs.UniqueId.default(),[],[],[],cyfs.PrivateKey.generate_rsa(2048).unwrap().public(),new cyfs.Area(1, 2, 3, 4),cyfs.DeviceCategory.OOD)
//                     const object_id = obj.desc().calculate_id();
//                     //(2) 添加测试handler 设置的 handler
//                     for(let j in testcaseList[i].stackCfgList){
//                         for(let m in testcaseList[i].stackCfgList[j].handlerList){
//                             console.info(`##### ${j} ${m}`)
//                             const ret = await handlerManager.addHandler(
//                                 testcaseList[i].stackCfgList[j].deviceName,
//                                 getStack(testcaseList[i].stackCfgList[j].stack),
//                                 testcaseList[i].stackCfgList[j].handlerList[m].type,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].chain,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].id ,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].index,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].filter,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].default_action,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].myHandler,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].routineType,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].runSum,
//                             )
//                             assert(!ret.err,`${testcaseList[i].stackCfgList[j].deviceName} 添加 ${testcaseList[i].stackCfgList[j].handlerList[m].id } 失败`)
//                         }
                        
//                     }
//                     //开始监听是否运行handler 
//                     let check =  handlerManager.startHandlerCheck(10*1000);
                
//                     const object_raw = obj.to_vec().unwrap();
//                     const req: cyfs.NONPutObjectOutputRequest = {
//                         common: {
//                             req_path: "/qa_test",
//                             dec_id,
//                             flags: 0,
//                             target: cyfs.ObjectId.from_base_58(testcaseList[i].opt.target.peerId).unwrap(),
//                             level: testcaseList[i].opt.level //设置路由类型
//                         },
//                         object: new cyfs.NONObjectInfo(object_id, object_raw)
//                     };
    
             
//                     const put_ret = await (getStack(testcaseList[i].opt.source.stack).non_service().put_object(req));
//                     //校验结果
//                     //cyfs.BuckyError
//                     console.info('put_object result:', put_ret);
//                     assert.equal(put_ret.err,testcaseList[i].expect.err);
//                     if(put_ret.err){
//                         assert.equal(put_ret.val.code,testcaseList[i].expect.code)
//                     }
                    
                    
//                     //assert.equal(put_ret.val,testcaseList[i].expect.err);
//                     //检查监听事件是否触发
//                     let handlerResult = await check
//                     console.info(`put_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
//                     assert(!handlerResult.err)
//                 })
//             })
//         }else if(testcaseList[i].opt.optType == "put-object-dec_app"){
//             describe(`${testcaseList[i].id}--${testcaseList[i].testcaseName}`,async()=>{
//                 beforeEach(async function(){
//                     //测试前置条件，连接测试模拟器设备
//                     console.info(`##########用例执开始执行`)
//                     //初始化ACL配置文件
//                     await Simulator.removeAllConfig();
//                     for(let j in testcaseList[i].stackCfgList){
//                         await aclManager.getdevice(testcaseList[i].stackCfgList[j].deviceName)!.initAcl(testcaseList[i].stackCfgList[j].ACL)
//                     }
//                     //启动模拟器
//                     Simulator.startZoneSimulator();
//                     await sleep(10*1000)
//                     //连接模拟器初始化协议栈
//                     await connecStimulator()
//                 })
//                 afterEach(async ()=>{
//                     //每个函数执行前，清除所有handler
//                     //await handlerManager.clearAllHandler();
//                     await sleep(10*1000);
//                     await Simulator.stopZoneSimulator();
//                     await sleep(10*1000);
//                     //清除ACL配置文件
//                     //await aclManager.removeAllAcl();
//                     console.info(`#########用例执行完成`);
//                 })
    
//                 it(`${testcaseList[i].testcaseName} 运行:`,async()=>{
//                     //(1) put object
//                     // 创建一个测试对象 
//                     const owner_id = cyfs.ObjectId.from_base_58(testcaseList[i].opt.source.peerId).unwrap();
//                     const dec_id = cyfs.ObjectId.from_base_58(testcaseList[i].opt.source.peerId).unwrap();
//                     //const obj = cyfs.TextObject.create(cyfs.Some(owner_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
//                    //定义数值
//                     let owner_str = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW7oC'
//                     let decapp_str = '9tGpLNnfbRQD28vw69SF8jri6Mhwq6Xqd6FfinCfbvBL'
//                     let id = 'Ua1Fgkj3oyPyVztLZ3bt7NEiPUGSX7hTTuZZXs4HGyz';
//                     let endpoint_str = 'L6udp[512:2067:4658:4686:1217:512:768:255]:20993'
//                     let b_string = '123213232323'
//                     let b_number = 4503599627370496

//                     //定义传入参
//                     let owner = cyfs.ObjectId.from_base_58(owner_str).unwrap();
//                     let decappid = cyfs.DecAppId.from_base_58(decapp_str).unwrap();
//                     let data = new Uint8Array([1, 23, 4, 5, 5, 6, 7, 8, 8, 9, 9, 9, 98, 98, 989, 898, 98, 9]);
//                     let testSize = 8789451321555;
//                     let salt = new Uint8Array(32);
//                     let endpoints = cyfs.Endpoint.fromString(endpoint_str).unwrap();
//                     let status = 1;

//                     //定义一个BuckyTuple
//                     let buckystring = new cyfs.BuckyString(b_string);
//                     let buckynuber = new cyfs.BuckyNumber('u128', b_number);
//                     let mix_data = new cyfs.BuckyTuple([endpoints, buckystring, buckynuber]);

//                     //定义传入参
//                     let source = new cyfs.BuckyHashMap<cyfs.BuckyString, cyfs.ObjectId>()
//                     source.set(buckystring, owner)
//                     let icon = cyfs.Some(buckystring)
//                     let list = new cyfs.BuckyHashSet<cyfs.DecAppId>()
//                     list.add(decappid)
//                     const obj = Test.create(
//                         owner,
//                         id,
//                         data,
//                         testSize,
//                         salt,
//                         new cyfs.Vec([endpoints]),
//                         new cyfs.Vec([mix_data]),
//                         source,
//                         icon,
//                         list,
//                         status,

//                     )
//                     console.info(`###创建dec_app object`)
//                     //cyfs.Device.create(cyfs.Some(dec_id),cyfs.UniqueId.default(),[],[],[],cyfs.PrivateKey.generate_rsa(2048).unwrap().public(),new cyfs.Area(1, 2, 3, 4),cyfs.DeviceCategory.OOD)
//                     const object_id = obj.desc().calculate_id();
//                     //(2) 添加测试handler 设置的 handler
//                     for(let j in testcaseList[i].stackCfgList){
//                         for(let m in testcaseList[i].stackCfgList[j].handlerList){
//                             console.info(`##### ${j} ${m}`)
//                             const ret = await handlerManager.addHandler(
//                                 testcaseList[i].stackCfgList[j].deviceName,
//                                 getStack(testcaseList[i].stackCfgList[j].stack),
//                                 testcaseList[i].stackCfgList[j].handlerList[m].type,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].chain,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].id ,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].index,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].filter,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].default_action,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].myHandler,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].routineType,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].runSum,
//                             )
//                             assert(!ret.err,`${testcaseList[i].stackCfgList[j].deviceName} 添加 ${testcaseList[i].stackCfgList[j].handlerList[m].id } 失败`)
//                         }
                        
//                     }
//                     //开始监听是否运行handler 
//                     let check =  handlerManager.startHandlerCheck(10*1000);
//                     const object_raw = obj.to_vec().unwrap();
//                     const req: cyfs.NONPutObjectOutputRequest = {
//                         common: {
//                             req_path: "/qa_test",
//                             dec_id,
//                             flags: 0,
//                             target: cyfs.ObjectId.from_base_58(testcaseList[i].opt.target.peerId).unwrap(),
//                             level: testcaseList[i].opt.level //设置路由类型
//                         },
//                         object: new cyfs.NONObjectInfo(object_id, object_raw)
//                     };
    
             
//                     const put_ret = await (getStack(testcaseList[i].opt.source.stack).non_service().put_object(req));
//                     //校验结果
//                     //cyfs.BuckyError
//                     console.info('put_object result:', put_ret);
//                     assert.equal(put_ret.err,testcaseList[i].expect.err);
//                     if(put_ret.err){
//                         assert.equal(put_ret.val.code,testcaseList[i].expect.code)
//                     }
                    
                    
//                     //assert.equal(put_ret.val,testcaseList[i].expect.err);
//                     //检查监听事件是否触发
//                     let handlerResult = await check
//                     console.info(`put_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
//                     assert(!handlerResult.err)
//                 })
//             })
//         }else if (testcaseList[i].opt.optType  == "get-object"){
//             describe(`${testcaseList[i].id}--${testcaseList[i].testcaseName}`,async()=>{
//                 beforeEach(async function(){
//                     //测试前置条件，连接测试模拟器设备
//                     console.info(`##########用例执开始执行`)
//                     await Simulator.removeAllConfig();
//                     //初始化ACL配置文件
//                     for(let j in testcaseList[i].stackCfgList){
//                         await aclManager.getdevice(testcaseList[i].stackCfgList[j].deviceName)!.initAcl(testcaseList[i].stackCfgList[j].ACL)
//                     }
//                     //启动模拟器
//                     Simulator.startZoneSimulator();
//                     await sleep(10*1000)
//                     //连接模拟器初始化协议栈
//                     await connecStimulator()
                    
//                 })
//                 afterEach(async ()=>{
//                     //每个函数执行前，清除所有handler
//                     await handlerManager.clearAllHandler();
//                     await sleep(10*1000);
//                     await Simulator.stopZoneSimulator();
//                     await sleep(10*1000);
//                     //清除ACL配置文件
//                     await aclManager.removeAllAcl();
//                     console.info(`#########用例执行完成`);
//                 })
    
//                 it(`${testcaseList[i].testcaseName} 运行:`,async()=>{
//                    //(1) noc put object
//                    //创建需要get 的 对象
//                    const info = await createTestObject(getStack(testcaseList[i].opt.target.stack),testcaseList[i].opt.target.peerId)
   
   
//                     const owner_id = cyfs.ObjectId.from_base_58(testcaseList[i].opt.source.peerId).unwrap();
//                     const dec_id = cyfs.ObjectId.from_base_58(testcaseList[i].opt.source.peerId).unwrap();
//                     const obj = cyfs.TextObject.create(cyfs.Some(owner_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
//                     const object_id = obj.desc().calculate_id();
//                     //(2) 添加测试handler 设置的 handler
//                     for(let j in testcaseList[i].stackCfgList){
//                         for(let m in testcaseList[i].stackCfgList[j].handlerList){
//                             console.info(`##### ${j} ${m}`)
//                             const ret = await handlerManager.addHandler(
//                                 testcaseList[i].stackCfgList[j].deviceName,
//                                 getStack(testcaseList[i].stackCfgList[j].stack),
//                                 testcaseList[i].stackCfgList[j].handlerList[m].type,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].chain,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].id ,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].index,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].filter,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].default_action,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].myHandler,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].routineType,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].runSum,
//                             )
//                             assert(!ret.err,`${testcaseList[i].stackCfgList[j].deviceName} 添加 ${testcaseList[i].stackCfgList[j].handlerList[m].id } 失败`)
//                         }
                        
//                     }
//                     //开始监听是否运行handler 
//                     let check =  handlerManager.startHandlerCheck(10*1000);
                    
//                     const req1: cyfs.NONGetObjectOutputRequest = {
//                         object_id:info.saveObjectId,
//                         common: {
//                             req_path: "/qa/put_object",
//                             level: testcaseList[i].opt.level,
//                             target: cyfs.ObjectId.from_base_58(testcaseList[i].opt.target.peerId).unwrap(),
//                             dec_id,
//                             flags: 0,
//                         }
//                     };
//                     const get_ret = await getStack(testcaseList[i].opt.source.stack).non_service().get_object(req1);
//                     console.info('get_object result:', get_ret);
//                     assert.equal(get_ret.err,testcaseList[i].expect.err);
//                     //检查监听事件是否触发
//                     let handlerResult = await check
//                     console.info(`get_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
//                     assert(!handlerResult.err,handlerResult.log)
//                     // 预期结果成功，进行数据校验，和第二次get object handler 触发测试
//                     if(!testcaseList[i].expect.err){
//                        const resp_get = get_ret.unwrap();
//                        const [text, buf] = new cyfs.TextObjectDecoder().raw_decode(resp_get.object.object_raw).unwrap();
//                        assert.equal(text.value,info.saveobject.value)
//                        assert.equal(text.id,info.saveobject.id)
//                        //执行第二次 需要重置 handler 运行次数
//                        await handlerManager.updateHandlerCheckRunSum(testcaseList[i].handlerResetList!)
   
//                        let check2 =  handlerManager.startHandlerCheck(10*1000);
                    
//                        let get_ret2 = await getStack(testcaseList[i].opt.source.stack).non_service().get_object(req1);
//                        console.info('get_object result:', get_ret2);
//                        assert.equal(get_ret2.err,testcaseList[i].expect.err);
//                        const resp_get2 = get_ret2.unwrap();
//                        const [text2, buf2] = new cyfs.TextObjectDecoder().raw_decode(resp_get2.object.object_raw).unwrap();
//                        assert.equal(text2.value,info.saveobject.value)
//                        assert.equal(text2.id,info.saveobject.id)
//                        //检查监听事件是否触发
//                        let handlerResult2 = await check2
//                        console.info(`get_object handler 触发结果为:${JSON.stringify(handlerResult2)}`);
//                        assert(!handlerResult2.err,handlerResult.log)
   
//                     }
                    
//                 })
//             })
//         }else if (testcaseList[i].opt.optType  == "select-object"){
//             describe(`${testcaseList[i].id}--${testcaseList[i].testcaseName}`,async()=>{
//                 beforeEach(async function(){
//                     //测试前置条件，连接测试模拟器设备
//                     console.info(`##########用例执开始执行`)
//                     await Simulator.removeAllConfig();
//                     //初始化ACL配置文件
//                     for(let j in testcaseList[i].stackCfgList){
//                         await aclManager.getdevice(testcaseList[i].stackCfgList[j].deviceName)!.initAcl(testcaseList[i].stackCfgList[j].ACL)
//                     }
//                     //启动模拟器
//                     Simulator.startZoneSimulator();
//                     await sleep(10*1000)
//                     //连接模拟器初始化协议栈
//                     await connecStimulator()
                    
//                 })
//                 afterEach(async ()=>{
//                     //每个函数执行前，清除所有handler
//                     await handlerManager.clearAllHandler();
//                     await sleep(10*1000);
//                     await Simulator.stopZoneSimulator();
//                     await sleep(10*1000);
//                     //清除ACL配置文件
//                     await aclManager.removeAllAcl();
//                     console.info(`#########用例执行完成`);
//                 })
    
//                 it(`${testcaseList[i].testcaseName} 运行:`,async()=>{
   
   
//                     const owner_id = cyfs.ObjectId.from_base_58(testcaseList[i].opt.source.peerId).unwrap();
//                     const dec_id = cyfs.ObjectId.from_base_58(testcaseList[i].opt.source.peerId).unwrap();
//                     const obj = cyfs.TextObject.create(cyfs.Some(owner_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
//                     const object_id = obj.desc().calculate_id();
//                     //(2) 添加测试handler 设置的 handler
//                     for(let j in testcaseList[i].stackCfgList){
//                         for(let m in testcaseList[i].stackCfgList[j].handlerList){
//                             console.info(`##### ${j} ${m}`)
//                             const ret = await handlerManager.addHandler(
//                                 testcaseList[i].stackCfgList[j].deviceName,
//                                 getStack(testcaseList[i].stackCfgList[j].stack),
//                                 testcaseList[i].stackCfgList[j].handlerList[m].type,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].chain,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].id ,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].index,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].filter,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].default_action,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].myHandler,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].routineType,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].runSum,
//                             )
//                             assert(!ret.err,`${testcaseList[i].stackCfgList[j].deviceName} 添加 ${testcaseList[i].stackCfgList[j].handlerList[m].id } 失败`)
//                         }
                        
//                     }
//                     //开始监听是否运行handler 
//                     let check =  handlerManager.startHandlerCheck(10*1000);
                    
//                     //select 操作
//                    let filter: cyfs.SelectFilter = {
//                        obj_type: 41,
//                        obj_type_code:cyfs.ObjectTypeCode.Custom,
//                    }
//                    const req2: cyfs.NONSelectObjectOutputRequest = {
//                        common: {    
//                            dec_id,
//                            level: testcaseList[i].opt.level,               
//                            flags: 0,
//                            target: cyfs.ObjectId.from_base_58(testcaseList[i].opt.target.peerId).unwrap(),
//                        },
//                        filter,
//                        opt: {
//                            page_size : 32,
//                            page_index : 0
//                        }
//                    };
//                    const select_ret = await getStack(testcaseList[i].opt.source.stack).non_service().select_object(req2);
//                    console.info('select_object result:', select_ret);
//                    assert.equal(select_ret.err,testcaseList[i].expect.err,"select 结果与预期不符");
//                     //检查监听事件是否触发
//                     let handlerResult = await check
//                     console.info(`select_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
//                     assert(!handlerResult.err,handlerResult.log)
                    
                    
//                 })
//             })    
//         }else if (testcaseList[i].opt.optType  == "delete-object"){
//             describe(`${testcaseList[i].id}--${testcaseList[i].testcaseName}`,async()=>{
//                 beforeEach(async function(){
//                     //测试前置条件，连接测试模拟器设备
//                     console.info(`##########用例执开始执行`)
//                     //初始化ACL配置文件
//                     await Simulator.removeAllConfig();
//                     for(let j in testcaseList[i].stackCfgList){
//                         await aclManager.getdevice(testcaseList[i].stackCfgList[j].deviceName)!.initAcl(testcaseList[i].stackCfgList[j].ACL)
//                     }
//                     //启动模拟器
//                     Simulator.startZoneSimulator();
//                     await sleep(10*1000)
//                     //连接模拟器初始化协议栈
//                     await connecStimulator()
                    
//                 })
//                 afterEach(async ()=>{
//                     //每个函数执行前，清除所有handler
//                     await handlerManager.clearAllHandler();
//                     await sleep(10*1000);
//                     await Simulator.stopZoneSimulator();
//                     await sleep(10*1000);
//                     //清除ACL配置文件
//                     await aclManager.removeAllAcl();
//                     console.info(`#########用例执行完成`);
//                 })
    
//                 it(`${testcaseList[i].testcaseName} 运行:`,async()=>{
//                    //(1) noc put object
//                    //创建需要get 的 对象
//                    const info = await createTestObject(getStack(testcaseList[i].opt.target.stack),testcaseList[i].opt.target.peerId)
   
   
//                     const owner_id = cyfs.ObjectId.from_base_58(testcaseList[i].opt.source.peerId).unwrap();
//                     const dec_id = cyfs.ObjectId.from_base_58(testcaseList[i].opt.source.peerId).unwrap();
//                     const obj = cyfs.TextObject.create(cyfs.Some(owner_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
//                     const object_id = obj.desc().calculate_id();
//                     //(2) 添加测试handler 设置的 handler
//                     for(let j in testcaseList[i].stackCfgList){
//                         for(let m in testcaseList[i].stackCfgList[j].handlerList){
//                             console.info(`##### ${j} ${m}`)
//                             const ret = await handlerManager.addHandler(
//                                 testcaseList[i].stackCfgList[j].deviceName,
//                                 getStack(testcaseList[i].stackCfgList[j].stack),
//                                 testcaseList[i].stackCfgList[j].handlerList[m].type,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].chain,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].id ,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].index,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].filter,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].default_action,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].myHandler,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].routineType,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].runSum,
//                             )
//                             assert(!ret.err,`${testcaseList[i].stackCfgList[j].deviceName} 添加 ${testcaseList[i].stackCfgList[j].handlerList[m].id } 失败`)
//                         }
                        
//                     }
//                     //开始监听是否运行handler 
//                     let check =  handlerManager.startHandlerCheck(10*1000);
                    
//                     //Delete 操作
//                     const req4: cyfs.NONDeleteObjectOutputRequest = {
//                        common:  {
//                            dec_id,
//                            level: testcaseList[i].opt.level,               
//                            flags: 0,
//                            target: cyfs.ObjectId.from_base_58(testcaseList[i].opt.target.peerId).unwrap(),
//                        },
//                        object_id: info.saveObjectId,
       
//                    };
//                    const delete_ret = await getStack(testcaseList[i].opt.source.stack).non_service().delete_object(req4);
//                    console.info('delete_object result:', delete_ret);
   
//                    assert.equal(delete_ret.err,testcaseList[i].expect.err,"Delete 结果与预期不符");
//                     //检查监听事件是否触发
//                     let handlerResult = await check
//                     console.info(`Delete_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
//                     assert(!handlerResult.err,handlerResult.log)
//                     // 进行get object  检查机器本地NOC有该object
//                     if(!testcaseList[i].expect.err){
//                         let getRet = await getTestObject(getStack(testcaseList[i].opt.target.stack),testcaseList[i].opt.target.peerId,info.saveObjectId)
//                         console.info(getRet.err)
//                         assert(getRet.err,"删除object后getobject err为true")
//                     }
                   
                    
                    
//                 })
//             })
//         } else if (testcaseList[i].opt.optType  == "post-object"){
//             describe(`${testcaseList[i].id}--${testcaseList[i].testcaseName}`,async()=>{
//                 beforeEach(async function(){
//                     //测试前置条件，连接测试模拟器设备
//                     console.info(`##########用例执开始执行`)
//                     await Simulator.removeAllConfig();
//                     //初始化ACL配置文件
//                     for(let j in testcaseList[i].stackCfgList){
//                         await aclManager.getdevice(testcaseList[i].stackCfgList[j].deviceName)!.initAcl(testcaseList[i].stackCfgList[j].ACL)
//                     }
//                     //启动模拟器
//                     Simulator.startZoneSimulator();
//                     await sleep(10*1000)
//                     //连接模拟器初始化协议栈
//                     await connecStimulator()
                    
//                 })
//                 afterEach(async ()=>{
//                     //每个函数执行前，清除所有handler
//                     await handlerManager.clearAllHandler();
//                     await sleep(10*1000);
//                     await Simulator.stopZoneSimulator();
//                     await sleep(10*1000);
//                     //清除ACL配置文件
//                     await aclManager.removeAllAcl();
//                     console.info(`#########用例执行完成`);
//                 })
    
//                 it(`${testcaseList[i].testcaseName} 运行:`,async()=>{
//                    //(1) noc put object
//                    //创建需要get 的 对象
//                    const info = await createTestObject(getStack(testcaseList[i].opt.target.stack),testcaseList[i].opt.target.peerId)
   
   
//                     const owner_id = cyfs.ObjectId.from_base_58(testcaseList[i].opt.source.peerId).unwrap();
//                     const dec_id = cyfs.ObjectId.from_base_58(testcaseList[i].opt.source.peerId).unwrap();
//                     const obj = cyfs.TextObject.create(cyfs.Some(owner_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
//                     const object_id = obj.desc().calculate_id();
//                     //(2) 添加测试handler 设置的 handler
//                     for(let j in testcaseList[i].stackCfgList){
//                         for(let m in testcaseList[i].stackCfgList[j].handlerList){
//                             console.info(`##### ${j} ${m}`)
//                             const ret = await handlerManager.addHandler(
//                                 testcaseList[i].stackCfgList[j].deviceName,
//                                 getStack(testcaseList[i].stackCfgList[j].stack),
//                                 testcaseList[i].stackCfgList[j].handlerList[m].type,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].chain,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].id ,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].index,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].filter,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].default_action,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].myHandler,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].routineType,
//                                 testcaseList[i].stackCfgList[j].handlerList[m].runSum,
//                             )
//                             assert(!ret.err,`${testcaseList[i].stackCfgList[j].deviceName} 添加 ${testcaseList[i].stackCfgList[j].handlerList[m].id } 失败`)
//                         }
                        
//                     }
//                     //开始监听是否运行handler 
//                     let check =  handlerManager.startHandlerCheck(10*1000);
                    
//                     //Post 操作
//                     const req1: cyfs.NONPostObjectOutputRequest = {
        
//                         object:  cyfs.NONObjectInfo.new_from_object_raw(info.object_raw).unwrap(),//info.saveObjectId,
//                         common: {
//                             //req_path: "/qa/put_object",
//                             level: cyfs.NONAPILevel.Router,
//                             target: cyfs.ObjectId.from_base_58(testcaseList[i].opt.target.peerId).unwrap(),
//                             dec_id,
//                             flags: 0,
//                         }
//                     };
//                     //post 只校验handler触发
//                     const post_ret = await getStack(testcaseList[i].opt.source.stack).non_service().post_object(req1);
//                     console.info('post_object result:', post_ret);
//                     //检查监听事件是否触发
//                     let handlerResult = await check
//                     console.info(`Post_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
//                     assert(!handlerResult.err,handlerResult.log)
   
                    
                    
//                 })
//             })
//         }
//     }

// })

// // 使用only  可以调试，使用skip 可以关闭单个调试
// describe('cyfs-sdk ACL 规则  功能测试',function(){
//     this.timeout(0);
//      for(let i in testcaseList){
//          if(testcaseList[i].id == `NON_ACL_testcase_0187`){ //NON_ACL_testcase_0171 73 81
//             if(testcaseList[i].opt.optType == "put-object"){
//                 describe(`${testcaseList[i].id}--${testcaseList[i].testcaseName}`,async()=>{
//                     beforeEach(async function(){
//                         //初始化relation关系
//                         // if(testcaseList[i].relation){
//                         //     console.info(`relation:${JSON.stringify(testcaseList[i].relation)}`)
//                         //     await initFriendRelation(testcaseList[i].relation!)
//                         // }
//                         //测试前置条件，连接测试模拟器设备
//                         console.info(`##########用例执开始执行`)
//                         //初始化ACL配置文件
//                         await Simulator.removeAllConfig();
//                         for(let j in testcaseList[i].stackCfgList){
//                             await aclManager.getdevice(testcaseList[i].stackCfgList[j].deviceName)!.initAcl(testcaseList[i].stackCfgList[j].ACL)
//                         }
//                         //启动模拟器
//                         Simulator.startZoneSimulator();
//                         await sleep(10*1000)
//                         //连接模拟器初始化协议栈
//                         await connecStimulator()
                        
//                     })
//                     afterEach(async ()=>{
//                         //每个函数执行前，清除所有handler
//                         await handlerManager.clearAllHandler();
//                         await sleep(10*1000);
//                         await Simulator.stopZoneSimulator();
//                         await sleep(10*1000);
//                         //清除ACL配置文件
//                         await aclManager.removeAllAcl();
//                         console.info(`#########用例执行完成`);
//                     })
        
//                     it(`${testcaseList[i].testcaseName} 运行:`,async()=>{
//                         //(1) put object
//                         // 创建一个测试对象 
//                         //const owner_id = cyfs.ObjectId.from_base_58("5r6LxrnEmFKGwWAxtqFpJePyPpoY35bBSbsjXiDdR1HU").unwrap();
//                         let owner_id = cyfs.ObjectId.from_base_58(testcaseList[i].opt.source.peerId).unwrap();
//                         if(testcaseList[i].owner){
//                             owner_id = cyfs.ObjectId.from_base_58(testcaseList[i].owner!).unwrap();
//                         }
//                         let  dec_id = cyfs.ObjectId.from_base_58(testcaseList[i].opt.source.peerId).unwrap();
//                         if(testcaseList[i].opt.dec_id){
//                             dec_id = cyfs.ObjectId.from_base_58(testcaseList[i].opt.dec_id!).unwrap();
//                         }else{
//                             const app = cyfs.DecApp.create(owner_id, 'test_put');
//                             dec_id = app.desc().calculate_id();
//                             console.log(`new app id: ${dec_id}`);
//                         }
//                         console.log(`app id: ${dec_id}`);
//                         const obj = cyfs.TextObject.create
//                         (cyfs.Some(owner_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
//                         const object_id = obj.desc().calculate_id();
//                         //(2) 添加测试handler 设置的 handler
//                         for(let j in testcaseList[i].stackCfgList){
//                             for(let m in testcaseList[i].stackCfgList[j].handlerList){
//                                 console.info(`##### ${j} ${m}`)
//                                 const ret = await handlerManager.addHandler(
//                                     testcaseList[i].stackCfgList[j].deviceName,
//                                     getStack(testcaseList[i].stackCfgList[j].stack),
//                                     testcaseList[i].stackCfgList[j].handlerList[m].type,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].chain,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].id ,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].index,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].filter,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].default_action,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].myHandler,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].routineType,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].runSum,
//                                 )
//                                 assert(!ret.err,`${testcaseList[i].stackCfgList[j].deviceName} 添加 ${testcaseList[i].stackCfgList[j].handlerList[m].id } 失败`)
//                             }
                            
//                         }
//                         //开始监听是否运行handler 
//                         let check =  handlerManager.startHandlerCheck(10*1000);
//                         console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
//                         const object_raw = obj.to_vec().unwrap();
//                         const req: cyfs.NONPutObjectOutputRequest = {
//                             common: {
//                                 req_path: "/qa_test",
//                                 dec_id,
//                                 flags: 0,
//                                 target: cyfs.ObjectId.from_base_58(testcaseList[i].opt.target.peerId).unwrap(),
//                                 level: testcaseList[i].opt.level //设置路由类型
//                             },
//                             object: new cyfs.NONObjectInfo(object_id, object_raw)
//                         };
        
                 
//                         const put_ret = await (getStack(testcaseList[i].opt.source.stack).non_service().put_object(req));
//                         //校验结果
//                         //cyfs.BuckyError
//                         console.info('put_object result:', put_ret);
//                         assert.equal(put_ret.err,testcaseList[i].expect.err);
//                         if(put_ret.err){
//                             assert.equal(put_ret.val.code,testcaseList[i].expect.code)
//                         }
                        
                        
//                         //assert.equal(put_ret.val,testcaseList[i].expect.err);
//                         //检查监听事件是否触发
//                         let handlerResult = await check
//                         console.info(`put_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
//                         assert(!handlerResult.err)
//                     })
//                 })
//             }else if(testcaseList[i].opt.optType == "put-object-standard"){
//                 describe(`${testcaseList[i].id}--${testcaseList[i].testcaseName}`,async()=>{
//                     beforeEach(async function(){
//                         //测试前置条件，连接测试模拟器设备
//                         console.info(`##########用例执开始执行`)
//                         //初始化ACL配置文件
//                         await Simulator.removeAllConfig();
//                         for(let j in testcaseList[i].stackCfgList){
//                             await aclManager.getdevice(testcaseList[i].stackCfgList[j].deviceName)!.initAcl(testcaseList[i].stackCfgList[j].ACL)
//                         }
//                         //启动模拟器
//                         Simulator.startZoneSimulator();
//                         await sleep(10*1000)
//                         //连接模拟器初始化协议栈
//                         await connecStimulator()
//                     })
//                     afterEach(async ()=>{
//                         //每个函数执行前，清除所有handler
//                         //await handlerManager.clearAllHandler();
//                         await sleep(10*1000);
//                         await Simulator.stopZoneSimulator();
//                         await sleep(10*1000);
//                         //清除ACL配置文件
//                         //await aclManager.removeAllAcl();
//                         console.info(`#########用例执行完成`);
//                     })
        
//                     it(`${testcaseList[i].testcaseName} 运行:`,async()=>{
//                         //(1) put object
//                         // 创建一个测试对象 
//                         const owner_id = cyfs.ObjectId.from_base_58(testcaseList[i].opt.source.peerId).unwrap();
//                         const dec_id = cyfs.ObjectId.from_base_58(testcaseList[i].opt.source.peerId).unwrap();
//                         //const obj = cyfs.TextObject.create(cyfs.Some(owner_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
//                         const obj = cyfs.Device.create(cyfs.Some(dec_id),cyfs.UniqueId.default(),[],[],[],cyfs.PrivateKey.generate_rsa(2048).unwrap().public(),new cyfs.Area(1, 2, 3, 4),cyfs.DeviceCategory.OOD)
//                         const object_id = obj.desc().calculate_id();
//                         //(2) 添加测试handler 设置的 handler
//                         for(let j in testcaseList[i].stackCfgList){
//                             for(let m in testcaseList[i].stackCfgList[j].handlerList){
//                                 console.info(`##### ${j} ${m}`)
//                                 const ret = await handlerManager.addHandler(
//                                     testcaseList[i].stackCfgList[j].deviceName,
//                                     getStack(testcaseList[i].stackCfgList[j].stack),
//                                     testcaseList[i].stackCfgList[j].handlerList[m].type,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].chain,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].id ,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].index,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].filter,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].default_action,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].myHandler,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].routineType,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].runSum,
//                                 )
//                                 assert(!ret.err,`${testcaseList[i].stackCfgList[j].deviceName} 添加 ${testcaseList[i].stackCfgList[j].handlerList[m].id } 失败`)
//                             }
                            
//                         }
//                         //开始监听是否运行handler 
//                         let check =  handlerManager.startHandlerCheck(10*1000);
                    
//                         const object_raw = obj.to_vec().unwrap();
//                         const req: cyfs.NONPutObjectOutputRequest = {
//                             common: {
//                                 req_path: "/qa_test",
//                                 dec_id,
//                                 flags: 0,
//                                 target: cyfs.ObjectId.from_base_58(testcaseList[i].opt.target.peerId).unwrap(),
//                                 level: testcaseList[i].opt.level //设置路由类型
//                             },
//                             object: new cyfs.NONObjectInfo(object_id, object_raw)
//                         };
        
                 
//                         const put_ret = await (getStack(testcaseList[i].opt.source.stack).non_service().put_object(req));
//                         //校验结果
//                         //cyfs.BuckyError
//                         console.info('put_object result:', put_ret);
//                         assert.equal(put_ret.err,testcaseList[i].expect.err);
//                         if(put_ret.err){
//                             assert.equal(put_ret.val.code,testcaseList[i].expect.code)
//                         }
                        
                        
//                         //assert.equal(put_ret.val,testcaseList[i].expect.err);
//                         //检查监听事件是否触发
//                         let handlerResult = await check
//                         console.info(`put_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
//                         assert(!handlerResult.err)
//                     })
//                 })
//             }else if(testcaseList[i].opt.optType == "put-object-dec_app"){
//                 describe(`${testcaseList[i].id}--${testcaseList[i].testcaseName}`,async()=>{
//                     beforeEach(async function(){
//                         //测试前置条件，连接测试模拟器设备
//                         console.info(`##########用例执开始执行`)
//                         //初始化ACL配置文件
//                         await Simulator.removeAllConfig();
//                         for(let j in testcaseList[i].stackCfgList){
//                             await aclManager.getdevice(testcaseList[i].stackCfgList[j].deviceName)!.initAcl(testcaseList[i].stackCfgList[j].ACL)
//                         }
//                         //启动模拟器
//                         Simulator.startZoneSimulator();
//                         await sleep(10*1000)
//                         //连接模拟器初始化协议栈
//                         await connecStimulator()
//                     })
//                     afterEach(async ()=>{
//                         //每个函数执行前，清除所有handler
//                         //await handlerManager.clearAllHandler();
//                         await sleep(10*1000);
//                         await Simulator.stopZoneSimulator();
//                         await sleep(10*1000);
//                         //清除ACL配置文件
//                         //await aclManager.removeAllAcl();
//                         console.info(`#########用例执行完成`);
//                     })
        
//                     it(`${testcaseList[i].testcaseName} 运行:`,async()=>{
//                         //(1) put object
//                         // 创建一个测试对象 
//                         const owner_id = cyfs.ObjectId.from_base_58(testcaseList[i].opt.source.peerId).unwrap();
//                         const dec_id = cyfs.ObjectId.from_base_58(testcaseList[i].opt.source.peerId).unwrap();
//                         //const obj = cyfs.TextObject.create(cyfs.Some(owner_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
//                        //定义数值
//                         let owner_str = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW7oC'
//                         let decapp_str = '9tGpLNnGfMgXZ2xqmVmqFhh91PQXLkaXbccyw2nkdDMM'
//                         let id = 'Ua1Fgkj3oyPyVztLZ3bt7NEiPUGSX7hTTuZZXs4HGyz';
//                         let endpoint_str = 'L6udp[512:2067:4658:4686:1217:512:768:255]:20993'
//                         let b_string = '123213232323'
//                         let b_number = 4503599627370496

//                         //定义传入参
//                         let owner = cyfs.ObjectId.from_base_58(owner_str).unwrap();
//                         let decappid = cyfs.DecAppId.from_base_58(decapp_str).unwrap();
//                         let data = new Uint8Array([1, 23, 4, 5, 5, 6, 7, 8, 8, 9, 9, 9, 98, 98, 989, 898, 98, 9]);
//                         let testSize = 8789451321555;
//                         let salt = new Uint8Array(32);
//                         let endpoints = cyfs.Endpoint.fromString(endpoint_str).unwrap();
//                         let status = 1;

//                         //定义一个BuckyTuple
//                         let buckystring = new cyfs.BuckyString(b_string);
//                         let buckynuber = new cyfs.BuckyNumber('u128', b_number);
//                         let mix_data = new cyfs.BuckyTuple([endpoints, buckystring, buckynuber]);

//                         //定义传入参
//                         let source = new cyfs.BuckyHashMap<cyfs.BuckyString, cyfs.ObjectId>()
//                         source.set(buckystring, owner)
//                         let icon = cyfs.Some(buckystring)
//                         let list = new cyfs.BuckyHashSet<cyfs.DecAppId>()
//                         list.add(decappid)
//                         const obj = Test.create(
//                             owner,
//                             id,
//                             data,
//                             testSize,
//                             salt,
//                             new cyfs.Vec([endpoints]),
//                             new cyfs.Vec([mix_data]),
//                             source,
//                             icon,
//                             list,
//                             status,

//                         )
//                         console.info(`###创建dec_app object`)
//                         //cyfs.Device.create(cyfs.Some(dec_id),cyfs.UniqueId.default(),[],[],[],cyfs.PrivateKey.generate_rsa(2048).unwrap().public(),new cyfs.Area(1, 2, 3, 4),cyfs.DeviceCategory.OOD)
//                         const object_id = obj.desc().calculate_id();
//                         //(2) 添加测试handler 设置的 handler
//                         for(let j in testcaseList[i].stackCfgList){
//                             for(let m in testcaseList[i].stackCfgList[j].handlerList){
//                                 console.info(`##### ${j} ${m}`)
//                                 const ret = await handlerManager.addHandler(
//                                     testcaseList[i].stackCfgList[j].deviceName,
//                                     getStack(testcaseList[i].stackCfgList[j].stack),
//                                     testcaseList[i].stackCfgList[j].handlerList[m].type,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].chain,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].id ,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].index,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].filter,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].default_action,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].myHandler,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].routineType,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].runSum,
//                                 )
//                                 assert(!ret.err,`${testcaseList[i].stackCfgList[j].deviceName} 添加 ${testcaseList[i].stackCfgList[j].handlerList[m].id } 失败`)
//                             }
                            
//                         }
//                         //开始监听是否运行handler 
//                         let check =  handlerManager.startHandlerCheck(10*1000);
//                         const object_raw = obj.to_vec().unwrap();
//                         const req: cyfs.NONPutObjectOutputRequest = {
//                             common: {
//                                 req_path: "/qa_test",
//                                 dec_id,
//                                 flags: 0,
//                                 target: cyfs.ObjectId.from_base_58(testcaseList[i].opt.target.peerId).unwrap(),
//                                 level: testcaseList[i].opt.level //设置路由类型
//                             },
//                             object: new cyfs.NONObjectInfo(object_id, object_raw)
//                         };
        
                 
//                         const put_ret = await (getStack(testcaseList[i].opt.source.stack).non_service().put_object(req));
//                         //校验结果
//                         //cyfs.BuckyError
//                         console.info('put_object result:', put_ret);
//                         assert.equal(put_ret.err,testcaseList[i].expect.err);
//                         if(put_ret.err){
//                             assert.equal(put_ret.val.code,testcaseList[i].expect.code)
//                         }
                        
                        
//                         //assert.equal(put_ret.val,testcaseList[i].expect.err);
//                         //检查监听事件是否触发
//                         let handlerResult = await check
//                         console.info(`put_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
//                         assert(!handlerResult.err)
//                     })
//                 })
//             }else if (testcaseList[i].opt.optType  == "get-object"){
//                 describe(`${testcaseList[i].id}--${testcaseList[i].testcaseName}`,async()=>{
//                     beforeEach(async function(){
//                         //测试前置条件，连接测试模拟器设备
//                         console.info(`##########用例执开始执行`)
//                         await Simulator.removeAllConfig();
//                         //初始化ACL配置文件
//                         for(let j in testcaseList[i].stackCfgList){
//                             await aclManager.getdevice(testcaseList[i].stackCfgList[j].deviceName)!.initAcl(testcaseList[i].stackCfgList[j].ACL)
//                         }
//                         //启动模拟器
//                         Simulator.startZoneSimulator();
//                         await sleep(10*1000)
//                         //连接模拟器初始化协议栈
//                         await connecStimulator()
                        
//                     })
//                     afterEach(async ()=>{
//                         //每个函数执行前，清除所有handler
//                         await handlerManager.clearAllHandler();
//                         await sleep(10*1000);
//                         await Simulator.stopZoneSimulator();
//                         await sleep(10*1000);
//                         //清除ACL配置文件
//                         await aclManager.removeAllAcl();
//                         console.info(`#########用例执行完成`);
//                     })
        
//                     it(`${testcaseList[i].testcaseName} 运行:`,async()=>{
//                        //(1) noc put object
//                        //创建需要get 的 对象
//                        const info = await createTestObject(getStack(testcaseList[i].opt.target.stack),testcaseList[i].opt.target.peerId)
       
       
//                         const owner_id = cyfs.ObjectId.from_base_58(testcaseList[i].opt.source.peerId).unwrap();
//                         const dec_id = cyfs.ObjectId.from_base_58(testcaseList[i].opt.source.peerId).unwrap();
//                         const obj = cyfs.TextObject.create(cyfs.Some(owner_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
//                         const object_id = obj.desc().calculate_id();
//                         //(2) 添加测试handler 设置的 handler
//                         for(let j in testcaseList[i].stackCfgList){
//                             for(let m in testcaseList[i].stackCfgList[j].handlerList){
//                                 console.info(`##### ${j} ${m}`)
//                                 const ret = await handlerManager.addHandler(
//                                     testcaseList[i].stackCfgList[j].deviceName,
//                                     getStack(testcaseList[i].stackCfgList[j].stack),
//                                     testcaseList[i].stackCfgList[j].handlerList[m].type,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].chain,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].id ,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].index,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].filter,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].default_action,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].myHandler,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].routineType,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].runSum,
//                                 )
//                                 assert(!ret.err,`${testcaseList[i].stackCfgList[j].deviceName} 添加 ${testcaseList[i].stackCfgList[j].handlerList[m].id } 失败`)
//                             }
                            
//                         }
//                         //开始监听是否运行handler 
//                         let check =  handlerManager.startHandlerCheck(10*1000);
                        
//                         const req1: cyfs.NONGetObjectOutputRequest = {
//                             object_id:info.saveObjectId,
//                             common: {
//                                 req_path: "/qa/put_object",
//                                 level: testcaseList[i].opt.level,
//                                 target: cyfs.ObjectId.from_base_58(testcaseList[i].opt.target.peerId).unwrap(),
//                                 dec_id,
//                                 flags: 0,
//                             }
//                         };
//                         const get_ret = await getStack(testcaseList[i].opt.source.stack).non_service().get_object(req1);
//                         console.info('get_object result:', get_ret);
//                         assert.equal(get_ret.err,testcaseList[i].expect.err);
//                         //检查监听事件是否触发
//                         let handlerResult = await check
//                         console.info(`get_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
//                         assert(!handlerResult.err,handlerResult.log)
//                         // 预期结果成功，进行数据校验，和第二次get object handler 触发测试
//                         if(!testcaseList[i].expect.err){
//                            const resp_get = get_ret.unwrap();
//                            const [text, buf] = new cyfs.TextObjectDecoder().raw_decode(resp_get.object.object_raw).unwrap();
//                            assert.equal(text.value,info.saveobject.value)
//                            assert.equal(text.id,info.saveobject.id)
//                            //执行第二次 需要重置 handler 运行次数
//                            await handlerManager.updateHandlerCheckRunSum(testcaseList[i].handlerResetList!)
       
//                            let check2 =  handlerManager.startHandlerCheck(10*1000);
                        
//                            let get_ret2 = await getStack(testcaseList[i].opt.source.stack).non_service().get_object(req1);
//                            console.info('get_object result:', get_ret2);
//                            assert.equal(get_ret2.err,testcaseList[i].expect.err);
//                            const resp_get2 = get_ret2.unwrap();
//                            const [text2, buf2] = new cyfs.TextObjectDecoder().raw_decode(resp_get2.object.object_raw).unwrap();
//                            assert.equal(text2.value,info.saveobject.value)
//                            assert.equal(text2.id,info.saveobject.id)
//                            //检查监听事件是否触发
//                            let handlerResult2 = await check2
//                            console.info(`get_object handler 触发结果为:${JSON.stringify(handlerResult2)}`);
//                            assert(!handlerResult2.err,handlerResult.log)
       
//                         }
                        
//                     })
//                 })
//             }else if (testcaseList[i].opt.optType  == "select-object"){
//                 describe(`${testcaseList[i].id}--${testcaseList[i].testcaseName}`,async()=>{
//                     beforeEach(async function(){
//                         //测试前置条件，连接测试模拟器设备
//                         console.info(`##########用例执开始执行`)
//                         await Simulator.removeAllConfig();
//                         //初始化ACL配置文件
//                         for(let j in testcaseList[i].stackCfgList){
//                             await aclManager.getdevice(testcaseList[i].stackCfgList[j].deviceName)!.initAcl(testcaseList[i].stackCfgList[j].ACL)
//                         }
//                         //启动模拟器
//                         Simulator.startZoneSimulator();
//                         await sleep(10*1000)
//                         //连接模拟器初始化协议栈
//                         await connecStimulator()
                        
//                     })
//                     afterEach(async ()=>{
//                         //每个函数执行前，清除所有handler
//                         await handlerManager.clearAllHandler();
//                         await sleep(10*1000);
//                         await Simulator.stopZoneSimulator();
//                         await sleep(10*1000);
//                         //清除ACL配置文件
//                         await aclManager.removeAllAcl();
//                         console.info(`#########用例执行完成`);
//                     })
        
//                     it(`${testcaseList[i].testcaseName} 运行:`,async()=>{
       
       
//                         const owner_id = cyfs.ObjectId.from_base_58(testcaseList[i].opt.source.peerId).unwrap();
//                         const dec_id = cyfs.ObjectId.from_base_58(testcaseList[i].opt.source.peerId).unwrap();
//                         const obj = cyfs.TextObject.create(cyfs.Some(owner_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
//                         const object_id = obj.desc().calculate_id();
//                         //(2) 添加测试handler 设置的 handler
//                         for(let j in testcaseList[i].stackCfgList){
//                             for(let m in testcaseList[i].stackCfgList[j].handlerList){
//                                 console.info(`##### ${j} ${m}`)
//                                 const ret = await handlerManager.addHandler(
//                                     testcaseList[i].stackCfgList[j].deviceName,
//                                     getStack(testcaseList[i].stackCfgList[j].stack),
//                                     testcaseList[i].stackCfgList[j].handlerList[m].type,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].chain,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].id ,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].index,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].filter,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].default_action,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].myHandler,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].routineType,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].runSum,
//                                 )
//                                 assert(!ret.err,`${testcaseList[i].stackCfgList[j].deviceName} 添加 ${testcaseList[i].stackCfgList[j].handlerList[m].id } 失败`)
//                             }
                            
//                         }
//                         //开始监听是否运行handler 
//                         let check =  handlerManager.startHandlerCheck(10*1000);
                        
//                         //select 操作
//                        let filter: cyfs.SelectFilter = {
//                            obj_type: 41,
//                            obj_type_code:cyfs.ObjectTypeCode.Custom,
//                        }
//                        const req2: cyfs.NONSelectObjectOutputRequest = {
//                            common: {    
//                                dec_id,
//                                level: testcaseList[i].opt.level,               
//                                flags: 0,
//                                target: cyfs.ObjectId.from_base_58(testcaseList[i].opt.target.peerId).unwrap(),
//                            },
//                            filter,
//                            opt: {
//                                page_size : 32,
//                                page_index : 0
//                            }
//                        };
//                        const select_ret = await getStack(testcaseList[i].opt.source.stack).non_service().select_object(req2);
//                        console.info('select_object result:', select_ret);
//                        assert.equal(select_ret.err,testcaseList[i].expect.err,"select 结果与预期不符");
//                         //检查监听事件是否触发
//                         let handlerResult = await check
//                         console.info(`select_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
//                         assert(!handlerResult.err,handlerResult.log)
                        
                        
//                     })
//                 })    
//             }else if (testcaseList[i].opt.optType  == "delete-object"){
//                 describe(`${testcaseList[i].id}--${testcaseList[i].testcaseName}`,async()=>{
//                     beforeEach(async function(){
//                         //测试前置条件，连接测试模拟器设备
//                         console.info(`##########用例执开始执行`)
//                         //初始化ACL配置文件
//                         await Simulator.removeAllConfig();
//                         for(let j in testcaseList[i].stackCfgList){
//                             await aclManager.getdevice(testcaseList[i].stackCfgList[j].deviceName)!.initAcl(testcaseList[i].stackCfgList[j].ACL)
//                         }
//                         //启动模拟器
//                         Simulator.startZoneSimulator();
//                         await sleep(10*1000)
//                         //连接模拟器初始化协议栈
//                         await connecStimulator()
                        
//                     })
//                     afterEach(async ()=>{
//                         //每个函数执行前，清除所有handler
//                         await handlerManager.clearAllHandler();
//                         await sleep(10*1000);
//                         await Simulator.stopZoneSimulator();
//                         await sleep(10*1000);
//                         //清除ACL配置文件
//                         await aclManager.removeAllAcl();
//                         console.info(`#########用例执行完成`);
//                     })
        
//                     it(`${testcaseList[i].testcaseName} 运行:`,async()=>{
//                        //(1) noc put object
//                        //创建需要get 的 对象
//                        const info = await createTestObject(getStack(testcaseList[i].opt.target.stack),testcaseList[i].opt.target.peerId)
       
       
//                         const owner_id = cyfs.ObjectId.from_base_58(testcaseList[i].opt.source.peerId).unwrap();
//                         const dec_id = cyfs.ObjectId.from_base_58(testcaseList[i].opt.source.peerId).unwrap();
//                         const obj = cyfs.TextObject.create(cyfs.Some(owner_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
//                         const object_id = obj.desc().calculate_id();
//                         //(2) 添加测试handler 设置的 handler
//                         for(let j in testcaseList[i].stackCfgList){
//                             for(let m in testcaseList[i].stackCfgList[j].handlerList){
//                                 console.info(`##### ${j} ${m}`)
//                                 const ret = await handlerManager.addHandler(
//                                     testcaseList[i].stackCfgList[j].deviceName,
//                                     getStack(testcaseList[i].stackCfgList[j].stack),
//                                     testcaseList[i].stackCfgList[j].handlerList[m].type,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].chain,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].id ,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].index,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].filter,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].default_action,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].myHandler,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].routineType,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].runSum,
//                                 )
//                                 assert(!ret.err,`${testcaseList[i].stackCfgList[j].deviceName} 添加 ${testcaseList[i].stackCfgList[j].handlerList[m].id } 失败`)
//                             }
                            
//                         }
//                         //开始监听是否运行handler 
//                         let check =  handlerManager.startHandlerCheck(10*1000);
                        
//                         //Delete 操作
//                         const req4: cyfs.NONDeleteObjectOutputRequest = {
//                            common:  {
//                                dec_id,
//                                level: testcaseList[i].opt.level,               
//                                flags: 0,
//                                target: cyfs.ObjectId.from_base_58(testcaseList[i].opt.target.peerId).unwrap(),
//                            },
//                            object_id: info.saveObjectId,
           
//                        };
//                        const delete_ret = await getStack(testcaseList[i].opt.source.stack).non_service().delete_object(req4);
//                        console.info('delete_object result:', delete_ret);
       
//                        assert.equal(delete_ret.err,testcaseList[i].expect.err,"Delete 结果与预期不符");
//                         //检查监听事件是否触发
//                         let handlerResult = await check
//                         console.info(`Delete_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
//                         assert(!handlerResult.err,handlerResult.log)
//                         // 进行get object  检查机器本地NOC有该object
//                         if(!testcaseList[i].expect.err){
//                             let getRet = await getTestObject(getStack(testcaseList[i].opt.target.stack),testcaseList[i].opt.target.peerId,info.saveObjectId)
//                             console.info(getRet.err)
//                             assert(getRet.err,"删除object后getobject err为true")
//                         }
                       
                        
                        
//                     })
//                 })
//             } else if (testcaseList[i].opt.optType  == "post-object"){
//                 describe(`${testcaseList[i].id}--${testcaseList[i].testcaseName}`,async()=>{
//                     beforeEach(async function(){
//                         //测试前置条件，连接测试模拟器设备
//                         console.info(`##########用例执开始执行`)
//                         await Simulator.removeAllConfig();
//                         //初始化ACL配置文件
//                         for(let j in testcaseList[i].stackCfgList){
//                             await aclManager.getdevice(testcaseList[i].stackCfgList[j].deviceName)!.initAcl(testcaseList[i].stackCfgList[j].ACL)
//                         }
//                         //启动模拟器
//                         Simulator.startZoneSimulator();
//                         await sleep(10*1000)
//                         //连接模拟器初始化协议栈
//                         await connecStimulator()
                        
//                     })
//                     afterEach(async ()=>{
//                         //每个函数执行前，清除所有handler
//                         await handlerManager.clearAllHandler();
//                         await sleep(10*1000);
//                         await Simulator.stopZoneSimulator();
//                         await sleep(10*1000);
//                         //清除ACL配置文件
//                         await aclManager.removeAllAcl();
//                         console.info(`#########用例执行完成`);
//                     })
        
//                     it(`${testcaseList[i].testcaseName} 运行:`,async()=>{
//                        //(1) noc put object
//                        //创建需要get 的 对象
//                        const info = await createTestObject(getStack(testcaseList[i].opt.target.stack),testcaseList[i].opt.target.peerId)
       
       
//                         const owner_id = cyfs.ObjectId.from_base_58(testcaseList[i].opt.source.peerId).unwrap();
//                         const dec_id = cyfs.ObjectId.from_base_58(testcaseList[i].opt.source.peerId).unwrap();
//                         const obj = cyfs.TextObject.create(cyfs.Some(owner_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
//                         const object_id = obj.desc().calculate_id();
//                         //(2) 添加测试handler 设置的 handler
//                         for(let j in testcaseList[i].stackCfgList){
//                             for(let m in testcaseList[i].stackCfgList[j].handlerList){
//                                 console.info(`##### ${j} ${m}`)
//                                 const ret = await handlerManager.addHandler(
//                                     testcaseList[i].stackCfgList[j].deviceName,
//                                     getStack(testcaseList[i].stackCfgList[j].stack),
//                                     testcaseList[i].stackCfgList[j].handlerList[m].type,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].chain,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].id ,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].index,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].filter,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].default_action,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].myHandler,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].routineType,
//                                     testcaseList[i].stackCfgList[j].handlerList[m].runSum,
//                                 )
//                                 assert(!ret.err,`${testcaseList[i].stackCfgList[j].deviceName} 添加 ${testcaseList[i].stackCfgList[j].handlerList[m].id } 失败`)
//                             }
                            
//                         }
//                         //开始监听是否运行handler 
//                         let check =  handlerManager.startHandlerCheck(10*1000);
                        
//                         //Post 操作
//                         const req1: cyfs.NONPostObjectOutputRequest = {
            
//                             object:  cyfs.NONObjectInfo.new_from_object_raw(info.object_raw).unwrap(),//info.saveObjectId,
//                             common: {
//                                 //req_path: "/qa/put_object",
//                                 level: cyfs.NONAPILevel.Router,
//                                 target: cyfs.ObjectId.from_base_58(testcaseList[i].opt.target.peerId).unwrap(),
//                                 dec_id,
//                                 flags: 0,
//                             }
//                         };
//                         //post 只校验handler触发
//                         const post_ret = await getStack(testcaseList[i].opt.source.stack).non_service().post_object(req1);
//                         console.info('post_object result:', post_ret);
//                         //检查监听事件是否触发
//                         let handlerResult = await check
//                         console.info(`Post_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
//                         assert(!handlerResult.err,handlerResult.log)
       
                        
                        
//                     })
//                 })
//             }
            
//          }
         
         
//      }
//  })
