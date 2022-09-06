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
    // let stack_download = cyfs.SharedCyfsStack.open(cyfs.SharedCyfsStackParam.new_with_ws_event_ports(20002, 20001).unwrap())
    // let resp = await stack_download.wait_online(cyfs.None);
    // _interface.getLogger().info(`wait_online finished ${JSON.stringify(resp.unwrap())}`);
    // await cyfs.sleep(5000)
    // let res = await stack_download.util().get_zone({ common: { flags: 0 } });


    // let stack_upload = cyfs.SharedCyfsStack.open(cyfs.SharedCyfsStackParam.new_with_ws_event_ports(20004, 20003).unwrap())
    // let resp2 = await stack_upload.wait_online(cyfs.None);
    // _interface.getLogger().info(`wait_online finished ${JSON.stringify(resp.unwrap())}`);
    // await cyfs.sleep(5000)
    // let res2 = await stack_upload.util().get_zone({ common: { flags: 0 } });
    while (true) {
        await cyfs.sleep(500000)
        _interface.getLogger().info("Waiting for proxy to connection...");
    }
    //await cyfs.sleep(500000)

    // let stack = cyfs.SharedCyfsStack.open(cyfs.SharedCyfsStackParam.new_with_ws_event_ports(20002, 20001).unwrap())
    // let resp = await stack.wait_online(cyfs.None);
    // _interface.getLogger().info(`wait_online finished ${JSON.stringify(resp.unwrap())}`);
    // await cyfs.sleep(5000)
    // let res = await stack.util().get_zone({ common: { flags: 0 } });
    // _interface.getLogger().info(JSON.stringify(res.unwrap()));
    // _interface.exit(0, "success")
}
