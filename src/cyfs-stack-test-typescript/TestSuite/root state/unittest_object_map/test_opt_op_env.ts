import assert  from 'assert'; 
import * as cyfs from '../../../cyfs_node';
import { ZoneSimulator, stringToUint8Array, RandomGenerator, stackInfo } from "../../../common";
import * as path from 'path';
import { before } from 'mocha';
//初始化日志
cyfs.clog.enable_file_log({
    name: "unittest_object_map",
    dir: cyfs.get_app_log_dir("unittest_object_map"),
    file_max_size: 1024 * 1024 * 10,
    file_max_count: 10,
});

let stack: cyfs.SharedCyfsStack;

describe("#op-env 初始化方式", function () {
    this.timeout(0);
    this.beforeAll(async function () {
        //测试前置条件，连接测试模拟器设备
        console.info(`##########用例执开始执行`);
        await ZoneSimulator.init();
        stack = ZoneSimulator.zone1_device1_stack!;;
    })
    this.afterAll(async () => {
        //每个函数执行前，清除所有handler
        console.info(`#########用例执行完成`);
        ZoneSimulator.stopZoneSimulator();
    })
    describe("## SharedCyfsStack.root_state() 初始化op-env", async () => {
        describe("### get_category 接口测试", async () => {
            it("全部参数正常流程", async () => {
                let result = await stack.root_state().get_category();
                console.info(JSON.stringify(result))
            })
        })
        describe("### get_base_requestor 接口测试", async () => {
            it("全部参数正常流程", async () => {
                let result = await stack.root_state().get_base_requestor();
                console.info(JSON.stringify(result))
            })
        })
        describe("### get_dec_id 接口测试", async () => {
            it("全部参数正常流程", async () => {
                let result = await stack.root_state().get_dec_id();
                console.info(JSON.stringify(result))
                assert.ok(ZoneSimulator.APPID == result, "dec_id 校验失败")
            })
        })
        describe("### get_current_root 接口测试", async () => {
            it("全部参数正常流程 RootStateRootType.Dec", async () => {
                let result = await stack.root_state().get_current_root({
                    common: {
                        dec_id: ZoneSimulator.APPID,
                        target: stack.local_device_id().object_id,
                        flags: 1,
                    },
                    root_type: cyfs.RootStateRootType.Dec
                });
                console.info(JSON.stringify(result))
            })
            it("全部参数正常流程 RootStateRootType.Global", async () => {
                let result = await stack.root_state().get_current_root({
                    common: {
                        dec_id: ZoneSimulator.APPID,
                        target: stack.local_device_id().object_id,
                        flags: 1,
                    },
                    root_type: cyfs.RootStateRootType.Global
                });
                console.info(JSON.stringify(result))
            })
        })
        describe("### create_op_env 接口测试", async () => {
            it("全部参数正常流程-path-target为空", async () => {
                let state = await stack.root_state().create_op_env({
                    common: {
                        dec_id: ZoneSimulator.APPID,
                        flags: 1,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Path
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-path-target指定本地", async () => {
                let state = await stack.root_state().create_op_env({
                    common: {
                        dec_id: ZoneSimulator.APPID,
                        flags: 1,
                        target: ZoneSimulator.zone1_device1_stack.local_device_id().object_id
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Path
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-path-target指定其他device", async () => {
                let state = await stack.root_state().create_op_env({
                    common: {
                        dec_id: ZoneSimulator.APPID,
                        flags: 1,
                        target: ZoneSimulator.zone1_device2_stack.local_device_id().object_id
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Path
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-path-target指定主OOD", async () => {
                let state = await stack.root_state().create_op_env({
                    common: {
                        dec_id: ZoneSimulator.APPID,
                        flags: 1,
                        target: ZoneSimulator.zone1_ood_stack.local_device_id().object_id
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Path
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-path-target指定从OOD", async () => {
                let state = await stack.root_state().create_op_env({
                    common: {
                        dec_id: ZoneSimulator.APPID,
                        flags: 1,
                        target: ZoneSimulator.zone1_ood_stack.local_device_id().object_id
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Path
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-single-target为空", async () => {
                let state = await stack.root_state().create_op_env({
                    common: {
                        dec_id: ZoneSimulator.APPID,
                        flags: 1
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Single
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-single-target指定本地", async () => {
                let state = await stack.root_state().create_op_env({
                    common: {
                        dec_id: ZoneSimulator.APPID,
                        flags: 1,
                        target: stack.local_device_id().object_id
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Single
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-single-target指定其他device", async () => {
                let state = await stack.root_state().create_op_env({
                    common: {
                        dec_id: ZoneSimulator.APPID,
                        flags: 1,
                        target: ZoneSimulator.zone1_device2_stack.local_device_id().object_id
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Single
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-single-target指定主OOD", async () => {
                let state = await stack.root_state().create_op_env({
                    common: {
                        dec_id: ZoneSimulator.APPID,
                        flags: 1,
                        target: ZoneSimulator.zone1_ood_stack.local_device_id().object_id
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Single
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-single-target指定从OOD", async () => {
                let state = await stack.root_state().create_op_env({
                    common: {
                        dec_id: ZoneSimulator.APPID,
                        flags: 1,
                        target: ZoneSimulator.zone1_ood_stack.local_device_id().object_id
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Single
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
        })

    })
    describe("## SharedCyfsStack.root_state_stub() 初始化op-env", async () => {

        describe("### get_current_root 接口测试", async () => {
            it("全部参数正常流程", async () => {
                let result = await stack.root_state_stub().get_current_root();
                console.info(JSON.stringify(result))
            })
        })
        describe("### get_dec_root 接口测试", async () => {
            it("全部参数正常流程", async () => {
                let result = await stack.root_state_stub().get_dec_root();
                console.info(JSON.stringify(result))
            })
        })
        describe("### create_path_op_env 接口测试", async () => {
            it("全部参数正常流程-path-target为空", async () => {
                let result = await stack.root_state_stub().create_path_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
            it("全部参数正常流程-path-target指定本地", async () => {
                let result = await stack.root_state_stub(stack.local_device_id().object_id).create_path_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
            it("全部参数正常流程-path-target指定其他device", async () => {
                let result = await stack.root_state_stub(ZoneSimulator.zone1_device2_stack.local_device_id().object_id).create_path_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
            it("全部参数正常流程-path-target指定主OOD", async () => {
                let result = await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
            it("全部参数正常流程-path-target指定从OOD", async () => {
                let result = await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
        })
        describe("### create_single_op_env 接口测试", async () => {
            it("全部参数正常流程-single-target为空", async () => {
                let result = await stack.root_state_stub().create_single_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
            it("全部参数正常流程-single-target指定本地", async () => {
                let result = await stack.root_state_stub(stack.local_device_id().object_id).create_single_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
            it("全部参数正常流程-single-target指定其他device", async () => {
                let result = await stack.root_state_stub(ZoneSimulator.zone1_device2_stack.local_device_id().object_id).create_single_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
            it("全部参数正常流程-single-target指定主OOD", async () => {
                let result = await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_single_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
            it("全部参数正常流程-single-target指定从OOD", async () => {
                let result = await stack.root_state_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_single_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
        })

    })
    describe("## SharedCyfsStack.local_cache() 初始化op-env", async () => {
        describe("### get_category 接口测试", async () => {
            it("全部参数正常流程", async () => {
                let result = await stack.local_cache().get_category();
                console.info(JSON.stringify(result))
            })
        })
        describe("### get_base_requestor 接口测试", async () => {
            it("全部参数正常流程", async () => {
                let result = await stack.local_cache().get_base_requestor();
                console.info(JSON.stringify(result))
            })
        })
        describe("### get_dec_id 接口测试", async () => {
            it("全部参数正常流程", async () => {
                let result = await stack.local_cache().get_dec_id();
                console.info(JSON.stringify(result))
                assert.ok(ZoneSimulator.APPID == result, "dec_id 校验失败")
            })
        })
        describe("### get_current_root 接口测试", async () => {
            it("全部参数正常流程", async () => {
                let result = await stack.local_cache().get_current_root({
                    common: {
                        dec_id: ZoneSimulator.APPID,
                        target: stack.local_device_id().object_id,
                        flags: 1,
                    },
                    root_type: cyfs.RootStateRootType.Dec
                });
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
        })
        describe("### create_op_env 接口测试", async () => {
            it("全部参数正常流程-path-target为空", async () => {
                let state = await stack.local_cache().create_op_env({
                    common: {
                        dec_id: ZoneSimulator.APPID,
                        flags: 1,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Path
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-path-target指定本地", async () => {
                let state = await stack.local_cache().create_op_env({
                    common: {
                        dec_id: ZoneSimulator.APPID,
                        flags: 1,
                        target: stack.local_device_id().object_id,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Path
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-path-target指定其他device", async () => {
                let state = await stack.local_cache().create_op_env({
                    common: {
                        dec_id: ZoneSimulator.APPID,
                        flags: 1,
                        target: ZoneSimulator.zone1_device2_stack.local_device_id().object_id,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Path
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-path-target指定主OOD", async () => {
                let state = await stack.local_cache().create_op_env({
                    common: {
                        dec_id: ZoneSimulator.APPID,
                        flags: 1,
                        target: ZoneSimulator.zone1_ood_stack.local_device_id().object_id,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Path
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-path-target指定从OOD", async () => {
                let state = await stack.local_cache().create_op_env({
                    common: {
                        dec_id: ZoneSimulator.APPID,
                        flags: 1,
                        target: ZoneSimulator.zone1_ood_stack.local_device_id().object_id,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Path
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-single-target为空", async () => {
                let state = await stack.local_cache().create_op_env({
                    common: {
                        dec_id: ZoneSimulator.APPID,
                        flags: 1,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Single
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-single-target指定本地", async () => {
                let state = await stack.local_cache().create_op_env({
                    common: {
                        dec_id: ZoneSimulator.APPID,
                        flags: 1,
                        target: ZoneSimulator.zone1_device1_stack.local_device_id().object_id,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Single
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-single-target指定其他device", async () => {
                let state = await stack.local_cache().create_op_env({
                    common: {
                        dec_id: ZoneSimulator.APPID,
                        flags: 1,
                        target: ZoneSimulator.zone1_device2_stack.local_device_id().object_id,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Single
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-single-target指定主OOD", async () => {
                let state = await stack.local_cache().create_op_env({
                    common: {
                        dec_id: ZoneSimulator.APPID,
                        flags: 1,
                        target: ZoneSimulator.zone1_ood_stack.local_device_id().object_id,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Single
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
            it("全部参数正常流程-single-target指定从OOD", async () => {
                let state = await stack.local_cache().create_op_env({
                    common: {
                        dec_id: ZoneSimulator.APPID,
                        flags: 1,
                        target: ZoneSimulator.zone1_ood_stack.local_device_id().object_id,
                    },
                    op_env_type: cyfs.ObjectMapOpEnvType.Single
                });
                console.info(JSON.stringify(state))
                assert.ok(!state.err)
                let env = state.unwrap();
                let sid = env.get_sid();
                console.info(`####### op_env =  ${JSON.stringify(env)}  sid = ${sid}`)
            })
        })

    })
    describe("## SharedCyfsStack.local_cache_stub() 初始化op-env", async () => {
        describe("### get_current_root 接口测试", async () => {
            it("全部参数正常流程", async () => {
                let state = await stack.local_cache_stub().get_current_root();
                console.info(`${JSON.stringify(state)}`)
            })
        })
        describe("### get_dec_root 接口测试", async () => {
            it("全部参数正常流程", async () => {
                let state = await stack.local_cache_stub().get_dec_root();
                console.info(`${JSON.stringify(state)}`)
            })
        })
        describe("### create_path_op_env 接口测试", async () => {
            it("全部参数正常流程-path-target为空", async () => {
                let result = await stack.local_cache_stub().create_path_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
            it("全部参数正常流程-path-target指定本地", async () => {
                let result = await stack.local_cache_stub(ZoneSimulator.zone1_device1_stack.local_device_id().object_id).create_path_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
            it("全部参数正常流程-path-target指定其他device", async () => {
                let result = await stack.local_cache_stub(ZoneSimulator.zone1_device2_stack.local_device_id().object_id).create_path_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
            it("全部参数正常流程-path-target指定主OOD", async () => {
                let result = await stack.local_cache_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
            it("全部参数正常流程-path-target指定从OOD", async () => {
                let result = await stack.local_cache_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_path_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
        })
        describe("### create_single_op_env 接口测试", async () => {
            it("全部参数正常流程-single-target为空", async () => {
                let result = await stack.local_cache_stub().create_single_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
            it("全部参数正常流程-single-target指定本地", async () => {
                let result = await stack.local_cache_stub(ZoneSimulator.zone1_device1_stack.local_device_id().object_id).create_single_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
            it("全部参数正常流程-single-target指定其他device", async () => {
                let result = await stack.local_cache_stub(ZoneSimulator.zone1_device2_stack.local_device_id().object_id).create_single_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
            it("全部参数正常流程-single-target指定主OOD", async () => {
                let result = await stack.local_cache_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_single_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
            it("全部参数正常流程-single-target指定从OOD", async () => {
                let result = await stack.local_cache_stub(ZoneSimulator.zone1_ood_stack.local_device_id().object_id).create_single_op_env();
                console.info(JSON.stringify(result))
                assert.ok(!result.err)
            })
        })

    })
})
