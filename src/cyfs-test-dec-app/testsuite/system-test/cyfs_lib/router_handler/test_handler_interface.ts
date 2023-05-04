import assert  from 'assert';
import * as cyfs from '../../../../cyfs';
import { StackManager,ActionManager} from "../../../../cyfs-test-util"
import * as myHandler from "../../../../dec-app-base/tool/handler"
import { ErrorCode, RandomGenerator, sleep ,Logger} from '../../../../common';

import * as action_api from "../../../../dec-app-action"

async function createTestObject(stack: cyfs.SharedCyfsStack, peerId: string, access?: cyfs.AccessString, req_path?: string) {
    // peerId stack_runtime.local_device_id().to_base_58()
    const saveobjectOwner = cyfs.ObjectId.from_base_58(peerId).unwrap()
    const saveobject = cyfs.TextObject.create(saveobjectOwner, 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
    const saveObjectId = saveobject.desc().calculate_id();
    console.info(`will put_object: id=${saveObjectId},object value = ${saveobject.value} `);
    const object_raw = saveobject.to_vec().unwrap();
    const req: cyfs.NONPutObjectOutputRequest = {
        common: {
            req_path: req_path,
            dec_id: undefined,
            flags: 0,
            target: cyfs.ObjectId.from_base_58(peerId).unwrap(),
            level: cyfs.NONAPILevel.NOC //设置路由类型
        },
        object: new cyfs.NONObjectInfo(saveObjectId, object_raw),
        access: access
    };
    const put_ret = await stack.non_service().put_object(req);
    //校验结果
    console.info('put_object result:', put_ret);
    assert(!put_ret.err, `put object failed,err : ${JSON.stringify(put_ret)}`);
    return { saveobject, saveObjectId, saveobjectOwner, object_raw }
}

const handlerManager = new myHandler.HandlerManager(); //用来回收handler 和监听校验handler触发
const dec_app_1 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device1decapp")
const dec_app_2 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device2decapp")

let zone1device1: cyfs.SharedCyfsStack;
let zone1device2: cyfs.SharedCyfsStack;
let system_stack: cyfs.SharedCyfsStack


describe("SharedCyfsStack NON相关接口测试", function () {
    
    
    const stack_manager = StackManager.createInstance();
    let sysdec = cyfs.get_system_dec_app().object_id;
    let logger : Logger;
    const data_manager = ActionManager.createInstance();
    beforeAll(async function () {
        //测试前置条件，连接测试模拟器设备
        await stack_manager.init();
        
        await sleep(5000);
        // 所有节点 实例化一个 Http Requestor dec_app_1 协议栈
        let dec_app_1_client =  await stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.Http, dec_app_1);
        let system_dec_app = cyfs.get_system_dec_app().object_id
        let dec_app_2_client = await stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.Http,system_dec_app);
        assert.equal(dec_app_1_client.err,0,dec_app_1_client.log)
        assert.equal(dec_app_2_client.err,0,dec_app_2_client.log)
        console.info(`############用例执开始执行`);
        zone1device1 = stack_manager.get_cyfs_satck({
            peer_name : "zone1_device1",
            type : cyfs.CyfsStackRequestorType.Http,
            dec_id : dec_app_1.to_base_58() 
        }).stack!; 
        system_stack =stack_manager.get_cyfs_satck({
            peer_name : "zone1_device1",
            type : cyfs.CyfsStackRequestorType.Http,
            dec_id :cyfs.get_system_dec_app().object_id.to_base_58()
        }).stack!; 
        zone1device2 = stack_manager.get_cyfs_satck({
            peer_name : "zone1_device2",
            type : cyfs.CyfsStackRequestorType.Http,
            dec_id : dec_app_1.to_base_58() 
        }).stack!;
    })
    afterAll(async () => {
        // 停止测试模拟器
        stack_manager.destory();
        // 停止测试驱动
        await stack_manager.driver!.stop();
        // 保存测试记录
        data_manager.save_history_to_file("E:\\log");
    })
    let report_result: {
        title: string;
        value: any;
    };
    beforeEach(function () {
        // 设置当前用例id 方便日志定位问题
        let testcase_id = `Testcase-${RandomGenerator.string(10)}-${Date.now()}`;
        data_manager.update_current_testcase_id(testcase_id);

        console.info(`\n\n########### ${testcase_id} 开始运行###########\n\n`)
    })
    afterEach(function () {
        // 将当前用例执行记录到history
        let current_actions = data_manager.report_current_actions();
        console.info(`########### ${current_actions.testcase_id} 运行结束`)
        report_result = {
            title: `用例: ${current_actions.testcase_id}`,
            value: current_actions.action_list
        };
        // addContext.default(this, report_result);
    });
    describe("#router-handlers冒烟", async () => {
        beforeEach(async function () {
            zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, dec_app_1).clear_access()
        })
        afterEach(async function () {
            zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, dec_app_1).clear_access()
            handlerManager.clearAllHandler()
        })
        it("添加hook handler prerouter put_object默认action", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_router/put_object/",
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)

            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_put_object_handler(
                cyfs.RouterHandlerChain.PreNOC,
                "put_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                new myHandler.PutObjectHandlerDefault("zone1device1", "put_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: dec_app_1,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router,
                },
                access: undefined,
                object: new cyfs.NONObjectInfo(info.saveObjectId, info.object_raw)
            };
            const put_ret = await zone1device1.non_service().put_object(put_req);
            console.log(put_ret)
            assert(!put_ret.err, `put object failed,err : ${JSON.stringify(put_ret)}`)

        })
        it("添加hook handler prerouter put_object pass", async () => {

            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_noc/put_object/",
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)

            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_put_object_handler(
                cyfs.RouterHandlerChain.PreNOC,
                "put_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Pass,
                new myHandler.PutObjectHandlerPass("zone1device1", "put_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router,
                },
                access: undefined,
                object: new cyfs.NONObjectInfo(info.saveObjectId, info.object_raw)
            };
            const put_ret = await zone1device1.non_service().put_object(put_req);
            console.log(put_ret)
            assert(!put_ret.err, `put object failed,err : ${JSON.stringify(put_ret)}`)

            // //检查监听事件是否触发
            // let handlerResult = await check
            // console.info(`post_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
            // assert(!handlerResult.err)
        })
        it("添加hook handler prerouter put_object response", async () => {

            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_noc/put_object/",
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)

            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_put_object_handler(
                cyfs.RouterHandlerChain.PreNOC,
                "put_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Response,
                new myHandler.PutObjectHandlerResponse("zone1device1", "put_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router,
                },
                access: undefined,
                object: new cyfs.NONObjectInfo(info.saveObjectId, info.object_raw)
            };
            const put_ret = await zone1device1.non_service().put_object(put_req);
            console.log(put_ret)
            assert(!put_ret.err, `put object failed,err : ${JSON.stringify(put_ret)}`)

            // //检查监听事件是否触发
            // let handlerResult = await check
            // console.info(`post_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
            // assert(!handlerResult.err)
        })
        it("添加hook handler prerouter put_object reject", async () => {

            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_noc/put_object/",
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)

            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_put_object_handler(
                cyfs.RouterHandlerChain.PreNOC,
                "put_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Reject,
                new myHandler.PutObjectHandlerReject("zone1device1", "put_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router,
                },
                access: undefined,
                object: new cyfs.NONObjectInfo(info.saveObjectId, info.object_raw)
            };
            const put_ret = await zone1device1.non_service().put_object(put_req);
            console.log(put_ret)
            assert(put_ret.err, `put object failed,err : ${JSON.stringify(put_ret)}`)

            // //检查监听事件是否触发
            // let handlerResult = await check
            // console.info(`post_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
            // assert(!handlerResult.err)
        })
        it("添加hook handler prerouter put_object drop", async () => {

            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_noc/put_object/",
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)

            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_put_object_handler(
                cyfs.RouterHandlerChain.PreNOC,
                "put_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Drop,
                new myHandler.PutObjectHandlerDrop("zone1device1", "put_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router,
                },
                access: undefined,
                object: new cyfs.NONObjectInfo(info.saveObjectId, info.object_raw)
            };
            const put_ret = await zone1device1.non_service().put_object(put_req);
            zone1device1.router_handlers().remove_handler(cyfs.RouterHandlerChain.PreNOC, cyfs.RouterHandlerCategory.PutObject, "put_handler_01")
            console.log(put_ret)
            assert(put_ret.err, `put object failed,err : ${JSON.stringify(put_ret)}`)
        })
        it("添加hook handler prerouter post_object default", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_router/post_object/",
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, dec_app_1, cyfs.AccessPermissions.Full)
            system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, dec_app_1);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_post_object_handler(
                cyfs.RouterHandlerChain.PreRouter,
                "post_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                new myHandler.PostObjectHandlerDefault("zone1device1", "post_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)

            // this.handlerList.push({deviceName,stack,chain,type,id,routine}) 
            // if(routine!=cyfs.None){
            //     this.checkList.push({deviceName,runSum,routineType,id})
            // }
            // let check = handlerManager.startHandlerCheck(10 * 1000);

            //给指定设备dec授权该path,不指定默认当前source
            // let rwx = new cyfs.AccessString(0o777777)
            // console.log("---------------------------> " + rwx)
            // let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(path, rwx)
            // zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, dec_app_1).add_access(item)


            const req1: cyfs.NONPostObjectOutputRequest = {

                object: cyfs.NONObjectInfo.new_from_object_raw(info.object_raw).unwrap(),//info.saveObjectId,
                common: {
                    req_path: req_path,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: dec_app_1,
                    flags: 0,
                }
            };

            const post_ret = await zone1device1.non_service().post_object(req1);
            console.info('post_object result:', post_ret);
            // //检查监听事件是否触发
            // let handlerResult = await check
            // console.info(`post_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
            // assert(!handlerResult.err)
        })
        it("添加hook handler prerouter post_object reject", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_router/post_object/",
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, dec_app_1, cyfs.AccessPermissions.Full)
            system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, dec_app_1);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_post_object_handler(
                cyfs.RouterHandlerChain.PreRouter,
                "post_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Reject,
                new myHandler.PostObjectHandlerReject("zone1device1", "post_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)

            const req1: cyfs.NONPostObjectOutputRequest = {

                object: cyfs.NONObjectInfo.new_from_object_raw(info.object_raw).unwrap(),//info.saveObjectId,
                common: {
                    req_path: req_path,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: dec_app_1,
                    flags: 0,
                }
            };
            const post_ret = await zone1device1.non_service().post_object(req1);
            console.info('post_object result:', post_ret);
        })
        it("添加hook handler prerouter get_object default", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_router/get_object/",
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, dec_app_1, cyfs.AccessPermissions.Full)
            system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, dec_app_1);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_get_object_handler(
                cyfs.RouterHandlerChain.PreRouter,
                "get_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                new myHandler.GetObjectHandlerDefault("zone1device1", "get_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)
            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: info.saveObjectId,
                common: {
                    req_path: req_path,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: undefined,
                    flags: 0,
                }
            };
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err);


        })
        it("添加hook handler prerouter get_object pass", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_router/get_object/",
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, dec_app_1, cyfs.AccessPermissions.Full)
            system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, dec_app_1);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_get_object_handler(
                cyfs.RouterHandlerChain.PreRouter,
                "get_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Pass,
                new myHandler.GetObjectHandlerPass("zone1device1", "get_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)
            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: info.saveObjectId,
                common: {
                    req_path: req_path,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: undefined,
                    flags: 0,
                }
            };
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err);


        })
        it("添加hook handler prerouter get_object reject", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_router/get_object/",
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, dec_app_1, cyfs.AccessPermissions.Full)
            system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, dec_app_1);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_get_object_handler(
                cyfs.RouterHandlerChain.PreRouter,
                "get_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Reject,
                new myHandler.GetObjectHandlerReject("zone1device1", "get_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)
            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: info.saveObjectId,
                common: {
                    req_path: req_path,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: undefined,
                    flags: 0,
                }
            };
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(get_ret.err);


        })
        it("添加hook handler prerouter get_object drop", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_router/get_object/",
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, dec_app_1, cyfs.AccessPermissions.Full)
            system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, dec_app_1);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_get_object_handler(
                cyfs.RouterHandlerChain.PreRouter,
                "get_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Drop,
                new myHandler.GetObjectHandlerDrop("zone1device1", "get_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)
            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: info.saveObjectId,
                common: {
                    req_path: req_path,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: undefined,
                    flags: 0,
                }
            };
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(get_ret.err);


        })
        it("添加hook handler prerouter delete_object default", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_router/delete_object/",
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, dec_app_1);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_delete_object_handler(
                cyfs.RouterHandlerChain.PreRouter,
                "delete_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                new myHandler.DeleteObjectHandlerDefault("zone1device1", "delete_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: undefined,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                },
                object_id: info.saveObjectId,

            };
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
        })
        it("添加hook handler prerouter delete_object pass ", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_router/delete_object/",
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, dec_app_1);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_delete_object_handler(
                cyfs.RouterHandlerChain.PreRouter,
                "delete_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Pass,
                new myHandler.DeleteObjectHandlerPass("zone1device1", "delete_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: undefined,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                },
                object_id: info.saveObjectId,

            };
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
        })
        it("添加hook handler prerouter delete_object response ", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_router/delete_object/",
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, dec_app_1);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_delete_object_handler(
                cyfs.RouterHandlerChain.PreRouter,
                "delete_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Response,
                new myHandler.DeleteObjectHandlerResponse("zone1device1", "delete_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: undefined,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                },
                object_id: info.saveObjectId,

            };
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
        })
        it("添加hook handler prerouter delete_object reject ", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_router/delete_object/",
                undefined,undefined,dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, dec_app_1);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_delete_object_handler(
                cyfs.RouterHandlerChain.PreRouter,
                "delete_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Reject,
                new myHandler.DeleteObjectHandlerReject("zone1device1", "delete_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: undefined,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                },
                object_id: info.saveObjectId,

            };
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
        })
        it("添加hook handler prerouter delete_object drop ", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_router/delete_object/",
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, dec_app_1);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_delete_object_handler(
                cyfs.RouterHandlerChain.PreRouter,
                "delete_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Drop,
                new myHandler.DeleteObjectHandlerDrop("zone1device1", "delete_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: undefined,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                },
                object_id: info.saveObjectId,

            };
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
        })
        it("添加hook handler prerouter sign_object", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_router/sign_object/",
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, dec_app_1, cyfs.AccessPermissions.Full)
            system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, dec_app_1);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_sign_object_handler(
                cyfs.RouterHandlerChain.PreRouter,
                "sign_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                new myHandler.SignObjectHandlerDefault("zone1device1", "sign_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)
            // 对对象进行签名
            console.info(`will sign object: id=${info.saveObjectId},object value = ${info.saveobject.value} `);
            const crypto = zone1device1.crypto();
            const resp = (await crypto.sign_object({
                common: {
                    req_path: undefined,
                    target: undefined,
                    dec_id: sysdec,
                    flags: 0
                },
                object: new cyfs.NONObjectInfo(info.saveObjectId, info.object_raw),
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE | cyfs.CRYPTO_REQUEST_FLAG_SIGN_SET_DESC | cyfs.CRYPTO_REQUEST_FLAG_SIGN_SET_BODY
            })).unwrap();
            console.log(resp)
            assert(resp.result === cyfs.SignObjectResult.Signed, "check sign result failed");
            const signed_obj = new cyfs.TextObjectDecoder().from_raw(resp.object!.object_raw).unwrap();
            assert(signed_obj.signs().desc_signs()!.length === 1, "check desc signs failed");
            assert(signed_obj.signs().body_signs()!.length === 1, "check body signs failed");
            console.log("test sign object success");
            //校验对象签名
            {
                const resp2 = (await crypto.verify_object({
                    common: { flags: 0 },
                    sign_type: cyfs.VerifySignType.Both,
                    object: resp.object!,
                    sign_object: cyfs.VerifyObjectType.Owner()
                }));
                console.log('verify_object result:', resp2);
                assert(resp2.unwrap().result.valid, "check verify result failed")
            }
        })
        it("添加hook handler prerouter sign_object", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_router/sign_object/",
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, dec_app_1, cyfs.AccessPermissions.Full)
            system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, dec_app_1);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_sign_object_handler(
                cyfs.RouterHandlerChain.PreRouter,
                "sign_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                new myHandler.SignObjectHandlerDefault("zone1device1", "sign_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)
            // 对对象进行签名
            console.info(`will sign object: id=${info.saveObjectId},object value = ${info.saveobject.value} `);
            const crypto = zone1device1.crypto();
            const resp = (await crypto.sign_object({
                common: {
                    req_path: undefined,
                    target: undefined,
                    dec_id: sysdec,
                    flags: 0
                },
                object: new cyfs.NONObjectInfo(info.saveObjectId, info.object_raw),
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE | cyfs.CRYPTO_REQUEST_FLAG_SIGN_SET_DESC | cyfs.CRYPTO_REQUEST_FLAG_SIGN_SET_BODY
            })).unwrap();
            console.log(resp)
            assert(resp.result === cyfs.SignObjectResult.Signed, "check sign result failed");
            const signed_obj = new cyfs.TextObjectDecoder().from_raw(resp.object!.object_raw).unwrap();
            assert(signed_obj.signs().desc_signs()!.length === 1, "check desc signs failed");
            assert(signed_obj.signs().body_signs()!.length === 1, "check body signs failed");
            console.log("test sign object success");
            //校验对象签名
            {
                const resp2 = (await crypto.verify_object({
                    common: { flags: 0 },
                    sign_type: cyfs.VerifySignType.Both,
                    object: resp.object!,
                    sign_object: cyfs.VerifyObjectType.Owner()
                }));
                console.log('verify_object result:', resp2);
                assert(resp2.unwrap().result.valid, "check verify result failed")
            }
        })
        
        it("添加hook handler prerouter verify_object", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_router/verify_object/",
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, dec_app_1, cyfs.AccessPermissions.Full)
            system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, dec_app_1);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_verify_object_handler(
                cyfs.RouterHandlerChain.PreRouter,
                "sign_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                new myHandler.VerifyHandlerDefault("zone1device1", "sign_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)
            // 对对象进行签名
            console.info(`will sign object: id=${info.saveObjectId},object value = ${info.saveobject.value} `);
            const crypto = zone1device1.crypto();
            const resp = (await crypto.sign_object({
                common: {
                    req_path: undefined,
                    target: undefined,
                    dec_id: sysdec,
                    flags: 0
                },
                object: new cyfs.NONObjectInfo(info.saveObjectId, info.object_raw),
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE | cyfs.CRYPTO_REQUEST_FLAG_SIGN_SET_DESC | cyfs.CRYPTO_REQUEST_FLAG_SIGN_SET_BODY
            })).unwrap();
            console.log(resp)
            assert(resp.result === cyfs.SignObjectResult.Signed, "check sign result failed");
            const signed_obj = new cyfs.TextObjectDecoder().from_raw(resp.object!.object_raw).unwrap();
            assert(signed_obj.signs().desc_signs()!.length === 1, "check desc signs failed");
            assert(signed_obj.signs().body_signs()!.length === 1, "check body signs failed");
            console.log("test sign object success");
            //校验对象签名
            {
                const resp2 = (await crypto.verify_object({
                    common: { flags: 0 },
                    sign_type: cyfs.VerifySignType.Both,
                    object: resp.object!,
                    sign_object: cyfs.VerifyObjectType.Owner()
                }));
                console.log('verify_object result:', resp2);
                assert(resp2.unwrap().result.valid, "check verify result failed")
            }
        })
        it("添加普通handler put_object default", async () => {
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_put_object_handler(
                cyfs.RouterHandlerChain.Handler,
                "put_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                new myHandler.PutObjectHandlerDefault("zone1device1", "put_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router,
                },
                access: undefined,
                object: new cyfs.NONObjectInfo(info.saveObjectId, info.object_raw)
            };
            const put_ret = await zone1device1.non_service().put_object(put_req);
            console.log(put_ret)
            assert(!put_ret.err, `put object failed,err : ${JSON.stringify(put_ret)}`)
        })
        it("添加普通handler put_object pass", async () => {
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_put_object_handler(
                cyfs.RouterHandlerChain.Handler,
                "put_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Pass,
                new myHandler.PutObjectHandlerPass("zone1device1", "put_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router,
                },
                access: undefined,
                object: new cyfs.NONObjectInfo(info.saveObjectId, info.object_raw)
            };
            const put_ret = await zone1device1.non_service().put_object(put_req);
            console.log(put_ret)
            assert(!put_ret.err, `put object failed,err : ${JSON.stringify(put_ret)}`)
        })
        it("添加普通handler put_object drop", async () => {
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_put_object_handler(
                cyfs.RouterHandlerChain.Handler,
                "put_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Drop,
                new myHandler.PutObjectHandlerDrop("zone1device1", "put_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router,
                },
                access: undefined,
                object: new cyfs.NONObjectInfo(info.saveObjectId, info.object_raw)
            };
            const put_ret = await zone1device1.non_service().put_object(put_req);
            console.log(put_ret)
            assert(!put_ret.err, `put object failed,err : ${JSON.stringify(put_ret)}`)
        })
        it("添加普通handler put_object response", async () => {
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_put_object_handler(
                cyfs.RouterHandlerChain.Handler,
                "put_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Response,
                new myHandler.PutObjectHandlerResponse("zone1device1", "put_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router,
                },
                access: undefined,
                object: new cyfs.NONObjectInfo(info.saveObjectId, info.object_raw)
            };
            const put_ret = await zone1device1.non_service().put_object(put_req);
            console.log(put_ret)
            assert(!put_ret.err, `put object failed,err : ${JSON.stringify(put_ret)}`)
        })
        it("添加普通handler put_object reject", async () => {
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_put_object_handler(
                cyfs.RouterHandlerChain.Handler,
                "put_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Reject,
                new myHandler.PutObjectHandlerReject("zone1device1", "put_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router,
                },
                access: undefined,
                object: new cyfs.NONObjectInfo(info.saveObjectId, info.object_raw)
            };
            const put_ret = await zone1device1.non_service().put_object(put_req);
            console.log(put_ret)
            assert(!put_ret.err, `put object failed,err : ${JSON.stringify(put_ret)}`)
        })
        it("添加普通handler post_object default", async () => {
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_post_object_handler(
                cyfs.RouterHandlerChain.Handler,
                "post_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                new myHandler.PostObjectHandlerDefault("zone1device1", "post_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)


            const req1: cyfs.NONPostObjectOutputRequest = {

                object: cyfs.NONObjectInfo.new_from_object_raw(info.object_raw).unwrap(),//info.saveObjectId,
                common: {
                    req_path: req_path,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: dec_app_1,
                    flags: 0,
                }
            };

            const post_ret = await zone1device1.non_service().post_object(req1);
            console.info('post_object result:', post_ret);
        })
        it("添加普通handler post_object reject", async () => {
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_post_object_handler(
                cyfs.RouterHandlerChain.Handler,
                "post_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Reject,
                new myHandler.PostObjectHandlerReject("zone1device1", "post_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)


            const req1: cyfs.NONPostObjectOutputRequest = {

                object: cyfs.NONObjectInfo.new_from_object_raw(info.object_raw).unwrap(),//info.saveObjectId,
                common: {
                    req_path: req_path,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: dec_app_1,
                    flags: 0,
                }
            };

            const post_ret = await zone1device1.non_service().post_object(req1);
            console.info('post_object result:', post_ret);
        })
        it("添加普通 handler get_object default", async () => {
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, dec_app_1);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_get_object_handler(
                cyfs.RouterHandlerChain.Handler,
                "get_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                new myHandler.GetObjectHandlerDefault("zone1device1", "get_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)
            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: info.saveObjectId,
                common: {
                    req_path: req_path,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: undefined,
                    flags: 0,
                }
            };
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err,`get object 失败了: ${get_ret}`);

        })
        it("添加普通 handler get_object  pass", async () => {
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, dec_app_1);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_get_object_handler(
                cyfs.RouterHandlerChain.Handler,
                "get_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Pass,
                new myHandler.GetObjectHandlerPass("zone1device1", "get_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)
            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: info.saveObjectId,
                common: {
                    req_path: req_path,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: undefined,
                    flags: 0,
                }
            };
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err);

        })
        it("添加普通 handler get_object  reject", async () => {
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, dec_app_1);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_get_object_handler(
                cyfs.RouterHandlerChain.Handler,
                "get_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Reject,
                new myHandler.GetObjectHandlerReject("zone1device1", "get_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)
            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: info.saveObjectId,
                common: {
                    req_path: req_path,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: undefined,
                    flags: 0,
                }
            };
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err);

        })
        it("添加普通 handler get_object  drop", async () => {
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, dec_app_1);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_get_object_handler(
                cyfs.RouterHandlerChain.Handler,
                "get_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Drop,
                new myHandler.GetObjectHandlerDrop("zone1device1", "get_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)
            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: info.saveObjectId,
                common: {
                    req_path: req_path,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: undefined,
                    flags: 0,
                }
            };
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err);

        })
        it("添加普通 handler delete_object default", async () => {
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, dec_app_1);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_delete_object_handler(
                cyfs.RouterHandlerChain.Handler,
                "delete_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                new myHandler.DeleteObjectHandlerDefault("zone1device1", "delete_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: undefined,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                },
                object_id: info.saveObjectId,

            };
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
        })
        it("添加普通 handler delete_object pass", async () => {
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, dec_app_1);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_delete_object_handler(
                cyfs.RouterHandlerChain.Handler,
                "delete_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Pass,
                new myHandler.DeleteObjectHandlerPass("zone1device1", "delete_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: undefined,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                },
                object_id: info.saveObjectId,

            };
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
        })
        it("添加普通 handler delete_object response", async () => {
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, dec_app_1);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_delete_object_handler(
                cyfs.RouterHandlerChain.Handler,
                "delete_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Response,
                new myHandler.DeleteObjectHandlerResponse("zone1device1", "delete_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: undefined,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                },
                object_id: info.saveObjectId,

            };
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
        })
        it("添加普通 handler delete_object drop", async () => {
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, dec_app_1);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_delete_object_handler(
                cyfs.RouterHandlerChain.Handler,
                "delete_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Drop,
                new myHandler.DeleteObjectHandlerDrop("zone1device1", "delete_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: undefined,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                },
                object_id: info.saveObjectId,

            };
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
        })
        it("添加普通 handler delete_object reject", async () => {
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, dec_app_1);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_delete_object_handler(
                cyfs.RouterHandlerChain.Handler,
                "delete_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Reject,
                new myHandler.DeleteObjectHandlerReject("zone1device1", "delete_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: undefined,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                },
                object_id: info.saveObjectId,

            };
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
        })
        it("添加普通 handler sign_obejct", async () => {
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, dec_app_1);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_sign_object_handler(
                cyfs.RouterHandlerChain.Handler,
                "sign_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                new myHandler.SignObjectHandlerDefault("zone1device1", "sign_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)
            // 对对象进行签名
            console.info(`will sign object: id=${info.saveObjectId},object value = ${info.saveobject.value} `);
            const crypto = zone1device1.crypto();
            const resp = (await crypto.sign_object({
                common: {
                    req_path: undefined,
                    target: undefined,
                    dec_id: sysdec,
                    flags: 0
                },
                object: new cyfs.NONObjectInfo(info.saveObjectId, info.object_raw),
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE | cyfs.CRYPTO_REQUEST_FLAG_SIGN_SET_DESC | cyfs.CRYPTO_REQUEST_FLAG_SIGN_SET_BODY
            })).unwrap();
            console.log(resp)
            assert(resp.result === cyfs.SignObjectResult.Signed, "check sign result failed");
            const signed_obj = new cyfs.TextObjectDecoder().from_raw(resp.object!.object_raw).unwrap();
            assert(signed_obj.signs().desc_signs()!.length === 1, "check desc signs failed");
            assert(signed_obj.signs().body_signs()!.length === 1, "check body signs failed");
            console.log("test sign object success");
            //校验对象签名
            {
                const resp2 = (await crypto.verify_object({
                    common: { flags: 0 },
                    sign_type: cyfs.VerifySignType.Both,
                    object: resp.object!,
                    sign_object: cyfs.VerifyObjectType.Owner()
                }));
                console.log('verify_object result:', resp2);
                assert(resp2.unwrap().result.valid, "check verify result failed")
            }
        })
        it("添加普通 handler verify_object", async () => {
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, dec_app_1);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_verify_object_handler(
                cyfs.RouterHandlerChain.Handler,
                "sign_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                new myHandler.VerifyHandlerDefault("zone1device1", "sign_handler_01", "PreRouter")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)
            // 对对象进行签名
            console.info(`will sign object: id=${info.saveObjectId},object value = ${info.saveobject.value} `);
            const crypto = zone1device1.crypto();
            const resp = (await crypto.sign_object({
                common: {
                    req_path: undefined,
                    target: undefined,
                    dec_id: sysdec,
                    flags: 0
                },
                object: new cyfs.NONObjectInfo(info.saveObjectId, info.object_raw),
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE | cyfs.CRYPTO_REQUEST_FLAG_SIGN_SET_DESC | cyfs.CRYPTO_REQUEST_FLAG_SIGN_SET_BODY
            })).unwrap();
            console.log(resp)
            assert(resp.result === cyfs.SignObjectResult.Signed, "check sign result failed");
            const signed_obj = new cyfs.TextObjectDecoder().from_raw(resp.object!.object_raw).unwrap();
            assert(signed_obj.signs().desc_signs()!.length === 1, "check desc signs failed");
            assert(signed_obj.signs().body_signs()!.length === 1, "check body signs failed");
            console.log("test sign object success");
            //校验对象签名
            {
                const resp2 = (await crypto.verify_object({
                    common: { flags: 0 },
                    sign_type: cyfs.VerifySignType.Both,
                    object: resp.object!,
                    sign_object: cyfs.VerifyObjectType.Owner()
                }));
                console.log('verify_object result:', resp2);
                assert(resp2.unwrap().result.valid, "check verify result failed")
            }
        })
        it("普通handler同zone同dec设备未授权请求成功", async () => {
            const saveobject = cyfs.TextObject.create(undefined,
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const saveObjectId = saveobject.desc().calculate_id();
            const object_raw = saveobject.to_vec().unwrap();
            let info = { saveobject, saveObjectId, object_raw }

            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
            console.log("------------------------> " + req_path)

            const ret1 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.PostObject,
                cyfs.RouterHandlerChain.Handler,
                "post-object-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.PostObjectHandlerDefault,
                "PostObjectHandlerDefault",
                1,
            )
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            const req1: cyfs.NONPostObjectOutputRequest = {

                object: cyfs.NONObjectInfo.new_from_object_raw(info.object_raw).unwrap(),//info.saveObjectId,
                common: {
                    req_path: req_path,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: undefined,
                    flags: 0,
                }
            };
            const post_ret = await zone1device1.non_service().post_object(req1);
            console.info('post_object result:', post_ret);
            assert(!post_ret.err)
            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`post_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)
        })
        it("普通handler同zone不同dec授权后请求成功", async () => {
            const saveobject = cyfs.TextObject.create(undefined,
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const saveObjectId = saveobject.desc().calculate_id();
            const object_raw = saveobject.to_vec().unwrap();
            let info = { saveobject, saveObjectId, object_raw }

            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
            console.log("------------------------> " + req_path)


            let permission = cyfs.GlobalStatePathAccessItem.new_group(path,
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await zone1device1.root_state_meta_stub(undefined, dec_app_1).add_access(permission)

            const ret1 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.PostObject,
                cyfs.RouterHandlerChain.Handler,
                "post-object-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.PostObjectHandlerDefault,
                "PostObjectHandlerDefault",
                1,
            )
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            const req1: cyfs.NONPostObjectOutputRequest = {

                object: cyfs.NONObjectInfo.new_from_object_raw(info.object_raw).unwrap(),//info.saveObjectId,
                common: {
                    req_path: req_path,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: undefined,
                    flags: 0,
                }
            };
            const post_ret = await zone1device1.non_service().post_object(req1);
            console.info('post_object result:', post_ret);
            assert(!post_ret.err)
            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`post_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)
        })
        it("普通handler同zone不同dec设备未授权请求失败", async () => {  //申请失败也报OK无法断言
            const saveobject = cyfs.TextObject.create(undefined,
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const saveObjectId = saveobject.desc().calculate_id();
            const object_raw = saveobject.to_vec().unwrap();
            let info = { saveobject, saveObjectId, object_raw }

            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
            console.log("------------------------> " + req_path)

            const ret1 = await handlerManager.addHandler(
                `${zone1device2.local_device_id().to_base_58()}`,
                zone1device2,
                cyfs.RouterHandlerCategory.PostObject,
                cyfs.RouterHandlerChain.Handler,
                "post-object-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.PostObjectHandlerDefault,
                "PostObjectHandlerDefault",
                1,
            )
            assert(ret1.err, `添加handler错误 ---> ${ret1}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            let permission = cyfs.GlobalStatePathAccessItem.new_group(req_path,
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, dec_app_1, cyfs.AccessPermissions.Full)
            await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, dec_app_1).add_access(permission)

            const req1: cyfs.NONPostObjectOutputRequest = {

                object: cyfs.NONObjectInfo.new_from_object_raw(info.object_raw).unwrap(),//info.saveObjectId,
                common: {
                    req_path: req_path,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: dec_app_1,
                    flags: 0,
                }
            };
            const post_ret = await zone1device1.non_service().post_object(req1);
            console.info('post_object result:', post_ret);
            assert(post_ret.err)
            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`post_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(handlerResult.err)
        })
    })
})