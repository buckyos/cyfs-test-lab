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
    let resp = await stack_download.wait_online(cyfs.Some(cyfs.JSBI.BigInt(10000000)));
    //await cyfs.sleep(5000)
    let stack_upload = cyfs.SharedCyfsStack.open(cyfs.SharedCyfsStackParam.new_with_ws_event_ports(20004, 20003).unwrap())
    let resp2 = await stack_upload.wait_online(cyfs.Some(cyfs.JSBI.BigInt(10000000)));
    //await cyfs.sleep(5000)
    let res = await stack_download.util().get_zone({ common: { flags: 0 } });
    let res2= await stack_upload.util().get_zone({ common: { flags: 0 } });
    console.info(JSON.stringify(res.unwrap()))
}

main()