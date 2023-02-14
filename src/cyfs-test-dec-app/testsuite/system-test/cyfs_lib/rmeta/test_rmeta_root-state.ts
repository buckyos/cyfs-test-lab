import assert from "assert";
import * as cyfs from '../../../../cyfs';
import { RandomGenerator } from "../../../../base";

//初始化日志
cyfs.clog.enable_file_log({
    name: "unittest_object_map",
    dir: cyfs.get_app_log_dir("unittest_object_map"),
    file_max_size: 1024 * 1024 * 10,
    file_max_count: 10,
});

let stack: cyfs.SharedCyfsStack;

// TO_FIX : rmeta 连接协议栈需要使用标准连接池
describe("#op-env 初始化方式", function () {
    this.timeout(0);
    this.beforeAll(async function () {
        //测试前置条件,连接测试模拟器设备
        console.info(`##########用例执开始执行`);



        //await ZoneSimulator.init();
        //stack = ZoneSimulator.zone1_device1_stack!;;
    })
    this.afterAll(async () => {
        //每个函数执行前,清除所有handler
        console.info(`#########用例执行完成`);
        //ZoneSimulator.stopZoneSimulator();
    })
    describe.only("## r_meta测试执行", async () => {
        const basDecIdA = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
        const basDecIdB = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
        const basDecIdC = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT7ze").unwrap();
        const basDecIdD = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT8ze").unwrap();
        const basDecIdE = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT9ze").unwrap();
        const basDecIdF = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT1ze").unwrap();
        const sysDecId = cyfs.get_system_dec_app().object_id
        const anyDecId = cyfs.get_anonymous_dec_app().object_id


        describe("## SharedCyfsStack r_meta测试", async () => {
            let connect_stack = async () => {
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001, basDecIdA).unwrap();
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood1 = cyfs.SharedCyfsStack.open(param1);
                await ood1.online()

                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003, basDecIdB).unwrap();
                param11.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device11 = cyfs.SharedCyfsStack.open(param11);
                await device11.online()


                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005, basDecIdC).unwrap();
                param12.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()

                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011, basDecIdD).unwrap();
                param2.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()

                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013, basDecIdE).unwrap();
                param21.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()

                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015, basDecIdE).unwrap();
                param22.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()
                return [ood1, device11, device12, ood2, device21, device22]
            }

            let gen_obj = async () => {
                return cyfs.TextObject.create(
                    cyfs.ObjectId.from_base_58("5bnZHzYHCUJFRxXBAPDw8727uHdS95yhFnBmoNrwm7CP").unwrap(),
                    `A${RandomGenerator.string(10)}`,
                    `A${RandomGenerator.string(10)}`,
                    `A${RandomGenerator.string(10)}`)
            }

            class PostObjectHandlerTest implements cyfs.RouterHandlerPostObjectRoutine {
                async call(param: cyfs.RouterHandlerPostObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerPostObjectResult>> {
                    console.info("recv post request: {}", param.request.object.object_id);
                    const result: cyfs.RouterHandlerPostObjectResult = {
                        action: cyfs.RouterHandlerAction.Response,
                        request: undefined,
                        response: cyfs.Ok(
                            { object: undefined })
                    };
                    return cyfs.Ok(result)
                }
            }
            describe("## create_path_op_env root-state同zone同dec", async () => {
                it("create_path_op_env root-state同zone同dec,access,dec_default()权限组", async () => {

                    let stack_a = (await connect_stack())[1]
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = stack_a.fork_with_new_dec(basDecIdB)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`

                    let stub_a = stack_a.root_state_stub()

                    let stub_b = stack_b.root_state_stub()

                    await stack_a.root_state_meta_stub().clear_access()

                    await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.dec_default()))

                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result2 = await op_env1.update()
                    assert.ok(!update_result2.err)

                    await op_env1.commit()

                    console.info("update_result2", JSON.stringify(update_result2))

                    let op_env2 = (await stub_b.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)


                })
                it("create_path_op_env root-state同zone同dec,access,default()权限组", async () => {
                    let stack_a = (await connect_stack())[1]
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = stack_a.fork_with_new_dec(basDecIdB)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`

                    let stub_a = stack_a.root_state_stub()

                    let stub_b = stack_b.root_state_stub()

                    await stack_a.root_state_meta_stub().clear_access()


                    await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.default()))

                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result2 = await op_env1.update()
                    assert.ok(!update_result2.err)

                    await op_env1.commit()

                    console.info("update_result2", JSON.stringify(update_result2))

                    let op_env2 = (await stub_b.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)





                })
                it("create_path_op_env root-state同zone同dec,access,full()权限组", async () => {
                    let stack_a = (await connect_stack())[1]
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = stack_a.fork_with_new_dec(basDecIdB)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`

                    let stub_a = stack_a.root_state_stub()

                    let stub_b = stack_b.root_state_stub()

                    await stack_a.root_state_meta_stub().clear_access()


                    await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.full()))

                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result2 = await op_env1.update()
                    assert.ok(!update_result2.err)

                    await op_env1.commit()

                    console.info("update_result2", JSON.stringify(update_result2))

                    let op_env2 = (await stub_b.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)


                })
                it("create_path_op_env root-state同zone同dec,access,full_except_write()权限组", async () => {
                    let stack_a = (await connect_stack())[1]
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = stack_a.fork_with_new_dec(basDecIdB)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`

                    let stub_a = stack_a.root_state_stub()

                    let stub_b = stack_b.root_state_stub()

                    await stack_a.root_state_meta_stub().clear_access()


                    await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.full_except_write()))

                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result2 = await op_env1.update()
                    assert.ok(!update_result2.err)

                    await op_env1.commit()

                    console.info("update_result2", JSON.stringify(update_result2))

                    let op_env2 = (await stub_b.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)

                })
                it("create_path_op_env root-state同zone同dec,access,set_group_permission()权限组设定", async () => {
                    let stack_a = (await connect_stack())[1]
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = stack_a.fork_with_new_dec(basDecIdB)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`

                    let stub_a = stack_a.root_state_stub()

                    let stub_b = stack_b.root_state_stub()

                    await stack_a.root_state_meta_stub().clear_access()

                    let acc: cyfs.AccessString = (new cyfs.AccessString(0))

                    acc.set_group_permission(cyfs.AccessGroup.CurrentZone, cyfs.AccessPermission.Write)


                    await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, acc))

                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result2 = await op_env1.update()
                    assert.ok(!update_result2.err)

                    await op_env1.commit()

                    console.info("update_result2", JSON.stringify(update_result2))

                    let op_env2 = (await stub_b.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)

                })
                it("create_path_op_env root-state同zone同dec,access,set_group_permissions()权限组设定", async () => {
                    let stack_a = (await connect_stack())[1]
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = stack_a.fork_with_new_dec(basDecIdB)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`

                    let stub_a = stack_a.root_state_stub()

                    let stub_b = stack_b.root_state_stub()

                    await stack_a.root_state_meta_stub().clear_access()


                    let acc: cyfs.AccessString = (new cyfs.AccessString(0))

                    acc.set_group_permissions(cyfs.AccessGroup.CurrentZone, cyfs.AccessPermissions.Full)

                    await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, acc))

                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result2 = await op_env1.update()
                    assert.ok(!update_result2.err)

                    await op_env1.commit()

                    console.info("update_result2", JSON.stringify(update_result2))

                    let op_env2 = (await stub_b.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)



                })
                it("create_path_op_env root-state同zone同dec,access,make()权限组设定", async () => {
                    let stack_a = (await connect_stack())[1]
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = stack_a.fork_with_new_dec(basDecIdB)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`

                    let stub_a = stack_a.root_state_stub()

                    let stub_b = stack_b.root_state_stub()

                    await stack_a.root_state_meta_stub().clear_access()


                    let acc = cyfs.AccessString.make([{ group: cyfs.AccessGroup.CurrentZone, permissions: cyfs.AccessPermissions.Full }])
                    await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, acc))

                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result2 = await op_env1.update()
                    assert.ok(!update_result2.err)

                    await op_env1.commit()

                    console.info("update_result2", JSON.stringify(update_result2))

                    let op_env2 = (await stub_b.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)


                })
                it("create_path_op_env root-state同zone同dec,access,constructor()权限组初始化", async () => {
                    let stack_a = (await connect_stack())[1]
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = stack_a.fork_with_new_dec(basDecIdB)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`

                    let stub_a = stack_a.root_state_stub()

                    let stub_b = stack_b.root_state_stub()

                    await stack_a.root_state_meta_stub().clear_access()


                    let acc: cyfs.AccessString = (new cyfs.AccessString(0o777))


                    await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, acc))

                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result2 = await op_env1.update()
                    assert.ok(!update_result2.err)

                    await op_env1.commit()

                    console.info("update_result2", JSON.stringify(update_result2))

                    let op_env2 = (await stub_b.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)


                })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## create_path_op_env root-state同zone不同dec", async () => {
                it("create_path_op_env root-state同zone不同dec,access,dec_default()权限组", async () => {
                    let stack_a = (await connect_stack())[0]
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = (await connect_stack())[1]
                    console.info(`stack_b,${stack_b.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`

                    let stub_b_a = stack_b.root_state_stub(undefined, basDecIdA)

                    let stub_a = stack_a.root_state_stub()

                    await stack_a.root_state_meta_stub().clear_access()

                    await stack_b.root_state_meta_stub().clear_access()

                    await stack_b.root_state_meta_stub(undefined, basDecIdA).add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.dec_default()))

                    let g_path = new cyfs.RequestGlobalStatePath(basDecIdB, path1)

                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_b_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result2 = await op_env1.update()
                    assert.ok(!update_result2.err)

                    await op_env1.commit()

                    console.info("update_result2", JSON.stringify(update_result2))

                    let op_env2 = (await stub_a.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)
                })
                it("create_path_op_env root-state同zone不同dec,access,default()权限组", async () => {
                    let stack_a = (await connect_stack())[0]
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = (await connect_stack())[1]
                    console.info(`stack_b,${stack_b.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`

                    let stub_b_a = stack_b.root_state_stub(undefined, basDecIdA)

                    let stub_a = stack_a.root_state_stub()

                    await stack_a.root_state_meta_stub().clear_access()

                    await stack_b.root_state_meta_stub().clear_access()

                    await stack_b.root_state_meta_stub(undefined, basDecIdA).add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.default()))

                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_b_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result2 = await op_env1.update()
                    assert.ok(!update_result2.err)

                    await op_env1.commit()

                    console.info("update_result2", JSON.stringify(update_result2))

                    let op_env2 = (await stub_a.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)
                })
                it("create_path_op_env root-state同zone不同dec,access,full()权限组", async () => {
                    let stack_a = (await connect_stack())[0]
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = (await connect_stack())[1]
                    console.info(`stack_b,${stack_b.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`

                    let stub_b_a = stack_b.root_state_stub(undefined, basDecIdA)

                    let stub_a = stack_a.root_state_stub()

                    await stack_a.root_state_meta_stub().clear_access()

                    await stack_b.root_state_meta_stub().clear_access()

                    await stack_b.root_state_meta_stub(undefined, basDecIdA).add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.full()))


                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_b_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result2 = await op_env1.update()
                    assert.ok(!update_result2.err)

                    await op_env1.commit()

                    console.info("update_result2", JSON.stringify(update_result2))

                    let op_env2 = (await stub_a.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)
                })
                it("create_path_op_env root-state同zone不同dec,access,full_except_write()权限组", async () => {
                    let stack_a = (await connect_stack())[0]
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = (await connect_stack())[1]
                    console.info(`stack_b,${stack_b.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`

                    let stub_b_a = stack_b.root_state_stub(undefined, basDecIdA)

                    let stub_a = stack_a.root_state_stub()

                    await stack_a.root_state_meta_stub().clear_access()

                    await stack_b.root_state_meta_stub().clear_access()

                    await stack_b.root_state_meta_stub(undefined, basDecIdA).add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.full_except_write()))


                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_b_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result2 = await op_env1.update()
                    assert.ok(!update_result2.err)

                    await op_env1.commit()

                    console.info("update_result2", JSON.stringify(update_result2))

                    let op_env2 = (await stub_a.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)
                })
                it("create_path_op_env root-state同zone不同dec,access,set_group_permission()权限组设定", async () => {
                    let stack_a = (await connect_stack())[0]
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = (await connect_stack())[1]
                    console.info(`stack_b,${stack_b.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`

                    let stub_b_a = stack_b.root_state_stub(undefined, basDecIdA)

                    let stub_a = stack_a.root_state_stub()

                    await stack_a.root_state_meta_stub().clear_access()

                    await stack_b.root_state_meta_stub().clear_access()

                    let acc: cyfs.AccessString = (new cyfs.AccessString(0))

                    acc.set_group_permission(cyfs.AccessGroup.CurrentZone, cyfs.AccessPermission.Write)

                    await stack_b.root_state_meta_stub(undefined, basDecIdA).add_access(cyfs.GlobalStatePathAccessItem.new(path1, acc))


                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_b_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result2 = await op_env1.update()
                    assert.ok(!update_result2.err)

                    await op_env1.commit()

                    console.info("update_result2", JSON.stringify(update_result2))

                    let op_env2 = (await stub_a.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)
                })
                it("create_path_op_env root-state同zone不同dec,access,set_group_permissions()权限组设定", async () => {
                    let stack_a = (await connect_stack())[0]
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = (await connect_stack())[1]
                    console.info(`stack_b,${stack_b.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`

                    let stub_b_a = stack_b.root_state_stub(undefined, basDecIdA)

                    let stub_a = stack_a.root_state_stub()

                    await stack_a.root_state_meta_stub().clear_access()

                    await stack_b.root_state_meta_stub().clear_access()


                    let acc: cyfs.AccessString = (new cyfs.AccessString(0))

                    acc.set_group_permissions(cyfs.AccessGroup.CurrentZone, cyfs.AccessPermissions.Full)

                    await stack_b.root_state_meta_stub(undefined, basDecIdA).add_access(cyfs.GlobalStatePathAccessItem.new(path1, acc))


                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_b_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result2 = await op_env1.update()
                    assert.ok(!update_result2.err)

                    await op_env1.commit()

                    console.info("update_result2", JSON.stringify(update_result2))

                    let op_env2 = (await stub_a.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)
                })
                it("create_path_op_env root-state同zone不同dec,access,make()权限组设定", async () => {
                    let stack_a = (await connect_stack())[0]
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = (await connect_stack())[1]
                    console.info(`stack_b,${stack_b.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`

                    let stub_b_a = stack_b.root_state_stub(undefined, basDecIdA)

                    let stub_a = stack_a.root_state_stub()

                    await stack_a.root_state_meta_stub().clear_access()

                    await stack_b.root_state_meta_stub().clear_access()

                    let acc = cyfs.AccessString.make([{ group: cyfs.AccessGroup.CurrentZone, permissions: cyfs.AccessPermissions.Full }])

                    await stack_b.root_state_meta_stub(undefined, basDecIdA).add_access(cyfs.GlobalStatePathAccessItem.new(path1, acc))


                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_b_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result2 = await op_env1.update()
                    assert.ok(!update_result2.err)

                    await op_env1.commit()

                    console.info("update_result2", JSON.stringify(update_result2))

                    let op_env2 = (await stub_a.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)
                })
                it("create_path_op_env root-state同zone不同dec,access,constructor()权限组初始化", async () => {
                    let stack_a = (await connect_stack())[0]
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = (await connect_stack())[1]
                    console.info(`stack_b,${stack_b.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`

                    let stub_b_a = stack_b.root_state_stub(undefined, basDecIdA)

                    let stub_a = stack_a.root_state_stub()

                    await stack_a.root_state_meta_stub().clear_access()

                    await stack_b.root_state_meta_stub().clear_access()

                    let acc: cyfs.AccessString = (new cyfs.AccessString(0o777))

                    await stack_b.root_state_meta_stub(undefined, basDecIdA).add_access(cyfs.GlobalStatePathAccessItem.new(path1, acc))

                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_b_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result2 = await op_env1.update()
                    assert.ok(!update_result2.err)

                    await op_env1.commit()

                    console.info("update_result2", JSON.stringify(update_result2))

                    let op_env2 = (await stub_a.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)
                })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## create_path_op_env root-state跨zone同dec", async () => {
                it("create_path_op_env root-state跨zone同dec,access,dec_default()权限组", async () => {

                    let ood1 = (await connect_stack())[0]
                    console.info(`stack_a,${ood1.dec_id}`)

                    let ood = (await connect_stack())[3]
                    console.info(`stack_b,${ood.dec_id}`)

                    let ood2 = ood.fork_with_new_dec(ood1.dec_id)
                    console.info(`stack_b,${ood2.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = ood2.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    await ood1.root_state_meta_stub().clear_access()
                    await ood2.root_state_meta_stub().clear_access()
                    await ood2.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.dec_default()))

                    let path_handler = new cyfs.RequestGlobalStatePath(ood2.dec_id, path1)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await ood2.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await ood1.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: ood1.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: ood2.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)
                })
                it("create_path_op_env root-state跨zone同dec,access,default()权限组", async () => {

                    let ood1 = (await connect_stack())[0]
                    console.info(`stack_a,${ood1.dec_id}`)

                    let ood = (await connect_stack())[3]
                    console.info(`stack_b,${ood.dec_id}`)

                    let ood2 = ood.fork_with_new_dec(ood1.dec_id)
                    console.info(`stack_b,${ood2.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = ood2.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    await ood1.root_state_meta_stub().clear_access()
                    await ood2.root_state_meta_stub().clear_access()
                    await ood2.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.default()))

                    let path_handler = new cyfs.RequestGlobalStatePath(ood2.dec_id, path1)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await ood2.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await ood1.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: ood1.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: ood2.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)

                })
                it("create_path_op_env root-state跨zone同dec,access,full()权限组", async () => {
                    let ood1 = (await connect_stack())[0]
                    console.info(`stack_a,${ood1.dec_id}`)

                    let ood = (await connect_stack())[3]
                    console.info(`stack_b,${ood.dec_id}`)

                    let ood2 = ood.fork_with_new_dec(ood1.dec_id)
                    console.info(`stack_b,${ood2.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = ood2.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    await ood1.root_state_meta_stub().clear_access()
                    await ood2.root_state_meta_stub().clear_access()
                    await ood2.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.full()))

                    let path_handler = new cyfs.RequestGlobalStatePath(ood2.dec_id, path1)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await ood2.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await ood1.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: ood1.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: ood2.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)


                })
                it("create_path_op_env root-state跨zone同dec,access,full_except_write()权限组", async () => {
                    let ood1 = (await connect_stack())[0]
                    console.info(`stack_a,${ood1.dec_id}`)

                    let ood = (await connect_stack())[3]
                    console.info(`stack_b,${ood.dec_id}`)

                    let ood2 = ood.fork_with_new_dec(ood1.dec_id)
                    console.info(`stack_b,${ood2.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = ood2.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    await ood1.root_state_meta_stub().clear_access()
                    await ood2.root_state_meta_stub().clear_access()
                    await ood2.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.full_except_write()))

                    let path_handler = new cyfs.RequestGlobalStatePath(ood2.dec_id, path1)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await ood2.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await ood1.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: ood1.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: ood2.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)


                })
                it("create_path_op_env root-state跨zone同dec,access,set_group_permission()权限组设定", async () => {
                    let ood1 = (await connect_stack())[0]
                    console.info(`stack_a,${ood1.dec_id}`)

                    let ood = (await connect_stack())[3]
                    console.info(`stack_b,${ood.dec_id}`)

                    let ood2 = ood.fork_with_new_dec(ood1.dec_id)
                    console.info(`stack_b,${ood2.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = ood2.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    await ood1.root_state_meta_stub().clear_access()
                    await ood2.root_state_meta_stub().clear_access()
                    let acc: cyfs.AccessString = (new cyfs.AccessString(0))
                    acc.set_group_permission(cyfs.AccessGroup.CurrentZone, cyfs.AccessPermission.Write)
                    await ood2.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, acc))

                    let path_handler = new cyfs.RequestGlobalStatePath(ood2.dec_id, path1)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await ood2.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await ood1.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: ood1.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: ood2.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)


                })
                it("create_path_op_env root-state跨zone同dec,access,set_group_permissions()权限组设定", async () => {
                    let ood1 = (await connect_stack())[0]
                    console.info(`stack_a,${ood1.dec_id}`)

                    let ood = (await connect_stack())[3]
                    console.info(`stack_b,${ood.dec_id}`)

                    let ood2 = ood.fork_with_new_dec(ood1.dec_id)
                    console.info(`stack_b,${ood2.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = ood2.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    await ood1.root_state_meta_stub().clear_access()
                    await ood2.root_state_meta_stub().clear_access()

                    let acc: cyfs.AccessString = (new cyfs.AccessString(0))
                    acc.set_group_permissions(cyfs.AccessGroup.CurrentZone, cyfs.AccessPermissions.Full)

                    await ood2.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, acc))

                    let path_handler = new cyfs.RequestGlobalStatePath(ood2.dec_id, path1)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await ood2.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await ood1.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: ood1.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: ood2.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)


                })
                it("create_path_op_env root-state跨zone同dec,access,make()权限组设定", async () => {
                    let ood1 = (await connect_stack())[0]
                    console.info(`stack_a,${ood1.dec_id}`)

                    let ood = (await connect_stack())[3]
                    console.info(`stack_b,${ood.dec_id}`)

                    let ood2 = ood.fork_with_new_dec(ood1.dec_id)
                    console.info(`stack_b,${ood2.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = ood2.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    await ood1.root_state_meta_stub().clear_access()
                    await ood2.root_state_meta_stub().clear_access()
                    let acc = cyfs.AccessString.make([{ group: cyfs.AccessGroup.CurrentZone, permissions: cyfs.AccessPermissions.Full }])
                    await ood2.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, acc))

                    let path_handler = new cyfs.RequestGlobalStatePath(ood2.dec_id, path1)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await ood2.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await ood1.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: ood1.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: ood2.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)


                })
                it("create_path_op_env root-state跨zone同dec,access,constructor()权限组初始化", async () => {
                    let ood1 = (await connect_stack())[0]
                    console.info(`stack_a,${ood1.dec_id}`)

                    let ood = (await connect_stack())[3]
                    console.info(`stack_b,${ood.dec_id}`)

                    let ood2 = ood.fork_with_new_dec(ood1.dec_id)
                    console.info(`stack_b,${ood2.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = ood2.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    await ood1.root_state_meta_stub().clear_access()
                    await ood2.root_state_meta_stub().clear_access()
                    let acc: cyfs.AccessString = (new cyfs.AccessString(0o777))
                    await ood2.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, acc))

                    let path_handler = new cyfs.RequestGlobalStatePath(ood2.dec_id, path1)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await ood2.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await ood1.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: ood1.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: ood2.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)


                })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## create_path_op_env root-state跨zone不同dec", async () => {
                it("create_path_op_env root-state跨zone不同dec,access,dec_default()权限组", async () => {

                    let ood1 = (await connect_stack())[0]
                    console.info(`stack_a,${ood1.dec_id}`)

                    let ood2 = (await connect_stack())[3]
                    console.info(`stack_b,${ood2.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = ood2.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    await ood1.root_state_meta_stub().clear_access()
                    await ood2.root_state_meta_stub().clear_access()
                    await ood2.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.dec_default()))

                    let path_handler = new cyfs.RequestGlobalStatePath(ood2.dec_id, path1)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await ood2.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await ood1.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: ood1.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: ood2.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)

                })
                it("create_path_op_env root-state跨zone不同dec,access,default()权限组", async () => {
                    let ood1 = (await connect_stack())[0]
                    console.info(`stack_a,${ood1.dec_id}`)

                    let ood2 = (await connect_stack())[3]
                    console.info(`stack_b,${ood2.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = ood2.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    await ood1.root_state_meta_stub().clear_access()
                    await ood2.root_state_meta_stub().clear_access()
                    await ood2.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.default()))

                    let path_handler = new cyfs.RequestGlobalStatePath(ood2.dec_id, path1)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await ood2.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await ood1.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: ood1.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: ood2.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)

                })
                it("create_path_op_env root-state跨zone不同dec,access,full()权限组", async () => {
                    let ood1 = (await connect_stack())[0]
                    console.info(`stack_a,${ood1.dec_id}`)

                    let ood2 = (await connect_stack())[3]
                    console.info(`stack_b,${ood2.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = ood2.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    await ood1.root_state_meta_stub().clear_access()
                    await ood2.root_state_meta_stub().clear_access()
                    await ood2.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.full()))

                    let path_handler = new cyfs.RequestGlobalStatePath(ood2.dec_id, path1)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await ood2.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await ood1.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: ood1.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: ood2.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)

                })
                it("create_path_op_env root-state跨zone不同dec,access,full_except_write()权限组", async () => {
                    let ood1 = (await connect_stack())[0]
                    console.info(`stack_a,${ood1.dec_id}`)

                    let ood2 = (await connect_stack())[3]
                    console.info(`stack_b,${ood2.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = ood2.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    await ood1.root_state_meta_stub().clear_access()
                    await ood2.root_state_meta_stub().clear_access()
                    await ood2.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.full_except_write()))

                    let path_handler = new cyfs.RequestGlobalStatePath(ood2.dec_id, path1)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await ood2.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await ood1.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: ood1.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: ood2.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)

                })
                it("create_path_op_env root-state跨zone不同decc,access,set_group_permission()权限组设定", async () => {
                    let ood1 = (await connect_stack())[0]
                    console.info(`stack_a,${ood1.dec_id}`)

                    let ood2 = (await connect_stack())[3]
                    console.info(`stack_b,${ood2.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = ood2.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    await ood1.root_state_meta_stub().clear_access()
                    await ood2.root_state_meta_stub().clear_access()
                    let acc: cyfs.AccessString = (new cyfs.AccessString(0))
                    acc.set_group_permission(cyfs.AccessGroup.CurrentZone, cyfs.AccessPermission.Write)
                    await ood2.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, acc))

                    let path_handler = new cyfs.RequestGlobalStatePath(ood2.dec_id, path1)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await ood2.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await ood1.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: ood1.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: ood2.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)


                })
                it("create_path_op_env root-state跨zone不同dec,access,set_group_permissions()权限组设定", async () => {
                    let ood1 = (await connect_stack())[0]
                    console.info(`stack_a,${ood1.dec_id}`)

                    let ood2 = (await connect_stack())[3]
                    console.info(`stack_b,${ood2.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = ood2.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    await ood1.root_state_meta_stub().clear_access()
                    await ood2.root_state_meta_stub().clear_access()
                    let acc: cyfs.AccessString = (new cyfs.AccessString(0))
                    acc.set_group_permissions(cyfs.AccessGroup.CurrentZone, cyfs.AccessPermissions.Full)
                    await ood2.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, acc))

                    let path_handler = new cyfs.RequestGlobalStatePath(ood2.dec_id, path1)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await ood2.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await ood1.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: ood1.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: ood2.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)

                })
                it("create_path_op_env root-state跨zone不同dec,access,make()权限组设定", async () => {
                    let ood1 = (await connect_stack())[0]
                    console.info(`stack_a,${ood1.dec_id}`)

                    let ood2 = (await connect_stack())[3]
                    console.info(`stack_b,${ood2.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = ood2.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    await ood1.root_state_meta_stub().clear_access()
                    await ood2.root_state_meta_stub().clear_access()
                    let acc = cyfs.AccessString.make([{ group: cyfs.AccessGroup.CurrentZone, permissions: cyfs.AccessPermissions.Full }])
                    await ood2.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, acc))

                    let path_handler = new cyfs.RequestGlobalStatePath(ood2.dec_id, path1)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await ood2.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await ood1.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: ood1.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: ood2.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)

                })
                it("create_path_op_env root-state跨zone不同dec,access,constructor()权限组初始化", async () => {
                    let ood1 = (await connect_stack())[0]
                    console.info(`stack_a,${ood1.dec_id}`)

                    let ood2 = (await connect_stack())[3]
                    console.info(`stack_b,${ood2.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = ood2.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    await ood1.root_state_meta_stub().clear_access()
                    await ood2.root_state_meta_stub().clear_access()
                    let acc: cyfs.AccessString = (new cyfs.AccessString(0o777))
                    await ood2.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, acc))

                    let path_handler = new cyfs.RequestGlobalStatePath(ood2.dec_id, path1)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await ood2.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await ood1.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: ood1.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: ood2.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)


                })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## create_path_op_env local_cache同zone同dec", async () => {
                it("create_path_op_env local_cache同zone同dec,access,dec_default()权限组", async () => {
                    let stack_a = (await connect_stack())[1]
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = stack_a.fork_with_new_dec(basDecIdB)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`

                    let stub_a = stack_a.local_cache_stub()

                    let stub_b = stack_b.local_cache_stub()

                    await stack_a.local_cache_meta_stub().clear_access()

                    await stack_a.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.dec_default()))

                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result2 = await op_env1.update()
                    assert.ok(!update_result2.err)

                    await op_env1.commit()

                    console.info("update_result2", JSON.stringify(update_result2))

                    let op_env2 = (await stub_b.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)
                })
                it("create_path_op_env local_cache同zone同dec,access,default()权限组", async () => {
                    let stack_a = (await connect_stack())[1]
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = stack_a.fork_with_new_dec(basDecIdB)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`

                    let stub_a = stack_a.local_cache_stub()

                    let stub_b = stack_b.local_cache_stub()

                    await stack_a.local_cache_meta_stub().clear_access()

                    await stack_a.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.dec_default()))

                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result2 = await op_env1.update()
                    assert.ok(!update_result2.err)

                    await op_env1.commit()

                    console.info("update_result2", JSON.stringify(update_result2))

                    let op_env2 = (await stub_b.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)

                })
                it("create_path_op_env local_cache同zone同dec,access,full()权限组", async () => {
                    let stack_a = (await connect_stack())[1]
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = stack_a.fork_with_new_dec(basDecIdB)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`

                    let stub_a = stack_a.local_cache_stub()

                    let stub_b = stack_b.local_cache_stub()

                    await stack_a.local_cache_meta_stub().clear_access()

                    await stack_a.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.dec_default()))

                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result2 = await op_env1.update()
                    assert.ok(!update_result2.err)

                    await op_env1.commit()

                    console.info("update_result2", JSON.stringify(update_result2))

                    let op_env2 = (await stub_b.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)
                })
                it("create_path_op_env local_cache同zone同dec,access,full_except_write()权限组", async () => {
                    let stack_a = (await connect_stack())[1]
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = stack_a.fork_with_new_dec(basDecIdB)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`

                    let stub_a = stack_a.local_cache_stub()

                    let stub_b = stack_b.local_cache_stub()

                    await stack_a.local_cache_meta_stub().clear_access()

                    await stack_a.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.dec_default()))

                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result2 = await op_env1.update()
                    assert.ok(!update_result2.err)

                    await op_env1.commit()

                    console.info("update_result2", JSON.stringify(update_result2))

                    let op_env2 = (await stub_b.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)
                })
                it("create_path_op_env local_cache同zone同dec,access,set_group_permission()权限组设定", async () => {
                    let stack_a = (await connect_stack())[1]
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = stack_a.fork_with_new_dec(basDecIdB)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`

                    let stub_a = stack_a.local_cache_stub()

                    let stub_b = stack_b.local_cache_stub()

                    await stack_a.local_cache_meta_stub().clear_access()
                    let acc: cyfs.AccessString = (new cyfs.AccessString(0))
                    acc.set_group_permission(cyfs.AccessGroup.CurrentZone, cyfs.AccessPermission.Write)

                    await stack_a.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, acc))

                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result2 = await op_env1.update()
                    assert.ok(!update_result2.err)

                    await op_env1.commit()

                    console.info("update_result2", JSON.stringify(update_result2))

                    let op_env2 = (await stub_b.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)
                })
                it("create_path_op_env local_cache同zone同dec,access,set_group_permissions()权限组设定", async () => {
                    let stack_a = (await connect_stack())[1]
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = stack_a.fork_with_new_dec(basDecIdB)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`

                    let stub_a = stack_a.local_cache_stub()

                    let stub_b = stack_b.local_cache_stub()

                    await stack_a.local_cache_meta_stub().clear_access()
                    let acc: cyfs.AccessString = (new cyfs.AccessString(0))

                    acc.set_group_permissions(cyfs.AccessGroup.CurrentZone, cyfs.AccessPermissions.Full)

                    await stack_a.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, acc))

                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result2 = await op_env1.update()
                    assert.ok(!update_result2.err)

                    await op_env1.commit()

                    console.info("update_result2", JSON.stringify(update_result2))

                    let op_env2 = (await stub_b.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)
                })
                it("create_path_op_env local_cache同zone同dec,access,make()权限组设定", async () => {
                    let stack_a = (await connect_stack())[1]
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = stack_a.fork_with_new_dec(basDecIdB)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`

                    let stub_a = stack_a.local_cache_stub()

                    let stub_b = stack_b.local_cache_stub()

                    await stack_a.local_cache_meta_stub().clear_access()

                    let acc = cyfs.AccessString.make([{ group: cyfs.AccessGroup.CurrentZone, permissions: cyfs.AccessPermissions.Full }])

                    await stack_a.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, acc))

                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result2 = await op_env1.update()
                    assert.ok(!update_result2.err)

                    await op_env1.commit()

                    console.info("update_result2", JSON.stringify(update_result2))

                    let op_env2 = (await stub_b.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)
                })
                it("create_path_op_env local_cache同zone同dec,access,constructor()权限组初始化", async () => {
                    let stack_a = (await connect_stack())[1]
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = stack_a.fork_with_new_dec(basDecIdB)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`

                    let stub_a = stack_a.local_cache_stub()

                    let stub_b = stack_b.local_cache_stub()

                    await stack_a.local_cache_meta_stub().clear_access()

                    let acc: cyfs.AccessString = (new cyfs.AccessString(0o777))

                    await stack_a.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, acc))

                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result2 = await op_env1.update()
                    assert.ok(!update_result2.err)

                    await op_env1.commit()

                    console.info("update_result2", JSON.stringify(update_result2))

                    let op_env2 = (await stub_b.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)
                })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## create_path_op_env local_cache同zone不同dec", async () => {
                it("create_path_op_env local_cache同zone不同dec,access,dec_default()权限组", async () => {
                    let stack_a = (await connect_stack())[0]
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = (await connect_stack())[1]
                    console.info(`stack_b,${stack_b.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`

                    let stub_b_a = stack_b.local_cache_stub(undefined, basDecIdA)

                    let stub_a = stack_a.local_cache_stub()

                    await stack_a.local_cache_meta_stub().clear_access()

                    await stack_b.local_cache_meta_stub().clear_access()

                    await stack_b.local_cache_meta_stub(basDecIdA).add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.dec_default()))

                    let g_path = new cyfs.RequestGlobalStatePath(basDecIdB, path1)

                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_b_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result2 = await op_env1.update()
                    assert.ok(!update_result2.err)

                    await op_env1.commit()

                    console.info("update_result2", JSON.stringify(update_result2))

                    let op_env2 = (await stub_a.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)
                })
                it("create_path_op_env local_cache同zone不同dec,access,default()权限组", async () => {
                    let stack_a = (await connect_stack())[0]
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = (await connect_stack())[1]
                    console.info(`stack_b,${stack_b.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`

                    let stub_b_a = stack_b.local_cache_stub(undefined, basDecIdA)

                    let stub_a = stack_a.local_cache_stub()

                    await stack_a.local_cache_meta_stub().clear_access()

                    await stack_b.local_cache_meta_stub().clear_access()

                    await stack_b.local_cache_meta_stub(basDecIdA).add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.default()))

                    let g_path = new cyfs.RequestGlobalStatePath(basDecIdB, path1)

                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_b_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result2 = await op_env1.update()
                    assert.ok(!update_result2.err)

                    await op_env1.commit()

                    console.info("update_result2", JSON.stringify(update_result2))

                    let op_env2 = (await stub_a.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)
                })
                it("create_path_op_env local_cache同zone不同dec,access,full()权限组", async () => {
                    let stack_a = (await connect_stack())[0]
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = (await connect_stack())[1]
                    console.info(`stack_b,${stack_b.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`

                    let stub_b_a = stack_b.local_cache_stub(undefined, basDecIdA)

                    let stub_a = stack_a.local_cache_stub()

                    await stack_a.local_cache_meta_stub().clear_access()

                    await stack_b.local_cache_meta_stub().clear_access()

                    await stack_b.local_cache_meta_stub(basDecIdA).add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.full()))

                    let g_path = new cyfs.RequestGlobalStatePath(basDecIdB, path1)

                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_b_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result2 = await op_env1.update()
                    assert.ok(!update_result2.err)

                    await op_env1.commit()

                    console.info("update_result2", JSON.stringify(update_result2))

                    let op_env2 = (await stub_a.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)
                })
                it("create_path_op_env local_cache同zone不同dec,access,full_except_write()权限组", async () => {
                    let stack_a = (await connect_stack())[0]
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = (await connect_stack())[1]
                    console.info(`stack_b,${stack_b.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`

                    let stub_b_a = stack_b.local_cache_stub(undefined, basDecIdA)

                    let stub_a = stack_a.local_cache_stub()

                    await stack_a.local_cache_meta_stub().clear_access()

                    await stack_b.local_cache_meta_stub().clear_access()

                    await stack_b.local_cache_meta_stub(basDecIdA).add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.full_except_write()))

                    let g_path = new cyfs.RequestGlobalStatePath(basDecIdB, path1)

                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_b_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result2 = await op_env1.update()
                    assert.ok(!update_result2.err)

                    await op_env1.commit()

                    console.info("update_result2", JSON.stringify(update_result2))

                    let op_env2 = (await stub_a.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)
                })
                it("create_path_op_env local_cache同zone不同dec,access,set_group_permission()权限组设定", async () => {
                    let stack_a = (await connect_stack())[0]
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = (await connect_stack())[1]
                    console.info(`stack_b,${stack_b.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`

                    let stub_b_a = stack_b.local_cache_stub(undefined, basDecIdA)

                    let stub_a = stack_a.local_cache_stub()

                    await stack_a.local_cache_meta_stub().clear_access()

                    await stack_b.local_cache_meta_stub().clear_access()

                    let acc: cyfs.AccessString = (new cyfs.AccessString(0))
                    acc.set_group_permission(cyfs.AccessGroup.CurrentZone, cyfs.AccessPermission.Write)

                    await stack_b.local_cache_meta_stub(basDecIdA).add_access(cyfs.GlobalStatePathAccessItem.new(path1, acc))

                    let g_path = new cyfs.RequestGlobalStatePath(basDecIdB, path1)

                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_b_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result2 = await op_env1.update()
                    assert.ok(!update_result2.err)

                    await op_env1.commit()

                    console.info("update_result2", JSON.stringify(update_result2))

                    let op_env2 = (await stub_a.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)
                })
                it("create_path_op_env local_cache同zone不同dec,access,set_group_permissions()权限组设定", async () => {
                    let stack_a = (await connect_stack())[0]
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = (await connect_stack())[1]
                    console.info(`stack_b,${stack_b.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`

                    let stub_b_a = stack_b.local_cache_stub(undefined, basDecIdA)

                    let stub_a = stack_a.local_cache_stub()

                    await stack_a.local_cache_meta_stub().clear_access()

                    await stack_b.local_cache_meta_stub().clear_access()

                    let acc: cyfs.AccessString = (new cyfs.AccessString(0))

                    acc.set_group_permissions(cyfs.AccessGroup.CurrentZone, cyfs.AccessPermissions.Full)

                    await stack_a.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, acc))

                    await stack_b.local_cache_meta_stub(basDecIdA).add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.dec_default()))

                    let g_path = new cyfs.RequestGlobalStatePath(basDecIdB, path1)

                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_b_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result2 = await op_env1.update()
                    assert.ok(!update_result2.err)

                    await op_env1.commit()

                    console.info("update_result2", JSON.stringify(update_result2))

                    let op_env2 = (await stub_a.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)
                })
                it("create_path_op_env local_cache同zone不同dec,access,make()权限组设定", async () => {
                    let stack_a = (await connect_stack())[0]
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = (await connect_stack())[1]
                    console.info(`stack_b,${stack_b.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`

                    let stub_b_a = stack_b.local_cache_stub(undefined, basDecIdA)

                    let stub_a = stack_a.local_cache_stub()

                    await stack_a.local_cache_meta_stub().clear_access()

                    await stack_b.local_cache_meta_stub().clear_access()

                    let acc = cyfs.AccessString.make([{ group: cyfs.AccessGroup.CurrentZone, permissions: cyfs.AccessPermissions.Full }])

                    await stack_b.local_cache_meta_stub(basDecIdA).add_access(cyfs.GlobalStatePathAccessItem.new(path1, acc))

                    let g_path = new cyfs.RequestGlobalStatePath(basDecIdB, path1)

                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_b_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result2 = await op_env1.update()
                    assert.ok(!update_result2.err)

                    await op_env1.commit()

                    console.info("update_result2", JSON.stringify(update_result2))

                    let op_env2 = (await stub_a.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)
                })
                it("create_path_op_env local_cache同zone不同dec,access,constructor()权限组初始化", async () => {
                    let stack_a = (await connect_stack())[0]
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = (await connect_stack())[1]
                    console.info(`stack_b,${stack_b.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`

                    let stub_b_a = stack_b.local_cache_stub(undefined, basDecIdA)

                    let stub_a = stack_a.local_cache_stub()

                    await stack_a.local_cache_meta_stub().clear_access()

                    await stack_b.local_cache_meta_stub().clear_access()

                    let acc: cyfs.AccessString = (new cyfs.AccessString(0o777))

                    await stack_b.local_cache_meta_stub(basDecIdA).add_access(cyfs.GlobalStatePathAccessItem.new(path1, acc))

                    let g_path = new cyfs.RequestGlobalStatePath(basDecIdB, path1)

                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_b_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`####### process1 insert:${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result2 = await op_env1.update()
                    assert.ok(!update_result2.err)

                    await op_env1.commit()

                    console.info("update_result2", JSON.stringify(update_result2))

                    let op_env2 = (await stub_a.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)
                })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## create_path_op_env local_cache跨zone同dec", async () => {
                it("create_path_op_env local_cache跨zone同dec,access,dec_default()权限组", async () => {
                    let ood1 = (await connect_stack())[0]
                    console.info(`stack_a,${ood1.dec_id}`)

                    let ood = (await connect_stack())[3]
                    console.info(`stack_b,${ood.dec_id}`)

                    let ood2 = ood.fork_with_new_dec(ood1.dec_id)
                    console.info(`stack_b,${ood2.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = ood2.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    await ood1.local_cache_meta_stub().clear_access()
                    await ood2.local_cache_meta_stub().clear_access()
                    await ood2.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.dec_default()))

                    let path_handler = new cyfs.RequestGlobalStatePath(ood2.dec_id, path1)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await ood2.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await ood1.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: ood1.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: ood2.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)
                })
                it("create_path_op_env local_cache跨zone同dec,access,default()权限组", async () => {
                    let ood1 = (await connect_stack())[0]
                    console.info(`stack_a,${ood1.dec_id}`)

                    let ood = (await connect_stack())[3]
                    console.info(`stack_b,${ood.dec_id}`)

                    let ood2 = ood.fork_with_new_dec(ood1.dec_id)
                    console.info(`stack_b,${ood2.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = ood2.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    await ood1.local_cache_meta_stub().clear_access()
                    await ood2.local_cache_meta_stub().clear_access()
                    await ood2.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.default()))

                    let path_handler = new cyfs.RequestGlobalStatePath(ood2.dec_id, path1)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await ood2.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await ood1.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: ood1.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: ood2.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)
                })
                it("create_path_op_env local_cache跨zone同dec,access,full()权限组", async () => {
                    let ood1 = (await connect_stack())[0]
                    console.info(`stack_a,${ood1.dec_id}`)

                    let ood = (await connect_stack())[3]
                    console.info(`stack_b,${ood.dec_id}`)

                    let ood2 = ood.fork_with_new_dec(ood1.dec_id)
                    console.info(`stack_b,${ood2.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = ood2.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    await ood1.local_cache_meta_stub().clear_access()
                    await ood2.local_cache_meta_stub().clear_access()
                    await ood2.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.full()))

                    let path_handler = new cyfs.RequestGlobalStatePath(ood2.dec_id, path1)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await ood2.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await ood1.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: ood1.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: ood2.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)
                })
                it("create_path_op_env local_cache跨zone同dec,access,full_except_write()权限组", async () => {
                    let ood1 = (await connect_stack())[0]
                    console.info(`stack_a,${ood1.dec_id}`)

                    let ood = (await connect_stack())[3]
                    console.info(`stack_b,${ood.dec_id}`)

                    let ood2 = ood.fork_with_new_dec(ood1.dec_id)
                    console.info(`stack_b,${ood2.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = ood2.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    await ood1.local_cache_meta_stub().clear_access()
                    await ood2.local_cache_meta_stub().clear_access()
                    await ood2.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.full_except_write()))

                    let path_handler = new cyfs.RequestGlobalStatePath(ood2.dec_id, path1)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await ood2.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await ood1.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: ood1.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: ood2.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)
                })
                it("create_path_op_env local_cache跨zone同dec,access,set_group_permission()权限组设定", async () => {
                    let ood1 = (await connect_stack())[0]
                    console.info(`stack_a,${ood1.dec_id}`)

                    let ood = (await connect_stack())[3]
                    console.info(`stack_b,${ood.dec_id}`)

                    let ood2 = ood.fork_with_new_dec(ood1.dec_id)
                    console.info(`stack_b,${ood2.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = ood2.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    await ood1.local_cache_meta_stub().clear_access()
                    await ood2.local_cache_meta_stub().clear_access()
                    let acc: cyfs.AccessString = (new cyfs.AccessString(0))
                    acc.set_group_permission(cyfs.AccessGroup.CurrentZone, cyfs.AccessPermission.Write)
                    await ood2.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, acc))

                    let path_handler = new cyfs.RequestGlobalStatePath(ood2.dec_id, path1)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await ood2.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await ood1.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: ood1.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: ood2.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)
                })
                it("create_path_op_env local_cache跨zone同dec,access,set_group_permissions()权限组设定", async () => {
                    let ood1 = (await connect_stack())[0]
                    console.info(`stack_a,${ood1.dec_id}`)

                    let ood = (await connect_stack())[3]
                    console.info(`stack_b,${ood.dec_id}`)

                    let ood2 = ood.fork_with_new_dec(ood1.dec_id)
                    console.info(`stack_b,${ood2.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = ood2.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    await ood1.local_cache_meta_stub().clear_access()
                    await ood2.local_cache_meta_stub().clear_access()
                    let acc: cyfs.AccessString = (new cyfs.AccessString(0))

                    acc.set_group_permissions(cyfs.AccessGroup.CurrentZone, cyfs.AccessPermissions.Full)
                    await ood2.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, acc))

                    let path_handler = new cyfs.RequestGlobalStatePath(ood2.dec_id, path1)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await ood2.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await ood1.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: ood1.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: ood2.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)
                })
                it("create_path_op_env local_cache跨zone同dec,access,make()权限组设定", async () => {
                    let ood1 = (await connect_stack())[0]
                    console.info(`stack_a,${ood1.dec_id}`)

                    let ood = (await connect_stack())[3]
                    console.info(`stack_b,${ood.dec_id}`)

                    let ood2 = ood.fork_with_new_dec(ood1.dec_id)
                    console.info(`stack_b,${ood2.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = ood2.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    await ood1.local_cache_meta_stub().clear_access()
                    await ood2.local_cache_meta_stub().clear_access()
                    let acc = cyfs.AccessString.make([{ group: cyfs.AccessGroup.CurrentZone, permissions: cyfs.AccessPermissions.Full }])

                    await ood2.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, acc))

                    let path_handler = new cyfs.RequestGlobalStatePath(ood2.dec_id, path1)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await ood2.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await ood1.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: ood1.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: ood2.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)
                })
                it("create_path_op_env local_cache跨zone同dec,access,constructor()权限组初始化", async () => {
                    let ood1 = (await connect_stack())[0]
                    console.info(`stack_a,${ood1.dec_id}`)

                    let ood = (await connect_stack())[3]
                    console.info(`stack_b,${ood.dec_id}`)

                    let ood2 = ood.fork_with_new_dec(ood1.dec_id)
                    console.info(`stack_b,${ood2.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = ood2.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    await ood1.local_cache_meta_stub().clear_access()
                    await ood2.local_cache_meta_stub().clear_access()
                    let acc: cyfs.AccessString = (new cyfs.AccessString(0o777))

                    await ood2.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, acc))

                    let path_handler = new cyfs.RequestGlobalStatePath(ood2.dec_id, path1)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await ood2.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await ood1.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: ood1.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: ood2.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)
                })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## create_path_op_env local_cache跨zone不同dec", async () => {
                it("create_path_op_env local_cache跨zone不同dec,access,dec_default()权限组", async () => {
                    let ood1 = (await connect_stack())[0]
                    console.info(`stack_a,${ood1.dec_id}`)

                    let ood2 = (await connect_stack())[3]
                    console.info(`stack_b,${ood2.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = ood2.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    await ood1.local_cache_meta_stub().clear_access()
                    await ood2.local_cache_meta_stub().clear_access()
                    await ood2.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.dec_default()))

                    let path_handler = new cyfs.RequestGlobalStatePath(ood2.dec_id, path1)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await ood2.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await ood1.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: ood1.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: ood2.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)
                })
                it("create_path_op_env local_cache跨zone不同dec,access,default()权限组", async () => {
                    let ood1 = (await connect_stack())[0]
                    console.info(`stack_a,${ood1.dec_id}`)

                    let ood2 = (await connect_stack())[3]
                    console.info(`stack_b,${ood2.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = ood2.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    await ood1.local_cache_meta_stub().clear_access()
                    await ood2.local_cache_meta_stub().clear_access()
                    await ood2.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.default()))

                    let path_handler = new cyfs.RequestGlobalStatePath(ood2.dec_id, path1)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await ood2.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await ood1.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: ood1.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: ood2.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)
                })
                it("create_path_op_env local_cache跨zone不同dec,access,full()权限组", async () => {
                    let ood1 = (await connect_stack())[0]
                    console.info(`stack_a,${ood1.dec_id}`)

                    let ood2 = (await connect_stack())[3]
                    console.info(`stack_b,${ood2.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = ood2.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    await ood1.local_cache_meta_stub().clear_access()
                    await ood2.local_cache_meta_stub().clear_access()
                    await ood2.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.full()))

                    let path_handler = new cyfs.RequestGlobalStatePath(ood2.dec_id, path1)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await ood2.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await ood1.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: ood1.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: ood2.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)
                })
                it("create_path_op_env local_cache跨zone不同dec,access,full_except_write()权限组", async () => {
                    let ood1 = (await connect_stack())[0]
                    console.info(`stack_a,${ood1.dec_id}`)

                    let ood2 = (await connect_stack())[3]
                    console.info(`stack_b,${ood2.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = ood2.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    await ood1.local_cache_meta_stub().clear_access()
                    await ood2.local_cache_meta_stub().clear_access()
                    await ood2.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.full_except_write()))

                    let path_handler = new cyfs.RequestGlobalStatePath(ood2.dec_id, path1)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await ood2.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await ood1.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: ood1.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: ood2.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)
                })
                it("create_path_op_env local_cache跨zone不同decc,access,set_group_permission()权限组设定", async () => {
                    let ood1 = (await connect_stack())[0]
                    console.info(`stack_a,${ood1.dec_id}`)

                    let ood2 = (await connect_stack())[3]
                    console.info(`stack_b,${ood2.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = ood2.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    await ood1.local_cache_meta_stub().clear_access()
                    await ood2.local_cache_meta_stub().clear_access()
                    let acc: cyfs.AccessString = (new cyfs.AccessString(0))
                    acc.set_group_permission(cyfs.AccessGroup.CurrentZone, cyfs.AccessPermission.Write)
                    await ood2.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, acc))

                    let path_handler = new cyfs.RequestGlobalStatePath(ood2.dec_id, path1)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await ood2.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await ood1.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: ood1.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: ood2.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)
                })
                it("create_path_op_env local_cache跨zone不同dec,access,set_group_permissions()权限组设定", async () => {
                    let ood1 = (await connect_stack())[0]
                    console.info(`stack_a,${ood1.dec_id}`)

                    let ood2 = (await connect_stack())[3]
                    console.info(`stack_b,${ood2.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = ood2.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    await ood1.local_cache_meta_stub().clear_access()
                    await ood2.local_cache_meta_stub().clear_access()
                    let acc: cyfs.AccessString = (new cyfs.AccessString(0))
                    acc.set_group_permissions(cyfs.AccessGroup.CurrentZone, cyfs.AccessPermissions.Full)
                    await ood2.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, acc))

                    let path_handler = new cyfs.RequestGlobalStatePath(ood2.dec_id, path1)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await ood2.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await ood1.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: ood1.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: ood2.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)
                })
                it("create_path_op_env local_cache跨zone不同dec,access,make()权限组设定", async () => {
                    let ood1 = (await connect_stack())[0]
                    console.info(`stack_a,${ood1.dec_id}`)

                    let ood2 = (await connect_stack())[3]
                    console.info(`stack_b,${ood2.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = ood2.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    await ood1.local_cache_meta_stub().clear_access()
                    await ood2.local_cache_meta_stub().clear_access()
                    let acc = cyfs.AccessString.make([{ group: cyfs.AccessGroup.CurrentZone, permissions: cyfs.AccessPermissions.Full }])
                    await ood2.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, acc))

                    let path_handler = new cyfs.RequestGlobalStatePath(ood2.dec_id, path1)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await ood2.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await ood1.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: ood1.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: ood2.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)
                })
                it("create_path_op_env local_cache跨zone不同dec,access,constructor()权限组初始化", async () => {
                    let ood1 = (await connect_stack())[0]
                    console.info(`stack_a,${ood1.dec_id}`)

                    let ood2 = (await connect_stack())[3]
                    console.info(`stack_b,${ood2.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = ood2.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    await ood1.local_cache_meta_stub().clear_access()
                    await ood2.local_cache_meta_stub().clear_access()
                    let acc: cyfs.AccessString = (new cyfs.AccessString(0o777))


                    await ood2.local_cache_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, acc))

                    let path_handler = new cyfs.RequestGlobalStatePath(ood2.dec_id, path1)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await ood2.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await ood1.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: ood1.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: ood2.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)
                })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## SharedCyfsStack.root_state_stub create_path_op_env", async () => {
                it("create_single_op_env root-state同zone同dec,access,dec_default()权限组", async () => { })
                it("create_single_op_env root-state同zone同dec,access,default()权限组", async () => { })
                it("create_single_op_env root-state同zone同dec,access,full()权限组", async () => { })
                it("create_single_op_env root-state同zone同dec,access,full_except_write()权限组", async () => { })
                it("create_single_op_env root-state同zone同dec,access,set_group_permission()权限组设定", async () => { })
                it("create_single_op_env root-state同zone同dec,access,set_group_permissions()权限组设定", async () => { })
                it("create_single_op_env root-state同zone同dec,access,make()权限组设定", async () => { })
                it("create_single_op_env root-state同zone同dec,access,constructor()权限组初始化", async () => { })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## SharedCyfsStack.root_state_stub create_path_op_env", async () => {
                it("create_single_op_env root-state同zone不同dec,access,dec_default()权限组", async () => { })
                it("create_single_op_env root-state同zone不同dec,access,default()权限组", async () => { })
                it("create_single_op_env root-state同zone不同dec,access,full()权限组", async () => { })
                it("create_single_op_env root-state同zone不同dec,access,full_except_write()权限组", async () => { })
                it("create_single_op_env root-state同zone不同dec,access,set_group_permission()权限组设定", async () => { })
                it("create_single_op_env root-state同zone不同dec,access,set_group_permissions()权限组设定", async () => { })
                it("create_single_op_env root-state同zone不同dec,access,make()权限组设定", async () => { })
                it("create_single_op_env root-state同zone不同dec,access,constructor()权限组初始化", async () => { })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## SharedCyfsStack.root_state_stub create_path_op_env", async () => {
                it("create_single_op_env root-state跨zone同dec,access,dec_default()权限组", async () => { })
                it("create_single_op_env root-state跨zone同dec,access,default()权限组", async () => { })
                it("create_single_op_env root-state跨zone同dec,access,full()权限组", async () => { })
                it("create_single_op_env root-state跨zone同dec,access,full_except_write()权限组", async () => { })
                it("create_single_op_env root-state跨zone同dec,access,set_group_permission()权限组设定", async () => { })
                it("create_single_op_env root-state跨zone同dec,access,set_group_permissions()权限组设定", async () => { })
                it("create_single_op_env root-state跨zone同dec,access,make()权限组设定", async () => { })
                it("create_single_op_env root-state跨zone同dec,access,constructor()权限组初始化", async () => { })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## SharedCyfsStack.root_state_stub create_path_op_env", async () => {
                it("create_single_op_env root-state跨zone不同dec,access,dec_default()权限组", async () => { })
                it("create_single_op_env root-state跨zone不同dec,access,default()权限组", async () => { })
                it("create_single_op_env root-state跨zone不同dec,access,full()权限组", async () => { })
                it("create_single_op_env root-state跨zone不同dec,access,full_except_write()权限组", async () => { })
                it("create_single_op_env root-state跨zone不同decc,access,set_group_permission()权限组设定", async () => { })
                it("create_single_op_env root-state跨zone不同dec,access,set_group_permissions()权限组设定", async () => { })
                it("create_single_op_env root-state跨zone不同dec,access,make()权限组设定", async () => { })
                it("create_single_op_env root-state跨zone不同dec,access,constructor()权限组初始化", async () => { })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## SharedCyfsStack.root_state_stub create_path_op_env", async () => {
                it("create_single_op_env local_cache同zone同dec,access,dec_default()权限组", async () => { })
                it("create_single_op_env local_cache同zone同dec,access,default()权限组", async () => { })
                it("create_single_op_env local_cache同zone同dec,access,full()权限组", async () => { })
                it("create_single_op_env local_cache同zone同dec,access,full_except_write()权限组", async () => { })
                it("create_single_op_env local_cache同zone同dec,access,set_group_permission()权限组设定", async () => { })
                it("create_single_op_env local_cache同zone同dec,access,set_group_permissions()权限组设定", async () => { })
                it("create_single_op_env local_cache同zone同dec,access,make()权限组设定", async () => { })
                it("create_single_op_env local_cache同zone同dec,access,constructor()权限组初始化", async () => { })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## SharedCyfsStack.root_state_stub create_path_op_env", async () => {
                it("create_single_op_env local_cache同zone不同dec,access,dec_default()权限组", async () => { })
                it("create_single_op_env local_cache同zone不同dec,access,default()权限组", async () => { })
                it("create_single_op_env local_cache同zone不同dec,access,full()权限组", async () => { })
                it("create_single_op_env local_cache同zone不同dec,access,full_except_write()权限组", async () => { })
                it("create_single_op_env local_cache同zone不同dec,access,set_group_permission()权限组设定", async () => { })
                it("create_single_op_env local_cache同zone不同dec,access,set_group_permissions()权限组设定", async () => { })
                it("create_single_op_env local_cache同zone不同dec,access,make()权限组设定", async () => { })
                it("create_single_op_env local_cache同zone不同dec,access,constructor()权限组初始化", async () => { })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## SharedCyfsStack.root_state_stub create_path_op_env", async () => {
                it("create_single_op_env local_cache跨zone同dec,access,dec_default()权限组", async () => { })
                it("create_single_op_env local_cache跨zone同dec,access,default()权限组", async () => { })
                it("create_single_op_env local_cache跨zone同dec,access,full()权限组", async () => { })
                it("create_single_op_env local_cache跨zone同dec,access,full_except_write()权限组", async () => { })
                it("create_single_op_env local_cache跨zone同dec,access,set_group_permission()权限组设定", async () => { })
                it("create_single_op_env local_cache跨zone同dec,access,set_group_permissions()权限组设定", async () => { })
                it("create_single_op_env local_cache跨zone同dec,access,make()权限组设定", async () => { })
                it("create_single_op_env local_cache跨zone同dec,access,constructor()权限组初始化", async () => { })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## SharedCyfsStack.root_state_stub create_path_op_env", async () => {
                it("create_single_op_env local_cache跨zone不同dec,access,dec_default()权限组", async () => { })
                it("create_single_op_env local_cache跨zone不同dec,access,default()权限组", async () => { })
                it("create_single_op_env local_cache跨zone不同dec,access,full()权限组", async () => { })
                it("create_single_op_env local_cache跨zone不同dec,access,full_except_write()权限组", async () => { })
                it("create_single_op_env local_cache跨zone不同decc,access,set_group_permission()权限组设定", async () => { })
                it("create_single_op_env local_cache跨zone不同dec,access,set_group_permissions()权限组设定", async () => { })
                it("create_single_op_env local_cache跨zone不同dec,access,make()权限组设定", async () => { })
                it("create_single_op_env local_cache跨zone不同dec,access,constructor()权限组初始化", async () => { })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## SharedCyfsStack.root_state_stub create_path_op_env", async () => {
                it("local_cache_access_stub（） 同zone同dec,access,dec_default()权限组", async () => { })
                it("local_cache_access_stub（） 同zone同dec,access,default()权限组", async () => { })
                it("local_cache_access_stub（） 同zone同dec,access,full()权限组", async () => { })
                it("local_cache_access_stub（） 同zone同dec,access,full_except_write()权限组", async () => { })
                it("local_cache_access_stub（） 同zone同dec,access,set_group_permission()权限组设定", async () => { })
                it("local_cache_access_stub（） 同zone同dec,access,set_group_permissions()权限组设定", async () => { })
                it("local_cache_access_stub（） 同zone同dec,access,make()权限组设定", async () => { })
                it("local_cache_access_stub（） 同zone同dec,access,access,constructor()权限组初始化", async () => { })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## SharedCyfsStack.root_state_stub create_path_op_env", async () => {
                it("local_cache_access_stub（） 同zone不同dec,access,dec_default()权限组", async () => { })
                it("local_cache_access_stub（） 同zone不同dec,access,default()权限组", async () => { })
                it("local_cache_access_stub（） 同zone不同dec,access,full()权限组", async () => { })
                it("local_cache_access_stub（） 同zone不同dec,access,full_except_write()权限组", async () => { })
                it("local_cache_access_stub（） 同zone不同dec,access,set_group_permission()权限组设定", async () => { })
                it("local_cache_access_stub（） 同zone不同dec,access,set_group_permissions()权限组设定", async () => { })
                it("local_cache_access_stub（） 同zone不同dec,access,make()权限组设定", async () => { })
                it("local_cache_access_stub（） 同zone不同dec,access,access,constructor()权限组初始化", async () => { })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## SharedCyfsStack.root_state_stub create_path_op_env", async () => {
                it("local_cache_access_stub（） 跨zone同dec,access,dec_default()权限组", async () => { })
                it("local_cache_access_stub（） 跨zone同dec,access,default()权限组", async () => { })
                it("local_cache_access_stub（） 跨zone同dec,access,full()权限组", async () => { })
                it("local_cache_access_stub（） 跨zone同dec,access,full_except_write()权限组", async () => { })
                it("local_cache_access_stub（） 跨zone同dec,access,set_group_permission()权限组设定", async () => { })
                it("local_cache_access_stub（） 跨zone同dec,access,set_group_permissions()权限组设定", async () => { })
                it("local_cache_access_stub（） 跨zone同dec,access,make()权限组设定", async () => { })
                it("local_cache_access_stub（） 跨zone同dec,access,access,constructor()权限组初始化", async () => { })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## SharedCyfsStack.root_state_stub create_path_op_env", async () => {
                it("local_cache_access_stub（） 跨zone不同dec,access,dec_default()权限组", async () => { })
                it("local_cache_access_stub（） 跨zone不同dec,access,default()权限组", async () => { })
                it("local_cache_access_stub（） 跨zone不同dec,access,full()权限组", async () => { })
                it("local_cache_access_stub（） 跨zone不同dec,access,full_except_write()权限组", async () => { })
                it("local_cache_access_stub（） 跨zone不同dec,access,set_group_permission()权限组设定", async () => { })
                it("local_cache_access_stub（） 跨zone不同dec,access,set_group_permissions()权限组设定", async () => { })
                it("local_cache_access_stub（） 跨zone不同dec,access,make()权限组设定", async () => { })
                it("local_cache_access_stub（） 跨zone不同dec,access,access,constructor()权限组初始化", async () => { })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## SharedCyfsStack.root_state_stub create_path_op_env", async () => {
                it("root_state_access() 同zone同dec,access,dec_default()权限组", async () => { })
                it("root_state_access() 同zone同dec,access,default()权限组", async () => { })
                it("root_state_access() 同zone同dec,access,full()权限组", async () => { })
                it("root_state_access() 同zone同dec,access,full_except_write()权限组", async () => { })
                it("root_state_access() 同zone同dec,access,set_group_permission()权限组设定", async () => { })
                it("root_state_access() 同zone同dec,access,set_group_permissions()权限组设定", async () => { })
                it("root_state_access() 同zone同dec,access,make()权限组设定", async () => { })
                it("root_state_access() 同zone同dec,access,access,constructor()权限组初始化", async () => { })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## SharedCyfsStack.root_state_stub create_path_op_env", async () => {
                it("root_state_access() 同zone不同dec,access,dec_default()权限组", async () => { })
                it("root_state_access() 同zone不同dec,access,default()权限组", async () => { })
                it("root_state_access() 同zone不同dec,access,full()权限组", async () => { })
                it("root_state_access() 同zone不同dec,access,full_except_write()权限组", async () => { })
                it("root_state_access() 同zone不同dec,access,set_group_permission()权限组设定", async () => { })
                it("root_state_access() 同zone不同dec,access,set_group_permissions()权限组设定", async () => { })
                it("root_state_access() 同zone不同dec,access,make()权限组设定", async () => { })
                it("root_state_access() 同zone不同dec,access,access,constructor()权限组初始化", async () => { })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## SharedCyfsStack.root_state_stub create_path_op_env", async () => {
                it("root_state_access() 跨zone同dec,access,dec_default()权限组", async () => { })
                it("root_state_access() 跨zone同dec,access,default()权限组", async () => { })
                it("root_state_access() 跨zone同dec,access,full()权限组", async () => { })
                it("root_state_access() 跨zone同dec,access,full_except_write()权限组", async () => { })
                it("root_state_access() 跨zone同dec,access,set_group_permission()权限组设定", async () => { })
                it("root_state_access() 跨zone同dec,access,set_group_permissions()权限组设定", async () => { })
                it("root_state_access() 跨zone同dec,access,make()权限组设定", async () => { })
                it("root_state_access() 跨zone同dec,access,access,constructor()权限组初始化", async () => { })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## SharedCyfsStack.root_state_stub create_path_op_env", async () => {
                it("root_state_access() 跨zone不同dec,access,dec_default()权限组", async () => { })
                it("root_state_access() 跨zone不同dec,access,default()权限组", async () => { })
                it("root_state_access() 跨zone不同dec,access,full()权限组", async () => { })
                it("root_state_access() 跨zone不同dec,access,full_except_write()权限组", async () => { })
                it("root_state_access() 跨zone不同dec,access,set_group_permission()权限组设定", async () => { })
                it("root_state_access() 跨zone不同dec,access,set_group_permissions()权限组设定", async () => { })
                it("root_state_access() 跨zone不同dec,access,make()权限组设定", async () => { })
                it("root_state_access() 跨zone不同dec,access,access,constructor()权限组初始化", async () => { })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## SharedCyfsStack.root_state_stub create_path_op_env", async () => {
                it("root_state_access_stub（） 同zone同dec,access,dec_default()权限组", async () => { })
                it("root_state_access_stub（） 同zone同dec,access,default()权限组", async () => { })
                it("root_state_access_stub（） 同zone同dec,access,full()权限组", async () => { })
                it("root_state_access_stub（） 同zone同dec,access,full_except_write()权限组", async () => { })
                it("root_state_access_stub（） 同zone同dec,access,set_group_permission()权限组设定", async () => { })
                it("root_state_access_stub（） 同zone同dec,access,set_group_permissions()权限组设定", async () => { })
                it("root_state_access_stub（） 同zone同dec,access,make()权限组设定", async () => { })
                it("root_state_access_stub（） 同zone同dec,access,access,constructor()权限组初始化", async () => { })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## SharedCyfsStack.root_state_stub create_path_op_env", async () => {
                it("root_state_access_stub（） 同zone不同dec,access,dec_default()权限组", async () => { })
                it("root_state_access_stub（） 同zone不同dec,access,default()权限组", async () => { })
                it("root_state_access_stub（） 同zone不同dec,access,full()权限组", async () => { })
                it("root_state_access_stub（） 同zone不同dec,access,full_except_write()权限组", async () => { })
                it("root_state_access_stub（） 同zone不同dec,access,set_group_permission()权限组设定", async () => { })
                it("root_state_access_stub（） 同zone不同dec,access,set_group_permissions()权限组设定", async () => { })
                it("root_state_access_stub（） 同zone不同dec,access,make()权限组设定", async () => { })
                it("root_state_access_stub（） 同zone不同dec,access,access,constructor()权限组初始化", async () => { })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## SharedCyfsStack.root_state_stub create_path_op_env", async () => {
                it("root_state_access_stub（） 跨zone同dec,access,dec_default()权限组", async () => { })
                it("root_state_access_stub（） 跨zone同dec,access,default()权限组", async () => { })
                it("root_state_access_stub（） 跨zone同dec,access,full()权限组", async () => { })
                it("root_state_access_stub（） 跨zone同dec,access,full_except_write()权限组", async () => { })
                it("root_state_access_stub（） 跨zone同dec,access,set_group_permission()权限组设定", async () => { })
                it("root_state_access_stub（） 跨zone同dec,access,set_group_permissions()权限组设定", async () => { })
                it("root_state_access_stub（） 跨zone同dec,access,make()权限组设定", async () => { })
                it("root_state_access_stub（） 跨zone同dec,access,access,constructor()权限组初始化", async () => { })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## SharedCyfsStack.root_state_stub create_path_op_env", async () => {
                it("root_state_access_stub（） 跨zone不同dec,access,dec_default()权限组", async () => { })
                it("root_state_access_stub（） 跨zone不同dec,access,default()权限组", async () => { })
                it("root_state_access_stub（） 跨zone不同dec,access,full()权限组", async () => { })
                it("root_state_access_stub（） 跨zone不同dec,access,full_except_write()权限组", async () => { })
                it("root_state_access_stub（） 跨zone不同dec,access,set_group_permission()权限组设定", async () => { })
                it("root_state_access_stub（） 跨zone不同dec,access,set_group_permissions()权限组设定", async () => { })
                it("root_state_access_stub（） 跨zone不同dec,access,make()权限组设定", async () => { })
                it("root_state_access_stub（） 跨zone不同dec,access,access,constructor()权限组初始化", async () => { })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## SharedCyfsStack.root_state_stub create_path_op_env", async () => {
                it("global_state.get_current_root(),Global同zone同dec,access,dec_default()权限组", async () => { })
                it("global_state.get_current_root(),Global同zone同dec,access,default()权限组", async () => { })
                it("global_state.get_current_root(),Global同zone同dec,access,full()权限组", async () => { })
                it("global_state.get_current_root(),Global同zone同dec,access,full_except_write()权限组", async () => { })
                it("global_state.get_current_root(),Global同zone同dec,access,set_group_permission()权限组设定", async () => { })
                it("global_state.get_current_root(),Global同zone同dec,access,set_group_permissions()权限组设定", async () => { })
                it("global_state.get_current_root(),Global同zone同dec,access,make()权限组设定", async () => { })
                it("global_state.get_current_root(),Global同zone同dec,access,access,constructor()权限组初始化", async () => { })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## SharedCyfsStack.root_state_stub create_path_op_env", async () => {
                it("global_state.get_current_root(),Global同zone不同dec,access,dec_default()权限组", async () => { })
                it("global_state.get_current_root(),Global同zone不同dec,access,default()权限组", async () => { })
                it("global_state.get_current_root(),Global同zone不同dec,access,full()权限组", async () => { })
                it("global_state.get_current_root(),Global同zone不同dec,access,full_except_write()权限组", async () => { })
                it("global_state.get_current_root(),Global同zone不同dec,access,set_group_permission()权限组设定", async () => { })
                it("global_state.get_current_root(),Global同zone不同dec,access,set_group_permissions()权限组设定", async () => { })
                it("global_state.get_current_root(),Global同zone不同dec,access,make()权限组设定", async () => { })
                it("global_state.get_current_root(),Global同zone不同dec,access,access,constructor()权限组初始化", async () => { })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## SharedCyfsStack.root_state_stub create_path_op_env", async () => {
                it("global_state.get_current_root(),Dec同zone同dec,access,dec_default()权限组", async () => { })
                it("global_state.get_current_root(),Dec同zone同dec,access,default()权限组", async () => { })
                it("global_state.get_current_root(),Dec同zone同dec,access,full()权限组", async () => { })
                it("global_state.get_current_root(),Dec同zone同dec,access,full_except_write()权限组", async () => { })
                it("global_state.get_current_root(),Dec同zone同dec,access,set_group_permission()权限组设定", async () => { })
                it("global_state.get_current_root(),Dec同zone同dec,access,set_group_permissions()权限组设定", async () => { })
                it("global_state.get_current_root(),Dec同zone同dec,access,make()权限组设定", async () => { })
                it("global_state.get_current_root(),Dec同zone同dec,access,access,constructor()权限组初始化", async () => { })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## SharedCyfsStack.root_state_stub create_path_op_env", async () => {
                it("global_state.get_current_root(),Dec同zone不同dec,access,dec_default()权限组", async () => { })
                it("global_state.get_current_root(),Dec同zone不同dec,access,default()权限组", async () => { })
                it("global_state.get_current_root(),Dec同zone不同dec,access,full()权限组", async () => { })
                it("global_state.get_current_root(),Dec同zone不同dec,access,full_except_write()权限组", async () => { })
                it("global_state.get_current_root(),Dec同zone不同dec,access,set_group_permission()权限组设定", async () => { })
                it("global_state.get_current_root(),Dec同zone不同dec,access,set_group_permissions()权限组设定", async () => { })
                it("global_state.get_current_root(),Dec同zone不同dec,access,make()权限组设定", async () => { })
                it("global_state.get_current_root(),Dec同zone不同dec,access,access,constructor()权限组初始化", async () => { })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## SharedCyfsStack.root_state_stub create_path_op_env", async () => {
                it("friends路径 同zone同dec,access,dec_default()权限组", async () => { })
                it("friends路径 同zone同dec,access,default()权限组", async () => { })
                it("friends路径 同zone同dec,access,full()权限组", async () => { })
                it("friends路径 同zone同dec,access,full_except_write()权限组", async () => { })
                it("friends路径 同zone同dec,access,set_group_permission()权限组设定", async () => { })
                it("friends路径 同zone同dec,access,set_group_permissions()权限组设定", async () => { })
                it("friends路径 同zone同dec,access,make()权限组设定", async () => { })
                it("friends路径 同zone同dec,access,access,constructor()权限组初始化", async () => { })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## SharedCyfsStack.root_state_stub create_path_op_env", async () => {
                it("friends路径 同zone不同dec,access,dec_default()权限组", async () => { })
                it("friends路径 同zone不同dec,access,default()权限组", async () => { })
                it("friends路径 同zone不同dec,access,full()权限组", async () => { })
                it("friends路径 同zone不同dec,access,full_except_write()权限组", async () => { })
                it("friends路径 同zone不同dec,access,set_group_permission()权限组设定", async () => { })
                it("friends路径 同zone不同dec,access,set_group_permissions()权限组设定", async () => { })
                it("friends路径 同zone不同dec,access,make()权限组设定", async () => { })
                it("friends路径 同zone不同dec,access,access,constructor()权限组初始化", async () => { })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## SharedCyfsStack.root_state_stub create_path_op_env", async () => {
                it("friends路径 跨zone同dec,access,dec_default()权限组 ", async () => { })
                it("friends路径 跨zone同dec,access,default()权限组", async () => { })
                it("friends路径 跨zone同dec,access,full()权限组", async () => { })
                it("friends路径 跨zone同dec,access,full_except_write()权限组", async () => { })
                it("friends路径 跨zone同dec,access,set_group_permission()权限组设定", async () => { })
                it("friends路径 跨zone同dec,access,set_group_permissions()权限组设定", async () => { })
                it("friends路径 跨zone同dec,access,make()权限组设定", async () => { })
                it("friends路径 跨zone同dec,access,access,constructor()权限组初始化", async () => { })
            })
            //---------------------------------------------------------------------------------------------------//
            describe("## SharedCyfsStack.root_state_stub create_path_op_env", async () => {
                it("friends路径 跨zone不同dec,access,dec_default()权限组 ", async () => { })
                it("friends路径 跨zone不同dec,access,default()权限组 ", async () => { })
                it("friends路径 跨zone不同dec,access,full()权限组", async () => { })
                it("friends路径 跨zone不同dec,access,full_except_write()权限组", async () => { })
                it("friends路径 跨zone不同dec,access,set_group_permission()权限组设定", async () => { })
                it("friends路径 跨zone不同dec,access,set_group_permissions()权限组设定", async () => { })
                it("friends路径 跨zone不同dec,access,make()权限组设定", async () => { })
                it("friends路径 跨zone不同dec,access,access,constructor()权限组初始化", async () => { })
            })
            describe("## SharedCyfsStack.RequestGlobalStatePath，req_path", async () => {
                it.only("req_path GlobalRoot|Decroot", async () => {
                    let stack_a = (await connect_stack())[1].fork_with_new_dec(cyfs.get_system_dec_app().object_id)
                    console.info(`stack_a,${stack_a.dec_id}`)

                    let stack_b = (await connect_stack())[4]
                    console.info(`stack_b,${stack_b.dec_id}`)

                    let obj_id1: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let obj_id2: cyfs.ObjectId = (await gen_obj()).desc().object_id();
                    let key1 = RandomGenerator.string(10);
                    let path1 = `/qatest/${key1}/${obj_id1}`
                    const owner_id = stack_a.local_device().desc().owner()!;
                    const obj = cyfs.TextObject.create(owner_id, 'question', "test_header", "hello!");
                    const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                    const object_raw = obj.to_vec().unwrap();

                    let stub_a = stack_a.root_state_stub()

                    let stub_b = stack_b.root_state_stub()

                    await stack_a.root_state_meta_stub().clear_access()


                    await stack_a.root_state_meta_stub().add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.full()))

                    let path_acc: cyfs.RootStateOpEnvAccess = {
                        path: path1,
                        access: cyfs.AccessPermissions.Full
                    }

                    let op_env1 = (await stub_a.create_path_op_env_with_access(path_acc)).unwrap();


                    console.info("remove_with_path", await op_env1.remove_with_key(path1, key1))

                    let result1 = await op_env1.insert_with_key(path1, key1, obj_id1)
                    console.info(`result1${JSON.stringify(result1)}}`)
                    assert.ok(!result1.err)

                    let update_result1 = await op_env1.update()
                    console.info("update_result1", JSON.stringify(update_result1))
                    assert.ok(!update_result1.err)

                    await op_env1.remove_with_key(path1, key1)

                    await op_env1.update()

                    let result2 = await op_env1.insert_with_key(path1, key1, obj_id2)
                    console.info(`result2${JSON.stringify(result2)}}`)
                    assert.ok(!result2.err)

                    let update_result2 = await op_env1.update()
                    console.info("update_result2", JSON.stringify(update_result2))
                    assert.ok(!update_result2.err)


                    await op_env1.commit()




                    let op_env2 = (await stub_b.create_path_op_env()).unwrap()

                    assert.ok(!(await op_env2.get_by_key(path1, key1)).err)


                    await stack_a.root_state_meta_stub().clear_access()
                    await stack_b.root_state_meta_stub().clear_access()
                    let acc = cyfs.AccessString.make([{ group: cyfs.AccessGroup.CurrentZone, permissions: cyfs.AccessPermissions.Full }])
                    await stack_b.root_state_meta_stub(undefined, stack_b.dec_id).add_access(cyfs.GlobalStatePathAccessItem.new(path1, cyfs.AccessString.full()))

                    let result1_root = update_result1.unwrap().root

                    let result2_root = update_result2.unwrap().root

                    let path_handler = new cyfs.RequestGlobalStatePath(stack_b.dec_id, path1, cyfs.GlobalStateCategory.RootState, cyfs.RequestGlobalStateRoot.GlobalRoot(result1_root))
                    console.info(`path_handler${JSON.stringify(path_handler)}}`)

                    // 添加一个Post Handler
                    {
                        //const handler = new PostObjectHandler();
                        const ret = await stack_b.router_handlers().add_post_object_handler(
                            cyfs.RouterHandlerChain.Handler,
                            'post-object-handler',
                            0,
                            undefined,
                            path_handler.toString(),
                            cyfs.RouterHandlerAction.Default,
                            new PostObjectHandlerTest());

                        console.info("ret2", ret);
                    }

                    // 测试stack1 Post给 stack2
                    const resp = await stack_a.non_service().post_object({
                        common: {
                            req_path: path_handler.toString(),
                            dec_id: stack_a.dec_id,
                            level: cyfs.NONAPILevel.Router,
                            flags: 0,
                            target: stack_b.local_device_id().object_id
                        },
                        object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                    });
                    console.info("post_object_resp", resp)
                })
            })
        })

    })
})
