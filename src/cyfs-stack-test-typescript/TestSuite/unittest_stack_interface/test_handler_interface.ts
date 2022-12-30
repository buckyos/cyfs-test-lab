import assert  from 'assert';
import * as cyfs from '../../cyfs_node';
import { ZoneSimulator, get_len_buf } from "../../common/utils";
import * as myHandler from "./handler"

//初始化日志
cyfs.clog.enable_file_log({
    name: "unittest_stack_interface",
    dir: cyfs.get_app_log_dir("unittest_stack_interface"),
    file_max_size: 1024 * 1024 * 10,
    file_max_count: 10,
});
``
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

const handlerManager = new myHandler.handlerManager(); //用来回收handler 和监听校验handler触发

let zone1device1: cyfs.SharedCyfsStack;
let zone1device2: cyfs.SharedCyfsStack;
let zone1ood: cyfs.SharedCyfsStack
let zone1sood: cyfs.SharedCyfsStack

let zone2ood: cyfs.SharedCyfsStack
let zone2device1: cyfs.SharedCyfsStack
let zone2device2: cyfs.SharedCyfsStack
let system_stack: cyfs.SharedCyfsStack

let zone1device1_dec_id: cyfs.ObjectId
let zone1device2_dec_id: cyfs.ObjectId
let zone1ooddec_id: cyfs.ObjectId

let zone2ooddec_id: cyfs.ObjectId
let zone2device1_dec_id: cyfs.ObjectId
let zone2device2_dec_id: cyfs.ObjectId

let sysdec: cyfs.ObjectId



