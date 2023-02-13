import assert from 'assert';
import * as cyfs from '../../cyfs_node';
import { ZoneSimulator, get_len_buf, create_people, create_device } from "../../common/utils";
import * as myHandler from "./handler"

//初始化日志
cyfs.clog.enable_file_log({
    name: "unittest_stack_interface",
    dir: cyfs.get_app_log_dir("unittest_stack_interface"),
    file_max_size: 1024 * 1024 * 10,
    file_max_count: 10,
});
``


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



describe("SharedCyfsStack crypto相关接口测试", function () {
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
    })


    describe("#crypto 相关接口冒烟", async () => {
        beforeEach(async function () {
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).clear_access()
        })
        afterEach(async function () {
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).clear_access()
            await handlerManager.clearAllHandler()
        })
        it("crypto 调用 sign_object系统授权、verify_object无需授权验证成功", async () => {
            const obj = cyfs.TextObject.create(zone1device1.local_device_id().object_id, 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();

            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/crypto/sign_object/",
                zone1device1.local_device_id().object_id, undefined, undefined, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)
            // 对对象进行签名
            console.info(`will sign object: id=${object_id},object value = ${obj.value} `);
            const crypto = zone1device1.crypto();
            const resp = (await crypto.sign_object({
                common: {
                    req_path: req_path,
                    target: undefined,
                    dec_id: undefined,
                    flags: 0
                },
                object: new cyfs.NONObjectInfo(object_id, obj.to_vec().unwrap()),
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
        it("crypto 调用跨Dec设备 sign_object未授权", async () => {
            const obj = cyfs.TextObject.create(zone1device1.local_device_id().object_id, 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();


            // let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/crypto/sign_object/",
            //     zone1device2.local_device_id().object_id, undefined, undefined, cyfs.AccessPermissions.Full)
            // await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 对对象进行签名
            console.info(`will sign object: id=${object_id},object value = ${obj.value} `);
            const crypto = zone1device1.crypto();
            const resp = (await crypto.sign_object({
                common: {
                    req_path: undefined,
                    dec_id: undefined,
                    target: zone1device2.local_device_id().object_id,
                    flags: 0
                },
                object: new cyfs.NONObjectInfo(object_id, obj.to_vec().unwrap()),
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE | cyfs.CRYPTO_REQUEST_FLAG_SIGN_SET_DESC | cyfs.CRYPTO_REQUEST_FLAG_SIGN_SET_BODY
            }));
            console.log('sign_object result:', resp);
            assert(resp.err, "调研sign接口没授权就成功了")

        })
        it("crypto 调用 sign_object系统授权，添加preCryptoHandler", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/sign_object/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)

            const obj = cyfs.TextObject.create(zone1device1.local_device_id().object_id, 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
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
                myHandler.SignObjectHandlerDefault,
                "CryptoHandlerDefault",
                1,
            )
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            let spermission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/crypto/sign_object/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(spermission)
            // 对对象进行签名
            console.info(`will sign object: id=${object_id},object value = ${obj.value} `);
            const crypto = zone1device1.crypto();
            const resp = (await crypto.sign_object({
                common: {
                    req_path: req_path,
                    target: undefined,
                    dec_id: undefined,
                    flags: 0
                },
                object: new cyfs.NONObjectInfo(object_id, obj.to_vec().unwrap()),
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
            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`sign_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)
        })
        it("crypto 调用 sign_object系统授权，添加postCryptoHandler", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/post_crypto/sign_object/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)

            const obj = cyfs.TextObject.create(zone1device1.local_device_id().object_id, 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret1 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.SignObject,
                cyfs.RouterHandlerChain.PostCrypto,
                "post-object-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.SignObjectHandlerDefault,
                "CryptoHandlerDefault",
                1,
            )
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            let spermission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/crypto/sign_object/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(spermission)
            // 对对象进行签名
            console.info(`will sign object: id=${object_id},object value = ${obj.value} `);
            const crypto = zone1device1.crypto();
            const resp = (await crypto.sign_object({
                common: {
                    req_path: req_path,
                    target: undefined,
                    dec_id: undefined,
                    flags: 0
                },
                object: new cyfs.NONObjectInfo(object_id, obj.to_vec().unwrap()),
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
            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`sign_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)
        })
        it.skip("crypto 调用 系统已授权选择people签名", async () => { //people签名暂未支持
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/crypto/sign_object/",
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            zone1device1.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)

            const obj = cyfs.TextObject.create(zone1device1.local_device_id().object_id, 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
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
            assert(signed_obj.signs().desc_signs()!.length === 1, "check desc signs failed");
            assert(signed_obj.signs().body_signs()!.length === 1, "check body signs failed");
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
            const obj = cyfs.TextObject.create(zone1device1.local_device_id().object_id, 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
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
            assert(signed_obj.signs().desc_signs()!.length === 1, "check desc signs failed");
            assert(signed_obj.signs().body_signs()!.length === 1, "check body signs failed");
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
            let permission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/sign_object/", cyfs.AccessString.full())

            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            const obj = cyfs.TextObject.create(zone1device1.local_device_id().object_id, 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
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

        it("crypto device1调用 encrypt_data、decrypt_data GenAESKeyAndEncrypt", async () => {

            console.info(`will encrypt_data: GenAESKeyAndEncrypt `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    flags: 0
                },
                data: undefined,
                encrypt_type: cyfs.CryptoEncryptType.GenAESKeyAndEncrypt,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)


            let permission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptAESKey,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)

        })
        it("crypto device2调用 encrypt_data、decrypt_data EncryptData", async () => {

            // const obj = cyfs.TextObject.create(zone1device1.local_device_id().object_id, 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            // const object_id = obj.desc().calculate_id();
            // const ob = obj.to_vec().unwrap()

            let ob = get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device2.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)


            let permission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device2.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)

        })
        it("crypto调用 encrypt_data,数据长度最大117bytes", async () => {

            // const obj = cyfs.TextObject.create(zone1device1.local_device_id().object_id, 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            // const object_id = obj.desc().calculate_id();
            // const ob = obj.to_vec().unwrap()

            let ob = get_len_buf(117)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)


            let permission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)

        })
        it("crypto调用 encrypt_data,数据长度1bytes", async () => {

            // const obj = cyfs.TextObject.create(zone1device1.local_device_id().object_id, 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            // const object_id = obj.desc().calculate_id();
            // const ob = obj.to_vec().unwrap()

            let ob = get_len_buf(1)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)


            let permission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)

        })
        it("crypto调用 encrypt_data、解密type不一致", async () => {

            // const obj = cyfs.TextObject.create(zone1device1.local_device_id().object_id, 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            // const object_id = obj.desc().calculate_id();
            // const ob = obj.to_vec().unwrap()

            let ob = get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)


            let permission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptAESKey,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)

        })
        it("crypto调用 encrypt_data、数据不能为空", async () => {

            // const obj = cyfs.TextObject.create(zone1device1.local_device_id().object_id, 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            // const object_id = obj.desc().calculate_id();
            // const ob = obj.to_vec().unwrap()

            // let ob = get_len_buf(48)
            // console.log("----------------------=====================================:  "+ob.byteLength)
            // console.info(`will encrypt_data: EncryptData `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    flags: 0
                },
                data: undefined,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(enresp.err, `加密数据出错 ：${enresp}`)
        })
        it("crypto调用 encrypt_data、解密type不一致", async () => {

            // const obj = cyfs.TextObject.create(zone1device1.local_device_id().object_id, 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            // const object_id = obj.desc().calculate_id();
            // const ob = obj.to_vec().unwrap()

            // let ob = get_len_buf(48)
            // console.log("----------------------=====================================:  "+ob.byteLength)
            // console.info(`will encrypt_data: EncryptData `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    flags: 0
                },
                data: undefined,
                encrypt_type: cyfs.CryptoEncryptType.GenAESKeyAndEncrypt,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)


            let permission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptAESKey,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)

        })
        it("crypto调用 encrypt_data、GenAESKeyAndEncrypt不支持传入data buf", async () => {

            let ob = get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: GenAESKeyAndEncrypt `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.GenAESKeyAndEncrypt,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(enresp.err, `加密数据出错 ：${enresp}`)
        })
        it("crypto ood调用 encrypt_data、decrypt_data GenAESKeyAndEncrypt", async () => {

            console.info(`will encrypt_data: GenAESKeyAndEncrypt `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    flags: 0
                },
                data: undefined,
                encrypt_type: cyfs.CryptoEncryptType.GenAESKeyAndEncrypt,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1ood.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let permission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            let sdec = cyfs.get_system_dec_app().object_id
            let sstack = zone1ood.fork_with_new_dec(sdec)
            await sstack.root_state_meta_stub(sstack.local_device_id().object_id, sdec).add_access(permission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptAESKey,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1ood.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)

        })
        it("crypto ood调用 encrypt_data、 EncryptData模式 不支持", async () => {

            // const obj = cyfs.TextObject.create(zone1device1.local_device_id().object_id, 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            // const object_id = obj.desc().calculate_id();
            // const ob = obj.to_vec().unwrap()

            let ob = get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1ood.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(enresp.err, `加密数据出错 ：${enresp}`)

        })
        //encrypt_data、decrypt_data同zone跨dec的权限
        it("crypto跨dec设备调用 encrypt_data、decrypt_data GenAESKeyAndEncrypt", async () => {

            console.info(`will encrypt_data: GenAESKeyAndEncrypt `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: undefined,
                    target: zone1device1.local_device_id().object_id,
                    flags: 0
                },
                data: undefined,
                encrypt_type: cyfs.CryptoEncryptType.GenAESKeyAndEncrypt,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device2.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let permission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            let sdec = cyfs.get_system_dec_app().object_id
            let sstack = zone1device2.fork_with_new_dec(sdec)
            await sstack.root_state_meta_stub(sstack.local_device_id().object_id, sdec).add_access(permission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: undefined,
                    target: zone1device1.local_device_id().object_id,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptAESKey,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device2.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)

        })
        it("crypto调用 encrypt_data、decrypt_data EncryptData", async () => {

            // const obj = cyfs.TextObject.create(zone1device1.local_device_id().object_id, 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            // const object_id = obj.desc().calculate_id();
            // const ob = obj.to_vec().unwrap()

            let ob = get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: undefined,
                    target: zone1device1.local_device_id().object_id,
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device2.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let permission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            let sdec = cyfs.get_system_dec_app().object_id
            let sstack = zone1device2.fork_with_new_dec(sdec)
            await sstack.root_state_meta_stub(sstack.local_device_id().object_id, sdec).add_access(permission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: undefined,
                    dec_id: undefined,
                    target: zone1device1.local_device_id().object_id,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device2.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)

        })
        //encrypt_data、decrypt_datat添加handler的情况(待开发完成)
        it("crypto调用 encrypt_data GenAESKeyAndEncrypt PreCrypto", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/encrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.EncryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.EncryptDataHandlerDefault,
                "EncryptDataHandlerDefault",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            console.info(`will encrypt_data: GenAESKeyAndEncrypt `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: undefined,
                encrypt_type: cyfs.CryptoEncryptType.GenAESKeyAndEncrypt,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 encrypt_data EncryptData PreCrypto", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/encrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.EncryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.EncryptDataHandlerDefault,
                "EncryptDataHandlerDefault",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);


            let ob = get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 encrypt_data GenAESKeyAndEncrypt PostCrypto", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/post_crypto/encrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.EncryptData,
                cyfs.RouterHandlerChain.PostCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.EncryptDataHandlerDefault,
                "EncryptDataHandlerDefault",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            console.info(`will encrypt_data: GenAESKeyAndEncrypt `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: undefined,
                encrypt_type: cyfs.CryptoEncryptType.GenAESKeyAndEncrypt,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 encrypt_data EncryptData PostCrypto", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/post_crypto/encrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.EncryptData,
                cyfs.RouterHandlerChain.PostCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.EncryptDataHandlerDefault,
                "EncryptDataHandlerDefault",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);


            let ob = get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })

        it("crypto调用 encrypt_data GenAESKeyAndEncrypt PreCrypto+action=pass", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/encrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.EncryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Pass,
                myHandler.EncryptDataHandlerPass,
                "EncryptDataHandlerPass",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            console.info(`will encrypt_data: GenAESKeyAndEncrypt `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: undefined,
                encrypt_type: cyfs.CryptoEncryptType.GenAESKeyAndEncrypt,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 encrypt_data EncryptData PreCrypto+action=pass", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/encrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.EncryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Pass,
                myHandler.EncryptDataHandlerPass,
                "EncryptDataHandlerPass",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);


            let ob = get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 encrypt_data GenAESKeyAndEncrypt PostCrypto+action=pass", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/post_crypto/encrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.EncryptData,
                cyfs.RouterHandlerChain.PostCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Pass,
                myHandler.EncryptDataHandlerPass,
                "EncryptDataHandlerPass",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            console.info(`will encrypt_data: GenAESKeyAndEncrypt `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: undefined,
                encrypt_type: cyfs.CryptoEncryptType.GenAESKeyAndEncrypt,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 encrypt_data EncryptData PostCrypto+action=pass", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/post_crypto/encrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.EncryptData,
                cyfs.RouterHandlerChain.PostCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Pass,
                myHandler.EncryptDataHandlerPass,
                "EncryptDataHandlerPass",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);


            let ob = get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })

        it("crypto调用 encrypt_data GenAESKeyAndEncrypt PreCrypto+action=drop", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/encrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.EncryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Drop,
                myHandler.EncryptDataHandlerDrop,
                "EncryptDataHandlerDrop",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            console.info(`will encrypt_data: GenAESKeyAndEncrypt `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: undefined,
                encrypt_type: cyfs.CryptoEncryptType.GenAESKeyAndEncrypt,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(enresp.err, `加密数据出错 ：${enresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 encrypt_data EncryptData PreCrypto+action=drop", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/encrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.EncryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Drop,
                myHandler.EncryptDataHandlerDrop,
                "EncryptDataHandlerDrop",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);


            let ob = get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(enresp.err, `加密数据出错 ：${enresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 encrypt_data GenAESKeyAndEncrypt PostCrypto+action=drop", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/post_crypto/encrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.EncryptData,
                cyfs.RouterHandlerChain.PostCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Drop,
                myHandler.EncryptDataHandlerDrop,
                "EncryptDataHandlerDrop",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            console.info(`will encrypt_data: GenAESKeyAndEncrypt `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: undefined,
                encrypt_type: cyfs.CryptoEncryptType.GenAESKeyAndEncrypt,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(enresp.err, `加密数据出错 ：${enresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 encrypt_data EncryptData PostCrypto+action=drop", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/post_crypto/encrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.EncryptData,
                cyfs.RouterHandlerChain.PostCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Drop,
                myHandler.EncryptDataHandlerDrop,
                "EncryptDataHandlerDrop",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);


            let ob = get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(enresp.err, `加密数据出错 ：${enresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })

        it("crypto调用 encrypt_data GenAESKeyAndEncrypt PreCrypto+action=reject", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/encrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.EncryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Reject,
                myHandler.EncryptDataHandlerReject,
                "EncryptDataHandlerReject",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            console.info(`will encrypt_data: GenAESKeyAndEncrypt `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: undefined,
                encrypt_type: cyfs.CryptoEncryptType.GenAESKeyAndEncrypt,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(enresp.err, `加密数据出错 ：${enresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 encrypt_data EncryptData PreCrypto+action=reject", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/encrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.EncryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Reject,
                myHandler.EncryptDataHandlerReject,
                "EncryptDataHandlerReject",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);


            let ob = get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(enresp.err, `加密数据出错 ：${enresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 encrypt_data GenAESKeyAndEncrypt PostCrypto+action=reject", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/post_crypto/encrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.EncryptData,
                cyfs.RouterHandlerChain.PostCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Reject,
                myHandler.EncryptDataHandlerReject,
                "EncryptDataHandlerReject",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            console.info(`will encrypt_data: GenAESKeyAndEncrypt `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: undefined,
                encrypt_type: cyfs.CryptoEncryptType.GenAESKeyAndEncrypt,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(enresp.err, `加密数据出错 ：${enresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 encrypt_data EncryptData PostCrypto+action=reject", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/post_crypto/encrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.EncryptData,
                cyfs.RouterHandlerChain.PostCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Reject,
                myHandler.EncryptDataHandlerReject,
                "EncryptDataHandlerReject",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);


            let ob = get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(enresp.err, `加密数据出错 ：${enresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })

        it("crypto调用 encrypt_data GenAESKeyAndEncrypt PreCrypto+action=response", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/encrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.EncryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Response,
                myHandler.EncryptDataHandlerResponse,
                "EncryptDataHandlerResponse",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            console.info(`will encrypt_data: GenAESKeyAndEncrypt `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: undefined,
                encrypt_type: cyfs.CryptoEncryptType.GenAESKeyAndEncrypt,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 encrypt_data EncryptData PreCrypto+action=response", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/encrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.EncryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Response,
                myHandler.EncryptDataHandlerResponse,
                "EncryptDataHandlerResponse",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);


            let ob = get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 encrypt_data GenAESKeyAndEncrypt PostCrypto+action=response", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/post_crypto/encrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.EncryptData,
                cyfs.RouterHandlerChain.PostCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Response,
                myHandler.EncryptDataHandlerResponse,
                "EncryptDataHandlerResponse",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            console.info(`will encrypt_data: GenAESKeyAndEncrypt `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: undefined,
                encrypt_type: cyfs.CryptoEncryptType.GenAESKeyAndEncrypt,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 encrypt_data EncryptData PostCrypto+action=response", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/post_crypto/encrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.EncryptData,
                cyfs.RouterHandlerChain.PostCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Response,
                myHandler.EncryptDataHandlerResponse,
                "EncryptDataHandlerResponse",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);


            let ob = get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })

        it("crypto调用 decrypt_data GenAESKeyAndEncrypt PreCrypto", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/decrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.DecryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "decrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.DecryptDataHandlerDefault,
                "DecryptDataHandlerDefault",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            console.info(`will encrypt_data: GenAESKeyAndEncrypt `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: undefined,
                encrypt_type: cyfs.CryptoEncryptType.GenAESKeyAndEncrypt,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let depermission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(depermission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptAESKey,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 decrypt_data EncryptData PreCrypto", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/decrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.DecryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.DecryptDataHandlerDefault,
                "DecryptDataHandlerDefault",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);


            let ob = get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let depermission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(depermission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)


            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 decrypt_data GenAESKeyAndEncrypt PostCrypto", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/post_crypto/decrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.DecryptData,
                cyfs.RouterHandlerChain.PostCrypto,
                "decrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.DecryptDataHandlerDefault,
                "DecryptDataHandlerDefault",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            console.info(`will encrypt_data: GenAESKeyAndEncrypt `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: undefined,
                encrypt_type: cyfs.CryptoEncryptType.GenAESKeyAndEncrypt,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let depermission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(depermission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptAESKey,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 decrypt_data EncryptData PostCrypto", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/post_crypto/decrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.DecryptData,
                cyfs.RouterHandlerChain.PostCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.DecryptDataHandlerDefault,
                "DecryptDataHandlerDefault",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);


            let ob = get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let depermission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(depermission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)


            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })

        it("crypto调用 decrypt_data GenAESKeyAndEncrypt PreCrypto+action=pass", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/decrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.DecryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "decrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Pass,
                myHandler.DecryptDataHandlerPass,
                "DecryptDataHandlerPass",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            console.info(`will encrypt_data: GenAESKeyAndEncrypt `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: undefined,
                encrypt_type: cyfs.CryptoEncryptType.GenAESKeyAndEncrypt,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let depermission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(depermission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptAESKey,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 decrypt_data EncryptData PreCrypto+action=pass", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/decrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.DecryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Pass,
                myHandler.DecryptDataHandlerPass,
                "DecryptDataHandlerPass",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);


            let ob = get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let depermission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(depermission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)


            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 decrypt_data GenAESKeyAndEncrypt PostCrypto+action=pass", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/post_crypto/decrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.DecryptData,
                cyfs.RouterHandlerChain.PostCrypto,
                "decrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Pass,
                myHandler.DecryptDataHandlerPass,
                "DecryptDataHandlerPass",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            console.info(`will encrypt_data: GenAESKeyAndEncrypt `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: undefined,
                encrypt_type: cyfs.CryptoEncryptType.GenAESKeyAndEncrypt,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let depermission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(depermission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptAESKey,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 decrypt_data EncryptData PostCrypto+action=pass", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/post_crypto/decrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.DecryptData,
                cyfs.RouterHandlerChain.PostCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Pass,
                myHandler.DecryptDataHandlerPass,
                "DecryptDataHandlerPass",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);


            let ob = get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let depermission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(depermission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)


            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })

        it("crypto调用 decrypt_data GenAESKeyAndEncrypt PreCrypto+action=response", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/decrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.DecryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "decrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Response,
                myHandler.DecryptDataHandlerResponse,
                "DecryptDataHandlerResponse",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            console.info(`will encrypt_data: GenAESKeyAndEncrypt `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: undefined,
                encrypt_type: cyfs.CryptoEncryptType.GenAESKeyAndEncrypt,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let depermission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(depermission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptAESKey,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 decrypt_data EncryptData PreCrypto+action=response", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/decrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.DecryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Response,
                myHandler.DecryptDataHandlerResponse,
                "DecryptDataHandlerResponse",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);


            let ob = get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let depermission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(depermission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)


            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 decrypt_data GenAESKeyAndEncrypt PostCrypto+action=response", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/post_crypto/decrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.DecryptData,
                cyfs.RouterHandlerChain.PostCrypto,
                "decrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Response,
                myHandler.DecryptDataHandlerResponse,
                "DecryptDataHandlerResponse",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            console.info(`will encrypt_data: GenAESKeyAndEncrypt `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: undefined,
                encrypt_type: cyfs.CryptoEncryptType.GenAESKeyAndEncrypt,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let depermission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(depermission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptAESKey,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 decrypt_data EncryptData PostCrypto+action=response", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/post_crypto/decrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.DecryptData,
                cyfs.RouterHandlerChain.PostCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Response,
                myHandler.DecryptDataHandlerResponse,
                "DecryptDataHandlerResponse",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);


            let ob = get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let depermission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(depermission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)


            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })

        it("crypto调用 decrypt_data GenAESKeyAndEncrypt PreCrypto+action=drop", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/decrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.DecryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "decrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Drop,
                myHandler.DecryptDataHandlerDrop,
                "DecryptDataHandlerDrop",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            console.info(`will encrypt_data: GenAESKeyAndEncrypt `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: undefined,
                encrypt_type: cyfs.CryptoEncryptType.GenAESKeyAndEncrypt,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let depermission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(depermission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptAESKey,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(deresp.err, `解密数据出错 ：${deresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 decrypt_data EncryptData PreCrypto+action=drop", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/decrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.DecryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Drop,
                myHandler.DecryptDataHandlerDrop,
                "DecryptDataHandlerDrop",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);


            let ob = get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let depermission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(depermission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(deresp.err, `解密数据出错 ：${deresp}`)


            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 decrypt_data GenAESKeyAndEncrypt PostCrypto+action=drop", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/post_crypto/decrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.DecryptData,
                cyfs.RouterHandlerChain.PostCrypto,
                "decrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Drop,
                myHandler.DecryptDataHandlerDrop,
                "DecryptDataHandlerDrop",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            console.info(`will encrypt_data: GenAESKeyAndEncrypt `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: undefined,
                encrypt_type: cyfs.CryptoEncryptType.GenAESKeyAndEncrypt,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let depermission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(depermission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptAESKey,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(deresp.err, `解密数据出错 ：${deresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 decrypt_data EncryptData PostCrypto+action=drop", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/post_crypto/decrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.DecryptData,
                cyfs.RouterHandlerChain.PostCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Drop,
                myHandler.DecryptDataHandlerDrop,
                "DecryptDataHandlerDrop",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);


            let ob = get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let depermission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(depermission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(deresp.err, `解密数据出错 ：${deresp}`)


            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })


        it("crypto调用 decrypt_data GenAESKeyAndEncrypt PreCrypto+action=reject", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/decrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.DecryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "decrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Reject,
                myHandler.DecryptDataHandlerReject,
                "DecryptDataHandlerReject",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            console.info(`will encrypt_data: GenAESKeyAndEncrypt `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: undefined,
                encrypt_type: cyfs.CryptoEncryptType.GenAESKeyAndEncrypt,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let depermission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(depermission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptAESKey,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(deresp.err, `解密数据出错 ：${deresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 decrypt_data EncryptData PreCrypto+action=reject", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/decrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.DecryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Reject,
                myHandler.DecryptDataHandlerReject,
                "DecryptDataHandlerReject",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);


            let ob = get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let depermission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(depermission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(deresp.err, `解密数据出错 ：${deresp}`)


            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 decrypt_data GenAESKeyAndEncrypt PostCrypto+action=Reject", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/post_crypto/decrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.DecryptData,
                cyfs.RouterHandlerChain.PostCrypto,
                "decrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Reject,
                myHandler.DecryptDataHandlerReject,
                "DecryptDataHandlerReject",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            console.info(`will encrypt_data: GenAESKeyAndEncrypt `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: undefined,
                encrypt_type: cyfs.CryptoEncryptType.GenAESKeyAndEncrypt,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let depermission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(depermission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptAESKey,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(deresp.err, `解密数据出错 ：${deresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 decrypt_data EncryptData PostCrypto+action=reject", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/post_crypto/decrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.DecryptData,
                cyfs.RouterHandlerChain.PostCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Reject,
                myHandler.DecryptDataHandlerReject,
                "DecryptDataHandlerReject",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);


            let ob = get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let depermission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(depermission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(deresp.err, `解密数据出错 ：${deresp}`)


            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })

        it("crypto调用 encrypt_data GenAESKeyAndEncrypt PreCrypto", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/encrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret1 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.EncryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.EncryptDataHandlerDefault,
                "EncryptDataHandlerDefault",
                1,
            )
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)


            let depermission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/decrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(depermission)


            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.DecryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "decrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.DecryptDataHandlerDefault,
                "DecryptDataHandlerDefault",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            console.info(`will encrypt_data: GenAESKeyAndEncrypt `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: undefined,
                encrypt_type: cyfs.CryptoEncryptType.GenAESKeyAndEncrypt,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let deepermission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(deepermission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptAESKey,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 encrypt_data EncryptData PreCrypto", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/encrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret1 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.EncryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.EncryptDataHandlerDefault,
                "EncryptDataHandlerDefault",
                1,
            )
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)


            let depermission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/decrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(depermission)


            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.DecryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "decrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.DecryptDataHandlerDefault,
                "DecryptDataHandlerDefault",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            console.info(`will encrypt_data: EncryptData `);

            let ob = get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);
            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let deepermission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(deepermission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 encrypt_data GenAESKeyAndEncrypt PostCrypto", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/post_crypto/encrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret1 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.EncryptData,
                cyfs.RouterHandlerChain.PostCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.EncryptDataHandlerDefault,
                "EncryptDataHandlerDefault",
                1,
            )
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)


            let depermission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/post_crypto/decrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(depermission)


            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.DecryptData,
                cyfs.RouterHandlerChain.PostCrypto,
                "decrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.DecryptDataHandlerDefault,
                "DecryptDataHandlerDefault",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            console.info(`will encrypt_data: GenAESKeyAndEncrypt `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: undefined,
                encrypt_type: cyfs.CryptoEncryptType.GenAESKeyAndEncrypt,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let deepermission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(deepermission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptAESKey,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 encrypt_data EncryptData PostCrypto", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/post_crypto/encrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret1 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.EncryptData,
                cyfs.RouterHandlerChain.PostCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.EncryptDataHandlerDefault,
                "EncryptDataHandlerDefault",
                1,
            )
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)


            let depermission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/post_crypto/decrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(depermission)


            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.DecryptData,
                cyfs.RouterHandlerChain.PostCrypto,
                "decrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.DecryptDataHandlerDefault,
                "DecryptDataHandlerDefault",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            console.info(`will encrypt_data: EncryptData `);

            let ob = get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);
            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let deepermission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(deepermission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })

        it("crypto调用 encrypt_data-PostCrypto GenAESKeyAndEncrypt-PreCrypto", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/post_crypto/encrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret1 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.EncryptData,
                cyfs.RouterHandlerChain.PostCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.EncryptDataHandlerDefault,
                "EncryptDataHandlerDefault",
                1,
            )
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)


            let depermission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/decrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(depermission)


            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.DecryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "decrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.DecryptDataHandlerDefault,
                "DecryptDataHandlerDefault",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            console.info(`will encrypt_data: GenAESKeyAndEncrypt `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: undefined,
                encrypt_type: cyfs.CryptoEncryptType.GenAESKeyAndEncrypt,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let deepermission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(deepermission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptAESKey,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 encrypt_data-PostCrypto EncryptData PreCrypto", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/post_crypto/encrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret1 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.EncryptData,
                cyfs.RouterHandlerChain.PostCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.EncryptDataHandlerDefault,
                "EncryptDataHandlerDefault",
                1,
            )
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)


            let depermission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/decrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(depermission)


            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.DecryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "decrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.DecryptDataHandlerDefault,
                "DecryptDataHandlerDefault",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            console.info(`will encrypt_data: EncryptData `);

            let ob = get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);
            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let deepermission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(deepermission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 encrypt_data-PreCrypto GenAESKeyAndEncrypt PostCrypto", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/encrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret1 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.EncryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.EncryptDataHandlerDefault,
                "EncryptDataHandlerDefault",
                1,
            )
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)


            let depermission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/post_crypto/decrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(depermission)


            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.DecryptData,
                cyfs.RouterHandlerChain.PostCrypto,
                "decrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.DecryptDataHandlerDefault,
                "DecryptDataHandlerDefault",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            console.info(`will encrypt_data: GenAESKeyAndEncrypt `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: undefined,
                encrypt_type: cyfs.CryptoEncryptType.GenAESKeyAndEncrypt,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let deepermission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(deepermission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptAESKey,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto调用 encrypt_data-PostCrypto EncryptData PreCrypto", async () => {
            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/post_crypto/encrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret1 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.EncryptData,
                cyfs.RouterHandlerChain.PostCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.EncryptDataHandlerDefault,
                "EncryptDataHandlerDefault",
                1,
            )
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)


            let depermission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/decrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(depermission)


            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.DecryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "decrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.DecryptDataHandlerDefault,
                "DecryptDataHandlerDefault",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            console.info(`will encrypt_data: EncryptData `);

            let ob = get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);
            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device1.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let deepermission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(deepermission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })

        it("crypto跨dec设备调用 encrypt_data、decrypt_data GenAESKeyAndEncrypt postCrypto", async () => {

            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/post_crypto/encrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret1 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.EncryptData,
                cyfs.RouterHandlerChain.PostCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.EncryptDataHandlerDefault,
                "EncryptDataHandlerDefault",
                1,
            )
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)


            let depermission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/decrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(depermission)


            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.DecryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "decrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.DecryptDataHandlerDefault,
                "DecryptDataHandlerDefault",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            console.info(`will encrypt_data: GenAESKeyAndEncrypt `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: zone1device2_dec_id,
                    target: zone1device1.local_device_id().object_id,
                    flags: 0
                },
                data: undefined,
                encrypt_type: cyfs.CryptoEncryptType.GenAESKeyAndEncrypt,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device2.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let deepermission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(deepermission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptAESKey,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)
        })
        it("crypto跨Dec设备调用 encrypt_data、decrypt_data EncryptData postCrypto", async () => {


            let hpermission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/post_crypto/encrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(hpermission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret1 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.EncryptData,
                cyfs.RouterHandlerChain.PostCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.EncryptDataHandlerDefault,
                "EncryptDataHandlerDefault",
                1,
            )
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)


            let depermission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/decrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(depermission)


            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.DecryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "decrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.DecryptDataHandlerDefault,
                "DecryptDataHandlerDefault",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            let ob = get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: zone1device2_dec_id,
                    target: zone1device1.local_device_id().object_id,
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device2.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let permission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            let sdec = cyfs.get_system_dec_app().object_id
            let sstack = zone1device2.fork_with_new_dec(sdec)
            await sstack.root_state_meta_stub(sstack.local_device_id().object_id, sdec).add_access(permission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: undefined,
                    target: zone1device1.local_device_id().object_id,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device2.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })
        it("crypto跨dec设备调用 encrypt_data、decrypt_data GenAESKeyAndEncrypt preCrypto", async () => {

            let permission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/encrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret1 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.EncryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.EncryptDataHandlerDefault,
                "EncryptDataHandlerDefault",
                1,
            )
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)


            let depermission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/decrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(depermission)


            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.DecryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "decrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.DecryptDataHandlerDefault,
                "DecryptDataHandlerDefault",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            console.info(`will encrypt_data: GenAESKeyAndEncrypt `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: zone1device2_dec_id,
                    target: zone1device1.local_device_id().object_id,
                    flags: 0
                },
                data: undefined,
                encrypt_type: cyfs.CryptoEncryptType.GenAESKeyAndEncrypt,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device2.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let deepermission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(deepermission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptAESKey,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device1.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)
        })
        it("crypto跨Dec设备调用 encrypt_data、decrypt_data EncryptData preCrypto", async () => {


            let hpermission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/encrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(hpermission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)

            const ret1 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.EncryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "encrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.EncryptDataHandlerDefault,
                "EncryptDataHandlerDefault",
                1,
            )
            assert(!ret1.err, `添加handler错误 ---> ${ret1}`)


            let depermission = cyfs.GlobalStatePathAccessItem.new_group("/.cyfs/api/handler/pre_crypto/decrypt_data/",
                undefined, undefined, zone1device1_dec_id, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(depermission)


            const ret2 = await handlerManager.addHandler(
                `${zone1device1.local_device_id().to_base_58()}`,
                zone1device1,
                cyfs.RouterHandlerCategory.DecryptData,
                cyfs.RouterHandlerChain.PreCrypto,
                "decrypt-data-handler-001",
                1,
                undefined,
                req_path,
                cyfs.RouterHandlerAction.Default,
                myHandler.DecryptDataHandlerDefault,
                "DecryptDataHandlerDefault",
                1,
            )
            assert(!ret2.err, `添加handler错误 ---> ${ret2}`)
            let check = handlerManager.startHandlerCheck(10 * 1000);

            let ob = get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: zone1device2_dec_id,
                    target: zone1device1.local_device_id().object_id,
                    flags: 0
                },
                data: ob,
                encrypt_type: cyfs.CryptoEncryptType.EncryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const enresp = await zone1device2.crypto().encrypt_data(enreq);
            console.log(enresp)
            assert(!enresp.err, `加密数据出错 ：${enresp}`)

            let permission = cyfs.GlobalStatePathAccessItem.new("/.cyfs/api/crypto/decrypt_data/", cyfs.AccessString.full())
            let sdec = cyfs.get_system_dec_app().object_id
            let sstack = zone1device2.fork_with_new_dec(sdec)
            await sstack.root_state_meta_stub(sstack.local_device_id().object_id, sdec).add_access(permission)

            const dereq: cyfs.CryptoDecryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: undefined,
                    target: zone1device1.local_device_id().object_id,
                    flags: 0
                },
                data: enresp.unwrap().result,
                decrypt_type: cyfs.CryptoDecryptType.DecryptData,
                flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE
            };
            const deresp = await zone1device2.crypto().decrypt_data(dereq);
            console.log(deresp)
            assert(!deresp.err, `解密数据出错 ：${deresp}`)

            //检查监听事件是否触发
            let handlerResult = await check
            console.info(`EncryptData handler 触发结果为:${JSON.stringify(handlerResult)}`);
            assert(!handlerResult.err)

        })


        //sign_and_push_named_object  sign_and_set_named_object
        it("crypto  sign_and_push_named_object重复叠加多个签名和覆盖5次 ", async () => {

            let [people, people_pk] = create_people();

            const people_id = people.calculate_id()
            const unique_id = Date.now().toString();
            const [ood, ood_pk, address_index] = create_device(people_id, people_pk, cyfs.DeviceCategory.OOD, unique_id);
            // 设置People的ood_list
            people.body_expect().content().ood_list.push(ood.device_id());
            people.body_expect().increase_update_time(cyfs.bucky_time_now());
            const [runtime, runtime_pk] = create_device(people_id, people_pk, cyfs.DeviceCategory.PC, unique_id, 'runtime');


            // People给ood签名
            cyfs.sign_and_push_named_object(people_pk, ood, new cyfs.SignatureRefIndex(254)).unwrap();
            cyfs.sign_and_push_named_object(people_pk, ood, new cyfs.SignatureRefIndex(255)).unwrap();
            cyfs.sign_and_push_named_object(people_pk, ood, new cyfs.SignatureRefIndex(254)).unwrap();
            cyfs.sign_and_push_named_object(people_pk, ood, new cyfs.SignatureRefIndex(254)).unwrap();

            // People给自己签名
            cyfs.sign_and_push_named_object(people_pk, people, new cyfs.SignatureRefIndex(255)).unwrap();
            cyfs.sign_and_push_named_object(people_pk, people, new cyfs.SignatureRefIndex(255)).unwrap();
            cyfs.sign_and_push_named_object(people_pk, people, new cyfs.SignatureRefIndex(254)).unwrap();
            cyfs.sign_and_push_named_object(people_pk, people, new cyfs.SignatureRefIndex(255)).unwrap();

            // People给runtime签名
            cyfs.sign_and_push_named_object(people_pk, runtime, new cyfs.SignatureRefIndex(254)).unwrap();
            cyfs.sign_and_push_named_object(people_pk, runtime, new cyfs.SignatureRefIndex(254)).unwrap();
            cyfs.sign_and_push_named_object(people_pk, runtime, new cyfs.SignatureRefIndex(255)).unwrap();
            cyfs.sign_and_push_named_object(people_pk, runtime, new cyfs.SignatureRefIndex(254)).unwrap();

            //反复覆盖修改签名
            cyfs.sign_and_set_named_object(ood_pk, people, new cyfs.SignatureRefIndex(254))
            cyfs.sign_and_set_named_object(ood_pk, ood, new cyfs.SignatureRefIndex(255))
            cyfs.sign_and_set_named_object(ood_pk, runtime, new cyfs.SignatureRefIndex(255))
            cyfs.sign_and_set_named_object(ood_pk, people, new cyfs.SignatureRefIndex(255))
            cyfs.sign_and_set_named_object(ood_pk, ood, new cyfs.SignatureRefIndex(255))
            cyfs.sign_and_set_named_object(ood_pk, runtime, new cyfs.SignatureRefIndex(255))

            people.desc().public_key()
            people.body_expect().content().ood_list
            people.body_expect().content()




        })
    })
})