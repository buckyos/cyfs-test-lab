import assert = require('assert');
import * as cyfs from "../../cyfs_node/cyfs_node"
import { stack, stackInfo, ZoneSimulator } from "../../common/utils";
import * as myHandler from "./handler"

import * as path from "path"
import * as fs from 'fs-extra';

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


let zone1device1: cyfs.SharedCyfsStack;
let zone1device2: cyfs.SharedCyfsStack;
let zone1ood: cyfs.SharedCyfsStack
let zone1sood: cyfs.SharedCyfsStack

let zone2ood: cyfs.SharedCyfsStack
let zone2device1: cyfs.SharedCyfsStack
let zone2device2: cyfs.SharedCyfsStack

let zone1device1_dec_id: cyfs.ObjectId
let zone1device2_dec_id: cyfs.ObjectId
let zone1ooddec_id: cyfs.ObjectId

let zone2ooddec_id: cyfs.ObjectId
let zone2device1_dec_id: cyfs.ObjectId
let zone2device2_dec_id: cyfs.ObjectId





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






    })
    this.afterAll(async () => {
        console.info(`#########用例执行完成`);
        ZoneSimulator.stopZoneSimulator();
        process.exit(1)

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


        it.only("多个分组设置组合权限-当前zone和OwnerDec权限为full", async () => {
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
            const get_ret2 = await zone1device1.non_service().get_object(get_req);
            const get_ret1 = await zone1device2.non_service().get_object(get_req);
            console.info('get_object result:', get_ret1);
            assert(!get_ret1.err);
            assert(!get_ret2.err);

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
            assert(!delete_ret.err, `delete object failed ,err : ${JSON.stringify(delete_ret)}`)
        })

    })






    describe("#put_object接口 req_path层权限", async () => {
        it("NONRequestor调用put_object正常流程", async () => {
            let req_path = new cyfs.RequestGlobalStatePath(cyfs.get_system_dec_app().object_id).toString()
            console.log("------------------------>" + req_path)


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
                    dec_id: zone1device1.local_device_id().object_id,
                    flags: 0,
                    target: zone1device1.dec_id,
                    level: cyfs.NONAPILevel.Router //设置路由类型
                },
                object: new cyfs.NONObjectInfo(object_id, object_raw),
                access: rwx
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