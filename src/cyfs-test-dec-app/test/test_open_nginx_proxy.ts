import * as cyfs from "../cyfs";
const dec_app_1 = cyfs.ObjectId.from_base_58("9tGpLNndR5tyui8DkYBpEz8mFHzjfqkCVmsFusa5roHd").unwrap()

async function main() {
    //let stack_param = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(11318,11319, dec_app_1).unwrap();
    // if (requestor_type == cyfs.CyfsStackRequestorType.WebSocket) {
    //     let ws_param = cyfs.SharedCyfsStackParam.ws_requestor_config();
    //     stack_param.requestor_config = ws_param
    // }
    const service_url = `http://192.168.100.205:${11318}`;
    const ws_url = `ws://192.168.100.205:${11319}`;
    let stack_param= new cyfs.SharedCyfsStackParam(
        service_url,
        cyfs.CyfsStackEventType.WebSocket,
        dec_app_1,
        ws_url
    )
    let stack = cyfs.SharedCyfsStack.open(stack_param) ;
    let test = await stack.wait_online();
}

main()