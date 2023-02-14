import assert = require('assert');
import * as cyfs from '../../../../../cyfs'
import {create_people_random,create_device} from "../../../../../common_base"
import * as myHandler from "../../../../../common_base/tool/handler"
import { StackManager, CyfsDriverType } from "../../../../../cyfs-driver-client"
import { ErrorCode, RandomGenerator, sleep ,Logger} from '../../../../../base';
import * as addContext from "mochawesome/addContext"
import * as action_api from "../../../../../common_action"

//  npx mocha .\test*.ts --reporter mochawesome --require ts-node/register
const dec_app_1 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device1decapp")
const dec_app_2 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device2decapp")
const handlerManager = new myHandler.HandlerManager(); 
let zone1device1 : cyfs.SharedCyfsStack
let zone1ood : cyfs.SharedCyfsStack
let system_stack : cyfs.SharedCyfsStack
let zone1device2 : cyfs.SharedCyfsStack

describe("SharedCyfsStack crypto目录", function () {
    this.timeout(0);
    const stack_manager = StackManager.createInstance();
    let sysdec = cyfs.get_system_dec_app().object_id;
    let logger : Logger;
    const data_manager = action_api.ActionManager.createInstance();
    this.beforeAll(async function () {
        //测试前置条件，连接测试模拟器设备
        await stack_manager.init();
        logger = stack_manager.logger!;
        await sleep(5000);
        // 所有节点 实例化一个 Http Requestor dec_app_1 协议栈
        let dec_app_1_client =  await stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.Http, dec_app_1);
        let system_dec_app = cyfs.get_system_dec_app().object_id
        let dec_app_2_client = await stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.Http,system_dec_app);
        assert.equal(dec_app_1_client.err,0,dec_app_1_client.log)
        assert.equal(dec_app_2_client.err,0,dec_app_2_client.log)
        logger.info(`############用例执开始执行`);
        zone1device1 = stack_manager.get_cyfs_satck({
            peer_name : "zone1_device1",
            type : cyfs.CyfsStackRequestorType.Http,
            dec_id : dec_app_1.to_base_58() 
        }).stack!; 
        zone1ood = stack_manager.get_cyfs_satck({
            peer_name : "zone1_ood",
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
    this.afterAll(async () => {
        // 停止测试模拟器
        stack_manager.destory();
        // 停止测试驱动
        await stack_manager.driver!.stop();
        // 保存测试记录
        data_manager.save_history_to_file(logger.dir());
    })
    let report_result: {
        title: string;
        value: any;
    };
    beforeEach(function () {
        // 设置当前用例id 方便日志定位问题
        let testcase_id = `Testcase-${RandomGenerator.string(10)}-${Date.now()}`;
        data_manager.update_current_testcase_id(testcase_id);

        logger.info(`\n\n########### ${testcase_id} 开始运行###########\n\n`)
    })
    afterEach(function () {
        // 将当前用例执行记录到history
        let current_actions = data_manager.report_current_actions();
        logger.info(`########### ${current_actions.testcase_id} 运行结束`)
        report_result = {
            title: `用例: ${current_actions.testcase_id}`,
            value: current_actions.action_list
        };
        addContext.default(this, report_result);
    });


    describe("#crypto 相关接口", async () => {
        
        beforeEach(async function () {
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, dec_app_1).clear_access()
        })
        afterEach(async function () {
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, dec_app_1).clear_access()
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
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)

            const obj = cyfs.TextObject.create(zone1device1.local_device_id().object_id, 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)

            const obj = cyfs.TextObject.create(zone1device1.local_device_id().object_id, 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            const object_id = obj.desc().calculate_id();
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
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
                zone1device1.local_device_id().object_id, cyfs.DeviceZoneCategory.CurrentZone, dec_app_1, cyfs.AccessPermissions.Full)
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

            // const obj = cyfs.TextObject.create(cyfs.Some(zone1device1.local_device_id().object_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            // const object_id = obj.desc().calculate_id();
            // const ob = obj.to_vec().unwrap()

            let ob = RandomGenerator.get_len_buf(48)
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

            // const obj = cyfs.TextObject.create(cyfs.Some(zone1device1.local_device_id().object_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            // const object_id = obj.desc().calculate_id();
            // const ob = obj.to_vec().unwrap()

            let ob = RandomGenerator.get_len_buf(117)
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

            // const obj = cyfs.TextObject.create(cyfs.Some(zone1device1.local_device_id().object_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            // const object_id = obj.desc().calculate_id();
            // const ob = obj.to_vec().unwrap()

            let ob = RandomGenerator.get_len_buf(1)
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

            // const obj = cyfs.TextObject.create(cyfs.Some(zone1device1.local_device_id().object_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            // const object_id = obj.desc().calculate_id();
            // const ob = obj.to_vec().unwrap()

            let ob = RandomGenerator.get_len_buf(48)
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

            // const obj = cyfs.TextObject.create(cyfs.Some(zone1device1.local_device_id().object_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            // const object_id = obj.desc().calculate_id();
            // const ob = obj.to_vec().unwrap()

            // let ob = RandomGenerator.get_len_buf(48)
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

            // const obj = cyfs.TextObject.create(cyfs.Some(zone1device1.local_device_id().object_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            // const object_id = obj.desc().calculate_id();
            // const ob = obj.to_vec().unwrap()

            // let ob = RandomGenerator.get_len_buf(48)
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

            let ob = RandomGenerator.get_len_buf(48)
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

            // const obj = cyfs.TextObject.create(cyfs.Some(zone1device1.local_device_id().object_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            // const object_id = obj.desc().calculate_id();
            // const ob = obj.to_vec().unwrap()

            let ob = RandomGenerator.get_len_buf(48)
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

            // const obj = cyfs.TextObject.create(cyfs.Some(zone1device1.local_device_id().object_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            // const object_id = obj.desc().calculate_id();
            // const ob = obj.to_vec().unwrap()

            let ob = RandomGenerator.get_len_buf(48)
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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


            let ob = RandomGenerator.get_len_buf(48)
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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


            let ob = RandomGenerator.get_len_buf(48)
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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


            let ob = RandomGenerator.get_len_buf(48)
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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


            let ob = RandomGenerator.get_len_buf(48)
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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


            let ob = RandomGenerator.get_len_buf(48)
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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


            let ob = RandomGenerator.get_len_buf(48)
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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


            let ob = RandomGenerator.get_len_buf(48)
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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


            let ob = RandomGenerator.get_len_buf(48)
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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


            let ob = RandomGenerator.get_len_buf(48)
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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


            let ob = RandomGenerator.get_len_buf(48)
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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


            let ob = RandomGenerator.get_len_buf(48)
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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


            let ob = RandomGenerator.get_len_buf(48)
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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


            let ob = RandomGenerator.get_len_buf(48)
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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


            let ob = RandomGenerator.get_len_buf(48)
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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


            let ob = RandomGenerator.get_len_buf(48)
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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


            let ob = RandomGenerator.get_len_buf(48)
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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


            let ob = RandomGenerator.get_len_buf(48)
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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


            let ob = RandomGenerator.get_len_buf(48)
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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


            let ob = RandomGenerator.get_len_buf(48)
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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


            let ob = RandomGenerator.get_len_buf(48)
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
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

            let ob = RandomGenerator.get_len_buf(48)
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
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

            let ob = RandomGenerator.get_len_buf(48)
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
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

            let ob = RandomGenerator.get_len_buf(48)
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
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

            let ob = RandomGenerator.get_len_buf(48)
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
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
                    dec_id: dec_app_2,
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(hpermission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
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

            let ob = RandomGenerator.get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: dec_app_2,
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(permission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
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
                    dec_id: dec_app_2,
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
            await system_stack.root_state_meta_stub(system_stack.local_device_id().object_id, sysdec).add_access(hpermission)
            // 添加req_path       
            let path = "/test_non/reqpath/"
            let req_path = new cyfs.RequestGlobalStatePath(dec_app_1, path).toString()
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
                undefined, undefined, dec_app_1, cyfs.AccessPermissions.Full)
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

            let ob = RandomGenerator.get_len_buf(48)
            console.log("----------------------=====================================:  " + ob.byteLength)
            console.info(`will encrypt_data: EncryptData `);

            const enreq: cyfs.CryptoEncryptDataOutputRequest = {
                common: {
                    req_path: req_path,
                    dec_id: dec_app_2,
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

            let [people, people_pk] = create_people_random();

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