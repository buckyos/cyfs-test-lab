import assert = require('assert');
import * as cyfs from '../../../../../cyfs'

import { StackManager, CyfsDriverType } from "../../../../../cyfs-driver-client"
import { RandomGenerator, sleep } from '../../../../../base';
import path = require('path');
import * as fs from 'fs-extra';

import * as action_api from "../../../../../common_action"

const dec_app_1 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device1decapp")
const dec_app_2 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device2decapp")
const dec_app_0 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1ood2decapp")

//  npx mocha .\test*.ts --reporter mochawesome --require ts-node/register

describe("CYFS Stack Tans 模块测试", function () {
    this.timeout(0);
    const stack_manager = StackManager.createInstance(CyfsDriverType.simulator);
    this.beforeAll(async function () {
        //测试前置条件，连接测试模拟器设备
        await stack_manager.init();
        await sleep(5000);
        // 所有节点 实例化一个 Http Requestor dec_app_1 协议栈
        await stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.Http, dec_app_1);
        stack_manager.logger!.info(`##########用例执开始执行`);
    })
    this.afterAll(async () => {
        // 停止测试模拟器
        stack_manager.destory();
        //await sleep(10*1000)
        await stack_manager.driver!.stop();
    })
    describe("Trans 模块接口测试", function () {
        describe("get_context 接口", function () {
            it("get_context 接口-传入必填参数-通过context_id获取", async () => {
                // 连接测试协议栈
                let zone1_ood = { peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http };
                let zone1_device1 = { peer_name: "zone1_device1", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }
                let zone1_ood_satck = stack_manager.get_cyfs_satck(zone1_ood).stack!;
                let zone1_device1_stack = stack_manager.get_cyfs_satck(zone1_device1).stack!;
                let deviceid_list = [zone1_ood_satck.local_device_id(), zone1_device1_stack.local_device_id()];
                // 构造前置操作
                let input = await action_api.PutContextAction.put_noc_random_context(
                    {
                        context_path: `/test_context/${RandomGenerator.string(10)}`,
                        chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                        deviceid_list: deviceid_list
                    },
                    zone1_device1,
                    stack_manager.logger!
                );
                // 测试 get_context 接口
                let info_context = await zone1_device1_stack.trans().get_context({
                    common: {
                        level: cyfs.NDNAPILevel.NDC,
                        flags: 1,
                    },
                    context_id: input.context!.desc().calculate_id(),
                });
                assert.equal(info_context.err, false, `${info_context.toString()}`);
                stack_manager.logger!.info(`get context success : ${info_context.unwrap().context.calculate_id()}`);
            })
            it("get_context 接口-传入必填参数-通过context_path获取", async () => {
                // 连接测试协议栈
                let zone1_ood = { peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http };
                let zone1_device1 = { peer_name: "zone1_device1", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }
                let zone1_ood_satck = stack_manager.get_cyfs_satck(zone1_ood).stack!;
                let zone1_device1_stack = stack_manager.get_cyfs_satck(zone1_device1).stack!;
                let deviceid_list = [zone1_ood_satck.local_device_id(), zone1_device1_stack.local_device_id()];
                // 构造前置操作
                let context_path = `/test_context/${RandomGenerator.string(10)}`;
                let input = await action_api.PutContextAction.put_noc_random_context(
                    {
                        context_path,
                        chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                        deviceid_list: deviceid_list
                    },
                    zone1_device1,
                    stack_manager.logger!
                );
                // 测试 get_context 接口
                let info_context = await zone1_device1_stack.trans().get_context({
                    common: {
                        level: cyfs.NDNAPILevel.NDC,
                        flags: 1,
                    },
                    context_path,
                });
                assert.equal(info_context.err, false, `${info_context.toString()}`);
                stack_manager.logger!.info(`get context success : ${info_context.unwrap().context.calculate_id()}`);
            })
            it("get_context 接口-传入所有参数", async () => {
                // 连接测试协议栈
                let zone1_ood = { peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http };
                let zone1_device1 = { peer_name: "zone1_device1", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }
                let zone1_ood_satck = stack_manager.get_cyfs_satck(zone1_ood).stack!;
                let zone1_device1_stack = stack_manager.get_cyfs_satck(zone1_device1).stack!;
                let deviceid_list = [zone1_ood_satck.local_device_id(), zone1_device1_stack.local_device_id()];
                // 构造前置操作
                let context_path = `/test_context/${RandomGenerator.string(10)}`;
                let input = await action_api.PutContextAction.put_noc_random_context(
                    {
                        context_path,
                        chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                        deviceid_list: deviceid_list
                    },
                    zone1_device1,
                    stack_manager.logger!
                );
                // 测试 get_context 接口
                let info_context = await zone1_device1_stack.trans().get_context({
                    common: {
                        //req_path : 
                        level: cyfs.NDNAPILevel.NDC,
                        flags: 1,
                    },
                    context_path,
                    context_id: input.context!.desc().calculate_id(),
                });
                assert.equal(info_context.err, false, `${info_context.toString()}`);
                stack_manager.logger!.info(`get context success : ${info_context.unwrap().context.calculate_id()}`);
            })
            it("异常用例-get_context 接口-传入必填参数，校验context_id 和context_path必须二选一", async () => {
                // 连接测试协议栈
                let zone1_ood = { peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http };
                let zone1_device1 = { peer_name: "zone1_device1", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }
                let zone1_ood_satck = stack_manager.get_cyfs_satck(zone1_ood).stack!;
                let zone1_device1_stack = stack_manager.get_cyfs_satck(zone1_device1).stack!;
                let deviceid_list = [zone1_ood_satck.local_device_id(), zone1_device1_stack.local_device_id()];
                // 构造前置操作
                let input = await action_api.PutContextAction.put_noc_random_context(
                    {
                        context_path: `/test_context/${RandomGenerator.string(10)}`,
                        chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                        deviceid_list: deviceid_list
                    },
                    zone1_device1,
                    stack_manager.logger!
                );
                // 测试 get_context 接口
                let info_context = await zone1_device1_stack.trans().get_context({
                    common: {
                        level: cyfs.NDNAPILevel.NDC,
                        flags: 1,
                    },
                });
                // 预期失败
                assert.equal(info_context.err, true, `${info_context.toString()}`);
            })
            it("异常用例-get_context 接口- context_id 本地NOC 不存在context", async () => {
                // 连接测试协议栈
                let zone1_device1 = { peer_name: "zone1_device1", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }
                let zone1_device1_stack = stack_manager.get_cyfs_satck(zone1_device1).stack!;

                // 测试 get_context 接口
                let info_context = await zone1_device1_stack.trans().get_context({
                    common: {
                        level: cyfs.NDNAPILevel.NDC,
                        flags: 1,
                    },
                    context_id: cyfs.ObjectId.default()
                });
                // 预期失败
                assert.equal(info_context.err, true, `${info_context.toString()}`);
            })
            it("异常用例-get_context 接口- context_path 本地NOC 不存在context", async () => {
                // 连接测试协议栈
                let zone1_device1 = { peer_name: "zone1_device1", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }
                let zone1_device1_stack = stack_manager.get_cyfs_satck(zone1_device1).stack!;
                let context_path = `/test_context/${RandomGenerator.string(10)}`;
                // 测试 get_context 接口
                let info_context = await zone1_device1_stack.trans().get_context({
                    common: {
                        level: cyfs.NDNAPILevel.NDC,
                        flags: 1,
                    },
                    context_path
                });
                // 预期失败
                assert.equal(info_context.err, true, `${info_context.toString()}`);
            })
            it("异常用例-get_context 接口- 同时输入context_id/context_path,context_id 存在,context_path不存在", async () => {
                // 连接测试协议栈
                let zone1_ood = { peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http };
                let zone1_device1 = { peer_name: "zone1_device1", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }
                let zone1_ood_satck = stack_manager.get_cyfs_satck(zone1_ood).stack!;
                let zone1_device1_stack = stack_manager.get_cyfs_satck(zone1_device1).stack!;
                let deviceid_list = [zone1_ood_satck.local_device_id(), zone1_device1_stack.local_device_id()];
                // 构造前置操作
                let context_path = `/test_context/${RandomGenerator.string(10)}`;
                let input = await action_api.PutContextAction.put_noc_random_context(
                    {
                        context_path,
                        chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                        deviceid_list: deviceid_list
                    },
                    zone1_device1,
                    stack_manager.logger!
                );
                // 测试 get_context 接口
                let info_context = await zone1_device1_stack.trans().get_context({
                    common: {
                        //req_path : 
                        level: cyfs.NDNAPILevel.NDC,
                        flags: 1,
                    },
                    context_path: "/test_no_path",
                    context_id: input.context!.desc().calculate_id(),
                });
                assert.equal(info_context.err, false, `${info_context.toString()}`);
                stack_manager.logger!.info(`get context success : ${info_context.unwrap().context.calculate_id()}`);
            })
            it("异常用例-get_context 接口- 同时输入context_id/context_path,context_id 不存在,context_path存在", async () => {
                // 连接测试协议栈
                let zone1_ood = { peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http };
                let zone1_device1 = { peer_name: "zone1_device1", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }
                let zone1_ood_satck = stack_manager.get_cyfs_satck(zone1_ood).stack!;
                let zone1_device1_stack = stack_manager.get_cyfs_satck(zone1_device1).stack!;
                let deviceid_list = [zone1_ood_satck.local_device_id(), zone1_device1_stack.local_device_id()];
                // 构造前置操作
                let context_path = `/test_context/${RandomGenerator.string(10)}`;
                let input = await action_api.PutContextAction.put_noc_random_context(
                    {
                        context_path,
                        chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                        deviceid_list: deviceid_list
                    },
                    zone1_device1,
                    stack_manager.logger!
                );
                // 测试 get_context 接口
                let info_context = await zone1_device1_stack.trans().get_context({
                    common: {
                        //req_path : 
                        level: cyfs.NDNAPILevel.NDC,
                        flags: 1,
                    },
                    context_path,
                    context_id: cyfs.ObjectId.default(),
                });
                assert.equal(info_context.err, true, `${info_context.toString()}`);
            })
            describe("get_context 接口-NDNOutputRequestCommon 参数验证", async () => {
                it("NDNOutputRequestCommon 验证本地NDC 获取", async () => {
                    // 连接测试协议栈
                    let zone1_ood = { peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http };
                    let zone1_device1 = { peer_name: "zone1_device1", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }
                    let zone1_ood_satck = stack_manager.get_cyfs_satck(zone1_ood).stack!;
                    let zone1_device1_stack = stack_manager.get_cyfs_satck(zone1_device1).stack!;
                    let deviceid_list = [zone1_ood_satck.local_device_id(), zone1_device1_stack.local_device_id()];
                    // 构造前置操作
                    let context_path = `/test_context/${RandomGenerator.string(10)}`;
                    let input = await action_api.PutContextAction.put_noc_random_context(
                        {
                            context_path,
                            chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                            deviceid_list: deviceid_list
                        },
                        zone1_device1,
                        stack_manager.logger!
                    );
                    // 测试 get_context 接口
                    let info_context = await zone1_device1_stack.trans().get_context({
                        common: {
                            //req_path : 
                            level: cyfs.NDNAPILevel.NDC,
                            flags: 1,
                        },
                        context_path,
                        context_id: input.context!.desc().calculate_id(),
                    });
                    assert.equal(info_context.err, false, `${info_context.toString()}`);
                    stack_manager.logger!.info(`get context success : ${info_context.unwrap().context.calculate_id()}`);
                })
                it("NDNOutputRequestCommon 验证NDN 同Zone device1 从 OOD 获取", async () => {
                    // 连接测试协议栈
                    let zone1_ood = { peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http };
                    let zone1_device1 = { peer_name: "zone1_device1", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }
                    let zone1_ood_satck = stack_manager.get_cyfs_satck(zone1_ood).stack!;
                    let zone1_device1_stack = stack_manager.get_cyfs_satck(zone1_device1).stack!;
                    let deviceid_list = [zone1_ood_satck.local_device_id(), zone1_device1_stack.local_device_id()];
                    // 构造前置操作
                    let context_path = `/test_context/${RandomGenerator.string(10)}`;
                    let input = await action_api.PutContextAction.put_noc_random_context(
                        {
                            context_path,
                            chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                            deviceid_list: deviceid_list
                        },
                        zone1_device1,
                        stack_manager.logger!
                    );
                    // 测试 get_context 接口
                    let info_context = await zone1_ood_satck.trans().get_context({
                        common: {
                            //req_path : 
                            target: zone1_device1_stack.local_device_id().object_id,
                            level: cyfs.NDNAPILevel.NDC,
                            flags: 1,
                        },
                        context_path,
                        context_id: input.context!.desc().calculate_id(),
                    });
                    assert.equal(info_context.err, false, `${info_context.toString()}`);
                    stack_manager.logger!.info(`get context success : ${info_context.unwrap().context.calculate_id()}`);
                })
                it.skip("NDNOutputRequestCommon 验证NDN 跨Zone OOD2 从 OOD1 获取", async () => {
                    // 连接测试协议栈
                    let zone1_ood = { peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http };
                    let zone2_ood = { peer_name: "zone2_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http };
                    let zone1_device1 = { peer_name: "zone1_device1", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }
                    let zone1_ood_satck = stack_manager.get_cyfs_satck(zone1_ood).stack!;
                    let zone2_ood_satck = stack_manager.get_cyfs_satck(zone2_ood).stack!;
                    let zone1_device1_stack = stack_manager.get_cyfs_satck(zone1_device1).stack!;
                    let deviceid_list = [zone1_ood_satck.local_device_id(), zone1_device1_stack.local_device_id()];
                    // 构造前置操作
                    let context_path = `/test_context/${RandomGenerator.string(10)}`;
                    let input = await action_api.PutContextAction.put_noc_random_context(
                        {
                            context_path,
                            chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                            deviceid_list: deviceid_list
                        },
                        zone1_ood,
                        stack_manager.logger!
                    );
                    // 测试 get_context 接口
                    let info_context = await zone2_ood_satck.trans().get_context({
                        common: {
                            //req_path : 
                            target: zone1_ood_satck.local_device_id().object_id,
                            level: cyfs.NDNAPILevel.NDC,
                            flags: 1,
                        },
                        context_path,
                        context_id: input.context!.desc().calculate_id(),
                    });
                    assert.equal(info_context.err, false, `${info_context.toString()}`);
                    stack_manager.logger!.info(`get context success : ${info_context.unwrap().context.calculate_id()}`);
                })
            })
        })
        describe("put_context 接口", function () {
            it("put_context 接口-传入必填参数", async () => {
                // 连接测试协议栈
                let zone1_ood = { peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http };
                let zone1_device1 = { peer_name: "zone1_device1", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }
                let zone1_ood_satck = stack_manager.get_cyfs_satck(zone1_ood).stack!;
                let zone1_device1_stack = stack_manager.get_cyfs_satck(zone1_device1).stack!;
                // 构造测试数据
                let context_path = `/test_context/${RandomGenerator.string(10)}`;
                let context = cyfs.TransContext.new(dec_app_1, context_path);
                stack_manager.logger!.info(`create context ${context.desc().calculate_id().to_base_58()}`);
                let deviceid_list = [zone1_ood_satck.local_device_id(), zone1_device1_stack.local_device_id()];
                for (let device of deviceid_list) {
                    context.body_expect().content().device_list.push(new cyfs.TransContextDevice(device, cyfs.ChunkCodecDesc.Stream()));
                }
                // 发送请求
                stack_manager.logger!.info(`${JSON.stringify(context.device_list())}`)
                let info_context = await zone1_ood_satck.trans().put_context({
                    common: {
                        level: cyfs.NDNAPILevel.NDC,
                        flags: 1,
                    },
                    context: context,
                    //access: cyfs.AccessString.full()

                });

                assert.equal(info_context.err, false, `${info_context.toString()}`);
                stack_manager.logger!.info(`put_context  =  ${JSON.stringify(info_context.unwrap())}`);
            })
            it("put_context 接口-传入所有参数", async () => {
                // 连接测试协议栈
                let zone1_ood = { peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http };
                let zone1_device1 = { peer_name: "zone1_device1", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }
                let zone1_ood_satck = stack_manager.get_cyfs_satck(zone1_ood).stack!;
                let zone1_device1_stack = stack_manager.get_cyfs_satck(zone1_device1).stack!;
                // 构造测试数据
                let context_path = `/test_context/${RandomGenerator.string(10)}`;
                let context = cyfs.TransContext.new(dec_app_1, context_path);
                stack_manager.logger!.info(`create context ${context.desc().calculate_id().to_base_58()}`);
                let deviceid_list = [zone1_ood_satck.local_device_id(), zone1_device1_stack.local_device_id()];
                for (let device of deviceid_list) {
                    context.body_expect().content().device_list.push(new cyfs.TransContextDevice(device, cyfs.ChunkCodecDesc.Stream()));
                }
                // 发送请求
                stack_manager.logger!.info(`${JSON.stringify(context.device_list())}`)
                let info_context = await zone1_ood_satck.trans().put_context({
                    common: {
                        level: cyfs.NDNAPILevel.NDC,
                        flags: 1,
                    },
                    context: context,
                    access: cyfs.AccessString.full()

                });
                assert.equal(info_context.err, false, `${info_context.toString()}`);
                stack_manager.logger!.info(`put_context  =  ${JSON.stringify(info_context.unwrap())}`);
            })
            it("put_context 接口-同一context_path 进行两次put 不同 context进行覆盖操作", async () => {
                // 连接测试协议栈
                let zone1_ood = { peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http };
                let zone1_device1 = { peer_name: "zone1_device1", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }
                let zone1_ood_satck = stack_manager.get_cyfs_satck(zone1_ood).stack!;
                let zone1_device1_stack = stack_manager.get_cyfs_satck(zone1_device1).stack!;
                // 构造测试数据
                let context_path = `/test_context/${RandomGenerator.string(10)}`;
                let context = cyfs.TransContext.new(dec_app_1, context_path);
                let context2 = cyfs.TransContext.new(dec_app_2, context_path);
                stack_manager.logger!.info(`create context ${context.desc().calculate_id().to_base_58()}`);
                let deviceid_list = [zone1_ood_satck.local_device_id(), zone1_device1_stack.local_device_id()];
                for (let device of deviceid_list) {
                    context.body_expect().content().device_list.push(new cyfs.TransContextDevice(device, cyfs.ChunkCodecDesc.Stream()));
                }
                // 发送请求
                stack_manager.logger!.info(`${JSON.stringify(context.device_list())}`)
                let info_context = await zone1_ood_satck.trans().put_context({
                    common: {
                        level: cyfs.NDNAPILevel.NDC,
                        flags: 1,
                    },
                    context: context,
                    access: cyfs.AccessString.full()

                });
                assert.equal(info_context.err, false, `${info_context.toString()}`);
                stack_manager.logger!.info(`put_context  =  ${JSON.stringify(info_context.unwrap())}`);
                let info_context2 = await zone1_ood_satck.trans().put_context({
                    common: {
                        level: cyfs.NDNAPILevel.NDC,
                        flags: 1,
                    },
                    context: context2,
                    access: cyfs.AccessString.full()

                });
                assert.equal(info_context2.err, false, `${info_context2.toString()}`);
                stack_manager.logger!.info(`put_context  =  ${JSON.stringify(info_context2.unwrap())}`);

            })

            describe("put_context 接口-验证TransContext 对象编解码", async () => {
                it("deviceid_list 设置为空", async () => {
                    // 构造测试数据
                    let context_path = `/test_context/${RandomGenerator.string(10)}`;
                    let context = cyfs.TransContext.new(dec_app_1, context_path);
                    stack_manager.logger!.info(`create context ${context.desc().calculate_id().to_base_58()}`);
                    //编解码
                    let ucontext = context.to_vec().unwrap()
                    let [o, u8] = new cyfs.TransContextDecoder().raw_decode(ucontext).unwrap()
                    //获取属性
                    let cp = o.context_path();
                    let dl = o.body_expect().content().device_list;
                    //校验
                    assert.equal(cp, context_path, `cp is ${cp} context_path is ${context_path}`);
                    assert.equal(dl.toString(), "", `dl is ${dl.toString()}`);
                })
                it("deviceid_list ChunkCodecDesc 设置为Stream", async () => {
                    // 连接测试协议栈
                    let zone1_ood = { peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http };
                    let zone1_device1 = { peer_name: "zone1_device1", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }
                    let zone1_ood_satck = stack_manager.get_cyfs_satck(zone1_ood).stack!;
                    let zone1_device1_stack = stack_manager.get_cyfs_satck(zone1_device1).stack!;
                    // 构造测试数据
                    let context_path = `/test_context/${RandomGenerator.string(10)}`;
                    let context = cyfs.TransContext.new(dec_app_1, context_path);
                    stack_manager.logger!.info(`create context ${context.desc().calculate_id().to_base_58()}`);
                    let deviceid1 = zone1_ood_satck.local_device_id();
                    let deviceid2 = zone1_device1_stack.local_device_id();
                    let device1 = new cyfs.TransContextDevice(deviceid1, cyfs.ChunkCodecDesc.Stream())
                    let device2 = new cyfs.TransContextDevice(deviceid2, cyfs.ChunkCodecDesc.Stream())
                    let device_list = [device1, device2];
                    for (let device of device_list) {
                        context.body_expect().content().device_list.push(device);
                    }
                    let ucontext = context.to_vec().unwrap()
                    let [o, u8] = new cyfs.TransContextDecoder().raw_decode(ucontext).unwrap()

                    //获取属性
                    let cp = o.context_path();
                    let dl = o.body_expect().content().device_list;
                    let odeviceid1 = dl[0].target.to_base_58()
                    let odeviceid2 = dl[1].target.to_base_58()
                    console.log(`deviceid1 ${deviceid1} odeviceid1 ${odeviceid1}`)
                    assert.equal(cp, context_path, `cp is ${cp} context_path is ${context_path}`);
                    assert.equal(deviceid1.to_base_58(), odeviceid1, `dl is ${deviceid1.toString()}`);
                    assert.equal(deviceid2.to_base_58(), odeviceid2, `dl is ${deviceid2.toString()}`);
                })
                it("deviceid_list ChunkCodecDesc 设置为Unknown", async () => {
                    // 连接测试协议栈
                    let zone1_ood = { peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http };
                    let zone1_device1 = { peer_name: "zone1_device1", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }
                    let zone1_ood_satck = stack_manager.get_cyfs_satck(zone1_ood).stack!;
                    let zone1_device1_stack = stack_manager.get_cyfs_satck(zone1_device1).stack!;
                    // 构造测试数据
                    let context_path = `/test_context/${RandomGenerator.string(10)}`;
                    let context = cyfs.TransContext.new(dec_app_1, context_path);
                    stack_manager.logger!.info(`create context ${context.desc().calculate_id().to_base_58()}`);
                    let deviceid1 = zone1_ood_satck.local_device_id();
                    let deviceid2 = zone1_device1_stack.local_device_id();
                    let device1 = new cyfs.TransContextDevice(deviceid1, cyfs.ChunkCodecDesc.Unknown())
                    let device2 = new cyfs.TransContextDevice(deviceid2, cyfs.ChunkCodecDesc.Unknown())
                    let device_list = [device1, device2];
                    for (let device of device_list) {
                        context.body_expect().content().device_list.push(device);
                    }
                    let ucontext = context.to_vec().unwrap()
                    let [o, u8] = new cyfs.TransContextDecoder().raw_decode(ucontext).unwrap()

                    //获取属性
                    let cp = o.context_path();
                    let dl = o.body_expect().content().device_list;
                    let odeviceid1 = dl[0].target.to_base_58()
                    let odeviceid2 = dl[1].target.to_base_58()
                    console.log(`deviceid1 ${deviceid1} odeviceid1 ${odeviceid1}`)
                    assert.equal(cp, context_path, `cp is ${cp} context_path is ${context_path}`);
                    assert.equal(deviceid1.to_base_58(), odeviceid1, `dl is ${deviceid1.toString()}`);
                    assert.equal(deviceid2.to_base_58(), odeviceid2, `dl is ${deviceid2.toString()}`);
                })
                it("deviceid_list ChunkCodecDesc 设置为Raptor", async () => {
                    // 连接测试协议栈
                    let zone1_ood = { peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http };
                    let zone1_device1 = { peer_name: "zone1_device1", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }
                    let zone1_ood_satck = stack_manager.get_cyfs_satck(zone1_ood).stack!;
                    let zone1_device1_stack = stack_manager.get_cyfs_satck(zone1_device1).stack!;
                    // 构造测试数据
                    let context_path = `/test_context/${RandomGenerator.string(10)}`;
                    let context = cyfs.TransContext.new(dec_app_1, context_path);
                    stack_manager.logger!.info(`create context ${context.desc().calculate_id().to_base_58()}`);
                    let deviceid1 = zone1_ood_satck.local_device_id();
                    let deviceid2 = zone1_device1_stack.local_device_id();
                    let device1 = new cyfs.TransContextDevice(deviceid1, cyfs.ChunkCodecDesc.Raptor())
                    let device2 = new cyfs.TransContextDevice(deviceid2, cyfs.ChunkCodecDesc.Raptor())
                    let device_list = [device1, device2];
                    for (let device of device_list) {
                        context.body_expect().content().device_list.push(device);
                    }
                    let ucontext = context.to_vec().unwrap()
                    let [o, u8] = new cyfs.TransContextDecoder().raw_decode(ucontext).unwrap()

                    //获取属性
                    let cp = o.context_path();
                    let dl = o.body_expect().content().device_list;
                    let odeviceid1 = dl[0].target
                    let odeviceid2 = dl[1].target
                    console.log(`deviceid1 ${deviceid1} odeviceid1 ${odeviceid1}`)
                    assert.equal(cp, context_path, `cp is ${cp} context_path is ${context_path}`);
                    assert.equal(deviceid1.to_base_58(), odeviceid1.to_base_58(), `dl is ${deviceid1.toString()}`);
                    assert.equal(deviceid2.to_base_58(), odeviceid2.to_base_58(), `dl is ${deviceid2.toString()}`);
                })
                it("deviceid_list ChunkCodecDesc 设置为Stream/Raptor/Unknown 混合", async () => {
                    // 连接测试协议栈
                    let zone1_ood = { peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http };
                    let zone1_device1 = { peer_name: "zone1_device1", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }
                    let zone1_ood_satck = stack_manager.get_cyfs_satck(zone1_ood).stack!;
                    let zone1_device1_stack = stack_manager.get_cyfs_satck(zone1_device1).stack!;
                    // 构造测试数据
                    let context_path = `/test_context/${RandomGenerator.string(10)}`;
                    let context = cyfs.TransContext.new(dec_app_1, context_path);
                    stack_manager.logger!.info(`create context ${context.desc().calculate_id().to_base_58()}`);
                    let deviceid1 = zone1_ood_satck.local_device_id();
                    let deviceid2 = zone1_device1_stack.local_device_id();
                    let device1 = new cyfs.TransContextDevice(deviceid1, cyfs.ChunkCodecDesc.Raptor())
                    let device2 = new cyfs.TransContextDevice(deviceid2, cyfs.ChunkCodecDesc.Unknown())
                    let device_list = [device1, device2];
                    for (let device of device_list) {
                        context.body_expect().content().device_list.push(device);
                    }
                    let ucontext = context.to_vec().unwrap()
                    let [o, u8] = new cyfs.TransContextDecoder().raw_decode(ucontext).unwrap()

                    //获取属性
                    let cp = o.context_path();
                    let dl = o.body_expect().content().device_list;
                    let odeviceid1 = dl[0].target
                    let odeviceid2 = dl[1].target
                    console.log(`deviceid1 ${deviceid1} odeviceid1 ${odeviceid1}`)
                    assert.equal(cp, context_path, `cp is ${cp} context_path is ${context_path}`);
                    assert.equal(deviceid1.to_base_58(), odeviceid1.to_base_58(), `dl is ${deviceid1.toString()}`);
                    assert.equal(deviceid2.to_base_58(), odeviceid2.to_base_58(), `dl is ${deviceid2.toString()}`);
                })
            })
            describe("put_context 接口-NDNOutputRequestCommon 参数验证", async () => {
                it("NDNOutputRequestCommon 验证本地NDC put", async () => {
                    // 连接测试协议栈
                    let zone1_ood = { peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http };
                    let zone1_device1 = { peer_name: "zone1_device1", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }
                    let zone1_ood_satck = stack_manager.get_cyfs_satck(zone1_ood).stack!;
                    let zone1_device1_stack = stack_manager.get_cyfs_satck(zone1_device1).stack!;
                    // 构造测试数据
                    let context_path = `/test_context/${RandomGenerator.string(10)}`;
                    let context = cyfs.TransContext.new(dec_app_1, context_path);
                    stack_manager.logger!.info(`create context ${context.desc().calculate_id().to_base_58()}`);
                    let deviceid_list = [zone1_ood_satck.local_device_id(), zone1_device1_stack.local_device_id()];
                    for (let device of deviceid_list) {
                        context.body_expect().content().device_list.push(new cyfs.TransContextDevice(device, cyfs.ChunkCodecDesc.Stream()));
                    }
                    // 发送请求
                    stack_manager.logger!.info(`${JSON.stringify(context.device_list())}`)
                    let info_context = await zone1_ood_satck.trans().put_context({
                        common: {
                            target: zone1_ood_satck.local_device_id().object_id,
                            level: cyfs.NDNAPILevel.NDC,
                            flags: 1,
                        },
                        context: context,
                        access: cyfs.AccessString.full()

                    });
                    assert.equal(info_context.err, false, `${info_context.toString()}`);
                    stack_manager.logger!.info(`put_context  =  ${JSON.stringify(info_context.unwrap())}`);
                })
                it("NDNOutputRequestCommon 验证NDN 同Zone device1 -> OOD", async () => {
                    // 连接测试协议栈
                    let zone1_ood = { peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http };
                    let zone1_device1 = { peer_name: "zone1_device1", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }
                    let zone1_ood_satck = stack_manager.get_cyfs_satck(zone1_ood).stack!;
                    let zone1_device1_stack = stack_manager.get_cyfs_satck(zone1_device1).stack!;
                    // 构造测试数据
                    let context_path = `/test_context/${RandomGenerator.string(10)}`;
                    let context = cyfs.TransContext.new(dec_app_1, context_path);
                    stack_manager.logger!.info(`create context ${context.desc().calculate_id().to_base_58()}`);
                    let deviceid_list = [zone1_ood_satck.local_device_id(), zone1_device1_stack.local_device_id()];
                    for (let device of deviceid_list) {
                        context.body_expect().content().device_list.push(new cyfs.TransContextDevice(device, cyfs.ChunkCodecDesc.Stream()));
                    }
                    // 发送请求
                    stack_manager.logger!.info(`${JSON.stringify(context.device_list())}`)
                    let info_context = await zone1_device1_stack.trans().put_context({
                        common: {
                            target: zone1_ood_satck.local_device_id().object_id,
                            level: cyfs.NDNAPILevel.NDC,
                            flags: 1,
                        },
                        context: context,
                        access: cyfs.AccessString.full()

                    });
                    assert.equal(info_context.err, false, `${info_context.toString()}`);
                    stack_manager.logger!.info(`put_context  =  ${JSON.stringify(info_context.unwrap())}`);
                })
                it.skip("NDNOutputRequestCommon 验证NDN 跨Zone OOD1 -> OOD2", async () => {
                    // 连接测试协议栈
                    let zone1_ood = { peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http };
                    let zone1_device1 = { peer_name: "zone1_device1", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }
                    let zone1_ood_satck = stack_manager.get_cyfs_satck(zone1_ood).stack!;
                    let zone1_device1_stack = stack_manager.get_cyfs_satck(zone1_device1).stack!;
                    let zone2_ood = { peer_name: "zone2_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http };
                    let zone2_ood_satck = stack_manager.get_cyfs_satck(zone2_ood).stack!;
                    // 构造测试数据
                    let context_path = `/test_context/${RandomGenerator.string(10)}`;
                    let context = cyfs.TransContext.new(dec_app_1, context_path);
                    stack_manager.logger!.info(`create context ${context.desc().calculate_id().to_base_58()}`);
                    let deviceid_list = [zone1_ood_satck.local_device_id(), zone1_device1_stack.local_device_id()];
                    for (let device of deviceid_list) {
                        context.body_expect().content().device_list.push(new cyfs.TransContextDevice(device, cyfs.ChunkCodecDesc.Stream()));
                    }
                    // 发送请求
                    stack_manager.logger!.info(`${JSON.stringify(context.device_list())}`)
                    let info_context = await zone1_ood_satck.trans().put_context({
                        common: {
                            target: zone2_ood_satck.local_device_id().object_id,
                            level: cyfs.NDNAPILevel.NDC,
                            flags: 1,
                        },
                        context: context,
                        access: cyfs.AccessString.full()

                    });
                    assert.equal(info_context.err, false, `${info_context.toString()}`);
                    stack_manager.logger!.info(`put_context  =  ${JSON.stringify(info_context.unwrap())}`);
                })
            })
        })
        describe("publish_file 接口", function () {
            it("publish_file 接口-传入必填参数", async () => {
                // 连接测试协议栈
                let zone1_ood = { peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http };
                let zone1_device1 = { peer_name: "zone1_device1", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }
                let zone1_device1_stack = stack_manager.get_cyfs_satck(zone1_device1).stack!;
                // 构造测试数据
                let saveDir = path.join(__dirname, "/test_cache_file")
                let inner_path = `/file-${RandomGenerator.string(6)}.txt`
                let local_path = path.join(saveDir, inner_path)
                console.log(`_______>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>${local_path}`)
                { //清理缓存文件
                    let num = fs.readdirSync(saveDir).length
                    if (num > 5) {
                        await fs.removeSync(saveDir)
                        console.log("-----------------------> 缓存文件已超过最大数，执行清理操作成功！")
                    }
                }
                //(2)生成测试文件
                await RandomGenerator.create_random_file(saveDir, inner_path, 1 * 1024 * 1024);

                let owner = zone1_device1_stack.local_device().desc().owner()!
                let publish_file_time = Date.now();
                //1. publish_file 将文件存放到本地NDC 发送请求 
                const pubres = (await zone1_device1_stack.trans().publish_file({
                    common: {
                        level: cyfs.NDNAPILevel.NDC,
                        flags: 0,
                    },
                    owner,
                    local_path: saveDir,
                    chunk_size: 512 * 1024
                }));
                publish_file_time = Date.now() - publish_file_time;
                console.info(`addDir publish_file 耗时：${publish_file_time}`)
                assert(!pubres.err, `publish_file 失败`)
                stack_manager.logger!.info(`put_context  =  ${JSON.stringify(pubres.unwrap())}`);
            })
            it("publish_file 接口-传入所有参数", async () => {
                // 连接测试协议栈
                let zone1_ood = { peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http };
                let zone1_device1 = { peer_name: "zone1_device1", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }
                let zone1_ood_satck = stack_manager.get_cyfs_satck(zone1_ood).stack!;
                let zone1_device1_stack = stack_manager.get_cyfs_satck(zone1_device1).stack!;
                // 构造测试数据
                let saveDir = path.join(__dirname, "/test_cache_file")
                let inner_path = `/file-${RandomGenerator.string(6)}.txt`
                let local_path = path.join(saveDir, inner_path)
                console.log(`_______>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>${local_path}`)
                { //清理缓存文件
                    let num = fs.readdirSync(saveDir).length
                    if (num > 5) {
                        await fs.removeSync(saveDir)
                        console.log("-----------------------> 缓存文件已超过最大数，执行清理操作成功！")
                    }
                }
                //(2)生成测试文件
                await RandomGenerator.create_random_file(saveDir, inner_path, 1 * 1024 * 1024);

                let owner = zone1_device1_stack.local_device().desc().owner()!
                let publish_file_time = Date.now();
                //1. publish_file 将文件存放到本地NDC 发送请求 
                const pubres = (await zone1_device1_stack.trans().publish_file({
                    common: {
                        level: cyfs.NDNAPILevel.NDC,
                        flags: 0,
                        dec_id: zone1_device1_stack.dec_id,
                        req_path: undefined,
                        referer_object: []
                    },
                    owner,
                    local_path: saveDir,
                    chunk_size: 512 * 1024,     // chunk大小4M
                    dirs: []
                }));
                publish_file_time = Date.now() - publish_file_time;
                console.info(`publish_file 耗时：${publish_file_time}`)
                assert(!pubres.err, `publish_file 失败`)
                stack_manager.logger!.info(`put_context  =  ${JSON.stringify(pubres.unwrap())}`);
            })
            it("publish_file 接口-上传文件夹", async () => {
                // 连接测试协议栈
                let zone1_ood = { peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http };
                let zone1_device1 = { peer_name: "zone1_device1", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }
                let zone1_ood_satck = stack_manager.get_cyfs_satck(zone1_ood).stack!;
                let zone1_device1_stack = stack_manager.get_cyfs_satck(zone1_device1).stack!;
                // 构造测试数据
                let saveDir = path.join(__dirname, "/test_cache_file")
                let inner_path = `/file-${RandomGenerator.string(6)}.txt`
                let local_path = path.join(saveDir)
                console.log(`_______>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>${local_path}`)
                { //清理缓存文件
                    let num = fs.readdirSync(saveDir).length
                    if (num > 5) {
                        await fs.removeSync(saveDir)
                        console.log("-----------------------> 缓存文件已超过最大数，执行清理操作成功！")
                    }
                }
                //(2)生成测试文件
                await RandomGenerator.create_random_file(saveDir, inner_path, 1 * 1024 * 1024);

                let owner = zone1_device1_stack.local_device().desc().owner()!
                let publish_file_time = Date.now();
                //1. publish_file 将文件存放到本地NDC 发送请求 
                const pubres = (await zone1_device1_stack.trans().publish_file({
                    common: {
                        level: cyfs.NDNAPILevel.NDC,
                        flags: 0,
                        dec_id: zone1_device1_stack.dec_id,
                        req_path: undefined,
                        referer_object: []
                    },
                    owner,
                    local_path: saveDir,
                    chunk_size: 512 * 1024,     // chunk大小4M
                    dirs: []
                }));
                publish_file_time = Date.now() - publish_file_time;
                console.info(`publish_file 耗时：${publish_file_time}`)
                assert(!pubres.err, `publish_file 失败`)
                stack_manager.logger!.info(`put_context  =  ${JSON.stringify(pubres.unwrap())}`);
            })
            it("publish_file 接口-通过设置file_id上传文件", async () => {
                // 连接测试协议栈
                let zone1_ood = { peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http };
                let zone1_device1 = { peer_name: "zone1_device1", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }
                let zone1_ood_satck = stack_manager.get_cyfs_satck(zone1_ood).stack!;
                let zone1_device1_stack = stack_manager.get_cyfs_satck(zone1_device1).stack!;
                // 构造测试数据
                let saveDir = path.join(__dirname, "/test_cache_file")
                let inner_path = `/file-${RandomGenerator.string(6)}.txt`
                let local_path = path.join(saveDir, inner_path)
                console.log(`_______>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>${local_path}`)
                { //清理缓存文件
                    let num = fs.readdirSync(saveDir).length
                    if (num > 5) {
                        await fs.removeSync(saveDir)
                        console.log("-----------------------> 缓存文件已超过最大数，执行清理操作成功！")
                    }
                }
                //(2)生成测试文件
                await RandomGenerator.create_random_file(saveDir, inner_path, 1 * 1024 * 1024);

                let file_id = cyfs.File
                let owner = zone1_device1_stack.local_device().desc().owner()!
                let publish_file_time = Date.now();
                //1. publish_file 将文件存放到本地NDC 发送请求 
                const pubres = (await zone1_device1_stack.trans().publish_file({
                    common: {
                        level: cyfs.NDNAPILevel.NDC,
                        flags: 0,
                        dec_id: zone1_device1_stack.dec_id,
                        req_path: undefined,
                        referer_object: []
                    },
                    owner,
                    local_path: saveDir,
                    chunk_size: 512 * 1024,     // chunk大小4M
                    dirs: []
                }));
                publish_file_time = Date.now() - publish_file_time;
                console.info(`publish_file 耗时：${publish_file_time}`)
                assert(!pubres.err, `publish_file 失败`)
                stack_manager.logger!.info(`put_context  =  ${JSON.stringify(pubres.unwrap())}`);
            })
            it("publish_file 接口-通过设置dir关联对象", async () => {

            })
            describe("publish_file 接口对chunksize 的边界值进行校验", async () => {
                it("最小值-1", async () => { })
                it("最小值", async () => { })
                it("最小值+1", async () => { })
                it("100MB", async () => { })
                it("1GB", async () => { })
            })
            it("publish_file 接口-local_path 本地文件路径不存在", async () => {

            })
            describe("publish_file 接口-NDNOutputRequestCommon 参数验证", async () => {
                it("NDNOutputRequestCommon 验证本地NDC 上传文件", async () => { })
                it("NDNOutputRequestCommon 验证NDN 同Zone device1 -> OOD 上传文件", async () => { })
                it("NDNOutputRequestCommon 验证NDN 跨Zone OOD1 -> OOD2 上传文件", async () => { })
            })
        })

        describe("create_task 接口", function () {
            it("create_task 接口-传入必填参数", async () => {

            })
            it("create_task 接口-传入所有参数", async () => {

            })
            it("create_task 接口-指定local_path本地文件不存在,自动创建路径", async () => {

            })
            it("create_task 接口-指定context本地NOC中不存在", async () => {

            })
            it("create_task 接口-指定object_id 本地NOC中不存在", async () => {

            })

            it("create_task 接口-指定device_list,context不存在device_list", async () => {

            })
            it("create_task 接口-指定device_list不存在文件", async () => {

            })
            it("create_task 接口-不指定device_list,context存在device_list", async () => {

            })
            describe("create_task 接口-NDNOutputRequestCommon 参数验证", async () => {
                it("NDNOutputRequestCommon 验证本地NDC", async () => { })
                it("NDNOutputRequestCommon 验证NDN 同Zone device1 -> OOD", async () => { })
                it("NDNOutputRequestCommon 验证NDN 跨Zone OOD1 -> OOD2", async () => { })
            })
        })
        /**
         * TransTaskState {
            Pending,
            Downloading(TransTaskOnAirState),
            Paused,
            Canceled,
            Finished(u32 upload_speed),
            Err(BuckyErrorCode),
        }
         */
        describe("start_task 接口", function () {
            it("start_task 接口-传入必填参数", async () => {

            })
            it("start_task 接口-传入所有参数", async () => {

            })
            it("start_task 接口-task_id 不存在", async () => {

            })
            describe("start_task 接口-NDNOutputRequestCommon 参数验证", async () => {
                it("NDNOutputRequestCommon 验证本地NDC", async () => { })
                it("NDNOutputRequestCommon 验证NDN 同Zone device1 -> OOD", async () => { })
                it("NDNOutputRequestCommon 验证NDN 跨Zone OOD1 -> OOD2", async () => { })
            })
        })
        describe("stop_task 接口", function () {
            it("stop_task 接口-传入必填参数", async () => {

            })
            it("stop_task 接口-传入所有参数", async () => {

            })
            it("stop_task 接口-task_id 不存在", async () => {

            })
            describe("stop_task 接口-NDNOutputRequestCommon 参数验证", async () => {
                it("NDNOutputRequestCommon 验证本地NDC", async () => { })
                it("NDNOutputRequestCommon 验证NDN 同Zone device1 -> OOD", async () => { })
                it("NDNOutputRequestCommon 验证NDN 跨Zone OOD1 -> OOD2", async () => { })
            })
        })
        describe("delete_task 接口", function () {
            it("delete_task 接口-传入必填参数", async () => {

            })
            it("delete_task 接口-传入所有参数", async () => {

            })
            it("delete_task 接口-task_id 不存在", async () => {

            })
            describe("delete_task 接口-NDNOutputRequestCommon 参数验证", async () => {
                it("NDNOutputRequestCommon 验证本地NDC", async () => { })
                it("NDNOutputRequestCommon 验证NDN 同Zone device1 -> OOD", async () => { })
                it("NDNOutputRequestCommon 验证NDN 跨Zone OOD1 -> OOD2", async () => { })
            })
        })
        describe("control_task 接口（start/stop/delete 实际调用的都是control_task）", function () {
            it("control_task 接口-传入必填参数", async () => {

            })
            it("control_task 接口-传入所有参数", async () => {

            })
            it("control_task 接口-task_id 不存在", async () => {

            })
            describe("control_task 接口-NDNOutputRequestCommon 参数验证", async () => {
                it("NDNOutputRequestCommon 验证本地NDC", async () => { })
                it("NDNOutputRequestCommon 验证NDN 同Zone device1 -> OOD", async () => { })
                it("NDNOutputRequestCommon 验证NDN 跨Zone OOD1 -> OOD2", async () => { })
            })
        })
        describe("get_task_state 接口", function () {
            it("get_task_state 接口-传入必填参数", async () => {

            })
            it("get_task_state 接口-传入所有参数", async () => {

            })
            describe("get_task_state 接口-NDNOutputRequestCommon 参数验证", async () => {
                it("NDNOutputRequestCommon 验证本地NDC", async () => { })
                it("NDNOutputRequestCommon 验证NDN 同Zone device1 -> OOD", async () => { })
                it("NDNOutputRequestCommon 验证NDN 跨Zone OOD1 -> OOD2", async () => { })
            })
        })
        describe("query_tasks 接口", function () {
            it("query_tasks 接口-传入必填参数", async () => {

            })
            it("query_tasks 接口-传入所有参数", async () => {

            })
            describe("query_tasks 接口-通过range分页查询", async () => {

            })
            describe("query_tasks 接口-通过task_status查询指定状态", async () => {

            })
            describe("query_tasks 接口-NDNOutputRequestCommon 参数验证", async () => {
                it("NDNOutputRequestCommon 验证本地NDC", async () => { })
                it("NDNOutputRequestCommon 验证NDN 同Zone device1 -> OOD", async () => { })
                it("NDNOutputRequestCommon 验证NDN 跨Zone OOD1 -> OOD2", async () => { })
            })
        })
        describe("get_task_group_state", function () {
            it("get_task_group_state 接口-传入必填参数", async () => {

            })
            it("get_task_group_state 接口-传入所有参数", async () => {

            })
            it("get_task_group_state 接口-group 路径不存在", async () => {

            })
            it("get_task_group_state 接口-设置speed_when 获取两次调用之间的平均速度", async () => {

            })
            describe("get_task_group_state 接口-NDNOutputRequestCommon 参数验证", async () => {
                it("NDNOutputRequestCommon 验证本地NDC", async () => { })
                it("NDNOutputRequestCommon 验证NDN 同Zone device1 -> OOD", async () => { })
                it("NDNOutputRequestCommon 验证NDN 跨Zone OOD1 -> OOD2", async () => { })
            })
        })
        describe("control_task_group", function () {
            it("control_task_group 接口-传入必填参数", async () => {

            })
            it("control_task_group 接口-传入所有参数", async () => {

            })
            it("control_task_group 接口-group 路径不存在", async () => {

            })
            describe("control_task_group 接口-NDNOutputRequestCommon 参数验证", async () => {
                it("NDNOutputRequestCommon 验证本地NDC", async () => { })
                it("NDNOutputRequestCommon 验证NDN 同Zone device1 -> OOD", async () => { })
                it("NDNOutputRequestCommon 验证NDN 跨Zone OOD1 -> OOD2", async () => { })
            })
        })
    })
})