describe("SharedCyfsStack NON相关接口测试", function () {
    this.timeout(0);
    this.beforeAll(async function () {

        await ZoneSimulator.init();
        zone1device1_dec_id = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device1decapp")
        zone1device2_dec_id = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device2decapp")
        zone1ooddec_id = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1ooddecapp")
        zone2ooddec_id = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone2ooddecapp")
        zone2device1_dec_id = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone2device1decapp")
        zone2device2_dec_id = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone2device2decapp")
        zone1device1 = ZoneSimulator.zone1_device1_stack!.fork_with_new_dec(zone1device1_dec_id)
        zone1device2 = ZoneSimulator.zone1_device2_stack!.fork_with_new_dec(zone1device2_dec_id);
        zone1ood = ZoneSimulator.zone1_ood_stack!.fork_with_new_dec(zone1ooddec_id);
        zone1sood = ZoneSimulator.zone1_standby_ood_stack

        zone2ood = ZoneSimulator.zone2_ood_stack!.fork_with_new_dec(zone2ooddec_id);
        zone2device1 = ZoneSimulator.zone2_device1_stack!.fork_with_new_dec(zone2device1_dec_id);
        zone2device2 = ZoneSimulator.zone2_device2_stack!.fork_with_new_dec(zone2device2_dec_id);
        sysdec = cyfs.get_system_dec_app().object_id
        // console.log("-----------------------------------=-=-=-=-=-===-a" + zone1device1_dec_id)
        // console.log("-----------------------------------=-=-=-=-=-===-b" + ZoneSimulator.zone1_device1_stack.dec_id)

        system_stack = ZoneSimulator.zone1_device1_stack.fork_with_new_dec(sysdec)

    })
    this.afterAll(async () => {
        console.info(`#########用例执行完成`);
        ZoneSimulator.clearZoneSimulator();
        //process.exit(0)
    })
    describe("#router-handlers冒烟", async () => {
        beforeEach(async function () {
            zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).clear_access()
        })
        afterEach(async function () {
            zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).clear_access()
            handlerManager.clearAllHandler()
        })
        it("添加hook handler prerouter put_object默认action", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_router/put_object/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)

            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
                    dec_id: zone1device1_dec_id,
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
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)

            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)

            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)

            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)

            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
            // zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)


            const req1: cyfs.NONPostObjectOutputRequest = {

                object: cyfs.NONObjectInfo.new_from_object_raw(info.object_raw).unwrap(),//info.saveObjectId,
                common: {
                    req_path: req_path,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: zone1device1_dec_id,
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
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
                    dec_id: zone1device1_dec_id,
                    flags: 0,
                }
            };
            const post_ret = await zone1device1.non_service().post_object(req1);
            console.info('post_object result:', post_ret);
        })
        it("添加hook handler prerouter get_object default", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_router/get_object/",
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
                undefined,undefined,zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
            assert(signed_obj.signs().desc_signs()?.length === 1, "check desc signs failed");
            assert(signed_obj.signs().body_signs()?.length === 1, "check body signs failed");
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
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
            assert(signed_obj.signs().desc_signs()?.length === 1, "check desc signs failed");
            assert(signed_obj.signs().body_signs()?.length === 1, "check body signs failed");
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
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
            assert(signed_obj.signs().desc_signs()?.length === 1, "check desc signs failed");
            assert(signed_obj.signs().body_signs()?.length === 1, "check body signs failed");
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
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
                    dec_id: zone1device1_dec_id,
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
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
                    dec_id: zone1device1_dec_id,
                    flags: 0,
                }
            };

            const post_ret = await zone1device1.non_service().post_object(req1);
            console.info('post_object result:', post_ret);
        })
        it("添加普通handler post_object pass", async () => {
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

            // 添加req_path
            let path = "/test_non/reqpath"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_post_object_handler(
                cyfs.RouterHandlerChain.Handler,
                "post_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Reject,
                new myHandler.PostObjectHandlerPass("zone1device1", "post_handler_01", "Handler")
            );
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)


            const req1: cyfs.NONPostObjectOutputRequest = {

                object: cyfs.NONObjectInfo.new_from_object_raw(info.object_raw).unwrap(),//info.saveObjectId,
                common: {
                    req_path: req_path,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: zone1device1_dec_id,
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
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
            console.log("------------------------> " + req_path)

            const ret1 = await zone1device1.router_handlers().add_get_object_handler(
                cyfs.RouterHandlerChain.Handler,
                "get_handler_01",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                new myHandler.GetObjectHandlerDefault("zone1device1", "get_handler_01", "Handler")
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
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
            assert(signed_obj.signs().desc_signs()?.length === 1, "check desc signs failed");
            assert(signed_obj.signs().body_signs()?.length === 1, "check body signs failed");
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
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
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
            assert(signed_obj.signs().desc_signs()?.length === 1, "check desc signs failed");
            assert(signed_obj.signs().body_signs()?.length === 1, "check body signs failed");
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
            const saveobject = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap(),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const saveObjectId = saveobject.desc().calculate_id();
            const object_raw = saveobject.to_vec().unwrap();
            let info = { saveobject, saveObjectId, object_raw }

            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
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
            const saveobject = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap(),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const saveObjectId = saveobject.desc().calculate_id();
            const object_raw = saveobject.to_vec().unwrap();
            let info = { saveobject, saveObjectId, object_raw }

            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)


            let permission = cyfs.GlobalStatePathAccessItem.new_group(path,
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await zone1device1.root_state_meta_stub(undefined, zone1device1_dec_id).add_access(permission)

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
        it.skip("普通handler同zone不同dec设备未授权请求失败", async () => {  //申请失败也报OK无法断言
            const saveobject = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap(),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const saveObjectId = saveobject.desc().calculate_id();
            const object_raw = saveobject.to_vec().unwrap();
            let info = { saveobject, saveObjectId, object_raw }

            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
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
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(permission)

            const req1: cyfs.NONPostObjectOutputRequest = {

                object: cyfs.NONObjectInfo.new_from_object_raw(info.object_raw).unwrap(),//info.saveObjectId,
                common: {
                    req_path: req_path,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: zone1device1_dec_id,
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