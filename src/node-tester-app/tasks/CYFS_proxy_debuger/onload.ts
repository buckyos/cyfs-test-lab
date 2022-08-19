import { ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator } from '../../base';

import * as cyfs from "../../cyfs_node/cyfs_node"
import { StackProxyClient } from "../../taskTools/cyfs_stack_tunnel/stackTool"

export async function TaskMain(_interface: TaskClientInterface) {

    // cyfs.clog.enable_file_log({
    //     name: "unittest_stack_interface",
    //     dir: cyfs.get_app_log_dir("unittest_stack_interface"),
    //     file_max_size: 1024 * 1024 * 10,
    //     file_max_count: 10,
    // });

    let proxy = new StackProxyClient({
        _interface,
        peerName: "Zone1_Device2",
        stack_type: "runtime",
        timeout: 60 * 1000,
        ws_port: 20001,
        http_port: 20002
    })
    await proxy.init();
    _interface.getLogger().info(`Waiting for proxy to connection...`);

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
