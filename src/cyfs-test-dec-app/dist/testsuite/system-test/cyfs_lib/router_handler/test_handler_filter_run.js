"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const cyfs = __importStar(require("../../../../cyfs"));
const myHandler = __importStar(require("../../../../dec-app-base/tool/handler"));
// TO_FIX : filter 表达式测试用例长期未维护 
const handlerManager = new myHandler.HandlerManager(); //用来回收handler 和监听校验handler触发
const dec_app_1 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device1decapp");
const dec_app_2 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device2decapp");
let dec_id = dec_app_1.to_base_58();
let zone1device1;
let zone1device2;
let system_stack;
const testList = [
    { filter: `obj_type == ${cyfs.CoreObjectType.Text}`, type: '合法字符集（数字）' },
    { filter: `dec_id == ${dec_id}`, type: '合法字符集（字母）' },
    { filter: `obj_type == 41`, type: '整数常量十进制' },
    { filter: `obj_type == 0b101001`, type: '整数常量二进制(0b)' },
    { filter: `obj_type == 0B101001`, type: '整数常量二进制(0B)' },
    { filter: `obj_type == 0o51`, type: '整数常量八进制(0o)' },
    { filter: `obj_type == 0O51`, type: '整数常量八进制(0O)' },
    { filter: `obj_type == 0x29`, type: '整数常量十六进制(0x)' },
    { filter: `obj_type == 0X29`, type: '整数常量十六进制(0X)' },
    { filter: `obj_type == ${cyfs.CoreObjectType.Text} && true`, type: '布尔常量true' },
    { filter: `!(obj_type == ${cyfs.CoreObjectType.Text} && false)`, type: '布尔常量false' },
    { filter: `(obj_type == ${cyfs.CoreObjectType.Text} && 1)`, type: '布尔常量1' },
    { filter: `!(obj_type == ${cyfs.CoreObjectType.Text} && 0)`, type: '布尔常量0' },
    { filter: `*`, type: '特殊表达式*' },
    { filter: `obj_type != $none`, type: '数据类型None' },
    { filter: `dec_id == ${dec_id}`, type: '数据类型string' },
    { filter: `obj_type == ${cyfs.CoreObjectType.Text} && dec_id == ${dec_id}`, type: '数据类型bool' },
    { filter: `obj_type == ${cyfs.CoreObjectType.Text}`, type: '数据类型U16' },
    { filter: `obj_type <= ${cyfs.CoreObjectType.Text}`, type: '运算类型<=' },
    { filter: `obj_type < ${cyfs.CoreObjectType.FriendOption}`, type: '运算类型<' },
    { filter: `obj_type >= ${cyfs.CoreObjectType.Storage}`, type: '运算类型>=' },
    { filter: `obj_type > ${cyfs.CoreObjectType.Storage}`, type: '运算类型>' },
    { filter: `obj_type == ${cyfs.CoreObjectType.Text}`, type: '运算类型==' },
    { filter: `obj_type != ${cyfs.CoreObjectType.Text} || true`, type: '运算类型||' },
    { filter: `obj_type == ${cyfs.CoreObjectType.Text} && true`, type: '运算类型&&' },
    { filter: `obj_type == ${cyfs.CoreObjectType.Text} && !(obj_type&0)`, type: '运算类型&' },
    { filter: `obj_type == ${cyfs.CoreObjectType.Text} && !(!(obj_type|0))`, type: '运算类型|' },
    { filter: `obj_type == ${cyfs.CoreObjectType.Text} && (obj_type^10)`, type: '运算类型^' },
    { filter: `obj_type == ${cyfs.CoreObjectType.Text} && !(obj_type != ${cyfs.CoreObjectType.Text})`, type: '运算类型!' },
    { filter: `!(obj_type != ${cyfs.CoreObjectType.Text})`, type: '括号使用' }
];
describe('cyfs sdk router handler filter测试', function () {
    before(async function () {
        //用例执行的前置操作
    });
    after(async function () {
        //用例执行的数据回收操作
    });
    describe('运算符类型测试', function () {
        let handlerList = []; //用来临时缓存每个用例的handler 列表便于回收所有handler
        for (const ff of testList.slice(0)) {
            it(`${ff.type} (用例：${ff.filter})`, async function () {
                //await test(ff.filter, ff.type, 10)
            });
        }
    });
});
// async function test(filter: string, type: string, index: number){
//     let handlerList : Array<{chain: cyfs.RouterHandlerChain,stack:cyfs.SharedCyfsStack,type:cyfs.RouterHandlerCategory,id:string}> = []//用来临时缓存每个用例的handler 列表便于回收所有handler
//     const errorTextFunc = (type: string, success: boolean) => {
//         return success ? `${type}: 测试通过` : `${type}: 测试失败`
//     }
//     const obj_type = cyfs.CoreObjectType.FriendList
//     const owner_id = cyfs.ObjectId.from_base_58(simulator.zone1.peopleId).unwrap();
//     const dec_id = cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap();
//     const obj = cyfs.TextObject.create(cyfs.Some(owner_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
//     const object_id = obj.desc().calculate_id();
//     const object_raw = obj.to_vec().unwrap();
//     console.info('object_id----------', object_id, obj_type)
//     const time = new Date().getTime()
//     const  pre_noc_handler_id = `handler_filter_test_${1}`
//     handlerManager.addHandler( 
//         simulator.zone1.device1.name,
//         getStack(simulator.zone1.device1.name),
//         cyfs.RouterHandlerCategory.PutObject,
//         cyfs.RouterHandlerChain.PreNOC,
//         "put-object-handler-002",
//         cyfs.RouterHandlerCategory.PutObject ,
//         -1,
//         `obj_type == 41`,
//         cyfs.RouterHandlerAction.Default, 
//         myHandler.PutObjectHandlerDefault,
//         "PutObjectHandlerDefault",
//         1
//         )
//     const handler_put1 = new myHandler.PutObjectHandlerDefault(simulator.zone1.device1.name,pre_noc_handler_id,cyfs.RouterHandlerChain.PreNOC);
//     const ret1 = await zone1_device1_stack.router_handlers().add_put_object_handler(
//         cyfs.RouterHandlerChain.PreNOC,
//         pre_noc_handler_id,
//         0,
//         filter,
//         cyfs.RouterHandlerAction.Default,
//         cyfs.Some(handler_put1)
//     );                         
//     //添加的handler 加入用例执行完后的回收列表
//     handlerList.push({chain:cyfs.RouterHandlerChain.PreNOC,stack:zone1_device1_stack,type:cyfs.RouterHandlerCategory.PutObject,id:pre_noc_handler_id})
//     //创建一个监听事件，检查handler是否执行
//     let handlerManager = new myHandler.handlerManager();
//     let checkPut = handlerManager.startHandlerCheck(2000)            
//     const req: cyfs.NONPutObjectOutputRequest = {
//         common: {
//             dec_id,
//             flags: 0,
//             target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
//             level: cyfs.NONAPILevel.NOC //设置路由类型
//         },
//         object: new cyfs.NONObjectInfo(object_id, object_raw)
//     };
//     const put_ret = await zone1_device1_stack.non_service().put_object(req);
//     //校验结果
//     // console.info('put_object result:', put_ret);
//     let handlerResult = await checkPut;
//     console.info(`put_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
//     assert(!handlerResult.err)
//     console.info("ret-------------------", ret1, JSON.stringify(ret1));   
// }
