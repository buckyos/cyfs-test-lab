import { ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator } from '../../base';

import { StackProxyClient } from "../../taskTools/cyfs_stack_tunnel/stackTool"
import * as cyfs from "../../taskTools/cyfs_stack_tunnel/cyfs_node"
export async function TaskMain(_interface: TaskClientInterface) {


    let DMC_Download = new StackProxyClient({
        _interface,
        peerName: "DMC_Download",
        stack_type: "ood",
        timeout: 60 * 1000,
        ws_port: 20001,
        http_port: 20002
    })
    await DMC_Download.init();
    let DMC_Upload = new StackProxyClient({
        _interface,
        peerName: "DMC_Upload",
        stack_type: "ood",
        timeout: 60 * 1000,
        ws_port: 20003,
        http_port: 20004
    })
    await DMC_Upload.init();
    let dec_id = cyfs.ObjectId.from_base_58("9tGpLNnab9uVtjeaK4bM59QKSkLEGWow1pJq6hjjK9MM").unwrap();
    _interface.getLogger().info(`Waiting for proxy to connection...`);
    let stack_download = cyfs.SharedCyfsStack.open(cyfs.SharedCyfsStackParam.new_with_ws_event_ports(20002, 20001,dec_id).unwrap())
    let resp = await stack_download.wait_online(cyfs.None);
    _interface.getLogger().info(`wait_online finished ${JSON.stringify(resp.unwrap())}`);
    let res = await stack_download.util().get_zone({ common: { flags: 0 } });
    let stack_upload = cyfs.SharedCyfsStack.open(cyfs.SharedCyfsStackParam.new_with_ws_event_ports(20004, 20003,dec_id).unwrap())
    let resp2 = await stack_upload.wait_online(cyfs.None);
    _interface.getLogger().info(`wait_online finished ${JSON.stringify(resp.unwrap())}`);
    let res2 = await stack_upload.util().get_zone({ common: { flags: 0 } });

    let createFile = await DMC_Upload.util_client!.createFile(1*1024*1024*1024);
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
        local_path: createFile.filePath!,
        chunk_size: 4 * 1024 * 1024
    });
   
    let test_file = add_file.unwrap().file_id
    let task_id: string;
    await cyfs.sleep(1000)

    const req1: cyfs.NONGetObjectOutputRequest = {
        object_id: test_file,
        common: {
            req_path: "qaTest",
            level: cyfs.NONAPILevel.NON,
            target: stack_upload.local_device_id().object_id,
            dec_id: cyfs.ObjectId.from_base_58("5aSixgMDm3E5EELo5CzZ874jizVUm9SPjr1wczSwYBF8").unwrap(),
            flags: 0,
        }
    };
    const get_ret = await stack_upload.non_service().get_object(req1);
    await cyfs.sleep(1000)
    _interface.getLogger().info("获取task object");
    _interface.getLogger().info(JSON.stringify(get_ret));
    
    //await cyfs.sleep(500000)

    // let stack = cyfs.SharedCyfsStack.open(cyfs.SharedCyfsStackParam.new_with_ws_event_ports(20002, 20001).unwrap())
    // let resp = await stack.wait_online(cyfs.None);
    // _interface.getLogger().info(`wait_online finished ${JSON.stringify(resp.unwrap())}`);
    // await cyfs.sleep(5000)
    // let res = await stack.util().get_zone({ common: { flags: 0 } });
    // _interface.getLogger().info(JSON.stringify(res.unwrap()));
    // _interface.exit(0, "success")
}
