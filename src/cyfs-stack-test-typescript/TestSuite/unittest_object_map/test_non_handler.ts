import assert = require('assert');
import {cyfs} from '../../cyfs_node'
import { ZoneSimulator, stringToUint8Array, RandomGenerator, stackInfo } from "../../common";
import * as path from 'path';
import { before } from 'mocha';

class PostObjectHandler implements cyfs.RouterHandlerPostObjectRoutine {
    async call(param: cyfs.RouterHandlerPostObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerPostObjectResult>> {
        const codec = new cyfs.NONPostObjectOutputRequestJsonCodec();
        console.info('post_object param: ', JSON.stringify(codec.encode_object(param.request)));

        console.info("source=", param.request.common.source.dec);

        const [text, buf] = new cyfs.TextObjectDecoder().raw_decode(param.request.object.object_raw).unwrap();
        console.info(`put_object text_object: id=${text.id}, header=${text.header}, body=${text.body}`);

        if (text.id === 'request') {
            const obj = cyfs.TextObject.create(cyfs.None, 'response', "test_header", "hello!");
            const object_id = obj.desc().calculate_id();
            console.info(`will response put_object: ${param.request.object.object_id} ---> ${object_id}`);

            const object_raw = obj.to_vec().unwrap();

            // 修改object，并保存，然后继续后续路由流程
            const result: cyfs.RouterHandlerPostObjectResult = {
                action: cyfs.RouterHandlerAction.Response,
                request: param.request,
                response: cyfs.Ok({
                    object: new cyfs.NONObjectInfo(object_id, object_raw)
                })
            };

            return cyfs.Ok(result);
        }
        return cyfs.Err(new cyfs.BuckyError(cyfs.BuckyErrorCode.NotMatch, "post handler get wrong text id"));
    }
}
describe("#test 初始化方式", function () {
    this.timeout(0);
    this.beforeAll(async function () {
        //测试前置条件，连接测试模拟器设备
        console.info(`##########用例执开始执行`);
        await ZoneSimulator.init();
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
                // const basDecIdA = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
                // const basDecIdB = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
                // const basDecIdC = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT7ze").unwrap();
            
                // const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                // param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                // const ood1 = cyfs.SharedCyfsStack.open(param1);
                // await ood1.online()  
            
                // const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                // param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                // const device11 = cyfs.SharedCyfsStack.open(param11);
                // await device11.online()
            
                
                // const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                // param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                // const device12 = cyfs.SharedCyfsStack.open(param12);
                // await device12.online() 

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
                    const handler = new PostObjectHandler();
                    const ret = await device12.router_handlers().add_post_object_handler(
                        cyfs.RouterHandlerChain.Handler,
                        'post-object-handler',
                        0,
                        undefined,
                        path_handler.format_string(),
                        cyfs.RouterHandlerAction.Default,
                        handler);
            
                    console.info("ret2",ret);
                }

                // 测试stack1 Put给 stack2，测试acl直到put成功
                const resp = await device11.non_service().post_object({
                    common: {
                        req_path: path_handler.format_string(),
                        dec_id: device11.dec_id,
                        level: cyfs.NONAPILevel.NON,
                        flags: 0,
                        target: device12.local_device_id().object_id
                    },
                    object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
                });

                console.info("post ret: ",resp);

            })
        })
    })
})
