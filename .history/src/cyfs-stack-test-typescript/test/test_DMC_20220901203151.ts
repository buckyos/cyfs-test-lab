import * as cyfs from '../cyfs_node/cyfs_node';
import * as proxy_stack from "../common/utils/stack"
import * as myHandler from "./handler"
import { RandomGenerator } from "../common";
import path from "path";
import assert from "assert";
async function createTestObject(stack: cyfs.SharedCyfsStack, peerId: string) {
    const saveobjectOwner = cyfs.ObjectId.from_base_58(peerId).unwrap()
    const saveobject = cyfs.TextObject.create(cyfs.Some(saveobjectOwner), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
    const saveObjectId = saveobject.desc().calculate_id();
    console.info(`will put_object: id=${saveObjectId},object value = ${saveobject.value} `);
    const object_raw = saveobject.to_vec().unwrap();
    const req: cyfs.NONPutObjectOutputRequest = {
        common: {
            dec_id: saveobjectOwner,
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
    return { saveobject, saveObjectId, saveobjectOwner, object_raw }
}

async function main() {
    let stack_download = cyfs.SharedCyfsStack.open(cyfs.SharedCyfsStackParam.new_with_ws_event_ports(20002, 20001).unwrap())
    let resp = await stack_download.wait_online(cyfs.None);
    await cyfs.sleep(5000)
    let res = await stack_download.util().get_zone({ common: { flags: 0 } });
    let stack_upload = cyfs.SharedCyfsStack.open(cyfs.SharedCyfsStackParam.new_with_ws_event_ports(20004, 20003).unwrap())
    let resp2 = await stack_upload.wait_online(cyfs.None);
    await cyfs.sleep(5000)
    let add_file = await stack_upload.trans().publish_file({
        common: {// 请求路径，可为空
            req_path: "qaTest",
            // 来源DEC
            // api级别
            dec_id: cyfs.ObjectId.from_base_58("5aSixgMDm3E5EELo5CzZ874jizVUm9SPjr1wczSwYBF8").unwrap(),
            level: cyfs.NDNAPILevel.NDC,
            // targrt设备参数
            // 需要处理数据的关联对象，主要用以chunk/file等
            referer_object: [],
            flags: 1,
        },
        owner: cyfs.ObjectId.from_base_58("5aSixgMDm3E5EELo5CzZ874jizVUm9SPjr1wczSwYBF8").unwrap(),
        local_path: "C:\\node_tester_app\\node_tester_app\\service\\cyfs-bdt\\bdt-tools",
        chunk_size: 4 * 1024 * 1024
    });
    console.info(JSON.stringify(add_file));
    assert.ok(!add_file.err, "publish_file 失败");
    let test_file = add_file.unwrap().file_id
    let task_id: string;
    await cyfs.sleep(1000)
    fileName = "desc-tool";
    filePath = path.join(__dirname, "./test_cache_file/target")
    const req1: cyfs.NONGetObjectOutputRequest = {
        object_id: test_file,
        common: {
            req_path: "qaTest",
            level: cyfs.NONAPILevel.NON,
            target: stack.local_device_id().object_id,
            dec_id: cyfs.ObjectId.from_base_58("5aSixgMDm3E5EELo5CzZ874jizVUm9SPjr1wczSwYBF8").unwrap(),
            flags: 0,
        }
    };
    const get_ret = await stack.non_service().get_object(req1);
}

main()