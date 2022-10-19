import assert = require('assert');
import * as cyfs from "../../cyfs_node/cyfs_node"
import { stack, stackInfo, ZoneSimulator } from "../../common/utils";
import * as myHandler from "./handler"

import * as path from "path"
import * as fs from 'fs-extra';
import { access } from 'fs';

//初始化日志
cyfs.clog.enable_file_log({
    name: "unittest_stack_interface",
    dir: cyfs.get_app_log_dir("unittest_stack_interface"),
    file_max_size: 1024 * 1024 * 10,
    file_max_count: 10,
});

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
        // console.log("-----------------------------------=-=-=-=-=-===-" + sysdec)
        system_stack = ZoneSimulator.zone1_device1_stack.fork_with_new_dec(sysdec)

    })
    this.afterAll(async () => {
        console.info(`#########用例执行完成`);
        handlerManager.clearAllHandler()
        ZoneSimulator.clearZoneSimulator();
        process.exit(0)

    })

    describe("#access默认权限设置", async () => {
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

        it("default权限-zone2device从zone1device的get失败", async () => {
            let info = await createTestObject(zone1device1, ZoneSimulator.zone1_device1_peerId, cyfs.AccessString.default())
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
            assert(get_ret.err, `get object failed,err : ${JSON.stringify(get_ret)}`);


        })

        it("default权限-zone1device从zone2ood的get失败", async () => {
            let info = await createTestObject(zone2ood, ZoneSimulator.zone2_ood_peerId, cyfs.AccessString.default())
            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: info.saveObjectId,
                common: {
                    req_path: undefined,
                    level: cyfs.NONAPILevel.Router,
                    target: zone2ood.local_device_id().object_id,
                    dec_id: zone1device1_dec_id,
                    flags: 0,
                }
            };
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(get_ret.err, `get object failed,err : ${JSON.stringify(get_ret)}`);


        })

        it("default权限-zone1ood从zone2ood的get失败", async () => {
            let info = await createTestObject(zone2ood, ZoneSimulator.zone2_ood_peerId, cyfs.AccessString.default())
            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: info.saveObjectId,
                common: {
                    req_path: undefined,
                    level: cyfs.NONAPILevel.Router,
                    target: zone2ood.local_device_id().object_id,
                    dec_id: zone1ooddec_id,
                    flags: 0,
                }
            };
            const get_ret = await zone1ood.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(get_ret.err, `get object failed,err : ${JSON.stringify(get_ret)}`);


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

        it("default权限-putObject目标不同zone，请求失败", async () => {
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
                    target: zone2device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router //设置路由类型
                },
                object: new cyfs.NONObjectInfo(object_id, object_raw),
                access: rwx
            };
            const put_ret2 = await zone1device1.non_service().put_object(put_req);
            const put_ret3 = await zone1device1.non_service().put_object(put_req);
            console.log(put_ret3)
            assert(put_ret2.err, `put object other zone success ,err : ${JSON.stringify(put_ret2)}`)

        })

        it("default权限-deleteObject目标不同zone，请求失败", async () => {
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
                    target: zone1ood.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router //设置路由类型
                },
                object: new cyfs.NONObjectInfo(object_id, object_raw),
                access: rwx
            };
            const put_ret2 = await zone1device1.non_service().put_object(put_req);
            console.log(put_ret2)
            assert(!put_ret2.err, `put object failed,err : ${JSON.stringify(put_ret2)}`)

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: zone2ooddec_id,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                },
                object_id: object_id,

            };
            const delete_ret = await zone2ood.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(delete_ret.err, `delete object other zone success,err : ${JSON.stringify(delete_ret)}`)

        })

        it("default权限-access不填权限为默认值跨zone-ood访问失败", async () => {
            let info = await createTestObject(zone2ood, ZoneSimulator.zone2_ood_peerId)
            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: info.saveObjectId,
                common: {
                    req_path: undefined,
                    level: cyfs.NONAPILevel.Router,
                    target: zone2ood.local_device_id().object_id,
                    dec_id: zone1ooddec_id,
                    flags: 0,
                }
            };
            const get_ret = await zone1ood.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(get_ret.err, `defalut permission get object cross zone success,err : ${JSON.stringify(get_ret)}`);


        })

        it("default权限-zone内发起请求指定了sourceDec与put时dec不同，能请求成功", async () => {
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

        it("access不填权限为默认值跨zone-device访问失败", async () => {
            let info = await createTestObject(zone2device1, ZoneSimulator.zone2_device1_peerId)
            // get
            const get_req: cyfs.NONGetObjectOutputRequest = {
                object_id: info.saveObjectId,
                common: {
                    req_path: undefined,
                    level: cyfs.NONAPILevel.Router,
                    target: zone2device1.local_device_id().object_id,
                    dec_id: zone1device1_dec_id,
                    flags: 0,
                }
            };
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(get_ret.err, `default permission get object cross zone success,err : ${JSON.stringify(get_ret)}`);


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

        it("Full权限-跨zone操作delete失败，zone2ood从zone1device", async () => {
            let info = await createTestObject(zone1device1, ZoneSimulator.zone1_device1_peerId, cyfs.AccessString.full())
            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: zone2ooddec_id,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                },
                object_id: info.saveObjectId,

            };
            const delete_ret = await zone2ood.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
        })

        it("Full权限-跨zone二次操作put失败，zone2device从zone1device", async () => {
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
                    dec_id: zone2device1_dec_id,
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

        it("Full_except_write权限-zone内二次put、get、delete正常", async () => {
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

        it("设置组合权限-当前设备由full到none", async () => {
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
            rwx.set_group_permissions(cyfs.AccessGroup.CurrentDevice, cyfs.AccessPermissions.None)
            const put_ret2 = await zone1device1.non_service().put_object(put_req);
            const put_ret3 = await zone1device1.non_service().put_object(put_req);
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
                    dec_id: zone1device1_dec_id,
                    flags: 0,
                }
            };
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(get_ret.err);

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
            assert(delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
        })

        it("设置组合权限-当前设备由full到callonly", async () => {
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
            rwx.set_group_permissions(cyfs.AccessGroup.CurrentDevice, cyfs.AccessPermissions.CallOnly)
            const put_ret2 = await zone1device1.non_service().put_object(put_req);
            const put_ret3 = await zone1device1.non_service().put_object(put_req);
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
                    dec_id: zone1device1_dec_id,
                    flags: 0,
                }
            };
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(get_ret.err);

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
            assert(delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
        })

        it("设置组合权限-当前设备由full到writeonly", async () => {
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
            rwx.set_group_permissions(cyfs.AccessGroup.CurrentDevice, cyfs.AccessPermissions.WriteOnly)
            const put_ret2 = await zone1device1.non_service().put_object(put_req);
            const put_ret3 = await zone1device1.non_service().put_object(put_req);
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
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(get_ret.err);

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

        //待添加call请求
        it("设置组合权限-当前设备由full到writeAndCall", async () => {
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
            rwx.set_group_permissions(cyfs.AccessGroup.CurrentDevice, cyfs.AccessPermissions.WriteOnly)
            console.log(rwx)
            const put_ret2 = await zone1device1.non_service().put_object(put_req);
            const put_ret3 = await zone1device1.non_service().put_object(put_req);
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
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(get_ret.err);

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

        it("设置组合权限-当前设备由full到readOnly", async () => {
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
            rwx.set_group_permissions(cyfs.AccessGroup.CurrentDevice, cyfs.AccessPermissions.ReadOnly)
            console.log(rwx)
            const put_ret2 = await zone1device1.non_service().put_object(put_req);
            const put_ret3 = await zone1device1.non_service().put_object(put_req);
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
            assert(delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
        })
        //待添加call
        it("设置组合权限-当前设备由full到readAndCall", async () => {
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
            rwx.set_group_permissions(cyfs.AccessGroup.CurrentDevice, cyfs.AccessPermissions.ReadAndCall)
            console.log(rwx)
            const put_ret2 = await zone1device1.non_service().put_object(put_req);
            const put_ret3 = await zone1device1.non_service().put_object(put_req);
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
            assert(delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
        })

        it("设置组合权限-当前设备由full到readAndWrite", async () => {
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
            rwx.set_group_permissions(cyfs.AccessGroup.CurrentDevice, cyfs.AccessPermissions.ReadAndWrite)
            console.log(rwx)
            const put_ret2 = await zone1device1.non_service().put_object(put_req);
            const put_ret3 = await zone1device1.non_service().put_object(put_req);
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
        it("设置组合权限-当前设备重复设置为full", async () => {
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
            rwx.set_group_permissions(cyfs.AccessGroup.CurrentDevice, cyfs.AccessPermissions.Full)
            console.log(rwx)
            const put_ret2 = await zone1device1.non_service().put_object(put_req);
            const put_ret3 = await zone1device1.non_service().put_object(put_req);
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

        it("设置组合权限-当前设备none权限设置为full", async () => {
            const obj = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            console.log(object_id)
            console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
            const object_raw = obj.to_vec().unwrap();
            let rwx = new cyfs.AccessString(0o000000)
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
            rwx.set_group_permissions(cyfs.AccessGroup.CurrentDevice, cyfs.AccessPermissions.Full)
            console.log(rwx)
            const put_ret2 = await zone1device1.non_service().put_object(put_req);
            const put_ret3 = await zone1device1.non_service().put_object(put_req);
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
                    dec_id: zone1device1_dec_id,
                    flags: 0,
                }
            };
            const get_ret2 = await zone2device1.non_service().get_object(get_req);
            const get_ret1 = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret1);
            assert(get_ret1.err);
            assert(get_ret2.err);

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                },
                object_id: object_id,

            };
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
        })

        it("设置组合权限-当前zone权限为full", async () => {
            const obj = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            console.log(object_id)
            console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
            const object_raw = obj.to_vec().unwrap();
            let rwx = new cyfs.AccessString(0o000000)
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
            rwx.set_group_permissions(cyfs.AccessGroup.CurrentZone, cyfs.AccessPermissions.Full)
            console.log(rwx)
            const put_ret2 = await zone1device1.non_service().put_object(put_req);
            const put_ret3 = await zone1device2.non_service().put_object(put_req);
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
                    dec_id: zone1device1_dec_id,
                    flags: 0,
                }
            };
            const get_ret2 = await zone1device1.non_service().get_object(get_req);
            const get_ret1 = await zone1device2.non_service().get_object(get_req);
            console.info('get_object result:', get_ret1);
            assert(get_ret1.err);
            assert(get_ret2.err);

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: zone1device1.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device1.local_device_id().object_id,
                },
                object_id: object_id,

            };
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
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

        it("多个分组设置组合权限-当前zone为full和OwnerDec权限为None", async () => {
            const obj = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            console.log(object_id)
            console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
            const object_raw = obj.to_vec().unwrap();
            let rwx = cyfs.AccessString.make([{ group: cyfs.AccessGroup.CurrentZone, permissions: cyfs.AccessPermissions.Full },
            { group: cyfs.AccessGroup.OwnerDec, permissions: cyfs.AccessPermissions.None }])
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
            assert(put_ret3.err, `put object failed,err : ${JSON.stringify(put_ret3)}`)
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
            assert(get_ret1.err);
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
            assert(delete_ret1.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
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
        it("多个分组设置组合权限-otherZone和OtherDec权限为none", async () => {
            const obj = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            console.log(object_id)
            console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
            const object_raw = obj.to_vec().unwrap();
            let rwx = cyfs.AccessString.make([{ group: cyfs.AccessGroup.OthersZone, permissions: cyfs.AccessPermissions.Full },
            { group: cyfs.AccessGroup.OthersDec, permissions: cyfs.AccessPermissions.None }])
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

        it("多个分组设置组合权限-重复设置同组不同权限", async () => {
            const obj = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            console.log(object_id)
            console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
            const object_raw = obj.to_vec().unwrap();
            let rwx = cyfs.AccessString.make([{ group: cyfs.AccessGroup.OthersZone, permissions: cyfs.AccessPermissions.Full },
            { group: cyfs.AccessGroup.OthersZone, permissions: cyfs.AccessPermissions.None },
            { group: cyfs.AccessGroup.OthersZone, permissions: cyfs.AccessPermissions.WriteOnly },
            { group: cyfs.AccessGroup.OwnerDec, permissions: cyfs.AccessPermissions.Full }, { group: cyfs.AccessGroup.CurrentDevice, permissions: cyfs.AccessPermissions.Full }, { group: cyfs.AccessGroup.CurrentZone, permissions: cyfs.AccessPermissions.Full }])
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
            const put_ret4 = await zone1device1.non_service().put_object(put_req);
            console.log(put_ret3)
            assert(!put_ret2.err, `put object failed,err : ${JSON.stringify(put_ret2)}`)
            assert(!put_ret3.err, `put object failed,err : ${JSON.stringify(put_ret3)}`)
            assert(!put_ret4.err, `put object failed,err : ${JSON.stringify(put_ret4)}`)
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

        it("多个分组设置组合权限-重复设置同组多组相同权限", async () => {
            const obj = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            console.log(object_id)
            console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
            const object_raw = obj.to_vec().unwrap();
            let rwx = cyfs.AccessString.make([{ group: cyfs.AccessGroup.OthersZone, permissions: cyfs.AccessPermissions.Full },
            { group: cyfs.AccessGroup.OthersZone, permissions: cyfs.AccessPermissions.None },
            { group: cyfs.AccessGroup.OthersZone, permissions: cyfs.AccessPermissions.WriteOnly },
            { group: cyfs.AccessGroup.OwnerDec, permissions: cyfs.AccessPermissions.Full }, { group: cyfs.AccessGroup.CurrentDevice, permissions: cyfs.AccessPermissions.Full }, { group: cyfs.AccessGroup.CurrentZone, permissions: cyfs.AccessPermissions.Full }, { group: cyfs.AccessGroup.CurrentZone, permissions: cyfs.AccessPermissions.ReadOnly }, { group: cyfs.AccessGroup.CurrentZone, permissions: cyfs.AccessPermissions.ReadAndWrite }])
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
            const put_ret4 = await zone1device1.non_service().put_object(put_req);
            console.log(put_ret3)
            assert(!put_ret2.err, `put object failed,err : ${JSON.stringify(put_ret2)}`)
            assert(!put_ret3.err, `put object failed,err : ${JSON.stringify(put_ret3)}`)
            assert(!put_ret4.err, `put object failed,err : ${JSON.stringify(put_ret4)}`)
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

    describe("#NON接口req_path", async () => {
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
            let stub = zone1device2.root_state_stub(zone1device2.local_device_id().object_id, zone1device2_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device2_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            //给指定设备dec授权该path,不指定默认当前source
            let rwx = new cyfs.AccessString(0o777777)
            console.log("---------------------------> " + rwx)
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(req_path, rwx)
            zone1device2.root_state_meta_stub(zone1device2.local_device_id().object_id, zone1device2_dec_id).add_access(item)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device2.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router,
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
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device2.local_device_id().object_id,
                    dec_id: undefined,
                    flags: 0,
                }
            };
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err);

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: undefined,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device2.local_device_id().object_id,
                },
                object_id: info.saveObjectId,

            };
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)

        })
        it("path已授权默认权限跨zone请求get失败", async () => {
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

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
            let stub = zone1device2.root_state_stub(zone1device2.local_device_id().object_id, zone1device2_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device2_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            //给指定设备dec授权该path,不指定默认当前source
            let rwx = new cyfs.AccessString(0o777777)
            console.log("---------------------------> " + rwx)
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(req_path, rwx)
            zone1device2.root_state_meta_stub(zone1device2.local_device_id().object_id, zone1device2_dec_id).add_access(item)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device2.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router,
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
                    req_path: undefined,
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device2.local_device_id().object_id,
                    dec_id: undefined,
                    flags: 0,
                }
            };
            const get_ret = await zone2device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(get_ret.err);

        })
        it("path已授权默认权限跨zone请求delete失败", async () => {
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

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
            let stub = zone1device2.root_state_stub(zone1device2.local_device_id().object_id, zone1device2_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device2_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            //给指定设备dec授权该path,不指定默认当前source
            let rwx = new cyfs.AccessString(0o777777)
            console.log("---------------------------> " + rwx)
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(req_path, rwx)
            zone1device2.root_state_meta_stub(zone1device2.local_device_id().object_id, zone1device2_dec_id).add_access(item)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device2.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router,
                },
                access: undefined,
                object: new cyfs.NONObjectInfo(info.saveObjectId, info.object_raw)
            };
            const put_ret = await zone1device1.non_service().put_object(put_req);
            console.log(put_ret)
            assert(!put_ret.err, `put object failed,err : ${JSON.stringify(put_ret)}`)

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: undefined,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device2.local_device_id().object_id,
                },
                object_id: info.saveObjectId,

            };
            const delete_ret = await zone2device1.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)

        })
        it("没授权zone内不同dec，put失败", async () => {
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());

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
            let stub = zone1device2.root_state_stub(zone1device2.local_device_id().object_id, zone1device2_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device2_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device2.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router,
                },
                access: undefined,
                object: new cyfs.NONObjectInfo(info.saveObjectId, info.object_raw)
            };
            const put_ret = await zone1device1.non_service().put_object(put_req);
            console.log(put_ret)
            assert(put_ret.err, `put object failed,err : ${JSON.stringify(put_ret)}`)
        })
        it("zone内不同dec，put后不授权、get失败", async () => {

            const saveobject = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const saveObjectId = saveobject.desc().calculate_id();
            console.info(`will put_object: id=${saveObjectId},object value = ${saveobject.value} `);
            const object_raw = saveobject.to_vec().unwrap();
            let info = { saveobject, saveObjectId, object_raw }


            //注册req_path
            let path = "/test_non/reqpath"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()

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
            assert(get_ret.err);

        })
        it("zone内不同dec，put后不授权、delete失败", async () => {
            let info = await createTestObject(zone1device1, zone1device1.local_device_id().to_base_58());
            //清理 local cache
            const first_delete: cyfs.NONDeleteObjectOutputRequest = {
                common: {
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
            let stub = zone1device2.root_state_stub(zone1device2.local_device_id().object_id, zone1device2_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device2_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            //给指定设备dec授权该path,不指定默认当前source
            let rwx = new cyfs.AccessString(0o777777)
            console.log("---------------------------> " + rwx)
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(req_path, rwx)
            zone1device2.root_state_meta_stub(zone1device2.local_device_id().object_id, zone1device2_dec_id).add_access(item)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device2.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router,
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
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device2.local_device_id().object_id,
                    dec_id: undefined,
                    flags: 0,
                }
            };
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err);

            zone1device2.root_state_meta_stub(zone1device2.local_device_id().object_id, zone1device2_dec_id).remove_access(item)

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: undefined,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device2.local_device_id().object_id,
                },
                object_id: info.saveObjectId,

            };
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)

        })
        it("NONRequestor调用put_object正常流程", async () => {

            const obj = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
            const object_raw = obj.to_vec().unwrap();

            //注入req_path及对象
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
        it("NONRequestor调用get_object正常流程", async () => {

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
        it("NONRequestor调用post_object默认同dec同设备", async () => {
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
        it("NONRequestor调用post_object同zone不同dec设备没授权请求失败", async () => {
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
            assert(post_ret.err)
            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`post_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(handlerResult.err)
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
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(permission)

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

            let permission = cyfs.GlobalStatePathAccessItem.new_group(req_path,
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(permission)

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
            const post_ret = await zone1device1.non_service().post_object(req1);
            console.info('post_object result:', post_ret);
            assert(!post_ret.err)
            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`post_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)
        })
        it("NONRequestor调用post_object跨zone同Dec不同设备不授权请求失败", async () => {
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
            assert(post_ret.err)
            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`post_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(handlerResult.err)
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

            let permission = cyfs.GlobalStatePathAccessItem.new_group(req_path,
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, zone1device1_dec_id, cyfs.AccessPermissions.WirteAndCall)
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
        it("NONRequestor调用post_object跨zone不同Dec设备不授权请求失败", async () => {
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
            const post_ret = await zone2device1.non_service().post_object(req1);
            console.info('post_object result:', post_ret);
            assert(post_ret.err)
            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`post_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(handlerResult.err)
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

            let permission = cyfs.GlobalStatePathAccessItem.new_group(req_path,
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, zone1device1_dec_id, cyfs.AccessPermissions.WirteAndCall)
            await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(permission)

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
            const post_ret = await zone2device1.non_service().post_object(req1);
            console.info('post_object result:', post_ret);
            assert(!post_ret.err)
            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`post_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)
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
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(req_path, rwx)
            zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)

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
        it.only("req_path get_object zone内不同设备跨dec level=non", async () => {

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
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(req_path, rwx)
            zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device2_dec_id).add_access(item)

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
                    dec_id: zone1device1_dec_id,
                    flags: 0,
                }
            };
            const get_ret = await zone1device2.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err);

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: undefined,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device2.local_device_id().object_id,
                },
                object_id: info.saveObjectId,

            };
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)

        })
        it("req_path post_object zone内不同设备跨dec level=non", async () => {

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
            let stub = zone1device2.root_state_stub(zone1device2.local_device_id().object_id, zone1device2_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device2_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            //给指定设备dec授权该path,不指定默认当前source
            let rwx = new cyfs.AccessString(0o777777)
            console.log("---------------------------> " + rwx)
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(req_path, rwx)
            zone1device2.root_state_meta_stub(zone1device2.local_device_id().object_id, zone1device2_dec_id).add_access(item)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device2.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router,
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
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device2.local_device_id().object_id,
                    dec_id: undefined,
                    flags: 0,
                }
            };
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err);

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: undefined,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device2.local_device_id().object_id,
                },
                object_id: info.saveObjectId,

            };
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)

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
            let stub = zone1device2.root_state_stub(zone1device2.local_device_id().object_id, zone1device2_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device2_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            //给指定设备dec授权该path,不指定默认当前source
            let rwx = new cyfs.AccessString(0o777777)
            console.log("---------------------------> " + rwx)
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(req_path, rwx)
            zone1device2.root_state_meta_stub(zone1device2.local_device_id().object_id, zone1device2_dec_id).add_access(item)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device2.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router,
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
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device2.local_device_id().object_id,
                    dec_id: undefined,
                    flags: 0,
                }
            };
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err);

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: undefined,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device2.local_device_id().object_id,
                },
                object_id: info.saveObjectId,

            };
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)

        })
        it("req_path put_object zone内不同设备跨dec level=noc", async () => {

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
            let rwx = new cyfs.AccessString(0o777777)
            console.log("---------------------------> " + rwx)
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(req_path, rwx)
            zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device2.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router,
                },
                access: undefined,
                object: new cyfs.NONObjectInfo(info.saveObjectId, info.object_raw)
            };
            const put_ret = await zone1device1.non_service().put_object(put_req);
            console.log(put_ret)
            assert(!put_ret.err, `put object failed,err : ${JSON.stringify(put_ret)}`)

        })
        it("req_path get_object zone内不同设备跨dec level=noc", async () => {

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
            let stub = zone1device2.root_state_stub(zone1device2.local_device_id().object_id, zone1device2_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device2_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            //给指定设备dec授权该path,不指定默认当前source
            let rwx = new cyfs.AccessString(0o777777)
            console.log("---------------------------> " + rwx)
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(req_path, rwx)
            zone1device2.root_state_meta_stub(zone1device2.local_device_id().object_id, zone1device2_dec_id).add_access(item)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device2.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router,
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
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device2.local_device_id().object_id,
                    dec_id: undefined,
                    flags: 0,
                }
            };
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err);

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: undefined,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device2.local_device_id().object_id,
                },
                object_id: info.saveObjectId,

            };
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)

        })
        it("req_path post_object zone内不同设备跨dec level=noc", async () => {

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
            let stub = zone1device2.root_state_stub(zone1device2.local_device_id().object_id, zone1device2_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device2_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            //给指定设备dec授权该path,不指定默认当前source
            let rwx = new cyfs.AccessString(0o777777)
            console.log("---------------------------> " + rwx)
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(req_path, rwx)
            zone1device2.root_state_meta_stub(zone1device2.local_device_id().object_id, zone1device2_dec_id).add_access(item)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device2.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router,
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
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device2.local_device_id().object_id,
                    dec_id: undefined,
                    flags: 0,
                }
            };
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err);

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: undefined,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device2.local_device_id().object_id,
                },
                object_id: info.saveObjectId,

            };
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)

        })
        it("req_path delete_object zone内不同设备跨dec level=noc", async () => {

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
            let stub = zone1device2.root_state_stub(zone1device2.local_device_id().object_id, zone1device2_dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            await op_env.set_with_path(path, info.saveObjectId, undefined, true)
            let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device2_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            //给指定设备dec授权该path,不指定默认当前source
            let rwx = new cyfs.AccessString(0o777777)
            console.log("---------------------------> " + rwx)
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(req_path, rwx)
            zone1device2.root_state_meta_stub(zone1device2.local_device_id().object_id, zone1device2_dec_id).add_access(item)

            const put_req: cyfs.NONPutObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0,
                    target: zone1device2.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router,
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
                    level: cyfs.NONAPILevel.Router,
                    target: zone1device2.local_device_id().object_id,
                    dec_id: undefined,
                    flags: 0,
                }
            };
            const get_ret = await zone1device1.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err);

            const del_req: cyfs.NONDeleteObjectOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: undefined,
                    level: cyfs.NONAPILevel.Router,
                    flags: 0,
                    target: zone1device2.local_device_id().object_id,
                },
                object_id: info.saveObjectId,

            };
            const delete_ret = await zone1device1.non_service().delete_object(del_req);
            console.info('delete_object result:', delete_ret);
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)

        })

    })

    describe("#router-handlers", async () => {
        it("添加hook handler prerouter put_object默认action", async () => {
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
            assert(!get_ret.err);


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
            assert(!get_ret.err);


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
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
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
                new myHandler.CryptoHandlerDefault("zone1device1", "sign_handler_01", "PreRouter")
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
            assert(signed_obj.signs().desc_signs().unwrap().length === 1, "check desc signs failed");
            assert(signed_obj.signs().body_signs().unwrap().length === 1, "check body signs failed");
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
                new myHandler.CryptoHandlerDefault("zone1device1", "sign_handler_01", "PreRouter")
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
            assert(signed_obj.signs().desc_signs().unwrap().length === 1, "check desc signs failed");
            assert(signed_obj.signs().body_signs().unwrap().length === 1, "check body signs failed");
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
            assert(signed_obj.signs().desc_signs().unwrap().length === 1, "check desc signs failed");
            assert(signed_obj.signs().body_signs().unwrap().length === 1, "check body signs failed");
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
                new myHandler.CryptoHandlerDefault("zone1device1", "sign_handler_01", "PreRouter")
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
            assert(signed_obj.signs().desc_signs().unwrap().length === 1, "check desc signs failed");
            assert(signed_obj.signs().body_signs().unwrap().length === 1, "check body signs failed");
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
            assert(signed_obj.signs().desc_signs().unwrap().length === 1, "check desc signs failed");
            assert(signed_obj.signs().body_signs().unwrap().length === 1, "check body signs failed");
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
            const saveobject = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_device1_peerId).unwrap()),
                'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const saveObjectId = saveobject.desc().calculate_id();
            const object_raw = saveobject.to_vec().unwrap();
            let info = { saveobject, saveObjectId, object_raw }

            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            // let permission = cyfs.GlobalStatePathAccessItem.new(path, cyfs.AccessString.default())
            // //console.log("---------------------------------->>>>>>" + acc.value)
            // await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(permission)
            let permission = cyfs.GlobalStatePathAccessItem.new_group(path,
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await zone1device1.root_state_meta_stub(zone1device2.local_device_id().object_id, zone1device2_dec_id).add_access(permission)

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

    describe("#crypto 相关接口", async () => {
        it("crypto 调用 sign_object未授权", async () => {
            const obj = cyfs.TextObject.create(cyfs.Some(zone1device1.local_device_id().object_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            // 对对象进行签名
            console.info(`will sign object: id=${object_id},object value = ${obj.value} `);
            const crypto = zone1device2.crypto();
            const resp = (await crypto.sign_object({
                common: {
                    req_path: undefined,
                    target: undefined,
                    dec_id: undefined,
                    flags: 0
                },
                object: new cyfs.NONObjectInfo(object_id, obj.to_vec().unwrap()),
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE | cyfs.CRYPTO_REQUEST_FLAG_SIGN_SET_DESC | cyfs.CRYPTO_REQUEST_FLAG_SIGN_SET_BODY
            }));
            console.log('sign_object result:', resp);
            assert(resp.err, "调研sign接口没授权就成功了")

        })
        it("crypto 调用 sign_object系统授权、verify_object无需授权验证成功", async () => {
            const obj = cyfs.TextObject.create(cyfs.Some(zone1device1.local_device_id().object_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            // 对对象进行签名
            console.info(`will sign object: id=${object_id},object value = ${obj.value} `);
            const crypto = zone1device1.crypto();
            const resp = (await crypto.sign_object({
                common: {
                    req_path: undefined,
                    target: undefined,
                    dec_id: sysdec,
                    flags: 0
                },
                object: new cyfs.NONObjectInfo(object_id, obj.to_vec().unwrap()),
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE | cyfs.CRYPTO_REQUEST_FLAG_SIGN_SET_DESC | cyfs.CRYPTO_REQUEST_FLAG_SIGN_SET_BODY
            })).unwrap();
            console.log(resp)
            assert(resp.result === cyfs.SignObjectResult.Signed, "check sign result failed");
            const signed_obj = new cyfs.TextObjectDecoder().from_raw(resp.object!.object_raw).unwrap();
            assert(signed_obj.signs().desc_signs().unwrap().length === 1, "check desc signs failed");
            assert(signed_obj.signs().body_signs().unwrap().length === 1, "check body signs failed");
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
        it("crypto 调用 sign_object系统授权，添加preCryptoHandler", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/sign_object/",
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            const obj = cyfs.TextObject.create(cyfs.Some(zone1device1.local_device_id().object_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret1 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.SignObject,
                cyfs.RouterHandlerChain.PreCrypto,
                "post-object-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.CryptoHandlerDefault,
                "CryptoHandlerDefault",
                1,
            )
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            // let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/sign_object/",
            //     zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            // system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 对对象进行签名
            console.info(`will sign object: id=${object_id},object value = ${obj.value} `);
            const crypto = zone1device1.crypto();
            const resp = (await crypto.sign_object({
                common: {
                    req_path: req_path,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: undefined,
                    flags: 0
                },
                object: new cyfs.NONObjectInfo(object_id, obj.to_vec().unwrap()),
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE | cyfs.CRYPTO_REQUEST_FLAG_SIGN_SET_DESC | cyfs.CRYPTO_REQUEST_FLAG_SIGN_SET_BODY
            })).unwrap();
            console.log(resp)
            assert(resp.result === cyfs.SignObjectResult.Signed, "check sign result failed");
            const signed_obj = new cyfs.TextObjectDecoder().from_raw(resp.object!.object_raw).unwrap();
            assert(signed_obj.signs().desc_signs().unwrap().length === 1, "check desc signs failed");
            assert(signed_obj.signs().body_signs().unwrap().length === 1, "check body signs failed");
            console.log("test sign object success");
            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`sign_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)
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
        it("crypto 调用 sign_object系统授权、verify_object无需授权验证成功", async () => {
            const obj = cyfs.TextObject.create(cyfs.Some(zone1device1.local_device_id().object_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            // 对对象进行签名
            console.info(`will sign object: id=${object_id},object value = ${obj.value} `);
            const crypto = zone1device1.crypto();
            const resp = (await crypto.sign_object({
                common: {
                    req_path: undefined,
                    target: undefined,
                    dec_id: sysdec,
                    flags: 0
                },
                object: new cyfs.NONObjectInfo(object_id, obj.to_vec().unwrap()),
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE | cyfs.CRYPTO_REQUEST_FLAG_SIGN_SET_DESC | cyfs.CRYPTO_REQUEST_FLAG_SIGN_SET_BODY
            })).unwrap();
            console.log(resp)
            assert(resp.result === cyfs.SignObjectResult.Signed, "check sign result failed");
            const signed_obj = new cyfs.TextObjectDecoder().from_raw(resp.object!.object_raw).unwrap();
            assert(signed_obj.signs().desc_signs().unwrap().length === 1, "check desc signs failed");
            assert(signed_obj.signs().body_signs().unwrap().length === 1, "check body signs failed");
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
        it.skip("crypto 调用 系统已授权选择people签名", async () => { //people签名暂未支持
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/crypto/sign_object/",
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            zone1device1.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)

            const obj = cyfs.TextObject.create(cyfs.Some(zone1device1.local_device_id().object_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            // 对对象进行签名
            console.info(`will sign object: id=${object_id},object value = ${obj.value} `);
            const crypto = zone1device1.crypto();
            const resp = (await crypto.sign_object({
                common: {
                    req_path: undefined,
                    target: undefined,
                    dec_id: undefined,
                    flags: 0
                },
                object: new cyfs.NONObjectInfo(object_id, obj.to_vec().unwrap()),
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_PEOPLE | cyfs.CRYPTO_REQUEST_FLAG_SIGN_SET_DESC | cyfs.CRYPTO_REQUEST_FLAG_SIGN_SET_BODY
            }));
            console.log('sign_object result:', resp);
            assert(resp.unwrap().result === cyfs.SignObjectResult.Signed, "check sign result failed");
            const signed_obj = new cyfs.TextObjectDecoder().from_raw(resp.unwrap().object!.object_raw).unwrap();
            assert(signed_obj.signs().desc_signs().unwrap().length === 1, "check desc signs failed");
            assert(signed_obj.signs().body_signs().unwrap().length === 1, "check body signs failed");
            //校验对象签名
            {
                const resp2 = (await crypto.verify_object({
                    common: { flags: 0 },
                    sign_type: cyfs.VerifySignType.Both,
                    object: resp.unwrap().object!,
                    sign_object: cyfs.VerifyObjectType.Owner()
                }));
                console.log('verify_object result:', resp2);
                assert(resp2.unwrap().result.valid, "check verify result failed")
            }
        })
        it("crypto 调用verify_object校验未被签名的对象", async () => {
            const obj = cyfs.TextObject.create(cyfs.Some(zone1device1.local_device_id().object_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            // 对对象进行签名
            console.info(`will sign object: id=${object_id},object value = ${obj.value} `);
            const crypto = zone1device1.crypto();
            const resp = (await crypto.sign_object({
                common: {
                    req_path: undefined,
                    target: undefined,
                    dec_id: sysdec,
                    flags: 0
                },
                object: new cyfs.NONObjectInfo(object_id, obj.to_vec().unwrap()),
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE | cyfs.CRYPTO_REQUEST_FLAG_SIGN_SET_DESC | cyfs.CRYPTO_REQUEST_FLAG_SIGN_SET_BODY
            })).unwrap();
            console.log(resp)
            assert(resp.result === cyfs.SignObjectResult.Signed, "check sign result failed");
            const signed_obj = new cyfs.TextObjectDecoder().from_raw(resp.object!.object_raw).unwrap();
            assert(signed_obj.signs().desc_signs().unwrap().length === 1, "check desc signs failed");
            assert(signed_obj.signs().body_signs().unwrap().length === 1, "check body signs failed");
            console.log("test sign object success");
            //校验对象签名
            {
                const resp2 = (await crypto.verify_object({
                    common: { flags: 0 },
                    sign_type: cyfs.VerifySignType.Both,
                    object: new cyfs.NONObjectInfo(object_id, obj.to_vec().unwrap()),
                    sign_object: cyfs.VerifyObjectType.Owner()
                }));
                console.log('verify_object result:', resp2);
                assert(resp2.err, "check verify result not should success")
            }
        })
        it("crypto 调用 系统已授权sign_object，zone内不同设备", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/crypto/sign_object/",
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            zone1device1.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            const obj = cyfs.TextObject.create(cyfs.Some(zone1device1.local_device_id().object_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            // 对对象进行签名
            console.info(`will sign object: id=${object_id},object value = ${obj.value} `);
            const crypto = zone1device2.crypto();
            const resp = (await crypto.sign_object({
                common: {
                    req_path: undefined,
                    target: zone1device1.local_device_id().object_id,
                    dec_id: undefined,
                    flags: 0
                },
                object: new cyfs.NONObjectInfo(object_id, obj.to_vec().unwrap()),
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE | cyfs.CRYPTO_REQUEST_FLAG_SIGN_SET_DESC | cyfs.CRYPTO_REQUEST_FLAG_SIGN_SET_BODY
            }));
            console.log('sign_object result:', resp);
            assert(!resp.err, "调研sign接口没授权就成功了")

        })


    })
})




