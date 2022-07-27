import assert = require('assert'); 
import * as cyfs from "../../cyfs_node/cyfs_node"
import {stack, stackInfo,ZoneSimulator} from "../../common/utils";
import * as myHandler from "./handler"

import * as path from "path"
import * as fs from 'fs-extra';

//初始化日志
cyfs.clog.enable_file_log({
    name: "unittest_stack_interface",
    dir: cyfs.get_app_log_dir("unittest_stack_interface"),
    file_max_size: 1024 * 1024 *10,
    file_max_count: 10,
});

async function createTestObject(stack:cyfs.SharedCyfsStack,peerId:string) {
    const saveobjectOwner = cyfs.ObjectId.from_base_58(peerId).unwrap()
    const saveobject = cyfs.TextObject.create(cyfs.Some(saveobjectOwner), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
    const saveObjectId = saveobject.desc().calculate_id();
    console.info(`will put_object: id=${saveObjectId},object value = ${saveobject.value} `);
    const object_raw = saveobject.to_vec().unwrap();
    const req: cyfs.NONPutObjectOutputRequest = {
        common: {
            dec_id:saveobjectOwner,
            flags: 0,
            //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
            level: cyfs.NONAPILevel.NOC //设置路由类型
        },
        object: new cyfs.NONObjectInfo(saveObjectId, object_raw)
    };
    const put_ret = await stack.non_service().put_object(req);
    //校验结果
    console.info('put_object result:', put_ret);
    assert(!put_ret.err);
    return {saveobject,saveObjectId,saveobjectOwner,object_raw}  
}


const handlerManager = new myHandler.handlerManager(); //用来回收handler 和监听校验handler触发
let stack_runtime  = cyfs.SharedCyfsStack.open_runtime();
let stack_ood = cyfs.SharedCyfsStack.open_default();

describe("SharedCyfsStack NON相关接口测试",function(){
    this.timeout(0);
    before(async function(){
        //测试前置条件，连接测试runtime 和 ood 
        fs.mkdirpSync(path.join(__dirname,'test_cache_file/source'))
        fs.mkdirpSync(path.join(__dirname,'test_cache_file/target'))
        await ZoneSimulator.init();
        stack_runtime = ZoneSimulator.zone1_device1_stack!;
        stack_ood = ZoneSimulator.zone1_ood_stack!;
        ZoneSimulator.zone1_people
        
    })
    afterEach(async ()=>{
        //每个函数执行前，清除所有handler
        await handlerManager.clearAllHandler();
        //fs.removeSync(path.join(__dirname,'test_cache_file'))
        console.info(`#########用例执行完成`);
    })
    
    describe("NON接口测试",async()=>{
    
        describe("#协议栈NONRequestor相关接口",async()=>{
            describe("#协议栈NONRequestor 内put_object接口",async()=>{
                it("NONRequestor调用put_object正常流程",async()=>{
                   
                    const obj = cyfs.TextObject.create(cyfs.Some( cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
                    const object_id = obj.desc().calculate_id();
                    console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
                    const object_raw = obj.to_vec().unwrap();
                    const req2: cyfs.NONPutObjectOutputRequest = {
                        common: {
                            req_path: "/qa/put_object",
                            dec_id:stackInfo.appID,
                            flags: 0,
                            target: stack_ood.local_device_id().object_id,
                            level: cyfs.NONAPILevel.Router //设置路由类型
                        },
                        object: new cyfs.NONObjectInfo(object_id, object_raw)
                    };
                    const put_ret2 = await stack_runtime.non_service().put_object(req2);
                    assert(!put_ret2.err,`put object failed,err : ${JSON.stringify(put_ret2)}`)
                })               
            })
            describe("#协议栈NONRequestor 内get_objec接口",async()=>{
                it("NONRequestor调用get_object正常流程",async()=>{
                    let info =  await createTestObject(stack_ood,stack_ood.local_device_id().to_base_58())
                    const req1: cyfs.NONGetObjectOutputRequest = {
                        object_id:info.saveObjectId,
                        common: {
                            req_path: "/qa/get_object",
                            level: cyfs.NONAPILevel.Router,
                            target: info.saveobjectOwner,
                            dec_id:stackInfo.appID,
                            flags: 0,
                        }
                    };
                    const get_ret = await stack_runtime.non_service().get_object(req1);
                    console.info('get_object result:', get_ret);
                    assert(!get_ret.err);
                }) 
            })
            describe("#协议栈NONRequestor 内delete_object接口",async()=>{
                it("NONRequestor调用delete_object正常流程",async()=>{
                    let info =  await createTestObject(stack_ood,stack_ood.local_device_id().to_base_58())
                    const req4: cyfs.NONDeleteObjectOutputRequest = {
                        common:  {
                            dec_id:stackInfo.appID,
                            level: cyfs.NONAPILevel.Router,               
                            flags: 0,
                            target: info.saveobjectOwner,
                        },
                        object_id: info.saveObjectId,
        
                    };
                    const delete_ret = await stack_runtime.non_service().delete_object(req4);
                    console.info('delete_object result:', delete_ret);
                    assert(!delete_ret.err);
                }) 
            })
            describe("#协议栈NONRequestor 内select_object接口",async()=>{
                it("NONRequestor调用select_object正常流程",async()=>{
                    //select 操作
                    let filter: cyfs.SelectFilter = {
                        obj_type: 41,
                        obj_type_code:cyfs.ObjectTypeCode.Custom,
                    }
                    const req2: cyfs.NONSelectObjectOutputRequest = {
                        common: {    
                            dec_id:stackInfo.appID,
                            level: cyfs.NONAPILevel.Router,               
                            flags: 0,
                            target: stack_ood.local_device_id().object_id,
                        },
                        filter,
                        opt: {
                            page_size : 10,
                            page_index : 0
                        }
                    };
                    const select_ret = await stack_runtime.non_service().select_object(req2);
                    console.info('select_object result:', select_ret.unwrap());
                    assert(!select_ret.err);
                }) 
            })
            describe("#协议栈NONRequestor 内post_object接口",async()=>{
                it("NONRequestor调用post_object正常流程",async()=>{
                    let info =  await createTestObject(stack_runtime,stack_runtime.local_device_id().to_base_58());
                    const ret01 = await handlerManager.addHandler(
                        `${stack_ood.local_device_id().to_base_58()}`,
                        stack_ood,
                        cyfs.RouterHandlerCategory.PostObject,
                        cyfs.RouterHandlerChain.PreRouter,
                        "post-object-handler-001" ,
                        -1,
                        `dec_id == ${stackInfo.appID.to_base_58()}`,
                        cyfs.RouterHandlerAction.Default,
                        myHandler.PostObjectHandlerDefault,
                        "PostObjectHandlerDefault",
                        1,
                    )
                    let check =  handlerManager.startHandlerCheck(10*1000);    
                    const req1: cyfs.NONPostObjectOutputRequest = {

                        object:  cyfs.NONObjectInfo.new_from_object_raw(info.object_raw).unwrap(),//info.saveObjectId,
                        common: {
                            req_path: "/qa/post_object",
                            level: cyfs.NONAPILevel.Router,
                            target: stack_ood.local_device_id().object_id,
                            dec_id:stackInfo.appID,
                            flags: 0,
                        }
                    };
                    const post_ret = await stack_runtime.non_service().post_object(req1);
                    console.info('post_object result:', post_ret);
                    //检查监听事件是否触发
                    let handlerResult = await check
                    console.info(`post_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
                    assert(!handlerResult.err)
                }) 
            })
    
        })
        describe("#router_handlers 相关接口",async()=>{
            describe("#协议栈router_handlers 内add_put_object_handler接口",async()=>{
                it.only("router_handlers调用add_put_object_handler正常流程",async()=>{
                    const ret01 = await handlerManager.addHandler(
                        `${stack_ood.local_device_id().to_base_58()}`,
                        stack_ood,
                        cyfs.RouterHandlerCategory.PutObject,
                        cyfs.RouterHandlerChain.PreRouter,
                        "put-object-handler-001" ,
                        -1,
                        `dec_id == ${stackInfo.appID.to_base_58()}`,
                        cyfs.RouterHandlerAction.Default,
                        myHandler.PutObjectHandlerDefault,
                        "PutObjectHandlerDefault",
                        1,
                    )
                    let check =  handlerManager.startHandlerCheck(10*1000);
                    const obj = cyfs.TextObject.create(cyfs.Some( cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
                    const object_id = obj.desc().calculate_id();
                    console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
                    const object_raw = obj.to_vec().unwrap();
                    const req2: cyfs.NONPutObjectOutputRequest = {
                        common: {
                            req_path: "/qa/put_object",
                            dec_id:stackInfo.appID,
                            flags: 0,
                            target: stack_ood.local_device_id().object_id,
                            level: cyfs.NONAPILevel.Router //设置路由类型
                        },
                        object: new cyfs.NONObjectInfo(object_id, object_raw)
                    };
                    const put_ret2 = await stack_runtime.non_service().put_object(req2);
                    assert(!put_ret2.err,`put object failed,err : ${JSON.stringify(put_ret2)}`)
                    //检查监听事件是否触发
                    let handlerResult = await check
                    console.info(`post_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
                    assert(!handlerResult.err)
                })               
            })
            describe("#协议栈router_handlers内add_get_object_handler接口",async()=>{
                it("router_handlers调用add_get_object_handler正常流程",async()=>{
                    const ret01 = await handlerManager.addHandler(
                        `${stack_ood.local_device_id().to_base_58()}`,
                        stack_ood,
                        cyfs.RouterHandlerCategory.GetObject,
                        cyfs.RouterHandlerChain.PreRouter,
                        "get-object-handler-001" ,
                        -1,
                        `dec_id == ${stackInfo.appID.to_base_58()}`,
                        cyfs.RouterHandlerAction.Default,
                        myHandler.GetObjectHandlerDefault,
                        "GetObjectHandlerDefault",
                        1,
                    )
                    let check =  handlerManager.startHandlerCheck(10*1000);
                    let info =  await createTestObject(stack_ood,stack_ood.local_device_id().to_base_58())
                    const req1: cyfs.NONGetObjectOutputRequest = {
                        object_id:info.saveObjectId,
                        common: {
                            req_path: "/qa/get_object",
                            level: cyfs.NONAPILevel.Router,
                            target: info.saveobjectOwner,
                            dec_id:stackInfo.appID,
                            flags: 0,
                        }
                    };
                    const get_ret = await stack_runtime.non_service().get_object(req1);
                    console.info('get_object result:', get_ret);
                    assert(!get_ret.err);
                    //检查监听事件是否触发
                    let handlerResult = await check
                    console.info(`post_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
                    assert(!handlerResult.err)
                }) 
            })
            describe("#协议栈router_handlers 内add_delete_object_handler接口",async()=>{
                it("router_handlers调用add_delete_object_handler正常流程",async()=>{
                    const ret01 = await handlerManager.addHandler(
                        `${stack_ood.local_device_id().to_base_58()}`,
                        stack_ood,
                        cyfs.RouterHandlerCategory.DeleteObject,
                        cyfs.RouterHandlerChain.PreRouter,
                        "delete-object-handler-001" ,
                        -1,
                        `dec_id == ${stackInfo.appID.to_base_58()}`,
                        cyfs.RouterHandlerAction.Default,
                        myHandler.DeleteObjectHandlerDefault,
                        "DeleteObjectHandlerDefault",
                        1,
                    )
                    let check =  handlerManager.startHandlerCheck(10*1000);  
                    let info =  await createTestObject(stack_ood,stack_ood.local_device_id().to_base_58())
                    const req4: cyfs.NONDeleteObjectOutputRequest = {
                        common:  {
                            dec_id:stackInfo.appID,
                            level: cyfs.NONAPILevel.Router,               
                            flags: 0,
                            target: info.saveobjectOwner,
                        },
                        object_id: info.saveObjectId,
        
                    };
                    const delete_ret = await stack_runtime.non_service().delete_object(req4);
                    console.info('delete_object result:', delete_ret);
                    assert(!delete_ret.err);
                    //检查监听事件是否触发
                    let handlerResult = await check
                    console.info(`post_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
                    assert(!handlerResult.err)
                }) 
            })
            describe("#协议栈router_handlers 内add_select_object_handler接口",async()=>{
                it("router_handlers调用add_select_object_handler正常流程",async()=>{
                    const ret01 = await handlerManager.addHandler(
                        `${stack_ood.local_device_id().to_base_58()}`,
                        stack_ood,
                        cyfs.RouterHandlerCategory.SelectObject,
                        cyfs.RouterHandlerChain.PreRouter,
                        "select-object-handler-001" ,
                        -1,
                        `dec_id == ${stackInfo.appID.to_base_58()}`,
                        cyfs.RouterHandlerAction.Default,
                        myHandler.SelectObjectHandlerDefault,
                        "SelectObjectHandlerDefault",
                        1,
                    )
                    let check =  handlerManager.startHandlerCheck(10*1000);  
                    //select 操作
                    let filter: cyfs.SelectFilter = {
                        obj_type: 41,
                        obj_type_code:cyfs.ObjectTypeCode.Custom,
                    }
                    const req2: cyfs.NONSelectObjectOutputRequest = {
                        common: {    
                            dec_id:stackInfo.appID,
                            level: cyfs.NONAPILevel.Router,               
                            flags: 0,
                            target: stack_ood.local_device_id().object_id,
                        },
                        filter,
                        opt: {
                            page_size : 10,
                            page_index : 0
                        }
                    };
                    const select_ret = await stack_runtime.non_service().select_object(req2);
                    console.info('select_object result:', select_ret.unwrap());
                    assert(!select_ret.err);
                    //检查监听事件是否触发
                    let handlerResult = await check
                    console.info(`post_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
                    assert(!handlerResult.err)
                }) 
            })
            describe("#协议栈router_handlers 内add_post_object_handler接口",async()=>{
                it("router_handlers调用add_post_object_handler正常流程",async()=>{
                    let info =  await createTestObject(stack_runtime,stack_runtime.local_device_id().to_base_58());
                    const ret01 = await handlerManager.addHandler(
                        `${stack_ood.local_device_id().to_base_58()}`,
                        stack_ood,
                        cyfs.RouterHandlerCategory.PostObject,
                        cyfs.RouterHandlerChain.PreRouter,
                        "post-object-handler-001" ,
                        -1,
                        `dec_id == ${stackInfo.appID.to_base_58()}`,
                        cyfs.RouterHandlerAction.Default,
                        myHandler.PostObjectHandlerDefault,
                        "PostObjectHandlerDefault",
                        1,
                    )
                    let check =  handlerManager.startHandlerCheck(10*1000);    
                    const req1: cyfs.NONPostObjectOutputRequest = {

                        object:  cyfs.NONObjectInfo.new_from_object_raw(info.object_raw).unwrap(),//info.saveObjectId,
                        common: {
                            req_path: "/qa/post_object",
                            level: cyfs.NONAPILevel.Router,
                            target: stack_ood.local_device_id().object_id,
                            dec_id:stackInfo.appID,
                            flags: 0,
                        }
                    };
                    const post_ret = await stack_runtime.non_service().post_object(req1);
                    console.info('post_object result:', post_ret);
                    //检查监听事件是否触发
                    let handlerResult = await check
                    console.info(`post_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
                    assert(!handlerResult.err)
                }) 
            })
                       
            describe("#协议栈router_handlers 内crypto相关add_sign_object_handler和add_verify_object_handler接口",async()=>{
                it("crypto 调用 sign_object、verify_object对对象签名并且进行校验正常流程",async()=>{
                    const ret01 = await handlerManager.addHandler(
                        `${stack_ood.local_device_id().to_base_58()}`,
                        stack_ood,
                        cyfs.RouterHandlerCategory.SignObject,
                        cyfs.RouterHandlerChain.PreCrypto,
                        "sign-object-handler-002" ,
                        -1,
                        `dec_id == ${stackInfo.appID.to_base_58()}`,
                        cyfs.RouterHandlerAction.Default,
                        myHandler.CryptoHandlerDefault,
                        "CryptoHandlerDefault",
                        1,
                    )
                    assert(!ret01.err)
                    const ret02 = await handlerManager.addHandler(
                        `${stack_ood.local_device_id().to_base_58()}`,
                        stack_ood,
                        cyfs.RouterHandlerCategory.VerifyObject,
                        cyfs.RouterHandlerChain.PreCrypto,
                        "verify-object-handler-001" ,
                        -1,
                        `dec_id == ${stackInfo.appID.to_base_58()}`,
                        cyfs.RouterHandlerAction.Default,
                        myHandler.CryptoHandlerDefault,
                        "CryptoHandlerDefault",
                        1,
                    )
                    assert(!ret02.err)
                    let check =  handlerManager.startHandlerCheck(10*1000);    
                    //(1) put object
                    const obj = cyfs.TextObject.create(cyfs.Some(stack_ood.local_device_id().object_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
                    const object_id = obj.desc().calculate_id();
                    // 对对象进行签名
                    console.info(`will sign object: id=${object_id},object value = ${obj.value} `);
                    const crypto = stack_ood.crypto();
                    const resp = (await crypto.sign_object({
                        common: {flags: 0},
                        object: new cyfs.NONObjectInfo(obj.desc().calculate_id(), obj.encode_to_buf().unwrap()),
                        flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE|cyfs.CRYPTO_REQUEST_FLAG_SIGN_SET_DESC|cyfs.CRYPTO_REQUEST_FLAG_SIGN_SET_BODY
                    })).unwrap();
                    assert(resp.result === cyfs.SignObjectResult.Signed, "check sign result failed");
                    const signed_obj = new cyfs.TextObjectDecoder().from_raw(resp.object!.object_raw).unwrap();
                    assert(signed_obj.signs().desc_signs().unwrap().length === 1, "check desc signs failed");
                    assert(signed_obj.signs().body_signs().unwrap().length === 1, "check body signs failed");
                    console.log("test sign object success");
                    //校验对象签名
                    {
                        const resp2 = (await crypto.verify_object({
                            common: {flags: 0},
                            sign_type: cyfs.VerifySignType.Both,
                            object: resp.object!,
                            sign_object: cyfs.VerifyObjectType.Owner()
                        })).unwrap();
                        console.info(JSON.stringify(resp2))
                        assert(resp2.result.valid, "check verify result failed")
                        console.log("test verify object by owner success");
                    }
                    //  //检查监听事件是否触发
                    //  let handlerResult = await check
                    //  console.info(`post_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
                    //  assert(!handlerResult.err)
                })
            })
        })
        describe("#crypto 相关接口",async()=>{
            it("crypto 调用 sign_object、verify_object对对象签名并且进行校验正常流程",async()=>{
                //(1) put object
                const obj = cyfs.TextObject.create(cyfs.Some(stack_ood.local_device_id().object_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
                const object_id = obj.desc().calculate_id();
                // 对对象进行签名
                console.info(`will sign object: id=${object_id},object value = ${obj.value} `);
                const crypto = stack_ood.crypto();
                const resp = (await crypto.sign_object({
                    common: {flags: 0},
                    object: new cyfs.NONObjectInfo(obj.desc().calculate_id(), obj.encode_to_buf().unwrap()),
                    flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE|cyfs.CRYPTO_REQUEST_FLAG_SIGN_SET_DESC|cyfs.CRYPTO_REQUEST_FLAG_SIGN_SET_BODY
                })).unwrap();
                assert(resp.result === cyfs.SignObjectResult.Signed, "check sign result failed");
                const signed_obj = new cyfs.TextObjectDecoder().from_raw(resp.object!.object_raw).unwrap();
                assert(signed_obj.signs().desc_signs().unwrap().length === 1, "check desc signs failed");
                assert(signed_obj.signs().body_signs().unwrap().length === 1, "check body signs failed");
                console.log("test sign object success");
                //校验对象签名
                {
                    const resp2 = (await crypto.verify_object({
                        common: {flags: 0},
                        sign_type: cyfs.VerifySignType.Both,
                        object: resp.object!,
                        sign_object: cyfs.VerifyObjectType.Owner()
                    })).unwrap();
                    assert(resp2.result.valid, "check verify result failed")
                    console.log("test verify object by owner success");
                }
            
            })
        })
    }) 
})

