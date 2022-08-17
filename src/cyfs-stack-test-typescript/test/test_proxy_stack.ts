import * as cyfs from '../../../cyfs-ts-sdk/src/sdk';
import * as proxy_stack from "../common/utils/stack"
import * as myHandler from "./handler"
import assert from "assert";
async function createTestObject(stack:cyfs.SharedCyfsStack,peerId:string) {
    const saveobjectOwner = cyfs.ObjectId.from_base_58(peerId).unwrap()
    const saveobject = cyfs.TextObject.create(cyfs.Some(saveobjectOwner), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
    const saveObjectId = saveobject.desc().calculate_id();
    console.info(`will put_object: id=${saveObjectId},object value = ${saveobject.value} `);
    const object_raw = saveobject.to_vec().unwrap();
    const req: cyfs.NONPutObjectOutputRequest = {
        common: {
            dec_id:saveobjectOwner,
            flags: 0,
            //target: cyfs.ObjectId.from_base_58(simulator.zone1.device1.peerId).unwrap(),
            level: cyfs.NONAPILevel.NOC //设置路由类型
        },
        object: new cyfs.NONObjectInfo(saveObjectId, object_raw)
    };
    const put_ret = await stack.non_service().put_object(req);
    //校验结果
    console.info('put_object result:', put_ret);
    assert(!put_ret.err);
    return {saveobject,saveObjectId,saveobjectOwner,object_raw}  
}

async function main() {
    cyfs.clog.enable_file_log({
        name: "unittest_stack_interface",
        dir: cyfs.get_app_log_dir("unittest_stack_interface"),
        file_max_size: 1024 * 1024 * 10,
        file_max_count: 10,
    });
    const handlerManager = new myHandler.handlerManager(); //用来回收handler 和监听校验handler触发
    let stack = cyfs.SharedCyfsStack.open(cyfs.SharedCyfsStackParam.new_with_ws_event_ports(20002,20001).unwrap())
    //let stack = cyfs.SharedCyfsStack.open(cyfs.SharedCyfsStackParam.new_with_ws_event_ports(19999,20000).unwrap())
    let resp = await stack.wait_online(cyfs.Some(cyfs.JSBI.BigInt(10000000)));
    console.info(JSON.stringify(resp.unwrap()));
    await cyfs.sleep(5000)
    let res = await stack.util().get_zone({common: {flags: 0}});
    //const handlerManager = new myHandler.handlerManager(); //用来回收handler 和监听校验handler触发
    const obj = cyfs.TextObject.create(cyfs.None, 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
    const object_id = obj.desc().calculate_id();
    console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
    const object_raw = obj.to_vec().unwrap();
    const req2: cyfs.NONPutObjectOutputRequest = {
        common: {
            req_path: "/qa/put_object",
            flags: 0,
            target: stack.local_device_id().object_id,
            level: cyfs.NONAPILevel.Router //设置路由类型
        },
        object: new cyfs.NONObjectInfo(object_id, object_raw)
    };
    const put_ret2 = await stack.non_service().put_object(req2);
}

main()