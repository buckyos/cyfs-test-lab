import assert = require('assert');
import * as cyfs from "../../cyfs_node/cyfs_node"
import { ZoneSimulator, stringToUint8Array, RandomGenerator, stackInfo } from "../../common";
import * as path from 'path';
import { before } from 'mocha';
//初始化日志
cyfs.clog.enable_file_log({
    name: "test",
    dir: cyfs.get_app_log_dir("test"),
    file_max_size: 1024 * 1024 * 10,
    file_max_count: 10,
});

let stack: cyfs.SharedCyfsStack;

describe("#test 初始化方式", function () {
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
    describe("## 初始化test", async () => {
        describe("### test 接口测试", async () => {
            it("test", async () => {
                //let dec_id = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT2ze").unwrap();
                //const target_dec_id = dec_id || cyfs.get_system_dec_app().object_id

                let target_dec_id = ZoneSimulator.zone1_device2_stack.root_state().get_dec_id();

                let device11 = ZoneSimulator.zone1_device1_stack;
                await device11.root_state_meta_stub().clear_access()
                let device12 = ZoneSimulator.zone1_device2_stack;
                await device12.root_state_meta_stub().clear_access()
            
                const owner_id = device11.local_device().desc().owner()!.unwrap();
                const obj = cyfs.TextObject.create(cyfs.Some(owner_id), 'question', "test_header", "hello!");
                const object_id: cyfs.ObjectId = obj.desc().calculate_id();
                const object_raw = obj.to_vec().unwrap();
            
                let path = "/test/api/"
                let path_handler = new cyfs.RequestGlobalStatePath(device11.dec_id, path)
            
                // 配置 acccess 权限
                const access = new cyfs.AccessString(0);
                access.set_group_permissions(
                    cyfs.AccessGroup.CurrentZone,
                    cyfs.AccessPermissions.WirteAndCall
                );
                access.set_group_permissions(
                    cyfs.AccessGroup.CurrentDevice,
                    cyfs.AccessPermissions.WirteAndCall
                );
                access.set_group_permissions(
                    cyfs.AccessGroup.OwnerDec,
                    cyfs.AccessPermissions.WirteAndCall
                );

                const ra = await device12
                .root_state_meta_stub()
                .add_access(cyfs.GlobalStatePathAccessItem.new("/test/hello", access));
                if (ra.err) {
                    console.error(`path /test/hello add access error: ${ra}`);
                }
                console.log("add access successed: ", ra.unwrap());

            
                // 添加一个Post Handler
                {
                    //const handler = new PostObjectHandler();
                    const ret = await device12.router_handlers().add_post_object_handler(
                        cyfs.RouterHandlerChain.Handler,
                        'post-object-handler',
                        0,
                        undefined,
                        path_handler.toString(),
                        cyfs.RouterHandlerAction.Default);
            
                    console.info("ret2",ret);
                }
            
                // 测试stack1 Put给 stack2，测试acl直到put成功
                const resp = await device11.non_service().post_object({
                    common: {
                        req_path: path_handler.toString(),
                        dec_id: device11.dec_id,
                        level: cyfs.NONAPILevel.NON,
                        flags: 0,
                        target: device12.local_device_id().object_id
                    },
                    object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                });

            })
        })
    })
})
