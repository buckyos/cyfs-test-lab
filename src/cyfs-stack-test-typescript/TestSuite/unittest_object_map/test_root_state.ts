import assert = require('assert');
import * as cyfs from "../../cyfs_node/cyfs_node"
import { ZoneSimulator, stringToUint8Array, RandomGenerator, stackInfo } from "../../common";
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
        //ZoneSimulator.stopZoneSimulator();
    })
    describe.only("## SharedCyfsStack.root_state_stub 初始化op-env", async () => {
        // describe("### get_current_root 接口测试", async () => {
        //     it("全部参数正常流程", async () => {
        //         let state = await stack.root_state_stub().get_current_root();
        //         console.info(`${JSON.stringify(state)}`)
        //     })
        // })
        // describe("### get_dec_root 接口测试", async () => {
        //     it("全部参数正常流程", async () => {
        //         let state = await stack.root_state_stub().get_dec_root();
        //         console.info(`${JSON.stringify(state)}`)
        //     })
        // })
        describe("### create_path_op_env root-state的同zone的跨dec操作 需要配合权限 接口测试", async () => {

            it.only("正常流程AccessPermissions-ReadOnly", async () => {
                let target_dec_id = ZoneSimulator.zone1_device2_stack.root_state().get_dec_id();
                console.log("target_dec_id",target_dec_id)

                const stub = new cyfs.GlobalStateStub(stack.root_state(), ZoneSimulator.zone1_device1_stack.local_device_id().object_id,target_dec_id);
                let access: cyfs.RootStateOpEnvAccess = {
                    path: "/",
                    access: cyfs.AccessPermissions.ReadOnly
                }
                let result = await stub.create_path_op_env_with_access(access);
                assert.ok(!result.err)
                let op_env = result.unwrap();
                let key = RandomGenerator.string(10);
                let obj_id1: cyfs.ObjectId
                let obj1 = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()), `A${RandomGenerator.string(10)}`, `A${RandomGenerator.string(10)}`, `${RandomGenerator.string(10)}`)
                obj_id1 = obj1.desc().object_id();

                let path = `/qatest/${RandomGenerator.string(10)}/${obj_id1}`;

                let result1 = await op_env.insert_with_key(path, key, obj_id1)
                console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                assert.ok(result1.err)
  
                let update_result2 = await op_env.update()
                assert.ok(!update_result2.err)
                console.info("update_result2",JSON.stringify(update_result2))

                // 提交object_map 操作事务
                let result3 = await op_env.commit();
                console.info(`####### process1 commit:${JSON.stringify(result3)}`)
                assert.ok(!result3.err)
            })
            it("正常流程AccessPermissions-None,", async () => {
                let target_dec_id = ZoneSimulator.zone1_device2_stack.root_state().get_dec_id();
                console.log("target_dec_id",target_dec_id)

                const stub = new cyfs.GlobalStateStub(stack.root_state(), ZoneSimulator.zone1_device1_stack.local_device_id().object_id,target_dec_id);
                let access: cyfs.RootStateOpEnvAccess = {
                    path: "/",
                    access: cyfs.AccessPermissions.None
                }
                let result = await stub.create_path_op_env_with_access(access);
                assert.ok(!result.err)
                let op_env = result.unwrap();
                let key = RandomGenerator.string(10);
                let obj_id1: cyfs.ObjectId
                let obj1 = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()), `A${RandomGenerator.string(10)}`, `A${RandomGenerator.string(10)}`, `${RandomGenerator.string(10)}`)
                obj_id1 = obj1.desc().object_id();

                let path = `/qatest/${RandomGenerator.string(10)}/${obj_id1}`;

                let result1 = await op_env.insert_with_key(path, key, obj_id1)
                console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                assert.ok(result1.err)
  
                let update_result2 = await op_env.update()
                assert.ok(!update_result2.err)
                console.info("update_result2",JSON.stringify(update_result2))

                // 提交object_map 操作事务
                let result3 = await op_env.commit();
                console.info(`####### process1 commit:${JSON.stringify(result3)}`)
                assert.ok(!result3.err)
            })
            it("正常流程AccessPermissions-CallOnly", async () => {
                let target_dec_id = ZoneSimulator.zone1_device2_stack.root_state().get_dec_id();
                console.log("target_dec_id",target_dec_id)

                const stub = new cyfs.GlobalStateStub(stack.root_state(), ZoneSimulator.zone1_device1_stack.local_device_id().object_id,target_dec_id);
                let access: cyfs.RootStateOpEnvAccess = {
                    path: "/",
                    access: cyfs.AccessPermissions.CallOnly
                }
                let result = await stub.create_path_op_env_with_access(access);
                assert.ok(!result.err)
                let op_env = result.unwrap();
                let key = RandomGenerator.string(10);
                let obj_id1: cyfs.ObjectId
                let obj1 = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()), `A${RandomGenerator.string(10)}`, `A${RandomGenerator.string(10)}`, `${RandomGenerator.string(10)}`)
                obj_id1 = obj1.desc().object_id();

                let pathA = `/qatest/${RandomGenerator.string(10)}`;
                // path
                let pathB = pathA + `/${RandomGenerator.string(10)}`;

                let result1 = await op_env.insert_with_key('/qatest/WxmGQ6hRWN/rQ1ad7fYeA', key, obj_id1)
                console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                assert.ok(!result1.err)
                // 模拟业务处理时间 3s
                await cyfs.sleep(3 * 1000)
                // 提交object_map 操作事务
                let result3 = await op_env.commit();
                console.info(`####### process1 commit:${JSON.stringify(result3)}`)
                assert.ok(!result3.err)
            })
            it("正常流程AccessPermissions-WriteOnly", async () => {
                let target_dec_id = ZoneSimulator.zone1_device2_stack.root_state().get_dec_id();
                console.log("target_dec_id",target_dec_id)

                const stub = new cyfs.GlobalStateStub(stack.root_state(), ZoneSimulator.zone1_device1_stack.local_device_id().object_id,target_dec_id);
                let access: cyfs.RootStateOpEnvAccess = {
                    path: "/",
                    access: cyfs.AccessPermissions.WriteOnly
                }
                let result = await stub.create_path_op_env_with_access(access);
                assert.ok(!result.err)
                let op_env = result.unwrap();
                let key = RandomGenerator.string(10);
                let obj_id1: cyfs.ObjectId
                let obj1 = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()), `A${RandomGenerator.string(10)}`, `A${RandomGenerator.string(10)}`, `${RandomGenerator.string(10)}`)
                obj_id1 = obj1.desc().object_id();

                let pathA = `/qatest/${RandomGenerator.string(10)}`;
                // path
                let pathB = pathA + `/${RandomGenerator.string(10)}`;

                let result1 = await op_env.insert_with_key('/qatest/WxmGQ6hRWN/rQ1ad7fYeA', key, obj_id1)
                console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                assert.ok(!result1.err)
                // 模拟业务处理时间 3s
                await cyfs.sleep(3 * 1000)
                // 提交object_map 操作事务
                let result3 = await op_env.commit();
                console.info(`####### process1 commit:${JSON.stringify(result3)}`)
                assert.ok(!result3.err)
            })
            it("正常流程AccessPermissions-WirteAndCall", async () => {
                let target_dec_id = ZoneSimulator.zone1_device2_stack.root_state().get_dec_id();
                console.log("target_dec_id",target_dec_id)

                const stub = new cyfs.GlobalStateStub(stack.root_state(), ZoneSimulator.zone1_device1_stack.local_device_id().object_id,target_dec_id);
                let access: cyfs.RootStateOpEnvAccess = {
                    path: "/",
                    access: cyfs.AccessPermissions.WirteAndCall
                }
                let result = await stub.create_path_op_env_with_access(access);
                assert.ok(!result.err)
                let op_env = result.unwrap();
                let key = RandomGenerator.string(10);
                let obj_id1: cyfs.ObjectId
                let obj1 = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()), `A${RandomGenerator.string(10)}`, `A${RandomGenerator.string(10)}`, `${RandomGenerator.string(10)}`)
                obj_id1 = obj1.desc().object_id();

                let pathA = `/qatest/${RandomGenerator.string(10)}`;
                // path
                let pathB = pathA + `/${RandomGenerator.string(10)}`;

                let result1 = await op_env.insert_with_key('/qatest/WxmGQ6hRWN/rQ1ad7fYeA', key, obj_id1)
                console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                assert.ok(!result1.err)
                // 模拟业务处理时间 3s
                await cyfs.sleep(3 * 1000)
                // 提交object_map 操作事务
                let result3 = await op_env.commit();
                console.info(`####### process1 commit:${JSON.stringify(result3)}`)
                assert.ok(!result3.err)

            })
            it("正常流程AccessPermissions-ReadAndCall", async () => {
                let target_dec_id = ZoneSimulator.zone1_device2_stack.root_state().get_dec_id();
                console.log("target_dec_id",target_dec_id)

                const stub = new cyfs.GlobalStateStub(stack.root_state(), ZoneSimulator.zone1_device1_stack.local_device_id().object_id,target_dec_id);
                let access: cyfs.RootStateOpEnvAccess = {
                    path: "/",
                    access: cyfs.AccessPermissions.ReadAndCall
                }
                let result = await stub.create_path_op_env_with_access(access);
                assert.ok(!result.err)
                let op_env = result.unwrap();
                let key = RandomGenerator.string(10);
                let obj_id1: cyfs.ObjectId
                let obj1 = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()), `A${RandomGenerator.string(10)}`, `A${RandomGenerator.string(10)}`, `${RandomGenerator.string(10)}`)
                obj_id1 = obj1.desc().object_id();

                let pathA = `/qatest/${RandomGenerator.string(10)}`;
                // path
                let pathB = pathA + `/${RandomGenerator.string(10)}`;

                let result1 = await op_env.insert_with_key('/qatest/WxmGQ6hRWN/rQ1ad7fYeA', key, obj_id1)
                console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                assert.ok(!result1.err)
                // 模拟业务处理时间 3s
                await cyfs.sleep(3 * 1000)
                // 提交object_map 操作事务
                let result3 = await op_env.commit();
                console.info(`####### process1 commit:${JSON.stringify(result3)}`)
                assert.ok(!result3.err)
            })
            it("正常流程AccessPermissions-ReadAndWrite", async () => {
                let target_dec_id = ZoneSimulator.zone1_device2_stack.root_state().get_dec_id();
                console.log("target_dec_id",target_dec_id)

                const stub = new cyfs.GlobalStateStub(stack.root_state(), ZoneSimulator.zone1_device1_stack.local_device_id().object_id,target_dec_id);
                let access: cyfs.RootStateOpEnvAccess = {
                    path: "/",
                    access: cyfs.AccessPermissions.ReadAndWrite
                }
                let result = await stub.create_path_op_env_with_access(access);
                assert.ok(!result.err)
                let op_env = result.unwrap();
                let key = RandomGenerator.string(10);
                let obj_id1: cyfs.ObjectId
                let obj1 = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()), `A${RandomGenerator.string(10)}`, `A${RandomGenerator.string(10)}`, `${RandomGenerator.string(10)}`)
                obj_id1 = obj1.desc().object_id();

                let pathA = `/qatest/${RandomGenerator.string(10)}`;
                // path
                let pathB = pathA + `/${RandomGenerator.string(10)}`;

                let result1 = await op_env.insert_with_key('/qatest/WxmGQ6hRWN/rQ1ad7fYeA', key, obj_id1)
                console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                assert.ok(!result1.err)
                // 模拟业务处理时间 3s
                await cyfs.sleep(3 * 1000)
                // 提交object_map 操作事务
                let result3 = await op_env.commit();
                console.info(`####### process1 commit:${JSON.stringify(result3)}`)
                assert.ok(!result3.err)
            })
            it("正常流程AccessPermissions-Full", async () => {
                let target_dec_id = ZoneSimulator.zone1_device2_stack.root_state().get_dec_id();
                console.log("target_dec_id",target_dec_id)

                const stub = new cyfs.GlobalStateStub(stack.root_state(), ZoneSimulator.zone1_device1_stack.local_device_id().object_id,target_dec_id);
                let access: cyfs.RootStateOpEnvAccess = {
                    path: "/",
                    access: cyfs.AccessPermissions.Full
                }
                let result = await stub.create_path_op_env_with_access(access);
                assert.ok(!result.err)
                let op_env = result.unwrap();
                let key = RandomGenerator.string(10);
                let obj_id1: cyfs.ObjectId
                let obj1 = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()), `A${RandomGenerator.string(10)}`, `A${RandomGenerator.string(10)}`, `${RandomGenerator.string(10)}`)
                obj_id1 = obj1.desc().object_id();

                let pathA = `/qatest/${RandomGenerator.string(10)}`;
                // path
                let pathB = pathA + `/${RandomGenerator.string(10)}`;

                let result1 = await op_env.insert_with_key('/qatest/WxmGQ6hRWN/rQ1ad7fYeA', key, obj_id1)
                console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                assert.ok(!result1.err)
                // 模拟业务处理时间 3s
                await cyfs.sleep(3 * 1000)
                // 提交object_map 操作事务
                let result3 = await op_env.commit();
                console.info(`####### process1 commit:${JSON.stringify(result3)}`)
                assert.ok(!result3.err)
            })
            it("正常流程path-target为空", async () => {
                //let dec_id = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT2ze").unwrap();
                //const target_dec_id = dec_id || cyfs.get_system_dec_app().object_id

                let target_dec_id = ZoneSimulator.zone1_device2_stack.root_state().get_dec_id();
                console.log("target_dec_id",target_dec_id)

                const stub = new cyfs.GlobalStateStub(stack.root_state(), ZoneSimulator.zone1_device1_stack.local_device_id().object_id,undefined);
                let access: cyfs.RootStateOpEnvAccess = {
                    path: "/",
                    access: cyfs.AccessPermissions.Full
                }
                let result = await stub.create_path_op_env_with_access(access);
                assert.ok(!result.err)
                let op_env = result.unwrap();
                let key = RandomGenerator.string(10);
                let obj_id1: cyfs.ObjectId
                let obj1 = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()), `A${RandomGenerator.string(10)}`, `A${RandomGenerator.string(10)}`, `${RandomGenerator.string(10)}`)
                obj_id1 = obj1.desc().object_id();

                let pathA = `/qatest/${RandomGenerator.string(10)}`;
                // path
                let pathB = pathA + `/${RandomGenerator.string(10)}`;

                let result1 = await op_env.insert_with_key('/qatest/WxmGQ6hRWN/rQ1ad7fYeA', key, obj_id1)
                console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                assert.ok(!result1.err)
                // 模拟业务处理时间 3s
                await cyfs.sleep(3 * 1000)
                // 提交object_map 操作事务
                let result3 = await op_env.commit();
                console.info(`####### process1 commit:${JSON.stringify(result3)}`)
                assert.ok(!result3.err)
            })
            it("正常流程path-target不为空", async () => {
                let target_dec_id = ZoneSimulator.zone1_device2_stack.root_state().get_dec_id();
                console.log("target_dec_id",target_dec_id)

                const stub = new cyfs.GlobalStateStub(stack.root_state(), ZoneSimulator.zone1_device1_stack.local_device_id().object_id,target_dec_id);
                let access: cyfs.RootStateOpEnvAccess = {
                    path: "/",
                    access: cyfs.AccessPermissions.Full
                }
                let result = await stub.create_path_op_env_with_access(access);
                assert.ok(!result.err)
                let op_env = result.unwrap();
                let key = RandomGenerator.string(10);
                let obj_id1: cyfs.ObjectId
                let obj1 = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()), `A${RandomGenerator.string(10)}`, `A${RandomGenerator.string(10)}`, `${RandomGenerator.string(10)}`)
                obj_id1 = obj1.desc().object_id();

                let pathA = `/qatest/${RandomGenerator.string(10)}`;
                // path
                let pathB = pathA + `/${RandomGenerator.string(10)}`;

                let result1 = await op_env.insert_with_key('/qatest/WxmGQ6hRWN/rQ1ad7fYeA', key, obj_id1)
                console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                assert.ok(!result1.err)
                // 模拟业务处理时间 3s
                await cyfs.sleep(3 * 1000)
                // 提交object_map 操作事务
                let result3 = await op_env.commit();
                console.info(`####### process1 commit:${JSON.stringify(result3)}`)
                assert.ok(!result3.err)
            })
        })

        describe("### create_single_op_env root-state的同zone的跨dec操作 需要配合权限接口测试", async () => {
 
            it("正常流程path-target为空", async () => {
                //let dec_id = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT2ze").unwrap();
                //const target_dec_id = dec_id || cyfs.get_system_dec_app().object_id

                let target_dec_id = ZoneSimulator.zone1_device2_stack.root_state().get_dec_id();
                console.log("target_dec_id",target_dec_id)

                const stub = new cyfs.GlobalStateStub(stack.root_state(), ZoneSimulator.zone1_device1_stack.local_device_id().object_id,undefined);
                let access: cyfs.RootStateOpEnvAccess = {
                    path: "/",
                    access: cyfs.AccessPermissions.Full
                }
                let result = await stub.create_single_op_env_with_access(access);
                assert.ok(!result.err)
                let single_op_env = result.unwrap();
                single_op_env.create_new(cyfs.ObjectMapSimpleContentType.Map)
                let key = RandomGenerator.string(10);
                let obj_id1: cyfs.ObjectId
                let obj1 = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()), `A${RandomGenerator.string(10)}`, `A${RandomGenerator.string(10)}`, `${RandomGenerator.string(10)}`)
                obj_id1 = obj1.desc().object_id();

                let pathA = `/qatest/${RandomGenerator.string(10)}`;
                // path
                let pathB = pathA + `/${RandomGenerator.string(10)}`;

                let result1 = await single_op_env.insert_with_key('/qatest/WxmGQ6hRWN/rQ1ad7fYeA', obj_id1)
                console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                assert.ok(!result1.err)
                // 模拟业务处理时间 3s
                await cyfs.sleep(3 * 1000)
                // 提交object_map 操作事务
                let result3 = await single_op_env.commit();
                console.info(`####### process1 commit:${JSON.stringify(result3)}`)
                assert.ok(!result3.err)
            })
            it("正常流程path-target不为空", async () => {
                let target_dec_id = ZoneSimulator.zone1_device2_stack.root_state().get_dec_id();
                console.log("target_dec_id",target_dec_id)

                const stub = new cyfs.GlobalStateStub(stack.root_state(), ZoneSimulator.zone1_device1_stack.local_device_id().object_id,target_dec_id);
                let access: cyfs.RootStateOpEnvAccess = {
                    path: "/",
                    access: cyfs.AccessPermissions.Full
                }
                let result = await stub.create_single_op_env_with_access(access);
                assert.ok(!result.err)
                let single_op_env = result.unwrap();
                single_op_env.create_new(cyfs.ObjectMapSimpleContentType.Map)
                let key = RandomGenerator.string(10);
                let obj_id1: cyfs.ObjectId
                let obj1 = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()), `A${RandomGenerator.string(10)}`, `A${RandomGenerator.string(10)}`, `${RandomGenerator.string(10)}`)
                obj_id1 = obj1.desc().object_id();

                let pathA = `/qatest/${RandomGenerator.string(10)}`;
                // path
                let pathB = pathA + `/${RandomGenerator.string(10)}`;

                let result1 = await single_op_env.insert_with_key('/qatest/WxmGQ6hRWN/rQ1ad7fYeA', obj_id1)
                console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                assert.ok(!result1.err)
                // 模拟业务处理时间 3s
                await cyfs.sleep(3 * 1000)
                // 提交object_map 操作事务
                let result3 = await single_op_env.commit();
                console.info(`####### process1 commit:${JSON.stringify(result3)}`)
                assert.ok(!result3.err)
            })
            it("正常流程AccessPermissions-ReadOnly", async () => {
                let target_dec_id = ZoneSimulator.zone1_device2_stack.root_state().get_dec_id();
                console.log("target_dec_id",target_dec_id)

                const stub = new cyfs.GlobalStateStub(stack.root_state(), ZoneSimulator.zone1_device1_stack.local_device_id().object_id,target_dec_id);
                let access: cyfs.RootStateOpEnvAccess = {
                    path: "/",
                    access: cyfs.AccessPermissions.ReadOnly 
                }
                let result = await stub.create_single_op_env_with_access(access);

                assert.ok(!result.err)
                let single_op_env = result.unwrap();
                single_op_env.create_new(cyfs.ObjectMapSimpleContentType.Map)
                let key = RandomGenerator.string(10);
                let obj_id1: cyfs.ObjectId
                let obj1 = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()), `A${RandomGenerator.string(10)}`, `A${RandomGenerator.string(10)}`, `${RandomGenerator.string(10)}`)
                obj_id1 = obj1.desc().object_id();

                let pathA = `/qatest/${RandomGenerator.string(10)}`;
                // path
                let pathB = pathA + `/${RandomGenerator.string(10)}`;

                let result1 = await single_op_env.insert_with_key('/qatest/WxmGQ6hRWN/rQ1ad7fYeA',obj_id1)
                console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                assert.ok(!result1.err)
                // 模拟业务处理时间 3s
                await cyfs.sleep(3 * 1000)
                // 提交object_map 操作事务
                let result3 = await single_op_env.commit();
                console.info(`####### process1 commit:${JSON.stringify(result3)}`)
                assert.ok(!result3.err)
            })
            it("正常流程AccessPermissions-None,", async () => {
                let target_dec_id = ZoneSimulator.zone1_device2_stack.root_state().get_dec_id();
                console.log("target_dec_id",target_dec_id)

                const stub = new cyfs.GlobalStateStub(stack.root_state(), ZoneSimulator.zone1_device1_stack.local_device_id().object_id,target_dec_id);
                let access: cyfs.RootStateOpEnvAccess = {
                    path: "/",
                    access: cyfs.AccessPermissions.None
                }
                let result = await stub.create_single_op_env_with_access(access);
                assert.ok(!result.err)
                let single_op_env = result.unwrap();
                single_op_env.create_new(cyfs.ObjectMapSimpleContentType.Map)
                let key = RandomGenerator.string(10);
                let obj_id1: cyfs.ObjectId
                let obj1 = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()), `A${RandomGenerator.string(10)}`, `A${RandomGenerator.string(10)}`, `${RandomGenerator.string(10)}`)
                obj_id1 = obj1.desc().object_id();

                let pathA = `/qatest/${RandomGenerator.string(10)}`;
                // path
                let pathB = pathA + `/${RandomGenerator.string(10)}`;

                let result1 = await single_op_env.insert_with_key('/qatest/WxmGQ6hRWN/rQ1ad7fYeA',obj_id1)
                console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                assert.ok(!result1.err)
                // 模拟业务处理时间 3s
                await cyfs.sleep(3 * 1000)
                // 提交object_map 操作事务
                let result3 = await single_op_env.commit();
                console.info(`####### process1 commit:${JSON.stringify(result3)}`)
                assert.ok(!result3.err)
            })
            it("正常流程AccessPermissions-CallOnly", async () => {
                let target_dec_id = ZoneSimulator.zone1_device2_stack.root_state().get_dec_id();
                console.log("target_dec_id",target_dec_id)

                const stub = new cyfs.GlobalStateStub(stack.root_state(), ZoneSimulator.zone1_device1_stack.local_device_id().object_id,target_dec_id);
                let access: cyfs.RootStateOpEnvAccess = {
                    path: "/",
                    access: cyfs.AccessPermissions.CallOnly
                }
                let result = await stub.create_single_op_env_with_access(access);
                assert.ok(!result.err)
                let single_op_env= result.unwrap();
                single_op_env.create_new(cyfs.ObjectMapSimpleContentType.Map)
                let key = RandomGenerator.string(10);
                let obj_id1: cyfs.ObjectId
                let obj1 = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()), `A${RandomGenerator.string(10)}`, `A${RandomGenerator.string(10)}`, `${RandomGenerator.string(10)}`)
                obj_id1 = obj1.desc().object_id();

                let pathA = `/qatest/${RandomGenerator.string(10)}`;
                // path
                let pathB = pathA + `/${RandomGenerator.string(10)}`;

                let result1 = await single_op_env.insert_with_key('/qatest/WxmGQ6hRWN/rQ1ad7fYeA',obj_id1)
                console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                assert.ok(!result1.err)
                // 模拟业务处理时间 3s
                await cyfs.sleep(3 * 1000)
                // 提交object_map 操作事务
                let result3 = await single_op_env.commit();
                console.info(`####### process1 commit:${JSON.stringify(result3)}`)
                assert.ok(!result3.err)
            })
            it("正常流程AccessPermissions-WriteOnly", async () => {
                let target_dec_id = ZoneSimulator.zone1_device2_stack.root_state().get_dec_id();
                console.log("target_dec_id",target_dec_id)

                const stub = new cyfs.GlobalStateStub(stack.root_state(), ZoneSimulator.zone1_device1_stack.local_device_id().object_id,target_dec_id);
                let access: cyfs.RootStateOpEnvAccess = {
                    path: "/",
                    access: cyfs.AccessPermissions.WriteOnly
                }
                let result = await stub.create_single_op_env_with_access(access);
                
                assert.ok(!result.err)
                let single_op_env = result.unwrap();
                single_op_env.create_new(cyfs.ObjectMapSimpleContentType.Map)
                let key = RandomGenerator.string(10);
                let obj_id1: cyfs.ObjectId
                let obj1 = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()), `A${RandomGenerator.string(10)}`, `A${RandomGenerator.string(10)}`, `${RandomGenerator.string(10)}`)
                obj_id1 = obj1.desc().object_id();

                let pathA = `/qatest/${RandomGenerator.string(10)}`;
                // path
                let pathB = pathA + `/${RandomGenerator.string(10)}`;

                let result1 = await single_op_env.insert_with_key('/qatest/WxmGQ6hRWN/rQ1ad7fYeA',obj_id1)
                console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                assert.ok(!result1.err)
                // 模拟业务处理时间 3s
                await cyfs.sleep(3 * 1000)
                // 提交object_map 操作事务
                let result3 = await single_op_env.commit();
                console.info(`####### process1 commit:${JSON.stringify(result3)}`)
                assert.ok(!result3.err)
            })
            it("正常流程AccessPermissions-WirteAndCall", async () => {
                let target_dec_id = ZoneSimulator.zone1_device2_stack.root_state().get_dec_id();
                console.log("target_dec_id",target_dec_id)

                const stub = new cyfs.GlobalStateStub(stack.root_state(), ZoneSimulator.zone1_device1_stack.local_device_id().object_id,target_dec_id);
                let access: cyfs.RootStateOpEnvAccess = {
                    path: "/",
                    access: cyfs.AccessPermissions.WirteAndCall
                }
                let result = await stub.create_single_op_env_with_access(access);
                assert.ok(!result.err)
                let single_op_env = result.unwrap();
                single_op_env.create_new(cyfs.ObjectMapSimpleContentType.Map)
                let key = RandomGenerator.string(10);
                let obj_id1: cyfs.ObjectId
                let obj1 = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()), `A${RandomGenerator.string(10)}`, `A${RandomGenerator.string(10)}`, `${RandomGenerator.string(10)}`)
                obj_id1 = obj1.desc().object_id();

                let pathA = `/qatest/${RandomGenerator.string(10)}`;
                // path
                let pathB = pathA + `/${RandomGenerator.string(10)}`;

                let result1 = await single_op_env.insert_with_key('/qatest/WxmGQ6hRWN/rQ1ad7fYeA', obj_id1)
                console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                assert.ok(!result1.err)
                // 模拟业务处理时间 3s
                await cyfs.sleep(3 * 1000)
                // 提交object_map 操作事务
                let result3 = await single_op_env.commit();
                console.info(`####### process1 commit:${JSON.stringify(result3)}`)
                assert.ok(!result3.err)

            })
            it("正常流程AccessPermissions-ReadAndCall", async () => {
                let target_dec_id = ZoneSimulator.zone1_device2_stack.root_state().get_dec_id();
                console.log("target_dec_id",target_dec_id)

                const stub = new cyfs.GlobalStateStub(stack.root_state(), ZoneSimulator.zone1_device1_stack.local_device_id().object_id,target_dec_id);
                let access: cyfs.RootStateOpEnvAccess = {
                    path: "/",
                    access: cyfs.AccessPermissions.ReadAndCall
                }
                let result = await stub.create_single_op_env_with_access(access);
                assert.ok(!result.err)
                let single_op_env = result.unwrap();
                single_op_env.create_new(cyfs.ObjectMapSimpleContentType.Map)
                let key = RandomGenerator.string(10);
                let obj_id1: cyfs.ObjectId
                let obj1 = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()), `A${RandomGenerator.string(10)}`, `A${RandomGenerator.string(10)}`, `${RandomGenerator.string(10)}`)
                obj_id1 = obj1.desc().object_id();

                let pathA = `/qatest/${RandomGenerator.string(10)}`;
                // path
                let pathB = pathA + `/${RandomGenerator.string(10)}`;

                let result1 = await single_op_env.insert_with_key('/qatest/WxmGQ6hRWN/rQ1ad7fYeA',obj_id1)
                console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                assert.ok(!result1.err)
                // 模拟业务处理时间 3s
                await cyfs.sleep(3 * 1000)
                // 提交object_map 操作事务
                let result3 = await single_op_env.commit();
                console.info(`####### process1 commit:${JSON.stringify(result3)}`)
                assert.ok(!result3.err)
            })
            it("正常流程AccessPermissions-ReadAndWrite", async () => {
                let target_dec_id = ZoneSimulator.zone1_device2_stack.root_state().get_dec_id();
                console.log("target_dec_id",target_dec_id)

                const stub = new cyfs.GlobalStateStub(stack.root_state(), ZoneSimulator.zone1_device1_stack.local_device_id().object_id,target_dec_id);
                let access: cyfs.RootStateOpEnvAccess = {
                    path: "/",
                    access: cyfs.AccessPermissions.ReadAndWrite
                }
                let result = await stub.create_single_op_env_with_access(access);
                assert.ok(!result.err)
                let single_op_env = result.unwrap();
                single_op_env.create_new(cyfs.ObjectMapSimpleContentType.Map)
                let key = RandomGenerator.string(10);
                let obj_id1: cyfs.ObjectId
                let obj1 = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()), `A${RandomGenerator.string(10)}`, `A${RandomGenerator.string(10)}`, `${RandomGenerator.string(10)}`)
                obj_id1 = obj1.desc().object_id();

                let pathA = `/qatest/${RandomGenerator.string(10)}`;
                // path
                let pathB = pathA + `/${RandomGenerator.string(10)}`;

                let result1 = await single_op_env.insert_with_key('/qatest/WxmGQ6hRWN/rQ1ad7fYeA',obj_id1)
                console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                assert.ok(!result1.err)
                // 模拟业务处理时间 3s
                await cyfs.sleep(3 * 1000)
                // 提交object_map 操作事务
                let result3 = await single_op_env.commit();
                console.info(`####### process1 commit:${JSON.stringify(result3)}`)
                assert.ok(!result3.err)
            })
            it("正常流程AccessPermissions-Full", async () => {
                let target_dec_id = ZoneSimulator.zone1_device2_stack.root_state().get_dec_id();
                console.log("target_dec_id",target_dec_id)

                const stub = new cyfs.GlobalStateStub(stack.root_state(), ZoneSimulator.zone1_device1_stack.local_device_id().object_id,target_dec_id);
                let access: cyfs.RootStateOpEnvAccess = {
                    path: "/",
                    access: cyfs.AccessPermissions.Full
                }
                let result = await stub.create_single_op_env_with_access(access);
                assert.ok(!result.err)
                let single_op_env= result.unwrap();
                single_op_env.create_new(cyfs.ObjectMapSimpleContentType.Map)
                let key = RandomGenerator.string(10);
                let obj_id1: cyfs.ObjectId
                let obj1 = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()), `A${RandomGenerator.string(10)}`, `A${RandomGenerator.string(10)}`, `${RandomGenerator.string(10)}`)
                obj_id1 = obj1.desc().object_id();

                let pathA = `/qatest/${RandomGenerator.string(10)}`;
                // path
                let pathB = pathA + `/${RandomGenerator.string(10)}`;

                let result1 = await single_op_env.insert_with_key('/qatest/WxmGQ6hRWN/rQ1ad7fYeA',obj_id1)
                console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                assert.ok(!result1.err)
                // 模拟业务处理时间 3s
                await cyfs.sleep(3 * 1000)
                // 提交object_map 操作事务
                let result3 = await single_op_env.commit();
                console.info(`####### process1 commit:${JSON.stringify(result3)}`)
                assert.ok(!result3.err)
            })
        })
    })
})
