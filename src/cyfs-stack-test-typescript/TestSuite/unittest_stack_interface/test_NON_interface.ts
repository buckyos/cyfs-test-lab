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
    const saveobject = cyfs.TextObject.create(cyfs.Some(saveobjectOwner), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
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

    describe("#NON接口+access权限冒烟", async () => {
        it("default权限-当前设备的put、get、delete", async () => {
            const obj = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            console.log(object_id)
            console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
            const object_raw = obj.to_vec().unwrap();
            let rwx = cyfs.AccessString.default()
            console.log(rwx)
            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: zone1device1_dec_id,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router //设置路由类型
                },
                object: new cyfs.NONObjectInfo(object_id, object_raw),
                access: rwx
            };
            const put_ret2 = await zone1device1.non_service().put_object(put_req);
            const put_ret3 = await zone1device1.non_service().put_object(put_req);
            console.log(put_ret3)
            assert(!put_ret2.err, `put object failed,err : ${JSON.stringify(put_ret2)}`)
            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: object_id,
                common: {
                    req_path: undefined,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: zone1device1_dec_id,
                    flags: 0,
                }
            };
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err);

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: zone1device1_dec_id,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                },
                object_id: object_id,

            };
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
        })

        it("default权限-zone内其他设备的put、get、delete", async () => {
            const obj = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            console.log(object_id)
            console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
            const object_raw = obj.to_vec().unwrap();
            let rwx = cyfs.AccessString.default()
            console.log(rwx)
            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: zone1device1_dec_id,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router //设置路由类型
                },
                object: new cyfs.NONObjectInfo(object_id, object_raw),
                access: rwx
            };
            const put_ret2 = await zone1device1.non_service().put_object(put_req);
            const put_ret3 = await zone1device2.non_service().put_object(put_req);
            console.log(put_ret3)
            assert(!put_ret2.err, `put object failed,err : ${JSON.stringify(put_ret2)}`)
            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: object_id,
                common: {
                    req_path: undefined,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: zone1device1_dec_id,
                    flags: 0,
                }
            };
            const get_ret = await zone1device2.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err);

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: zone1device1_dec_id,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                },
                object_id: object_id,

            };
            const delete_ret = await zone1device2.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
        })

        it("default权限-ood到zone内device的put、get、delete", async () => {
            const obj = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            console.log(object_id)
            console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
            const object_raw = obj.to_vec().unwrap();
            let rwx = cyfs.AccessString.default()
            console.log(rwx)
            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: zone1device1_dec_id,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router //设置路由类型
                },
                object: new cyfs.NONObjectInfo(object_id, object_raw),
                access: rwx
            };
            const put_ret2 = await zone1ood.non_service().put_object(put_req);
            const put_ret3 = await zone1ood.non_service().put_object(put_req);
            console.log(put_ret3)
            assert(!put_ret2.err, `put object failed,err : ${JSON.stringify(put_ret2)}`)
            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: object_id,
                common: {
                    req_path: undefined,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: zone1ooddec_id,
                    flags: 0,
                }
            };
            const get_ret = await zone1ood.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err);

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: zone1ooddec_id,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                },
                object_id: object_id,

            };
            const delete_ret = await zone1ood.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
        })

        it("default权限-zone1device从不填默认target的put、get、delete", async () => {
            const obj = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            console.log(object_id)
            console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
            const object_raw = obj.to_vec().unwrap();
            let rwx = cyfs.AccessString.default()
            console.log(rwx)
            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: zone1device1_dec_id,
                    flags: 0,
                    target: undefined,
                    level: cyfs.NONAPILevel.Router //设置路由类型
                },
                object: new cyfs.NONObjectInfo(object_id, object_raw),
                access: rwx
            };
            const put_ret2 = await zone1device1.non_service().put_object(put_req);
            const put_ret3 = await zone1device2.non_service().put_object(put_req);
            assert(!put_ret2.err, `put object failed,err : ${JSON.stringify(put_ret2)}`)
            assert(!put_ret3.err, `put object failed,err : ${JSON.stringify(put_ret3)}`)
            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: object_id,
                common: {
                    req_path: undefined,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1ood.local_device_id().object_id,
                    dec_id: zone1device1_dec_id,
                    flags: 0,
                }
            };
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err, `get object failed,err : ${JSON.stringify(get_ret)}`);

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: zone1ooddec_id,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: undefined,
                },
                object_id: object_id,

            };
            const delete_ret = await zone1ood.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
        })

        it("default权限-zone1device从不填target和decid的get、delete", async () => {
            const obj = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            console.log(object_id)
            console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
            const object_raw = obj.to_vec().unwrap();
            let rwx = cyfs.AccessString.default()
            console.log(rwx)
            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: undefined,
                    flags: 0,
                    target: undefined,
                    level: cyfs.NONAPILevel.Router //设置路由类型
                },
                object: new cyfs.NONObjectInfo(object_id, object_raw),
                access: rwx
            };
            const put_ret2 = await zone1device1.non_service().put_object(put_req);
            const put_ret3 = await zone1device1.non_service().put_object(put_req);
            assert(!put_ret2.err, `put object failed,err : ${JSON.stringify(put_ret2)}`)
            assert(!put_ret3.err, `put object failed,err : ${JSON.stringify(put_ret3)}`)
            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: object_id,
                common: {
                    req_path: undefined,
                    level: cyfs.NONAPILevel.Router,
                    target: undefined,
                    dec_id: undefined,
                    flags: 0,
                }
            };
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err, `get object failed,err : ${JSON.stringify(get_ret)}`);

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: undefined,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: undefined,
                },
                object_id: object_id,

            };
            const delete_ret = await zone1ood.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
        })

        it("default权限-zone内发起请求指定了sourceDec与put时dec不同，以指定为准", async () => {
            const obj = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            console.log(object_id)
            console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
            const object_raw = obj.to_vec().unwrap();
            let rwx = cyfs.AccessString.default()
            console.log(rwx)
            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: zone1device1_dec_id,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router //设置路由类型
                },
                object: new cyfs.NONObjectInfo(object_id, object_raw),
                access: rwx
            };
            const put_ret1 = await zone1device1.non_service().put_object(put_req);
            const put_ret2 = await zone1device2.non_service().put_object(put_req);
            const put_ret3 = await zone1ood.non_service().put_object(put_req);
            console.log(put_ret3)
            assert(!put_ret1.err, `put object failed,err : ${JSON.stringify(put_ret1)}`)
            assert(!put_ret2.err, `put object failed,err : ${JSON.stringify(put_ret2)}`)
            assert(!put_ret3.err, `put object failed,err : ${JSON.stringify(put_ret3)}`)
            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: object_id,
                common: {
                    req_path: undefined,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: undefined,
                    flags: 0,
                }
            };
            const get_ret = await zone1device1.non_service().get_object(get_req);
            const get_ret1 = await zone1ood.non_service().get_object(get_req);
            const get_ret2 = await zone1device2.non_service().get_object(get_req);
            console.info('get_object result:', get_ret1);
            assert(!get_ret.err);
            assert(!get_ret1.err);
            assert(!get_ret2.err);

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: undefined,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                },
                object_id: object_id,

            };
            const delete_ret1 = await zone1device1.non_service().delete_object(del_req);
            const delete_ret2 = await zone1device2.non_service().delete_object(del_req);
            const delete_ret3 = await zone1ood.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret1);
            assert(!delete_ret1.err, `delete object failed ,err : ${JSON.stringify(delete_ret1)}`)
            assert(!delete_ret2.err, `delete object failed ,err : ${JSON.stringify(delete_ret2)}`)
            assert(!delete_ret3.err, `delete object failed ,err : ${JSON.stringify(delete_ret3)}`)
        })

        it("access不填权限为默认值zone内访问成功put、get、delete", async () => {
            const obj = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            console.log(object_id)
            console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
            const object_raw = obj.to_vec().unwrap();


            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: zone1device1_dec_id,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router //设置路由类型
                },
                object: new cyfs.NONObjectInfo(object_id, object_raw)
            };
            const put_ret2 = await zone1device1.non_service().put_object(put_req);
            const put_ret3 = await zone1device1.non_service().put_object(put_req);
            console.log(put_ret3)
            assert(!put_ret2.err, `put object failed,err : ${JSON.stringify(put_ret2)}`)
            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: object_id,
                common: {
                    req_path: undefined,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: zone1device1_dec_id,
                    flags: 0,
                }
            };
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err);

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: zone1device1_dec_id,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                },
                object_id: object_id,

            };
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
        })

        it("Full权限-跨zone访问正常，zone2device从zone1device", async () => {
            let info = await createTestObject(zone1device1, ZoneSimulator.zone1_device1_peerId, cyfs.AccessString.full())
            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: info.saveObjectId,
                common: {
                    req_path: undefined,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: zone2device1_dec_id,
                    flags: 0,
                }
            };
            const get_ret = await zone2device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err, `get object failed,err : ${JSON.stringify(get_ret)}`);

        })

        it("Full权限-跨zone访问正常，zone2device从zone1ood", async () => {
            let info = await createTestObject(zone1ood, ZoneSimulator.zone1_ood_peerId, cyfs.AccessString.full())
            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: info.saveObjectId,
                common: {
                    req_path: undefined,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1ood.local_device_id().object_id,
                    dec_id: zone2device1_dec_id,
                    flags: 0,
                }
            };
            const get_ret = await zone2device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err, `get object failed,err : ${JSON.stringify(get_ret)}`);

        })

        it("Full权限-跨zone访问正常，zone2ood从zone1从ood", async () => {
            let info = await createTestObject(zone1sood, ZoneSimulator.zone1_standby_ood_peerId, cyfs.AccessString.full())
            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: info.saveObjectId,
                common: {
                    req_path: undefined,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1sood.local_device_id().object_id,
                    dec_id: zone2ooddec_id,
                    flags: 0,
                }
            };
            const get_ret = await zone2ood.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err, `get object failed,err : ${JSON.stringify(get_ret)}`);

        })

        it("Full权限-zone内put、get、delete都成功", async () => {
            const obj = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            console.log(object_id)
            console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
            const object_raw = obj.to_vec().unwrap();
            let rwx = cyfs.AccessString.full()
            console.log(rwx)
            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: zone1device1_dec_id,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router //设置路由类型
                },
                object: new cyfs.NONObjectInfo(object_id, object_raw),
                access: rwx
            };
            const put_ret2 = await zone1device1.non_service().put_object(put_req);
            const put_ret3 = await zone1device1.non_service().put_object(put_req);
            console.log(put_ret3)
            assert(!put_ret2.err, `put object failed,err : ${JSON.stringify(put_ret2)}`)
            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: object_id,
                common: {
                    req_path: undefined,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: zone1device1_dec_id,
                    flags: 0,
                }
            };
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err);

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: zone1device1_dec_id,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                },
                object_id: object_id,

            };
            const delete_ret = await zone1device2.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
        })

        it("Full_except_write权限-zone外不能写入，可以get操作", async () => {
            const obj = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            console.log(object_id)
            console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
            const object_raw = obj.to_vec().unwrap();
            let rwx = cyfs.AccessString.full_except_write()
            console.log(rwx)
            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: zone1device1_dec_id,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router //设置路由类型
                },
                object: new cyfs.NONObjectInfo(object_id, object_raw),
                access: rwx
            };
            const put_ret2 = await zone1device1.non_service().put_object(put_req);
            const put_ret3 = await zone2device1.non_service().put_object(put_req);
            console.log(put_ret3)
            assert(!put_ret2.err, `put object failed,err : ${JSON.stringify(put_ret2)}`)
            assert(put_ret3.err, `put object failed,err : ${JSON.stringify(put_ret3)}`)
            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: object_id,
                common: {
                    req_path: undefined,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: zone2device1_dec_id,
                    flags: 0,
                }
            };
            const get_ret = await zone2device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err);

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: zone1device2_dec_id,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                },
                object_id: object_id,

            };
            const delete_ret = await zone1device2.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(delete_ret.err, `delete object not write ,err : ${JSON.stringify(delete_ret)}`)
        })

        it("多个分组设置组合权限-当前zone和OwnerDec权限为full", async () => {
            const obj = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            console.log(object_id)
            console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
            const object_raw = obj.to_vec().unwrap();
            let rwx = cyfs.AccessString.make([{ group: cyfs.AccessGroup.CurrentZone, permissions: cyfs.AccessPermissions.Full },
            { group: cyfs.AccessGroup.OwnerDec, permissions: cyfs.AccessPermissions.Full }])
            console.log(rwx)
            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: zone1device1_dec_id,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router //设置路由类型
                },
                object: new cyfs.NONObjectInfo(object_id, object_raw),
                access: rwx
            };

            console.log(rwx)
            const put_ret2 = await zone1device1.non_service().put_object(put_req);
            const put_ret3 = await zone1device2.non_service().put_object(put_req);
            console.log(put_ret3)
            assert(!put_ret2.err, `put object failed,err : ${JSON.stringify(put_ret2)}`)
            assert(!put_ret3.err, `put object failed,err : ${JSON.stringify(put_ret3)}`)
            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: object_id,
                common: {
                    req_path: undefined,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: zone1device1_dec_id,
                    flags: 0,
                }
            };
            const get_ret2 = await zone1device1.non_service().get_object(get_req);  //当前设备
            const get_ret1 = await zone1device2.non_service().get_object(get_req);  //当前zone
            console.info('get_object result:', get_ret1);
            assert(!get_ret1.err);
            assert(get_ret2.err);

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: zone1device1_dec_id,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                },
                object_id: object_id,
            };
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            const delete_ret1 = await zone1device2.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
            assert(!delete_ret1.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
        })
    
        it("多个分组设置组合权限-otherZone和OtherDec权限为full", async () => {
            const obj = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            console.log(object_id)
            console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
            const object_raw = obj.to_vec().unwrap();
            let rwx = cyfs.AccessString.make([{ group: cyfs.AccessGroup.OthersZone, permissions: cyfs.AccessPermissions.Full },
            { group: cyfs.AccessGroup.OthersDec, permissions: cyfs.AccessPermissions.Full }])
            console.log(rwx)
            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: zone1device1_dec_id,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router //设置路由类型
                },
                object: new cyfs.NONObjectInfo(object_id, object_raw),
                access: rwx
            };

            console.log(rwx)
            const put_ret2 = await zone1device1.non_service().put_object(put_req);
            const put_ret3 = await zone1device2.non_service().put_object(put_req);
            const put_ret4 = await zone2device2.non_service().put_object(put_req);
            console.log(put_ret3)
            assert(!put_ret2.err, `put object failed,err : ${JSON.stringify(put_ret2)}`)
            assert(put_ret3.err, `put object failed,err : ${JSON.stringify(put_ret3)}`)
            assert(put_ret4.err, `put object failed,err : ${JSON.stringify(put_ret4)}`)
            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: object_id,
                common: {
                    req_path: undefined,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: zone1device2_dec_id,
                    flags: 0,
                }
            };
            const get_ret2 = await zone1device1.non_service().get_object(get_req);  //当前设备
            const get_ret1 = await zone1device2.non_service().get_object(get_req);  //当前zone
            const get_ret3 = await zone2device1.non_service().get_object(get_req);  //otherzone
            console.info('get_object result:', get_ret1);
            assert(get_ret1.err, `delete object failed ,err : ${JSON.stringify(get_ret1)}`);
            assert(get_ret2.err);
            assert(!get_ret3.err);

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: zone1device2_dec_id,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                },
                object_id: object_id,
            };
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            const delete_ret1 = await zone1device2.non_service().delete_object(del_req);
            const delete_ret2 = await zone2device2.non_service().delete_object(del_req);  //不同zone
            console.info('delete_object result:', delete_ret);
            assert(delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
            assert(delete_ret1.err, `delete object failed ,err : ${JSON.stringify(delete_ret1)}`)
            assert(delete_ret2.err, `delete object failed ,err : ${JSON.stringify(delete_ret2)}`)
        })

        it("回收当前设备的读写权限其他zone的读权限", async () => {
            const obj = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            console.log(object_id)
            console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
            const object_raw = obj.to_vec().unwrap();
            let rwx = new cyfs.AccessString(0o777777)
            console.log(rwx)
            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: zone1device1_dec_id,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router //设置路由类型
                },
                object: new cyfs.NONObjectInfo(object_id, object_raw),
                access: rwx
            };
            rwx.clear_group_permission(cyfs.AccessGroup.CurrentZone, cyfs.AccessPermission.Write)
            rwx.clear_group_permission(cyfs.AccessGroup.CurrentZone, cyfs.AccessPermission.Read)
            rwx.clear_group_permission(cyfs.AccessGroup.OthersZone, cyfs.AccessPermission.Read)
            console.log(rwx)
            const put_ret2 = await zone1device1.non_service().put_object(put_req);
            const put_ret3 = await zone1device2.non_service().put_object(put_req);
            const put_ret4 = await zone1device1.non_service().put_object(put_req);
            console.log(put_ret3)
            assert(!put_ret2.err, `put object failed,err : ${JSON.stringify(put_ret2)}`)
            assert(put_ret3.err, `put object failed,err : ${JSON.stringify(put_ret3)}`)
            assert(!put_ret4.err, `put object failed,err : ${JSON.stringify(put_ret4)}`)
            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: object_id,
                common: {
                    req_path: undefined,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: zone1device1_dec_id,
                    flags: 0,
                }
            };
            const get_ret2 = await zone1device1.non_service().get_object(get_req);  //当前设备
            const get_ret1 = await zone1device2.non_service().get_object(get_req);  //当前zone
            const get_ret3 = await zone2device1.non_service().get_object(get_req);  //otherzone
            console.info('get_object result:', get_ret1);
            assert(get_ret1.err, `delete object failed ,err : ${JSON.stringify(get_ret1)}`);
            assert(!get_ret2.err);
            assert(get_ret3.err);

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: undefined,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                },
                object_id: object_id,
            };

            const delete_ret1 = await zone1device2.non_service().delete_object(del_req);
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            const delete_ret2 = await zone2device2.non_service().delete_object(del_req);  //不同zone
            console.info('delete_object result:', delete_ret);
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
            assert(delete_ret1.err, `delete object failed ,err : ${JSON.stringify(delete_ret1)}`)
            assert(delete_ret2.err, `delete object failed ,err : ${JSON.stringify(delete_ret2)}`)
        })

        it("回收othersZone和othersDec权限", async () => {
            const obj = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            console.log(object_id)
            console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
            const object_raw = obj.to_vec().unwrap();
            let rwx = new cyfs.AccessString(0o777777)
            console.log(rwx)
            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: zone1device1_dec_id,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router //设置路由类型
                },
                object: new cyfs.NONObjectInfo(object_id, object_raw),
                access: rwx
            };
            rwx.clear_group_permissions(cyfs.AccessGroup.OthersDec)
            rwx.clear_group_permissions(cyfs.AccessGroup.OthersZone)
            console.log(rwx)
            const put_ret2 = await zone1device1.non_service().put_object(put_req);
            const put_ret3 = await zone1ood.non_service().put_object(put_req);
            console.log(put_ret3)
            assert(!put_ret2.err, `put object failed,err : ${JSON.stringify(put_ret2)}`)
            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: object_id,
                common: {
                    req_path: undefined,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: zone1device2_dec_id,
                    flags: 0,
                }
            };
            const get_ret2 = await zone1device1.non_service().get_object(get_req);  //当前设备
            const get_ret1 = await zone1device2.non_service().get_object(get_req);  //当前zone
            const get_ret3 = await zone2device1.non_service().get_object(get_req);  //otherzone
            console.info('get_object result:', get_ret1);
            assert(get_ret1.err, `delete object failed ,err : ${JSON.stringify(get_ret1)}`);
            assert(get_ret2.err);
            assert(get_ret3.err);

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: zone1device2_dec_id,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                },
                object_id: object_id,
            };
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            const delete_ret1 = await zone1device2.non_service().delete_object(del_req);
            const delete_ret2 = await zone2device2.non_service().delete_object(del_req);  //不同zone
            console.info('delete_object result:', delete_ret);
            assert(delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
            assert(delete_ret1.err, `delete object failed ,err : ${JSON.stringify(delete_ret1)}`)
            assert(delete_ret2.err, `delete object failed ,err : ${JSON.stringify(delete_ret2)}`)
        })

    })

    describe("#NON接口req_path冒烟", async () => {
        beforeEach(async function () {
            await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).clear_access()
        })
        afterEach(async function () {
            await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).clear_access()
           
        })
        it("path已授权默认权限zone内不同dec，put、get、delete成功", async () => {
            const saveobject = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const saveObjectId = saveobject.desc().calculate_id();
            console.info(`will put_object: id=${saveObjectId},object value = ${saveobject.value} `);
            const object_raw = saveobject.to_vec().unwrap();
            let info = { saveobject, saveObjectId, object_raw }

            const first_delete: cyfs.NONDeleteObjectOutputRequest = {
                common: {  //清理 local cache
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                },
                object_id: info.saveObjectId,

            }
            let del1_res = await zone1device1.non_service().delete_object(first_delete)
            let del2_res = await zone1device2.non_service().delete_object(first_delete)
            console.info('delete_object result:', first_delete);
            assert(!del1_res.err, `delete1 object failed ,err : ${JSON.stringify(del1_res)}`)
            assert(!del2_res.err, `delete2 object failed ,err : ${JSON.stringify(del2_res)}`)


            //注册req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            //给指定设备dec授权该path,不指定默认当前source

            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(path, cyfs.AccessString.default())
            await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router,
                    dec_id: zone1device2_dec_id
                },
                access: undefined,
                object: new cyfs.NONObjectInfo(info.saveObjectId, info.object_raw)
            };
            const put_ret = await zone1device2.non_service().put_object(put_req);
            console.log(put_ret)
            assert(!put_ret.err, `put object failed,err : ${JSON.stringify(put_ret)}`)

            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: info.saveObjectId,
                common: {
                    req_path: req_path,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: zone1device2_dec_id,
                    flags: 0,
                }
            };
            const get_ret = await zone1device2.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err);

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: zone1device2_dec_id,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                },
                object_id: info.saveObjectId,

            };
            const delete_ret = await zone1device2.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
        })
        it.skip("put/get/delete调用 globalroot path 同dec", async () => {

            const obj = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
            const object_raw = obj.to_vec().unwrap();

            //注入req_path及对象
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, object_id, undefined, true)
            let root_info = (await op_env.commit()).unwrap()
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path, undefined, cyfs.RequestGlobalStateRoot.GlobalRoot(root_info.root)).toString()  //cyfs.get_system_dec_app().object_id

            console.log("------------------------>" + req_path)

            // //给指定设备dec授权该path,不指定默认当前source
            // let rwx = cyfs.AccessString.default()
            //console.log(rwx)
            // let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(path,rwx)
            // zone1device1.root_state_meta_stub(zone2device1.local_device_id().object_id,zone1device1_dec_id).add_access(item)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: zone1device1.local_device_id().object_id,
                    flags: 0,
                    target: zone1device1.dec_id,
                    level: cyfs.NONAPILevel.Router //设置路由类型
                },
                object: new cyfs.NONObjectInfo(object_id, object_raw),
                access: undefined
            };
            const put_ret2 = await zone1device1.non_service().put_object(put_req);
            console.log(put_ret2)
            assert(!put_ret2.err, `put object failed,err : ${JSON.stringify(put_ret2)}`)
            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: object_id,
                common: {
                    req_path: req_path,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.dec_id,
                    dec_id: zone1device1.local_device_id().object_id,
                    flags: 0,
                }
            };
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err);

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device1.dec_id,
                },
                object_id: object_id,

            };
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)

        })
        it.skip("put/get/delete调用 decroot path", async () => {

            const obj = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
            const object_raw = obj.to_vec().unwrap();

            //注册req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            op_env.set_with_path(path, object_id, undefined, true)
            let root_info = (await op_env.commit()).unwrap()
            root_info.dec_root
            root_info.root
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
            let root_req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path, undefined, cyfs.RequestGlobalStateRoot.GlobalRoot(root_info.root)).toString()  //cyfs.get_system_dec_app().object_id
            let decroot_req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path, undefined, cyfs.RequestGlobalStateRoot.DecRoot(root_info.dec_root)).toString()  //cyfs.get_system_dec_app().object_id

            console.log("------------------------>" + req_path)

            // //给指定设备dec授权该path,不指定默认当前source
            // let rwx = cyfs.AccessString.default()
            //console.log(rwx)
            // let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(path,rwx)
            // zone1device1.root_state_meta_stub(zone2device1.local_device_id().object_id,zone1device1_dec_id).add_access(item)






            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: path,
                    dec_id: zone1device1.local_device_id().object_id,
                    flags: 0,
                    target: zone1device1.dec_id,
                    level: cyfs.NONAPILevel.Router //设置路由类型
                },
                object: new cyfs.NONObjectInfo(object_id, object_raw),
                access: undefined
            };
            const put_ret2 = await zone1device1.non_service().put_object(put_req);
            const put_ret3 = await zone1ood.non_service().put_object(put_req);
            console.log(put_ret3)
            assert(!put_ret2.err, `put object failed,err : ${JSON.stringify(put_ret2)}`)
            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: object_id,
                common: {
                    req_path: undefined,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.dec_id,
                    dec_id: zone1device1.local_device_id().object_id,
                    flags: 0,
                }
            };
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err);

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device1.dec_id,
                },
                object_id: object_id,

            };
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)

        })

        it("req_path put_object zone内不同设备跨dec level=non", async () => {

            const saveobject = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const saveObjectId = saveobject.desc().calculate_id();
            console.info(`will put_object: id=${saveObjectId},object value = ${saveobject.value} `);
            const object_raw = saveobject.to_vec().unwrap();
            let info = { saveobject, saveObjectId, object_raw }

            const first_delete: cyfs.NONDeleteObjectOutputRequest = {
                common: {  //清理 local cache
                    level: cyfs.NONAPILevel.NON,
                    flags: 0,
                },
                object_id: info.saveObjectId,
            }
            let del1_res = await zone1device1.non_service().delete_object(first_delete)
            let del2_res = await zone1device2.non_service().delete_object(first_delete)
            console.info('delete_object result:', first_delete);
            assert(!del1_res.err, `delete1 object failed ,err : ${JSON.stringify(del1_res)}`)
            assert(!del2_res.err, `delete2 object failed ,err : ${JSON.stringify(del2_res)}`)

            //注册req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            //给指定设备dec授权该path,不指定默认当前source
            let rwx = new cyfs.AccessString(0o777777)
            console.log("---------------------------> " + rwx)
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(path, rwx)
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.NON,
                    dec_id: zone1device2_dec_id
                },
                access: undefined,
                object: new cyfs.NONObjectInfo(info.saveObjectId, info.object_raw)
            };
            const put_ret = await zone1device2.non_service().put_object(put_req);
            console.log(put_ret)
            assert(!put_ret.err, `put object failed,err : ${JSON.stringify(put_ret)}`)

        })
        it("req_path get_object zone内不同设备跨dec level=non", async () => {

            const saveobject = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const saveObjectId = saveobject.desc().calculate_id();
            console.info(`will put_object: id=${saveObjectId},object value = ${saveobject.value} `);
            const object_raw = saveobject.to_vec().unwrap();
            let info = { saveobject, saveObjectId, object_raw }

            const first_delete: cyfs.NONDeleteObjectOutputRequest = {
                common: {  //清理 local cache
                    level: cyfs.NONAPILevel.NON,
                    flags: 0,
                },
                object_id: info.saveObjectId,
            }
            let del1_res = await zone1device1.non_service().delete_object(first_delete)
            let del2_res = await zone1device2.non_service().delete_object(first_delete)
            console.info('delete_object result:', first_delete);
            assert(!del1_res.err, `delete1 object failed ,err : ${JSON.stringify(del1_res)}`)
            assert(!del2_res.err, `delete2 object failed ,err : ${JSON.stringify(del2_res)}`)


            //注册req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            //给指定设备dec授权该path,不指定默认当前source
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(path, cyfs.AccessString.full())
            await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.NON,
                    dec_id: undefined
                },
                access: undefined,
                object: new cyfs.NONObjectInfo(info.saveObjectId, info.object_raw)
            };
            const put_ret = await zone1device1.non_service().put_object(put_req);
            console.log(put_ret)
            assert(!put_ret.err, `put object failed,err : ${JSON.stringify(put_ret)}`)

            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: info.saveObjectId,
                common: {
                    req_path: req_path,
                    level: cyfs.NONAPILevel.NON,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: zone1device2_dec_id,
                    flags: 0,
                }
            };
            const get_ret = await zone1device2.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err);

        })
        it("req_path delete_object zone内不同设备跨dec level=non", async () => {

            const saveobject = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const saveObjectId = saveobject.desc().calculate_id();
            console.info(`will put_object: id=${saveObjectId},object value = ${saveobject.value} `);
            const object_raw = saveobject.to_vec().unwrap();
            let info = { saveobject, saveObjectId, object_raw }

            const first_delete: cyfs.NONDeleteObjectOutputRequest = {
                common: {  //清理 local cache
                    level: cyfs.NONAPILevel.NON,
                    flags: 0,
                },
                object_id: info.saveObjectId,

            }
            let del1_res = await zone1device1.non_service().delete_object(first_delete)
            let del2_res = await zone1device2.non_service().delete_object(first_delete)
            console.info('delete_object result:', first_delete);
            assert(!del1_res.err, `delete1 object failed ,err : ${JSON.stringify(del1_res)}`)
            assert(!del2_res.err, `delete2 object failed ,err : ${JSON.stringify(del2_res)}`)


            //注册req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            //给指定设备dec授权该path,不指定默认当前source
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(path, cyfs.AccessString.full())
            await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.NON,
                },
                access: undefined,
                object: new cyfs.NONObjectInfo(info.saveObjectId, info.object_raw)
            };
            const put_ret = await zone1device1.non_service().put_object(put_req);
            console.log(put_ret)
            assert(!put_ret.err, `put object failed,err : ${JSON.stringify(put_ret)}`)



            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: zone1device2_dec_id,
                    level: cyfs.NONAPILevel.NON,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                },
                object_id: info.saveObjectId,

            };
            const delete_ret = await zone1device2.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)

        })
        it("req_path put_object zone内同设备跨dec level=non", async () => {

            const saveobject = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const saveObjectId = saveobject.desc().calculate_id();
            console.info(`will put_object: id=${saveObjectId},object value = ${saveobject.value} `);
            const object_raw = saveobject.to_vec().unwrap();
            let info = { saveobject, saveObjectId, object_raw }

            const first_delete: cyfs.NONDeleteObjectOutputRequest = {
                common: {  //清理 local cache
                    level: cyfs.NONAPILevel.NON,
                    flags: 0,
                },
                object_id: info.saveObjectId,
            }
            let del1_res = await zone1device1.non_service().delete_object(first_delete)
            let del2_res = await zone1device2.non_service().delete_object(first_delete)
            console.info('delete_object result:', first_delete);
            assert(!del1_res.err, `delete1 object failed ,err : ${JSON.stringify(del1_res)}`)
            assert(!del2_res.err, `delete2 object failed ,err : ${JSON.stringify(del2_res)}`)

            //注册req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            //给指定设备dec授权该path,不指定默认当前source
            let rwx = new cyfs.AccessString(0o777777)
            console.log("---------------------------> " + rwx)
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(path, rwx)
            zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.NON,
                    dec_id: ZoneSimulator.zone1_device1_stack.dec_id
                },
                access: undefined,
                object: new cyfs.NONObjectInfo(info.saveObjectId, info.object_raw)
            };
            const put_ret = await zone1device1.non_service().put_object(put_req);
            console.log(put_ret)
            assert(!put_ret.err, `put object failed,err : ${JSON.stringify(put_ret)}`)

        })
        it("req_path get_object zone内同设备跨dec level=non", async () => {

            const saveobject = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const saveObjectId = saveobject.desc().calculate_id();
            console.info(`will put_object: id=${saveObjectId},object value = ${saveobject.value} `);
            const object_raw = saveobject.to_vec().unwrap();
            let info = { saveobject, saveObjectId, object_raw }

            const first_delete: cyfs.NONDeleteObjectOutputRequest = {
                common: {  //清理 local cache
                    level: cyfs.NONAPILevel.NON,
                    flags: 0,
                },
                object_id: info.saveObjectId,
            }
            let del1_res = await zone1device1.non_service().delete_object(first_delete)
            let del2_res = await zone1device2.non_service().delete_object(first_delete)
            console.info('delete_object result:', first_delete);
            assert(!del1_res.err, `delete1 object failed ,err : ${JSON.stringify(del1_res)}`)
            assert(!del2_res.err, `delete2 object failed ,err : ${JSON.stringify(del2_res)}`)


            //注册req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            //给指定设备dec授权该path,不指定默认当前source
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(path, cyfs.AccessString.full())
            await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.NON,
                    dec_id: undefined
                },
                access: undefined,
                object: new cyfs.NONObjectInfo(info.saveObjectId, info.object_raw)
            };
            const put_ret = await zone1device1.non_service().put_object(put_req);
            console.log(put_ret)
            assert(!put_ret.err, `put object failed,err : ${JSON.stringify(put_ret)}`)

            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: info.saveObjectId,
                common: {
                    req_path: req_path,
                    level: cyfs.NONAPILevel.NON,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: ZoneSimulator.zone1_device1_stack.dec_id,
                    flags: 0,
                }
            };
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err);

        })
        it("req_path delete_object zone内同设备跨dec level=non", async () => {

            const saveobject = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const saveObjectId = saveobject.desc().calculate_id();
            console.info(`will put_object: id=${saveObjectId},object value = ${saveobject.value} `);
            const object_raw = saveobject.to_vec().unwrap();
            let info = { saveobject, saveObjectId, object_raw }

            const first_delete: cyfs.NONDeleteObjectOutputRequest = {
                common: {  //清理 local cache
                    level: cyfs.NONAPILevel.NON,
                    flags: 0,
                },
                object_id: info.saveObjectId,

            }
            let del1_res = await zone1device1.non_service().delete_object(first_delete)
            let del2_res = await zone1device2.non_service().delete_object(first_delete)
            console.info('delete_object result:', first_delete);
            assert(!del1_res.err, `delete1 object failed ,err : ${JSON.stringify(del1_res)}`)
            assert(!del2_res.err, `delete2 object failed ,err : ${JSON.stringify(del2_res)}`)


            //注册req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            //给指定设备dec授权该path,不指定默认当前source
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(path, cyfs.AccessString.full())
            await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.NON,
                },
                access: undefined,
                object: new cyfs.NONObjectInfo(info.saveObjectId, info.object_raw)
            };
            const put_ret = await zone1device1.non_service().put_object(put_req);
            console.log(put_ret)
            assert(!put_ret.err, `put object failed,err : ${JSON.stringify(put_ret)}`)

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: ZoneSimulator.zone1_device1_stack.dec_id,
                    level: cyfs.NONAPILevel.NON,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                },
                object_id: info.saveObjectId,

            };
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)

        })
        it("req_path put_object zone内同设备跨dec level=noc", async () => {

            const saveobject = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const saveObjectId = saveobject.desc().calculate_id();
            console.info(`will put_object: id=${saveObjectId},object value = ${saveobject.value} `);
            const object_raw = saveobject.to_vec().unwrap();
            let info = { saveobject, saveObjectId, object_raw }

            const first_delete: cyfs.NONDeleteObjectOutputRequest = {
                common: {  //清理 local cache
                    level: cyfs.NONAPILevel.NOC,
                    flags: 0,
                },
                object_id: info.saveObjectId,
            }
            let del1_res = await zone1device1.non_service().delete_object(first_delete)
            let del2_res = await zone1device2.non_service().delete_object(first_delete)
            console.info('delete_object result:', first_delete);
            assert(!del1_res.err, `delete1 object failed ,err : ${JSON.stringify(del1_res)}`)
            assert(!del2_res.err, `delete2 object failed ,err : ${JSON.stringify(del2_res)}`)

            //注册req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            //给指定设备dec授权该path,不指定默认当前source
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(path, cyfs.AccessString.full())
            await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.NOC,
                    dec_id: ZoneSimulator.zone1_device1_stack.dec_id
                },
                access: undefined,
                object: new cyfs.NONObjectInfo(info.saveObjectId, info.object_raw)
            };
            const put_ret = await zone1device1.non_service().put_object(put_req);
            console.log(put_ret)
            assert(!put_ret.err, `put object failed,err : ${JSON.stringify(put_ret)}`)

        })
        it("req_path get_object zone内同设备跨dec level=noc", async () => {

            const saveobject = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const saveObjectId = saveobject.desc().calculate_id();
            console.info(`will put_object: id=${saveObjectId},object value = ${saveobject.value} `);
            const object_raw = saveobject.to_vec().unwrap();
            let info = { saveobject, saveObjectId, object_raw }

            const first_delete: cyfs.NONDeleteObjectOutputRequest = {
                common: {  //清理 local cache
                    level: cyfs.NONAPILevel.NOC,
                    flags: 0,
                },
                object_id: info.saveObjectId,

            }
            let del1_res = await zone1device1.non_service().delete_object(first_delete)
            let del2_res = await zone1device2.non_service().delete_object(first_delete)
            console.info('delete_object result:', first_delete);
            assert(!del1_res.err, `delete1 object failed ,err : ${JSON.stringify(del1_res)}`)
            assert(!del2_res.err, `delete2 object failed ,err : ${JSON.stringify(del2_res)}`)


            //注册req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            //给指定设备dec授权该path,不指定默认当前source
            let permission = cyfs.GlobalStatePathAccessItem.new_group(path,
                undefined, undefined, ZoneSimulator.zone1_device1_stack.dec_id, cyfs.AccessPermissions.Full)
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(permission)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.NOC,
                },
                access: undefined,
                object: new cyfs.NONObjectInfo(info.saveObjectId, info.object_raw)
            };
            const put_ret = await zone1device1.non_service().put_object(put_req);
            console.log(put_ret)
            assert(!put_ret.err, `put object failed,err : ${JSON.stringify(put_ret)}`)

            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: info.saveObjectId,
                common: {
                    req_path: req_path,
                    level: cyfs.NONAPILevel.NOC,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: ZoneSimulator.zone1_device1_stack.dec_id,
                    flags: 0,
                }
            };
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err);


        })
        it("req_path delete_object zone内同设备跨dec level=noc", async () => {

            const saveobject = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const saveObjectId = saveobject.desc().calculate_id();
            console.info(`will put_object: id=${saveObjectId},object value = ${saveobject.value} `);
            const object_raw = saveobject.to_vec().unwrap();
            let info = { saveobject, saveObjectId, object_raw }

            const first_delete: cyfs.NONDeleteObjectOutputRequest = {
                common: {  //清理 local cache
                    level: cyfs.NONAPILevel.NOC,
                    flags: 0,
                },
                object_id: info.saveObjectId,

            }
            let del1_res = await zone1device1.non_service().delete_object(first_delete)
            let del2_res = await zone1device2.non_service().delete_object(first_delete)
            console.info('delete_object result:', first_delete);
            assert(!del1_res.err, `delete1 object failed ,err : ${JSON.stringify(del1_res)}`)
            assert(!del2_res.err, `delete2 object failed ,err : ${JSON.stringify(del2_res)}`)


            //注册req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            //给指定设备dec授权该path,不指定默认当前source
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(path, cyfs.AccessString.default())
            await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.NOC,
                },
                access: undefined,
                object: new cyfs.NONObjectInfo(info.saveObjectId, info.object_raw)
            };
            const put_ret = await zone1device1.non_service().put_object(put_req);
            console.log(put_ret)
            assert(!put_ret.err, `put object failed,err : ${JSON.stringify(put_ret)}`)

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: ZoneSimulator.zone1_device1_stack.dec_id,
                    level: cyfs.NONAPILevel.NOC,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                },
                object_id: info.saveObjectId,
            };
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)

        })
        it("req_path put_object zone内同设备同dec level=noc", async () => {

            const saveobject = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const saveObjectId = saveobject.desc().calculate_id();
            console.info(`will put_object: id=${saveObjectId},object value = ${saveobject.value} `);
            const object_raw = saveobject.to_vec().unwrap();
            let info = { saveobject, saveObjectId, object_raw }

            const first_delete: cyfs.NONDeleteObjectOutputRequest = {
                common: {  //清理 local cache
                    level: cyfs.NONAPILevel.NOC,
                    flags: 0,
                },
                object_id: info.saveObjectId,
            }
            let del1_res = await zone1device1.non_service().delete_object(first_delete)
            let del2_res = await zone1device2.non_service().delete_object(first_delete)
            console.info('delete_object result:', first_delete);
            assert(!del1_res.err, `delete1 object failed ,err : ${JSON.stringify(del1_res)}`)
            assert(!del2_res.err, `delete2 object failed ,err : ${JSON.stringify(del2_res)}`)

            //注册req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            //给指定设备dec授权该path,不指定默认当前source
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(path, cyfs.AccessString.full())
            await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.NOC,
                    dec_id: zone1device1_dec_id
                },
                access: undefined,
                object: new cyfs.NONObjectInfo(info.saveObjectId, info.object_raw)
            };
            const put_ret = await zone1device1.non_service().put_object(put_req);
            console.log(put_ret)
            assert(!put_ret.err, `put object failed,err : ${JSON.stringify(put_ret)}`)

        })
        it("req_path get_object zone内同设备同dec level=noc", async () => {

            const saveobject = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const saveObjectId = saveobject.desc().calculate_id();
            console.info(`will put_object: id=${saveObjectId},object value = ${saveobject.value} `);
            const object_raw = saveobject.to_vec().unwrap();
            let info = { saveobject, saveObjectId, object_raw }

            const first_delete: cyfs.NONDeleteObjectOutputRequest = {
                common: {  //清理 local cache
                    level: cyfs.NONAPILevel.NOC,
                    flags: 0,
                },
                object_id: info.saveObjectId,

            }
            let del1_res = await zone1device1.non_service().delete_object(first_delete)
            let del2_res = await zone1device2.non_service().delete_object(first_delete)
            console.info('delete_object result:', first_delete);
            assert(!del1_res.err, `delete1 object failed ,err : ${JSON.stringify(del1_res)}`)
            assert(!del2_res.err, `delete2 object failed ,err : ${JSON.stringify(del2_res)}`)


            //注册req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            //给指定设备dec授权该path,不指定默认当前source
            let permission = cyfs.GlobalStatePathAccessItem.new_group(path,
                undefined, undefined, ZoneSimulator.zone1_device1_stack.dec_id, cyfs.AccessPermissions.Full)
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(permission)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.NOC,
                },
                access: undefined,
                object: new cyfs.NONObjectInfo(info.saveObjectId, info.object_raw)
            };
            const put_ret = await zone1device1.non_service().put_object(put_req);
            console.log(put_ret)
            assert(!put_ret.err, `put object failed,err : ${JSON.stringify(put_ret)}`)

            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: info.saveObjectId,
                common: {
                    req_path: req_path,
                    level: cyfs.NONAPILevel.NOC,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: zone1device1_dec_id,
                    flags: 0,
                }
            };
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err);


        })
        it("req_path delete_object zone内同设备同dec level=noc", async () => {

            const saveobject = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const saveObjectId = saveobject.desc().calculate_id();
            console.info(`will put_object: id=${saveObjectId},object value = ${saveobject.value} `);
            const object_raw = saveobject.to_vec().unwrap();
            let info = { saveobject, saveObjectId, object_raw }

            const first_delete: cyfs.NONDeleteObjectOutputRequest = {
                common: {  //清理 local cache
                    level: cyfs.NONAPILevel.NOC,
                    flags: 0,
                },
                object_id: info.saveObjectId,

            }
            let del1_res = await zone1device1.non_service().delete_object(first_delete)
            let del2_res = await zone1device2.non_service().delete_object(first_delete)
            console.info('delete_object result:', first_delete);
            assert(!del1_res.err, `delete1 object failed ,err : ${JSON.stringify(del1_res)}`)
            assert(!del2_res.err, `delete2 object failed ,err : ${JSON.stringify(del2_res)}`)


            //注册req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            //给指定设备dec授权该path,不指定默认当前source
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(path, cyfs.AccessString.default())
            await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.NOC,
                },
                access: undefined,
                object: new cyfs.NONObjectInfo(info.saveObjectId, info.object_raw)
            };
            const put_ret = await zone1device1.non_service().put_object(put_req);
            console.log(put_ret)
            assert(!put_ret.err, `put object failed,err : ${JSON.stringify(put_ret)}`)

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: zone1device1_dec_id,
                    level: cyfs.NONAPILevel.NOC,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                },
                object_id: info.saveObjectId,
            };
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)

        })

    })

    describe("postObject", async()=>{
        afterEach(async function () {
            await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).clear_access()
            handlerManager.clearAllHandler()
        })
        
        it("NONRequestor调用post_object同dec同设备", async () => {
            const saveobject = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const saveObjectId = saveobject.desc().calculate_id();
            const object_raw = saveobject.to_vec().unwrap();
            let info = { saveobject, saveObjectId, object_raw }

            // 构造req_path       
            let path = "/test_non/reqpath"
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
        it("NONRequestor调用post_object同zone不同dec设备授权后请求成功", async () => {
            const saveobject = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
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
                "post-object-handler-003",
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

            let permission = cyfs.GlobalStatePathAccessItem.new_group(path,
                undefined, undefined, zone1device2_dec_id, cyfs.AccessPermissions.Full)
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(permission)

            const req1: cyfs.NONPostObjectOutputRequest = {

                object: cyfs.NONObjectInfo.new_from_object_raw(info.object_raw).unwrap(),//info.saveObjectId,
                common: {
                    req_path: req_path,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: zone1device2_dec_id,
                    flags: 0,
                }
            };
            const post_ret = await zone1device2.non_service().post_object(req1);
            console.info('post_object result:', post_ret);
            assert(!post_ret.err)
            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`post_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)
        })
        it("NONRequestor调用post_object同zone不同dec相同设备授权后请求成功", async () => {
            const saveobject = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
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
                "post-object-handler-004",
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

            let permission = cyfs.GlobalStatePathAccessItem.new_group(path,
                undefined, undefined, ZoneSimulator.zone1_device1_stack.dec_id, cyfs.AccessPermissions.Full)
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(permission)

            const req1: cyfs.NONPostObjectOutputRequest = {

                object: cyfs.NONObjectInfo.new_from_object_raw(info.object_raw).unwrap(),//info.saveObjectId,
                common: {
                    req_path: req_path,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: ZoneSimulator.zone1_device1_stack.dec_id,
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
        it("NONRequestor调用post_object跨zone同Dec不同设备授权后请求成功", async () => {
            const saveobject = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
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

            let permission = cyfs.GlobalStatePathAccessItem.new_group(path,
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
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
            const post_ret = await zone2device1.non_service().post_object(req1);
            console.info('post_object result:', post_ret);
            assert(!post_ret.err)
            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`post_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)
        })
        it("NONRequestor调用post_object跨zone不同Dec设备授权后请求成功", async () => {
            const saveobject = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
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

            let permission2 = cyfs.GlobalStatePathAccessItem.new_group(path,
                undefined, undefined, zone2device1_dec_id, cyfs.AccessPermissions.Full)
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(permission2)

            const req1: cyfs.NONPostObjectOutputRequest = {
                object: cyfs.NONObjectInfo.new_from_object_raw(info.object_raw).unwrap(),//info.saveObjectId,
                common: {
                    req_path: req_path,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: zone2device1_dec_id,
                    flags: 0,
                }
            };
            const post_ret = await zone2device1.non_service().post_object(req1);
            console.info('post_object result:', post_ret);
            assert(!post_ret.err)
            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`post_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)
        })

        it("req_path post_object zone内同设备同dec level=noc", async () => {
            const saveobject = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
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
                "post-object-handler-003",
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

            let permission = cyfs.GlobalStatePathAccessItem.new_group(path,
                undefined, undefined, ZoneSimulator.zone1_device1_stack.dec_id, cyfs.AccessPermissions.Full)
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(permission)

            const req1: cyfs.NONPostObjectOutputRequest = {

                object: cyfs.NONObjectInfo.new_from_object_raw(info.object_raw).unwrap(),//info.saveObjectId,
                common: {
                    req_path: req_path,
                    level: cyfs.NONAPILevel.NOC,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: zone1device1_dec_id,
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
        it("req_path post_object zone内同设备跨dec level=noc", async () => {
            const saveobject = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
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
                "post-object-handler-003",
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

            let permission = cyfs.GlobalStatePathAccessItem.new_group(path,
                undefined, undefined, ZoneSimulator.zone1_device1_stack.dec_id, cyfs.AccessPermissions.Full)
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(permission)

            const req1: cyfs.NONPostObjectOutputRequest = {

                object: cyfs.NONObjectInfo.new_from_object_raw(info.object_raw).unwrap(),//info.saveObjectId,
                common: {
                    req_path: req_path,
                    level: cyfs.NONAPILevel.NOC,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: ZoneSimulator.zone1_device1_stack.dec_id,
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
        it("req_path post_object zone内不同设备跨dec level=non", async () => {

            const saveobject = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
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
                "post-object-handler-003",
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

            let permission = cyfs.GlobalStatePathAccessItem.new_group(path,
                undefined, undefined, zone1device2_dec_id, cyfs.AccessPermissions.Full)
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(permission)

            const req1: cyfs.NONPostObjectOutputRequest = {

                object: cyfs.NONObjectInfo.new_from_object_raw(info.object_raw).unwrap(),//info.saveObjectId,
                common: {
                    req_path: req_path,
                    level: cyfs.NONAPILevel.NON,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: zone1device2_dec_id,
                    flags: 0,
                }
            };
            const post_ret = await zone1device2.non_service().post_object(req1);
            console.info('post_object result:', post_ret);
            assert(!post_ret.err)
            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`post_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)
        })
        it("req_path post_object zone内同设备跨dec level=non", async () => {

            const saveobject = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
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
                "post-object-handler-003",
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

            let permission = cyfs.GlobalStatePathAccessItem.new_group(path,
                undefined, undefined, ZoneSimulator.zone1_device1_stack.dec_id, cyfs.AccessPermissions.Full)
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(permission)

            const req1: cyfs.NONPostObjectOutputRequest = {

                object: cyfs.NONObjectInfo.new_from_object_raw(info.object_raw).unwrap(),//info.saveObjectId,
                common: {
                    req_path: req_path,
                    level: cyfs.NONAPILevel.NON,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: ZoneSimulator.zone1_device1_stack.dec_id,
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

        it.skip("post调用 globalroot path", async () => {

            const obj = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
            const object_raw = obj.to_vec().unwrap();

            //注入req_path及对象
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, object_id, undefined, true)
            let root_info = (await op_env.commit()).unwrap()
            root_info.dec_root
            root_info.root
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
            let root_req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path, undefined, cyfs.RequestGlobalStateRoot.GlobalRoot(root_info.root)).toString()  //cyfs.get_system_dec_app().object_id
            let decroot_req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path, undefined, cyfs.RequestGlobalStateRoot.DecRoot(root_info.dec_root)).toString()  //cyfs.get_system_dec_app().object_id

            console.log("------------------------>" + req_path)

            // //给指定设备dec授权该path,不指定默认当前source
            // let rwx = cyfs.AccessString.default()
            //console.log(rwx)
            // let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(path,rwx)
            // zone1device1.root_state_meta_stub(zone2device1.local_device_id().object_id,zone1device1_dec_id).add_access(item)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: path,
                    dec_id: zone1device1.local_device_id().object_id,
                    flags: 0,
                    target: zone1device1.dec_id,
                    level: cyfs.NONAPILevel.Router //设置路由类型
                },
                object: new cyfs.NONObjectInfo(object_id, object_raw),
                access: undefined
            };
            const put_ret2 = await zone1device1.non_service().put_object(put_req);
            const put_ret3 = await zone1ood.non_service().put_object(put_req);
            console.log(put_ret3)
            assert(!put_ret2.err, `put object failed,err : ${JSON.stringify(put_ret2)}`)
            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: object_id,
                common: {
                    req_path: undefined,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.dec_id,
                    dec_id: zone1device1.local_device_id().object_id,
                    flags: 0,
                }
            };
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err);

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device1.dec_id,
                },
                object_id: object_id,

            };
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)

        })
        it.skip("post调用 decroot path", async () => {

            const obj = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
            const object_raw = obj.to_vec().unwrap();

            //注册req_path
            let path = "/test_non/reqpath"
            let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            op_env.set_with_path(path, object_id, undefined, true)
            let root_info = (await op_env.commit()).unwrap()
            root_info.dec_root
            root_info.root
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()  //cyfs.get_system_dec_app().object_id
            let root_req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path, undefined, cyfs.RequestGlobalStateRoot.GlobalRoot(root_info.root)).toString()  //cyfs.get_system_dec_app().object_id
            let decroot_req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path, undefined, cyfs.RequestGlobalStateRoot.DecRoot(root_info.dec_root)).toString()  //cyfs.get_system_dec_app().object_id

            console.log("------------------------>" + req_path)

            // //给指定设备dec授权该path,不指定默认当前source
            // let rwx = cyfs.AccessString.default()
            //console.log(rwx)
            // let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(path,rwx)
            // zone1device1.root_state_meta_stub(zone2device1.local_device_id().object_id,zone1device1_dec_id).add_access(item)






            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: path,
                    dec_id: zone1device1.local_device_id().object_id,
                    flags: 0,
                    target: zone1device1.dec_id,
                    level: cyfs.NONAPILevel.Router //设置路由类型
                },
                object: new cyfs.NONObjectInfo(object_id, object_raw),
                access: undefined
            };
            const put_ret2 = await zone1device1.non_service().put_object(put_req);
            const put_ret3 = await zone1ood.non_service().put_object(put_req);
            console.log(put_ret3)
            assert(!put_ret2.err, `put object failed,err : ${JSON.stringify(put_ret2)}`)
            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: object_id,
                common: {
                    req_path: undefined,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device1.dec_id,
                    dec_id: zone1device1.local_device_id().object_id,
                    flags: 0,
                }
            };
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err);

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device1.dec_id,
                },
                object_id: object_id,

            };
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)

        })

    })
})