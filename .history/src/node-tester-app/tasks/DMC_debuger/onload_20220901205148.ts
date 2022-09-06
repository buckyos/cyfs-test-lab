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
    _interface.getLogger().info(`Waiting for proxy to connection...`);
    let stack_download = cyfs.SharedCyfsStack.open(cyfs.SharedCyfsStackParam.new_with_ws_event_ports(20002, 20001).unwrap())
    let resp = await stack_download.wait_online(cyfs.None);
    _interface.getLogger().info(`wait_online finished ${JSON.stringify(resp.unwrap())}`);
    let res = await stack_download.util().get_zone({ common: { flags: 0 } });
    let stack_upload = cyfs.SharedCyfsStack.open(cyfs.SharedCyfsStackParam.new_with_ws_event_ports(20004, 20003).unwrap())
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
        local_path: "C:\\node_tester_app\\node_tester_app\\service\\cyfs-bdt\\bdt-tools",
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
    console.info("获取task object");
    console.info(JSON.stringify(get_ret));
    assert.ok(!get_ret.err, "create_task get object 失败");

    let task = await stack.trans().create_task({
        common: {
            req_path: "qaTest",
            dec_id: cyfs.ObjectId.from_base_58("5aSixgMDm3E5EELo5CzZ874jizVUm9SPjr1wczSwYBF8").unwrap(),
            level: cyfs.NDNAPILevel.NDC,
            target: stack.local_device_id().object_id,
            referer_object: [],
            flags: 1,
        },
        object_id: test_file,
        local_path: path.join(filePath, fileName),
        device_list: [stack.local_device_id()],
        auto_start: true,
    })
    console.info(JSON.stringify(task.unwrap()));
    assert.ok(!task.err, "create_task 失败");
    task_id = task.unwrap().task_id
    await cyfs.sleep(1000)
    let task1 = await stack.trans().start_task({
        common: {
            req_path: "qaTest",
            dec_id: cyfs.ObjectId.from_base_58("5aSixgMDm3E5EELo5CzZ874jizVUm9SPjr1wczSwYBF8").unwrap(),
            level: cyfs.NDNAPILevel.NDN,
            target: stack.local_device_id().object_id,
            referer_object: [],
            flags: 1,
        },
        task_id: task_id
    })
    console.info(JSON.stringify(task1.unwrap()));
    assert.ok(!task.err, "start_task 失败");
    for (let i = 0; i < 10; i++) {
        let task = await stack.trans().get_task_state({
            common: {
                req_path: "qaTest",
                dec_id: cyfs.ObjectId.from_base_58("5aSixgMDm3E5EELo5CzZ874jizVUm9SPjr1wczSwYBF8").unwrap(),
                level: cyfs.NDNAPILevel.Router,
                referer_object: [],
                flags: 1,
            },
            task_id: task_id
        })
        console.info(JSON.stringify(task));
        let state = task.unwrap().state;
        if (state == 4) {
            break;
        }
        assert.ok(!task.err, "control_task 失败");
        await cyfs.sleep(1000)
    }
    let result1 = await stack_upload.trans().publish_file
    //await cyfs.sleep(500000)

    // let stack = cyfs.SharedCyfsStack.open(cyfs.SharedCyfsStackParam.new_with_ws_event_ports(20002, 20001).unwrap())
    // let resp = await stack.wait_online(cyfs.None);
    // _interface.getLogger().info(`wait_online finished ${JSON.stringify(resp.unwrap())}`);
    // await cyfs.sleep(5000)
    // let res = await stack.util().get_zone({ common: { flags: 0 } });
    // _interface.getLogger().info(JSON.stringify(res.unwrap()));
    // _interface.exit(0, "success")
}
